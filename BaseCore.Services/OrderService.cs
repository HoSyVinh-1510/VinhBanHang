
using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;

using BaseCore.Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace BaseCore.Services
{
    /// <summary>
    /// Order API Controller
    /// </summary>
    
    
    
    public class OrderService : IOrderService
    {
        private const string ActivityOrderCreated = "OrderCreated";
        private const string ActivityOrderStatusChanged = "OrderStatusChanged";
        private const string ActivityPaymentStatusChanged = "PaymentStatusChanged";
        private const string ActivityOrderCancelled = "OrderCancelled";
        private const string ActivityBankTransferSubmitted = "BankTransferSubmitted";
        private const string ActivityRefundTransferSubmitted = "RefundTransferSubmitted";
        private const string ActivityRefundReceivedConfirmed = "RefundReceivedConfirmed";
        private const string ActivityReturnRequestOpened = "ReturnRequestOpened";
        private const string ActivityReturnRequestApproved = "ReturnRequestApproved";
        private const string ActivityReturnRequestRejected = "ReturnRequestRejected";
        private const int DefaultBankTransferTimeoutMinutes = 15;
        private const int DefaultPendingCodTimeoutHours = 12;
        private const int DefaultPreparingTimeoutHours = 72;
        private const int DefaultShippingTimeoutHours = 168;
        private const int DefaultReturnRequestWindowHours = 168;

        private readonly IOrderRepositoryEF _orderRepository;
        private readonly IOrderItemRepositoryEF _orderItemRepository;
        private readonly IOrderStatusHistoryRepositoryEF _orderStatusHistoryRepository;
        private readonly IOrderActivityLogRepositoryEF _orderActivityLogRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;
        private readonly ICouponRepositoryEF _couponRepository;
        private readonly ICouponService _couponService;
        private readonly ICustomerAddressRepositoryEF _addressRepository;
        private readonly IBillRepositoryEF _billRepository;
        private readonly IUnitOfWorkEF _unitOfWork;
        private readonly NotificationService _notificationService;
        private readonly IWalletRepositoryEF _walletRepository;
        private readonly TimeSpan _bankTransferTimeout;
        private readonly TimeSpan _pendingCodTimeout;
        private readonly TimeSpan _preparingTimeout;
        private readonly TimeSpan _shippingTimeout;
        private readonly TimeSpan _returnRequestWindow;

        public OrderService(
            IOrderRepositoryEF orderRepository,
            IOrderItemRepositoryEF orderItemRepository,
            IOrderStatusHistoryRepositoryEF orderStatusHistoryRepository,
            IOrderActivityLogRepositoryEF orderActivityLogRepository,
            IProductRepositoryEF productRepository,
            ICategoryRepositoryEF categoryRepository,
            ICouponRepositoryEF couponRepository, ICouponService couponService,
            ICustomerAddressRepositoryEF addressRepository,
            IBillRepositoryEF billRepository,
            IUnitOfWorkEF unitOfWork,
            NotificationService notificationService,
            IWalletRepositoryEF walletRepository,
            IConfiguration configuration)
        {
            _walletRepository = walletRepository;
            _notificationService = notificationService;
            _orderRepository = orderRepository;
            _orderItemRepository = orderItemRepository;
            _orderStatusHistoryRepository = orderStatusHistoryRepository;
            _orderActivityLogRepository = orderActivityLogRepository;
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
            _couponRepository = couponRepository;
            _couponService = couponService;
            _addressRepository = addressRepository;
            _billRepository = billRepository;
            _unitOfWork = unitOfWork;
            _bankTransferTimeout = GetConfiguredTimeout(
                configuration,
                "BankTransferTimeoutMinutes",
                "BankTransferTimeoutHours",
                TimeSpan.FromMinutes(DefaultBankTransferTimeoutMinutes));
            _pendingCodTimeout = GetConfiguredTimeout(
                configuration,
                "PendingCodTimeoutMinutes",
                "PendingCodTimeoutHours",
                TimeSpan.FromHours(DefaultPendingCodTimeoutHours));
            _preparingTimeout = GetConfiguredTimeout(
                configuration,
                "PreparingTimeoutMinutes",
                "PreparingTimeoutHours",
                TimeSpan.FromHours(DefaultPreparingTimeoutHours));
            _shippingTimeout = GetConfiguredTimeout(
                configuration,
                "ShippingTimeoutMinutes",
                "ShippingTimeoutHours",
                TimeSpan.FromHours(DefaultShippingTimeoutHours));
            _returnRequestWindow = GetConfiguredTimeout(
                configuration,
                "ReturnRequestWindowMinutes",
                "ReturnRequestWindowHours",
                TimeSpan.FromHours(DefaultReturnRequestWindowHours));
        }

        
        public async Task<ServiceResult> GetMyOrdersAsync(string userId, string role, OrderQueryDto query)
        {
            
            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }
            return await GetOrdersInternal(userId, query);
            
        }

        public async Task<ServiceResult> GetAllOrdersAsync(OrderQueryDto query)
        {
           return await GetOrdersInternal(null, query);
        }

        public async Task<ServiceResult> GetByIdAsync(string userId, string role, int id)
        {
                    var order = await _orderRepository.GetWithDetailsAsync(id);
                    if (order == null)
                    {
                        return ServiceResult.Error("Order not found");
                    }

            
                    if (string.IsNullOrEmpty(userId))
                    {
                        return ServiceResult.Error("Unauthorized");
                    }

                    var isAdmin = role == "Admin";
                    if (!isAdmin && !string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return ServiceResult.Error("Forbidden");
                    }

                    var details = order.OrderItems ?? new List<OrderItem>();
                    var statusHistory = await TryGetStatusHistoryAsync(id);
                    if (statusHistory.Count == 0)
                    {
                        statusHistory = BuildFallbackStatusHistory(order);
                    }
                    var activityLogs = await TryGetActivityLogsAsync(id);
                    var bill = await _billRepository.GetByOrderWithDetailsAsync(id);
                    return ServiceResult.Success(new { order, details, statusHistory, activityLogs, bill });
        }

        public async Task<ServiceResult> GetStatusHistoryAsync(string userId, string role, int id)
        {
                    var order = await _orderRepository.GetByIdAsync(id);
                    if (order == null)
                    {
                        return ServiceResult.Error("Order not found");
                    }

                    if (string.IsNullOrEmpty(userId))
                    {
                        return ServiceResult.Error("Unauthorized");
                    }

                    var isAdmin = role == "Admin";
                    if (!isAdmin && !string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return ServiceResult.Error("Forbidden");
                    }

                    var history = await TryGetStatusHistoryAsync(id);
                    if (history.Count == 0)
                    {
                        history = BuildFallbackStatusHistory(order);
                    }
                    return ServiceResult.Success(history);
        
        }

        public async Task<ServiceResult> ValidateCouponAsync(ValidateCouponDto dto)
        {
                    if (dto.Items == null || dto.Items.Count == 0)
                    {
                        return ServiceResult.Error("Cart is empty.");
                    }

                    if (string.IsNullOrWhiteSpace(dto.CouponCode))
                    {
                        return ServiceResult.Error("Coupon code is required.");
                    }

                    var (isValidItems, itemValidationMessage, subtotalAmount, _) = await BuildOrderItemsAsync(dto.Items);
                    if (!isValidItems)
                    {
                        return ServiceResult.Error(itemValidationMessage);
                    }

                    var validation = await _couponService.ValidateAsync(dto.CouponCode, subtotalAmount);
                    if (!validation.IsValid || validation.Coupon == null)
                    {
                        return ServiceResult.Error(validation.Message);
                    }

                    var finalAmount = Math.Max(0, subtotalAmount - validation.DiscountAmount);
                    return ServiceResult.Success(new
                    {
                        couponCode = validation.Coupon.Code,
                        couponName = validation.Coupon.Name,
                        discountAmount = validation.DiscountAmount,
                        subtotalAmount,
                        finalAmount,
                        message = validation.Message
                    });
        }

        public async Task<ServiceResult> CreateAsync(string userId, string role, CreateOrderDto dto)
        {
            var (isValidItems, itemValidationMessage, subtotalAmount, orderDetails) = await BuildOrderItemsAsync(dto.Items);
            if (!isValidItems) return ServiceResult.Error(itemValidationMessage);

            Coupon? appliedCoupon = null;
            var discountAmount = 0m;

            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                var validation = await _couponService.ValidateAsync(dto.CouponCode, subtotalAmount);
                if (!validation.IsValid || validation.Coupon == null)
                {
                    return ServiceResult.Error(validation.Message);
                }

                appliedCoupon = validation.Coupon;
                discountAmount = validation.DiscountAmount;
            }

            var finalAmount = Math.Max(0, subtotalAmount - discountAmount);

            CustomerAddress? selectedAddress = null;
            if (dto.AddressId.HasValue)
            {
                selectedAddress = await _addressRepository.GetByUserAndIdAsync(userId, dto.AddressId.Value);

                if (selectedAddress == null)
                {
                    return ServiceResult.Error("Shipping address is invalid.");
                }
            }

            var receiverName = selectedAddress?.ReceiverName ?? dto.ReceiverName ?? "";
            var phone = selectedAddress?.Phone ?? dto.Phone ?? "";
            var shippingAddress = selectedAddress?.FullAddress ?? dto.ShippingAddress ?? "";
            
            if (dto.DeliveryMethod == "Pickup")
            {
                shippingAddress = string.IsNullOrWhiteSpace(shippingAddress) ? "Lấy tại quán" : shippingAddress;
                receiverName = string.IsNullOrWhiteSpace(receiverName) ? "Khách hàng" : receiverName;
                phone = string.IsNullOrWhiteSpace(phone) ? "" : phone;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(receiverName) ||
                    string.IsNullOrWhiteSpace(phone) ||
                    string.IsNullOrWhiteSpace(shippingAddress))
                {
                    return ServiceResult.Error("Receiver name, phone and shipping address are required.");
                }
            }

            if (!OrderFlowRules.TryNormalizePaymentMethod(dto.PaymentMethod, out var paymentMethod))
            {
                return ServiceResult.Error("Payment method must be COD or Bank Transfer.");
            }
            var isZeroAmount = finalAmount <= 0;

            // Check Wallet balance and deduction
            var walletDeduction = 0m;
            UserWallet? userWallet = null;

            if (dto.UseWallet)
            {
                userWallet = await _walletRepository.GetOrCreateByUserIdAsync(userId);
                if (userWallet.Status != "Active")
                {
                    return ServiceResult.Error("Ví tài khoản của bạn đang bị khóa.");
                }

                if (userWallet.Balance > 0)
                {
                    walletDeduction = Math.Min(userWallet.Balance, finalAmount);
                }
            }

            var actualPaymentAmount = finalAmount - walletDeduction;
            var isPaidByWallet = dto.UseWallet && actualPaymentAmount <= 0;

            var paymentStatus = (isZeroAmount || isPaidByWallet)
                ? OrderFlowRules.PaymentStatusPaid
                : OrderFlowRules.PaymentStatusUnpaid;

            if (dto.UseWallet && walletDeduction > 0 && actualPaymentAmount > 0)
            {
                paymentMethod = $"{paymentMethod} + Wallet";
            }
            else if (isPaidByWallet)
            {
                paymentMethod = "Wallet";
            }

            var orderStatus = (OrderFlowRules.RequiresPaymentConfirmation(paymentMethod) && actualPaymentAmount > 0 && !isZeroAmount)
                ? OrderFlowRules.OrderStatusWaitingPayment
                : OrderFlowRules.OrderStatusPending;

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            foreach (var item in dto.Items)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null)
                {
                    return ServiceResult.Error($"Product {item.ProductId} not found");
                }

                var category = await _categoryRepository.GetByIdAsync(product.CategoryId);
                if (category == null || !category.IsActive)
                {
                    return ServiceResult.Error($"Product category is inactive for product: {product.Name}");
                }

                if (product.Stock < item.Quantity)
                {
                    return ServiceResult.Error($"Insufficient stock for product: {product.Name}");
                }

                var reserved = await _productRepository.TryDecreaseStockAsync(item.ProductId, item.Quantity);
                if (!reserved)
                {
                    return ServiceResult.Error($"Product stock changed while checkout. Please review cart again: {product.Name}");
                }
            }

            var order = new Order
            {
                UserId = userId,
                ReceiverName = receiverName,
                Phone = phone,
                ShippingAddress = shippingAddress,
                Note = dto.Note,
                PaymentMethod = paymentMethod,
                PaymentStatus = paymentStatus,
                OrderStatus = orderStatus,
                CouponCode = appliedCoupon?.Code ?? dto.CouponCode,
                DiscountAmount = discountAmount,
                                TotalAmount = finalAmount,
                DeliveryMethod = dto.DeliveryMethod ?? "Delivery",
                PickupTime = dto.PickupTime,
                CreatedAt = DateTime.Now
            };

            await _orderRepository.AddAsync(order);

            if (dto.UseWallet && walletDeduction > 0 && userWallet != null)
            {
                // Deduct from wallet
                userWallet.Balance -= walletDeduction;
                userWallet.UpdatedAt = DateTime.Now;
                await _walletRepository.UpdateAsync(userWallet);

                // Add wallet transaction record
                var walletTx = new WalletTransaction
                {
                    WalletId = userWallet.Id,
                    Amount = -walletDeduction,
                    Type = "Payment",
                    ReferenceId = order.Id.ToString(),
                    Description = $"Thanh toán khấu trừ đơn hàng #{order.Id}",
                    Status = "Completed",
                    CreatedAt = DateTime.Now
                };
                await _walletRepository.AddTransactionAsync(walletTx);
            }

            foreach (var detail in orderDetails)
            {
                detail.OrderId = order.Id;
                await _orderItemRepository.AddAsync(detail);
            }

            if (appliedCoupon != null)
            {
                var lockedCoupon = await _couponRepository.TryIncrementUsageAsync(appliedCoupon.Id);
                if (!lockedCoupon)
                {
                    return ServiceResult.Error("Coupon is no longer available. Please refresh cart and try another coupon.");
                }
            }

            var bill = await CreateBillForOrderAsync(
                order,
                orderDetails,
                subtotalAmount,
                discountAmount,
                finalAmount);

            await AddStatusHistoryAsync(
                order.Id,
                null,
                order.OrderStatus,
                "Don hang duoc tao.",
                userId,
                "User");
            await AddActivityLogAsync(
                order.Id,
                ActivityOrderCreated,
                "Tao don hang",
                $"Don hang #{order.Id} da duoc tao.",
                null,
                order.OrderStatus,
                userId,
                "User");

            await transaction.CommitAsync();

            return ServiceResult.Success(new
            {
                order,
                details = orderDetails,
                bill,
                subtotalAmount,
                discountAmount,
                finalAmount
            });
        }

