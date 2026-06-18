using System;

namespace BaseCore.Entities
{
    public class Coupon
    {
        // Maps to dbo.Coupons(CouponId)
        public int Id { get; set; }

        // Maps to dbo.Coupons(Code)
        public string Code { get; set; } = "";

        // Maps to dbo.Coupons(Name)
        public string Name { get; set; } = "";

        // Maps to dbo.Coupons(Description)
        public string? Description { get; set; }

        // dbo.Coupons(DiscountType): Percent | Fixed
        public string DiscountType { get; set; } = "Percent";

        public decimal DiscountValue { get; set; }

        //  dbo.Coupons(MinOrderAmount)
        public decimal MinOrderAmount { get; set; }

        // Maps to dbo.Coupons(MaxDiscountAmount)
        public decimal? MaxDiscountAmount { get; set; }

        // Maps to dbo.Coupons(StartAt)
        public DateTime StartAt { get; set; }

        // Maps to dbo.Coupons(EndAt)
        public DateTime EndAt { get; set; }

        // Maps to dbo.Coupons(UsageLimit)
        public int? UsageLimit { get; set; }

        // Maps to dbo.Coupons(UsedCount)
        public int UsedCount { get; set; }

        // Maps to dbo.Coupons(IsActive)
        public bool IsActive { get; set; } = true;

        // Maps to dbo.Coupons(IsPublic)
        public bool IsPublic { get; set; } = true;

        // Maps to dbo.Coupons(DisplayOrder)
        public int DisplayOrder { get; set; }

        // Maps to dbo.Coupons(CreatedAt)
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
