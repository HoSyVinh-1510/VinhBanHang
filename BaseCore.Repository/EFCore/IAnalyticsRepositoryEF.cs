using BaseCore.DTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Repository.EFCore
{
    public interface IAnalyticsRepositoryEF
    {
        Task<DashboardSummaryDto> GetSummaryAsync(DateTime startDate, DateTime endDate);
        Task<List<RevenueOverTimeDto>> GetRevenueOverTimeAsync(DateTime startDate, DateTime endDate);
        Task<List<TopProductDto>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit);
        Task<List<CategoryRevenueDto>> GetCategoryRevenueAsync(DateTime startDate, DateTime endDate);
    }
}