public async Task<ServiceResult> UpdateStatusAsync(string userId, string role, int id, UpdateStatusDto dto)
{
            if (string.IsNullOrWhiteSpace(dto.Status))
            {
                return ServiceResult.Error("Status is required");
            }

            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }

            var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            var nextStatus = OrderFlowRules.CanonicalizeOrderStatus(dto.Status);
            if (!OrderFlowRules.IsKnownOrderStatus(nextStatus))
            {
                return ServiceResult.Error("Order status is invalid.");
            }

            if (string.Equals(previousStatus, nextStatus, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Success(order);
            }

            if (nextStatus == OrderFlowRules.OrderStatusCancelled)
            {
                if (!OrderFlowRules.CanAdminCancelOrderStatus(previousStatus))
                {
                    return ServiceResult.Error("Đơn đang giao hàng (Shipping) không thể hủy trực tiếp. Hãy dùng luồng 'Yêu cầu hoàn/trả' để xử lý.");
                }

                await using var cancelTransaction = await _unitOfWork.BeginTransactionAsync();
                await CancelOrderCoreAsync(
                    order,
                    previousStatus,
                    userId,
                    "Admin",
                    string.IsNullOrWhiteSpace(dto.Note) ? "Admin hủy đơn hàng" : dto.Note);
                await cancelTransaction.CommitAsync();
                return ServiceResult.Success(order);
            }

            if (!OrderFlowRules.IsValidAdminOrderTransition(previousStatus, nextStatus, order.DeliveryMethod))
            {
                return ServiceResult.Error("Trình tự hợp lệ cho Giao hàng: Chờ xác nhận -> Đang chuẩn bị -> Đang giao. Cho Lấy tại quán: Chờ xác nhận -> Đang chuẩn bị -> Khách đã nhận.");
            }

            if (nextStatus == OrderFlowRules.OrderStatusConfirmed &&
                OrderFlowRules.IsBankTransfer(order.PaymentMethod) &&
                order.TotalAmount > 0 &&
                !OrderFlowRules.IsPaidPaymentStatus(order.PaymentStatus))
            {
                return ServiceResult.Error("Bank transfer orders must be paid before moving to Confirmed.");
            }

            var actorUserId = userId;
            if (previousStatus == OrderFlowRules.OrderStatusPending &&
                nextStatus == OrderFlowRules.OrderStatusConfirmed &&
                OrderFlowRules.IsCashOnDelivery(order.PaymentMethod) &&
                await IsOrderStatusExpiredAsync(order, OrderFlowRules.OrderStatusPending, _pendingCodTimeout))
            {
                await AutoCancelExpiredOrderAsync(
                    order,
                    previousStatus,
                    $"Hệ thống tự hủy đơn COD vì admin không xác nhận trong {FormatTimeout(_pendingCodTimeout)}.");
                return ServiceResult.Error($"Đơn COD đã quá hạn xác nhận sau {FormatTimeout(_pendingCodTimeout)} và đã được hệ thống tự hủy.");
            }

            if (previousStatus == OrderFlowRules.OrderStatusConfirmed &&
                nextStatus == OrderFlowRules.OrderStatusShipping &&
                await IsOrderStatusExpiredAsync(order, OrderFlowRules.OrderStatusConfirmed, _preparingTimeout))
            {
                await AutoCancelExpiredOrderAsync(
                    order,
                    previousStatus,
                    $"Hệ thống tự hủy đơn vì admin không chuyển sang giao hàng trong {FormatTimeout(_preparingTimeout)}.");
                return ServiceResult.Error($"Đơn đã quá hạn chuẩn bị hàng sau {FormatTimeout(_preparingTimeout)} và đã được hệ thống tự hủy.");
            }

            order.OrderStatus = nextStatus;
            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, nextStatus);

            await AddStatusHistoryAsync(
                order.Id,
                previousStatus,
                nextStatus,
                string.IsNullOrWhiteSpace(dto.Note)
                    ? OrderFlowRules.FormatOrderStatusChange(previousStatus, nextStatus)
                    : dto.Note,
                actorUserId,
                "User");
            await AddActivityLogAsync(
                order.Id,
                ActivityOrderStatusChanged,
                "Cập nhật trạng thái đơn hàng",
                string.IsNullOrWhiteSpace(dto.Note)
                    ? OrderFlowRules.FormatOrderStatusChange(previousStatus, nextStatus)
                    : dto.Note,
                previousStatus,
                nextStatus,
                actorUserId,
                "User");
            return ServiceResult.Success(order);
        
            }

        public async Task<ServiceResult> UpdatePaymentStatusAsync(string userId, string role, int id, UpdatePaymentStatusDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PaymentStatus))
            {
                return ServiceResult.Error("Payment status is required");
            }

            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }

            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            var nextPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(dto.PaymentStatus);
            if (!OrderFlowRules.IsKnownPaymentStatus(nextPaymentStatus))
            {
                return ServiceResult.Error("Payment status is invalid.");
            }

            if (string.Equals(previousPaymentStatus, nextPaymentStatus, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Success(order);
            }

            if (!OrderFlowRules.IsValidAdminPaymentTransition(previousPaymentStatus, nextPaymentStatus))
            {
                return ServiceResult.Error("Payment flow must be Unpaid/Pending -> Paid/Failed. Refunds must use the refund transfer flow.");
            }

            var previousOrderStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            var canOnlyRefundPayment = OrderFlowRules.IsRefundFlowOrderStatus(previousOrderStatus);
            if (canOnlyRefundPayment)
            {
                return ServiceResult.Error("Cancelled or returned orders must use the refund transfer flow.");
            }

            if (OrderFlowRules.IsRefundPaymentStatus(nextPaymentStatus))
            {
                return ServiceResult.Error("Refund statuses are managed by the refund transfer flow.");
            }

            if (nextPaymentStatus == OrderFlowRules.PaymentStatusPaid &&
                OrderFlowRules.IsCashOnDelivery(order.PaymentMethod) &&
                previousOrderStatus != OrderFlowRules.OrderStatusReceived &&
                previousOrderStatus != OrderFlowRules.OrderStatusCompleted)
            {
                return ServiceResult.Error("COD can be marked as paid only after user confirms receiving the order.");
            }

            if (nextPaymentStatus == OrderFlowRules.PaymentStatusPaid &&
                OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                var latestTransferSubmission = await _orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                    order.Id,
                    ActivityBankTransferSubmitted);
                if (latestTransferSubmission == null)
                {
                    if (order.CreatedAt.Add(_bankTransferTimeout) < DateTime.Now)
                    {
                        await AutoCancelExpiredOrderAsync(
                            order,
                            previousOrderStatus,
                            $"Hệ thống tự hủy đơn chuyển khoản vì user chưa xác nhận đã chuyển khoản trong {FormatTimeout(_bankTransferTimeout)}.");
                        return ServiceResult.Error($"Đơn chuyển khoản đã quá hạn xác nhận sau {FormatTimeout(_bankTransferTimeout)} và đã được hệ thống tự hủy.");
                    }

                    return ServiceResult.Error("User has not submitted transfer confirmation yet.");
                }

                if (latestTransferSubmission.CreatedAt > order.CreatedAt.Add(_bankTransferTimeout))
                {
                    await AutoCancelExpiredOrderAsync(
                        order,
                        previousOrderStatus,
                        $"Hệ thống tự hủy đơn chuyển khoản vì user xác nhận chuyển khoản sau hạn {FormatTimeout(_bankTransferTimeout)}.");
                    return ServiceResult.Error($"User xác nhận chuyển khoản sau hạn {FormatTimeout(_bankTransferTimeout)} nên đơn đã được hệ thống tự hủy.");
                }
            }

            order.PaymentStatus = nextPaymentStatus;
            var nextOrderStatus = previousOrderStatus;
            if (nextPaymentStatus == OrderFlowRules.PaymentStatusPaid && previousOrderStatus == OrderFlowRules.OrderStatusWaitingPayment)
            {
                nextOrderStatus = OrderFlowRules.OrderStatusConfirmed;
                order.OrderStatus = nextOrderStatus;
            }

            if (nextPaymentStatus == OrderFlowRules.PaymentStatusFailed &&
                OrderFlowRules.CanAdminCancelOrderStatus(previousOrderStatus))
            {
                await using var transaction = await _unitOfWork.BeginTransactionAsync();
                order.PaymentStatus = OrderFlowRules.PaymentStatusFailed;
                await CancelOrderCoreAsync(
                    order,
                    previousOrderStatus,
                    userId,
                    "Admin",
                    "Admin đánh dấu thanh toán thất bại và hủy đơn.");
                await transaction.CommitAsync();
                return ServiceResult.Success(order);
            }

            await _orderRepository.UpdateAsync(order);
            if (!string.Equals(previousOrderStatus, nextOrderStatus, StringComparison.OrdinalIgnoreCase))
            {
                await SyncBillStatusAsync(order.Id, nextOrderStatus);
                await AddStatusHistoryAsync(
                    order.Id,
                    previousOrderStatus,
                    nextOrderStatus,
                    $"Admin xác nhận thanh toán. {OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, nextPaymentStatus)}",
                    userId,
                    "Admin");
            }
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);
            await AddActivityLogAsync(
                order.Id,
                ActivityPaymentStatusChanged,
                "Cập nhật trạng thái thanh toán",
                OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, nextPaymentStatus),
                previousPaymentStatus,
                nextPaymentStatus,
                userId,
                "Admin"); 
            return ServiceResult.Success(order);
        
        }

