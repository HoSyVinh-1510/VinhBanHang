using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Repository.Authen;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class WalletService : IWalletService
    {
        private readonly IWalletRepositoryEF _walletRepository;
        private readonly IUnitOfWorkEF _unitOfWork;
        private readonly IUserRefundQrRepository _refundQrRepository;

        public WalletService(IWalletRepositoryEF walletRepository, IUnitOfWorkEF unitOfWork, IUserRefundQrRepository refundQrRepository)
        {
            _walletRepository = walletRepository;
            _unitOfWork = unitOfWork;
            _refundQrRepository = refundQrRepository;
        }

        public async Task<ServiceResult<UserWalletDto>> GetWalletByUserIdAsync(string userId)
        {
            try
            {
                var wallet = await _walletRepository.GetOrCreateByUserIdAsync(userId);
                var dto = MapToWalletDto(wallet);
                return ServiceResult<UserWalletDto>.Success(dto, "Lấy thông tin ví thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<UserWalletDto>.Error($"Lỗi khi lấy thông tin ví: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetMyTransactionsAsync(string userId, int page, int pageSize)
        {
            try
            {
                var wallet = await _walletRepository.GetOrCreateByUserIdAsync(userId);
                var items = await _walletRepository.GetTransactionsAsync(wallet.Id, page, pageSize);
                var totalCount = await _walletRepository.GetTransactionsCountAsync(wallet.Id);

                var dtos = items.Select(MapToTransactionDto).ToList();
                var pagedResult = new PagedResult<WalletTransactionDto>
                {
                    Items = dtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                };

                return ServiceResult<PagedResult<WalletTransactionDto>>.Success(pagedResult, "Lấy lịch sử giao dịch ví thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<PagedResult<WalletTransactionDto>>.Error($"Lỗi khi lấy lịch sử giao dịch: {ex.Message}");
            }
        }

        public async Task<ServiceResult<WalletTransactionDto>> RequestDepositAsync(string userId, decimal amount, string? referenceId = null)
        {
            try
            {
                if (amount <= 0)
                    return ServiceResult<WalletTransactionDto>.Error("Số tiền nạp phải lớn hơn 0.");

                var wallet = await _walletRepository.GetOrCreateByUserIdAsync(userId);
                if (wallet.Status != "Active")
                    return ServiceResult<WalletTransactionDto>.Error("Ví tài khoản của bạn đang bị khóa.");

                var transaction = new WalletTransaction
                {
                    WalletId = wallet.Id,
                    Amount = amount,
                    Type = "Deposit",
                    Status = "Pending",
                    Description = $"Yêu cầu nạp tiền vào ví điện tử: {amount:N0} VND",
                    CreatedAt = DateTime.Now
                };

                await _walletRepository.AddTransactionAsync(transaction);
                
                // We use the TransactionId as ReferenceId if none is provided
                transaction.ReferenceId = !string.IsNullOrEmpty(referenceId) ? referenceId : $"DEP{transaction.Id:D6}";
                await _walletRepository.UpdateTransactionAsync(transaction);

                var dto = MapToTransactionDto(transaction);
                return ServiceResult<WalletTransactionDto>.Success(dto, "Yêu cầu nạp tiền đã được gửi. Vui lòng thực hiện chuyển khoản để hoàn tất.");
            }
            catch (Exception ex)
            {
                return ServiceResult<WalletTransactionDto>.Error($"Lỗi khi yêu cầu nạp tiền: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetPendingDepositsAsync(string adminRole, int page, int pageSize)
        {
            if (adminRole != "Admin")
                return ServiceResult<PagedResult<WalletTransactionDto>>.Error("Bạn không có quyền truy cập chức năng này.");

            try
            {
                var (items, totalCount) = await _walletRepository.GetPendingTransactionsByTypeAsync("Deposit", page, pageSize);
                var dtos = items.Select(MapToTransactionDto).ToList();
                var pagedResult = new PagedResult<WalletTransactionDto>
                {
                    Items = dtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                };

                return ServiceResult<PagedResult<WalletTransactionDto>>.Success(pagedResult, "Lấy danh sách yêu cầu nạp tiền chờ duyệt thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<PagedResult<WalletTransactionDto>>.Error($"Lỗi khi lấy danh sách chờ duyệt: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ApproveDepositAsync(string adminRole, int transactionId, string adminUserId)
        {
            if (adminRole != "Admin")
                return ServiceResult<bool>.Error("Bạn không có quyền duyệt giao dịch này.");

            using (var tx = await _unitOfWork.BeginTransactionAsync())
            {
                try
                {
                    var transaction = await _walletRepository.GetTransactionByIdAsync(transactionId);
                    if (transaction == null)
                        return ServiceResult<bool>.Error("Giao dịch không tồn tại.");

                    if (transaction.Status != "Pending")
                        return ServiceResult<bool>.Error("Giao dịch đã được xử lý từ trước.");

                    if (transaction.Type != "Deposit")
                        return ServiceResult<bool>.Error("Giao dịch này không phải là nạp tiền.");

                    var wallet = await _walletRepository.GetByIdAsync(transaction.WalletId);
                    if (wallet == null)
                        return ServiceResult<bool>.Error("Ví tài khoản liên kết không tồn tại.");

                    // Update wallet balance
                    wallet.Balance += transaction.Amount;
                    wallet.UpdatedAt = DateTime.Now;
                    await _walletRepository.UpdateAsync(wallet);

                    // Update transaction
                    transaction.Status = "Completed";
                    transaction.Description = $"Duyệt nạp tiền thành công bởi Admin #{adminUserId}";
                    await _walletRepository.UpdateTransactionAsync(transaction);

                    await tx.CommitAsync();
                    return ServiceResult<bool>.Success(true, "Duyệt nạp tiền thành công. Số dư của người dùng đã được cập nhật.");
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return ServiceResult<bool>.Error($"Lỗi hệ thống khi duyệt giao dịch: {ex.Message}");
                }
            }
        }

        public async Task<ServiceResult<bool>> RejectDepositAsync(string adminRole, int transactionId, string adminUserId)
        {
            if (adminRole != "Admin")
                return ServiceResult<bool>.Error("Bạn không có quyền từ chối giao dịch này.");

            try
            {
                var transaction = await _walletRepository.GetTransactionByIdAsync(transactionId);
                if (transaction == null)
                    return ServiceResult<bool>.Error("Giao dịch không tồn tại.");

                if (transaction.Status != "Pending")
                    return ServiceResult<bool>.Error("Giao dịch đã được xử lý từ trước.");

                transaction.Status = "Failed";
                transaction.Description = $"Bị từ chối nạp tiền bởi Admin #{adminUserId}";
                await _walletRepository.UpdateTransactionAsync(transaction);

                return ServiceResult<bool>.Success(true, "Đã từ chối yêu cầu nạp tiền thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<bool>.Error($"Lỗi khi từ chối giao dịch: {ex.Message}");
            }
        }

        public async Task<ServiceResult<WalletTransactionDto>> RequestWithdrawalAsync(string userId, decimal amount, int refundQrId)
        {
            try
            {
                if (amount <= 0)
                    return ServiceResult<WalletTransactionDto>.Error("Số tiền rút phải lớn hơn 0.");

                using (var tx = await _unitOfWork.BeginTransactionAsync())
                {
                    var wallet = await _walletRepository.GetOrCreateByUserIdAsync(userId);
                    if (wallet.Status != "Active")
                        return ServiceResult<WalletTransactionDto>.Error("Ví tài khoản của bạn đang bị khóa.");

                    if (wallet.Balance < amount)
                        return ServiceResult<WalletTransactionDto>.Error("Số dư ví không đủ để thực hiện yêu cầu rút tiền.");

                    var refundQr = await _refundQrRepository.GetByIdAsync(refundQrId);
                    if (refundQr == null || refundQr.UserId != userId)
                        return ServiceResult<WalletTransactionDto>.Error("Mã QR nhận tiền không hợp lệ hoặc không thuộc về tài khoản của bạn.");

                    // Deduct wallet balance immediately (locks the money)
                    wallet.Balance -= amount;
                    wallet.UpdatedAt = DateTime.Now;
                    await _walletRepository.UpdateAsync(wallet);

                    var transaction = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = -amount, // Withdrawal is negative
                        Type = "Withdrawal",
                        Status = "Pending",
                        Description = $"Yêu cầu rút tiền về tài khoản: {refundQr.DisplayName}. QR_ID:{refundQr.Id}",
                        CreatedAt = DateTime.Now
                    };

                    await _walletRepository.AddTransactionAsync(transaction);

                    transaction.ReferenceId = $"WDR{transaction.Id:D6}";
                    // Append the QrId to reference so admin can lookup if needed, or we just rely on the UI matching by description
                    // The UI for admin currently doesn't show QR for withdrawal, Admin just approves it.
                    await _walletRepository.UpdateTransactionAsync(transaction);

                    await tx.CommitAsync();

                    var dto = MapToTransactionDto(transaction);
                    return ServiceResult<WalletTransactionDto>.Success(dto, "Yêu cầu rút tiền đã được tạo thành công và đang chờ Admin phê duyệt.");
                }
            }
            catch (Exception ex)
            {
                return ServiceResult<WalletTransactionDto>.Error($"Lỗi khi yêu cầu rút tiền: {ex.Message}");
            }
        }

        public async Task<ServiceResult<PagedResult<WalletTransactionDto>>> GetPendingWithdrawalsAsync(string adminRole, int page, int pageSize)
        {
            if (adminRole != "Admin")
                return ServiceResult<PagedResult<WalletTransactionDto>>.Error("Bạn không có quyền truy cập chức năng này.");

            try
            {
                var (items, totalCount) = await _walletRepository.GetPendingTransactionsByTypeAsync("Withdrawal", page, pageSize);
                var dtos = items.Select(MapToTransactionDto).ToList();

                foreach (var dto in dtos)
                {
                    if (dto.Description != null && dto.Description.Contains("QR_ID:"))
                    {
                        var parts = dto.Description.Split("QR_ID:");
                        if (parts.Length == 2 && int.TryParse(parts[1], out int qrId))
                        {
                            var refundQr = await _refundQrRepository.GetByIdAsync(qrId);
                            if (refundQr != null)
                            {
                                dto.Description = parts[0].TrimEnd(' ', '.') + $". Link QR: {refundQr.QrImageUrl}";
                            }
                            else
                            {
                                dto.Description = parts[0].TrimEnd(' ', '.');
                            }
                        }
                    }
                }

                var pagedResult = new PagedResult<WalletTransactionDto>
                {
                    Items = dtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize
                };

                return ServiceResult<PagedResult<WalletTransactionDto>>.Success(pagedResult, "Lấy danh sách yêu cầu rút tiền chờ duyệt thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<PagedResult<WalletTransactionDto>>.Error($"Lỗi khi lấy danh sách chờ duyệt: {ex.Message}");
            }
        }

        public async Task<ServiceResult<bool>> ApproveWithdrawalAsync(string adminRole, int transactionId, string adminUserId)
        {
            if (adminRole != "Admin")
                return ServiceResult<bool>.Error("Bạn không có quyền duyệt giao dịch này.");

            using (var tx = await _unitOfWork.BeginTransactionAsync())
            {
                try
                {
                    var transaction = await _walletRepository.GetTransactionByIdAsync(transactionId);
                    if (transaction == null)
                        return ServiceResult<bool>.Error("Giao dịch không tồn tại.");

                    if (transaction.Status != "Pending")
                        return ServiceResult<bool>.Error("Giao dịch đã được xử lý từ trước.");

                    if (transaction.Type != "Withdrawal")
                        return ServiceResult<bool>.Error("Giao dịch này không phải là rút tiền.");

                    transaction.Status = "Completed";
                    transaction.Description = transaction.Description + $" | Duyệt rút tiền thành công bởi Admin #{adminUserId}";
                    await _walletRepository.UpdateTransactionAsync(transaction);

                    await tx.CommitAsync();
                    return ServiceResult<bool>.Success(true, "Duyệt yêu cầu rút tiền thành công.");
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return ServiceResult<bool>.Error($"Lỗi hệ thống khi duyệt yêu cầu rút tiền: {ex.Message}");
                }
            }
        }

        public async Task<ServiceResult<bool>> RejectWithdrawalAsync(string adminRole, int transactionId, string adminUserId)
        {
            if (adminRole != "Admin")
                return ServiceResult<bool>.Error("Bạn không có quyền từ chối giao dịch này.");

            using (var tx = await _unitOfWork.BeginTransactionAsync())
            {
                try
                {
                    var transaction = await _walletRepository.GetTransactionByIdAsync(transactionId);
                    if (transaction == null)
                        return ServiceResult<bool>.Error("Giao dịch không tồn tại.");

                    if (transaction.Status != "Pending")
                        return ServiceResult<bool>.Error("Giao dịch đã được xử lý từ trước.");

                    if (transaction.Type != "Withdrawal")
                        return ServiceResult<bool>.Error("Giao dịch này không phải là rút tiền.");

                    var wallet = await _walletRepository.GetByIdAsync(transaction.WalletId);
                    if (wallet == null || wallet.Status == "Locked")
                        return ServiceResult<bool>.Error("Ví tài khoản liên kết không tồn tại/ bị khoá.");

                    // Refund the deducted amount back to the user's wallet
                    wallet.Balance += Math.Abs(transaction.Amount);
                    wallet.UpdatedAt = DateTime.Now;
                    await _walletRepository.UpdateAsync(wallet);

                    transaction.Status = "Failed";
                    transaction.Description = transaction.Description + $" | Từ chối rút tiền bởi Admin #{adminUserId}";
                    await _walletRepository.UpdateTransactionAsync(transaction);

                    await tx.CommitAsync();
                    return ServiceResult<bool>.Success(true, "Đã từ chối yêu cầu rút tiền thành công. Số tiền đã được hoàn trả lại ví thành viên.");
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return ServiceResult<bool>.Error($"Lỗi hệ thống khi từ chối yêu cầu rút tiền: {ex.Message}");
                }
            }
        }

        private static UserWalletDto MapToWalletDto(UserWallet wallet)
        {
            return new UserWalletDto
            {
                WalletId = wallet.Id,
                UserId = wallet.UserId,
                Balance = wallet.Balance,
                Status = wallet.Status,
                UpdatedAt = wallet.UpdatedAt
            };
        }

        private static WalletTransactionDto MapToTransactionDto(WalletTransaction t)
        {
            return new WalletTransactionDto
            {
                TransactionId = t.Id,
                WalletId = t.WalletId,
                Amount = t.Amount,
                Type = t.Type,
                ReferenceId = t.ReferenceId,
                Description = t.Description,
                Status = t.Status,
                CreatedAt = t.CreatedAt
            };
        }
    }
}
