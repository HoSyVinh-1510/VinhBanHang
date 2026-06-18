using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Product review Repository using Entity Framework Core
    /// </summary>
    public interface IProductReviewRepositoryEF : IRepository<ProductReview>
    {
        Task<List<ProductReview>> GetApprovedByProductAsync(int productId);
        Task<ProductReview?> GetByProductAndUserAsync(int productId, string userId);
        Task<ProductReview?> GetByOrderItemAsync(int orderItemId);
        Task<List<ProductReview>> GetByOrderForUserAsync(int orderId, string userId);
        Task<OrderItem?> GetCompletedOrderItemForReviewAsync(string userId, int productId, int orderItemId);
        Task<bool> HasCompletedPurchaseAsync(string userId, int productId);
    }

    public class ProductReviewRepositoryEF : Repository<ProductReview>, IProductReviewRepositoryEF
    {
        public ProductReviewRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<ProductReview>> GetApprovedByProductAsync(int productId)
        {
            return await _dbSet
                .Include(review => review.User)
                .Where(review => review.ProductId == productId && review.IsApproved)
                .OrderByDescending(review => review.CreatedAt)
                .ToListAsync();
        }

        public async Task<ProductReview?> GetByProductAndUserAsync(int productId, string userId)
        {
            return await _dbSet.FirstOrDefaultAsync(review =>
                review.ProductId == productId &&
                review.UserId == userId);
        }

        public async Task<ProductReview?> GetByOrderItemAsync(int orderItemId)
        {
            return await _dbSet
                .Include(review => review.User)
                .FirstOrDefaultAsync(review => review.OrderItemId == orderItemId);
        }

        public async Task<List<ProductReview>> GetByOrderForUserAsync(int orderId, string userId)
        {
            return await _dbSet
                .Where(review => review.OrderId == orderId && review.UserId == userId)
                .OrderByDescending(review => review.CreatedAt)
                .ToListAsync();
        }

        public async Task<OrderItem?> GetCompletedOrderItemForReviewAsync(
            string userId,
            int productId,
            int orderItemId)
        {
            var orderItem = await _context.OrderItems
                .Include(item => item.Order)
                .Include(item => item.Product)
                .FirstOrDefaultAsync(item =>
                    item.Id == orderItemId &&
                    item.ProductId == productId &&
                    item.Order != null &&
                    item.Order.UserId == userId);

            if (orderItem?.Order == null || !IsCompletedOrderStatus(orderItem.Order.OrderStatus))
            {
                return null;
            }

            return orderItem;
        }

        public async Task<bool> HasCompletedPurchaseAsync(string userId, int productId)
        {
            var statuses = await _context.OrderItems
                .Where(item =>
                    item.ProductId == productId &&
                    item.Order != null &&
                    item.Order.UserId == userId)
                .Select(item => item.Order!.OrderStatus)
                .ToListAsync();

            return statuses.Any(IsCompletedOrderStatus);
        }

        private static bool IsCompletedOrderStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return false;
            }

            var normalized = NormalizeStatusValue(status);
            return normalized is "received" or "da nhan" or "da nhan hang" or "completed" or "delivered" or "da giao" or "hoan tat";
        }

        private static string NormalizeStatusValue(string value)
        {
            var normalized = value.Trim().ToLower(CultureInfo.InvariantCulture).Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            return builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("đ", "d");
        }
    }
}
