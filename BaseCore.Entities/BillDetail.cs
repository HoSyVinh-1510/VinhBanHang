using System.Text.Json.Serialization;

namespace BaseCore.Entities
{
    public class BillDetail
    {
        public int Id { get; set; }
        public int BillId { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = "";
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }

        [JsonIgnore]
        public Bill? Bill { get; set; }

        public Product? Product { get; set; }
    }
}
