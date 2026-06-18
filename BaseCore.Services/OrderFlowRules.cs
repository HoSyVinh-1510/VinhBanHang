using System.Globalization;
using System.Text;

namespace BaseCore.Services
{
    public static class OrderFlowRules
    {
        public const string OrderStatusWaitingPayment = "WaitingPayment";
        public const string OrderStatusPending = "Pending";
        public const string OrderStatusConfirmed = "Confirmed";
        public const string OrderStatusShipping = "Shipping";
        public const string OrderStatusReceived = "Received";
        public const string OrderStatusCompleted = "Completed";
        public const string OrderStatusCancelled = "Cancelled";
        public const string OrderStatusReturnRequested = "ReturnRequested";
        public const string OrderStatusReturned = "Returned";


        public const string PaymentStatusUnpaid = "Unpaid";
        public const string PaymentStatusPending = "Pending";
        public const string PaymentStatusPaid = "Paid";
        public const string PaymentStatusFailed = "Failed";
        public const string PaymentStatusRefundPending = "RefundPending";
        public const string PaymentStatusRefundTransferred = "RefundTransferred";
        public const string PaymentStatusRefunded = "Refunded";

        public static string TrimToMaxLength(string value, int maxLength)
        {
            var trimmed = value.Trim();
            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }

        public static bool IsBankTransfer(string? paymentMethod)
        {
            return string.Equals(
                NormalizePaymentMethod(paymentMethod),
                "Bank Transfer",
                StringComparison.OrdinalIgnoreCase);
        }

        public static bool RequiresPaymentConfirmation(string? paymentMethod)
        {
            return IsBankTransfer(paymentMethod);
        }

        public static bool TryNormalizePaymentMethod(string? paymentMethod, out string normalizedPaymentMethod)
        {
            normalizedPaymentMethod = NormalizePaymentMethod(paymentMethod);
            if (string.IsNullOrWhiteSpace(paymentMethod))
            {
                return true;
            }

            var normalized = paymentMethod.Trim().ToLower(CultureInfo.InvariantCulture);
            return normalized is "bank transfer" or "banking" or "transfer" or "cod";
        }

        public static string NormalizePaymentMethod(string? paymentMethod)
        {
            if (string.IsNullOrWhiteSpace(paymentMethod))
            {
                return "COD";
            }

            var normalized = paymentMethod.Trim().ToLower(CultureInfo.InvariantCulture);
            return normalized switch
            {
                "bank transfer" or "banking" or "transfer" => "Bank Transfer",
                "cod" => "COD",
                _ => "COD"
            };
        }

        public static string CanonicalizePaymentStatus(string? paymentStatus)
        {
            if (string.IsNullOrWhiteSpace(paymentStatus))
            {
                return PaymentStatusUnpaid;
            }

            var normalized = NormalizeStatusValue(paymentStatus);
            return normalized switch
            {
                "unpaid" or "chua thanh toan" => PaymentStatusUnpaid,
                "pending" or "dang cho" or "cho thanh toan" => PaymentStatusPending,
                "paid" or "da thanh toan" => PaymentStatusPaid,
                "failed" or "that bai" => PaymentStatusFailed,
                "refundpending" or "refund pending" or "cho hoan tien" or "cho admin hoan tien" => PaymentStatusRefundPending,
                "refundtransferred" or "refund transferred" or "da chuyen hoan tien" or "cho user xac nhan hoan tien" => PaymentStatusRefundTransferred,
                "refunded" or "da hoan tien" => PaymentStatusRefunded,
                _ => TrimToMaxLength(paymentStatus, 50)
            };
        }

        public static bool IsKnownPaymentStatus(string status)
        {
            return status is PaymentStatusUnpaid
                or PaymentStatusPending
                or PaymentStatusPaid
                or PaymentStatusFailed
                or PaymentStatusRefundPending
                or PaymentStatusRefundTransferred
                or PaymentStatusRefunded;
        }

        public static bool IsValidAdminPaymentTransition(string previousStatus, string nextStatus)
        {
            return (previousStatus, nextStatus) switch
            {
                (PaymentStatusUnpaid, PaymentStatusPaid) => true,
                (PaymentStatusUnpaid, PaymentStatusFailed) => true,
                (PaymentStatusPending, PaymentStatusPaid) => true,
                (PaymentStatusPending, PaymentStatusFailed) => true,
                _ => false
            };
        }

        public static bool IsCashOnDelivery(string? paymentMethod)
        {
            return string.Equals(NormalizePaymentMethod(paymentMethod), "COD", StringComparison.OrdinalIgnoreCase);
        }

