using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using System.Globalization;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Product Repository using Entity Framework Core
    /// </summary>
    public interface IProductRepositoryEF : IRepository<Product>
    {
        Task<Product?> GetByIdWithDetailsAsync(int id);
        Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            bool? isFeatured,
            bool? isActive,
            string? sortBy,
            string? sortDirection,
            int page,
            int pageSize);
        Task<List<Product>> GetByCategoryAsync(int categoryId);
        Task<Dictionary<int, string>> GetNamesByIdsAsync(IEnumerable<int> productIds);
        Task<Dictionary<int, int>> GetCategoryProductCountsAsync();
        Task<bool> TryDecreaseStockAsync(int productId, int quantity);
        Task<bool> IncreaseStockAsync(int productId, int quantity);
        Task ReplaceProductImagesAsync(int productId, string? mainImageUrl, IEnumerable<string>? imageUrls);
    }

    public class ProductRepositoryEF : Repository<Product>, IProductRepositoryEF
    {
        private static readonly string[] SoldOrderStatuses = new[]
        {
            "Received",
            "Completed"
        };

        private sealed class ProductSortProjection
        {
            public int ProductId { get; set; }
            public string ProductName { get; set; } = "";
            public decimal ProductPrice { get; set; }
            public int ProductStock { get; set; }
            public DateTime ProductCreatedAt { get; set; }
            public int SoldCount { get; set; }
            public double AverageRating { get; set; }
            public int TotalReviews { get; set; }
        }

        public ProductRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<(List<Product> Products, int TotalCount)> SearchAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            bool? isFeatured,
            bool? isActive,
            string? sortBy,
            string? sortDirection,
            int page,
            int pageSize)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 10 : Math.Min(pageSize, 100);

            var query = _dbSet.AsQueryable();

            if (isActive.HasValue)
            {
                query = query.Where(p => p.IsActive == isActive.Value);
            }
            else
            {
                query = query.Where(p => p.IsActive);
            }

            query = query.Where(p => p.Category != null && p.Category.IsActive);

            if (!string.IsNullOrEmpty(keyword))
            {
                keyword = keyword.ToLower(CultureInfo.InvariantCulture);
                query = query.Where(p =>
                    p.Name.ToLower().Contains(keyword) ||
                    (p.Description != null && p.Description.ToLower().Contains(keyword)));
            }

            if (categoryId.HasValue && categoryId > 0)
            {
                query = query.Where(p => p.CategoryId == categoryId);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => p.Price >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            if (inStock.HasValue)
            {
                query = inStock.Value
                    ? query.Where(p => p.Stock > 0)
                    : query.Where(p => p.Stock <= 0);
            }

            if (isFeatured.HasValue)
            {
                query = query.Where(p => p.IsFeatured == isFeatured.Value);
            }

            var sortKey = (sortBy ?? string.Empty).Trim().ToLowerInvariant();
            var descending = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);

            var projectionQuery = query.Select(product => new ProductSortProjection
            {
                ProductId = product.Id,
                ProductName = product.Name,
                ProductPrice = product.Price,
                ProductStock = product.Stock,
                ProductCreatedAt = product.CreatedAt,
                SoldCount = _context.OrderItems
                    .Where(orderItem =>
                        orderItem.ProductId == product.Id &&
                        orderItem.Order != null &&
                        SoldOrderStatuses.Contains(orderItem.Order.OrderStatus))
                    .Select(orderItem => (int?)orderItem.Quantity)
                    .Sum() ?? 0,
                AverageRating = _context.ProductReviews
                    .Where(review => review.ProductId == product.Id && review.IsApproved)
                    .Select(review => (double?)review.Rating)
                    .Average() ?? 0,
                TotalReviews = _context.ProductReviews
                    .Count(review => review.ProductId == product.Id && review.IsApproved)
            });

            projectionQuery = sortKey switch
            {
                "name" => descending
                    ? projectionQuery.OrderByDescending(item => item.ProductName)
                    : projectionQuery.OrderBy(item => item.ProductName),
                "price" => descending
                    ? projectionQuery.OrderByDescending(item => item.ProductPrice)
                    : projectionQuery.OrderBy(item => item.ProductPrice),
                "stock" => descending
                    ? projectionQuery.OrderByDescending(item => item.ProductStock)
                    : projectionQuery.OrderBy(item => item.ProductStock),
                "sold" or "soldCount" or "bestselling" or "bestseller" => descending
                    ? projectionQuery.OrderByDescending(item => item.SoldCount).ThenByDescending(item => item.ProductId)
                    : projectionQuery.OrderBy(item => item.SoldCount).ThenBy(item => item.ProductId),
                "rating" or "averageRating" => descending
                    ? projectionQuery.OrderByDescending(item => item.AverageRating).ThenByDescending(item => item.TotalReviews)
                    : projectionQuery.OrderBy(item => item.AverageRating).ThenBy(item => item.TotalReviews),
                "createdAt" or "created" => descending
                    ? projectionQuery.OrderByDescending(item => item.ProductCreatedAt)
                    : projectionQuery.OrderBy(item => item.ProductCreatedAt),
                _ => descending
                    ? projectionQuery.OrderByDescending(item => item.ProductId)
                    : projectionQuery.OrderBy(item => item.ProductId),
            };

            var totalCount = await projectionQuery.CountAsync();

            var pageStats = await projectionQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var productIds = pageStats.Select(item => item.ProductId).ToList();

            var productsById = await _dbSet
                .Where(product => productIds.Contains(product.Id))
                .Include(product => product.Category)
                .Include(product => product.ProductImages)
                .ToDictionaryAsync(product => product.Id);

            var products = new List<Product>(pageStats.Count);
            foreach (var pageStat in pageStats)
            {
                if (!productsById.TryGetValue(pageStat.ProductId, out var product))
                {
                    continue;
                }

                product.SoldCount = pageStat.SoldCount;
                product.AverageRating = Math.Round(pageStat.AverageRating, 1);
                product.TotalReviews = pageStat.TotalReviews;
                products.Add(product);
            }

            return (products, totalCount);
        }

        public async Task<List<Product>> GetByCategoryAsync(int categoryId)
        {
            return await _dbSet
                .Where(p => p.IsActive && p.CategoryId == categoryId && p.Category != null && p.Category.IsActive)
                .Include(p => p.Category)
                .Include(p => p.ProductImages)
                .ToListAsync();
        }

        public async Task<Product?> GetByIdWithDetailsAsync(int id)
        {
            return await _dbSet
                .Include(p => p.Category)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(product => product.Id == id);
        }

        public async Task<Dictionary<int, string>> GetNamesByIdsAsync(IEnumerable<int> productIds)
        {
            var ids = productIds.Distinct().ToList();

            return await _dbSet
                .Where(product => ids.Contains(product.Id))
                .Select(product => new { product.Id, product.Name })
                .ToDictionaryAsync(product => product.Id, product => product.Name);
        }

        public async Task<Dictionary<int, int>> GetCategoryProductCountsAsync()
        {
            return await _dbSet
                .Where(product =>
                    product.IsActive &&
                    product.Category != null &&
                    product.Category.IsActive)
                .GroupBy(product => product.CategoryId)
                .Select(group => new
                {
                    CategoryId = group.Key,
                    Count = group.Count()
                })
                .ToDictionaryAsync(item => item.CategoryId, item => item.Count);
        }

        public async Task<bool> TryDecreaseStockAsync(int productId, int quantity)
        {
            if (quantity <= 0)
            {
                return false;
            }

            var affectedRows = await _context.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE [dbo].[Products]
SET [StockQuantity] = [StockQuantity] - {quantity}
WHERE [ProductId] = {productId}
  AND [StockQuantity] >= {quantity};");

            return affectedRows > 0;
        }

        public async Task<bool> IncreaseStockAsync(int productId, int quantity)
        {
            if (quantity <= 0)
            {
                return false;
            }

            var affectedRows = await _context.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE [dbo].[Products]
SET [StockQuantity] = [StockQuantity] + {quantity}
WHERE [ProductId] = {productId};");

            return affectedRows > 0;
        }

        public async Task ReplaceProductImagesAsync(int productId, string? mainImageUrl, IEnumerable<string>? imageUrls)
        {
            var normalizedMainImageUrl = NormalizeImageUrl(mainImageUrl);
            var normalizedImageUrls = imageUrls?
                .Select(NormalizeImageUrl)
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Select(url => url!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList() ?? new List<string>();

            var finalImageUrls = new List<string>();
            if (!string.IsNullOrWhiteSpace(normalizedMainImageUrl))
            {
                finalImageUrls.Add(normalizedMainImageUrl);
            }

            foreach (var imageUrl in normalizedImageUrls)
            {
                if (finalImageUrls.Contains(imageUrl, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                finalImageUrls.Add(imageUrl);
            }

            var existingImages = await _context.ProductImages
                .Where(image => image.ProductId == productId)
                .ToListAsync();

            if (existingImages.Count > 0)
            {
                _context.ProductImages.RemoveRange(existingImages);
            }

            if (finalImageUrls.Count > 0)
            {
                var entities = finalImageUrls
                    .Select((imageUrl, index) => new ProductImage
                    {
                        ProductId = productId,
                        ImageUrl = imageUrl,
                        IsMain = index == 0
                    });

                await _context.ProductImages.AddRangeAsync(entities);
            }

            await _context.SaveChangesAsync();
        }

        private static string? NormalizeImageUrl(string? imageUrl)
        {
            return string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        }
    }
}