public async Task<ServiceResult> SubmitBankTransferAsync(string userId, string role, int id, SubmitBankTransferDto dto)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }
          
            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }

            if (!string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Error("Forbidden");
            }

            if (!OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                return ServiceResult.Error("This order does not use Bank Transfer payment method.");
            }

            var orderStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (orderStatus != OrderFlowRules.OrderStatusWaitingPayment)
            {
                return ServiceResult.Error("Only waiting-payment orders can submit transfer confirmation.");
            }

            var paymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (paymentStatus is OrderFlowRules.PaymentStatusPaid or OrderFlowRules.PaymentStatusFailed or OrderFlowRules.PaymentStatusRefunded)
            {
                return ServiceResult.Error("Order payment is already finalized.");
            }

            var latestTransferSubmission = await _orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                order.Id,
                ActivityBankTransferSubmitted);
            if (latestTransferSubmission != null)
            {
                return ServiceResult.Success(new
                {
                    message = "Transfer confirmation has already been submitted.",
                    submittedAt = latestTransferSubmission.CreatedAt
                });
            }

            if (order.CreatedAt.Add(_bankTransferTimeout) < DateTime.Now)
            {
                await AutoCancelExpiredOrderAsync(
                    order,
                    orderStatus,
                    $"Hệ thống tự hủy đơn chuyển khoản vì user chưa xác nhận đã chuyển khoản trong {FormatTimeout(_bankTransferTimeout)}.");
                return ServiceResult.Error($"Đơn chuyển khoản đã quá hạn xác nhận sau {FormatTimeout(_bankTransferTimeout)} và đã được hệ thống tự hủy.");
            }

            var note = string.IsNullOrWhiteSpace(dto.Note)
                ? "User xác nhận đã chuyển khoản."
                : dto.Note.Trim();
            var previousPaymentStatus = paymentStatus;

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            if (paymentStatus == OrderFlowRules.PaymentStatusUnpaid)
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusPending;
                await _orderRepository.UpdateAsync(order);
                await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);
            }

            await AddActivityLogAsync(
                order.Id,
                ActivityBankTransferSubmitted,
                "User xác nhận chuyển khoản",
                note,
                previousPaymentStatus,
                order.PaymentStatus,
                userId,
                "User");
            await transaction.CommitAsync();

            return ServiceResult.Success(new
            {
                message = "Transfer confirmation submitted successfully.",
                submittedAt = DateTime.Now
            });
}

