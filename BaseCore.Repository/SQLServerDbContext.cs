using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository
{
    /// <summary>
    /// Entity Framework Core DbContext for SQLServer
    /// Used for teaching EF Core concepts (Bài 10)
    /// </summary>
    public class SQLServerDbContext : DbContext
    {
        public SQLServerDbContext(DbContextOptions<SQLServerDbContext> options) : base(options)
        {
        }

        // DbSet for each entity
        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }
        public DbSet<OrderActivityLog> OrderActivityLogs { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<SupportMessage> SupportMessages { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<CustomerAddress> CustomerAddresses { get; set; }
        public DbSet<ProductReview> ProductReviews { get; set; }
        public DbSet<Bill> Bills { get; set; }
        public DbSet<BillDetail> BillDetails { get; set; }
        public DbSet<UserRefundQr> UserRefundQrs { get; set; }
        public DbSet<UserWallet> UserWallets { get; set; }
        public DbSet<WalletTransaction> WalletTransactions { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(450);

                entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
                entity.Property(e => e.UserName).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Password).HasMaxLength(255).IsRequired();
                entity.Property(e => e.Salt).IsRequired(false);
                entity.Property(e => e.Contact).IsRequired(false);

                entity.Property(e => e.Email).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Phone).HasMaxLength(20).IsRequired(false);
                entity.Property(e => e.Position).IsRequired(false);
                entity.Property(e => e.Image).IsRequired(false);
                entity.Property(e => e.RefundQrImageUrl).IsRequired(false);
                entity.Property(e => e.IsActive).HasDefaultValue(true);
                entity.Property(e => e.Created).HasDefaultValueSql("getdate()");

                entity.HasIndex(e => e.UserName).IsUnique();
            });

            modelBuilder.Entity<UserRefundQr>(entity =>
            {
                entity.ToTable("UserRefundQrs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("UserRefundQrId");
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                entity.Property(e => e.DisplayName).HasColumnName("DisplayName").HasMaxLength(120).IsRequired();
                entity.Property(e => e.QrImageUrl).HasColumnName("QrImageUrl").IsRequired();
                entity.Property(e => e.IsDefault).HasColumnName("IsDefault").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");
                entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired(false);

                entity.HasOne(e => e.User)
                      .WithMany(u => u.RefundQrs)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => new { e.UserId, e.IsDefault });
            });

            // Configure Category entity
            modelBuilder.Entity<Category>(entity =>
            {
                entity.ToTable("Categories");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("CategoryId");
                entity.Property(e => e.Name).HasColumnName("CategoryName").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Description).HasColumnName("Description").HasMaxLength(255).IsRequired(false);
                entity.Property(e => e.ImageUrl).HasColumnName("ImageUrl").HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.IsActive).HasColumnName("IsActive").HasDefaultValue(true);
            });

            // Configure Product entity
            modelBuilder.Entity<Product>(entity =>
            {
                entity.ToTable("Products");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ProductId");
                entity.Property(e => e.CategoryId).HasColumnName("CategoryId").IsRequired();
                entity.Property(e => e.Name).HasColumnName("ProductName").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Description).HasColumnName("Description").IsRequired(false);
                entity.Property(e => e.Price).HasColumnName("Price").HasPrecision(18, 2);
                entity.Property(e => e.Stock).HasColumnName("StockQuantity").HasDefaultValue(0);
                entity.Property(e => e.ImageUrl).HasColumnName("ImageUrl").HasMaxLength(255).IsRequired(false);
                entity.Property(e => e.Unit).HasColumnName("Unit").HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.IsFeatured).HasColumnName("IsFeatured").HasDefaultValue(false);
                entity.Property(e => e.IsActive).HasColumnName("IsActive").HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                // Relationship with Category
                entity.HasOne(e => e.Category)
                      .WithMany(c => c.Products)
                      .HasForeignKey(e => e.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Order entity
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("Orders");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("OrderId");
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                entity.Property(e => e.ReceiverName).HasColumnName("ReceiverName").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Phone).HasColumnName("Phone").HasMaxLength(20).IsRequired(false);
                entity.Property(e => e.ShippingAddress).HasColumnName("ShippingAddress").HasMaxLength(255).IsRequired(false);
                entity.Property(e => e.DeliveryMethod).HasColumnName("DeliveryMethod").HasMaxLength(50).IsRequired().HasDefaultValue("Delivery");
                entity.Property(e => e.PickupTime).HasColumnName("PickupTime").IsRequired(false);
                entity.Property(e => e.Note).HasColumnName("Note").HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.TotalAmount).HasColumnName("TotalAmount").HasPrecision(18, 2);
                entity.Property(e => e.DiscountAmount).HasColumnName("DiscountAmount").HasPrecision(18, 2).HasDefaultValue(0);
                entity.Property(e => e.CouponCode).HasColumnName("CouponCode").HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.PaymentMethod).HasColumnName("PaymentMethod").HasMaxLength(50).IsRequired();
                entity.Property(e => e.PaymentStatus).HasColumnName("PaymentStatus").HasMaxLength(50).IsRequired();
                entity.Property(e => e.OrderStatus).HasColumnName("OrderStatus").HasMaxLength(50).IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                // Relationship with OrderItems
                entity.HasMany(e => e.OrderItems)
                      .WithOne(oi => oi.Order)
                      .HasForeignKey(oi => oi.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.StatusHistories)
                      .WithOne(sh => sh.Order)
                      .HasForeignKey(sh => sh.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.ActivityLogs)
                      .WithOne(log => log.Order)
                      .HasForeignKey(log => log.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure OrderItem entity
            modelBuilder.Entity<OrderItem>(entity =>
            {
                entity.ToTable("OrderItems");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("OrderItemId");
                entity.Property(e => e.UnitPrice).HasColumnName("UnitPrice").HasPrecision(18, 2);
                entity.Property(e => e.Quantity).HasColumnName("Quantity").IsRequired();
                entity.Property(e => e.ProductId).HasColumnName("ProductId").IsRequired();
                entity.Property(e => e.OrderId).HasColumnName("OrderId").IsRequired();
                entity.Property(e => e.SubTotal).HasColumnName("SubTotal")
                    .HasComputedColumnSql("[Quantity]*[UnitPrice]", stored: true);

                // Relationships
                entity.HasOne(e => e.Order)
                      .WithMany(o => o.OrderItems)
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Product)                    
                      .WithMany(o => o.OrderItems)
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<OrderStatusHistory>(entity =>
            {
                entity.ToTable("OrderStatusHistories");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("OrderStatusHistoryId");
                entity.Property(e => e.OrderId).HasColumnName("OrderId").IsRequired();
                entity.Property(e => e.PreviousStatus).HasColumnName("PreviousStatus").HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.NewStatus).HasColumnName("NewStatus").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Note).HasColumnName("Note").HasMaxLength(500).IsRequired(false);
                entity.Property(e => e.ChangedByUserId).HasColumnName("ChangedByUserId").HasMaxLength(450).IsRequired(false);
                entity.Property(e => e.ChangedByRole).HasColumnName("ChangedByRole").HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.ChangedAt).HasColumnName("ChangedAt").HasDefaultValueSql("getdate()");

                entity.HasOne(e => e.Order)
                      .WithMany(o => o.StatusHistories)
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.OrderId, e.ChangedAt });
            });

            modelBuilder.Entity<OrderActivityLog>(entity =>
            {
                entity.ToTable("OrderActivityLogs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("OrderActivityLogId");
                entity.Property(e => e.OrderId).HasColumnName("OrderId").IsRequired();
                entity.Property(e => e.ActivityType).HasColumnName("ActivityType").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Title).HasColumnName("Title").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Description).HasColumnName("Description").HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.FromValue).HasColumnName("FromValue").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.ToValue).HasColumnName("ToValue").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.ActorUserId).HasColumnName("ActorUserId").HasMaxLength(450).IsRequired(false);
                entity.Property(e => e.ActorRole).HasColumnName("ActorRole").HasMaxLength(50).IsRequired(false);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                entity.HasOne(e => e.Order)
                      .WithMany(o => o.ActivityLogs)
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.OrderId, e.CreatedAt });
                entity.HasIndex(e => e.ActivityType);
            });

            modelBuilder.Entity<CartItem>(entity =>
            {
                entity.ToTable("CartItems");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("CartItemId");
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                entity.Property(e => e.ProductId).HasColumnName("ProductId").IsRequired();
                entity.Property(e => e.Quantity).HasColumnName("Quantity").IsRequired();
                entity.Property(e => e.AddedAt).HasColumnName("AddedAt").HasDefaultValueSql("getdate()");

                entity.HasIndex(e => new { e.UserId, e.ProductId }).IsUnique();

                entity.HasOne(e => e.Product)
                      .WithMany(p => p.CartItems)
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<SupportMessage>(entity =>
            {
                entity.ToTable("SupportMessages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("SupportMessageId");
                entity.Property(e => e.FullName).HasColumnName("FullName").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Email).HasColumnName("Email").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Subject).HasColumnName("Subject").HasMaxLength(200).IsRequired(false);
                entity.Property(e => e.Message).HasColumnName("Message").HasMaxLength(1000).IsRequired();
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");
                entity.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).IsRequired();
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired(false);
                entity.Property(e => e.AdminReply).HasColumnName("AdminReply").IsRequired(false);
                entity.Property(e => e.RepliedAt).HasColumnName("RepliedAt").IsRequired(false);
                entity.Property(e => e.RepliedByUserId).HasColumnName("RepliedByUserId").HasMaxLength(450).IsRequired(false);
                entity.Property(e => e.ImageUrl).HasColumnName("ImageUrl").IsRequired(false);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ProductImage>(entity =>
            {
                entity.ToTable("ProductImages");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ImageId");
                entity.Property(e => e.ProductId).HasColumnName("ProductId").IsRequired();
                entity.Property(e => e.ImageUrl).HasColumnName("ImageUrl").HasMaxLength(255).IsRequired();
                entity.Property(e => e.IsMain).HasColumnName("IsMain").HasDefaultValue(false);

                entity.HasOne(e => e.Product)
                      .WithMany(p => p.ProductImages)
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Coupon>(entity =>
            {
                entity.ToTable("Coupons");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("CouponId");
                entity.Property(e => e.Code).HasColumnName("Code").HasMaxLength(50).IsRequired();
                entity.Property(e => e.Name).HasColumnName("Name").HasMaxLength(150).IsRequired();
                entity.Property(e => e.Description).HasColumnName("Description").HasMaxLength(255).IsRequired(false);
                entity.Property(e => e.DiscountType).HasColumnName("DiscountType").HasMaxLength(20).IsRequired();
                entity.Property(e => e.DiscountValue).HasColumnName("DiscountValue").HasPrecision(18, 2);
                entity.Property(e => e.MinOrderAmount).HasColumnName("MinOrderAmount").HasPrecision(18, 2).HasDefaultValue(0);
                entity.Property(e => e.MaxDiscountAmount).HasColumnName("MaxDiscountAmount").HasPrecision(18, 2).IsRequired(false);
                entity.Property(e => e.StartAt).HasColumnName("StartAt").IsRequired();
                entity.Property(e => e.EndAt).HasColumnName("EndAt").IsRequired();
                entity.Property(e => e.UsageLimit).HasColumnName("UsageLimit").IsRequired(false);
                entity.Property(e => e.UsedCount).HasColumnName("UsedCount").HasDefaultValue(0);
                entity.Property(e => e.IsActive).HasColumnName("IsActive").HasDefaultValue(true);
                entity.Property(e => e.IsPublic).HasColumnName("IsPublic").HasDefaultValue(true);
                entity.Property(e => e.DisplayOrder).HasColumnName("DisplayOrder").HasDefaultValue(0);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                entity.HasIndex(e => e.Code).IsUnique();
            });

            modelBuilder.Entity<CustomerAddress>(entity =>
            {
                entity.ToTable("CustomerAddresses");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("CustomerAddressId");
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                entity.Property(e => e.ReceiverName).HasColumnName("ReceiverName").HasMaxLength(100).IsRequired();
                entity.Property(e => e.Phone).HasColumnName("Phone").HasMaxLength(20).IsRequired();
                entity.Property(e => e.AddressLine).HasColumnName("AddressLine").HasMaxLength(255).IsRequired();
                entity.Property(e => e.Ward).HasColumnName("Ward").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.District).HasColumnName("District").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.Province).HasColumnName("Province").HasMaxLength(100).IsRequired(false);
                entity.Property(e => e.IsDefault).HasColumnName("IsDefault").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");
                entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired(false);
                entity.HasIndex(e => e.UserId);
            });

            modelBuilder.Entity<ProductReview>(entity =>
            {
                entity.ToTable("ProductReviews");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasColumnName("ProductReviewId");
                entity.Property(e => e.ProductId).HasColumnName("ProductId").IsRequired();
                entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                entity.Property(e => e.OrderId).HasColumnName("OrderId").IsRequired(false);
                entity.Property(e => e.OrderItemId).HasColumnName("OrderItemId").IsRequired(false);
                entity.Property(e => e.Rating).HasColumnName("Rating").IsRequired();
                entity.Property(e => e.Comment).HasColumnName("Comment").HasMaxLength(1000).IsRequired(false);
                entity.Property(e => e.IsApproved).HasColumnName("IsApproved").HasDefaultValue(true);
                entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");
                entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired(false);

                entity.HasOne(e => e.Product)
                      .WithMany(p => p.Reviews)
                      .HasForeignKey(e => e.ProductId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Order)
                      .WithMany()
                      .HasForeignKey(e => e.OrderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.OrderItem)
                      .WithMany()
                      .HasForeignKey(e => e.OrderItemId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.OrderItemId).IsUnique().HasFilter("[OrderItemId] IS NOT NULL");
              });

              modelBuilder.Entity<Bill>(entity =>
              {
                  entity.ToTable("Bill");
                  entity.HasKey(e => e.Id);
                  entity.Property(e => e.Id).HasColumnName("BillId");
                  entity.Property(e => e.OrderId).HasColumnName("OrderId").IsRequired();
                  entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                  entity.Property(e => e.BillCode).HasColumnName("BillCode").HasMaxLength(50).IsRequired();
                  entity.Property(e => e.ReceiverName).HasColumnName("ReceiverName").HasMaxLength(100).IsRequired();
                  entity.Property(e => e.Phone).HasColumnName("Phone").HasMaxLength(20).IsRequired();
                  entity.Property(e => e.ShippingAddress).HasColumnName("ShippingAddress").HasMaxLength(255).IsRequired();
                  entity.Property(e => e.SubtotalAmount).HasColumnName("SubtotalAmount").HasPrecision(18, 2);
                  entity.Property(e => e.DiscountAmount).HasColumnName("DiscountAmount").HasPrecision(18, 2).HasDefaultValue(0);
                  entity.Property(e => e.TotalAmount).HasColumnName("TotalAmount").HasPrecision(18, 2);
                  entity.Property(e => e.PaymentMethod).HasColumnName("PaymentMethod").HasMaxLength(50).IsRequired();
                  entity.Property(e => e.PaymentStatus).HasColumnName("PaymentStatus").HasMaxLength(50).IsRequired();
                  entity.Property(e => e.BillStatus).HasColumnName("BillStatus").HasMaxLength(50).IsRequired();
                  entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");
                  entity.Property(e => e.PaidAt).HasColumnName("PaidAt").IsRequired(false);

                  entity.HasOne(e => e.Order)
                        .WithMany()
                        .HasForeignKey(e => e.OrderId)
                        .OnDelete(DeleteBehavior.Cascade);

                  entity.HasMany(e => e.BillDetails)
                        .WithOne(d => d.Bill)
                        .HasForeignKey(d => d.BillId)
                        .OnDelete(DeleteBehavior.Cascade);

                  entity.HasIndex(e => e.OrderId).IsUnique();
                  entity.HasIndex(e => e.BillCode).IsUnique();
              });

              modelBuilder.Entity<BillDetail>(entity =>
              {
                  entity.ToTable("BillDetails");
                  entity.HasKey(e => e.Id);
                  entity.Property(e => e.Id).HasColumnName("BillDetailId");
                  entity.Property(e => e.BillId).HasColumnName("BillId").IsRequired();
                  entity.Property(e => e.ProductId).HasColumnName("ProductId").IsRequired();
                  entity.Property(e => e.ProductName).HasColumnName("ProductName").HasMaxLength(150).IsRequired();
                  entity.Property(e => e.Quantity).HasColumnName("Quantity").IsRequired();
                  entity.Property(e => e.UnitPrice).HasColumnName("UnitPrice").HasPrecision(18, 2);
                  entity.Property(e => e.SubTotal).HasColumnName("SubTotal").HasPrecision(18, 2);

                  entity.HasOne(e => e.Product)
                        .WithMany()
                        .HasForeignKey(e => e.ProductId)
                        .OnDelete(DeleteBehavior.Restrict);

                  entity.HasIndex(e => e.BillId);
                  entity.HasIndex(e => e.ProductId);
              });

              modelBuilder.Entity<Notification>(entity =>
              {
                  entity.ToTable("Notifications");
                  entity.HasKey(e => e.Id);
                  entity.Property(e => e.Id).HasColumnName("NotificationId");
                  entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired(false);
                  entity.Property(e => e.Title).HasColumnName("Title").HasMaxLength(200).IsRequired();
                  entity.Property(e => e.Message).HasColumnName("Message").HasMaxLength(1000).IsRequired();
                  entity.Property(e => e.Url).HasColumnName("Url").HasMaxLength(500).IsRequired(false);
                  entity.Property(e => e.IsRead).HasColumnName("IsRead").HasDefaultValue(false);
                  entity.Property(e => e.IsAdmin).HasColumnName("IsAdmin").HasDefaultValue(false);
                  entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                  entity.HasOne(e => e.User)
                        .WithMany()
                        .HasForeignKey(e => e.UserId)
                        .OnDelete(DeleteBehavior.Cascade);

                  entity.HasIndex(e => e.UserId);
                  entity.HasIndex(e => e.IsAdmin);
                  entity.HasIndex(e => e.IsRead);
              });

              modelBuilder.Entity<UserWallet>(entity =>
              {
                  entity.ToTable("UserWallets");
                  entity.HasKey(e => e.Id);
                  entity.Property(e => e.Id).HasColumnName("WalletId");
                  entity.Property(e => e.UserId).HasColumnName("UserId").HasMaxLength(450).IsRequired();
                  entity.Property(e => e.Balance).HasColumnName("Balance").HasColumnType("decimal(18,2)").HasDefaultValue(0);
                  entity.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).HasDefaultValue("Active");
                  entity.Property(e => e.UpdatedAt).HasColumnName("UpdatedAt").IsRequired(false);

                  entity.HasOne(e => e.User)
                        .WithOne()
                        .HasForeignKey<UserWallet>(e => e.UserId)
                        .OnDelete(DeleteBehavior.Cascade);

                  entity.HasIndex(e => e.UserId).IsUnique();
              });

              modelBuilder.Entity<WalletTransaction>(entity =>
              {
                  entity.ToTable("WalletTransactions");
                  entity.HasKey(e => e.Id);
                  entity.Property(e => e.Id).HasColumnName("TransactionId");
                  entity.Property(e => e.WalletId).HasColumnName("WalletId").IsRequired();
                  entity.Property(e => e.Amount).HasColumnName("Amount").HasColumnType("decimal(18,2)").IsRequired();
                  entity.Property(e => e.Type).HasColumnName("Type").HasMaxLength(50).IsRequired();
                  entity.Property(e => e.ReferenceId).HasColumnName("ReferenceId").HasMaxLength(100).IsRequired(false);
                  entity.Property(e => e.Description).HasColumnName("Description").HasMaxLength(500).IsRequired(false);
                  entity.Property(e => e.Status).HasColumnName("Status").HasMaxLength(50).HasDefaultValue("Pending");
                  entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("getdate()");

                  entity.HasOne(e => e.Wallet)
                        .WithMany(w => w.Transactions)
                        .HasForeignKey(e => e.WalletId)
                        .OnDelete(DeleteBehavior.Cascade);

                  entity.HasIndex(e => e.WalletId);
                  entity.HasIndex(e => e.Status);
              });
        }
    }
}
