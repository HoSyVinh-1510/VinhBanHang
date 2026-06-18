using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class ProductReviewService : IProductReviewService
    {
        private readonly IProductRepositoryEF _productRepository;
        private readonly IProductReviewRepositoryEF _reviewRepository;

        public ProductReviewService(
            IProductRepositoryEF productRepository,
            IProductReviewRepositoryEF reviewRepository)
        {
            _productRepository = productRepository;
            _reviewRepository = reviewRepository;
        }

        public async Task<ServiceResult<ProductReviewPagedResult>> GetByProductAsync(int productId, int page = 1, int pageSize = 5)
        {
            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null || !product.IsActive)
            {
                return ServiceResult<ProductReviewPagedResult>.Error("Product is not valid/ not found");
            }

            var reviews = await _reviewRepository.GetApprovedByProductAsync(productId);
            var totalReviews = reviews.Count;
            var averageRating = totalReviews == 0
                ? 0
                : Math.Round(reviews.Average(review => review.Rating), 1);
            
            var safePage = page <= 0 ? 1 : page;
            var safePageSize = pageSize <= 0 ? 5 : Math.Min(pageSize, 50);

            var items = reviews
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .Select(review => new ProductReviewResponseDto
                {
                    Id = review.Id,
                    ProductId = review.ProductId,
                    UserId = review.UserId,
                    OrderId = review.OrderId,
                    OrderItemId = review.OrderItemId,
                    UserName = review.User != null ? review.User.Name ?? review.User.UserName : "Customer",
                    Rating = review.Rating,
                    Comment = review.Comment,
                    CreatedAt = review.CreatedAt,
                    UpdatedAt = review.UpdatedAt
                }).ToList();

            var result = new ProductReviewPagedResult
            {
                Items = items,
                TotalReviews = totalReviews,
                AverageRating = averageRating,
                Page = safePage,
                PageSize = safePageSize
            };

            return ServiceResult<ProductReviewPagedResult>.Success(result);
        }

        public async Task<ServiceResult<List<ProductReviewResponseDto>>> GetMineByOrderAsync(string userId, int orderId)
        {
            var reviews = await _reviewRepository.GetByOrderForUserAsync(orderId, userId);
            
            var items = reviews.Select(review => new ProductReviewResponseDto
            {
                Id = review.Id,
                ProductId = review.ProductId,
                OrderId = review.OrderId,
                OrderItemId = review.OrderItemId,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt,
                UpdatedAt = review.UpdatedAt
            }).ToList();

            return ServiceResult<List<ProductReviewResponseDto>>.Success(items);
        }

        public async Task<ServiceResult<ProductReviewResponseDto>> CreateAsync(string userId, int productId, ProductReviewDto dto)
        {
            if (dto.Rating < 1 || dto.Rating > 5)
            {
                return ServiceResult<ProductReviewResponseDto>.Error("Rating must be between 1 and 5.");
            }

            if (dto.OrderItemId <= 0)
            {
                return ServiceResult<ProductReviewResponseDto>.Error("Order item is required for product review.");
            }

            var product = await _productRepository.GetByIdAsync(productId);
            if (product == null || !product.IsActive)
            {
                return ServiceResult<ProductReviewResponseDto>.Error("Product not found");
            }

            var orderItem = await _reviewRepository.GetCompletedOrderItemForReviewAsync(
                userId,
                productId,
                dto.OrderItemId);
                
            if (orderItem == null)
            {
                return ServiceResult<ProductReviewResponseDto>.Error("You can review only products from your completed orders.");
            }

            var existingReview = await _reviewRepository.GetByOrderItemAsync(dto.OrderItemId);
            if (existingReview != null)
            {
                return ServiceResult<ProductReviewResponseDto>.Error("This order item has already been reviewed.");
            }

            var review = new ProductReview
            {
                ProductId = productId,
                UserId = userId,
                OrderId = orderItem.OrderId,
                OrderItemId = orderItem.Id,
                Rating = dto.Rating,
                Comment = NormalizeComment(dto.Comment),
                IsApproved = true,
                CreatedAt = DateTime.UtcNow
            };
            
            await _reviewRepository.AddAsync(review);

            var resultDto = new ProductReviewResponseDto
            {
                Id = review.Id,
                ProductId = review.ProductId,
                UserId = review.UserId,
                OrderId = review.OrderId,
                OrderItemId = review.OrderItemId,
                Rating = review.Rating,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt,
                UpdatedAt = review.UpdatedAt
            };

            return ServiceResult<ProductReviewResponseDto>.Success(resultDto);
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string userId, string role, int id)
        {
            var review = await _reviewRepository.GetByIdAsync(id);
            if (review == null)
            {
                return ServiceResult<bool>.Error("Review not found");
            }

            if (role != "Admin" && review.UserId != userId)
            {
                return ServiceResult<bool>.Error("Unauthorized");
            }

            await _reviewRepository.DeleteAsync(review);
            return ServiceResult<bool>.Success(true, "Review deleted");
        }

        private static string? NormalizeComment(string? comment)
        {
            return string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        }
    }
}
