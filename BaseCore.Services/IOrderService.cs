using BaseCore.DTO;
using BaseCore.Services.Models;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IOrderService
    {
        Task<ServiceResult> GetMyOrdersAsync(string userId, string role, OrderQueryDto query);
        Task<ServiceResult> GetAllOrdersAsync(OrderQueryDto query);
        Task<ServiceResult> GetByIdAsync(string userId, string role, int id);
        Task<ServiceResult> GetStatusHistoryAsync(string userId, string role, int id);
        Task<ServiceResult> ValidateCouponAsync(ValidateCouponDto dto);
        Task<ServiceResult> CreateAsync(string userId, string role, CreateOrderDto dto);
        Task<ServiceResult> UpdateStatusAsync(string userId, string role, int id, UpdateStatusDto dto);
        Task<ServiceResult> UpdatePaymentStatusAsync(string userId, string role, int id, UpdatePaymentStatusDto dto);
        Task<ServiceResult> SubmitBankTransferAsync(string userId, string role, int id, SubmitBankTransferDto dto);
        Task<ServiceResult> SubmitRefundTransferAsync(string userId, string role, int id, SubmitRefundTransferDto dto);
        Task<ServiceResult> ConfirmRefundReceivedAsync(string userId, string role, int id);
        Task<ServiceResult> ReceiveOrderAsync(string userId, string role, int id);
        Task<ServiceResult> CancelOrderAsync(string userId, string role, int id, CancelOrderRequestDto? dto = null);
        Task<ServiceResult> RequestReturnOrRefundAsync(string userId, string role, int id, ReturnRequestDto dto);
        Task<ServiceResult> ResolveReturnOrRefundRequestAsync(string userId, string role, int id, ResolveReturnRequestDto dto);
        Task<ServiceResult> GetOpenReturnRequestsAsync(string? keyword = null, string? paymentStatus = null, string? paymentMethod = null, DateTime? fromDate = null, DateTime? toDate = null, decimal? minTotal = null, decimal? maxTotal = null, int page = 1, int pageSize = 20);
    }
}

