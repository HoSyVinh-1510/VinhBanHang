using BaseCore.DTO;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IAnalyticsService
    {
        Task<ServiceResult<DashboardSummaryDto>> GetSummaryAsync(DateTime startDate, DateTime endDate);
        Task<ServiceResult<List<RevenueOverTimeDto>>> GetRevenueOverTimeAsync(DateTime startDate, DateTime endDate);
        Task<ServiceResult<List<TopProductDto>>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit);
        Task<ServiceResult<List<CategoryRevenueDto>>> GetCategoryRevenueAsync(DateTime startDate, DateTime endDate);
    }
}
