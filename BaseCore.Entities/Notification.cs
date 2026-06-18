using System;

namespace BaseCore.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public string? Url { get; set; }
        public bool IsRead { get; set; } = false;
        public bool IsAdmin { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Navigation property
        public virtual User? User { get; set; }
    }
}
