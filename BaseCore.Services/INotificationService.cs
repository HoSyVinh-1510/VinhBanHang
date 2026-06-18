using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Services.Models;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface INotificationService
    {
        Task CreateAsync(string? userId, string title, string message, string? url, bool isAdmin);
        string Truncate(string text, int maxLength = 60);

        Task<ServiceResult<object>> GetNotificationsAsync(string userId, bool isAdmin, int page, int pageSize, bool? isRead);
        Task<ServiceResult<bool>> MarkAsReadAsync(string userId, bool isAdmin, int id);
        Task<ServiceResult<bool>> MarkAllAsReadAsync(string userId, bool isAdmin);
        Task<ServiceResult<bool>> DeleteAsync(string userId, bool isAdmin, int id);
    }
}
