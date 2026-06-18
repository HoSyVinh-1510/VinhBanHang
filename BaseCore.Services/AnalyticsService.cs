using BaseCore.DTO;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly IAnalyticsRepositoryEF _analyticsRepository;

        public AnalyticsService(IAnalyticsRepositoryEF analyticsRepository)
        {
            _analyticsRepository = analyticsRepository;
        }

        public async Task<ServiceResult<DashboardSummaryDto>> GetSummaryAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                var summary = await _analyticsRepository.GetSummaryAsync(startDate, endDate);
                return ServiceResult<DashboardSummaryDto>.Success(summary, "Lấy thông tin tổng quan thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<DashboardSummaryDto>.Error($"Lỗi khi lấy thông tin tổng quan: {ex.Message}");
            }
        }

        public async Task<ServiceResult<List<RevenueOverTimeDto>>> GetRevenueOverTimeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                var data = await _analyticsRepository.GetRevenueOverTimeAsync(startDate, endDate);
                return ServiceResult<List<RevenueOverTimeDto>>.Success(data, "Lấy doanh thu theo thời gian thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<List<RevenueOverTimeDto>>.Error($"Lỗi khi lấy doanh thu theo thời gian: {ex.Message}");
            }
        }

        public async Task<ServiceResult<List<TopProductDto>>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit)
        {
            try
            {
                var topProducts = await _analyticsRepository.GetTopProductsAsync(startDate, endDate, limit);
                return ServiceResult<List<TopProductDto>>.Success(topProducts, "Lấy danh sách sản phẩm bán chạy thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<List<TopProductDto>>.Error($"Lỗi khi lấy danh sách sản phẩm bán chạy: {ex.Message}");
            }
        }

        public async Task<ServiceResult<List<CategoryRevenueDto>>> GetCategoryRevenueAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                var categoryRevenues = await _analyticsRepository.GetCategoryRevenueAsync(startDate, endDate);
                return ServiceResult<List<CategoryRevenueDto>>.Success(categoryRevenues, "Lấy doanh thu theo danh mục thành công.");
            }
            catch (Exception ex)
            {
                return ServiceResult<List<CategoryRevenueDto>>.Error($"Lỗi khi lấy doanh thu theo danh mục: {ex.Message}");
            }
        }
      
    }
}
