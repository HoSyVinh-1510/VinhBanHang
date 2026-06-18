using System;
namespace BaseCore.Entities
{
    public class User
    {
        public string Id { get; set; }
        public string? Name { get; set; }
        //public string Guid { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }
        public byte[]? Salt { get; set; }
        public string? Contact { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Position { get; set; }
        public string? Image { get; set; }
        public string? RefundQrImageUrl { get; set; }
        public ICollection<UserRefundQr> RefundQrs { get; set; } = new List<UserRefundQr>();
        public bool IsActive { get; set; }
        public int UserType { get; set; } = 0; //  0: normal user, 1: admin
        public DateTime Created { get; set; } = DateTime.Now;
    }
}
