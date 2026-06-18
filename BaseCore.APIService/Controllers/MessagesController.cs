using BaseCore.DTO;
using BaseCore.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace BaseCore.APIService.Controllers
{
    [Route("api/messages")]
    public class MessagesController : BaseApiController
    {
        private readonly ISupportMessageService _messageService;

        public MessagesController(ISupportMessageService messageService)
        {
            _messageService = messageService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreateMessageDto dto)
        {
            var result = await _messageService.CreateAsync(GetUserId(), dto);
            if (!result.IsSuccess)
                return BadRequest(new { message = result.Message });

            return Ok(result.Data);
        }

        [HttpGet("my-messages")]
        [Authorize]
        public async Task<IActionResult> GetMyMessages()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var result = await _messageService.GetMyMessagesAsync(userId);
            return Ok(result.Data);
        }

        [HttpPut("{id}/reply")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reply(int id, [FromBody] ReplyMessageDto dto)
        {
            var adminUserId = GetUserId();
            var result = await _messageService.ReplyAsync(adminUserId, id, dto);
            if (!result.IsSuccess)
            {
                if (result.Message == "Message not found")
                    return NotFound(new { message = result.Message });
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Data);
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var result = await _messageService.GetAllAsync(page, pageSize);
            return Ok(result.Data);
        }
    }
}
