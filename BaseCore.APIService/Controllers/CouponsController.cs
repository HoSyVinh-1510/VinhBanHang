using BaseCore.DTO;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CouponsController : BaseApiController
    {
        private readonly ICouponService _couponService;

        public CouponsController(ICouponService couponService)
        {
            _couponService = couponService;
        }

        /// <summary>Get all active coupons for frontend</summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<IActionResult> GetActive(
            [FromQuery] string? keyword,
            [FromQuery] string? discountType,
            [FromQuery] decimal? maxMinOrderAmount,
            [FromQuery] string? sortBy,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            var result = await _couponService.GetActiveAsync(keyword, discountType, maxMinOrderAmount, sortBy, page, pageSize);
            
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>Get all coupons with pagination (Admin/Public)</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _couponService.GetAllAsync(GetActorType(), keyword, isActive, page, pageSize);
            
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>Get coupon by ID</summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _couponService.GetByIdAsync(id, GetActorType());
            
            if (!result.IsSuccess)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>Create a new coupon</summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CouponUpsertDto dto)
        {
            var result = await _couponService.CreateAsync(GetActorType(), dto);
            
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        /// <summary>Update an existing coupon</summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] CouponUpsertDto dto)
        {
            var result = await _couponService.UpdateAsync(GetActorType(), id, dto);
            
            if (!result.IsSuccess)
            {
                if (result.Message == "Coupon not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        /// <summary>Update coupon status</summary>
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] CouponStatusDto dto)
        {
            var result = await _couponService.UpdateStatusAsync(GetActorType(), id, dto);
            
            if (!result.IsSuccess)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        /// <summary>Delete coupon</summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _couponService.DeleteAsync(GetActorType(), id);
            
            if (!result.IsSuccess)
            {
                if (result.Message == "Coupon not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { message = result.Message });
        }
    }
}
