using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Repository.Authen
{
    public interface IUserRefundQrRepository : IRepository<UserRefundQr>
    {
        Task<bool> HasAnyForUserAsync(string userId);
        Task<List<UserRefundQr>> GetByUserIdAsync(string userId);
        Task ClearDefaultsExceptAsync(string userId, int defaultId);
    }

    public class UserRefundQrRepository : Repository<UserRefundQr>, IUserRefundQrRepository
    {
        public UserRefundQrRepository(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<bool> HasAnyForUserAsync(string userId)
        {
            return await _dbSet.AnyAsync(x => x.UserId == userId);
        }

        public async Task<List<UserRefundQr>> GetByUserIdAsync(string userId)
        {
            return await _dbSet
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.IsDefault)
                .ThenByDescending(x => x.UpdatedAt ?? x.CreatedAt)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }

        public async Task ClearDefaultsExceptAsync(string userId, int defaultId)
        {
            await _dbSet
                .Where(x => x.UserId == userId && x.Id != defaultId && x.IsDefault)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsDefault, false)
                    .SetProperty(x => x.UpdatedAt, System.DateTime.Now));
        }
    }
}
