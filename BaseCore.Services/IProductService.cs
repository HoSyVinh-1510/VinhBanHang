using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IProductService
    {
        Task<ServiceResult<PagedResult<ProductDto>>> GetAllAsync(
            string? keyword,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            bool? inStock,
            bool? isFeatured,
            bool? isActive,
            string? sortBy,
            string? sortDirection,
            int page = 1,
            int pageSize = 10);

        Task<ServiceResult<ProductDto>> GetByIdAsync(int id, string role);
        Task<ServiceResult<ProductDto>> CreateAsync(string role, ProductCreateDto dto);
        Task<ServiceResult<ProductDto>> UpdateAsync(string role, int id, ProductUpdateDto dto);
        Task<ServiceResult<bool>> DeleteAsync(string role, int id);
        Task<ServiceResult<List<ProductDto>>> GetByCategoryAsync(int categoryId);
        Task<ServiceResult<List<CategoryProductCountDto>>> GetCategoryCountsAsync();
    }
}
