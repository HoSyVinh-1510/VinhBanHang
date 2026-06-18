using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Bill Repository using Entity Framework Core
    /// </summary>
    public interface IBillRepositoryEF : IRepository<Bill>
    {
        Task<Bill?> GetByOrderAsync(int orderId);
        Task<Bill?> GetByOrderWithDetailsAsync(int orderId);
        Task AddDetailsAsync(IEnumerable<BillDetail> details);
    }

    public class BillRepositoryEF : Repository<Bill>, IBillRepositoryEF
    {
        public BillRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<Bill?> GetByOrderAsync(int orderId)
        {
            return await _dbSet.FirstOrDefaultAsync(bill => bill.OrderId == orderId);
        }

        public async Task<Bill?> GetByOrderWithDetailsAsync(int orderId)
        {
            return await _dbSet
                .Include(bill => bill.BillDetails)
                .FirstOrDefaultAsync(bill => bill.OrderId == orderId);
        }

        public async Task AddDetailsAsync(IEnumerable<BillDetail> details)
        {
            await _context.BillDetails.AddRangeAsync(details);
            await _context.SaveChangesAsync();
        }
    }
}
