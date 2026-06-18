using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ISupportMessageService
    {
        Task<ServiceResult<SupportMessage>> CreateAsync(string? userId, CreateMessageDto dto);
        Task<ServiceResult<List<SupportMessage>>> GetMyMessagesAsync(string userId);
        Task<ServiceResult<SupportMessage>> ReplyAsync(string adminUserId, int id, ReplyMessageDto dto);
        Task<ServiceResult<PagedResult<SupportMessage>>> GetAllAsync(int page, int pageSize);
    }
}
