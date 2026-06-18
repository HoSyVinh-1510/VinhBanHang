using System;

namespace BaseCore.Entities
{
    public class CartItem
    {
        // Maps to dbo.CartItems(CartItemId)
        public int Id { get; set; }

        // Maps to dbo.CartItems(UserId)
        public string UserId { get; set; } = "";

        // Maps to dbo.CartItems(ProductId)
        public int ProductId { get; set; }

        // Maps to dbo.CartItems(Quantity)
        public int Quantity { get; set; }

        // Maps to dbo.CartItems(AddedAt)
        public DateTime AddedAt { get; set; } = DateTime.Now;

        public Product? Product { get; set; }
    }
}
