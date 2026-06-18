using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using System.Globalization;

namespace BaseCore.Repository.EFCore
{
    /// <summary>
    /// Order Repository using Entity Framework Core
    /// </summary>
    public interface IOrderRepositoryEF : IRepository<Order>
    {
        Task<List<Order>> GetByUserAsync(string userId);
        Task<(List<Order> Orders, int TotalCount)> SearchAsync(
            string? userId,
            string? keyword,
            string? orderStatus,
            string? paymentStatus,
            string? paymentMethod,
            DateTime? fromDate,
            DateTime? toDate,
            decimal? minTotal,
            decimal? maxTotal,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDirection);
        Task<Order?> GetWithDetailsAsync(int orderId);
        Task<List<Order>> GetExpiredWaitingBankTransferOrdersAsync(DateTime expiredBefore, int take);
        Task<List<Order>> GetExpiredPendingCashOnDeliveryOrdersAsync(DateTime expiredBefore, int take);
        Task<List<Order>> GetExpiredPreparingOrdersAsync(DateTime expiredBefore, int take);
        Task<List<Order>> GetExpiredShippingOrdersAsync(DateTime expiredBefore, int take);
        Task<List<Order>> GetReceivedOrdersReadyToCompleteAsync(DateTime expiredBefore, int take);
    }

    public class OrderRepositoryEF : Repository<Order>, IOrderRepositoryEF
    {
        public OrderRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<Order>> GetByUserAsync(string userId)
        {
            return await _dbSet
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<(List<Order> Orders, int TotalCount)> SearchAsync(
            string? userId,
            string? keyword,
            string? orderStatus,
            string? paymentStatus,
            string? paymentMethod,
            DateTime? fromDate,
            DateTime? toDate,
            decimal? minTotal,
            decimal? maxTotal,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDirection)
        {
            page = page <= 0 ? 1 : page;
            pageSize = pageSize < 0 ? 10 : Math.Min(pageSize, 100);

            var query = _dbSet.AsQueryable();

            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(o => o.UserId == userId);
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var normalizedKeyword = keyword.Trim().ToLower(CultureInfo.InvariantCulture);
                query = query.Where(o =>
                    o.UserId.ToLower().Contains(normalizedKeyword) ||
                    o.ReceiverName.ToLower().Contains(normalizedKeyword) ||
                    o.Phone.ToLower().Contains(normalizedKeyword) ||
                    o.ShippingAddress.ToLower().Contains(normalizedKeyword) ||
                    (o.CouponCode != null && o.CouponCode.ToLower().Contains(normalizedKeyword)) ||
                    o.Id.ToString().Contains(normalizedKeyword));
            }

            if (!string.IsNullOrWhiteSpace(orderStatus))
            {
                query = query.Where(o => o.OrderStatus == orderStatus);
            }

            if (!string.IsNullOrWhiteSpace(paymentStatus))
            {
                query = query.Where(o => o.PaymentStatus == paymentStatus);
            }

            if (!string.IsNullOrWhiteSpace(paymentMethod))
            {
                var normalizedPaymentMethod = paymentMethod.Trim().ToLowerInvariant();
                if (normalizedPaymentMethod is "bank transfer" or "banking" or "transfer")
                {
                    query = query.Where(order =>
                        order.PaymentMethod == "Bank Transfer" ||
                        order.PaymentMethod == "Banking" ||
                        order.PaymentMethod == "Transfer");
                }
                else if (normalizedPaymentMethod == "cod")
                {
                    query = query.Where(order =>
                        order.PaymentMethod == "COD" ||
                        order.PaymentMethod == "Cod");
                }
                else
                {
                    query = query.Where(order => order.PaymentMethod == paymentMethod);
                }
            }

            if (fromDate.HasValue)
            {
                query = query.Where(o => o.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(o => o.CreatedAt <= toDate.Value);
            }

            if (minTotal.HasValue)
            {
                query = query.Where(o => o.TotalAmount >= minTotal.Value);
            }

            if (maxTotal.HasValue)
            {
                query = query.Where(o => o.TotalAmount <= maxTotal.Value);
            }

            var descending = !string.Equals(sortDirection, "asc", StringComparison.OrdinalIgnoreCase);

            query = (sortBy ?? string.Empty).ToLowerInvariant() switch
            {
                "id" or "orderid" => descending ? query.OrderByDescending(o => o.Id) : query.OrderBy(o => o.Id),
                "total" or "totalamount" => descending
                    ? query.OrderByDescending(o => o.TotalAmount)
                    : query.OrderBy(o => o.TotalAmount),
                "orderstatus" => descending
                    ? query.OrderByDescending(o => o.OrderStatus)
                    : query.OrderBy(o => o.OrderStatus),
                "paymentstatus" => descending
                    ? query.OrderByDescending(o => o.PaymentStatus)
                    : query.OrderBy(o => o.PaymentStatus),
                _ => descending ? query.OrderByDescending(o => o.CreatedAt) : query.OrderBy(o => o.CreatedAt),
            };

            var totalCount = await query.CountAsync();

            var orders = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (orders, totalCount);
        }

        public async Task<Order?> GetWithDetailsAsync(int orderId)
        {
            return await _dbSet
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync(o => o.Id == orderId);
        }

        public async Task<List<Order>> GetExpiredWaitingBankTransferOrdersAsync(DateTime expiredBefore, int take)
        {
            var safeTake = take <= 0 ? 100 : Math.Min(take, 500);

            return await _dbSet
                .Where(order =>
                    order.PaymentMethod == "Bank Transfer" &&
                    order.OrderStatus == "WaitingPayment" &&
                    (order.PaymentStatus == "Unpaid" || order.PaymentStatus == "Pending") &&
                    order.CreatedAt <= expiredBefore)
                .OrderBy(order => order.CreatedAt)
                .Take(safeTake)
                .ToListAsync();
        }

        public async Task<List<Order>> GetExpiredPendingCashOnDeliveryOrdersAsync(DateTime expiredBefore, int take)
        {
            var safeTake = take <= 0 ? 100 : Math.Min(take, 500);

            return await _dbSet
                .Where(order =>
                    (order.PaymentMethod == "COD" || order.PaymentMethod == "Cod") &&
                    order.OrderStatus == "Pending" &&
                    (order.PaymentStatus == "Unpaid" || order.PaymentStatus == "Pending") &&
                    order.CreatedAt <= expiredBefore)
                .OrderBy(order => order.CreatedAt)
                .Take(safeTake)
                .ToListAsync();
        }

        /// <summary>
        /// Lấy đơn COD đã Confirmed (shop đã xác nhận nhưng chưa chuyển sang Shipping)
        /// quá thời gian SLA cho phép — candidate để auto-cancel.
        /// </summary>
        public async Task<List<Order>> GetExpiredPreparingOrdersAsync(DateTime expiredBefore, int take)
        {
            var safeTake = take <= 0 ? 100 : Math.Min(take, 500);

            return await _dbSet
                .Where(order =>
                    order.OrderStatus == "Confirmed" &&
                    order.CreatedAt <= expiredBefore)
                .OrderBy(order => order.CreatedAt)
                .Take(safeTake)
                .ToListAsync();
        }

        public async Task<List<Order>> GetExpiredShippingOrdersAsync(DateTime expiredBefore, int take)
        {
            var safeTake = take <= 0 ? 100 : Math.Min(take, 500);

            return await _dbSet
                .Where(order =>
                    order.OrderStatus == "Shipping" &&
                    order.CreatedAt <= expiredBefore)
                .OrderBy(order => order.CreatedAt)
                .Take(safeTake)
                .ToListAsync();
        }

        public async Task<List<Order>> GetReceivedOrdersReadyToCompleteAsync(DateTime expiredBefore, int take)
        {
            var safeTake = take <= 0 ? 100 : Math.Min(take, 500);

            return await _dbSet
                .Where(order =>
                    order.OrderStatus == "Received" &&
                    order.CreatedAt <= expiredBefore)
                .OrderBy(order => order.CreatedAt)
                .Take(safeTake)
                .ToListAsync();
        }
    }

