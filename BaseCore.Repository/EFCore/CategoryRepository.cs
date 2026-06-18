using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Category Repository using Entity Framework Core
    /// </summary>
    public interface ICategoryRepositoryEF : IRepository<Category>
    {
        Task<Category?> GetByNameAsync(string name);
        Task<(List<Category> Categories, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            bool? hasImage,
            int page,
            int pageSize);
    }

    public class CategoryRepositoryEF : Repository<Category>, ICategoryRepositoryEF
    {
        public CategoryRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<Category?> GetByNameAsync(string name)
        {
            return await _dbSet.FirstOrDefaultAsync(c => c.Name.ToLower() == name.ToLower());
        }

        public async Task<(List<Category> Categories, int TotalCount)> SearchAsync(
            string? keyword,
            bool? isActive,
            bool? hasImage,
            int page,
            int pageSize)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 10 : Math.Min(pageSize, 100);

            var query = _dbSet.AsQueryable();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var normalizedKeyword = keyword.Trim().ToLower();
                query = query.Where(category =>
                    category.Name.ToLower().Contains(normalizedKeyword) ||
                    (category.Description != null && category.Description.ToLower().Contains(normalizedKeyword)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(category => category.IsActive == isActive.Value);
            }

            if (hasImage.HasValue)
            {
                if (hasImage.Value)
                {
                    query = query.Where(category =>
                        category.ImageUrl != null &&
                        category.ImageUrl.Trim() != string.Empty);
                }
                else
                {
                    query = query.Where(category =>
                        category.ImageUrl == null ||
                        category.ImageUrl.Trim() == string.Empty);
                }
            }

            query = query.OrderBy(category => category.Name).ThenBy(category => category.Id);

            var totalCount = await query.CountAsync();
            var categories = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (categories, totalCount);
        }
    }
}
