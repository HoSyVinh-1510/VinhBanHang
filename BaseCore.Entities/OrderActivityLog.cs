using System;
using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class OrderActivityLog
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public string ActivityType { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string? FromValue { get; set; }
        public string? ToValue { get; set; }
        public string? ActorUserId { get; set; }
        public string? ActorRole { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [JsonIgnore]
        public Order? Order { get; set; }
    }
}
