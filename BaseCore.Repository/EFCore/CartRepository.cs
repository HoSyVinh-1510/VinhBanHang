using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace BaseCore.Repository.EFCore
{
    public interface ICartItemRepositoryEF : IRepository<CartItem>
    {
        Task<List<CartItem>> GetByUserAsync(string userId);
        Task<CartItem> SetQuantityAsync(string userId, int productId, int quantity);
        Task RemoveAsync(string userId, int productId);
        Task ClearAsync(string userId);
    }

    public class CartItemRepositoryEF : Repository<CartItem>, ICartItemRepositoryEF
    {
        public CartItemRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<CartItem>> GetByUserAsync(string userId)
        {
            return await _dbSet
                .Where(x => x.UserId == userId)
                .Include(x => x.Product)
                .OrderByDescending(x => x.AddedAt)
                .ToListAsync();
        }

        public async Task<CartItem> SetQuantityAsync(string userId, int productId, int quantity)
        {
            var existing = await _dbSet.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId);
            if (existing == null)
            {
                var entity = new CartItem
                {
                    UserId = userId,
                    ProductId = productId,
                    Quantity = quantity,
                    AddedAt = DateTime.Now
                };

                await _dbSet.AddAsync(entity);
                await _context.SaveChangesAsync();
                return entity;
            }

            existing.Quantity = quantity;
            _dbSet.Update(existing);
            await _context.SaveChangesAsync();
            return existing;
        }

        public async Task RemoveAsync(string userId, int productId)
        {
            var existing = await _dbSet.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId);
            if (existing == null) return;

            _dbSet.Remove(existing);
            await _context.SaveChangesAsync();
        }

        public async Task ClearAsync(string userId)
        {
            var items = await _dbSet.Where(x => x.UserId == userId).ToListAsync();
            if (items.Count == 0) return;

            _dbSet.RemoveRange(items);
            await _context.SaveChangesAsync();
        }
    }
}
