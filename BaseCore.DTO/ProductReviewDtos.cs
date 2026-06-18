using System;
using System.Collections.Generic;

namespace BaseCore.DTO
{
    public class ProductReviewDto
    {
        public int OrderItemId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }

    public class ProductReviewResponseDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string? UserId { get; set; }
        public int? OrderId { get; set; }
        public int? OrderItemId { get; set; }
        public string UserName { get; set; } = "Customer";
        public double Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class ProductReviewPagedResult
    {
        public List<ProductReviewResponseDto> Items { get; set; } = new();
        public int TotalReviews { get; set; }
        public double AverageRating { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalReviews / PageSize) : 0;
    }
}

