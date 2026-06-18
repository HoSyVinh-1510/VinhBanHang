using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ICouponService
    {
        Task<(bool IsValid, string Message, Coupon? Coupon, decimal DiscountAmount)> ValidateAsync(
            string code,
            decimal orderSubtotal);

        Task<ServiceResult<PagedResult<CouponDto>>> GetAllAsync(string role, string? keyword, bool? isActive, int page = 1, int pageSize = 10);
        Task<ServiceResult<PagedResult<CouponDto>>> GetActiveAsync(string? keyword, string? discountType, decimal? maxMinOrderAmount, string? sortBy, int page = 1, int pageSize = 12);
        Task<ServiceResult<CouponDto>> GetByIdAsync(int id, string role);
        Task<ServiceResult<CouponDto>> CreateAsync(string role, CouponUpsertDto dto);
        Task<ServiceResult<CouponDto>> UpdateAsync(string role, int id, CouponUpsertDto dto);
        Task<ServiceResult<CouponDto>> UpdateStatusAsync(string role, int id, CouponStatusDto dto);
        Task<ServiceResult<bool>> DeleteAsync(string role, int id);
    }
}
