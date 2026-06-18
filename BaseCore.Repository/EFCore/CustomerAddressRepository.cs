using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Customer address Repository using Entity Framework Core
    /// </summary>
    public interface ICustomerAddressRepositoryEF : IRepository<CustomerAddress>
    {
        Task<List<CustomerAddress>> GetByUserAsync(string userId);
        Task<CustomerAddress?> GetByUserAndIdAsync(string userId, int addressId);
        Task<CustomerAddress?> GetLatestByUserAsync(string userId);
        Task<bool> ExistsByUserAsync(string userId);
        Task ClearDefaultAsync(string userId);
    }

    public class CustomerAddressRepositoryEF : Repository<CustomerAddress>, ICustomerAddressRepositoryEF
    {
        public CustomerAddressRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<CustomerAddress>> GetByUserAsync(string userId)
        {
            return await _dbSet
                .Where(address => address.UserId == userId)
                .OrderByDescending(address => address.IsDefault)
                .ThenByDescending(address => address.CreatedAt)
                .ToListAsync();
        }

        public async Task<CustomerAddress?> GetByUserAndIdAsync(string userId, int addressId)
        {
            return await _dbSet.FirstOrDefaultAsync(address =>
                address.Id == addressId &&
                address.UserId == userId);
        }

        public async Task<CustomerAddress?> GetLatestByUserAsync(string userId)
        {
            return await _dbSet
                .Where(address => address.UserId == userId)
                .OrderByDescending(address => address.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> ExistsByUserAsync(string userId)
        {
            return await _dbSet.AnyAsync(address => address.UserId == userId);
        }

        public async Task ClearDefaultAsync(string userId)
        {
            var defaultAddresses = await _dbSet
                .Where(address => address.UserId == userId && address.IsDefault)
                .ToListAsync();

            foreach (var address in defaultAddresses)
            {
                address.IsDefault = false;
                address.UpdatedAt = DateTime.Now;
            }

            if (defaultAddresses.Count > 0)
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}
