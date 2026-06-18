import { mapApiList, normalizeProduct } from "./shopDataUtils";

export const ORDER_STATUS = {
  WAITING_PAYMENT: "WaitingPayment",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPING: "Shipping",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "ReturnRequested",
  RETURNED: "Returned",
};

export const ORDER_ACTIVITY_TYPE = {
  ORDER_CREATED: "OrderCreated",
  ORDER_STATUS_CHANGED: "OrderStatusChanged",
  PAYMENT_STATUS_CHANGED: "PaymentStatusChanged",
  ORDER_CANCELLED: "OrderCancelled",
  BANK_TRANSFER_SUBMITTED: "BankTransferSubmitted",
  REFUND_TRANSFER_SUBMITTED: "RefundTransferSubmitted",
  REFUND_RECEIVED_CONFIRMED: "RefundReceivedConfirmed",
  RETURN_REQUEST_OPENED: "ReturnRequestOpened",
  RETURN_REQUEST_APPROVED: "ReturnRequestApproved",
  RETURN_REQUEST_REJECTED: "ReturnRequestRejected",
};

export const PAYMENT_STATUS = {
  UNPAID: "Unpaid",
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "RefundPending",
  REFUND_TRANSFERRED: "RefundTransferred",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD = {
  COD: "COD",
  BANK_TRANSFER: "Bank Transfer",
};

export const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.RECEIVED, label: "Đã nhận hàng" },
  { value: ORDER_STATUS.WAITING_PAYMENT, label: "Chờ thanh toán" },
  { value: ORDER_STATUS.PENDING, label: "Chờ xác nhận" },
  { value: ORDER_STATUS.CONFIRMED, label: "Chờ giao hàng" },
  { value: ORDER_STATUS.SHIPPING, label: "Đang giao hàng" },
  { value: ORDER_STATUS.COMPLETED, label: "Hoàn thành" },
  { value: ORDER_STATUS.CANCELLED, label: "Đã hủy" },
  { value: ORDER_STATUS.RETURN_REQUESTED, label: "Yêu cầu hoàn/trả" },
  { value: ORDER_STATUS.RETURNED, label: "Đã hoàn/trả" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: PAYMENT_STATUS.UNPAID, label: "Chưa thanh toán" },
  { value: PAYMENT_STATUS.PENDING, label: "Chờ admin xác nhận thanh toán" },
  { value: PAYMENT_STATUS.PAID, label: "Đã thanh toán" },
  { value: PAYMENT_STATUS.FAILED, label: "Thanh toán thất bại" },
  { value: PAYMENT_STATUS.REFUND_PENDING, label: "Chờ admin hoàn tiền" },
  {
    value: PAYMENT_STATUS.REFUND_TRANSFERRED,
    label: "Admin đã chuyển hoàn tiền, chờ user xác nhận",
  },
  { value: PAYMENT_STATUS.REFUNDED, label: "Đã hoàn tiền" },
];

export const PAYMENT_METHOD_OPTIONS = [
  PAYMENT_METHOD.COD,
  PAYMENT_METHOD.BANK_TRANSFER,
];

export const CANCELLABLE_ORDER_STATUSES = [
  ORDER_STATUS.WAITING_PAYMENT,
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
];

export const REFUND_FLOW_ORDER_STATUSES = [
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.RETURNED,
];

export const RETURN_REQUEST_ORDER_STATUSES = [ORDER_STATUS.RECEIVED];

export const REFUND_PAYMENT_STATUSES = [
  PAYMENT_STATUS.REFUND_PENDING,
  PAYMENT_STATUS.REFUND_TRANSFERRED,
  PAYMENT_STATUS.REFUNDED,
];

export const MONEY_RECEIVED_PAYMENT_STATUSES = [
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.REFUND_PENDING,
  PAYMENT_STATUS.REFUND_TRANSFERRED,
  PAYMENT_STATUS.REFUNDED,
];

