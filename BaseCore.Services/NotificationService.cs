using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepositoryEF _notificationRepository;

        public NotificationService(INotificationRepositoryEF notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task CreateAsync(
            string? userId,
            string title,
            string message,
            string? url,
            bool isAdmin)
        {
            try
            {
                await _notificationRepository.AddAsync(new Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Url = url,
                    IsRead = false,
                    IsAdmin = isAdmin,
                    CreatedAt = DateTime.Now
                });
            }
            catch
            {
            }
        }

        public string Truncate(string text, int maxLength = 60)
        {
            if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
                return text;
            return text[..(maxLength - 3)] + "...";
        }

        public async Task<ServiceResult<object>> GetNotificationsAsync(string userId, bool isAdmin, int page, int pageSize, bool? isRead)
        {
            var query = _notificationRepository.BuildQuery(userId, isAdmin).AsNoTracking();

            if (isRead.HasValue)
                query = query.Where(n => n.IsRead == isRead.Value);

            var totalCount = await query.CountAsync();
            var unreadCount = await query.CountAsync(n => !n.IsRead);

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new
            {
                items,
                totalCount,
                unreadCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return ServiceResult<object>.Success(result);
        }

        public async Task<ServiceResult<bool>> MarkAsReadAsync(string userId, bool isAdmin, int id)
        {
            var notification = await _notificationRepository.GetByIdAsync(id);
            if (notification == null)
                return ServiceResult<bool>.Error("Notification not found");

            if (!isAdmin && notification.UserId != userId)
                return ServiceResult<bool>.Error("Forbidden");

            notification.IsRead = true;
            await _notificationRepository.UpdateAsync(notification);
            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<bool>> MarkAllAsReadAsync(string userId, bool isAdmin)
        {
            await _notificationRepository.MarkAllAsReadAsync(userId, isAdmin);
            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string userId, bool isAdmin, int id)
        {
            var notification = await _notificationRepository.GetByIdAsync(id);
            if (notification == null)
                return ServiceResult<bool>.Error("Notification not found");

            if (!isAdmin && notification.UserId != userId)
                return ServiceResult<bool>.Error("Forbidden");

            await _notificationRepository.DeleteAsync(notification);
            return ServiceResult<bool>.Success(true);
        }
    }
}
