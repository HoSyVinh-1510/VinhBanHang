using System;

namespace BaseCore.Entities
{
    public class SupportMessage
    {
        // Maps to dbo.SupportMessages(SupportMessageId)
        public int Id { get; set; }

        // Maps to dbo.SupportMessages(FullName)
        public string FullName { get; set; } = "";

        // Maps to dbo.SupportMessages(Email)
        public string? Email { get; set; }

        // Maps to dbo.SupportMessages(Subject)
        public string? Subject { get; set; }

        // Maps to dbo.SupportMessages(Message)
        public string Message { get; set; } = "";

        // Maps to dbo.SupportMessages(CreatedAt)
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        // Maps to dbo.SupportMessages(Status)
        public string Status { get; set; } = "Chua xu ly";

        // New properties for Offline Messaging
        public string? UserId { get; set; }
        public string? AdminReply { get; set; }
        public DateTime? RepliedAt { get; set; }
        public string? RepliedByUserId { get; set; }
        public string? ImageUrl { get; set; }

        // Navigation property
        public virtual User? User { get; set; }
    }
}