        public static string CanonicalizeOrderStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return OrderStatusPending;
            }

            var normalized = NormalizeStatusValue(status);
            return normalized switch
            {
                "waitingpayment" or "waiting payment" or "cho thanh toan" or "cho xac nhan thanh toan" => OrderStatusWaitingPayment,
                "pending" or "cho xac nhan" => OrderStatusPending,
                "confirmed" or "processing" or "readytoship" or "ready to ship" or "da xac nhan" or "dang xu ly" or "cho giao hang" => OrderStatusConfirmed,
                "shipping" or "shipped" or "dang giao" or "dang giao hang" => OrderStatusShipping,
                "received" or "da nhan" or "da nhan hang" => OrderStatusReceived,
                "completed" or "delivered" or "da giao" or "hoan tat" => OrderStatusCompleted,
                "cancelled" or "canceled" or "da huy" => OrderStatusCancelled,
                "returnrequested" or "return requested" or "yeu cau hoan tra" => OrderStatusReturnRequested,
                "returned" or "return completed" or "da hoan tra" or "da tra hang" => OrderStatusReturned,
                _ => TrimToMaxLength(status, 50)
            };
        }

        public static bool IsKnownOrderStatus(string status)
        {
            return status is OrderStatusWaitingPayment
                or OrderStatusPending
                or OrderStatusConfirmed
                or OrderStatusShipping
                or OrderStatusReceived
                or OrderStatusCompleted
                or OrderStatusCancelled
                or OrderStatusReturnRequested
                or OrderStatusReturned;
        }

        public static bool IsValidAdminOrderTransition(string previousStatus, string nextStatus, string? deliveryMethod = "Delivery")
        {
            if (string.Equals(deliveryMethod, "Pickup", StringComparison.OrdinalIgnoreCase))
            {
                return (previousStatus, nextStatus) switch
                {
                    (OrderStatusPending, OrderStatusConfirmed) => true,
                    (OrderStatusConfirmed, OrderStatusReceived) => true,
                    (OrderStatusConfirmed, OrderStatusCompleted) => true,
                    _ => false
                };
            }

            return (previousStatus, nextStatus) switch
            {
                (OrderStatusPending, OrderStatusConfirmed) => true,
                (OrderStatusConfirmed, OrderStatusShipping) => true,
                _ => false
            };
        }

        /// <summary>
        /// User có thể tự hủy đơn chỉ khi chưa vào giao hàng.
        /// Khi Shipping hoặc Completed, phải gửi Return Request.
        /// </summary>
        public static bool CanUserCancelOrderStatus(string status)
        {
            var canonicalStatus = CanonicalizeOrderStatus(status);
            return canonicalStatus is OrderStatusWaitingPayment
                or OrderStatusPending
                or OrderStatusConfirmed;
        }

        /// <summary>
        /// Admin chỉ được hủy đơn trước khi Shipping.
        /// Sau khi Shipping phải dùng luồng Return/Refund.
        /// </summary>
        public static bool CanAdminCancelOrderStatus(string status)
        {
            var canonicalStatus = CanonicalizeOrderStatus(status);
            return canonicalStatus is OrderStatusWaitingPayment
                or OrderStatusPending
                or OrderStatusConfirmed;
        }

        /// <summary>
        /// User can request return/refund only after confirming order receipt.
        /// </summary>
        public static bool CanRequestReturn(string? status)
        {
            var canonicalStatus = CanonicalizeOrderStatus(status);
            return canonicalStatus is OrderStatusReceived;
        }

        public static bool CanRequestReturn(
            string? orderStatus,
            string? paymentMethod,
            string? paymentStatus,
            bool hasBankTransferSubmission,
            decimal totalAmount)
        {
            return CanRequestReturn(orderStatus)
                && HasMoneyReceivedForRefund(paymentMethod, paymentStatus, hasBankTransferSubmission, totalAmount);
        }

        public static bool IsRefundFlowOrderStatus(string? orderStatus)
        {
            var canonicalStatus = CanonicalizeOrderStatus(orderStatus);
            return canonicalStatus is OrderStatusCancelled or OrderStatusReturned;
        }

        public static bool IsRefundPaymentStatus(string? paymentStatus)
        {
            var canonicalStatus = CanonicalizePaymentStatus(paymentStatus);
            return canonicalStatus is PaymentStatusRefundPending
                or PaymentStatusRefundTransferred
                or PaymentStatusRefunded;
        }

        public static bool HasSettledPaymentForRefund(string? paymentStatus)
        {
            var canonicalStatus = CanonicalizePaymentStatus(paymentStatus);
            return canonicalStatus is PaymentStatusPaid
                or PaymentStatusRefundPending
                or PaymentStatusRefundTransferred
                or PaymentStatusRefunded;
        }

        public static bool HasMoneyReceivedForRefund(
            string? paymentMethod,
            string? paymentStatus,
            bool hasBankTransferSubmission,
            decimal totalAmount)
        {
            if (totalAmount <= 0)
            {
                return false;
            }

            var canonicalStatus = CanonicalizePaymentStatus(paymentStatus);
            if (HasSettledPaymentForRefund(canonicalStatus))
            {
                return true;
            }

            return IsBankTransfer(paymentMethod)
                && canonicalStatus == PaymentStatusPending
                && hasBankTransferSubmission;
        }

        public static bool IsPaidPaymentStatus(string? status)
        {
            return string.Equals(
                CanonicalizePaymentStatus(status),
                PaymentStatusPaid,
                StringComparison.OrdinalIgnoreCase);
        }

        public static bool IsPendingPaymentStatus(string? status)
        {
            var canonicalStatus = CanonicalizePaymentStatus(status);
            return canonicalStatus is PaymentStatusPending or PaymentStatusUnpaid;
        }

        public static string ToVietnameseOrderStatus(string? status)
        {
            return CanonicalizeOrderStatus(status) switch
            {
                OrderStatusWaitingPayment => "Chờ thanh toán",
                OrderStatusPending => "Chờ admin xác nhận",
                OrderStatusConfirmed => "Đang chuẩn bị hàng",
                OrderStatusShipping => "Đang giao hàng",
                OrderStatusReceived => "Đã nhận hàng",
                OrderStatusCompleted => "Hoàn tất",
                OrderStatusCancelled => "Đã hủy",
                OrderStatusReturnRequested => "Đang yêu cầu hoàn/trả",
                OrderStatusReturned => "Đã hoàn/trả hàng",
                _ => string.IsNullOrWhiteSpace(status) ? "Chưa có trạng thái" : status.Trim()
            };
        }

        public static string ToVietnamesePaymentStatus(string? status)
        {
            return CanonicalizePaymentStatus(status) switch
            {
                PaymentStatusUnpaid => "Chưa thanh toán",
                PaymentStatusPending => "Chờ admin xác nhận thanh toán",
                PaymentStatusPaid => "Đã thanh toán",
                PaymentStatusFailed => "Thanh toán thất bại",
                PaymentStatusRefundPending => "Chờ admin hoàn tiền",
                PaymentStatusRefundTransferred => "Admin đã chuyển hoàn tiền, chờ user xác nhận",
                PaymentStatusRefunded => "Đã hoàn tiền",
                _ => string.IsNullOrWhiteSpace(status) ? "Chưa có trạng thái" : status.Trim()
            };
        }

        public static string FormatOrderStatusChange(string? previousStatus, string newStatus)
        {
            var fromStatus = string.IsNullOrWhiteSpace(previousStatus)
                ? "Chưa có trạng thái"
                : ToVietnameseOrderStatus(previousStatus);
            return $"Trạng thái đơn hàng: {fromStatus} -> {ToVietnameseOrderStatus(newStatus)}.";
        }

        public static string FormatPaymentStatusChange(string? previousStatus, string newStatus)
        {
            var fromStatus = string.IsNullOrWhiteSpace(previousStatus)
                ? "Chưa có trạng thái thanh toán"
                : ToVietnamesePaymentStatus(previousStatus);
            return $"Trạng thái thanh toán: {fromStatus} -> {ToVietnamesePaymentStatus(newStatus)}.";
        }

        public static string FormatDurationVietnamese(TimeSpan timeout)
        {
            if (timeout.TotalDays >= 1 && timeout.TotalHours % 24 == 0)
            {
                return $"{timeout.TotalDays:0.#} ngày";
            }

            if (timeout.TotalHours >= 1)
            {
                return $"{timeout.TotalHours:0.#} giờ";
            }

            return $"{Math.Max(1, timeout.TotalMinutes):0.#} phút";
        }

        private static string NormalizeStatusValue(string value)
        {
            var normalized = value.Trim().ToLower(CultureInfo.InvariantCulture).Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(normalized.Length);

            foreach (var character in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            return builder
                .ToString()
                .Normalize(NormalizationForm.FormC)
                .Replace("đ", "d");
        }
    }
}

