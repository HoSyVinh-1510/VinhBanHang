using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IWalletService
    {
        Task<ServiceResult<UserWalletDto>> GetWalletByUserIdAsync(string userId);
        Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetMyTransactionsAsync(string userId, int page, int pageSize);
        Task<ServiceResult<WalletTransactionDto>> RequestDepositAsync(string userId, decimal amount, string? referenceId = null);
        Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetPendingDepositsAsync(string adminRole, int page, int pageSize);
        Task<ServiceResult<bool>> ApproveDepositAsync(string adminRole, int transactionId, string adminUserId);
        Task<ServiceResult<bool>> RejectDepositAsync(string adminRole, int transactionId, string adminUserId);
        Task<ServiceResult<WalletTransactionDto>> RequestWithdrawalAsync(string userId, decimal amount, int refundQrId);
        Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetPendingWithdrawalsAsync(string adminRole, int page, int pageSize);
        Task<ServiceResult<bool>> ApproveWithdrawalAsync(string adminRole, int transactionId, string adminUserId);
        Task<ServiceResult<bool>> RejectWithdrawalAsync(string adminRole, int transactionId, string adminUserId);
    }
}
