using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/analytics")]
    public class AnalyticsController : BaseApiController
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var result = await _analyticsService.GetSummaryAsync(start, end);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var start = startDate == default ? DateTime.Now.AddDays(-30) : startDate;
                var end = endDate == default ? DateTime.Now : endDate.Date.AddDays(1).AddSeconds(-1);

                var result = await _analyticsService.GetRevenueOverTimeAsync(start, end);
                if (result.IsSuccess)
                    return Ok(result.Data);

                return BadRequest(new { message = result.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts([FromQuery] DateTime startDate, [FromQuery] DateTime endDate, [FromQuery] int limit = 5)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var result = await _analyticsService.GetTopProductsAsync(start, end, limit);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpGet("category-revenue")]
        public async Task<IActionResult> GetCategoryRevenue([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var result = await _analyticsService.GetCategoryRevenueAsync(start, end);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }       
    }
}
