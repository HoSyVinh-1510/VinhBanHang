import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { orderApi, userApi } from "../../../services/api";
import ShopShell from "./ShopShell";
import useMultiShopStyles from "./useMultiShopStyles";
import { formatPrice, mapApiList } from "../../../utils/shopDataUtils";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  canAdminSubmitRefundTransfer,
  canOpenBankTransfer,
  findLatestBankTransferSubmission,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  isBankTransferMethod,
  normalizeActivityLog,
  normalizeOrder,
  normalizeOrderStatus,
  normalizePaymentStatus,
} from "../../../utils/orderDataUtils";
import qrStaticImage from "../../../components/image/QR.jpg";

const TRANSFER_MODE = {
  PAYMENT: "payment",
  REFUND: "refund",
};

const BANK_TRANSFER_TIMEOUT_MINUTES = 15;
const PAYMENT_POLLING_INTERVAL_MS = 10000;

const BANK_TRANSFER_CONFIG = {
  bankId: "MB",
  bankName: "MBBank",
  accountNumber: "2215102005",
  accountName: "HoSyVinh",
};

const resolveText = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const resolveDefaultRefundQrImageUrl = (apiUser) => {
  const directValue = resolveText(apiUser?.refundQrImageUrl, "");
  if (directValue) {
    return directValue;
  }

  const rawItems = apiUser?.refundQrItems;
  const items = Array.isArray(rawItems) ? rawItems : [];
  const normalizedItems = items
    .map((item) => ({
      qrImageUrl: resolveText(item?.qrImageUrl, ""),
      isDefault: Boolean(item?.isDefault),
    }))
    .filter((item) => item.qrImageUrl);

  const defaultItem =
    normalizedItems.find((item) => item.isDefault) || normalizedItems[0];
  return defaultItem?.qrImageUrl || "";
};

const normalizeRefundUser = (apiUser) => ({
  id: resolveText(apiUser?.id, ""),
  username: resolveText(apiUser?.username, ""),
  name: resolveText(apiUser?.name, ""),
  phone: resolveText(apiUser?.phone, ""),
  refundQrImageUrl: resolveDefaultRefundQrImageUrl(apiUser),
});

const toCountdownText = (seconds) => {
  const clamped = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(clamped / 60);
  const remainSeconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
};