const normalizeStatusText = (status) =>
  (status || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

const findOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value || "-";

const normalizeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const normalizeOrderStatus = (status) => {
  const normalized = normalizeStatusText(status);
  if (
    [
      "waitingpayment",
      "waiting payment",
      "cho thanh toan",
      "cho xac nhan thanh toan",
    ].includes(normalized)
  ) {
    return ORDER_STATUS.WAITING_PAYMENT;
  }
  if (["pending", "cho xac nhan"].includes(normalized)) {
    return ORDER_STATUS.PENDING;
  }
  if (
    [
      "confirmed",
      "processing",
      "readytoship",
      "ready to ship",
      "da xac nhan",
      "dang xu ly",
      "cho giao hang",
    ].includes(normalized)
  ) {
    return ORDER_STATUS.CONFIRMED;
  }
  if (
    ["shipping", "shipped", "dang giao", "dang giao hang"].includes(normalized)
  ) {
    return ORDER_STATUS.SHIPPING;
  }
  if (["received", "da nhan", "da nhan hang"].includes(normalized)) {
    return ORDER_STATUS.RECEIVED;
  }
  if (
    ["completed", "delivered", "da giao", "hoan tat", "hoan thanh"].includes(
      normalized,
    )
  ) {
    return ORDER_STATUS.COMPLETED;
  }
  if (["cancelled", "canceled", "da huy"].includes(normalized)) {
    return ORDER_STATUS.CANCELLED;
  }
  if (
    ["returnrequested", "return requested", "yeu cau hoan tra"].includes(
      normalized,
    )
  ) {
    return ORDER_STATUS.RETURN_REQUESTED;
  }
  if (
    ["returned", "return completed", "da hoan tra", "da tra hang"].includes(
      normalized,
    )
  ) {
    return ORDER_STATUS.RETURNED;
  }
  return status || "";
};

export const normalizePaymentStatus = (status) => {
  const normalized = normalizeStatusText(status);
  if (["unpaid", "chua thanh toan"].includes(normalized)) {
    return PAYMENT_STATUS.UNPAID;
  }
  if (["pending", "dang cho", "cho thanh toan"].includes(normalized)) {
    return PAYMENT_STATUS.PENDING;
  }
  if (["paid", "da thanh toan"].includes(normalized)) {
    return PAYMENT_STATUS.PAID;
  }
  if (["failed", "that bai", "thanh toan loi"].includes(normalized)) {
    return PAYMENT_STATUS.FAILED;
  }
  if (
    [
      "refundpending",
      "refund pending",
      "cho hoan tien",
      "cho admin hoan tien",
    ].includes(normalized)
  ) {
    return PAYMENT_STATUS.REFUND_PENDING;
  }
  if (
    [
      "refundtransferred",
      "refund transferred",
      "da chuyen hoan tien",
      "cho user xac nhan hoan tien",
    ].includes(normalized)
  ) {
    return PAYMENT_STATUS.REFUND_TRANSFERRED;
  }
  if (["refunded", "da hoan tien"].includes(normalized)) {
    return PAYMENT_STATUS.REFUNDED;
  }
  if (["expired", "het han"].includes(normalized)) {
    return PAYMENT_STATUS.FAILED;
  }
  return status || "";
};

const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.WAITING_PAYMENT]: "Chờ thanh toán",
  [ORDER_STATUS.PENDING]: "Chờ admin xác nhận",
  [ORDER_STATUS.CONFIRMED]: "Đang chuẩn bị hàng",
  [ORDER_STATUS.SHIPPING]: "Đang giao hàng",
  [ORDER_STATUS.RECEIVED]: "Đã nhận hàng",
  [ORDER_STATUS.COMPLETED]: "Hoàn tất",
  [ORDER_STATUS.CANCELLED]: "Đã hủy",
  [ORDER_STATUS.RETURN_REQUESTED]: "Đang yêu cầu hoàn/trả",
  [ORDER_STATUS.RETURNED]: "Đã hoàn/trả hàng",
};

