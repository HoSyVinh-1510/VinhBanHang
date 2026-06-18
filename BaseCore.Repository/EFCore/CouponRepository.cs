using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace BaseCore.Repository.EFCore
{
    public interface ICouponRepositoryEF : IRepository<Coupon>
    {
        Task<(List<Coupon> Coupons, int TotalCount)> GetActiveAsync(
            string? keyword,
            string? discountType,
            decimal? maxMinOrderAmount,
            string? sortBy,
            int page,
            int pageSize);
        Task<(List<Coupon> Coupons, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            string? discountType,
            bool? isPublic,
            int page,
            int pageSize);
        Task<Coupon?> GetByCodeAsync(string code);

        Task<bool> TryIncrementUsageAsync(int couponId);
        Task<bool> DecrementUsageAsync(int couponId);
    }

    public class CouponRepositoryEF : Repository<Coupon>, ICouponRepositoryEF
    {
        public CouponRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<(List<Coupon> Coupons, int TotalCount)> GetActiveAsync(
            string? keyword,
            string? discountType,
            decimal? maxMinOrderAmount,
            string? sortBy,
            int page,
            int pageSize)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 12 : Math.Min(pageSize, 100);

            var now = DateTime.Now;
            var query = _dbSet
                .Where(coupon =>
                    coupon.IsActive &&
                    coupon.IsPublic &&
                    now >= coupon.StartAt &&
                    now <= coupon.EndAt &&
                    (!coupon.UsageLimit.HasValue || coupon.UsedCount < coupon.UsageLimit.Value));

            var normalizedKeyword = NormalizeSearchText(keyword);
            if (!string.IsNullOrEmpty(normalizedKeyword))
            {
                query = query.Where(coupon =>
                    coupon.Code.ToLower().Contains(normalizedKeyword) ||
                    coupon.Name.ToLower().Contains(normalizedKeyword) ||
                    (coupon.Description != null && coupon.Description.ToLower().Contains(normalizedKeyword)));
            }

            var normalizedDiscountType = NormalizeDiscountType(discountType);
            if (normalizedDiscountType != null)
            {
                query = query.Where(coupon => coupon.DiscountType.ToLower() == normalizedDiscountType.ToLower());
            }

            if (maxMinOrderAmount.HasValue)
            {
                query = query.Where(coupon => coupon.MinOrderAmount <= maxMinOrderAmount.Value);
            }

            var sortKey = (sortBy ?? string.Empty).Trim().ToLowerInvariant();
            query = sortKey switch
            {
                "endingsoon" => query.OrderBy(coupon => coupon.EndAt).ThenBy(coupon => coupon.DisplayOrder),
                "discountdesc" => query.OrderByDescending(coupon => coupon.DiscountValue).ThenBy(coupon => coupon.EndAt),
                "minorderasc" => query.OrderBy(coupon => coupon.MinOrderAmount).ThenBy(coupon => coupon.DisplayOrder),
                _ => query.OrderBy(coupon => coupon.DisplayOrder).ThenBy(coupon => coupon.EndAt)
            };

            var totalCount = await query.CountAsync();
            var coupons = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (coupons, totalCount);
        }

        public async Task<(List<Coupon> Coupons, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            string? discountType,
            bool? isPublic,
            int page,
            int pageSize)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 10 : Math.Min(pageSize, 100);

            var query = _dbSet.AsQueryable();

            var normalizedKeyword = NormalizeSearchText(keyword);
            if (!string.IsNullOrEmpty(normalizedKeyword))
            {
                query = query.Where(coupon =>
                    coupon.Code.ToLower().Contains(normalizedKeyword) ||
                    coupon.Name.ToLower().Contains(normalizedKeyword));
            }

            if (isActive.HasValue)
            {
                query = query.Where(coupon => coupon.IsActive == isActive.Value);
            }

            var normalizedDiscountType = NormalizeDiscountType(discountType);
            if (normalizedDiscountType != null)
            {
                query = query.Where(coupon => coupon.DiscountType.ToLower() == normalizedDiscountType.ToLower());
            }

            if (isPublic.HasValue)
            {
                query = query.Where(coupon => coupon.IsPublic == isPublic.Value);
            }

            query = query
                .OrderBy(coupon => coupon.DisplayOrder)
                .ThenByDescending(coupon => coupon.Id);

            var totalCount = await query.CountAsync();
            var coupons = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (coupons, totalCount);
        }

        public async Task<Coupon?> GetByCodeAsync(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return null;
            }

            var normalizedCode = code.Trim().ToUpper();
            return await _dbSet.FirstOrDefaultAsync(
                coupon => coupon.Code.ToUpper() == normalizedCode);
        }


        public async Task<bool> TryIncrementUsageAsync(int couponId)
        {
            var now = DateTime.Now;
            var affectedRows = await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE [dbo].[Coupons]
                SET [UsedCount] = [UsedCount] + 1
                WHERE [CouponId] = {couponId}
                  AND [IsActive] = 1
                  AND [StartAt] <= {now}
                  AND [EndAt] >= {now}
                  AND ([UsageLimit] IS NULL OR [UsedCount] < [UsageLimit]);");
            return affectedRows > 0;
        }

        public async Task<bool> DecrementUsageAsync(int couponId)
        {
            var affectedRows = await _context.Database.ExecuteSqlInterpolatedAsync($@"
                UPDATE [dbo].[Coupons]
                SET [UsedCount] = CASE
                    WHEN [UsedCount] > 0 THEN [UsedCount] - 1
                    ELSE 0
                END
                WHERE [CouponId] = {couponId};");

            return affectedRows > 0;
        }

        private static string NormalizeSearchText(string? keyword)
        {
            return string.IsNullOrWhiteSpace(keyword)
                ? string.Empty
                : keyword.Trim().ToLower(CultureInfo.InvariantCulture);
        }

        private static string? NormalizeDiscountType(string? discountType)
        {
            if (string.IsNullOrWhiteSpace(discountType))
            {
                return null;
            }

            var normalizedDiscountType = discountType.Trim();
            if (normalizedDiscountType.Equals("Percent", StringComparison.OrdinalIgnoreCase) ||
                normalizedDiscountType.Equals("Fixed", StringComparison.OrdinalIgnoreCase))
            {
                return normalizedDiscountType;
            }

            return null;
        }
    }
}
