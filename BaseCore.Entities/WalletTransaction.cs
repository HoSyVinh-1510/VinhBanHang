using System;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class WalletTransaction
    {
        public int Id { get; set; } // Maps to TransactionId
        public int WalletId { get; set; }
        public decimal Amount { get; set; }
        public string Type { get; set; } = string.Empty; // Deposit, Payment, Refund
        public string? ReferenceId { get; set; } // OrderId or DepositId
        public string? Description { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Completed, Failed
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [JsonIgnore]
        public UserWallet? Wallet { get; set; }
    }
}
