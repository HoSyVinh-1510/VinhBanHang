using BaseCore.Repository;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Data
{
    public static class ShopFeatureDatabaseBootstrapper
    {
        public static async Task EnsureAsync(SQLServerDbContext db)
        {
            await db.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'[dbo].[PaymentTransactions]', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[PaymentTransactions];
END;

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[Users]', N'RefundQrImageUrl') IS NULL
BEGIN
    ALTER TABLE [dbo].[Users] ADD [RefundQrImageUrl] [nvarchar](1000) NULL;
END;

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[Users]', N'RefundQrImageUrl') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Users] ALTER COLUMN [RefundQrImageUrl] [nvarchar](max) NULL;
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserRefundQrs](
        [UserRefundQrId] [int] IDENTITY(1,1) NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [DisplayName] [nvarchar](120) NOT NULL,
        [QrImageUrl] [nvarchar](max) NOT NULL,
        [IsDefault] [bit] NOT NULL CONSTRAINT [DF_UserRefundQrs_IsDefault] DEFAULT ((0)),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_UserRefundQrs_CreatedAt] DEFAULT (getdate()),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_UserRefundQrs] PRIMARY KEY CLUSTERED ([UserRefundQrId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_UserRefundQrs_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[UserRefundQrs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_UserRefundQrs_UserId] ON [dbo].[UserRefundQrs]([UserId] ASC);
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_UserRefundQrs_UserId_IsDefault' AND [object_id] = OBJECT_ID(N'[dbo].[UserRefundQrs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_UserRefundQrs_UserId_IsDefault] ON [dbo].[UserRefundQrs]([UserId] ASC, [IsDefault] ASC);
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_UserRefundQrs_Users')
BEGIN
    ALTER TABLE [dbo].[UserRefundQrs] WITH CHECK ADD CONSTRAINT [FK_UserRefundQrs_Users]
        FOREIGN KEY([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[Contacts]', N'U') IS NOT NULL AND OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NULL
BEGIN
    EXEC sp_rename 'dbo.Contacts', 'SupportMessages';
END;

IF EXISTS(SELECT 1 FROM sys.columns WHERE Name = N'ContactId' AND Object_ID = Object_ID(N'[dbo].[SupportMessages]'))
BEGIN
    EXEC sp_rename 'dbo.SupportMessages.ContactId', 'SupportMessageId', 'COLUMN';
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SupportMessages](
        [SupportMessageId] [int] IDENTITY(1,1) NOT NULL,
        [FullName] [nvarchar](100) NOT NULL,
        [Email] [nvarchar](100) NULL,
        [Subject] [nvarchar](200) NULL,
        [Message] [nvarchar](1000) NOT NULL,
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_SupportMessages_CreatedAt] DEFAULT (getdate()),
        [Status] [nvarchar](50) NOT NULL CONSTRAINT [DF_SupportMessages_Status] DEFAULT (N'Chua xu ly'),
        [UserId] [nvarchar](450) NULL,
        [AdminReply] [nvarchar](max) NULL,
        [RepliedAt] [datetime] NULL,
        [RepliedByUserId] [nvarchar](450) NULL,
        [ImageUrl] [nvarchar](max) NULL,
        CONSTRAINT [PK_SupportMessages] PRIMARY KEY CLUSTERED ([SupportMessageId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[SupportMessages]', N'UserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[SupportMessages] ADD [UserId] [nvarchar](450) NULL;
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_SupportMessages_Users')
BEGIN
    ALTER TABLE [dbo].[SupportMessages] WITH CHECK ADD CONSTRAINT [FK_SupportMessages_Users]
        FOREIGN KEY([UserId]) REFERENCES [dbo].[Users] ([Id]);
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[SupportMessages]', N'AdminReply') IS NULL
BEGIN
    ALTER TABLE [dbo].[SupportMessages] ADD [AdminReply] [nvarchar](max) NULL;
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[SupportMessages]', N'RepliedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[SupportMessages] ADD [RepliedAt] [datetime] NULL;
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[SupportMessages]', N'RepliedByUserId') IS NULL
BEGIN
    ALTER TABLE [dbo].[SupportMessages] ADD [RepliedByUserId] [nvarchar](450) NULL;
END;

IF OBJECT_ID(N'[dbo].[SupportMessages]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[SupportMessages]', N'ImageUrl') IS NULL
BEGIN
    ALTER TABLE [dbo].[SupportMessages] ADD [ImageUrl] [nvarchar](max) NULL;
END;



IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[UserRefundQrs] ([UserId], [DisplayName], [QrImageUrl], [IsDefault], [CreatedAt])
    SELECT u.[Id], N'Tài khoản mặc định', LTRIM(RTRIM(u.[RefundQrImageUrl])), 1, GETDATE()
    FROM [dbo].[Users] u
    WHERE u.[RefundQrImageUrl] IS NOT NULL
      AND LTRIM(RTRIM(u.[RefundQrImageUrl])) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[UserRefundQrs] q
          WHERE q.[UserId] = u.[Id]
      );
END;

IF OBJECT_ID(N'[dbo].[UserRefundQrs]', N'U') IS NOT NULL
BEGIN
    ;WITH DefaultPick AS (
        SELECT [UserRefundQrId],
               ROW_NUMBER() OVER (PARTITION BY [UserId] ORDER BY CASE WHEN [IsDefault] = 1 THEN 0 ELSE 1 END, [UserRefundQrId]) AS rn
        FROM [dbo].[UserRefundQrs]
    )
    UPDATE q
    SET [IsDefault] = CASE WHEN d.rn = 1 THEN 1 ELSE 0 END
    FROM [dbo].[UserRefundQrs] q
    INNER JOIN DefaultPick d ON d.[UserRefundQrId] = q.[UserRefundQrId];
END;

IF COL_LENGTH(N'[dbo].[Orders]', N'PaymentProvider') IS NOT NULL
BEGIN
    ALTER TABLE [dbo].[Orders]
        DROP COLUMN [PaymentProvider];
END;

IF OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    UPDATE [dbo].[Orders]
    SET [PaymentMethod] = CASE
        WHEN [PaymentMethod] IS NULL OR LTRIM(RTRIM([PaymentMethod])) = N'' THEN N'COD'
        WHEN LOWER(LTRIM(RTRIM([PaymentMethod]))) IN (N'bank transfer', N'banking', N'transfer') THEN N'Bank Transfer'
        WHEN LOWER(LTRIM(RTRIM([PaymentMethod]))) IN (N'cod') THEN N'COD'
        ELSE N'COD'
    END;

    UPDATE [dbo].[Orders]
    SET [PaymentStatus] = CASE
        WHEN [PaymentStatus] IN (N'Unpaid', N'Chưa thanh toán') THEN N'Unpaid'
        WHEN [PaymentStatus] IN (N'Pending', N'Đang chờ', N'Chờ thanh toán') THEN N'Pending'
        WHEN [PaymentStatus] IN (N'Paid', N'Đã thanh toán') THEN N'Paid'
        WHEN [PaymentStatus] IN (N'Failed', N'Thất bại', N'Thanh toán lỗi') THEN N'Failed'
        WHEN [PaymentStatus] IN (N'Refunded', N'Đã hoàn tiền') THEN N'Refunded'
        ELSE [PaymentStatus]
    END;

    UPDATE [dbo].[Orders]
    SET [OrderStatus] = CASE
        WHEN [OrderStatus] IN (N'WaitingPayment', N'Chờ thanh toán', N'Chờ xác nhận thanh toán') THEN N'WaitingPayment'
        WHEN [OrderStatus] IN (N'Pending', N'Chờ xác nhận') THEN N'Pending'
        WHEN [OrderStatus] IN (N'Confirmed', N'Đã xác nhận', N'Đang xử lý', N'Chờ giao hàng') THEN N'Confirmed'
        WHEN [OrderStatus] IN (N'Shipping', N'Shipped', N'Đang giao', N'Đang giao hàng') THEN N'Shipping'
        WHEN [OrderStatus] IN (N'Received', N'Đã nhận', N'Đã nhận hàng') THEN N'Received'
        WHEN [OrderStatus] IN (N'Completed', N'Delivered', N'Hoàn thành', N'Đã giao') THEN N'Completed'
        WHEN [OrderStatus] IN (N'Cancelled', N'Canceled', N'Đã hủy') THEN N'Cancelled'
        WHEN [OrderStatus] IN (N'ReturnRequested', N'Yêu cầu hoàn/trả') THEN N'ReturnRequested'
        WHEN [OrderStatus] IN (N'Returned', N'Đã hoàn/trả', N'Đã trả hàng') THEN N'Returned'
        ELSE [OrderStatus]
    END;
END;

IF OBJECT_ID(N'[dbo].[Bill]', N'U') IS NOT NULL
BEGIN
    UPDATE [dbo].[Bill]
    SET [PaymentMethod] = CASE
        WHEN [PaymentMethod] IS NULL OR LTRIM(RTRIM([PaymentMethod])) = N'' THEN N'COD'
        WHEN LOWER(LTRIM(RTRIM([PaymentMethod]))) IN (N'bank transfer', N'banking', N'transfer') THEN N'Bank Transfer'
        WHEN LOWER(LTRIM(RTRIM([PaymentMethod]))) IN (N'cod') THEN N'COD'
        ELSE N'COD'
    END;

    UPDATE [dbo].[Bill]
    SET [PaymentStatus] = CASE
        WHEN [PaymentStatus] IN (N'Unpaid', N'Chưa thanh toán') THEN N'Unpaid'
        WHEN [PaymentStatus] IN (N'Pending', N'Đang chờ', N'Chờ thanh toán') THEN N'Pending'
        WHEN [PaymentStatus] IN (N'Paid', N'Đã thanh toán') THEN N'Paid'
        WHEN [PaymentStatus] IN (N'Failed', N'Thất bại', N'Thanh toán lỗi') THEN N'Failed'
        WHEN [PaymentStatus] IN (N'Refunded', N'Đã hoàn tiền') THEN N'Refunded'
        ELSE [PaymentStatus]
    END;
END;

IF OBJECT_ID(N'[dbo].[CustomerAddresses]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CustomerAddresses](
        [CustomerAddressId] [int] IDENTITY(1,1) NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [ReceiverName] [nvarchar](100) NOT NULL,
        [Phone] [nvarchar](20) NOT NULL,
        [AddressLine] [nvarchar](255) NOT NULL,
        [Ward] [nvarchar](100) NULL,
        [District] [nvarchar](100) NULL,
        [Province] [nvarchar](100) NULL,
        [IsDefault] [bit] NOT NULL CONSTRAINT [DF_CustomerAddresses_IsDefault] DEFAULT ((0)),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_CustomerAddresses_CreatedAt] DEFAULT (getdate()),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_CustomerAddresses] PRIMARY KEY CLUSTERED ([CustomerAddressId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ProductReviews](
        [ProductReviewId] [int] IDENTITY(1,1) NOT NULL,
        [ProductId] [int] NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [OrderId] [int] NULL,
        [OrderItemId] [int] NULL,
        [Rating] [int] NOT NULL,
        [Comment] [nvarchar](1000) NULL,
        [IsApproved] [bit] NOT NULL CONSTRAINT [DF_ProductReviews_IsApproved] DEFAULT ((1)),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_ProductReviews_CreatedAt] DEFAULT (getdate()),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_ProductReviews] PRIMARY KEY CLUSTERED ([ProductReviewId] ASC),
        CONSTRAINT [CK_ProductReviews_Rating] CHECK ([Rating] >= 1 AND [Rating] <= 5)
    );
END;

IF OBJECT_ID(N'[dbo].[OrderActivityLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrderActivityLogs](
        [OrderActivityLogId] [int] IDENTITY(1,1) NOT NULL,
        [OrderId] [int] NOT NULL,
        [ActivityType] [nvarchar](50) NOT NULL,
        [Title] [nvarchar](150) NOT NULL,
        [Description] [nvarchar](1000) NULL,
        [FromValue] [nvarchar](100) NULL,
        [ToValue] [nvarchar](100) NULL,
        [ActorUserId] [nvarchar](450) NULL,
        [ActorRole] [nvarchar](50) NULL,
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_OrderActivityLogs_CreatedAt] DEFAULT (getdate()),
        CONSTRAINT [PK_OrderActivityLogs] PRIMARY KEY CLUSTERED ([OrderActivityLogId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[OrderStatusHistories]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OrderStatusHistories](
        [OrderStatusHistoryId] [int] IDENTITY(1,1) NOT NULL,
        [OrderId] [int] NOT NULL,
        [PreviousStatus] [nvarchar](50) NULL,
        [NewStatus] [nvarchar](50) NOT NULL,
        [Note] [nvarchar](500) NULL,
        [ChangedByUserId] [nvarchar](450) NULL,
        [ChangedByRole] [nvarchar](50) NULL,
        [ChangedAt] [datetime] NOT NULL CONSTRAINT [DF_OrderStatusHistories_ChangedAt] DEFAULT (getdate()),
        CONSTRAINT [PK_OrderStatusHistories] PRIMARY KEY CLUSTERED ([OrderStatusHistoryId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[Bill]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Bill](
        [BillId] [int] IDENTITY(1,1) NOT NULL,
        [OrderId] [int] NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [BillCode] [nvarchar](50) NOT NULL,
        [ReceiverName] [nvarchar](100) NOT NULL,
        [Phone] [nvarchar](20) NOT NULL,
        [ShippingAddress] [nvarchar](255) NOT NULL,
        [SubtotalAmount] [decimal](18,2) NOT NULL,
        [DiscountAmount] [decimal](18,2) NOT NULL CONSTRAINT [DF_Bill_DiscountAmount] DEFAULT ((0)),
        [TotalAmount] [decimal](18,2) NOT NULL,
        [PaymentMethod] [nvarchar](50) NOT NULL,
        [PaymentStatus] [nvarchar](50) NOT NULL,
        [BillStatus] [nvarchar](50) NOT NULL CONSTRAINT [DF_Bill_BillStatus] DEFAULT (N'Issued'),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_Bill_CreatedAt] DEFAULT (getdate()),
        [PaidAt] [datetime] NULL,
        CONSTRAINT [PK_Bill] PRIMARY KEY CLUSTERED ([BillId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[BillDetails]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BillDetails](
        [BillDetailId] [int] IDENTITY(1,1) NOT NULL,
        [BillId] [int] NOT NULL,
        [ProductId] [int] NOT NULL,
        [ProductName] [nvarchar](150) NOT NULL,
        [Quantity] [int] NOT NULL,
        [UnitPrice] [decimal](18,2) NOT NULL,
        [SubTotal] [decimal](18,2) NOT NULL,
        CONSTRAINT [PK_BillDetails] PRIMARY KEY CLUSTERED ([BillDetailId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[CustomerAddresses]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_CustomerAddresses_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[CustomerAddresses]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CustomerAddresses_UserId] ON [dbo].[CustomerAddresses]([UserId] ASC);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[ProductReviews]', N'OrderId') IS NULL
BEGIN
    ALTER TABLE [dbo].[ProductReviews] ADD [OrderId] [int] NULL;
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND COL_LENGTH(N'[dbo].[ProductReviews]', N'OrderItemId') IS NULL
BEGIN
    ALTER TABLE [dbo].[ProductReviews] ADD [OrderItemId] [int] NULL;
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[OrderItems]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    UPDATE pr
    SET
        pr.[OrderId] = matched.[OrderId],
        pr.[OrderItemId] = matched.[OrderItemId]
    FROM [dbo].[ProductReviews] pr
    CROSS APPLY (
        SELECT TOP (1)
            o.[OrderId],
            oi.[OrderItemId]
        FROM [dbo].[OrderItems] oi
        INNER JOIN [dbo].[Orders] o ON o.[OrderId] = oi.[OrderId]
        WHERE oi.[ProductId] = pr.[ProductId]
          AND o.[UserId] = pr.[UserId]
          AND o.[OrderStatus] IN (N'Received', N'Đã nhận', N'Đã nhận hàng', N'Completed', N'Delivered', N'Hoàn thành', N'Hoan thanh')
        ORDER BY o.[CreatedAt] DESC, oi.[OrderItemId] DESC
    ) matched
    WHERE pr.[OrderItemId] IS NULL;
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_ProductReviews_Product_User' AND [object_id] = OBJECT_ID(N'[dbo].[ProductReviews]'))
BEGIN
    DROP INDEX [UX_ProductReviews_Product_User] ON [dbo].[ProductReviews];
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ProductReviews_ProductId' AND [object_id] = OBJECT_ID(N'[dbo].[ProductReviews]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductReviews_ProductId] ON [dbo].[ProductReviews]([ProductId] ASC);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ProductReviews_UserId' AND [object_id] = OBJECT_ID(N'[dbo].[ProductReviews]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductReviews_UserId] ON [dbo].[ProductReviews]([UserId] ASC);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_ProductReviews_OrderItemId' AND [object_id] = OBJECT_ID(N'[dbo].[ProductReviews]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_ProductReviews_OrderItemId]
        ON [dbo].[ProductReviews]([OrderItemId] ASC)
        WHERE [OrderItemId] IS NOT NULL;
END;

IF OBJECT_ID(N'[dbo].[OrderActivityLogs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_OrderActivityLogs_Order_CreatedAt' AND [object_id] = OBJECT_ID(N'[dbo].[OrderActivityLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_OrderActivityLogs_Order_CreatedAt] ON [dbo].[OrderActivityLogs]([OrderId] ASC, [CreatedAt] DESC);
END;

IF OBJECT_ID(N'[dbo].[OrderActivityLogs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_OrderActivityLogs_ActivityType' AND [object_id] = OBJECT_ID(N'[dbo].[OrderActivityLogs]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_OrderActivityLogs_ActivityType] ON [dbo].[OrderActivityLogs]([ActivityType] ASC);
END;

IF OBJECT_ID(N'[dbo].[OrderStatusHistories]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_OrderStatusHistories_Order_CreatedAt' AND [object_id] = OBJECT_ID(N'[dbo].[OrderStatusHistories]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_OrderStatusHistories_Order_CreatedAt] ON [dbo].[OrderStatusHistories]([OrderId] ASC, [ChangedAt] DESC);
END;

IF OBJECT_ID(N'[dbo].[Bill]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_Bill_OrderId' AND [object_id] = OBJECT_ID(N'[dbo].[Bill]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_Bill_OrderId] ON [dbo].[Bill]([OrderId] ASC);
END;

IF OBJECT_ID(N'[dbo].[Bill]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'UX_Bill_BillCode' AND [object_id] = OBJECT_ID(N'[dbo].[Bill]'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_Bill_BillCode] ON [dbo].[Bill]([BillCode] ASC);
END;

IF OBJECT_ID(N'[dbo].[BillDetails]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_BillDetails_BillId' AND [object_id] = OBJECT_ID(N'[dbo].[BillDetails]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BillDetails_BillId] ON [dbo].[BillDetails]([BillId] ASC);
END;

IF OBJECT_ID(N'[dbo].[BillDetails]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_BillDetails_ProductId' AND [object_id] = OBJECT_ID(N'[dbo].[BillDetails]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_BillDetails_ProductId] ON [dbo].[BillDetails]([ProductId] ASC);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_ProductReviews_Products')
BEGIN
    ALTER TABLE [dbo].[ProductReviews] WITH CHECK ADD CONSTRAINT [FK_ProductReviews_Products]
        FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([ProductId]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_ProductReviews_Users')
BEGIN
    ALTER TABLE [dbo].[ProductReviews] WITH CHECK ADD CONSTRAINT [FK_ProductReviews_Users]
        FOREIGN KEY([UserId]) REFERENCES [dbo].[Users] ([Id]);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_ProductReviews_Orders')
BEGIN
    ALTER TABLE [dbo].[ProductReviews] WITH CHECK ADD CONSTRAINT [FK_ProductReviews_Orders]
        FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([OrderId]);
END;

IF OBJECT_ID(N'[dbo].[ProductReviews]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[OrderItems]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_ProductReviews_OrderItems')
BEGIN
    ALTER TABLE [dbo].[ProductReviews] WITH CHECK ADD CONSTRAINT [FK_ProductReviews_OrderItems]
        FOREIGN KEY([OrderItemId]) REFERENCES [dbo].[OrderItems] ([OrderItemId]);
END;

IF OBJECT_ID(N'[dbo].[OrderActivityLogs]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_OrderActivityLogs_Orders')
BEGIN
    ALTER TABLE [dbo].[OrderActivityLogs] WITH CHECK ADD CONSTRAINT [FK_OrderActivityLogs_Orders]
        FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([OrderId]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[OrderStatusHistories]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE [parent_object_id] = OBJECT_ID(N'[dbo].[OrderStatusHistories]')
          AND [referenced_object_id] = OBJECT_ID(N'[dbo].[Orders]')
    )
BEGIN
    ALTER TABLE [dbo].[OrderStatusHistories] WITH CHECK ADD CONSTRAINT [FK_OrderStatusHistories_Orders]
        FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([OrderId]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[OrderStatusHistories]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Orders]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[OrderStatusHistories]
        ([OrderId], [PreviousStatus], [NewStatus], [Note], [ChangedByUserId], [ChangedByRole], [ChangedAt])
    SELECT
        o.[OrderId],
        NULL,
        o.[OrderStatus],
        N'Tạo dữ liệu lịch sử ban đầu',
        o.[UserId],
        N'System',
        o.[CreatedAt]
    FROM [dbo].[Orders] o
    WHERE o.[OrderStatus] IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[OrderStatusHistories] h
          WHERE h.[OrderId] = o.[OrderId]
      );
END;

IF OBJECT_ID(N'[dbo].[OrderActivityLogs]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[OrderStatusHistories]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[OrderActivityLogs] (
        [OrderId], [ActivityType], [Title], [Description], [FromValue], [ToValue],
        [ActorUserId], [ActorRole], [CreatedAt]
    )
    SELECT
        h.[OrderId],
        CASE
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Open]%' ESCAPE N'\' THEN N'ReturnRequestOpened'
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Resolved]\[Approved]%' ESCAPE N'\' THEN N'ReturnRequestApproved'
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Resolved]\[Rejected]%' ESCAPE N'\' THEN N'ReturnRequestRejected'
            ELSE N'OrderStatusChanged'
        END,
        CASE
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Open]%' ESCAPE N'\' THEN N'Return/refund requested'
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Resolved]\[Approved]%' ESCAPE N'\' THEN N'Return/refund request approved'
            WHEN h.[Note] LIKE N'\[ReturnRequest]\[Resolved]\[Rejected]%' ESCAPE N'\' THEN N'Return/refund request rejected'
            ELSE N'Legacy order activity'
        END,
        LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(h.[Note],
            N'[ReturnRequest][Resolved][Approved]', N''),
            N'[ReturnRequest][Resolved][Rejected]', N''),
            N'[ReturnRequest][Open]', N''))),
        h.[PreviousStatus],
        h.[NewStatus],
        h.[ChangedByUserId],
        h.[ChangedByRole],
        h.[ChangedAt]
    FROM [dbo].[OrderStatusHistories] h
    WHERE h.[Note] LIKE N'\[ReturnRequest]%' ESCAPE N'\'
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[OrderActivityLogs] existing
          WHERE existing.[OrderId] = h.[OrderId]
            AND existing.[CreatedAt] = h.[ChangedAt]
            AND existing.[ActivityType] IN (N'ReturnRequestOpened', N'ReturnRequestApproved', N'ReturnRequestRejected')
      );
END;

IF OBJECT_ID(N'[dbo].[Bill]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_Bill_Orders')
BEGIN
    ALTER TABLE [dbo].[Bill] WITH CHECK ADD CONSTRAINT [FK_Bill_Orders]
        FOREIGN KEY([OrderId]) REFERENCES [dbo].[Orders] ([OrderId]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[BillDetails]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_BillDetails_Bill')
BEGIN
    ALTER TABLE [dbo].[BillDetails] WITH CHECK ADD CONSTRAINT [FK_BillDetails_Bill]
        FOREIGN KEY([BillId]) REFERENCES [dbo].[Bill] ([BillId]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[BillDetails]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_BillDetails_Products')
BEGIN
    ALTER TABLE [dbo].[BillDetails] WITH CHECK ADD CONSTRAINT [FK_BillDetails_Products]
        FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([ProductId]);
END;

IF OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ProductImages](
        [ImageId] [int] IDENTITY(1,1) NOT NULL,
        [ProductId] [int] NOT NULL,
        [ImageUrl] [nvarchar](255) NOT NULL,
        [IsMain] [bit] NOT NULL CONSTRAINT [DF_ProductImages_IsMain] DEFAULT ((0)),
        CONSTRAINT [PK_ProductImages] PRIMARY KEY CLUSTERED ([ImageId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_ProductImages_Products')
BEGIN
    ALTER TABLE [dbo].[ProductImages] WITH CHECK ADD CONSTRAINT [FK_ProductImages_Products]
        FOREIGN KEY([ProductId]) REFERENCES [dbo].[Products] ([ProductId]);
END;

IF OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [name] = N'IX_ProductImages_ProductId' AND [object_id] = OBJECT_ID(N'[dbo].[ProductImages]'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ProductImages_ProductId] ON [dbo].[ProductImages]([ProductId] ASC);
END;

IF COL_LENGTH(N'[dbo].[Categories]', N'ImageUrl') IS NULL
BEGIN
    ALTER TABLE [dbo].[Categories]
        ADD [ImageUrl] [nvarchar](500) NULL;
END;

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
BEGIN
    UPDATE [dbo].[Products]
    SET [ImageUrl] = CASE [ProductId]
        WHEN 1 THEN N'https://cdn.dummyjson.com/recipe-images/1.webp'
        WHEN 2 THEN N'https://cdn.dummyjson.com/recipe-images/2.webp'
        WHEN 3 THEN N'https://cdn.dummyjson.com/recipe-images/22.webp'
        WHEN 4 THEN N'https://cdn.dummyjson.com/recipe-images/4.webp'
        WHEN 5 THEN N'https://cdn.dummyjson.com/recipe-images/3.webp'
        WHEN 6 THEN N'https://cdn.dummyjson.com/recipe-images/6.webp'
        WHEN 7 THEN N'https://cdn.dummyjson.com/recipe-images/7.webp'
        WHEN 8 THEN N'https://cdn.dummyjson.com/recipe-images/8.webp'
        WHEN 9 THEN N'https://cdn.dummyjson.com/recipe-images/9.webp'
        WHEN 10 THEN N'https://cdn.dummyjson.com/recipe-images/10.webp'
        WHEN 11 THEN N'https://cdn.dummyjson.com/recipe-images/11.webp'
        WHEN 12 THEN N'https://cdn.dummyjson.com/recipe-images/12.webp'
        WHEN 13 THEN N'https://cdn.dummyjson.com/recipe-images/13.webp'
        WHEN 14 THEN N'https://cdn.dummyjson.com/recipe-images/14.webp'
        WHEN 15 THEN N'https://cdn.dummyjson.com/recipe-images/15.webp'
        WHEN 16 THEN N'https://cdn.dummyjson.com/recipe-images/16.webp'
        WHEN 17 THEN N'https://cdn.dummyjson.com/recipe-images/17.webp'
        WHEN 18 THEN N'https://cdn.dummyjson.com/recipe-images/18.webp'
        WHEN 19 THEN N'https://cdn.dummyjson.com/recipe-images/19.webp'
        WHEN 20 THEN N'https://cdn.dummyjson.com/recipe-images/20.webp'
        WHEN 21 THEN N'https://cdn.dummyjson.com/recipe-images/21.webp'
        WHEN 22 THEN N'https://cdn.dummyjson.com/recipe-images/25.webp'
        WHEN 23 THEN N'https://cdn.dummyjson.com/recipe-images/23.webp'
        WHEN 24 THEN N'https://cdn.dummyjson.com/recipe-images/24.webp'
        WHEN 25 THEN N'https://cdn.dummyjson.com/recipe-images/30.webp'
        WHEN 26 THEN N'https://cdn.dummyjson.com/recipe-images/26.webp'
        WHEN 27 THEN N'https://cdn.dummyjson.com/recipe-images/27.webp'
        WHEN 28 THEN N'https://cdn.dummyjson.com/recipe-images/28.webp'
        WHEN 29 THEN N'https://cdn.dummyjson.com/recipe-images/29.webp'
        WHEN 30 THEN N'https://cdn.dummyjson.com/recipe-images/5.webp'
        ELSE [ImageUrl]
    END
    WHERE [ProductId] BETWEEN 1 AND 30
      AND (
          [ImageUrl] IS NULL
          OR LTRIM(RTRIM([ImageUrl])) = N''
          OR [ImageUrl] LIKE N'img/%'
          OR [ImageUrl] LIKE N'/img/%'
          OR [ImageUrl] LIKE N'https://picsum.photos/%'
          OR [ImageUrl] LIKE N'https://dummyjson.com/image/%'
      );
END;

IF OBJECT_ID(N'[dbo].[Products]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[ProductImages]', N'U') IS NOT NULL
BEGIN
    INSERT INTO [dbo].[ProductImages] ([ProductId], [ImageUrl], [IsMain])
    SELECT p.[ProductId], LTRIM(RTRIM(p.[ImageUrl])), 1
    FROM [dbo].[Products] p
    WHERE p.[ImageUrl] IS NOT NULL
      AND LTRIM(RTRIM(p.[ImageUrl])) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM [dbo].[ProductImages] pi
          WHERE pi.[ProductId] = p.[ProductId]
      );

    INSERT INTO [dbo].[ProductImages] ([ProductId], [ImageUrl], [IsMain])
    SELECT p.[ProductId], CONCAT(N'/multishop/img/product-', ((p.[ProductId] - 1) % 8) + 1, N'.jpg'), 0
    FROM [dbo].[Products] p
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[ProductImages] pi
        WHERE pi.[ProductId] = p.[ProductId]
          AND pi.[ImageUrl] = CONCAT(N'/multishop/img/product-', ((p.[ProductId] - 1) % 8) + 1, N'.jpg')
    );

    INSERT INTO [dbo].[ProductImages] ([ProductId], [ImageUrl], [IsMain])
    SELECT p.[ProductId], CONCAT(N'/multishop/img/product-', ((p.[ProductId] + 2) % 8) + 1, N'.jpg'), 0
    FROM [dbo].[Products] p
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[ProductImages] pi
        WHERE pi.[ProductId] = p.[ProductId]
          AND pi.[ImageUrl] = CONCAT(N'/multishop/img/product-', ((p.[ProductId] + 2) % 8) + 1, N'.jpg')
    );
END;

IF OBJECT_ID(N'[dbo].[Categories]', N'U') IS NOT NULL
BEGIN
    UPDATE [dbo].[Categories]
    SET [ImageUrl] = CASE [CategoryId]
        WHEN 1 THEN N'https://cdn.dummyjson.com/recipe-images/3.webp'
        WHEN 3 THEN N'https://cdn.dummyjson.com/recipe-images/25.webp'
        WHEN 13 THEN N'https://cdn.dummyjson.com/recipe-images/26.webp'
        WHEN 14 THEN N'https://cdn.dummyjson.com/recipe-images/1.webp'
        WHEN 15 THEN N'https://cdn.dummyjson.com/recipe-images/17.webp'
        WHEN 16 THEN N'https://cdn.dummyjson.com/recipe-images/2.webp'
        ELSE [ImageUrl]
    END
    WHERE [CategoryId] IN (1, 3, 13, 14, 15, 16)
      AND (
          [ImageUrl] IS NULL
          OR LTRIM(RTRIM([ImageUrl])) = N''
          OR [ImageUrl] LIKE N'https://picsum.photos/%'
          OR [ImageUrl] LIKE N'https://dummyjson.com/image/%'
      );
END;

IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Notifications](
        [NotificationId] [int] IDENTITY(1,1) NOT NULL,
        [UserId] [nvarchar](450) NULL,
        [Title] [nvarchar](200) NOT NULL,
        [Message] [nvarchar](1000) NOT NULL,
        [Url] [nvarchar](500) NULL,
        [IsRead] [bit] NOT NULL CONSTRAINT [DF_Notifications_IsRead] DEFAULT (0),
        [IsAdmin] [bit] NOT NULL CONSTRAINT [DF_Notifications_IsAdmin] DEFAULT (0),
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT (getdate()),
        CONSTRAINT [PK_Notifications] PRIMARY KEY CLUSTERED ([NotificationId] ASC)
    );
END;

IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[dbo].[Users]', N'U') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_Notifications_Users')
BEGIN
    ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Users]
        FOREIGN KEY([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[UserWallets]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserWallets](
        [WalletId] [int] IDENTITY(1,1) NOT NULL,
        [UserId] [nvarchar](450) NOT NULL,
        [Balance] [decimal](18,2) NOT NULL DEFAULT ((0)),
        [Status] [nvarchar](50) NOT NULL DEFAULT ('Active'),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_UserWallets] PRIMARY KEY CLUSTERED ([WalletId] ASC)
    );

    ALTER TABLE [dbo].[UserWallets] ADD CONSTRAINT [UQ_UserWallets_UserId] UNIQUE NONCLUSTERED ([UserId] ASC);
    
    ALTER TABLE [dbo].[UserWallets] WITH CHECK ADD CONSTRAINT [FK_UserWallets_Users_UserId] FOREIGN KEY([UserId])
        REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE;
END;

IF OBJECT_ID(N'[dbo].[WalletTransactions]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WalletTransactions](
        [TransactionId] [int] IDENTITY(1,1) NOT NULL,
        [WalletId] [int] NOT NULL,
        [Amount] [decimal](18,2) NOT NULL,
        [Type] [nvarchar](50) NOT NULL,
        [ReferenceId] [nvarchar](100) NULL,
        [Description] [nvarchar](500) NULL,
        [Status] [nvarchar](50) NOT NULL DEFAULT ('Pending'),
        [CreatedAt] [datetime] NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_WalletTransactions] PRIMARY KEY CLUSTERED ([TransactionId] ASC)
    );

    ALTER TABLE [dbo].[WalletTransactions] WITH CHECK ADD CONSTRAINT [FK_WalletTransactions_UserWallets_WalletId] FOREIGN KEY([WalletId])
        REFERENCES [dbo].[UserWallets] ([WalletId]) ON DELETE CASCADE;

    CREATE NONCLUSTERED INDEX [IX_WalletTransactions_WalletId] ON [dbo].[WalletTransactions] ([WalletId] ASC);
    CREATE NONCLUSTERED INDEX [IX_WalletTransactions_Status] ON [dbo].[WalletTransactions] ([Status] ASC);
END;
");
        }
    }
}