public async Task<ServiceResult> SubmitRefundTransferAsync(string userId, string role, int id, SubmitRefundTransferDto dto)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }

            var orderStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (!OrderFlowRules.IsRefundFlowOrderStatus(orderStatus))
            {
                return ServiceResult.Error("Refund transfer can be submitted only after order is cancelled or returned.");
            }

            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (previousPaymentStatus == OrderFlowRules.PaymentStatusRefunded)
            {
                return ServiceResult.Error("Refund has already been confirmed by user.");
            }

            if (previousPaymentStatus == OrderFlowRules.PaymentStatusRefundTransferred)
            {
                return ServiceResult.Success(new { message = "Refund transfer has already been submitted.", order });
            }

            if (previousPaymentStatus != OrderFlowRules.PaymentStatusRefundPending)
            {
                return ServiceResult.Error("This order is not waiting for refund transfer.");
            }

            var note = string.IsNullOrWhiteSpace(dto.Note)
                ? "Admin confirmed refund transfer was sent."
                : dto.Note.Trim();
            var adminUserId = userId;

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            if (dto.RefundMethod == "Wallet")
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusRefunded;
                var wallet = await _walletRepository.GetOrCreateByUserIdAsync(order.UserId);
                var refundAmount = order.TotalAmount - order.DiscountAmount;
                if (refundAmount > 0)
                {
                    wallet.Balance += refundAmount;
                    wallet.UpdatedAt = DateTime.Now;
                    await _walletRepository.UpdateAsync(wallet);

                    var refundTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = refundAmount,
                        Type = "Refund",
                        ReferenceId = order.Id.ToString(),
                        Description = $"Hoàn tiền đơn hàng #{order.Id} (vào Ví)",
                        Status = "Completed",
                        CreatedAt = DateTime.Now
                    };
                    await _walletRepository.AddTransactionAsync(refundTx);
                }
                note += " (Admin hoàn tiền thẳng vào Ví điện tử)";
            }
            else
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusRefundTransferred;
            }

            await _orderRepository.UpdateAsync(order);
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);

            await AddActivityLogAsync(
                order.Id,
                ActivityRefundTransferSubmitted,
                dto.RefundMethod == "Wallet" ? "Admin hoàn tiền vào Ví" : "Admin đã chuyển khoản hoàn tiền",
                note,
                previousPaymentStatus,
                order.PaymentStatus,
                adminUserId,
                "Admin");
            await AddActivityLogAsync(
                order.Id,
                ActivityPaymentStatusChanged,
                "Cập nhật trạng thái thanh toán",
                OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, order.PaymentStatus),
                previousPaymentStatus,
                order.PaymentStatus,
                adminUserId,
                "Admin");

            await transaction.CommitAsync();

            return ServiceResult.Success(new
            {
                message = "Refund transfer submitted. Waiting for user confirmation.",
                order
            });
        
}

