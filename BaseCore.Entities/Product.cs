using System;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;

namespace BaseCore.Entities
{
    public class Product
    {
        // Maps to dbo.Products(ProductId)
        public int Id { get; set; }

        // Maps to dbo.Products(CategoryId)
        public int CategoryId { get; set; }

        // Maps to dbo.Products(ProductName)
        public string Name { get; set; } = "";

        // Maps to dbo.Products(Description)
        public string? Description { get; set; }

        // Maps to dbo.Products(Price)
        public decimal Price { get; set; }

        // Maps to dbo.Products(StockQuantity)
        public int Stock { get; set; }

        // Maps to dbo.Products(ThumbnailUrl)
        public string? ImageUrl { get; set; }

        // Maps to dbo.Products(Unit)
        public string? Unit { get; set; }

        // Maps to dbo.Products(IsFeatured)
        public bool IsFeatured { get; set; }

        // Maps to dbo.Products(IsActive)
        public bool IsActive { get; set; } = true;

        // Maps to dbo.Products(CreatedAt)
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [NotMapped]
        public int SoldCount { get; set; }

        [NotMapped]
        public double AverageRating { get; set; }

        [NotMapped]
        public int TotalReviews { get; set; }

        public Category? Category { get; set; }

        [JsonIgnore]
        public List<OrderItem>? OrderItems { get; set; }

        [JsonIgnore]
        public List<CartItem>? CartItems { get; set; }

        [JsonIgnore]
        public List<ProductImage>? ProductImages { get; set; }

        [JsonIgnore]
        public List<ProductReview>? Reviews { get; set; }
    }
}
