using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class CouponService : ICouponService
    {
        private readonly ICouponRepositoryEF _couponRepository;

        public CouponService(ICouponRepositoryEF couponRepository)
        {
            _couponRepository = couponRepository;
        }

        public async Task<(bool IsValid, string Message, Coupon? Coupon, decimal DiscountAmount)> ValidateAsync(
            string code,
            decimal orderSubtotal)
        {
            var coupon = await _couponRepository.GetByCodeAsync(code);
            if (coupon == null)
            {
                return (false, "Coupon does not exist.", null, 0);
            }

            if (!coupon.IsActive)
            {
                return (false, "Coupon is inactive.", coupon, 0);
            }

            var now = DateTime.Now;
            if (now < coupon.StartAt || now > coupon.EndAt)
            {
                return (false, "Coupon is expired or not active yet.", coupon, 0);
            }

            if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit.Value)
            {
                return (false, "Coupon usage limit reached.", coupon, 0);
            }

            if (orderSubtotal < coupon.MinOrderAmount)
            {
                return (
                    false,
                    $"Order subtotal must be at least {coupon.MinOrderAmount:N0} to apply this coupon.",
                    coupon,
                    0);
            }

            var discountAmount = 0m;
            if (coupon.DiscountType.Equals("Percent", StringComparison.OrdinalIgnoreCase))
            {
                discountAmount = orderSubtotal * (coupon.DiscountValue / 100m);
                if (coupon.MaxDiscountAmount.HasValue)
                {
                    discountAmount = Math.Min(discountAmount, coupon.MaxDiscountAmount.Value);
                }
            }
            else if (coupon.DiscountType.Equals("Fixed", StringComparison.OrdinalIgnoreCase))
            {
                discountAmount = coupon.DiscountValue;
            }
            else
            {
                return (false, "Coupon discount type is invalid.", coupon, 0);
            }

            discountAmount = Math.Min(discountAmount, orderSubtotal);

            if (discountAmount <= 0)
            {
                return (false, "Coupon cannot be applied to this order.", coupon, 0);
            }

            return (true, "Coupon applied successfully.", coupon, discountAmount);
        }

        public async Task<ServiceResult<PagedResult<CouponDto>>> GetAllAsync(string role, string? keyword, bool? isActive, int page = 1, int pageSize = 10)
        {
            var safePage = page <= 0 ? 1 : page;
            var safePageSize = pageSize <= 0 ? 10 : Math.Min(pageSize, 100);

            var effectiveIsActive = role == "Admin" ? isActive : true;
            var effectiveIsPublic = role == "Admin" ? (bool?)null : true;

            var (coupons, totalCount) = await _couponRepository.SearchAsync(
                keyword, effectiveIsActive, null, effectiveIsPublic, safePage, safePageSize);

            var items = coupons.Select(MapToCouponDto).ToList();
            
            var result = new PagedResult<CouponDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize
            };

            return ServiceResult<PagedResult<CouponDto>>.Success(result);
        }

        public async Task<ServiceResult<PagedResult<CouponDto>>> GetActiveAsync(
            string? keyword,
            string? discountType,
            decimal? maxMinOrderAmount,
            string? sortBy,
            int page = 1,
            int pageSize = 12)
        {
            var safePage = page <= 0 ? 1 : page;
            var safePageSize = pageSize <= 0 ? 12 : Math.Min(pageSize, 100);

            var (coupons, totalCount) = await _couponRepository.GetActiveAsync(
                keyword,
                discountType,
                maxMinOrderAmount,
                sortBy,
                safePage,
                safePageSize);

            var items = coupons.Select(MapToCouponDto).ToList();

            var result = new PagedResult<CouponDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize
            };

            return ServiceResult<PagedResult<CouponDto>>.Success(result);
        }

        public async Task<ServiceResult<CouponDto>> GetByIdAsync(int id, string role)
        {
            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null || (!coupon.IsActive && role != "Admin"))
            {
                return ServiceResult<CouponDto>.Error("Coupon not found");
            }

            return ServiceResult<CouponDto>.Success(MapToCouponDto(coupon));
        }

        public async Task<ServiceResult<CouponDto>> CreateAsync(string role, CouponUpsertDto dto)
        {
            if (role != "Admin")
                return ServiceResult<CouponDto>.Error("Unauthorized");

            var (isValid, message) = ValidateCouponInput(dto);
            if (!isValid)
                return ServiceResult<CouponDto>.Error(message);

            var normalizedCode = dto.Code.Trim().ToUpperInvariant();
            var existingCoupon = await _couponRepository.GetByCodeAsync(normalizedCode);
            if (existingCoupon != null)
                return ServiceResult<CouponDto>.Error("Coupon code already exists");

            var coupon = BuildCouponEntity(dto, normalizedCode);
            await _couponRepository.AddAsync(coupon);
            return ServiceResult<CouponDto>.Success(MapToCouponDto(coupon));
        }

        public async Task<ServiceResult<CouponDto>> UpdateAsync(string role, int id, CouponUpsertDto dto)
        {
            if (role != "Admin")
                return ServiceResult<CouponDto>.Error("Unauthorized");

            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return ServiceResult<CouponDto>.Error("Coupon not found");

            var (isValid, message) = ValidateCouponInput(dto);
            if (!isValid)
                return ServiceResult<CouponDto>.Error(message);

            var normalizedCode = dto.Code.Trim().ToUpperInvariant();
            var existingCoupon = await _couponRepository.GetByCodeAsync(normalizedCode);
            if (existingCoupon != null && existingCoupon.Id != id)
                return ServiceResult<CouponDto>.Error("Coupon code already exists");

            ApplyCouponUpdates(coupon, dto, normalizedCode);
            await _couponRepository.UpdateAsync(coupon);
            return ServiceResult<CouponDto>.Success(MapToCouponDto(coupon));
        }

        public async Task<ServiceResult<CouponDto>> UpdateStatusAsync(string role, int id, CouponStatusDto dto)
        {
            if (role != "Admin")
                return ServiceResult<CouponDto>.Error("Unauthorized");

            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return ServiceResult<CouponDto>.Error("Coupon not found");

            coupon.IsActive = dto.IsActive;
            await _couponRepository.UpdateAsync(coupon);
            return ServiceResult<CouponDto>.Success(MapToCouponDto(coupon));
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string role, int id)
        {
            if (role != "Admin")
                return ServiceResult<bool>.Error("Unauthorized");

            var coupon = await _couponRepository.GetByIdAsync(id);
            if (coupon == null)
                return ServiceResult<bool>.Error("Coupon not found");

            if (coupon.UsedCount > 0)
                return ServiceResult<bool>.Error("Coupon has already been used. Please disable it instead of deleting.");

            await _couponRepository.DeleteAsync(coupon);
            return ServiceResult<bool>.Success(true, "Coupon deleted successfully");
        }

        private static Coupon BuildCouponEntity(CouponUpsertDto dto, string normalizedCode)
        {
            var normalizedDiscountType = NormalizeDiscountType(dto.DiscountType);

            return new Coupon
            {
                Code = normalizedCode,
                Name = dto.Name.Trim(),
                Description = NormalizeNullable(dto.Description),
                DiscountType = normalizedDiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxDiscountAmount = normalizedDiscountType == "Percent" ? dto.MaxDiscountAmount : null,
                StartAt = dto.StartAt,
                EndAt = dto.EndAt,
                UsageLimit = dto.UsageLimit,
                UsedCount = 0,
                IsActive = dto.IsActive,
                IsPublic = dto.IsPublic,
                DisplayOrder = dto.DisplayOrder,
                CreatedAt = DateTime.Now
            };
        }

        private static void ApplyCouponUpdates(Coupon coupon, CouponUpsertDto dto, string normalizedCode)
        {
            var normalizedDiscountType = NormalizeDiscountType(dto.DiscountType);

            coupon.Code = normalizedCode;
            coupon.Name = dto.Name.Trim();
            coupon.Description = NormalizeNullable(dto.Description);
            coupon.DiscountType = normalizedDiscountType;
            coupon.DiscountValue = dto.DiscountValue;
            coupon.MinOrderAmount = dto.MinOrderAmount;
            coupon.MaxDiscountAmount = normalizedDiscountType == "Percent" ? dto.MaxDiscountAmount : null;
            coupon.StartAt = dto.StartAt;
            coupon.EndAt = dto.EndAt;
            coupon.UsageLimit = dto.UsageLimit;
            coupon.IsActive = dto.IsActive;
            coupon.IsPublic = dto.IsPublic;
            coupon.DisplayOrder = dto.DisplayOrder;
        }

        private static CouponDto MapToCouponDto(Coupon coupon)
        {
            return new CouponDto
            {
                Id = coupon.Id,
                Code = coupon.Code,
                Name = coupon.Name,
                Description = coupon.Description,
                DiscountType = coupon.DiscountType,
                DiscountValue = coupon.DiscountValue,
                MinOrderAmount = coupon.MinOrderAmount,
                MaxDiscountAmount = coupon.MaxDiscountAmount,
                StartAt = coupon.StartAt,
                EndAt = coupon.EndAt,
                UsageLimit = coupon.UsageLimit,
                UsedCount = coupon.UsedCount,
                IsActive = coupon.IsActive,
                IsPublic = coupon.IsPublic,
                DisplayOrder = coupon.DisplayOrder,
                CreatedAt = coupon.CreatedAt
            };
        }

        private static (bool IsValid, string Message) ValidateCouponInput(CouponUpsertDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
                return (false, "Coupon code is required");

            if (string.IsNullOrWhiteSpace(dto.Name))
                return (false, "Coupon name is required");

            if (dto.DiscountValue <= 0)
                return (false, "Discount value must be greater than 0");

            if (dto.MinOrderAmount < 0)
                return (false, "Minimum order amount cannot be negative");

            if (dto.MaxDiscountAmount.HasValue && dto.MaxDiscountAmount.Value < 0)
                return (false, "Maximum discount amount cannot be negative");

            if (dto.UsageLimit.HasValue && dto.UsageLimit.Value <= 0)
                return (false, "Usage limit must be greater than 0");

            if (dto.DisplayOrder < 0)
                return (false, "Display order cannot be negative");

            if (dto.EndAt <= dto.StartAt)
                return (false, "End date must be greater than start date");

            if (!TryNormalizeDiscountType(dto.DiscountType, out var discountType))
                return (false, "Discount type must be Percent or Fixed");

            if (discountType == "Percent" && (dto.DiscountValue > 100 || dto.DiscountValue < 0))
                return (false, "Percent discount must be between 0 and 100");

            return (true, string.Empty);
        }

        private static string NormalizeDiscountType(string? discountType)
        {
            TryNormalizeDiscountType(discountType, out var normalizedDiscountType);
            return normalizedDiscountType;
        }

        private static bool TryNormalizeDiscountType(string? discountType, out string normalizedDiscountType)
        {
            if (discountType != null && discountType.Equals("Fixed", StringComparison.OrdinalIgnoreCase))
            {
                normalizedDiscountType = "Fixed";
                return true;
            }

            if (discountType != null && discountType.Equals("Percent", StringComparison.OrdinalIgnoreCase))
            {
                normalizedDiscountType = "Percent";
                return true;
            }

            normalizedDiscountType = "Percent";
            return false;
        }

        private static string? NormalizeNullable(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
