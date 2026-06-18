using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;

        public ProductService(IProductRepositoryEF productRepository, ICategoryRepositoryEF categoryRepository)
        {
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
        }

        public async Task<ServiceResult<PagedResult<ProductDto>>> GetAllAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            bool? isFeatured,
            bool? isActive,
            string? sortBy,
            string? sortDirection,
            int page = 1,
            int pageSize = 10)
        {
            var (products, totalCount) = await _productRepository.SearchAsync(
                keyword,
                categoryId,
                minPrice,
                maxPrice,
                inStock,
                isFeatured,
                isActive,
                sortBy,
                sortDirection,
                page,
                pageSize);

            var items = products.Select(MapToProductDto).ToList();

            return ServiceResult<PagedResult<ProductDto>>.Success(new PagedResult<ProductDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        public async Task<ServiceResult<ProductDto>> GetByIdAsync(int id, string role)
        {
            var product = await _productRepository.GetByIdWithDetailsAsync(id);
            if (product == null)
                return ServiceResult<ProductDto>.Error("Product not found");

            var category = await _categoryRepository.GetByIdAsync(product.CategoryId);
            
            // Check if product or category is inactive, allow only Admin
            if ((!product.IsActive || category?.IsActive != true) && role != "Admin")
                return ServiceResult<ProductDto>.Error("Product not found");

            return ServiceResult<ProductDto>.Success(MapToProductDto(product));
        }

        public async Task<ServiceResult<ProductDto>> CreateAsync(string role, ProductCreateDto dto)
        {
            if (role != "Admin")
                return ServiceResult<ProductDto>.Error("Unauthorized");

            var category = await _categoryRepository.GetByIdAsync(dto.CategoryId);
            if (category == null || !category.IsActive)
                return ServiceResult<ProductDto>.Error("Category is not valid/ not found");

            var product = new Product
            {
                Name = dto.Name,
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
                Description = dto.Description,
                ImageUrl = NormalizeNullable(dto.ImageUrl),
                Unit = dto.Unit,
                IsFeatured = dto.IsFeatured,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            await _productRepository.AddAsync(product);

            if (dto.ImageUrls != null)
            {
                await _productRepository.ReplaceProductImagesAsync(product.Id, product.ImageUrl, dto.ImageUrls);
            }

            var createdProduct = await _productRepository.GetByIdWithDetailsAsync(product.Id);
            return ServiceResult<ProductDto>.Success(MapToProductDto(createdProduct!));
        }

        public async Task<ServiceResult<ProductDto>> UpdateAsync(string role, int id, ProductUpdateDto dto)
        {
            if (role != "Admin")
                return ServiceResult<ProductDto>.Error("Unauthorized");

            var product = await _productRepository.GetByIdWithDetailsAsync(id);
            if (product == null)
                return ServiceResult<ProductDto>.Error("Product not found");

            product.Name = dto.Name ?? product.Name;
            product.Price = dto.Price ?? product.Price;
            product.Stock = dto.Stock ?? product.Stock;
            
            if (dto.CategoryId.HasValue && dto.CategoryId.Value != product.CategoryId)
            {
                var category = await _categoryRepository.GetByIdAsync(dto.CategoryId.Value);
                if (category == null || !category.IsActive)
                    return ServiceResult<ProductDto>.Error("Category is not valid/ not found");

                product.CategoryId = dto.CategoryId.Value;
            }
            
            product.Description = dto.Description ?? product.Description;
            product.ImageUrl = dto.ImageUrl == null ? product.ImageUrl : NormalizeNullable(dto.ImageUrl);
            product.Unit = dto.Unit ?? product.Unit;
            product.IsFeatured = dto.IsFeatured ?? product.IsFeatured;
            product.IsActive = dto.IsActive ?? product.IsActive;

            await _productRepository.UpdateAsync(product);

            if (dto.ImageUrls != null)
            {
                await _productRepository.ReplaceProductImagesAsync(product.Id, product.ImageUrl, dto.ImageUrls);
            }
            else if (dto.ImageUrl != null)
            {
                var existingImageUrls = product.ProductImages?
                    .Select(image => image.ImageUrl)
                    .ToList();

                await _productRepository.ReplaceProductImagesAsync(product.Id, product.ImageUrl, existingImageUrls);
            }

            var updatedProduct = await _productRepository.GetByIdWithDetailsAsync(id);
            if (updatedProduct == null)
                return ServiceResult<ProductDto>.Error("Product is not valid/ not found");

            return ServiceResult<ProductDto>.Success(MapToProductDto(updatedProduct));
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string role, int id)
        {
            if (role != "Admin")
                return ServiceResult<bool>.Error("Unauthorized");

            var product = await _productRepository.GetByIdAsync(id);
            if (product == null)
                return ServiceResult<bool>.Error("Product not found");

            product.IsActive = false;
            await _productRepository.UpdateAsync(product);
            
            return ServiceResult<bool>.Success(true, "Product disabled successfully");
        }

        public async Task<ServiceResult<List<ProductDto>>> GetByCategoryAsync(int categoryId)
        {
            var products = await _productRepository.GetByCategoryAsync(categoryId);
            return ServiceResult<List<ProductDto>>.Success(products.Select(MapToProductDto).ToList());
        }

        public async Task<ServiceResult<List<CategoryProductCountDto>>> GetCategoryCountsAsync()
        {
            var counts = await _productRepository.GetCategoryProductCountsAsync();
            var items = counts
                .OrderBy(item => item.Key)
                .Select(item => new CategoryProductCountDto
                {
                    CategoryId = item.Key,
                    ProductCount = item.Value
                }).ToList();

            return ServiceResult<List<CategoryProductCountDto>>.Success(items);
        }

        // --- Mapping logic ---
        private static ProductDto MapToProductDto(Product product)
        {
            var normalizedGallery = NormalizeImageUrls(product.ProductImages?.Select(image => image.ImageUrl));
            var mainImageUrl = ResolveMainImageUrl(product, normalizedGallery);
            var imageUrls = BuildImageUrls(mainImageUrl, normalizedGallery);

            return new ProductDto
            {
                Id = product.Id,
                Name = product.Name,
                Price = product.Price,
                Stock = product.Stock,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name,
                Description = product.Description,
                ImageUrl = mainImageUrl,
                ImageUrls = imageUrls,
                Unit = product.Unit,
                IsFeatured = product.IsFeatured,
                IsActive = product.IsActive,
                CreatedAt = product.CreatedAt,
                SoldCount = product.SoldCount,
                AverageRating = Math.Round(product.AverageRating, 1),
                TotalReviews = product.TotalReviews
            };
        }

        private static string? ResolveMainImageUrl(Product product, IReadOnlyCollection<string> normalizedGallery)
        {
            var mainImage = product.ProductImages?
                .FirstOrDefault(image => image.IsMain && !string.IsNullOrWhiteSpace(image.ImageUrl))
                ?.ImageUrl;
            if (!string.IsNullOrWhiteSpace(mainImage))
            {
                return mainImage.Trim();
            }

            if (normalizedGallery.Count > 0)
            {
                return normalizedGallery.First();
            }

            return NormalizeNullable(product.ImageUrl);
        }

        private static List<string> BuildImageUrls(string? mainImageUrl, IReadOnlyCollection<string> galleryImageUrls)
        {
            var imageUrls = new List<string>();
            if (!string.IsNullOrWhiteSpace(mainImageUrl))
            {
                imageUrls.Add(mainImageUrl.Trim());
            }

            foreach (var imageUrl in galleryImageUrls)
            {
                if (imageUrls.Contains(imageUrl, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                imageUrls.Add(imageUrl);
            }

            return imageUrls;
        }

        private static List<string> NormalizeImageUrls(IEnumerable<string>? imageUrls)
        {
            if (imageUrls == null)
            {
                return new List<string>();
            }

            return imageUrls
                .Where(imageUrl => !string.IsNullOrWhiteSpace(imageUrl))
                .Select(imageUrl => imageUrl.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static string? NormalizeNullable(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}