const TransferFlowPage = ({ mode = TRANSFER_MODE.PAYMENT }) => {
  useMultiShopStyles();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick(t => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () => window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const isRefundMode = mode === TRANSFER_MODE.REFUND;
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [order, setOrder] = useState(null);
  const [refundUser, setRefundUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dynamicQrUrl, setDynamicQrUrl] = useState("");

  const [remainingSeconds, setRemainingSeconds] = useState(
    BANK_TRANSFER_TIMEOUT_MINUTES * 60,
  );
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [transferSubmission, setTransferSubmission] = useState(null);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [approvingReturnRequest, setApprovingReturnRequest] = useState(false);

  // Note modal state (replaces window.prompt flows)
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteModalValue, setNoteModalValue] = useState("");
  const noteModalOnConfirmRef = useRef(null);

  // Copy feedback for account number
  const [copiedAccount, setCopiedAccount] = useState(false);

  const paymentStatus = normalizePaymentStatus(order?.paymentStatus);
  const orderStatus = normalizeOrderStatus(order?.orderStatus);

  const canSubmitPayment =
    !isRefundMode &&
    canOpenBankTransfer(order) &&
    !transferSubmission &&
    remainingSeconds > 0;
  const canSubmitRefund = isRefundMode && canAdminSubmitRefundTransfer(order);
  const transferExpired =
    !isRefundMode &&
    canOpenBankTransfer(order) &&
    !transferSubmission &&
    remainingSeconds <= 0;
  const hasUserQr = Boolean(refundUser?.refundQrImageUrl);
  const cameFromReturnRequest = useMemo(
    () => new URLSearchParams(location.search).get("fromReturnRequest") === "1",
    [location.search],
  );

  const transferContent = useMemo(() => {
    if (order?.id) {
      return isRefundMode
        ? `HSV HOAN TIEN DON ${order.id}`
        : `HSV DON ${order.id}`;
    }
    return isRefundMode ? "MA HOAN TIEN" : "MA THANH TOAN";
  }, [isRefundMode, order?.id]);

  const qrUrl = useMemo(() => {
    if (!order?.id) {
      return "";
    }

    if (isRefundMode) {
      return refundUser?.refundQrImageUrl || "";
    }

    return dynamicQrUrl;
  }, [isRefundMode, order?.id, refundUser?.refundQrImageUrl, dynamicQrUrl]);

  const loadOrder = useCallback(
    async (showSpinner = true) => {
      const numericOrderId = Number(orderId);
      if (!Number.isFinite(numericOrderId) || numericOrderId <= 0) {
        setError("Mã đơn hàng không hợp lệ.");
        setLoading(false);
        return;
      }

      if (showSpinner) {
        setLoading(true);
      }

      try {
        const response = await orderApi.getById(numericOrderId);
        const payload = response?.data ?? {};
        const normalizedOrder = normalizeOrder(
          payload?.order ?? payload,
        );
        setOrder(normalizedOrder);
        setError("");
        setSuccess("");

        if (isRefundMode) {
          let normalizedUser = null;
          if (normalizedOrder?.userId) {
            try {
              const userResponse = await userApi.getById(
                normalizedOrder.userId,
              );
              normalizedUser = normalizeRefundUser(userResponse?.data ?? null);
            } catch {
              normalizedUser = null;
            }
          }
          setRefundUser(normalizedUser);

          const currentOrderStatus = normalizeOrderStatus(
            normalizedOrder.orderStatus,
          );
          const currentPaymentStatus = normalizePaymentStatus(
            normalizedOrder.paymentStatus,
          );

          if (
            ![
              ORDER_STATUS.RETURN_REQUESTED,
              ORDER_STATUS.CANCELLED,
              ORDER_STATUS.RETURNED,
            ].includes(currentOrderStatus)
          ) {
            setError("Đơn hàng này không nằm trong luồng hoàn tiền.");
            return;
          }

          if (
            currentOrderStatus !== ORDER_STATUS.RETURN_REQUESTED &&
            !canAdminSubmitRefundTransfer(normalizedOrder) &&
            currentPaymentStatus !== PAYMENT_STATUS.REFUND_TRANSFERRED &&
            currentPaymentStatus !== PAYMENT_STATUS.REFUNDED
          ) {
            setError("Đơn hàng này không đã trạng thái cần hoàn tiền.");
            return;
          }

          if (currentPaymentStatus === PAYMENT_STATUS.REFUND_TRANSFERRED) {
            setSuccess(
              "Admin đã xác nhận chuyển hoàn tiền. Đang chờ user xác nhận đã nhận tiền.",
            );
          } else if (currentPaymentStatus === PAYMENT_STATUS.REFUNDED) {
            setSuccess("User đã xác nhận đã nhận tiền hoàn.");
          } else if (
            cameFromReturnRequest &&
            currentOrderStatus === ORDER_STATUS.RETURN_REQUESTED
          ) {
            setSuccess(
              "Hãy duyệt yêu cầu hoàn/trả đề bắt đầu quy trình chuyển hoàn tiền.",
            );
          }
          return;
        }

        const activityLogs = mapApiList(
          payload?.activityLogs,
        ).map(normalizeActivityLog);
        const latestTransferSubmission =
          findLatestBankTransferSubmission(activityLogs);

        setTransferSubmission(latestTransferSubmission);
        setLastCheckedAt(new Date());

        if (!isBankTransferMethod(normalizedOrder.paymentMethod)) {
          setError("Đơn hàng này không dùng phương thức chuyển khoản.");
          return;
        }

        if (
          normalizePaymentStatus(normalizedOrder.paymentStatus) ===
          PAYMENT_STATUS.PAID
        ) {
          setSuccess(
            "Admin đã xác nhận thanh toán. Đơn hàng của bạn đã được ghi nhận.",
          );
          return;
        }

        if (
          normalizeOrderStatus(normalizedOrder.orderStatus) ===
            ORDER_STATUS.CANCELLED ||
          normalizePaymentStatus(normalizedOrder.paymentStatus) ===
            PAYMENT_STATUS.FAILED
        ) {
          return;
        }
      } catch (loadError) {
        setError(
          loadError.response?.data?.message ||
            "Không thể tải thông tin đơn hàng.",
        );
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [cameFromReturnRequest, isRefundMode, orderId],
  );

  useEffect(() => {
    loadOrder(true);
  }, [loadOrder]);

  useEffect(() => {
    if (isRefundMode || !order?.id || !order?.totalAmount) {
      return;
    }
    fetch(`/api/promotions/generate-qr?order_id=${order.id}&amount=${order.totalAmount}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.qrUrl) {
          setDynamicQrUrl(data.qrUrl);
        }
      })
      .catch(() => {
        setDynamicQrUrl(qrStaticImage);
      });
  }, [order?.id, order?.totalAmount, isRefundMode]);

  useEffect(() => {
    if (isRefundMode || !order?.createdAt) {
      return undefined;
    }

    const updateCountdown = () => {
      const createdAtTime = new Date(order.createdAt).getTime();
      if (Number.isNaN(createdAtTime)) {
        setRemainingSeconds(BANK_TRANSFER_TIMEOUT_MINUTES * 60);
        return;
      }

      const expiredAt =
        createdAtTime + BANK_TRANSFER_TIMEOUT_MINUTES * 60 * 1000;
      const remain = Math.floor((expiredAt - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, remain));
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [isRefundMode, order?.createdAt]);

  useEffect(() => {
    if (isRefundMode || !order?.id) {
      return undefined;
    }

    const terminalPaymentStatuses = [
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.FAILED,
      PAYMENT_STATUS.REFUNDED,
    ];

    if (
      terminalPaymentStatuses.includes(paymentStatus) ||
      orderStatus === ORDER_STATUS.CANCELLED
    ) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      loadOrder(false);
    }, PAYMENT_POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isRefundMode, loadOrder, order?.id, orderStatus, paymentStatus]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(
      query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list",
    );
  };

  const handleApproveReturnRequest = async () => {
    if (!order?.id || orderStatus !== ORDER_STATUS.RETURN_REQUESTED) {
      return;
    }
    openNoteModal("", async (noteInput) => {
      setApprovingReturnRequest(true);
      setError("");
      setSuccess("");
      try {
        await orderApi.resolveReturnRequest(
          order.id,
          true,
          noteInput.trim() || undefined,
        );
        setSuccess("Đã duyệt yêu cầu hoàn/trả.");
        window.dispatchEvent(new Event("order-return-request-updated"));
        window.dispatchEvent(new Event("admin-orders-updated"));
        await loadOrder(false);
      } catch (approveError) {
        setError(
          approveError.response?.data?.message ||
            "Không thể duyệt yêu cầu hoàn/trả.",
        );
        await loadOrder(false);
      } finally {
        setApprovingReturnRequest(false);
      }
    });
  };

  const handleSubmitTransfer = async (method = null) => {
    if (!order?.id) {
      return;
    }

    if (isRefundMode) {
      if (!canSubmitRefund) {
        return;
      }

      if (method === "BankQR" && !hasUserQr) {
        setError("User chưa cập nhật QR nhận tiền. Vui lòng hoàn tiền vào Ví hoặc liên hệ người dùng.");
        return;
      }
      openNoteModal("", async (noteInput) => {
        setSubmittingTransfer(true);
        setError("");
        setSuccess("");
        try {
          await orderApi.submitRefundTransfer(
            order.id,
            noteInput.trim() || undefined,
            method
          );
          setSuccess(method === "Wallet" ? "Đã cộng thẳng số tiền hoàn vào Ví của khách hàng." : "Đã ghi nhận chuyển hoàn; chờ user xác nhận.");
          window.dispatchEvent(new Event("order-refund-transfer-submitted"));
          window.dispatchEvent(new Event("admin-orders-updated"));
          await loadOrder(false);
        } catch (submitError) {
          setError(
            submitError.response?.data?.message ||
              "Không thể gửi xác nhận hoàn tiền.",
          );
          await loadOrder(false);
        } finally {
          setSubmittingTransfer(false);
        }
      });
      return;
    }

    if (transferExpired) {
      setError(
        "Đã hết thời gian xác nhận chuyển khoản. Vui lòng làm mới đề cập nhật trạng thái đơn hàng.",
      );
      await loadOrder(false);
      return;
    }

    openNoteModal("", async (noteInput) => {
      setSubmittingTransfer(true);
      setError("");
      setSuccess("");
      try {
        await orderApi.submitTransfer(order.id, noteInput.trim() || undefined);
        setSuccess("Đã gửi xác nhận chuyển khoản.");
        window.dispatchEvent(new Event("order-transfer-submitted"));
        navigate("/shop/orders", {
          state: { transferSubmittedOrderId: order.id },
        });
      } catch (submitError) {
        setError(
          submitError.response?.data?.message ||
            "Không thể gửi xác nhận chuyển khoản.",
        );
        await loadOrder(false);
      } finally {
        setSubmittingTransfer(false);
      }
    });
  };

  const openNoteModal = (initialValue = "", onConfirm) => {
    noteModalOnConfirmRef.current = onConfirm;
    setNoteModalValue(initialValue);
    setNoteModalVisible(true);
  };

  const closeNoteModal = () => {
    noteModalOnConfirmRef.current = null;
    setNoteModalVisible(false);
    setNoteModalValue("");
  };

  const handleNoteModalConfirm = async () => {
    const cb = noteModalOnConfirmRef.current;
    // close modal first for immediate UI feedback
    closeNoteModal();
    if (typeof cb === "function") {
      await cb(noteModalValue);
    }
  };

  const isShopRoute = location.pathname.startsWith("/shop");

  if (isRefundMode && !isAdmin()) {
    if (isShopRoute) {
      return (
        <ShopShell
          activeRoute="orders"
          userName={user?.name || user?.username}
          onLogout={handleLogout}
          isAdmin={isAdmin()}
          onGoAdmin={() => navigate("/")}
        >
          <div className="container-fluid text-center py-5">
            Bạn không có quyền truy cập trang này.
          </div>
        </ShopShell>
      );
    } else {
      return (
        <div className="content-wrapper">
          <div className="container-fluid text-center py-5">
            Bạn không có quyền truy cập trang này.
          </div>
        </div>
      );
    }
  }

  const renderPageContent = () => (
    <>
      <div className="container-fluid">
        <div className="row px-xl-5">
          <div className="col-12">
            <h5 className="section-title position-relative text-uppercase mb-3">
              {isRefundMode ? "Hoàn tiền đơn hàng" : "Thanh toán chuyển khoản"}
            </h5>
          </div>
        </div>

        {success && (
          <div className="row px-xl-5">
            <div className="col-12">
              <div className="alert alert-success">{success}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="row px-xl-5">
            <div className="col-12">
              <div className="alert alert-danger">{error}</div>
            </div>
          </div>
        )}

        <div className="row px-xl-5 pb-5">
          <div className="col-lg-7 mb-4">
            <div className="bg-light p-30 h-100">
              {loading && (
                <p className="text-muted mb-0">
                  Đang tải thông tin đơn hàng...
                </p>
              )}

              {!loading && order && (
                <>
                  <h4 className="mb-3">Đơn hàng #{order.id}</h4>
                  {isRefundMode ? (
                    <>
                      <p className="mb-2">
                        Người nhận đơn:{" "}
                        <strong>{order.receiverName || "-"}</strong>
                      </p>
                      <p className="mb-2">
                        Số tiền hoàn:{" "}
                        <strong className="text-danger">
                          {formatPrice(order.totalAmount)}
                        </strong>
                      </p>
                    </>
                  ) : (
                    <p className="mb-2">
                      Tổng thanh toán:{" "}
                      <strong>
                        {formatPrice(order.totalAmount)}
                      </strong>
                    </p>
                  )}
                  <p className="mb-2">
                    Nội dung chuyển khoản: <strong>{transferContent}</strong>
                  </p>
                  <p className="mb-2">
                    Trạng thái đơn:{" "}
                    <strong>{formatOrderStatus(orderStatus)}</strong>
                  </p>
                  <p className="mb-3">
                    Trạng thái thanh toán:{" "}
                    <strong>{formatPaymentStatus(paymentStatus)}</strong>
                  </p>

                  {!isRefundMode && canOpenBankTransfer(order) && (
                    <div
                      className={`alert ${remainingSeconds > 0 ? "alert-warning" : "alert-danger"} mb-3`}
                    >
                      {remainingSeconds > 0 ? (
                        <>
                          Vui lòng chuyển khoản trong vòng{" "}
                          <strong>{BANK_TRANSFER_TIMEOUT_MINUTES}</strong> phút.
                          Còn lại:{" "}
                          <span className="h4 font-weight-bold text-danger">
                            {toCountdownText(remainingSeconds)}
                          </span>
                        </>
                      ) : (
                        <>
                          Đã hết thời gian xác nhận chuyển khoản (
                          {BANK_TRANSFER_TIMEOUT_MINUTES} phút). Vui lòng làm
                          mới đề cập nhật trạng thái.
                        </>
                      )}
                    </div>
                  )}

                  {!isRefundMode && (
                    <>
                      <p className="mb-1">
                        Ngân hàng:{" "}
                        <strong>{BANK_TRANSFER_CONFIG.bankName}</strong>
                      </p>
                      <p className="mb-1">
                        Số tài khoản:{" "}
                        <strong>
                          {BANK_TRANSFER_CONFIG.accountNumber}
                        </strong>{" "}
                      </p>
                      <p className="mb-3">
                        Chủ tài khoản:{" "}
                        <strong>{BANK_TRANSFER_CONFIG.accountName}</strong>
                      </p>
                    </>
                  )}

                  {isRefundMode && (
                    <div className="border rounded p-3 mb-3 bg-white">
                      <div className="font-weight-bold mb-1">
                        Thông tin người nhận tiền
                      </div>
                      <div>ID: {refundUser?.id || order.userId || "-"}</div>
                      <div>Username: {refundUser?.username || "-"}</div>
                      <div>Họ tên: {refundUser?.name || "-"}</div>
                      <div>Số điện thoại: {refundUser?.phone || "-"}</div>
                    </div>
                  )}

                  {isRefundMode &&
                    orderStatus === ORDER_STATUS.RETURN_REQUESTED && (
                      <div className="alert alert-warning mb-3">
                        <div className="mb-2">
                          Đơn hàng đang chờ duyệt yêu cầu hoàn tiền.
                        </div>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={handleApproveReturnRequest}
                          disabled={approvingReturnRequest}
                        >
                          {approvingReturnRequest
                            ? "Đang duyệt..."
                            : "Duyệt yêu cầu hoàn tiền"}
                        </button>
                      </div>
                    )}

                  {!isRefundMode &&
                    canOpenBankTransfer(order) &&
                    !transferSubmission && (
                      <div className="mb-3">
                        <button
                          type="button"
                          className="btn btn-warning font-weight-bold"
                          onClick={handleSubmitTransfer}
                          disabled={submittingTransfer || !canSubmitPayment}
                        >
                          {submittingTransfer
                            ? "Đang gửi xác nhận..."
                            : transferExpired
                              ? "Đã hết hạn"
                              : "Đã chuyển khoản"}
                        </button>
                      </div>
                    )}

                  {isRefundMode && canSubmitRefund && (
                    <>
                      {!hasUserQr && (
                        <div className="alert alert-danger mb-3">
                          User chưa cập nhật QR nhận tiền. Bạn chỉ có thể hoàn tiền trực tiếp vào Ví điện tử của khách hàng.
                        </div>
                      )}
                      <div className="mb-3 d-flex flex-column gap-2" style={{ gap: "10px" }}>
                        <button
                          type="button"
                          className="btn btn-info font-weight-bold"
                          onClick={() => handleSubmitTransfer("Wallet")}
                          disabled={submittingTransfer}
                        >
                          <i className="fas fa-wallet mr-2"></i> Hoàn tiền về Ví của khách
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary font-weight-bold"
                          onClick={() => handleSubmitTransfer("BankQR")}
                          disabled={submittingTransfer || !hasUserQr}
                        >
                          <i className="fas fa-check-circle mr-2"></i> Đã chuyển hoàn qua QR
                        </button>
                      </div>
                    </>
                  )}

                  {!isRefundMode && transferSubmission && (
                    <div className="alert alert-info mb-3">
                      <div>
                        Bạn đã xác nhận chuyển khoản lúc{" "}
                        <strong>
                          {formatDateTime(transferSubmission.createdAt)}
                        </strong>
                        .
                      </div>
                      {transferSubmission.description && (
                        <small className="d-block mt-1">
                          Ghi chú: {transferSubmission.description}
                        </small>
                      )}
                      <small className="d-block mt-1">
                        Trạng thái: chờ admin duyệt thanh toán.
                      </small>
                    </div>
                  )}

                  {isRefundMode &&
                    !canSubmitRefund &&
                    paymentStatus === PAYMENT_STATUS.REFUND_TRANSFERRED && (
                      <div className="alert alert-warning mb-3">
                        Bạn đã xác nhận chuyển hoàn tiền. Đang chờ user kiểm tra
                        và xác nhận đã nhận được tiền.
                      </div>
                    )}

                  {isRefundMode &&
                    !canSubmitRefund &&
                    paymentStatus === PAYMENT_STATUS.REFUNDED && (
                      <div className="alert alert-info mb-3">
                        Phiên hoàn tiền đã kết thúc.
                      </div>
                    )}

                  {!isRefundMode && (
                    <p className="text-muted mb-2">
                      Sau khi bạn chuyển khoản, admin sẽ vào trang quản trị đề
                      xác nhận thanh toán. Khi xác nhận xong, trạng thái sẽ tự
                      cập nhật tại đây.
                    </p>
                  )}

                  {!isRefundMode && lastCheckedAt && (
                    <small className="text-muted d-block">
                      Cập nhật lần cuối: {lastCheckedAt.toLocaleString("vi-VN")}
                    </small>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="col-lg-5 mb-4">
            <div className="bg-light p-30 text-center h-100">
              <h5 className="mb-3">Quét mã QR đề chuyển khoản</h5>
              {order && qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`${"QR chuyển khoản"} đơn #${order.id}`}
                  className="img-fluid border rounded p-2 bg-white"
                  style={{ maxWidth: "340px" }}
                />
              ) : (
                <div className="text-muted py-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "250px" }}>
                  {isRefundMode ? (
                    "User chưa cập nhật QR nhận tiền."
                  ) : (
                    <>
                      <i className="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i>
                      <div>Đang tạo VietQR thanh toán...</div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 d-flex flex-wrap justify-content-center">
                <button
                  type="button"
                  className="btn btn-outline-primary mr-2 mb-2"
                  onClick={() => loadOrder(false)}
                  disabled={loading}
                >
                  Làm mới
                </button>
                <Link
                  to={
                    location.pathname.startsWith("/shop")
                      ? "/shop/orders"
                      : "/orders"
                  }
                  className="btn btn-primary mb-2"
                >
                  {isRefundMode
                    ? "Quay lại danh sách đơn"
                    : "Về đơn hàng của tôi"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {noteModalVisible && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            style={{ zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Nhập nội dung ghi chú</h5>
                  <button
                    type="button"
                    className="close"
                    onClick={closeNoteModal}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  <textarea
                    className="form-control"
                    value={noteModalValue}
                    onChange={(e) => setNoteModalValue(e.target.value)}
                    placeholder="Nhập mã giao dịch hoặc ghi chú (không bắt buộc)"
                    rows={4}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNoteModalConfirm}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050 }}
          ></div>
        </>
      )}
    </>
  );

  if (isShopRoute) {
    return (
      <ShopShell
        activeRoute="orders"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={isAdmin()}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      >
        {renderPageContent()}
      </ShopShell>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Hoàn tiền đơn hàng</h1>
            </div>
            <div className="col-sm-6 text-right">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(cameFromReturnRequest ? "/orders/return-requests" : "/orders")}
              >
                Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid pb-3">
          {renderPageContent()}
        </div>
      </section>
    </div>
  );
};

export default TransferFlowPage;