const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.UNPAID]: "Chưa thanh toán",
  [PAYMENT_STATUS.PENDING]: "Chờ admin xác nhận thanh toán",
  [PAYMENT_STATUS.PAID]: "Đã thanh toán",
  [PAYMENT_STATUS.FAILED]: "Thanh toán thất bại",
  [PAYMENT_STATUS.REFUND_PENDING]: "Chờ admin hoàn tiền",
  [PAYMENT_STATUS.REFUND_TRANSFERRED]: "Admin đã chuyển hoàn tiền, chờ user xác nhận",
  [PAYMENT_STATUS.REFUNDED]: "Đã hoàn tiền",
};

export const formatOrderStatus = (status) => {
  const canonicalStatus = normalizeOrderStatus(status);
  return (
    ORDER_STATUS_LABELS[canonicalStatus] ||
    findOptionLabel(ORDER_STATUS_OPTIONS, canonicalStatus)
  );
};

export const formatPaymentStatus = (status) => {
  const canonicalStatus = normalizePaymentStatus(status);
  return (
    PAYMENT_STATUS_LABELS[canonicalStatus] ||
    findOptionLabel(PAYMENT_STATUS_OPTIONS, canonicalStatus)
  );
};

export const formatActivityTitle = (activityLog = {}) => {
  const fallbackTitle = activityLog.title || activityLog.activityType || "-";
  const titleMap = {
    "Order created": "Tạo đơn hàng",
    "Order status changed": "Cập nhật trạng thái đơn hàng",
    "Payment status changed": "Cập nhật trạng thái thanh toán",
    "Order cancelled": "Hủy đơn hàng",
    "Order cancelled by system": "Hệ thống tự hủy đơn",
    "Bank transfer submitted": "User xác nhận chuyển khoản",
    "Return/refund requested": "User yêu cầu hoàn/trả",
    "Return/refund request approved": "Admin duyệt hoàn/trả",
    "Return/refund request rejected": "Admin từ chối hoàn/trả",
    "Return window closed": "Hết hạn yêu cầu hoàn/trả",
  };

  if (titleMap[fallbackTitle]) {
    return titleMap[fallbackTitle];
  }

  switch (activityLog.activityType) {
    case ORDER_ACTIVITY_TYPE.ORDER_CREATED:
      return "Tạo đơn hàng";
    case ORDER_ACTIVITY_TYPE.ORDER_STATUS_CHANGED:
      return "Cập nhật trạng thái đơn hàng";
    case ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED:
      return "Cập nhật trạng thái thanh toán";
    case ORDER_ACTIVITY_TYPE.ORDER_CANCELLED:
      return "Hủy đơn hàng";
    case ORDER_ACTIVITY_TYPE.BANK_TRANSFER_SUBMITTED:
      return "User xác nhận chuyển khoản";
    case ORDER_ACTIVITY_TYPE.REFUND_TRANSFER_SUBMITTED:
      return "Admin đã chuyển hoàn tiền";
    case ORDER_ACTIVITY_TYPE.REFUND_RECEIVED_CONFIRMED:
      return "User xác nhận đã nhận hoàn tiền";
    case ORDER_ACTIVITY_TYPE.RETURN_REQUEST_OPENED:
      return "User yêu cầu hoàn/trả";
    case ORDER_ACTIVITY_TYPE.RETURN_REQUEST_APPROVED:
      return "Admin duyệt hoàn/trả";
    case ORDER_ACTIVITY_TYPE.RETURN_REQUEST_REJECTED:
      return "Admin từ chối hoàn/trả";
    default:
      return fallbackTitle;
  }
};

export const formatActivityValue = (activityLog = {}, value) => {
  if (!value) {
    return "";
  }

  return activityLog.activityType === ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED
    ? formatPaymentStatus(value)
    : formatOrderStatus(value);
};

export const formatActivityTransition = (activityLog = {}) => {
  const values = [activityLog.fromValue, activityLog.toValue]
    .filter(Boolean)
    .map((value) => formatActivityValue(activityLog, value));

  return values.join(" → ");
};

