using BaseCore.Entities;
using BaseCore.Services;
using BaseCore.APIService.Controllers;
using BaseCore.Repository.EFCore;
using Microsoft.Extensions.Hosting;

namespace BaseCore.APIService.BackgroundJobs
{
    public class BankTransferTimeoutWorker : BackgroundService
    {
        private const string ActivityBankTransferSubmitted = "BankTransferSubmitted";
        private const int DefaultBankTransferTimeoutMinutes = 15;
        private const int DefaultPendingCodTimeoutHours = 12;
        private const int DefaultPreparingTimeoutHours = 72;
        private const int DefaultShippingTimeoutHours = 168;
        private const int DefaultReturnRequestWindowHours = 168;
        private const int DefaultScanIntervalSeconds = 60;
        private const int DefaultBatchSize = 100;

        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BankTransferTimeoutWorker> _logger;
        private readonly TimeSpan _bankTransferTimeout;
        private readonly TimeSpan _pendingCodTimeout;
        private readonly TimeSpan _preparingTimeout;
        private readonly TimeSpan _shippingTimeout;
        private readonly TimeSpan _returnRequestWindow;
        private readonly TimeSpan _scanInterval;
        private readonly int _batchSize;

        public BankTransferTimeoutWorker(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<BankTransferTimeoutWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            var configuredBankTransferTimeoutMinutes =
                configuration.GetValue<int?>("OrderFlow:BankTransferTimeoutMinutes");
            var configuredBankTransferTimeoutHours =
                configuration.GetValue<int?>("OrderFlow:BankTransferTimeoutHours");
            var configuredPendingCodTimeoutHours =
                configuration.GetValue<int?>("OrderFlow:PendingCodTimeoutHours")
                ?? DefaultPendingCodTimeoutHours;
            var configuredPreparingTimeoutHours =
                configuration.GetValue<int?>("OrderFlow:PreparingTimeoutHours")
                ?? DefaultPreparingTimeoutHours;
            var configuredShippingTimeoutHours =
                configuration.GetValue<int?>("OrderFlow:ShippingTimeoutHours")
                ?? DefaultShippingTimeoutHours;
            var configuredReturnRequestWindowHours =
                configuration.GetValue<int?>("OrderFlow:ReturnRequestWindowHours")
                ?? DefaultReturnRequestWindowHours;
            var configuredScanIntervalSeconds =
                configuration.GetValue<int?>("OrderFlow:TimeoutScanIntervalSeconds")
                ?? DefaultScanIntervalSeconds;
            var configuredBatchSize =
                configuration.GetValue<int?>("OrderFlow:TimeoutBatchSize")
                ?? DefaultBatchSize;

            _bankTransferTimeout = configuredBankTransferTimeoutMinutes.HasValue
                ? TimeSpan.FromMinutes(Math.Max(1, configuredBankTransferTimeoutMinutes.Value))
                : configuredBankTransferTimeoutHours.HasValue
                    ? TimeSpan.FromHours(Math.Max(1, configuredBankTransferTimeoutHours.Value))
                    : TimeSpan.FromMinutes(DefaultBankTransferTimeoutMinutes);
            _pendingCodTimeout = TimeSpan.FromHours(Math.Max(1, configuredPendingCodTimeoutHours));
            _preparingTimeout = TimeSpan.FromHours(Math.Max(1, configuredPreparingTimeoutHours));
            _shippingTimeout = TimeSpan.FromHours(Math.Max(1, configuredShippingTimeoutHours));
            _returnRequestWindow = TimeSpan.FromHours(Math.Max(1, configuredReturnRequestWindowHours));
            _scanInterval = TimeSpan.FromSeconds(Math.Max(10, configuredScanIntervalSeconds));
            _batchSize = Math.Max(1, configuredBatchSize);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "BankTransferTimeoutWorker started. BankTransferTimeout={BankTransferMinutes}m, PendingCodTimeout={PendingCodTimeoutHours}h, PreparingTimeout={PreparingTimeoutHours}h, ShippingTimeout={ShippingTimeoutHours}h, ReturnWindow={ReturnWindowHours}h, Interval={IntervalSeconds}s, BatchSize={BatchSize}",
                _bankTransferTimeout.TotalMinutes,
                _pendingCodTimeout.TotalHours,
                _preparingTimeout.TotalHours,
                _shippingTimeout.TotalHours,
                _returnRequestWindow.TotalHours,
                _scanInterval.TotalSeconds,
                _batchSize);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredOrdersAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    _logger.LogError(exception, "Failed while processing bank transfer timeout orders.");
                }

