using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Repository.EFCore
{
    public interface INotificationRepositoryEF : IRepository<Notification>
    {
        IQueryable<Notification> BuildQuery(string userId, bool isAdmin);
        Task<int> MarkAllAsReadAsync(string userId, bool isAdmin);
    }

    public class NotificationRepositoryEF : Repository<Notification>, INotificationRepositoryEF
    {
        public NotificationRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public IQueryable<Notification> BuildQuery(string userId, bool isAdmin)
        {
            var query = _dbSet.AsQueryable();
            if (isAdmin)
                return query.Where(n => n.IsAdmin);
            
            return query.Where(n => n.UserId == userId && !n.IsAdmin);
        }

        public async Task<int> MarkAllAsReadAsync(string userId, bool isAdmin)
        {
            var query = BuildQuery(userId, isAdmin);
            return await query
                .Where(n => !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        }
    }
}