export const formatHistoryNote = (note) => {
  if (!note) {
    return "-";
  }

  const trimmed = note.trim();
  const exactMap = {
    "Order created": "Đơn hàng được tạo.",
    "Customer confirmed transfer completed.": "User xác nhận đã chuyển khoản.",
    "User confirmed order received": "User xác nhận đã nhận hàng.",
    "Customer confirmed the order was received.":
      "User xác nhận đã nhận được hàng.",
    "Customer requested return/refund.": "User gửi yêu cầu hoàn/trả hàng.",
    "Admin rejected return/refund request.": "Admin từ chối yêu cầu hoàn/trả.",
    "Admin approved return/refund request.": "Admin duyệt yêu cầu hoàn/trả.",
    "System completed received order after return window expired.":
      "Hệ thống tự hoàn tất đơn vì đã quá hạn yêu cầu hoàn/trả.",
  };

  if (exactMap[trimmed]) {
    return exactMap[trimmed];
  }

  const paymentMatch = trimmed.match(
    /^Payment status changed:\s*(.+?)\s*->\s*(.+)$/i,
  );
  if (paymentMatch) {
    return (
      formatPaymentStatus(paymentMatch[1]) +
      " → " +
      formatPaymentStatus(paymentMatch[2])
    );
  }

  return trimmed;
};

export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
};

export const isBankTransferMethod = (paymentMethod) => {
  const normalized = (paymentMethod || "").trim().toLowerCase();
  return ["bank transfer", "banking", "transfer"].includes(normalized);
};

export const isCashOnDeliveryMethod = (paymentMethod) =>
  (paymentMethod || "").trim().toLowerCase() === "cod";

export const isRefundFlowOrderStatus = (status) =>
  REFUND_FLOW_ORDER_STATUSES.includes(normalizeOrderStatus(status));

export const hasSettledPaymentForReturn = (order) => {
  if (!order || normalizeNumber(order.totalAmount, 0) <= 0) {
    return false;
  }

  return MONEY_RECEIVED_PAYMENT_STATUSES.includes(
    normalizePaymentStatus(order.paymentStatus),
  );
};

export const hasMoneyReceivedForRefund = (
  order,
  hasBankTransferSubmission = false,
) => {
  if (!order || normalizeNumber(order.totalAmount, 0) <= 0) {
    return false;
  }

  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  if (MONEY_RECEIVED_PAYMENT_STATUSES.includes(paymentStatus)) {
    return true;
  }

  return (
    isBankTransferMethod(order.paymentMethod) &&
    paymentStatus === PAYMENT_STATUS.PENDING &&
    Boolean(hasBankTransferSubmission)
  );
};

export const willCreateRefundAfterCancel = (
  order,
  hasBankTransferSubmission = false,
) => hasMoneyReceivedForRefund(order, hasBankTransferSubmission);

/**
 * User chỉ có thể tự hủy đơn khi chưa vào giao hàng.
 * Khi đơn đang Shipping hoặc Completed phải dùng Return Request.
 */
export const canCancelOrderStatus = (status) => {
  const normalizedStatus = normalizeOrderStatus(status);
  return CANCELLABLE_ORDER_STATUSES.includes(normalizedStatus);
};

/**
 * User có thể yêu cầu hoàn/trả khi đơn đã Completed.
 * (Khi Shipping, user nên dùng cách 'Từ chối nhận hàng' thay vì hoàn/trả)
 */
export const canRequestReturn = (status) => {
  const normalizedStatus = normalizeOrderStatus(
    typeof status === "object" ? status?.orderStatus : status,
  );
  if (!RETURN_REQUEST_ORDER_STATUSES.includes(normalizedStatus)) {
    return false;
  }

  if (typeof status === "object") {
    // Nếu paymentStatus đã ở trong flow hoàn tiền → không cho yêu cầu hoàn trả nữa
    const paymentStatus = normalizePaymentStatus(status?.paymentStatus);
    if (REFUND_PAYMENT_STATUSES.includes(paymentStatus)) {
      return false;
    }
    return hasSettledPaymentForReturn(status);
  }

  return true;
};