    /// <summary>
    /// OrderItem Repository using Entity Framework Core
    /// </summary>
    public interface IOrderItemRepositoryEF : IRepository<OrderItem>
    {
        Task<List<OrderItem>> GetByOrderAsync(int orderId);
    }

    public class OrderItemRepositoryEF : Repository<OrderItem>, IOrderItemRepositoryEF
    {
        public OrderItemRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<OrderItem>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(od => od.OrderId == orderId)
                .Include(od => od.Product)
                .ToListAsync();
        }
    }

    public interface IOrderStatusHistoryRepositoryEF : IRepository<OrderStatusHistory>
    {
        Task<List<OrderStatusHistory>> GetByOrderAsync(int orderId);
        Task<OrderStatusHistory?> GetLatestByOrderAndStatusAsync(int orderId, string newStatus);
        /// <summary>
        /// Lấy tất cả history entries có gắn tag [ReturnRequest] để admin xử lý yêu cầu hoàn/trả.
        /// </summary>
        Task<List<OrderStatusHistory>> GetAllReturnRequestHistoriesAsync();
    }

    public class OrderStatusHistoryRepositoryEF : Repository<OrderStatusHistory>, IOrderStatusHistoryRepositoryEF
    {
        public OrderStatusHistoryRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<OrderStatusHistory>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(history =>
                    history.OrderId == orderId &&
                    (history.PreviousStatus == null || history.PreviousStatus != history.NewStatus))
                .OrderByDescending(history => history.ChangedAt)
                .ToListAsync();
        }

        public async Task<OrderStatusHistory?> GetLatestByOrderAndStatusAsync(int orderId, string newStatus)
        {
            return await _dbSet
                .Where(history => history.OrderId == orderId && history.NewStatus == newStatus)
                .OrderByDescending(history => history.ChangedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<OrderStatusHistory>> GetAllReturnRequestHistoriesAsync()
        {
            return await _dbSet
                .Where(history => history.Note != null && history.Note.StartsWith("[ReturnRequest]"))
                .OrderByDescending(history => history.ChangedAt)
                .ToListAsync();
        }
    }

    public interface IOrderActivityLogRepositoryEF : IRepository<OrderActivityLog>
    {
        Task<List<OrderActivityLog>> GetByOrderAsync(int orderId);
        Task<OrderActivityLog?> GetLatestByOrderAndTypeAsync(int orderId, string activityType);
    }

    public class OrderActivityLogRepositoryEF : Repository<OrderActivityLog>, IOrderActivityLogRepositoryEF
    {
        public OrderActivityLogRepositoryEF(SQLServerDbContext context) : base(context)
        {
        }

        public async Task<List<OrderActivityLog>> GetByOrderAsync(int orderId)
        {
            return await _dbSet
                .Where(log => log.OrderId == orderId)
                .OrderByDescending(log => log.CreatedAt)
                .ToListAsync();
        }

        public async Task<OrderActivityLog?> GetLatestByOrderAndTypeAsync(int orderId, string activityType)
        {
            return await _dbSet
                .Where(log => log.OrderId == orderId && log.ActivityType == activityType)
                .OrderByDescending(log => log.CreatedAt)
                .FirstOrDefaultAsync();
        }
    }
}
