using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : BaseApiController
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] bool? isRead = null)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _notificationService.GetNotificationsAsync(userId, IsAdmin(), page, pageSize, isRead);
            return Ok(result.Data);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _notificationService.MarkAsReadAsync(userId, IsAdmin(), id);
            if (!result.IsSuccess)
            {
                if (result.Message == "Notification not found")
                    return NotFound(new { message = result.Message });
                if (result.Message == "Forbidden")
                    return Forbid();
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { success = true });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _notificationService.MarkAllAsReadAsync(userId, IsAdmin());
            if (!result.IsSuccess)
            {
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { success = true });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _notificationService.DeleteAsync(userId, IsAdmin(), id);
            if (!result.IsSuccess)
            {
                if (result.Message == "Notification not found")
                    return NotFound(new { message = result.Message });
                if (result.Message == "Forbidden")
                    return Forbid();
                return BadRequest(new { message = result.Message });
            }

            return Ok(new { success = true });
        }
    }
}