export const canReceiveOrderStatus = (status) =>
  normalizeOrderStatus(status) === ORDER_STATUS.SHIPPING;

export const getCancelButtonLabel = (status) =>
  normalizeOrderStatus(status) === ORDER_STATUS.SHIPPING
    ? "Giao thất bại"
    : "Huỷ đơn";

export const canOpenBankTransfer = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    isBankTransferMethod(order?.paymentMethod) &&
    orderStatus === ORDER_STATUS.WAITING_PAYMENT &&
    [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PENDING].includes(paymentStatus)
  );
};

export const canQuickConfirmTransfer = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    isBankTransferMethod(order?.paymentMethod) &&
    orderStatus === ORDER_STATUS.WAITING_PAYMENT &&
    [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PENDING].includes(paymentStatus)
  );
};

export const canAdminSubmitRefundTransfer = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    isRefundFlowOrderStatus(orderStatus) &&
    paymentStatus === PAYMENT_STATUS.REFUND_PENDING
  );
};

export const canUserConfirmRefundReceived = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    isRefundFlowOrderStatus(orderStatus) &&
    paymentStatus === PAYMENT_STATUS.REFUND_TRANSFERRED
  );
};

export const isWaitingAdminRefundTransfer = (order) => {
  const orderStatus = normalizeOrderStatus(order?.orderStatus);
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);

  return (
    isRefundFlowOrderStatus(orderStatus) &&
    paymentStatus === PAYMENT_STATUS.REFUND_PENDING
  );
};

export const findLatestBankTransferSubmission = (activityLogs = []) => {
  const sorted = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  return (
    sorted.find(
      (activityLog) =>
        activityLog.activityType ===
        ORDER_ACTIVITY_TYPE.BANK_TRANSFER_SUBMITTED,
    ) || null
  );
};

/**
 * Actions admin có thể làm trên một đơn theo trạng thái.
 * - Shipping: KHÔNG cho cancel trực tiếp, chỉ quản lý qua Return Request.
 */
export const getAdminOrderStatusActions = (order) => {
  const status = normalizeOrderStatus(order?.orderStatus);
  const isPickup = order?.deliveryMethod === "Pickup";

  switch (status) {
    case ORDER_STATUS.WAITING_PAYMENT:
      return [{ value: ORDER_STATUS.CANCELLED, label: "Hủy đơn" }];
    case ORDER_STATUS.PENDING:
      return [
        { value: ORDER_STATUS.CONFIRMED, label: "Đồng ý chuẩn bị" },
        { value: ORDER_STATUS.CANCELLED, label: "Hủy đơn" },
      ];
    case ORDER_STATUS.CONFIRMED:
      if (isPickup) {
        return [
          { value: ORDER_STATUS.RECEIVED, label: "Khách đã đến lấy" },
          { value: ORDER_STATUS.CANCELLED, label: "Hủy đơn" },
        ];
      }
      return [
        { value: ORDER_STATUS.SHIPPING, label: "Bắt đầu giao hàng" },
        { value: ORDER_STATUS.CANCELLED, label: "Hủy đơn" },
      ];
    case ORDER_STATUS.SHIPPING:
      // Không cho cancel trực tiếp. Admin xử lý qua tab Return Requests.
      return [];
    default:
      return [];
  }
};

export const hasOpenReturnRequest = (statusHistory = [], activityLogs = []) => {
  const sortedActivities = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  for (const activityLog of sortedActivities) {
    if (
      activityLog.activityType ===
        ORDER_ACTIVITY_TYPE.RETURN_REQUEST_APPROVED ||
      activityLog.activityType === ORDER_ACTIVITY_TYPE.RETURN_REQUEST_REJECTED
    ) {
      return false;
    }
    if (
      activityLog.activityType === ORDER_ACTIVITY_TYPE.RETURN_REQUEST_OPENED
    ) {
      return true;
    }
  }

  const sortedStatusHistory = [...statusHistory].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
  );
  for (const history of sortedStatusHistory) {
    const note = (history.note || "").trim();
    if (note.startsWith("[ReturnRequest][Resolved]")) return false;
    if (note.startsWith("[ReturnRequest][Open]")) return true;
  }
  return false;
};

