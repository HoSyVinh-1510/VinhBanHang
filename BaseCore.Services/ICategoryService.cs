using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ICategoryService
    {
        Task<ServiceResult<PagedResult<Category>>> GetAllAsync(
            string role,
            string? keyword,
            bool? isActive,
            bool? hasImage,
            int page = 1,
            int pageSize = 20);

        Task<ServiceResult<Category>> GetByIdAsync(int id, string role);
        Task<ServiceResult<Category>> CreateAsync(string role, CategoryDto dto);
        Task<ServiceResult<Category>> UpdateAsync(string role, int id, CategoryDto dto);
        Task<ServiceResult<bool>> DeleteAsync(string role, int id);
    }
}
