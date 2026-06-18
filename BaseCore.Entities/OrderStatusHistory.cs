using System;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    // Order status history row (dbo.OrderStatusHistories)
    public class OrderStatusHistory
    {
        // Maps to dbo.OrderStatusHistories(OrderStatusHistoryId)
        public int Id { get; set; }

        // Maps to dbo.OrderStatusHistories(OrderId)
        public int OrderId { get; set; }

        // Maps to dbo.OrderStatusHistories(PreviousStatus)
        public string? PreviousStatus { get; set; }

        // Maps to dbo.OrderStatusHistories(NewStatus)
        public string NewStatus { get; set; } = "";

        // Maps to dbo.OrderStatusHistories(Note)
        public string? Note { get; set; }

        // Maps to dbo.OrderStatusHistories(ChangedByUserId)
        public string? ChangedByUserId { get; set; }

        // Maps to dbo.OrderStatusHistories(ChangedByRole)
        public string? ChangedByRole { get; set; }

        // Maps to dbo.OrderStatusHistories(ChangedAt)
        public DateTime ChangedAt { get; set; } = DateTime.Now;

        [JsonIgnore]
        public Order? Order { get; set; }
    }
}
