using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IProductReviewService
    {
        Task<ServiceResult<ProductReviewPagedResult>> GetByProductAsync(int productId, int page = 1, int pageSize = 5);
        Task<ServiceResult<List<ProductReviewResponseDto>>> GetMineByOrderAsync(string userId, int orderId);
        Task<ServiceResult<ProductReviewResponseDto>> CreateAsync(string userId, int productId, ProductReviewDto dto);
        Task<ServiceResult<bool>> DeleteAsync(string userId, string role, int id);
    }
}
