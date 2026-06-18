import React, { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { orderApi, reviewApi, userApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import FilterCriteriaModal from "./components_UI/FilterCriteriaModal";
import ModalFrame from "./components_UI/ModalFrame";
import OrderDetailContent from "./components_UI/OrderDetailContent";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  currencyFormatter,
  formatPrice,
  getPagedMeta,
  mapApiList,
} from "../../utils/shopDataUtils";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  canCancelOrderStatus,
  canOpenBankTransfer,
  canReceiveOrderStatus,
  canRequestReturn,
  canUserConfirmRefundReceived,
  findLatestBankTransferSubmission,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  hasOpenReturnRequest,
  isWaitingAdminRefundTransfer,
  normalizeActivityLog,
  normalizeBill,
  normalizeOrder,
  normalizeOrderDetail,
  normalizeStatusHistory,
  willCreateRefundAfterCancel,
  canAdminSubmitRefundTransfer,
  getAdminOrderStatusActions,
  getAdminPaymentStatusActions,
  ORDER_STATUS,
} from "../../utils/orderDataUtils";

const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái đơn" },
  ...ORDER_STATUS_OPTIONS,
];

const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái thanh toán" },
  ...PAYMENT_STATUS_OPTIONS,
];

const normalizeReview = (item) => ({
  id: Number(item?.id ?? item?.productReviewId ?? 0) || 0,
  productId: Number(item?.productId ?? 0) || 0,
  orderId: Number(item?.orderId ?? 0) || 0,
  orderItemId: Number(item?.orderItemId ?? 0) || 0,
  rating: Number(item?.rating ?? 0) || 0,
  comment: item?.comment ?? "",
  createdAt: item?.createdAt ?? "",
});

