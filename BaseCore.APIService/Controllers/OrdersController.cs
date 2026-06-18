using BaseCore.Services;
using BaseCore.DTO;
using BaseCore.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BaseCore.APIService.Controllers
{
    /// <summary>
    /// Order API Controller
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : BaseApiController
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        private string? GetUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        private string? GetRole()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        }
        public async Task<IActionResult> GetMyOrders([FromQuery] OrderQueryDto query)
        {
            var result = await _orderService.GetMyOrdersAsync(GetUserId(), GetRole(), query);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllOrders([FromQuery] OrderQueryDto query)
        {
            var result = await _orderService.GetAllOrdersAsync(query);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _orderService.GetByIdAsync(GetUserId(), GetRole(), id);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
        }

        [HttpGet("{id}/status-history")]
        public async Task<IActionResult> GetStatusHistory(int id)
        {
            var result = await _orderService.GetStatusHistoryAsync(GetUserId(), GetRole(), id);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
        }

        [HttpPost("validate-coupon")]
        public async Task<IActionResult> ValidateCoupon([FromBody] ValidateCouponDto dto)
        {
            var result = await _orderService.ValidateCouponAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);        
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
        {
            var result = await _orderService.CreateAsync(GetUserId(), GetRole(), dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var result = await _orderService.UpdateStatusAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
}

        [HttpPut("{id}/payment-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
        {
            var result = await _orderService.UpdatePaymentStatusAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
}

        [HttpPut("{id}/submit-transfer")]
        public async Task<IActionResult> SubmitBankTransfer(int id, [FromBody] SubmitBankTransferDto dto)
        {
            var result = await _orderService.SubmitBankTransferAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
}

        [HttpPut("{id}/submit-refund-transfer")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SubmitRefundTransfer(int id, [FromBody] SubmitRefundTransferDto dto)
        {
            var result = await _orderService.SubmitRefundTransferAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        }

        [HttpPut("{id}/confirm-refund-received")]
        public async Task<IActionResult> ConfirmRefundReceived(int id)
        {
            var result = await _orderService.ConfirmRefundReceivedAsync(GetUserId(), GetRole(), id);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        }

        [HttpPut("{id}/receive")]
        public async Task<IActionResult> ReceiveOrder(int id)
        {
            var result = await _orderService.ReceiveOrderAsync(GetUserId(), GetRole(), id);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
}

        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelOrder(int id, [FromBody] CancelOrderRequestDto? dto = null)
        {
            var result = await _orderService.CancelOrderAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
}

        /// <summary>
        /// Admin xem danh sách đơn hàng có yêu cầu hoàn/trả đang mở.
        /// </summary>
        [HttpGet("return-requests")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOpenReturnRequests(
            [FromQuery] string? keyword = null,
            [FromQuery] string? paymentStatus = null,
            [FromQuery] string? paymentMethod = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] decimal? minTotal = null,
            [FromQuery] decimal? maxTotal = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _orderService.GetOpenReturnRequestsAsync(null, null, null, null, null, null, null, 1, 20);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);     
        }

        [HttpPut("{id}/return-request")]
        public async Task<IActionResult> RequestReturnOrRefund(int id, [FromBody] ReturnRequestDto dto)
        {
            var result = await _orderService.RequestReturnOrRefundAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
        }

        [HttpPut("{id}/return-request/resolve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResolveReturnOrRefundRequest(int id, [FromBody] ResolveReturnRequestDto dto)
        {
            var result = await _orderService.ResolveReturnOrRefundRequestAsync(GetUserId(), GetRole(), id, dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }
            return result.Data == null ? Ok() : Ok(result.Data);
        
        }
    }
}

