namespace BaseCore.DTO
{
    public class CreateMessageDto
    {
        public string  FullName { get; set; } = "";
        public string? Email    { get; set; }
        public string? Subject  { get; set; }
        public string  Message  { get; set; } = "";
        public string? ImageUrl { get; set; }
    }

    public class ReplyMessageDto
    {
        public string ReplyMessage { get; set; } = "";
    }
}