public async Task<ServiceResult> ConfirmRefundReceivedAsync(string userId, string role, int id)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }

            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }

            if (!string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Error("Forbidden");
            }

            var orderStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (!OrderFlowRules.IsRefundFlowOrderStatus(orderStatus))
            {
                return ServiceResult.Error("Refund receipt can be confirmed only after order is cancelled or returned.");
            }

            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (previousPaymentStatus != OrderFlowRules.PaymentStatusRefundTransferred)
            {
                return ServiceResult.Error("Admin has not submitted refund transfer yet.");
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            order.PaymentStatus = OrderFlowRules.PaymentStatusRefunded;
            await _orderRepository.UpdateAsync(order);
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);

            await AddActivityLogAsync(
                order.Id,
                ActivityRefundReceivedConfirmed,
                "User xac nhan da nhan hoan tien",
                "User confirmed refund money was received.",
                previousPaymentStatus,
                order.PaymentStatus,
                userId,
                "User");
            await AddActivityLogAsync(
                order.Id,
                ActivityPaymentStatusChanged,
                "Cap nhat trang thai thanh toan",
                OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, order.PaymentStatus),
                previousPaymentStatus,
                order.PaymentStatus,
                userId,
                "User");

            await transaction.CommitAsync();

            return ServiceResult.Success(new
            {
                message = "Refund receipt confirmed.",
                order
            });
        
}

public async Task<ServiceResult> ReceiveOrderAsync(string userId, string role, int id)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }
            
            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }

            if (!string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Error("Forbidden");
            }

            var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (previousStatus != OrderFlowRules.OrderStatusShipping)
            {
                return ServiceResult.Error("You can confirm receipt only when the order is in Shipping status.");
            }

            if (await IsOrderStatusExpiredAsync(order, OrderFlowRules.OrderStatusShipping, _shippingTimeout))
            {
                await AutoCancelExpiredOrderAsync(
                    order,
                    previousStatus,
                    $"Hệ thống tự hủy đơn vì user không xác nhận đã nhận hàng trong {FormatTimeout(_shippingTimeout)}.");
                return ServiceResult.Error($"Đơn giao hàng đã quá hạn sau {FormatTimeout(_shippingTimeout)} và đã được hệ thống tự hủy.");
            }

            if (!OrderFlowRules.IsPaidPaymentStatus(order.PaymentStatus) && !OrderFlowRules.IsCashOnDelivery(order.PaymentMethod))
            {
                return ServiceResult.Error("Order must be paid before confirming receipt.");
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            order.OrderStatus = OrderFlowRules.OrderStatusReceived;
            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (OrderFlowRules.IsCashOnDelivery(order.PaymentMethod))
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusPaid;
            }

            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, order.OrderStatus);
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);

            await AddStatusHistoryAsync(
                order.Id,
                previousStatus,
                order.OrderStatus,
                "User xác nhận đã nhận hàng.",
                userId,
                "User");
            await AddActivityLogAsync(
                order.Id,
                ActivityOrderStatusChanged,
                "User xác nhận nhận hàng",
                "User xác nhận đã nhận được hàng.",
                previousStatus,
                order.OrderStatus,
                userId,
                "User");
            if (!string.Equals(previousPaymentStatus, order.PaymentStatus, StringComparison.OrdinalIgnoreCase))
            {
                await AddActivityLogAsync(
                    order.Id,
                    ActivityPaymentStatusChanged,
                    "Cập nhật trạng thái thanh toán",
                    "COD được ghi nhận đã thanh toán khi user xác nhận nhận hàng.",
                    previousPaymentStatus,
                    order.PaymentStatus,
                    userId,
                    "User");
            }

            await transaction.CommitAsync();

            return ServiceResult.Success(new { message = "Order received successfully", order });     
}

public async Task<ServiceResult> CancelOrderAsync(string userId, string role, int id, CancelOrderRequestDto? dto = null)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }
            
            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }

            var isAdmin = role == "Admin";
            if (!isAdmin && !string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Error("Forbidden");
            }

            var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            var canCancel = isAdmin
                ? OrderFlowRules.CanAdminCancelOrderStatus(previousStatus)
                : OrderFlowRules.CanUserCancelOrderStatus(previousStatus);
            if (!canCancel)
            {
                return ServiceResult.Error(isAdmin
                        ? "Admin can cancel only orders before shipping. Use return/refund flow for shipped/completed orders."
                        : "You can cancel only orders before shipping. For shipped/completed orders, submit a return/refund request.");
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync();
            await CancelOrderCoreAsync(
                order,
                previousStatus,
                userId,
                isAdmin ? "Admin" : "User",
                isAdmin
                    ? "Admin hủy đơn hàng."
                    : "User hủy đơn hàng.",
                true,
                dto);
            await transaction.CommitAsync();

            return ServiceResult.Success(new { message = "Đã hủy đơn hàng thành công.", order });
        
}

public async Task<ServiceResult> GetOpenReturnRequestsAsync(
            string? keyword = null,
            string? paymentStatus = null,
            string? paymentMethod = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            decimal? minTotal = null,
            decimal? maxTotal = null,
            int page = 1,
            int pageSize = 20)
{
            page = page <= 0 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

            var (orders, totalCount) = await _orderRepository.SearchAsync(
                null,
                keyword,
                OrderFlowRules.OrderStatusReturnRequested,
                paymentStatus,
                paymentMethod,
                fromDate,
                toDate,
                minTotal,
                maxTotal,
                page,
                pageSize,
                "createdAt",
                "desc");

            var returnRequestItems = new List<object>();
            foreach (var order in orders)
            {
                var latestRequest = await _orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                    order.Id,
                    ActivityReturnRequestOpened);

                returnRequestItems.Add(new
                {
                    order,
                    returnRequestNote = latestRequest?.Description,
                    returnRequestAt = latestRequest?.CreatedAt,
                    returnRequestByUserId = latestRequest?.ActorUserId
                });
            }

            return ServiceResult.Success(new
            {
                items = returnRequestItems,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
}

        public async Task<ServiceResult> RequestReturnOrRefundAsync(string userId, string role, int id, ReturnRequestDto dto)
        {
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }
            
            if (string.IsNullOrEmpty(userId))
            {
                return ServiceResult.Error("Unauthorized");
            }

            if (!string.Equals(order.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ServiceResult.Error("Forbidden");
            }

            var canonicalStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (canonicalStatus != OrderFlowRules.OrderStatusReceived)
            {
                return ServiceResult.Error("Chỉ được yêu cầu hoàn/trả sau khi đã nhận hàng và trước khi đơn hoàn tất.");
            }

            var hasBankTransferSubmission = false;
            if (OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                var latestTransferSubmission = await _orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                    order.Id,
                    ActivityBankTransferSubmitted);
                hasBankTransferSubmission = latestTransferSubmission != null;
            }

            if (!OrderFlowRules.HasMoneyReceivedForRefund(
                    order.PaymentMethod,
                    order.PaymentStatus,
                    hasBankTransferSubmission,
                    order.TotalAmount))
            {
                return ServiceResult.Error("Chi duoc yeu cau hoan/tra khi don da duoc thanh toan.");
            }

            var receivedAt = await GetLatestStatusChangedAtAsync(order.Id, OrderFlowRules.OrderStatusReceived)
                ?? order.CreatedAt;
            if (receivedAt.Add(_returnRequestWindow) < DateTime.Now)
            {
                await CompleteExpiredReceivedOrderAsync(
                    order,
                    canonicalStatus,
                    $"Hệ thống tự hoàn tất đơn vì đã quá hạn yêu cầu hoàn/trả sau {FormatTimeout(_returnRequestWindow)}.");
                return ServiceResult.Error($"Đã quá hạn yêu cầu hoàn/trả sau {FormatTimeout(_returnRequestWindow)} kể từ lúc nhận hàng. Đơn đã được hệ thống tự hoàn tất.");
            }

            var reason = string.IsNullOrWhiteSpace(dto.Reason)
                ? "User yêu cầu hoàn/trả hàng."
                : dto.Reason.Trim();

            var hasAnyRequest = await HasAnyReturnRequestAsync(order.Id);
            if (hasAnyRequest)
            {
                return ServiceResult.Error("This order already has a return/refund request or has already been returned.");
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            order.OrderStatus = OrderFlowRules.OrderStatusReturnRequested;
            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, order.OrderStatus);

            await AddStatusHistoryAsync(
                order.Id,
                canonicalStatus,
                order.OrderStatus,
                "User gửi yêu cầu hoàn/trả hàng.",
                userId,
                "User");
            await AddActivityLogAsync(
                order.Id,
                ActivityReturnRequestOpened,
                "User yêu cầu hoàn/trả",
                reason,
                canonicalStatus,
                order.OrderStatus,
                userId,
                "User");

            await transaction.CommitAsync();           

            return ServiceResult.Success(new
            {
                message = "Đã gửi yêu cầu hoàn/trả. Admin sẽ xem xét yêu cầu của bạn.",
                orderId = order.Id
            });
        
        }