const ShopOrders = () => {
  useMultiShopStyles();

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const adminView = isAdmin();

  const [searchInput, setSearchInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDraft, setFilterDraft] = useState({
    keywordInput: "",
    orderStatus: "",
    paymentStatus: "",
    fromDate: "",
    toDate: "",
    pageSize: 8,
  });

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetailsMap, setOrderDetailsMap] = useState({});
  const [orderHistoryMap, setOrderHistoryMap] = useState({});
  const [orderActivityMap, setOrderActivityMap] = useState({});
  const [orderBillMap, setOrderBillMap] = useState({});
  const [orderReviewMap, setOrderReviewMap] = useState({});
  const [transferSubmissionMap, setTransferSubmissionMap] = useState({});
  const [loadingTransferSubmissionIds, setLoadingTransferSubmissionIds] =
    useState(new Set());
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Return/Refund request modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnRequestedIds, setReturnRequestedIds] = useState(new Set());

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);

  // Cancel Order Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
  const [refundMethod, setRefundMethod] = useState("Wallet");
  const [refundQrId, setRefundQrId] = useState("");
  const [refundQrs, setRefundQrs] = useState([]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = {
        keyword: keyword.trim() || undefined,
        orderStatus: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy: "createdAt",
        sortDirection: "desc",
        page,
        pageSize,
      };
      const response = adminView
        ? await orderApi.getAll(query)
        : await orderApi.getMyOrders(query);

      const payload = response?.data ?? {};
      const items = mapApiList(payload).map(normalizeOrder);
      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: items.length,
      });

      setOrders(items);
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setOrders([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(
        loadError.response?.data?.message ||
          "Không thể tải danh sách đơn hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    adminView,
    fromDate,
    keyword,
    orderStatus,
    page,
    pageSize,
    paymentStatus,
    toDate,
  ]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const submittedOrderId = Number(location.state?.transferSubmittedOrderId);
    if (!Number.isFinite(submittedOrderId) || submittedOrderId <= 0) {
      return;
    }

    setTransferSubmissionMap((current) => ({
      ...current,
      [submittedOrderId]: current[submittedOrderId] || {
        submittedAt: new Date().toISOString(),
        note: "",
        byUserId: user?.id || "",
      },
    }));
    setSuccess(
      `Đã gửi xác nhận chuyển khoản cho đơn #${submittedOrderId}. Vui lòng chờ admin duyệt.`,
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, user?.id]);

  useEffect(() => {
    orders.forEach((order) => {
      if (!order?.id || !canOpenBankTransfer(order)) {
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(transferSubmissionMap, order.id)
      ) {
        return;
      }

      if (loadingTransferSubmissionIds.has(order.id)) {
        return;
      }

      setLoadingTransferSubmissionIds((current) =>
        new Set(current).add(order.id),
      );

      orderApi
        .getById(order.id)
        .then((response) => {
          const payload = response?.data ?? {};
          const activityLogs = mapApiList(payload?.activityLogs).map(
            normalizeActivityLog,
          );
          const latestTransferSubmission =
            findLatestBankTransferSubmission(activityLogs);
          setTransferSubmissionMap((current) => ({
            ...current,
            [order.id]: latestTransferSubmission
              ? {
                  submittedAt: latestTransferSubmission.createdAt,
                  note: latestTransferSubmission.description || "",
                  byUserId: latestTransferSubmission.actorUserId || "",
                }
              : null,
          }));
        })
        .catch(() => {
          setTransferSubmissionMap((current) => ({
            ...current,
            [order.id]: null,
          }));
        })
        .finally(() => {
          setLoadingTransferSubmissionIds((current) => {
            const next = new Set(current);
            next.delete(order.id);
            return next;
          });
        });
    });
  }, [loadingTransferSubmissionIds, orders, transferSubmissionMap]);

  const hasSubmittedBankTransfer = useCallback(
    (orderId) => Boolean(transferSubmissionMap[orderId]?.submittedAt),
    [transferSubmissionMap],
  );

  const orderTotalOnPage = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders],
  );

  const handleUpdateOrderStatus = async (order, nextStatus) => {
    if (!order?.id || !nextStatus || nextStatus === order.orderStatus) {
      return;
    }

    const note = window.prompt(
      "Ghi chú thay đổi trạng thái (không bắt buộc):",
      "",
    );
    if (note === null) {
      return;
    }
    setUpdatingStatusId(order.id);
    setError("");
    setSuccess("");

    try {
      await orderApi.updateStatus(order.id, nextStatus, note || null);
      setSuccess(
        `Đã cập nhật trạng thái đơn #${order.id} thành "${formatOrderStatus(nextStatus)}".`,
      );
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
    } catch (updateError) {
      setError(
        updateError.response?.data?.message ||
          "Không thể cập nhật trạng thái đơn hàng.",
      );
      await loadOrders();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUpdatePaymentStatus = async (order, nextPaymentStatus) => {
    if (
      !order?.id ||
      !nextPaymentStatus ||
      nextPaymentStatus === order.paymentStatus
    ) {
      return;
    }

    setUpdatingPaymentId(order.id);
    setError("");
    setSuccess("");

    try {
      await orderApi.updatePaymentStatus(order.id, nextPaymentStatus);
      setSuccess(
        `Đã cập nhật thanh toán đơn #${order.id} thành "${formatPaymentStatus(nextPaymentStatus)}".`,
      );
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
    } catch (updateError) {
      setError(
        updateError.response?.data?.message ||
          "Không thể cập nhật trạng thái thanh toán.",
      );
      await loadOrders();
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleShopSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(
      query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list",
    );
  };

  const openFilterModal = () => {
    setFilterDraft({
      keywordInput,
      orderStatus,
      paymentStatus,
      fromDate,
      toDate,
      pageSize,
    });
    setShowFilterModal(true);
  };

  const applyFiltersFromModal = () => {
    const normalizedKeyword = (filterDraft.keywordInput || "").trim();
    setKeywordInput(filterDraft.keywordInput || "");
    setKeyword(normalizedKeyword);
    setOrderStatus(filterDraft.orderStatus || "");
    setPaymentStatus(filterDraft.paymentStatus || "");
    setFromDate(filterDraft.fromDate || "");
    setToDate(filterDraft.toDate || "");
    setPageSize(Number(filterDraft.pageSize) || 8);
    setPage(1);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      keywordInput: "",
      orderStatus: "",
      paymentStatus: "",
      fromDate: "",
      toDate: "",
      pageSize: 8,
    };

    setKeywordInput(defaultFilters.keywordInput);
    setKeyword("");
    setOrderStatus(defaultFilters.orderStatus);
    setPaymentStatus(defaultFilters.paymentStatus);
    setFromDate(defaultFilters.fromDate);
    setToDate(defaultFilters.toDate);
    setPageSize(defaultFilters.pageSize);
    setFilterDraft(defaultFilters);
    setPage(1);
  };

  const handleToggleOrderDetail = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);
    if (
      orderDetailsMap[orderId] &&
      orderHistoryMap[orderId] &&
      orderActivityMap[orderId] &&
      Object.prototype.hasOwnProperty.call(orderBillMap, orderId) &&
      Object.prototype.hasOwnProperty.call(orderReviewMap, orderId)
    ) {
      return;
    }

    setLoadingDetailsId(orderId);
    setError("");

    try {
      const reviewRequest = adminView
        ? Promise.resolve({ data: [] })
        : reviewApi.getMineByOrder(orderId);
      const [orderResult, reviewResult] = await Promise.allSettled([
        orderApi.getById(orderId),
        reviewRequest,
      ]);

      if (orderResult.status === "rejected") {
        throw orderResult.reason;
      }

      const response = orderResult.value;
      const payload = response?.data ?? {};
      const details = mapApiList(payload?.details).map(normalizeOrderDetail);
      const history = mapApiList(payload?.statusHistory).map(
        normalizeStatusHistory,
      );
      const activityLogs = mapApiList(payload?.activityLogs).map(
        normalizeActivityLog,
      );
      const billPayload = payload?.bill ?? null;
      const reviews =
        reviewResult.status === "fulfilled"
          ? mapApiList(reviewResult.value?.data).map(normalizeReview)
          : [];
      const reviewByOrderItemId = reviews.reduce((map, review) => {
        if (review.orderItemId > 0) {
          map[review.orderItemId] = review;
        }
        return map;
      }, {});

      setOrderDetailsMap((current) => ({ ...current, [orderId]: details }));
      setOrderHistoryMap((current) => ({ ...current, [orderId]: history }));
      setOrderActivityMap((current) => ({
        ...current,
        [orderId]: activityLogs,
      }));
      setOrderBillMap((current) => ({
        ...current,
        [orderId]: billPayload ? normalizeBill(billPayload) : null,
      }));
      setOrderReviewMap((current) => ({
        ...current,
        [orderId]: reviewByOrderItemId,
      }));
    } catch (loadError) {
      setError(
        loadError.response?.data?.message || "Không thể tải chi tiết đơn hàng.",
      );
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.id || !canCancelOrderStatus(order.orderStatus)) {
      return;
    }

    const shouldWaitRefund = willCreateRefundAfterCancel(
      order,
      hasSubmittedBankTransfer(order.id),
    );

    if (shouldWaitRefund) {
      // Need refund, show our custom Cancel/Refund Modal instead of window.confirm
      setCancelOrderTarget(order);
      try {
        const res = await userApi.getMyRefundQrs();
        const activeQrs = (res.data || []).filter((qr) => qr.isActive);
        setRefundQrs(activeQrs);
        if (activeQrs.length > 0) {
          const defaultQr =
            activeQrs.find((qr) => qr.isDefault) || activeQrs[0];
          setRefundQrId(defaultQr.id.toString());
        }
      } catch (err) {
        console.error("Failed to load refund QRs", err);
      }
      setShowCancelModal(true);
      return;
    }

    // Normal cancellation (no refund needed)
    const confirmMessage = `Bạn có chắc muốn huỷ đơn #${order.id}? Hành động này không thể hoàn tác.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await orderApi.cancel(order.id);
      setSuccess(`Đã huỷ đơn hàng #${order.id} thành công.`);
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
      setExpandedOrderId(null);
    } catch (cancelError) {
      setError(
        cancelError.response?.data?.message || "Không thể huỷ đơn hàng.",
      );
      await loadOrders();
    }
  };

  const handleConfirmCancelWithRefund = async () => {
    if (!cancelOrderTarget) return;

    if (refundMethod === "QR" && !refundQrId) {
      alert("Vui lòng chọn một mã QR để nhận tiền hoàn.");
      return;
    }

    setShowCancelModal(false);
    setError("");
    setSuccess("");

    const payload = {
      refundMethod: refundMethod,
      refundQrId: refundMethod === "QR" ? Number(refundQrId) : null,
    };

    try {
      await orderApi.cancel(cancelOrderTarget.id, payload);
      if (refundMethod === "Wallet") {
        setSuccess(
          `Đã huỷ đơn hàng #${cancelOrderTarget.id}. Tiền đã được tự động hoàn vào Số dư Ví của bạn.`,
        );
      } else {
        setSuccess(
          `Đã huỷ đơn hàng #${cancelOrderTarget.id}. Vui lòng chờ Admin hoàn tiền qua mã QR.`,
        );
      }
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
      setExpandedOrderId(null);
    } catch (cancelError) {
      setError(
        cancelError.response?.data?.message || "Không thể huỷ đơn hàng.",
      );
      await loadOrders();
    }
  };

  const handleReceiveOrder = async (order) => {
    if (!order?.id || !canReceiveOrderStatus(order.orderStatus)) {
      return;
    }

    if (!window.confirm(`Bạn xác nhận đã nhận đơn #${order.id}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await orderApi.receive(order.id);
      setSuccess(`Đã xác nhận nhận hàng đơn #${order.id}.`);
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
      setExpandedOrderId(null);
    } catch (receiveError) {
      setError(
        receiveError.response?.data?.message || "Không thể xác nhận nhận hàng.",
      );
      await loadOrders();
    }
  };

  const handleConfirmRefundReceived = async (order) => {
    if (!order?.id || !canUserConfirmRefundReceived(order)) {
      return;
    }

    if (
      !window.confirm(`Ban xac nhan da nhan tien hoan cho don #${order.id}?`)
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await orderApi.confirmRefundReceived(order.id);
      setSuccess(`Đã xac nhan da nhan tien hoan cho don #${order.id}.`);
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
      setExpandedOrderId(null);
    } catch (refundError) {
      setError(
        refundError.response?.data?.message ||
          "Không thể xác nhận đã nhận tiền hoàn.",
      );
      await loadOrders();
    }
  };

  const handleOpenReturnModal = (orderId) => {
    setReturnOrderId(orderId);
    setReturnReason("");
    setShowReturnModal(true);
  };

  const handleSubmitReturnRequest = async () => {
    if (!returnOrderId) return;
    if (!returnReason.trim()) {
      setError("Vui lòng nhập lý do yêu cầu hoàn/trả.");
      return;
    }
    setSubmittingReturn(true);
    setError("");
    setSuccess("");
    try {
      await orderApi.returnRequest(returnOrderId, returnReason.trim());
      setSuccess(
        `Đã gửi yêu cầu hoàn/trả cho đơn #${returnOrderId}. Admin sẽ xét duyệt sớm.`,
      );
      setShowReturnModal(false);
      setReturnRequestedIds((prev) => new Set(prev).add(returnOrderId));
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
      // Refresh detail if expanded
      if (expandedOrderId === returnOrderId) {
        setOrderDetailsMap((m) => {
          const n = { ...m };
          delete n[returnOrderId];
          return n;
        });
        setOrderHistoryMap((m) => {
          const n = { ...m };
          delete n[returnOrderId];
          return n;
        });
        setOrderActivityMap((m) => {
          const n = { ...m };
          delete n[returnOrderId];
          return n;
        });
        await handleToggleOrderDetail(returnOrderId);
      }
    } catch (returnError) {
      const errorMsg =
        returnError.response?.data?.message ||
        "Không thể gửi yêu cầu hoàn/trả.";
      setError(errorMsg);
      await loadOrders();
      if (
        returnError.response?.status === 400 &&
        errorMsg.includes("already has an open return")
      ) {
        setReturnRequestedIds((prev) => new Set(prev).add(returnOrderId));
        setShowReturnModal(false);
      }
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleOpenReviewModal = (order, detail) => {
    if (!order?.id || !detail?.id || !detail?.productId) {
      return;
    }

    setReviewTarget({
      orderId: order.id,
      orderItemId: detail.id,
      productId: detail.productId,
      productName: detail.product.name || `Sản phẩm #${detail.productId}`,
    });
    setReviewRating(5);
    setReviewComment("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewTarget) {
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setError("Vui lòng chọn số sao từ 1 đến 5.");
      return;
    }

    setSubmittingReview(true);
    setError("");
    setSuccess("");

    try {
      const response = await reviewApi.upsert(reviewTarget.productId, {
        orderItemId: reviewTarget.orderItemId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
      });
      const review = normalizeReview(response?.data ?? {});

      setOrderReviewMap((current) => ({
        ...current,
        [reviewTarget.orderId]: {
          ...(current[reviewTarget.orderId] || {}),
          [reviewTarget.orderItemId]: review.orderItemId
            ? review
            : {
                ...review,
                orderId: reviewTarget.orderId,
                orderItemId: reviewTarget.orderItemId,
                productId: reviewTarget.productId,
              },
        },
      }));
      setSuccess(`Đã gửi đánh giá cho "${reviewTarget.productName}".`);
      setShowReviewModal(false);
      setReviewTarget(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (reviewError) {
      setError(
        reviewError.response?.data?.message || "Không thể gửi đánh giá.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <ShopShell
        activeRoute="orders"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={adminView}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleShopSearchSubmit}
      >
        <div className="container-fluid pb-4">
          <div className="row px-xl-5">
            <div className="col-12 mb-3 d-flex flex-wrap justify-content-between align-items-center">
              <h4>
                {adminView ? "Đơn hàng toàn hệ thống" : "Đơn hàng của tôi"}
              </h4>
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

          <div className="row px-xl-5">
            <div className="col-12">
              <div className="bg-light p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center shop-toolbar-panel">
                <div className="mb-2 mb-md-0">
                  <button
                    type="button"
                    className="btn btn-primary mr-2 shop-toolbar-btn"
                    onClick={openFilterModal}
                  >
                    Tiêu chí lọc
                  </button>
                </div>
                <div className="text-muted">
                  Tổng đơn: <strong>{totalCount}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="row px-xl-5">
            <div className="col-12">
              <div className="bg-light p-3 mb-3">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Ngày tạo</th>
                        {adminView && <th>Khách hàng</th>}
                        <th>Người nhận</th>
                        <th style={adminView ? { width: "180px" } : undefined}>
                          Trạng thái đơn
                        </th>
                        <th>Trạng thái thanh toán</th>
                        <th>Phương thức</th>
                        <th className="text-right">Tổng tiền</th>
                        <th className="text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td
                            colSpan={adminView ? "9" : "7"}
                            className="text-center py-4 text-muted"
                          >
                            Đang tải đơn hàng...
                          </td>
                        </tr>
                      )}

                      {!loading && orders.length === 0 && (
                        <tr>
                          <td
                            colSpan={adminView ? "9" : "7"}
                            className="text-center py-4 text-muted"
                          >
                            Chưa có đơn hàng phù hợp.
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        orders.map((order) => {
                          const orderStatusActions = adminView
                            ? getAdminOrderStatusActions(order)
                            : [];
                          const paymentStatusActions = adminView
                            ? getAdminPaymentStatusActions(order)
                            : [];
                          const canOpenRefundFlow =
                            adminView &&
                            (canAdminSubmitRefundTransfer(order) ||
                              order.orderStatus === "ReturnRequested");
                          return (
                            <React.Fragment key={order.id}>
                              <tr>
                                <td>
                                  <strong>#{order.id}</strong>
                                </td>
                                <td>{formatDateTime(order.createdAt)}</td>
                                {adminView && <td>{order.userId || "-"}</td>}
                                <td>
                                  {adminView ? (
                                    <div>
                                      Tên người nhận:{" "}
                                      {order.receiverName || "-"}
                                      <br />
                                      <small className="text-muted">
                                        SĐT: {order.phone || "-"}
                                      </small>
                                    </div>
                                  ) : (
                                    order.receiverName || "-"
                                  )}
                                </td>
                                <td>
                                  {adminView ? (
                                    <>
                                      <div className="font-weight-bold mb-1">
                                        {formatOrderStatus(order.orderStatus)}
                                      </div>
                                      <div className="d-flex flex-wrap">
                                        {orderStatusActions.map((option) => (
                                          <button
                                            key={option.value}
                                            type="button"
                                            className={`btn btn-sm mr-1 mb-1 ${
                                              option.value === "Cancelled"
                                                ? "btn-outline-danger"
                                                : "btn-outline-primary"
                                            }`}
                                            onClick={() =>
                                              handleUpdateOrderStatus(
                                                order,
                                                option.value,
                                              )
                                            }
                                            disabled={
                                              updatingStatusId === order.id
                                            }
                                          >
                                            {option.label}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    formatOrderStatus(order.orderStatus)
                                  )}
                                </td>
                                <td>
                                  {adminView ? (
                                    <>
                                      <div className="font-weight-bold mb-1">
                                        {formatPaymentStatus(
                                          order.paymentStatus,
                                        )}
                                      </div>
                                      <div className="d-flex flex-wrap">
                                        {paymentStatusActions.map((option) => (
                                          <button
                                            key={option.value}
                                            type="button"
                                            className={`btn btn-sm mr-1 mb-1 ${
                                              option.value === "Refunded" ||
                                              option.value === "Failed"
                                                ? "btn-outline-warning"
                                                : "btn-outline-success"
                                            }`}
                                            onClick={() =>
                                              handleUpdatePaymentStatus(
                                                order,
                                                option.value,
                                              )
                                            }
                                            disabled={
                                              updatingPaymentId === order.id
                                            }
                                          >
                                            {option.label}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    formatPaymentStatus(order.paymentStatus)
                                  )}
                                </td>
                                {adminView && (
                                  <td>
                                    {order.deliveryMethod === "Pickup" ? (
                                      <div className="">
                                        Phương thức nhận hàng:{" "}
                                        <b>Lấy tại quán</b>
                                      </div>
                                    ) : (
                                      <div className="">
                                        Phương thức nhận hàng:{" "}
                                        <b>Giao tận nơi</b>
                                      </div>
                                    )}
                                    <br />
                                    Phương thức thanh toán:{" "}
                                    <b>{order.paymentMethod || "-"}</b>
                                  </td>
                                )}
                                <td className="text-right">
                                  {currencyFormatter.format(order.totalAmount)}
                                </td>
                                {/* Thao tác xử lý đơn hàng của tôi */}
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary mr-1"
                                    onClick={() =>
                                      handleToggleOrderDetail(order.id)
                                    }
                                  >
                                    {expandedOrderId === order.id
                                      ? "Ẩn"
                                      : "Chi tiết"}
                                  </button>

                                  {adminView && canOpenRefundFlow && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning mr-1"
                                      onClick={() =>
                                        navigate(
                                          `/shop/orders/refund/${order.id}`,
                                        )
                                      }
                                    >
                                      Hoàn tiền
                                    </button>
                                  )}

                                  {!adminView && (
                                    <>
                                      {canOpenBankTransfer(order) &&
                                        (!hasSubmittedBankTransfer(order.id) ? (
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-warning mr-1"
                                            onClick={() =>
                                              navigate(
                                                `/shop/bank-transfer/${order.id}`,
                                              )
                                            }
                                          >
                                            Chuyển khoản ngay
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary mr-1"
                                            title="Bạn đã báo chuyển khoản, vui lòng chờ admin xác nhận."
                                            disabled
                                          >
                                            Chờ xác nhận
                                          </button>
                                        ))}

                                      {canCancelOrderStatus(
                                        order.orderStatus,
                                      ) && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-danger mr-1"
                                          onClick={() =>
                                            handleCancelOrder(order)
                                          }
                                        >
                                          Huỷ đơn
                                        </button>
                                      )}

                                      {canUserConfirmRefundReceived(order) && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-success mr-1"
                                          onClick={() =>
                                            handleConfirmRefundReceived(order)
                                          }
                                        >
                                          Xác nhận hoàn tiền
                                        </button>
                                      )}

                                      {isWaitingAdminRefundTransfer(order) && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary mr-1"
                                          disabled
                                        >
                                          Chờ Admin hoàn tiền
                                        </button>
                                      )}

                                      {canRequestReturn(order) &&
                                        !returnRequestedIds.has(order.id) &&
                                        !hasOpenReturnRequest(
                                          orderHistoryMap[order.id] || [],
                                          orderActivityMap[order.id] || [],
                                        ) && (
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-warning mr-1"
                                            onClick={() =>
                                              handleOpenReturnModal(order.id)
                                            }
                                            title={
                                              returnRequestedIds.has(
                                                order.id,
                                              ) ||
                                              (orderHistoryMap[order.id] &&
                                                hasOpenReturnRequest(
                                                  orderHistoryMap[order.id],
                                                  orderActivityMap[order.id] ||
                                                    [],
                                                ))
                                                ? "Đang chờ admin phản hồi"
                                                : "Yêu cầu hoàn hàng hoặc hoàn tiền"
                                            }
                                            disabled={
                                              returnRequestedIds.has(
                                                order.id,
                                              ) ||
                                              (orderHistoryMap[order.id] &&
                                                hasOpenReturnRequest(
                                                  orderHistoryMap[order.id],
                                                  orderActivityMap[order.id] ||
                                                    [],
                                                ))
                                            }
                                          >
                                            Hoàn/Trả
                                          </button>
                                        )}

                                      {canReceiveOrderStatus(
                                        order.orderStatus,
                                      ) && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-success ml-1"
                                          onClick={() =>
                                            handleReceiveOrder(order)
                                          }
                                        >
                                          Đã nhận hàng
                                        </button>
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>

                              {expandedOrderId === order.id && (
                                <tr>
                                  <td colSpan={adminView ? "9" : "7"}>
                                    {loadingDetailsId === order.id && (
                                      <div className="text-muted py-2">
                                        Đang tải chi tiết đơn hàng...
                                      </div>
                                    )}

                                    {loadingDetailsId !== order.id && (
                                      <OrderDetailContent
                                        order={order}
                                        details={
                                          orderDetailsMap[order.id] || []
                                        }
                                        history={
                                          orderHistoryMap[order.id] || []
                                        }
                                        activityLogs={
                                          orderActivityMap[order.id] || []
                                        }
                                        bill={orderBillMap[order.id] || null}
                                        reviewByOrderItemId={
                                          orderReviewMap[order.id] || {}
                                        }
                                        onOpenReview={
                                          adminView
                                            ? undefined
                                            : handleOpenReviewModal
                                        }
                                      />
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex flex-wrap justify-content-center align-items-end mt-3">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ShopShell>

      <FilterCriteriaModal
        show={showFilterModal}
        title="Tiêu chí lọc đơn hàng"
        onClose={() => setShowFilterModal(false)}
        onApply={applyFiltersFromModal}
        onReset={handleResetFilters}
      >
        <div className="form-row">
          <div className="form-group col-md-12">
            <label>Từ khóa</label>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo mã đơn, tên người nhận..."
              value={filterDraft.keywordInput}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  keywordInput: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group col-md-6">
            <label>Trạng thái đơn</label>
            <select
              className="form-control"
              value={filterDraft.orderStatus}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  orderStatus: event.target.value,
                }))
              }
            >
              {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                <option
                  key={option.value || "all-order-status"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Trạng thái thanh toán</label>
            <select
              className="form-control"
              value={filterDraft.paymentStatus}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  paymentStatus: event.target.value,
                }))
              }
            >
              {PAYMENT_STATUS_FILTER_OPTIONS.map((option) => (
                <option
                  key={option.value || "all-payment-status"}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Từ ngày</label>
            <input
              type="date"
              className="form-control"
              value={filterDraft.fromDate}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  fromDate: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group col-md-6">
            <label>Đến ngày</label>
            <input
              type="date"
              className="form-control"
              value={filterDraft.toDate}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group col-md-6 mb-0">
            <label>Hiển thị mỗi trang</label>
            <select
              className="form-control"
              value={filterDraft.pageSize}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  pageSize: Number(event.target.value) || 8,
                }))
              }
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </FilterCriteriaModal>

      <ModalFrame
        show={showReturnModal}
        title="Yêu cầu hoàn hàng / hoàn tiền"
        onClose={() => setShowReturnModal(false)}
        zIndex={1055}
        backdropZIndex={1050}
        closeDisabled={submittingReturn}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowReturnModal(false)}
              disabled={submittingReturn}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handleSubmitReturnRequest}
              disabled={submittingReturn || !returnReason.trim()}
            >
              {submittingReturn ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </>
        }
      >
        <p className="text-muted mb-3">
          Đơn hàng <strong>#{returnOrderId}</strong> Vui lòng mô tả lý do yêu
          cầu hoàn/trả đề admin xem xét và phản hồi sớm nhất.
        </p>
        <div className="form-group">
          <label htmlFor="returnReasonInput">
            Lý do <span className="text-danger">*</span>
          </label>
          <textarea
            id="returnReasonInput"
            className="form-control"
            rows={4}
            placeholder="Ví dụ: Hàng bị hỏng, sai sản phẩm, chưa nhận được hàng..."
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
            disabled={submittingReturn}
          />
        </div>
        <small className="text-muted">
          Sau khi gửi, admin sẽ xét duyệt yêu cầu. Bạn có thể theo dõi kết quả
          trong lịch sử trạng thái đơn hàng.
        </small>
      </ModalFrame>

      <ModalFrame
        show={showReviewModal}
        title="Đánh giá sản phẩm"
        onClose={() => setShowReviewModal(false)}
        zIndex={1065}
        backdropZIndex={1060}
        closeDisabled={submittingReview}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowReviewModal(false)}
              disabled={submittingReview}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitReview}
              disabled={submittingReview || !reviewTarget}
            >
              {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </>
        }
      >
        <p className="text-muted mb-3">
          Bạn đang đánh giá <strong>{reviewTarget?.productName}</strong>. M�i
          sản phẩm trong đơn chỉ được đánh giá một lần.
        </p>

        <div className="form-group">
          <label>Số sao</label>
          <div>
            {[1, 2, 3, 4, 5].map((ratingValue) => (
              <button
                key={ratingValue}
                type="button"
                className="btn btn-link p-0 mr-1"
                onClick={() => setReviewRating(ratingValue)}
                disabled={submittingReview}
                aria-label={`${ratingValue} sao`}
              >
                <i
                  className={`fa-star ${
                    ratingValue <= reviewRating
                      ? "fas text-primary"
                      : "far text-muted"
                  }`}
                  style={{ fontSize: "24px" }}
                ></i>
              </button>
            ))}
            <span className="ml-2 text-muted">{reviewRating}/5 sao</span>
          </div>
        </div>

        <div className="form-group mb-0">
          <label htmlFor="reviewCommentInput">Bình luận</label>
          <textarea
            id="reviewCommentInput"
            className="form-control"
            rows={4}
            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            disabled={submittingReview}
            maxLength={1000}
          />
          <small className="text-muted">
            {reviewComment.length}/1000 ký tự
          </small>
        </div>
      </ModalFrame>

      <ModalFrame
        show={showCancelModal}
        title="Huỷ đơn hàng & Hoàn tiền"
        onClose={() => setShowCancelModal(false)}
        zIndex={1065}
        backdropZIndex={1060}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowCancelModal(false)}
            >
              Huỷ bỏ
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmCancelWithRefund}
            >
              Xác nhận Huỷ
            </button>
          </>
        }
      >
        <p className="text-muted mb-3">
          Bạn đang huỷ đơn hàng <strong>#{cancelOrderTarget?.id}</strong>. Đơn
          hàng này đã được thanh toán và bạn sẽ được hoàn lại{" "}
          <strong>{formatPrice(cancelOrderTarget?.totalAmount || 0)}</strong>.
          Vui lòng chọn phương thức nhận tiền:
        </p>

        <div className="form-group mb-3">
          <label className="d-block mb-2 font-weight-bold">
            Phương thức hoàn tiền
          </label>
          <div className="custom-control custom-radio mb-2">
            <input
              type="radio"
              id="refundWallet"
              name="refundMethod"
              className="custom-control-input"
              value="Wallet"
              checked={refundMethod === "Wallet"}
              onChange={() => setRefundMethod("Wallet")}
            />
            <label className="custom-control-label" htmlFor="refundWallet">
              <strong>Hoàn tiền vào số dư Ví</strong>
              <small className="d-block text-muted">
                Tiền sẽ được cộng ngay lập tức vào Ví điện tử của bạn trên hệ
                thống.
              </small>
            </label>
          </div>
          <div className="custom-control custom-radio">
            <input
              type="radio"
              id="refundQR"
              name="refundMethod"
              className="custom-control-input"
              value="QR"
              checked={refundMethod === "QR"}
              onChange={() => setRefundMethod("QR")}
            />
            <label className="custom-control-label" htmlFor="refundQR">
              <strong>Hoàn tiền qua mã QR / Chuyển khoản</strong>
              <small className="d-block text-muted">
                Hệ thống sẽ chuyển yêu cầu này sang danh sách chờ để Admin
                chuyển tiền lại cho bạn qua Ngân hàng.
              </small>
            </label>
          </div>
        </div>

        {refundMethod === "QR" && (
          <div className="form-group mt-3 p-3 bg-light rounded">
            <label className="font-weight-bold">
              Chọn tài khoản/QR nhận tiền
            </label>
            {refundQrs.length > 0 ? (
              <select
                className="form-control"
                value={refundQrId}
                onChange={(e) => setRefundQrId(e.target.value)}
              >
                {refundQrs.map((qr) => (
                  <option key={qr.id} value={qr.id}>
                    {qr.bankName} - {qr.accountNumber} ({qr.accountName}){" "}
                    {qr.isDefault ? " [Mặc định]" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="alert alert-warning mb-0 p-2">
                Bạn chưa lưu mã QR/Tài khoản ngân hàng nào. Vui lòng vào trang{" "}
                <strong>Ví của tôi</strong> để thêm thông tin tài khoản trước
                khi chọn phương thức này.
              </div>
            )}
          </div>
        )}
      </ModalFrame>
    </>
  );
};

export default ShopOrders;