                try
                {
                    await Task.Delay(_scanInterval, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
            }
        }

        private async Task ProcessExpiredOrdersAsync(CancellationToken cancellationToken)
        {
            await ProcessExpiredBankTransferOrdersAsync(cancellationToken);
            await ProcessExpiredPendingCodOrdersAsync(cancellationToken);
            await ProcessExpiredPreparingOrdersAsync(cancellationToken);
            await ProcessExpiredShippingOrdersAsync(cancellationToken);
            await ProcessReceivedOrdersReadyToCompleteAsync(cancellationToken);
        }

        private async Task ProcessExpiredBankTransferOrdersAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepositoryEF>();

            var expiredBefore = DateTime.Now.Subtract(_bankTransferTimeout);
            var candidates = await orderRepository.GetExpiredWaitingBankTransferOrdersAsync(expiredBefore, _batchSize);
            if (candidates.Count == 0)
            {
                return;
            }

            await AutoCancelExpiredOrdersAsync(
                scope.ServiceProvider,
                candidates,
                (order, _, activityLogRepository) => CanAutoCancelWaitingPaymentOrderAsync(
                    order,
                    activityLogRepository,
                    expiredBefore),
                $"Hệ thống tự hủy đơn chuyển khoản vì user chưa xác nhận đã chuyển khoản trong {FormatTimeout(_bankTransferTimeout)}.",
                "timeout bank transfer order",
                cancellationToken);
        }

        private async Task ProcessExpiredPendingCodOrdersAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepositoryEF>();

            var expiredBefore = DateTime.Now.Subtract(_pendingCodTimeout);
            var candidates = await orderRepository.GetExpiredPendingCashOnDeliveryOrdersAsync(expiredBefore, _batchSize);
            if (candidates.Count == 0)
            {
                return;
            }

            await AutoCancelExpiredOrdersAsync(
                scope.ServiceProvider,
                candidates,
                (order, _, _) => Task.FromResult(CanAutoCancelPendingCashOnDeliveryOrder(order, expiredBefore)),
                $"Hệ thống tự hủy đơn COD vì admin không xác nhận trong {FormatTimeout(_pendingCodTimeout)}.",
                "timeout COD pending order",
                cancellationToken);
        }

        /// <summary>
        /// Auto-cancel đơn COD đã Confirmed nhưng quá ConfirmedCodTimeoutHours
        /// mà shop chưa bắt đầu giao hàng (Shipping).
        /// </summary>
        private async Task ProcessExpiredPreparingOrdersAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepositoryEF>();

            var expiredBefore = DateTime.Now.Subtract(_preparingTimeout);
            var candidates = await orderRepository.GetExpiredPreparingOrdersAsync(expiredBefore, _batchSize);
            if (candidates.Count == 0)
            {
                return;
            }

            await AutoCancelExpiredOrdersAsync(
                scope.ServiceProvider,
                candidates,
                (order, historyRepository, _) => CanAutoCancelStatusByAgeAsync(
                    order,
                    historyRepository,
                    OrderFlowRules.OrderStatusConfirmed,
                    _preparingTimeout),
                $"Hệ thống tự hủy đơn vì admin không chuyển sang giao hàng trong {FormatTimeout(_preparingTimeout)}.",
                "timeout preparing order",
                cancellationToken);
        }

        private async Task ProcessExpiredShippingOrdersAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepositoryEF>();

            var expiredBefore = DateTime.Now.Subtract(_shippingTimeout);
            var candidates = await orderRepository.GetExpiredShippingOrdersAsync(expiredBefore, _batchSize);
            if (candidates.Count == 0)
            {
                return;
            }

            await AutoCancelExpiredOrdersAsync(
                scope.ServiceProvider,
                candidates,
                (order, historyRepository, _) => CanAutoCancelStatusByAgeAsync(
                    order,
                    historyRepository,
                    OrderFlowRules.OrderStatusShipping,
                    _shippingTimeout),
                $"Hệ thống tự hủy đơn vì user không xác nhận đã nhận hàng trong {FormatTimeout(_shippingTimeout)}.",
                "timeout shipping order",
                cancellationToken);
        }

        private async Task ProcessReceivedOrdersReadyToCompleteAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var orderRepository = scope.ServiceProvider.GetRequiredService<IOrderRepositoryEF>();

            var expiredBefore = DateTime.Now.Subtract(_returnRequestWindow);
            var candidates = await orderRepository.GetReceivedOrdersReadyToCompleteAsync(expiredBefore, _batchSize);
            if (candidates.Count == 0)
            {
                return;
            }

            await AutoCompleteReceivedOrdersAsync(
                scope.ServiceProvider,
                candidates,
                cancellationToken);
        }

        private async Task AutoCancelExpiredOrdersAsync(
            IServiceProvider scopedProvider,
            IReadOnlyCollection<Order> candidates,
            Func<Order, IOrderStatusHistoryRepositoryEF, IOrderActivityLogRepositoryEF, Task<bool>> canAutoCancel,
            string statusHistoryNote,
            string logContext,
            CancellationToken cancellationToken)
        {
            var orderRepository = scopedProvider.GetRequiredService<IOrderRepositoryEF>();
            var orderItemRepository = scopedProvider.GetRequiredService<IOrderItemRepositoryEF>();
            var orderStatusHistoryRepository = scopedProvider.GetRequiredService<IOrderStatusHistoryRepositoryEF>();
            var orderActivityLogRepository = scopedProvider.GetRequiredService<IOrderActivityLogRepositoryEF>();
            var productRepository = scopedProvider.GetRequiredService<IProductRepositoryEF>();
            var couponRepository = scopedProvider.GetRequiredService<ICouponRepositoryEF>();
            var billRepository = scopedProvider.GetRequiredService<IBillRepositoryEF>();
            var unitOfWork = scopedProvider.GetRequiredService<IUnitOfWorkEF>();

            foreach (var candidate in candidates)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                await using var transaction = await unitOfWork.BeginTransactionAsync();
                try
                {
                    var order = await orderRepository.GetByIdAsync(candidate.Id);
                    if (order == null || !await canAutoCancel(
                            order,
                            orderStatusHistoryRepository,
                            orderActivityLogRepository))
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        continue;
                    }

                    var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
                    var previousPaymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
                    var requiresRefund = await ShouldStartRefundFlowOnCancellationAsync(
                        order,
                        previousPaymentStatus,
                        orderActivityLogRepository);

                    var details = await orderItemRepository.GetByOrderAsync(order.Id);
                    foreach (var detail in details)
                    {
                        await productRepository.IncreaseStockAsync(detail.ProductId, detail.Quantity);
                    }

                    order.OrderStatus = OrderFlowRules.OrderStatusCancelled;
                    if (requiresRefund)
                    {
                        order.PaymentStatus = OrderFlowRules.PaymentStatusRefundPending;
                    }
                    else if (IsPendingOrUnpaid(order.PaymentStatus))
                    {
                        order.PaymentStatus = OrderFlowRules.PaymentStatusFailed;
                    }

                    await orderRepository.UpdateAsync(order);
                    await SyncBillStatusAsync(billRepository, order.Id, order.OrderStatus);
                    await SyncBillPaymentStatusAsync(billRepository, order.Id, order.PaymentStatus);
                    await ReverseCouponUsageAsync(couponRepository, order);
                    await AddStatusHistoryAsync(
                        orderStatusHistoryRepository,
                        order.Id,
                        previousStatus,
                        order.OrderStatus,
                        statusHistoryNote,
                        "system-timeout",
                        "System");
                    await AddActivityLogAsync(
                        orderActivityLogRepository,
                        order.Id,
                        "OrderCancelled",
                        "Hệ thống tự hủy đơn",
                        statusHistoryNote,
                        previousStatus,
                        order.OrderStatus,
                        "system-timeout",
                        "System");
                    if (!string.Equals(previousPaymentStatus, order.PaymentStatus, StringComparison.OrdinalIgnoreCase))
                    {
                        await AddActivityLogAsync(
                            orderActivityLogRepository,
                            order.Id,
                            "PaymentStatusChanged",
                            "Cập nhật trạng thái thanh toán",
                            OrderFlowRules.FormatPaymentStatusChange(previousPaymentStatus, order.PaymentStatus),
                            previousPaymentStatus,
                            order.PaymentStatus,
                            "system-timeout",
                            "System");
                    }

                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Auto-cancelled {LogContext} #{OrderId}.",
                        logContext,
                        order.Id);
                }
                catch (Exception exception)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    _logger.LogError(
                        exception,
                        "Failed to auto-cancel {LogContext} #{OrderId}.",
                        logContext,
                        candidate.Id);
                }
            }
        }

        private async Task AutoCompleteReceivedOrdersAsync(
            IServiceProvider scopedProvider,
            IReadOnlyCollection<Order> candidates,
            CancellationToken cancellationToken)
        {
            var orderRepository = scopedProvider.GetRequiredService<IOrderRepositoryEF>();
            var orderStatusHistoryRepository = scopedProvider.GetRequiredService<IOrderStatusHistoryRepositoryEF>();
            var orderActivityLogRepository = scopedProvider.GetRequiredService<IOrderActivityLogRepositoryEF>();
            var billRepository = scopedProvider.GetRequiredService<IBillRepositoryEF>();
            var unitOfWork = scopedProvider.GetRequiredService<IUnitOfWorkEF>();

            foreach (var candidate in candidates)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                await using var transaction = await unitOfWork.BeginTransactionAsync();
                try
                {
                    var order = await orderRepository.GetByIdAsync(candidate.Id);
                    if (order == null ||
                        OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus) != OrderFlowRules.OrderStatusReceived ||
                        !await IsStatusOlderThanAsync(
                            order,
                            orderStatusHistoryRepository,
                            OrderFlowRules.OrderStatusReceived,
                            _returnRequestWindow))
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        continue;
                    }

                    var previousStatus = OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus);
                    order.OrderStatus = OrderFlowRules.OrderStatusCompleted;

                    await orderRepository.UpdateAsync(order);
                    await SyncBillStatusAsync(billRepository, order.Id, order.OrderStatus);
                    await AddStatusHistoryAsync(
                        orderStatusHistoryRepository,
                        order.Id,
                        previousStatus,
                        order.OrderStatus,
                        $"Hệ thống tự hoàn tất đơn vì đã quá hạn yêu cầu hoàn/trả sau {FormatTimeout(_returnRequestWindow)}.",
                        "system-timeout",
                        "System");
                    await AddActivityLogAsync(
                        orderActivityLogRepository,
                        order.Id,
                        "ReturnWindowClosed",
                        "Hết hạn yêu cầu hoàn/trả",
                        $"Đơn đã quá hạn yêu cầu hoàn/trả sau {FormatTimeout(_returnRequestWindow)} và được hệ thống hoàn tất.",
                        previousStatus,
                        order.OrderStatus,
                        "system-timeout",
                        "System");

                    await transaction.CommitAsync(cancellationToken);

                    _logger.LogInformation(
                        "Auto-completed received order #{OrderId}.",
                        order.Id);
                }
                catch (Exception exception)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    _logger.LogError(
                        exception,
                        "Failed to auto-complete received order #{OrderId}.",
                        candidate.Id);
                }
            }
        }

        private static async Task<bool> CanAutoCancelWaitingPaymentOrderAsync(
            Order order,
            IOrderActivityLogRepositoryEF orderActivityLogRepository,
            DateTime expiredBefore)
        {
            if (!OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                return false;
            }

            if (OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus) != OrderFlowRules.OrderStatusWaitingPayment)
            {
                return false;
            }

            var paymentStatus = OrderFlowRules.CanonicalizePaymentStatus(order.PaymentStatus);
            if (paymentStatus != OrderFlowRules.PaymentStatusUnpaid &&
                paymentStatus != OrderFlowRules.PaymentStatusPending)
            {
                return false;
            }

            if (paymentStatus == OrderFlowRules.PaymentStatusPending)
            {
                var latestTransferSubmission = await orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
                    order.Id,
                    ActivityBankTransferSubmitted);
                if (latestTransferSubmission != null)
                {
                    return false;
                }
            }

            return order.CreatedAt <= expiredBefore;
        }

        private static bool CanAutoCancelPendingCashOnDeliveryOrder(Order order, DateTime expiredBefore)
        {
            if (!OrderFlowRules.IsCashOnDelivery(order.PaymentMethod))
            {
                return false;
            }

            if (OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus) != OrderFlowRules.OrderStatusPending)
            {
                return false;
            }

            if (!IsPendingOrUnpaid(order.PaymentStatus))
            {
                return false;
            }

            return order.CreatedAt <= expiredBefore;
        }

        private static async Task<bool> CanAutoCancelStatusByAgeAsync(
            Order order,
            IOrderStatusHistoryRepositoryEF orderStatusHistoryRepository,
            string expectedStatus,
            TimeSpan timeout)
        {
            if (!OrderFlowRules.IsKnownOrderStatus(OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus)))
            {
                return false;
            }

            if (OrderFlowRules.CanonicalizeOrderStatus(order.OrderStatus) != expectedStatus)
            {
                return false;
            }

            return await IsStatusOlderThanAsync(order, orderStatusHistoryRepository, expectedStatus, timeout);
        }

        private static async Task<bool> IsStatusOlderThanAsync(
            Order order,
            IOrderStatusHistoryRepositoryEF orderStatusHistoryRepository,
            string status,
            TimeSpan timeout)
        {
            var statusHistory = await orderStatusHistoryRepository.GetLatestByOrderAndStatusAsync(order.Id, status);
            var statusStartedAt = statusHistory?.ChangedAt ?? order.CreatedAt;
            return statusStartedAt <= DateTime.Now.Subtract(timeout);
        }

        private static bool IsPendingOrUnpaid(string paymentStatus)
        {
            return OrderFlowRules.IsPendingPaymentStatus(paymentStatus);
        }

        private static async Task<bool> ShouldStartRefundFlowOnCancellationAsync(
            Order order,
            string previousPaymentStatus,
            IOrderActivityLogRepositoryEF orderActivityLogRepository)
        {
            var hasBankTransferSubmission = false;
            if (previousPaymentStatus == OrderFlowRules.PaymentStatusPending &&
                OrderFlowRules.IsBankTransfer(order.PaymentMethod))
            {
                var latestTransferSubmission = await orderActivityLogRepository.GetLatestByOrderAndTypeAsync(
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

        private static string FormatTimeout(TimeSpan timeout)
        {
            return OrderFlowRules.FormatDurationVietnamese(timeout);
        }

        private static async Task SyncBillStatusAsync(
            IBillRepositoryEF billRepository,
            int orderId,
            string orderStatus)
        {
            var bill = await billRepository.GetByOrderAsync(orderId);
            if (bill == null)
            {
                return;
            }

            bill.BillStatus = OrderFlowRules.TrimToMaxLength(orderStatus, 50);
            await billRepository.UpdateAsync(bill);
        }

        private static async Task SyncBillPaymentStatusAsync(
            IBillRepositoryEF billRepository,
            int orderId,
            string paymentStatus)
        {
            var bill = await billRepository.GetByOrderAsync(orderId);
            if (bill == null)
            {
                return;
            }

            bill.PaymentStatus = OrderFlowRules.TrimToMaxLength(paymentStatus, 50);
            bill.PaidAt = OrderFlowRules.IsPaidPaymentStatus(paymentStatus) ? DateTime.Now : null;
            await billRepository.UpdateAsync(bill);
        }

        private static async Task ReverseCouponUsageAsync(
            ICouponRepositoryEF couponRepository,
            Order order)
        {
            if (string.IsNullOrWhiteSpace(order.CouponCode))
            {
                return;
            }

            var coupon = await couponRepository.GetByCodeAsync(order.CouponCode);
            if (coupon == null)
            {
                return;
            }

            await couponRepository.DecrementUsageAsync(coupon.Id);
        }

        private static async Task AddStatusHistoryAsync(
            IOrderStatusHistoryRepositoryEF orderStatusHistoryRepository,
            int orderId,
            string? previousStatus,
            string newStatus,
            string note,
            string changedByUserId,
            string changedByRole)
        {
            var history = new OrderStatusHistory
            {
                OrderId = orderId,
                PreviousStatus = string.IsNullOrWhiteSpace(previousStatus)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(previousStatus, 50),
                NewStatus = OrderFlowRules.TrimToMaxLength(newStatus, 50),
                Note = OrderFlowRules.TrimToMaxLength(note, 500),
                ChangedByUserId = OrderFlowRules.TrimToMaxLength(changedByUserId, 450),
                ChangedByRole = OrderFlowRules.TrimToMaxLength(changedByRole, 50),
                ChangedAt = DateTime.Now
            };

            await orderStatusHistoryRepository.AddAsync(history);
        }

        private static async Task AddActivityLogAsync(
            IOrderActivityLogRepositoryEF orderActivityLogRepository,
            int orderId,
            string activityType,
            string title,
            string description,
            string? fromValue,
            string toValue,
            string actorUserId,
            string actorRole)
        {
            var activityLog = new OrderActivityLog
            {
                OrderId = orderId,
                ActivityType = OrderFlowRules.TrimToMaxLength(activityType, 50),
                Title = OrderFlowRules.TrimToMaxLength(title, 150),
                Description = OrderFlowRules.TrimToMaxLength(description, 1000),
                FromValue = string.IsNullOrWhiteSpace(fromValue)
                    ? null
                    : OrderFlowRules.TrimToMaxLength(fromValue, 100),
                ToValue = OrderFlowRules.TrimToMaxLength(toValue, 100),
                ActorUserId = OrderFlowRules.TrimToMaxLength(actorUserId, 450),
                ActorRole = OrderFlowRules.TrimToMaxLength(actorRole, 50),
                CreatedAt = DateTime.Now
            };

            await orderActivityLogRepository.AddAsync(activityLog);
        }
    }
}


