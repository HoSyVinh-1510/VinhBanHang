using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    public interface ISupportMessageRepositoryEF : IRepository<SupportMessage>
    {
        Task<(List<SupportMessage> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
    }

    public class SupportMessageRepositoryEF : Repository<SupportMessage>, ISupportMessageRepositoryEF
    {
        public SupportMessageRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<(List<SupportMessage> Items, int TotalCount)> GetPagedAsync(int page, int pageSize)
        {
            var query = _dbSet.OrderByDescending(x => x.CreatedAt);
            var totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (items, totalCount);
        }
    }
}
