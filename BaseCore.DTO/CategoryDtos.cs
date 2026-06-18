namespace BaseCore.DTO
{
    public class CategoryDto
    {
        public string  Name        { get; set; } = "";
        public string? Description { get; set; }
        public string? ImageUrl    { get; set; }
        public bool    IsActive    { get; set; } = true;
    }
}
