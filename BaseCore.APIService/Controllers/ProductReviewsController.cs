using BaseCore.DTO;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Product review API Controller
    /// </summary>
    [Route("api/products/{productId:int}/reviews")]
    [ApiController]
    public class ProductReviewsController : BaseApiController
    {
        private readonly IProductReviewService _reviewService;

        public ProductReviewsController(IProductReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<IActionResult> GetByProduct(
            int productId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 5)
        {
            var result = await _reviewService.GetByProductAsync(productId, page, pageSize);

            if (!result.IsSuccess)
                return NotFound(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpGet("/api/orders/{orderId:int}/reviews")]
        [Authorize]
        public async Task<IActionResult> GetMineByOrder(int orderId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var result = await _reviewService.GetMineByOrderAsync(userId, orderId);

            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(int productId, [FromBody] ProductReviewDto dto)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var result = await _reviewService.CreateAsync(userId, productId, dto);

            if (!result.IsSuccess)
            {
                if (result.Message == "Product not found")
                    return NotFound(new { message = result.Message });
                if (result.Message == "This order item has already been reviewed.")
                    return Conflict(new { message = result.Message });
                
                return BadRequest(new { message = result.Message });
            }

            return CreatedAtAction(nameof(GetByProduct), new { productId }, result.Data);
        }

        [HttpDelete("/api/reviews/{id:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var result = await _reviewService.DeleteAsync(userId, GetActorType(), id);

            if (!result.IsSuccess)
            {
                if (result.Message == "Unauthorized")
                    return Forbid();
                return NotFound(new { message = result.Message });
            }

            return Ok(new { message = result.Message });
        }
    }
}
