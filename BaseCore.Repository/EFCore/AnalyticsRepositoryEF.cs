using BaseCore.DTO;
using BaseCore.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Repository.EFCore
{
    public class AnalyticsRepositoryEF : IAnalyticsRepositoryEF
    {
        private readonly SQLServerDbContext _context;

        public AnalyticsRepositoryEF(SQLServerDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync(DateTime startDate, DateTime endDate)
        {
            // Calculate total revenue from paid or completed orders
            var totalRevenueQuery = await _context.Orders
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate && (o.PaymentStatus == "Paid" || o.OrderStatus == "Completed"))
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

            // Total orders in timeframe
            var totalOrdersCount = await _context.Orders
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate)
                .CountAsync();

            // Total new normal customers (UserType == 0)
            var totalCustomersCount = await _context.Users
                .Where(u => u.UserType == 0 && u.Created >= startDate && u.Created <= endDate)
                .CountAsync();

            // Total products sold in paid/completed orders
            var totalSold = await _context.OrderItems
                .Join(_context.Orders,
                    oi => oi.OrderId,
                    o => o.Id,
                    (oi, o) => new { oi, o })
                .Where(joined => joined.o.CreatedAt >= startDate && joined.o.CreatedAt <= endDate && (joined.o.PaymentStatus == "Paid" || joined.o.OrderStatus == "Completed"))
                .SumAsync(joined => (int?)joined.oi.Quantity) ?? 0;

            return new DashboardSummaryDto
            {
                TotalRevenue = totalRevenueQuery,
                TotalOrders = totalOrdersCount,
                TotalCustomers = totalCustomersCount,
                TotalProductsSold = totalSold
            };
        }

        public async Task<List<RevenueOverTimeDto>> GetRevenueOverTimeAsync(DateTime startDate, DateTime endDate)
        {
            var ordersQuery = _context.Orders
                .Where(o => o.CreatedAt >= startDate && o.CreatedAt <= endDate && (o.PaymentStatus == "Paid" || o.OrderStatus == "Completed"));

            // Group by Day
            var grouped = await ordersQuery
                .GroupBy(o => o.CreatedAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Revenue = g.Sum(o => o.TotalAmount),
                    Count = g.Count()
                })
                .ToListAsync();

            return grouped
                .Select(g => new RevenueOverTimeDto
                {
                    TimePeriod = g.Date.ToString("yyyy-MM-dd"),
                    Revenue = g.Revenue,
                    OrderCount = g.Count
                })
                .OrderBy(r => r.TimePeriod)
                .ToList();
        }

        public async Task<List<TopProductDto>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit)
        {
            var topProducts = await _context.OrderItems
                .Include(oi => oi.Product)
                .Join(_context.Orders,
                    oi => oi.OrderId,
                    o => o.Id,
                    (oi, o) => new { oi, o })
                .Where(x => x.o.CreatedAt >= startDate && x.o.CreatedAt <= endDate && (x.o.PaymentStatus == "Paid" || x.o.OrderStatus == "Completed"))
                .GroupBy(x => new { x.oi.ProductId })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    TotalQtySold = g.Sum(x => x.oi.Quantity),
                    TotalRevenueGenerated = g.Sum(x => x.oi.Quantity * x.oi.UnitPrice)
                })
                .OrderByDescending(p => p.TotalQtySold)
                .Take(limit)
                .ToListAsync();

            var result = new List<TopProductDto>();
            foreach (var tp in topProducts)
            {
                var product = await _context.Products.FindAsync(tp.ProductId);
                result.Add(new TopProductDto
                {
                    ProductId = tp.ProductId,
                    ProductName = product?.Name ?? $"Tên sản phẩm {tp.ProductId}",
                    Price = product?.Price ?? 0,
                    TotalQtySold = tp.TotalQtySold,
                    TotalRevenueGenerated = tp.TotalRevenueGenerated
                });
            }

            return result;
        }

        public async Task<List<CategoryRevenueDto>> GetCategoryRevenueAsync(DateTime startDate, DateTime endDate)
        {
            var categoryRevenues = await _context.OrderItems
                .Include(oi => oi.Product)
                .Join(_context.Orders,
                    oi => oi.OrderId,
                    o => o.Id,
                    (oi, o) => new { oi, o })
                .Where(x => x.o.CreatedAt >= startDate && x.o.CreatedAt <= endDate && (x.o.PaymentStatus == "Paid" || x.o.OrderStatus == "Completed"))
                .GroupBy(x => new { ProductId = x.oi.ProductId })
                .Select(g => new
                {
                    ProductId = g.Key.ProductId,
                    Revenue = g.Sum(x => x.oi.Quantity * x.oi.UnitPrice)
                })
                .ToListAsync();

            var categoryGroups = new Dictionary<int, decimal>();
            foreach (var item in categoryRevenues)
            {
                var product = await _context.Products.Include(p => p.Category).FirstOrDefaultAsync(p => p.Id == item.ProductId);
                var categoryId = product?.CategoryId ?? 0;
                if (categoryGroups.ContainsKey(categoryId))
                {
                    categoryGroups[categoryId] += item.Revenue;
                }
                else
                {
                    categoryGroups[categoryId] = item.Revenue;
                }
            }

            var result = new List<CategoryRevenueDto>();
            foreach (var cg in categoryGroups)
            {
                var category = await _context.Categories.FindAsync(cg.Key);
                result.Add(new CategoryRevenueDto
                {
                    CategoryId = cg.Key,
                    CategoryName = category?.Name ?? "Khác / Không phân loại",
                    Revenue = cg.Value
                });
            }

            return result.OrderByDescending(c => c.Revenue).ToList();
        }
    }
}
