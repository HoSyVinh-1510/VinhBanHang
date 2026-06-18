namespace BaseCore.DTO
{
    public class AddressDto
    {
        public string ReceiverName { get; set; } = "";
        public string Phone { get; set; } = "";
        public string AddressLine { get; set; } = "";
        public string? Ward { get; set; }
        public string? District { get; set; }
        public string? Province { get; set; }
        public bool IsDefault { get; set; }
    }
}