export const getReturnRequestReason = (
  statusHistory = [],
  activityLogs = [],
) => {
  const sortedActivities = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  for (const activityLog of sortedActivities) {
    if (
      activityLog.activityType === ORDER_ACTIVITY_TYPE.RETURN_REQUEST_OPENED
    ) {
      return activityLog.description || "";
    }
  }

  const sortedStatusHistory = [...statusHistory].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
  );
  for (const history of sortedStatusHistory) {
    const note = (history.note || "").trim();
    if (note.startsWith("[ReturnRequest][Open]")) {
      return note.replace("[ReturnRequest][Open]", "").trim();
    }
  }
  return "";
};

export const getAdminPaymentStatusActions = (order) => {
  const currentPaymentStatus = normalizePaymentStatus(order?.paymentStatus);
  const currentOrderStatus = normalizeOrderStatus(order?.orderStatus);

  if (isRefundFlowOrderStatus(currentOrderStatus)) {
    return [];
  }

  if (
    isCashOnDeliveryMethod(order?.paymentMethod) &&
    currentPaymentStatus !== PAYMENT_STATUS.PAID
  ) {
    return [];
  }

  if (
    isBankTransferMethod(order?.paymentMethod) &&
    currentPaymentStatus === PAYMENT_STATUS.UNPAID
  ) {
    return [];
  }

  switch (currentPaymentStatus) {
    case PAYMENT_STATUS.UNPAID:
    case PAYMENT_STATUS.PENDING:
      return [
        {
          value: PAYMENT_STATUS.PAID,
          label: isBankTransferMethod(order?.paymentMethod)
            ? "Xác nhận chuyển khoản"
            : "Đã thanh toán",
        },
        { value: PAYMENT_STATUS.FAILED, label: "Thanh toán lỗi" },
      ];
    default:
      return [];
  }
};

export const normalizeOrder = (item) => ({
  id: normalizeNumber(item?.id ?? item?.orderId, 0),
  userId: item?.userId ?? "",
  receiverName: item?.receiverName ?? "",
  phone: item?.phone ?? "",
  shippingAddress: item?.shippingAddress ?? "",
  note: item?.note ?? "",
  totalAmount: normalizeNumber(item?.totalAmount, 0),
  discountAmount: normalizeNumber(item?.discountAmount, 0),
  couponCode: item?.couponCode ?? "",
  paymentMethod: item?.paymentMethod ?? "",
  paymentStatus: item?.paymentStatus ?? "",
  orderStatus: item?.orderStatus ?? "",
  createdAt: item?.createdAt ?? "",
  deliveryMethod: item?.deliveryMethod ?? "Delivery",
  pickupTime: item?.pickupTime ?? null,
});

export const normalizeOrderDetail = (item) => {
  const product = normalizeProduct(item?.product ?? {});
  const quantity = normalizeNumber(item?.quantity, 0);
  const unitPrice = normalizeNumber(item?.unitPrice, 0);

  return {
    id: normalizeNumber(item?.id ?? item?.orderItemId, 0),
    productId: normalizeNumber(item?.productId, 0),
    quantity,
    unitPrice,
    total: quantity * unitPrice,
    product,
  };
};

export const normalizeStatusHistory = (item) => ({
  id: normalizeNumber(item?.id ?? item?.orderStatusHistoryId, 0),
  previousStatus: item?.previousStatus ?? "",
  newStatus: item?.newStatus ?? "",
  note: item?.note ?? "",
  changedByUserId: item?.changedByUserId ?? "",
  changedByRole: item?.changedByRole ?? "",
  changedAt: item?.changedAt ?? "",
});

