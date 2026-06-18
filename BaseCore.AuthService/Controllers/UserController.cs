using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BaseCore.DTO;
using BaseCore.Services.Authen;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [Route("api/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.GetByIdAsync(userId, includeRefundQrItems: true);
            if (!result.IsSuccess)
            {
                return NotFound(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _userService.GetByIdAsync(id, includeRefundQrItems: true);
            if (!result.IsSuccess)
            {
                return NotFound(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] bool? isActive,
            [FromQuery] int? userType,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var safePage = page <= 0 ? 1 : page;
            var safePageSize = pageSize <= 0 ? 10 : pageSize > 100 ? 100 : pageSize;

            var result = await _userService.SearchAsync(keyword, isActive, userType, safePage, safePageSize);
            return Ok(result.Data);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            var result = await _userService.CreateAsync(request);
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
        {
            var result = await _userService.UpdateAsync(id, request);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateUserRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // prevent updating role/active status for own profile
            request.UserType = null;
            request.IsActive = null;

            var result = await _userService.UpdateAsync(userId, request);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPut("profile/refund-qr")]
        public async Task<IActionResult> UpdateMyRefundQr([FromBody] UpdateMyRefundQrRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.UpdateMyRefundQrAsync(userId, request);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(string id)
        {
            var result = await _userService.DeleteAsync(id);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return NoContent();
        }

        [HttpGet("me/refund-qrs")]
        public async Task<IActionResult> GetMyRefundQrs()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.GetMyRefundQrsAsync(userId);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPost("me/refund-qrs")]
        public async Task<IActionResult> CreateMyRefundQr([FromBody] UpsertRefundQrItemRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.CreateMyRefundQrAsync(userId, request);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPut("me/refund-qrs/{id}")]
        public async Task<IActionResult> UpdateMyRefundQrItem(int id, [FromBody] UpsertRefundQrItemRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.UpdateMyRefundQrItemAsync(userId, id, request);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpPut("me/refund-qrs/{id}/default")]
        public async Task<IActionResult> SetDefaultMyRefundQrItem(int id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.SetDefaultMyRefundQrItemAsync(userId, id);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return NoContent();
        }

        [HttpDelete("me/refund-qrs/{id}")]
        public async Task<IActionResult> DeleteMyRefundQrItem(int id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _userService.DeleteMyRefundQrItemAsync(userId, id);
            if (!result.IsSuccess)
            {
                if (result.Message == "User not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return NoContent();
        }

        private string? GetCurrentUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
