using System;
using System.Collections.Generic;

namespace BaseCore.DTO
{
    public class CreateOrderDto
    {
        public List<OrderItemDto> Items { get; set; } = new();
        public string? ReceiverName { get; set; }
        public string? Phone { get; set; }
        public string? ShippingAddress { get; set; }
        public string? Note { get; set; }
        public string? PaymentMethod { get; set; }
        public string? CouponCode { get; set; }
        public int? AddressId { get; set; }
        public bool UseWallet { get; set; }
        public string DeliveryMethod { get; set; } = "Delivery";
        public DateTime? PickupTime { get; set; }
    }

    public class ValidateCouponDto
    {
        public string? CouponCode { get; set; }
        public List<OrderItemDto> Items { get; set; } = new();
    }

    public class OrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "";
        public string? Note { get; set; }
    }

    public class UpdatePaymentStatusDto
    {
        public string PaymentStatus { get; set; } = "";
    }

    public class SubmitBankTransferDto
    {
        public string? Note { get; set; }
    }

    public class SubmitRefundTransferDto
    {
        public string? Note { get; set; }
        public string? RefundMethod { get; set; } // "Wallet" or "BankQR"
    }

    public class ReturnRequestDto
    {
        public string? Reason { get; set; }
    }

    public class ResolveReturnRequestDto
    {
        public bool IsApproved { get; set; }
        public string? Note { get; set; }
    }

    public class OrderQueryDto
    {
        public string? Keyword { get; set; }
        public string? OrderStatus { get; set; }
        public string? PaymentStatus { get; set; }
        public string? PaymentMethod { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal? MinTotal { get; set; }
        public decimal? MaxTotal { get; set; }
        public string? SortBy { get; set; } = "createdAt";
        public string? SortDirection { get; set; } = "desc";

        private int _page = 1;
        public int Page
        {
            get => _page <= 0 ? 1 : _page;
            set => _page = value <= 0 ? 1 : value;
        }

        private int _pageSize = 10;
        public int PageSize
        {
            get => _pageSize <= 0 ? 10 : Math.Min(_pageSize, 100);
            set => _pageSize = value <= 0 ? 10 : Math.Min(value, 100);
        }
    }

    public class CancelOrderRequestDto
    {
        public string? RefundMethod { get; set; } // "Wallet" or "QR"
        public int? RefundQrId { get; set; }
    }
}
