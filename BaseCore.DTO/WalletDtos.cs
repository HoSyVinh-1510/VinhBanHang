using System;

namespace BaseCore.DTO
{
    public class UserWalletDto
    {
        public int WalletId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public class WalletTransactionDto
    {
        public int TransactionId { get; set; }
        public int WalletId { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // Deposit, Payment, Refund
        public string? ReferenceId { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty; // Pending, Completed, Failed
        public DateTime CreatedAt { get; set; }
    }

    public class DepositRequestDto
    {
        public decimal Amount { get; set; }
        public string? ReferenceId { get; set; }
    }

    public class ApproveDepositDto
    {
        public string? Note { get; set; }
    }

    public class RejectDepositDto
    {
        public string? Note { get; set; }
    }

    public class WithdrawalRequestDto
    {
        public decimal Amount { get; set; }
        public int RefundQrId { get; set; }
    }
}
