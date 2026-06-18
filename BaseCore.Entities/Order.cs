using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class Order
    {
        // Maps to dbo.Orders(OrderId)
        public int Id { get; set; }

        // Maps to dbo.Orders(UserId) - comes from JWT ClaimTypes.NameIdentifier
        public string UserId { get; set; } = "";

        // Maps to dbo.Orders(ReceiverName)
        public string ReceiverName { get; set; } = "";

        // Maps to dbo.Orders(Phone)
        public string Phone { get; set; } = "";

        // Maps to dbo.Orders(ShippingAddress)
        public string ShippingAddress { get; set; } = "";

        // Maps to dbo.Orders(Note)
        public string? Note { get; set; }

        // Maps to dbo.Orders(TotalAmount)
        public decimal TotalAmount { get; set; }

        // Maps to dbo.Orders(DiscountAmount)
        public decimal DiscountAmount { get; set; }

        // Maps to dbo.Orders(CouponCode)
        public string? CouponCode { get; set; }

        // Maps to dbo.Orders(PaymentMethod)
        public string PaymentMethod { get; set; } = "COD";

        // Maps to dbo.Orders(PaymentStatus)
        public string PaymentStatus { get; set; } = "Unpaid";

        // Maps to dbo.Orders(OrderStatus)
        public string OrderStatus { get; set; } = "Pending";

        // Maps to dbo.Orders(CreatedAt)
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Maps to dbo.Orders(DeliveryMethod)
        public string DeliveryMethod { get; set; } = "Delivery";

        // Maps to dbo.Orders(PickupTime)
        public DateTime? PickupTime { get; set; }

        [JsonIgnore]
        public List<OrderItem> OrderItems { get; set; } = new();

        [JsonIgnore]
        public List<OrderStatusHistory> StatusHistories { get; set; } = new();

        [JsonIgnore]
        public List<OrderActivityLog> ActivityLogs { get; set; } = new();
    }
}
