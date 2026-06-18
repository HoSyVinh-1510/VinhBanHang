using System;

namespace BaseCore.DTO
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public string? Url { get; set; }
        public bool IsRead { get; set; }
        public bool IsAdmin { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
