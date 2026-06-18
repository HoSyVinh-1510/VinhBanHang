using System;

namespace BaseCore.Entities
{
    public class CustomerAddress
    {
        public int Id { get; set; }
        public string UserId { get; set; } = "";
        public string ReceiverName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string AddressLine { get; set; } = "";
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Province { get; set; }
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }

        public string FullAddress
        {
            get
            {
                var parts = new[] { AddressLine, Ward, District, Province }
                    .Where(part => !string.IsNullOrWhiteSpace(part));
                return string.Join(", ", parts);
            }
        }
    }
}
