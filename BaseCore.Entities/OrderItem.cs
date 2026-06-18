using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    // Order item row (dbo.OrderItems)
    public class OrderItem
    {
        // Maps to dbo.OrderItems(OrderItemId)
        public int Id { get; set; }
        
        // Maps to dbo.OrderItems(OrderId)
        public int OrderId { get; set; }

        public int ProductId { get; set; }

        public int Quantity { get; set; }

        public decimal UnitPrice { get; set; }

        // Maps to dbo.OrderItems(SubTotal) - computed persisted column
        public decimal SubTotal { get; private set; }

        [JsonIgnore]
        public Order? Order { get; set; }

        public Product? Product { get; set; }
    }
}