public async Task<ServiceResult> ResolveReturnOrRefundRequestAsync(string userId, string role, int id, ResolveReturnRequestDto dto)
{
            var order = await _orderRepository.GetByIdAsync(id);
            if (order == null)
            {
                return ServiceResult.Error("Order not found");
            }

            var hasOpenRequest = await HasOpenReturnRequestAsync(order.Id);
            if (!hasOpenRequest)
            {
                return ServiceResult.Error("This order has no open return/refund request.");
            }

            var adminUserId = userId;
            var resolveNote = string.IsNullOrWhiteSpace(dto.Note)
                ? "Admin xử lý yêu cầu hoàn/trả."
                : dto.Note.Trim();
            var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
            if (previousStatus != OrderFlowRules.OrderStatusReturnRequested)
            {
                return ServiceResult.Error("Chỉ có thể xử lý yêu cầu hoàn/trả khi đơn đang ở trạng thái ReturnRequested.");
            }

            if (!dto.IsApproved)
            {
                await using var rejectTransaction = await _unitOfWork.BeginTransactionAsync();

                order.OrderStatus = OrderFlowRules.OrderStatusCompleted;
                await _orderRepository.UpdateAsync(order);
                await SyncBillStatusAsync(order.Id, order.OrderStatus);

                await AddStatusHistoryAsync(
                    order.Id,
                    previousStatus,
                    order.OrderStatus,
                    "Admin từ chối yêu cầu hoàn/trả. Đơn được hoàn tất.",
                    adminUserId,
                    "Admin");
                await AddActivityLogAsync(
                    order.Id,
                    ActivityReturnRequestRejected,
                    "Admin từ chối hoàn/trả",
                    resolveNote,
                    previousStatus,
                    order.OrderStatus,
                    adminUserId,
                    "Admin");

                await rejectTransaction.CommitAsync();
                return ServiceResult.Success(new { message = "Đã từ chối yêu cầu hoàn/trả." });
            }

            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            await ReturnOrderCoreAsync(
                order,
                previousStatus,
                adminUserId,
                "Admin",
                resolveNote);

            await transaction.CommitAsync();

            return ServiceResult.Success(new
            {
                message = "Đã duyệt yêu cầu hoàn/trả và chuyển đơn sang trạng thái Returned.",
                order
            });  
}

        private async Task<(bool IsValid, string Message, decimal SubtotalAmount, List<OrderItem> Details)> BuildOrderItemsAsync(List<OrderItemDto> items)
        {
            if (items == null || items.Count == 0)
            {
                return (false, "Cart is empty.", 0, new List<OrderItem>());
            }

            decimal subtotalAmount = 0;
            var details = new List<OrderItem>();

            foreach (var item in items)
            {
                if (item.Quantity <= 0)
                {
                    return (false, "Quantity must be greater than 0.", 0, new List<OrderItem>());
                }

                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product == null)
                {
                    return (false, $"Product {item.ProductId} not found.", 0, new List<OrderItem>());
                }

                if (!product.IsActive)
                {
                    return (false, $"Product {product.Name} is inactive.", 0, new List<OrderItem>());
                }

                var category = await _categoryRepository.GetByIdAsync(product.CategoryId);
                if (category == null || !category.IsActive)
                {
                    return (false, $"Category is inactive for product: {product.Name}", 0, new List<OrderItem>());
                }

                if (product.Stock < item.Quantity)
                {
                    return (false, $"Insufficient stock for product: {product.Name}", 0, new List<OrderItem>());
                }

                subtotalAmount += product.Price * item.Quantity;
                details.Add(new OrderItem
                {
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price
                });
            }

            return (true, string.Empty, subtotalAmount, details);
        }

        private async Task<Bill> CreateBillForOrderAsync(
            Order order,
            List<OrderItem> orderDetails,
            decimal subtotalAmount,
            decimal discountAmount,
            decimal finalAmount)
        {
            var bill = new Bill
            {
                OrderId = order.Id,
                UserId = order.UserId,
                BillCode = GenerateBillCode(order.Id),
                ReceiverName = order.ReceiverName,
                Phone = order.Phone,
                ShippingAddress = order.ShippingAddress,
                                DiscountAmount = discountAmount,
                TotalAmount = finalAmount,
                PaymentMethod = order.PaymentMethod,
                PaymentStatus = order.PaymentStatus,
                BillStatus = order.OrderStatus,
                CreatedAt = DateTime.Now,
                PaidAt = OrderFlowRules.IsPaidPaymentStatus(order.PaymentStatus) ? DateTime.Now : null
            };

            await _billRepository.AddAsync(bill);

            var productIds = orderDetails.Select(detail => detail.ProductId).Distinct().ToList();
            var productNames = await _productRepository.GetNamesByIdsAsync(productIds);

            var billDetails = orderDetails.Select(detail => new BillDetail
            {
                BillId = bill.Id,
                ProductId = detail.ProductId,
                ProductName = productNames.TryGetValue(detail.ProductId, out var productName)
                    ? productName
                    : $"Product #{detail.ProductId}",
                Quantity = detail.Quantity,
                UnitPrice = detail.UnitPrice,
                SubTotal = detail.Quantity * detail.UnitPrice
            });

            await _billRepository.AddDetailsAsync(billDetails);
            return bill;
        }

        private async Task<bool> ShouldStartRefundFlowOnCancellationAsync(Order order, string previousPaymentStatus)
        {
            var hasBankTransferSubmission = false;
            if (previousPaymentStatus == OrderFlowRules.PaymentStatusPending &&
                OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                var latestTransferSubmission = await _orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                    order.Id,
                    ActivityBankTransferSubmitted);
                hasBankTransferSubmission = latestTransferSubmission != null;
            }

            return OrderFlowRules.HasMoneyReceivedForRefund(
                order.PaymentMethod,
                previousPaymentStatus,
                hasBankTransferSubmission,
                order.TotalAmount);
        }

        private async Task CancelOrderCoreAsync(
            Order order,
            string previousStatus,
            string? changedByUserId,
            string changedByRole,
            string note,
            bool startRefundFlowForTransferredBankOrder = true,
            CancelOrderRequestDto? dto = null)
        {
            var details = await _orderItemRepository.GetByOrderAsync(order.Id);
            foreach (var detail in details)
            {
                await _productRepository.IncreaseStockAsync(detail.ProductId, detail.Quantity);
            }

            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            var requiresRefund = startRefundFlowForTransferredBankOrder &&
                await ShouldStartRefundFlowOnCancellationAsync(order, previousPaymentStatus);
            order.OrderStatus = OrderFlowRules.OrderStatusCancelled;
            if (requiresRefund)
            {
                if (dto != null && dto.RefundMethod == "Wallet")
                {
                    // Tự động hoàn tiền vào ví
                    order.PaymentStatus = OrderFlowRules.PaymentStatusRefunded;
                    
                    var wallet = await _walletRepository.GetOrCreateByUserIdAsync(order.UserId);
                    var refundAmount = order.TotalAmount - order.DiscountAmount;
                    if (refundAmount > 0)
                    {
                        wallet.Balance += refundAmount;
                        wallet.UpdatedAt = DateTime.Now;
                        await _walletRepository.UpdateAsync(wallet);

                        var refundTx = new WalletTransaction
                        {
                            WalletId = wallet.Id,
                            Amount = refundAmount,
                            Type = "Refund",
                            ReferenceId = order.Id.ToString(),
                            Description = $"Hoàn tiền hủy đơn hàng #{order.Id} (vào Ví)",
                            Status = "Completed",
                            CreatedAt = DateTime.Now
                        };
                        await _walletRepository.AddTransactionAsync(refundTx);
                    }
                    note += " (Hệ thống đã tự động hoàn tiền vào Ví)";
                }
                else if (dto != null && dto.RefundMethod == "QR")
                {
                    order.PaymentStatus = OrderFlowRules.PaymentStatusRefundPending;
                    note += $" (Khách yêu cầu hoàn tiền qua QR ID: {dto.RefundQrId})";
                }
                else 
                {
                    order.PaymentStatus = OrderFlowRules.PaymentStatusRefundPending;
                }
            }
            else if (OrderFlowRules.IsPendingPaymentStatus(order.PaymentStatus))
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusFailed;
            }

            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, order.OrderStatus);
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);
            await ReverseCouponUsageForCancelledOrderAsync(order);

            // Refund Wallet deduction if any
            var walletTxQuery = await _walletRepository.GetTransactionByReferenceAndTypeAsync(order.Id.ToString(), "Payment", "Completed");
            if (walletTxQuery != null)
            {
                var wallet = await _walletRepository.GetByIdAsync(walletTxQuery.WalletId);
                if (wallet != null)
                {
                    var refundAmount = Math.Abs(walletTxQuery.Amount);
                    wallet.Balance += refundAmount;
                    wallet.UpdatedAt = DateTime.Now;
                    await _walletRepository.UpdateAsync(wallet);

                    // Add refund transaction
                    var refundTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        Amount = refundAmount,
                        Type = "Refund",
                        ReferenceId = order.Id.ToString(),
                        Description = $"Hoàn tiền hủy đơn hàng #{order.Id}",
                        Status = "Completed",
                        CreatedAt = DateTime.Now
                    };
                    await _walletRepository.AddTransactionAsync(refundTx);
                }
            }

            await AddStatusHistoryAsync(
                order.Id,
                previousStatus,
                order.OrderStatus,
                note,
                changedByUserId,
                changedByRole);
            await AddActivityLogAsync(
                order.Id,
                ActivityOrderCancelled,
                "Hủy đơn hàng",
                note,
                previousStatus,
                order.OrderStatus,
                changedByUserId,
                changedByRole);
            if (!string.Equals(previousPaymentStatus, order.PaymentStatus, StringComparison.OrdinalIgnoreCase))
            {
                await AddActivityLogAsync(
                    order.Id,
                    ActivityPaymentStatusChanged,
                    "Cập nhật trạng thái thanh toán",
                    OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, order.PaymentStatus),
                    previousPaymentStatus,
                    order.PaymentStatus,
                    changedByUserId,
                    changedByRole);
            }
        }

        private async Task ReturnOrderCoreAsync(
            Order order,
            string previousStatus,
            string? changedByUserId,
            string changedByRole,
            string note)
        {
            var details = await _orderItemRepository.GetByOrderAsync(order.Id);
            foreach (var detail in details)
            {
                await _productRepository.IncreaseStockAsync(detail.ProductId, detail.Quantity);
            }

            order.OrderStatus = OrderFlowRules.OrderStatusReturned;
            var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (await ShouldStartRefundFlowOnCancellationAsync(order, previousPaymentStatus))
            {
                order.PaymentStatus = OrderFlowRules.PaymentStatusRefundPending;
            }

            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, order.OrderStatus);
            await SyncBillPaymentStatusAsync(order.Id, order.PaymentStatus);
            await ReverseCouponUsageForCancelledOrderAsync(order);

            await AddStatusHistoryAsync(
                order.Id,
                previousStatus,
                order.OrderStatus,
                "Admin duyệt yêu cầu hoàn/trả. Sản phẩm đã được cộng lại vào kho.",
                changedByUserId,
                changedByRole);
            await AddActivityLogAsync(
                order.Id,
                ActivityReturnRequestApproved,
                "Admin duyệt hoàn/trả",
                note,
                previousStatus,
                order.OrderStatus,
                changedByUserId,
                changedByRole);
            if (!string.Equals(previousPaymentStatus, order.PaymentStatus, StringComparison.OrdinalIgnoreCase))
            {
                await AddActivityLogAsync(
                    order.Id,
                    ActivityPaymentStatusChanged,
                    "Cap nhat trang thai thanh toan",
                    OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, order.PaymentStatus),
                    previousPaymentStatus,
                    order.PaymentStatus,
                    changedByUserId,
                    changedByRole);
            }

        }

        private async Task AutoCancelExpiredOrderAsync(
            Order order,
            string previousStatus,
            string note)
        {
            await using var transaction = await _unitOfWork.BeginTransactionAsync();
            await CancelOrderCoreAsync(
                order,
                previousStatus,
                null,
                "System",
                note,
                true,
                null);
            await transaction.CommitAsync();
        }

        private async Task CompleteExpiredReceivedOrderAsync(
            Order order,
            string previousStatus,
            string note)
        {
            await using var transaction = await _unitOfWork.BeginTransactionAsync();

            order.OrderStatus = OrderFlowRules.OrderStatusCompleted;
            await _orderRepository.UpdateAsync(order);
            await SyncBillStatusAsync(order.Id, order.OrderStatus);

            await AddStatusHistoryAsync(
                order.Id,
                previousStatus,
                order.OrderStatus,
                note,
                "system-timeout",
                "System");
            await AddActivityLogAsync(
                order.Id,
                "ReturnWindowClosed",
                "Hết hạn yêu cầu hoàn/trả",
                note,
                previousStatus,
                order.OrderStatus,
                "system-timeout",
                "System");

            await transaction.CommitAsync();
        }

        private async Task AddStatusHistoryAsync(
            int orderId,
            string? previousStatus,
            string newStatus,
            string? note,
            string? changedByUserId,
            string? changedByRole)
        {
            if (!string.IsNullOrWhiteSpace(previousStatus) &&
                string.Equals(previousStatus, newStatus, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var history = new OrderStatusHistory
            {
                OrderId = orderId,
                PreviousStatus = string.IsNullOrWhiteSpace(previousStatus)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(previousStatus, 50),
                NewStatus = OrderFlowRules.TrimToMaxLength(newStatus, 50),
                Note = string.IsNullOrWhiteSpace(note) ? null : OrderFlowRules.TrimToMaxLength(note, 500),
                ChangedByUserId = string.IsNullOrWhiteSpace(changedByUserId)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(changedByUserId, 450),
                ChangedByRole = string.IsNullOrWhiteSpace(changedByRole)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(changedByRole, 50),
                ChangedAt = DateTime.Now
            };

            try
            {
                await _orderStatusHistoryRepository.AddAsync(history);
            }
            catch
            {
            }
        }

        private async Task AddActivityLogAsync(
            int orderId,
            string activityType,
            string title,
            string? description,
            string? fromValue,
            string? toValue,
            string? actorUserId,
            string? actorRole)
        {
            var activityLog = new OrderActivityLog
            {
                OrderId = orderId,
                ActivityType = OrderFlowRules.TrimToMaxLength(activityType, 50),
                Title = OrderFlowRules.TrimToMaxLength(title, 150),
                Description = string.IsNullOrWhiteSpace(description)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(description, 1000),
                FromValue = string.IsNullOrWhiteSpace(fromValue)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(fromValue, 100),
                ToValue = string.IsNullOrWhiteSpace(toValue)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(toValue, 100),
                ActorUserId = string.IsNullOrWhiteSpace(actorUserId)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(actorUserId, 450),
                ActorRole = string.IsNullOrWhiteSpace(actorRole)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(actorRole, 50),
                CreatedAt = DateTime.Now
            };

            try
            {
                await _orderActivityLogRepository.AddAsync(activityLog);
            }
            catch
            {
            }

            try
            {
                var order = await _orderRepository.GetByIdAsync(orderId);
                if (order != null)
                {
                    string logMsg = string.IsNullOrWhiteSpace(description) ? title : description;
                    string messageText = $"Đơn hàng #{orderId}: {logMsg}";

                    // 1. Gửi thông báo cho Admin
                    await _notificationService.CreateAsync(
                        userId: null,
                        title: "Hoạt động đơn hàng mới (Admin)",
                        message: messageText,
                        url: $"/shop/orders",
                        isAdmin: true
                    );

                    // 2. Gửi thông báo cho User (Khách hàng)
                    if (!string.IsNullOrEmpty(order.UserId))
                    {
                        await _notificationService.CreateAsync(
                            userId: order.UserId,
                            title: "Cập nhật đơn hàng",
                            message: messageText,
                            url: $"/shop/orders",
                            isAdmin: false
                        );
                    }
                }
            }
            catch
            {
                // Bỏ qua lỗi để tránh làm gián đoạn luồng chính
            }
        }

        private async Task<List<OrderStatusHistory>> TryGetStatusHistoryAsync(int orderId)
        {
            try
            {
                return await _orderStatusHistoryRepository.GetByOrderAsync(orderId);
            }
            catch
            {
                return new List<OrderStatusHistory>();
            }
        }

        private static List<OrderStatusHistory> BuildFallbackStatusHistory(Order order)
        {
            if (string.IsNullOrWhiteSpace(order.OrderStatus))
            {
                return new List<OrderStatusHistory>();
            }

            return new List<OrderStatusHistory>
            {
                new()
                {
                    Id = 0,
                    OrderId = order.Id,
                    PreviousStatus = null,
                    NewStatus = order.OrderStatus,
                    Note = "Tạo dữ liệu lịch sử ban đầu.",
                    ChangedByUserId = order.UserId,
                    ChangedByRole = "System",
                    ChangedAt = order.CreatedAt
                }
            };
        }

        private async Task<List<OrderActivityLog>> TryGetActivityLogsAsync(int orderId)
        {
            try
            {
                return await _orderActivityLogRepository.GetByOrderAsync(orderId);
            }
            catch
            {
                return new List<OrderActivityLog>();
            }
        }

        private async Task SyncBillStatusAsync(int orderId, string status)
        {
            var bill = await _billRepository.GetByOrderAsync(orderId);
            if (bill == null)
            {
                return;
            }

            bill.BillStatus = OrderFlowRules.TrimToMaxLength(status, 50);
            await _billRepository.UpdateAsync(bill);
        }

        private async Task SyncBillPaymentStatusAsync(int orderId, string paymentStatus)
        {
            var bill = await _billRepository.GetByOrderAsync(orderId);
            if (bill == null)
            {
                return;
            }

            bill.PaymentStatus = OrderFlowRules.TrimToMaxLength(paymentStatus, 50);
            bill.PaidAt = OrderFlowRules.IsPaidPaymentStatus(paymentStatus) ? DateTime.Now : null;
            await _billRepository.UpdateAsync(bill);
        }

        private async Task ReverseCouponUsageForCancelledOrderAsync(Order order)
        {
            if (string.IsNullOrWhiteSpace(order.CouponCode))
            {
                return;
            }

            var coupon = await _couponRepository.GetByCodeAsync(order.CouponCode);
            if (coupon == null)
            {
                return;
            }

            await _couponRepository.DecrementUsageAsync(coupon.Id);
        }

        private static string GenerateBillCode(int orderId)
        {
            return $"BILL-{DateTime.Now:yyyyMMdd}-{orderId:D6}";
        }

        private async Task<bool> HasOpenReturnRequestAsync(int orderId)
        {
            var activityLogs = await TryGetActivityLogsAsync(orderId);
            if (activityLogs.Count == 0)
            {
                return false;
            }

            foreach (var activityLog in activityLogs.OrderByDescending(item => item.CreatedAt))
            {
                if (activityLog.ActivityType is ActivityReturnRequestApproved or ActivityReturnRequestRejected)
                {
                    return false;
                }

                if (activityLog.ActivityType == ActivityReturnRequestOpened)
                {
                    return true;
                }
            }

            return false;
        }

        private async Task<bool> HasAnyReturnRequestAsync(int orderId)
        {
            var activityLogs = await TryGetActivityLogsAsync(orderId);
            return activityLogs.Any(activityLog =>
                activityLog.ActivityType is ActivityReturnRequestOpened
                    or ActivityReturnRequestApproved
                    or ActivityReturnRequestRejected);
        }

        private async Task<DateTime?> GetLatestStatusChangedAtAsync(int orderId, string status)
        {
            var history = await _orderStatusHistoryRepository.GetLatestByOrderAndStatusAsync(orderId, status);
            return history?.ChangedAt;
        }

        private async Task<bool> IsOrderStatusExpiredAsync(Order order, string status, TimeSpan timeout)
        {
            var statusChangedAt = await GetLatestStatusChangedAtAsync(order.Id, status)
                ?? order.CreatedAt;
            return statusChangedAt.Add(timeout) < DateTime.Now;
        }

        private static TimeSpan GetConfiguredTimeout(
            IConfiguration configuration,
            string minutesKey,
            string hoursKey,
            TimeSpan fallback)
        {
            var configuredMinutes = configuration.GetValue<int?>($"OrderFlow:{minutesKey}");
            if (configuredMinutes.HasValue)
            {
                return TimeSpan.FromMinutes(Math.Max(1, configuredMinutes.Value));
            }

            var configuredHours = configuration.GetValue<int?>($"OrderFlow:{hoursKey}");
            if (configuredHours.HasValue)
            {
                return TimeSpan.FromHours(Math.Max(1, configuredHours.Value));
            }

            return fallback;
        }

        private static string FormatTimeout(TimeSpan timeout)
        {
            return OrderFlowRules.FormatDurationVietnamese(timeout);
        }

        private async Task<ServiceResult> GetOrdersInternal(string? userId, OrderQueryDto query)
        {
            var (orders, totalCount) = await _orderRepository.SearchAsync(
                userId,
                query.Keyword,
                query.OrderStatus,
                query.PaymentStatus,
                query.PaymentMethod,
                query.FromDate,
                query.ToDate,
                query.MinTotal,
                query.MaxTotal,
                query.Page,
                query.PageSize,
                query.SortBy,
                query.SortDirection);

            return ServiceResult.Success(new { items = orders, totalCount, page = query.Page, pageSize = query.PageSize, totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize) });
        }
    }
}

