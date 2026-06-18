using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class Category
    {
        // Maps to dbo.Categories(CategoryId)
        public int Id { get; set; }

        // Maps to dbo.Categories(CategoryName)
        public string Name { get; set; } = "";

        // Maps to dbo.Categories(Description)
        public string? Description { get; set; }

        // Maps to dbo.Categories(ImageUrl)
        public string? ImageUrl { get; set; }

        // Maps to dbo.Categories(IsActive)
        public bool IsActive { get; set; } = true;

        [JsonIgnore]
        public List<Product> Products { get; set; } = [];
    }
}
