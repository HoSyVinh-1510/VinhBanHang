using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class UserWallet
    {
        public int Id { get; set; } // Maps to WalletId
        public string UserId { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public string Status { get; set; } = "Active"; // Active, Locked
        public DateTime? UpdatedAt { get; set; }

        [JsonIgnore]
        public User? User { get; set; }

        [JsonIgnore]
        public List<WalletTransaction>? Transactions { get; set; } = new();
    }
}
