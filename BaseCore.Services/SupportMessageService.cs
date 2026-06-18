using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class SupportMessageService : ISupportMessageService
    {
        private readonly ISupportMessageRepositoryEF _messageRepository;
        private readonly INotificationService _notificationService;

        public SupportMessageService(
            ISupportMessageRepositoryEF messageRepository,
            INotificationService notificationService)
        {
            _messageRepository = messageRepository;
            _notificationService = notificationService;
        }

        public async Task<ServiceResult<SupportMessage>> CreateAsync(string? userId, CreateMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
                return ServiceResult<SupportMessage>.Error("FullName is required");
            if (string.IsNullOrWhiteSpace(dto.Message))
                return ServiceResult<SupportMessage>.Error("Message is required");

            var entity = new SupportMessage
            {
                FullName = dto.FullName.Trim(),
                Email = NormalizeNullable(dto.Email),
                Subject = NormalizeNullable(dto.Subject),
                Message = dto.Message.Trim(),
                ImageUrl = NormalizeNullable(dto.ImageUrl),
                UserId = string.IsNullOrWhiteSpace(userId) ? null : userId,
                Status = "Chua xu ly",
                CreatedAt = DateTime.Now
            };

            await _messageRepository.AddAsync(entity);

            await _notificationService.CreateAsync(
                userId: null,
                title: "Tin nhan ho tro moi",
                message: $"Khach hang: {dto.FullName} gui tin nhan: \"{_notificationService.Truncate(entity.Message)}\"",
                url: "/shop/messages",
                isAdmin: true);

            return ServiceResult<SupportMessage>.Success(entity);
        }

        public async Task<ServiceResult<List<SupportMessage>>> GetMyMessagesAsync(string userId)
        {
            var messages = await _messageRepository.FindAsync(c => c.UserId == userId);
            return ServiceResult<List<SupportMessage>>.Success(messages.OrderByDescending(c => c.CreatedAt).ToList());
        }

        public async Task<ServiceResult<SupportMessage>> ReplyAsync(string adminUserId, int id, ReplyMessageDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ReplyMessage))
                return ServiceResult<SupportMessage>.Error("ReplyMessage is required");

            var entity = await _messageRepository.GetByIdAsync(id);
            if (entity == null)
                return ServiceResult<SupportMessage>.Error("Message not found");

            entity.AdminReply = dto.ReplyMessage.Trim();
            entity.RepliedAt = DateTime.Now;
            entity.RepliedByUserId = adminUserId;
            entity.Status = "Da phan hoi";

            await _messageRepository.UpdateAsync(entity);

            if (!string.IsNullOrEmpty(entity.UserId))
            {
                await _notificationService.CreateAsync(
                    userId: entity.UserId,
                    title: "Phan hoi tu ho tro",
                    message: $"Admin da tra loi tin nhan cua ban: \"{_notificationService.Truncate(dto.ReplyMessage)}\"",
                    url: "/shop/messages",
                    isAdmin: false);
            }

            return ServiceResult<SupportMessage>.Success(entity);
        }

        public async Task<ServiceResult<PagedResult<SupportMessage>>> GetAllAsync(int page, int pageSize)
        {
            var safePage = Math.Max(1, page);
            var safePageSize = Math.Max(1, pageSize);

            var (items, totalCount) = await _messageRepository.GetPagedAsync(safePage, safePageSize);
            
            var result = new PagedResult<SupportMessage>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize
            };

            return ServiceResult<PagedResult<SupportMessage>>.Success(result);
        }

        private static string? NormalizeNullable(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
