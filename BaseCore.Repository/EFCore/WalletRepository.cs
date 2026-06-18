using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Repository.EFCore
{
    public interface IWalletRepositoryEF : IRepository<UserWallet>
    {
        Task<UserWallet> GetOrCreateByUserIdAsync(string userId);
        Task<List<WalletTransaction>> GetTransactionsAsync(int walletId, int page, int pageSize);
        Task<int> GetTransactionsCountAsync(int walletId);
        Task<WalletTransaction?> GetTransactionByIdAsync(int transactionId);
        Task<(List<WalletTransaction> Items, int TotalCount)> GetPendingTransactionsAsync(int page, int pageSize);
        Task<(List<WalletTransaction> Items, int TotalCount)> GetPendingTransactionsByTypeAsync(string type, int page, int pageSize);
        Task AddTransactionAsync(WalletTransaction transaction);
        Task UpdateTransactionAsync(WalletTransaction transaction);
        Task<WalletTransaction?> GetTransactionByReferenceAndTypeAsync(string referenceId, string type, string status);
    }

    public class WalletRepositoryEF : Repository<UserWallet>, IWalletRepositoryEF
    {
        public WalletRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<UserWallet> GetOrCreateByUserIdAsync(string userId)
        {
            var wallet = await _dbSet.FirstOrDefaultAsync(w => w.UserId == userId);
            if (wallet == null)
            {
                wallet = new UserWallet
                {
                    UserId = userId,
                    Balance = 0,
                    Status = "Active",
                    UpdatedAt = System.DateTime.Now
                };
                await _dbSet.AddAsync(wallet);
                await _context.SaveChangesAsync();
            }
            return wallet;
        }

        public async Task<List<WalletTransaction>> GetTransactionsAsync(int walletId, int page, int pageSize)
        {
            return await _context.WalletTransactions
                .Where(t => t.WalletId == walletId)
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTransactionsCountAsync(int walletId)
        {
            return await _context.WalletTransactions
                .Where(t => t.WalletId == walletId)
                .CountAsync();
        }

        public async Task<WalletTransaction?> GetTransactionByIdAsync(int transactionId)
        {
            return await _context.WalletTransactions
                .Include(t => t.Wallet)
                .FirstOrDefaultAsync(t => t.Id == transactionId);
        }

        public async Task<(List<WalletTransaction> Items, int TotalCount)> GetPendingTransactionsAsync(int page, int pageSize)
        {
            var query = _context.WalletTransactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w!.User)
                .Where(t => t.Status == "Pending");

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<(List<WalletTransaction> Items, int TotalCount)> GetPendingTransactionsByTypeAsync(string type, int page, int pageSize)
        {
            var query = _context.WalletTransactions
                .Include(t => t.Wallet)
                .ThenInclude(w => w!.User)
                .Where(t => t.Status == "Pending" && t.Type == type);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task AddTransactionAsync(WalletTransaction transaction)
        {
            await _context.WalletTransactions.AddAsync(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateTransactionAsync(WalletTransaction transaction)
        {
            _context.WalletTransactions.Update(transaction);
            await _context.SaveChangesAsync();
        }

        public async Task<WalletTransaction?> GetTransactionByReferenceAndTypeAsync(string referenceId, string type, string status)
        {
            return await _context.WalletTransactions
                .FirstOrDefaultAsync(t => t.ReferenceId == referenceId && t.Type == type && t.Status == status);
        }
    }
} 