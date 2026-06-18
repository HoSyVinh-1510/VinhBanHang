namespace BaseCore.Entities
{
    public class ProductImage
    {
        // Maps to dbo.ProductImages(ImageId)
        public int Id { get; set; }

        // Maps to dbo.ProductImages(ProductId)
        public int ProductId { get; set; }

        // Maps to dbo.ProductImages(ImageUrl)
        public string ImageUrl { get; set; } = "";

        // Maps to dbo.ProductImages(IsMain)
        public bool IsMain { get; set; }

        public Product? Product { get; set; }
    }
}
