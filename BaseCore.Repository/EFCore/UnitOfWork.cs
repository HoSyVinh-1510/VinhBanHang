using Microsoft.EntityFrameworkCore.Storage;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Unit of Work for database transactions
    /// </summary>
    public interface IUnitOfWorkEF
    {
        Task<IDbContextTransaction> BeginTransactionAsync();
    }

    public class UnitOfWorkEF : IUnitOfWorkEF
    {
        private readonly SQLServerDbContext _context;

        public UnitOfWorkEF(SQLServerDbContext context)
        {
            _context = context;
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }
    }
}