export const normalizeActivityLog = (item) => ({
  id: normalizeNumber(item?.id ?? item?.orderActivityLogId, 0),
  activityType: item?.activityType ?? "",
  title: item?.title ?? "",
  description: item?.description ?? "",
  fromValue: item?.fromValue ?? "",
  toValue: item?.toValue ?? "",
  actorUserId: item?.actorUserId ?? "",
  actorRole: item?.actorRole ?? "",
  createdAt: item?.createdAt ?? "",
});

export const normalizeBill = (item) => ({
  id: normalizeNumber(item?.id ?? item?.billId, 0),
  billCode: item?.billCode ?? "",
  subtotalAmount: normalizeNumber(item?.subtotalAmount, 0),
  discountAmount: normalizeNumber(item?.discountAmount, 0),
  totalAmount: normalizeNumber(item?.totalAmount, 0),
  paymentMethod: item?.paymentMethod ?? "",
  paymentStatus: item?.paymentStatus ?? "",
  billStatus: item?.billStatus ?? "",
  createdAt: item?.createdAt ?? "",
  paidAt: item?.paidAt ?? "",
  details: mapApiList(item?.billDetails).map((detail) => ({
    id: normalizeNumber(detail?.id ?? detail?.billDetailId, 0),
    productId: normalizeNumber(detail?.productId, 0),
    productName: detail?.productName ?? "",
    quantity: normalizeNumber(detail?.quantity, 0),
    unitPrice: normalizeNumber(detail?.unitPrice, 0),
    subTotal: normalizeNumber(detail?.subTotal, 0),
  })),
});

export const sortByDateAscending = (items = [], getDate) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(getDate(left)).getTime() || 0;
    const rightTime = new Date(getDate(right)).getTime() || 0;
    return leftTime - rightTime;
  });

export const buildOrderTimeline = (statusHistory = [], activityLogs = []) => {
  const unified = [];

  statusHistory.forEach((history) => {
    unified.push({
      id: `history-${history.id}`,
      date: history.changedAt,
      title: formatOrderStatus(history.newStatus),
      description: history.previousStatus
        ? `${formatOrderStatus(history.previousStatus)} → ${formatOrderStatus(history.newStatus)}`
        : formatHistoryNote(history.note),
      actor:
        history.changedByRole || history.changedByUserId
          ? `${history.changedByRole || "User"} - ${history.changedByUserId || "N/A"}`
          : "",
      timestamp: new Date(history.changedAt).getTime() || 0,
    });
  });

  activityLogs.forEach((log) => {
    if (
      log.activityType === ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED ||
      log.activityType === ORDER_ACTIVITY_TYPE.REFUND_TRANSFER_SUBMITTED ||
      log.activityType === ORDER_ACTIVITY_TYPE.REFUND_RECEIVED_CONFIRMED ||
      log.activityType === ORDER_ACTIVITY_TYPE.BANK_TRANSFER_SUBMITTED ||
      log.activityType === ORDER_ACTIVITY_TYPE.ORDER_CANCELLED
    ) {
      let title = formatActivityTitle(log);
      if (
        log.activityType === ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED &&
        log.toValue
      ) {
        title = formatPaymentStatus(log.toValue);
      }

      let desc =
        log.fromValue || log.toValue
          ? formatActivityTransition(log)
          : formatHistoryNote(log.description);

      // Avoid duplicate cancelled events if both statusHistory and activityLog record it
      const isDuplicateCancelled =
        log.activityType === ORDER_ACTIVITY_TYPE.ORDER_CANCELLED &&
        unified.some(
          (u) => u.title === formatOrderStatus(ORDER_STATUS.CANCELLED),
        );

      if (!isDuplicateCancelled) {
        unified.push({
          id: `activity-${log.id}`,
          date: log.createdAt,
          title: title,
          description: desc,
          actor:
            log.actorRole || log.actorUserId
              ? `${log.actorRole || "User"} - ${log.actorUserId || "N/A"}`
              : "",
          timestamp: new Date(log.createdAt).getTime() || 0,
        });
      }
    }
  });

  return sortByDateAscending(unified, (item) => item.date);
};
