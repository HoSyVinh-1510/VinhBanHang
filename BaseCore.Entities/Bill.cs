using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class Bill
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string UserId { get; set; } = "";
        public string BillCode { get; set; } = "";
        public string ReceiverName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string ShippingAddress { get; set; } = "";
        public decimal SubtotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; } = "COD";
        public string PaymentStatus { get; set; } = "Unpaid";
        public string BillStatus { get; set; } = "Issued";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? PaidAt { get; set; }

        [JsonIgnore]
        public Order? Order { get; set; }

        public List<BillDetail> BillDetails { get; set; } = new();
    }
}
