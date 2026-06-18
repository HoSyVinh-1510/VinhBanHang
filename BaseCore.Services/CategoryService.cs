using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepositoryEF _categoryRepository;

        public CategoryService(ICategoryRepositoryEF categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<ServiceResult<PagedResult<Category>>> GetAllAsync(
            string role,
            string? keyword,
            bool? isActive,
            bool? hasImage,
            int page = 1,
            int pageSize = 20)
        {
            var safePage = Math.Max(1, page);
            var safePageSize = Math.Min(Math.Max(1, pageSize), 100);

            // Nu khA'ng phi Admin, ch% tr v? danh mc `ang hot `Tng
            var effectiveIsActive = role == "Admin" ? isActive : true;

            var (categories, totalCount) = await _categoryRepository.SearchAsync(
                keyword, effectiveIsActive, hasImage, safePage, safePageSize);

            var result = new PagedResult<Category>
            {
                Items = categories,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize
            };

            return ServiceResult<PagedResult<Category>>.Success(result);
        }

        public async Task<ServiceResult<Category>> GetByIdAsync(int id, string role)
        {
            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null || (!category.IsActive && role != "Admin"))
                return ServiceResult<Category>.Error("Category is not valid/ not found");

            return ServiceResult<Category>.Success(category);
        }

        public async Task<ServiceResult<Category>> CreateAsync(string role, CategoryDto dto)
        {
            if (role != "Admin")
                return ServiceResult<Category>.Error("Unauthorized");

            var existing = await _categoryRepository.GetByNameAsync(dto.Name);
            if (existing != null)
                return ServiceResult<Category>.Error("Category name already exists");

            var category = new Category
            {
                Name = dto.Name,
                Description = dto.Description,
                ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim(),
                IsActive = dto.IsActive
            };

            await _categoryRepository.AddAsync(category);
            return ServiceResult<Category>.Success(category);
        }

        public async Task<ServiceResult<Category>> UpdateAsync(string role, int id, CategoryDto dto)
        {
            if (role != "Admin")
                return ServiceResult<Category>.Error("Unauthorized");

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ServiceResult<Category>.Error("Category not found");

            category.Name = dto.Name ?? category.Name;
            category.Description = dto.Description ?? category.Description;
            category.ImageUrl = dto.ImageUrl == null ? category.ImageUrl : (string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl.Trim());
            category.IsActive = dto.IsActive;

            await _categoryRepository.UpdateAsync(category);
            return ServiceResult<Category>.Success(category);
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string role, int id)
        {
            if (role != "Admin")
                return ServiceResult<bool>.Error("Unauthorized");

            var category = await _categoryRepository.GetByIdAsync(id);
            if (category == null)
                return ServiceResult<bool>.Error("Category is not valid/ not found");

            category.IsActive = false;
            await _categoryRepository.UpdateAsync(category);
            return ServiceResult<bool>.Success(true, "Category disabled successfully");
        }
    }
}
