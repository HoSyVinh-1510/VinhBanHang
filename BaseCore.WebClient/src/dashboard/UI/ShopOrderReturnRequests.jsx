import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { orderApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  currencyFormatter,
  getPagedMeta,
  mapApiList,
} from "../../utils/shopDataUtils";
import {
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  normalizeOrder,
  normalizeActivityLog,
  normalizeStatusHistory,
  hasOpenReturnRequest,
  getReturnRequestReason,
  canUserConfirmRefundReceived,
  isWaitingAdminRefundTransfer,
  ORDER_STATUS,
  PAYMENT_STATUS,
  REFUND_PAYMENT_STATUSES,
} from "../../utils/orderDataUtils";

// Tìm phản hồi của admin sau khi xử lý yêu cầu hoàn/trả
// (entry trong lịch sử có note bắt đầu bằng [ReturnRequest][Resolved])
const findAdminResolution = (history = []) => {
  const sorted = [...history].sort(
    (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
  );
  for (const h of sorted) {
    const note = (h.note || "").trim();
    if (note.startsWith("[ReturnRequest][Resolved]")) {
      return {
        approved: h.newStatus !== ORDER_STATUS.CANCELLED,
        note: note.replace("[ReturnRequest][Resolved]", "").trim(),
        changedAt: h.changedAt,
      };
    }
  }
  return null;
};

const findAdminResolutionFromActivities = (activityLogs = []) => {
  const sorted = [...activityLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  for (const activityLog of sorted) {
    if (activityLog.activityType === "ReturnRequestApproved") {
      return {
        approved: true,
        note: activityLog.description || "",
        changedAt: activityLog.createdAt,
      };
    }

    if (activityLog.activityType === "ReturnRequestRejected") {
      return {
        approved: false,
        note: activityLog.description || "",
        changedAt: activityLog.createdAt,
      };
    }
  }
  return null;
};

// Badge màu trạng thái đơn
const orderStatusBadgeClass = (status) => {
  switch (status) {
    case ORDER_STATUS.RETURN_REQUESTED:
      return "badge-warning";
    case ORDER_STATUS.RETURNED:
      return "badge-info";
    case ORDER_STATUS.COMPLETED:
      return "badge-success";
    case ORDER_STATUS.CANCELLED:
      return "badge-danger";
    default:
      return "badge-secondary";
  }
};

const ShopOrderReturnRequests = () => {
  useMultiShopStyles();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [success, setSuccess] = useState("");

  // Lịch sử trạng thái của từng đơn (đề lấy lý do và phản hồi admin)
  const [historyMap, setHistoryMap] = useState({});
  const [activityMap, setActivityMap] = useState({});
  const [loadingHistoryIds, setLoadingHistoryIds] = useState(new Set());

  // Lấy đơn ReturnRequested + Returned (chưa hoàn tiền xong) đề user theo dõi toàn bộ flow
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const commonParams = {
        sortBy: "createdAt",
        sortDirection: "desc",
        page,
        pageSize,
      };

      // Gọi song song: đơn đang chờ duyệt + đơn đã duyệt (Returned)
      const [returnRequestedRes, returnedRes] = await Promise.allSettled([
        orderApi.getMyOrders({
          ...commonParams,
          orderStatus: ORDER_STATUS.RETURN_REQUESTED,
        }),
        orderApi.getMyOrders({
          ...commonParams,
          orderStatus: ORDER_STATUS.RETURNED,
        }),
      ]);

      const getItems = (result) => {
        if (result.status !== "fulfilled") return [];
        const payload = result.value?.data ?? {};
        return mapApiList(payload).map(normalizeOrder);
      };

      const requestedItems = getItems(returnRequestedRes);
      const returnedItems = getItems(returnedRes);

      // Gộp và loại trùng theo order ID
      const mergedMap = new Map();
      [...requestedItems, ...returnedItems].forEach((order) => {
        if (order.id && !mergedMap.has(order.id)) {
          mergedMap.set(order.id, order);
        }
      });
      const allItems = [...mergedMap.values()].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      // Tính tổng từ cả hai response
      const getMeta = (result) => {
        if (result.status !== "fulfilled") return 0;
        const payload = result.value?.data ?? {};
        const meta = getPagedMeta(payload, { page, pageSize, fallbackCount: 0 });
        return meta.totalCount;
      };
      const combinedCount = getMeta(returnRequestedRes) + getMeta(returnedRes);

      setOrders(allItems);
      setTotalCount(combinedCount);
      setTotalPages(Math.max(1, Math.ceil(combinedCount / pageSize)));
    } catch {
      setError("Không thể tải danh sách yêu cầu hoàn/trả.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Tự động tải lịch sử đơn hàng đề lấy lý do + phản hồi admin
  useEffect(() => {
    orders.forEach((order) => {
      if (historyMap[order.id] !== undefined) return;
      if (loadingHistoryIds.has(order.id)) return;

      setLoadingHistoryIds((prev) => new Set(prev).add(order.id));

      orderApi
        .getById(order.id)
        .then((res) => {
          const payload = res?.data ?? {};
          const history = Array.isArray(payload.statusHistory)
            ? payload.statusHistory.map(normalizeStatusHistory)
            : [];
          const activityLogs = Array.isArray(payload.activityLogs)
            ? payload.activityLogs.map(normalizeActivityLog)
            : [];
          setHistoryMap((prev) => ({ ...prev, [order.id]: history }));
          setActivityMap((prev) => ({ ...prev, [order.id]: activityLogs }));
        })
        .catch(() => {
          setHistoryMap((prev) => ({ ...prev, [order.id]: [] }));
        })
        .finally(() => {
          setLoadingHistoryIds((prev) => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
          });
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleShopSearchSubmit = (event) => {
    event.preventDefault();
    if (searchInput.trim()) {
      navigate(`/shop/list?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleConfirmRefundReceived = async (order) => {
    if (!order?.id || !canUserConfirmRefundReceived(order)) {
      return;
    }

    if (!window.confirm(`Bạn xác nhận đã nhận được tiền hoàn cho đơn #${order.id}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await orderApi.confirmRefundReceived(order.id);
      setSuccess(`Đã xác nhận nhận tiền hoàn cho đơn #${order.id}. Cảm ơn bạn!`);
      await loadOrders();
    } catch (refundError) {
      setError(refundError.response?.data?.message || "Không thể xác nhận đã nhận tiền hoàn.");
    }
  };

  return (
    <ShopShell
      activeRoute="return-requests"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin()}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleShopSearchSubmit}
    >
      <div className="container-fluid pb-5">
        <div className="row px-xl-5 pt-4 pb-2">
          <div className="col-12">
            <h4 className="mb-1">Yêu cầu hoàn hàng / hoàn tiền của tôi</h4>
            Danh sách có: {totalCount} yêu cầu
          </div>
        </div>

        {success && (
          <div className="row px-xl-5 mb-3">
            <div className="col-12">
              <div className="alert alert-success">{success}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="row px-xl-5 mb-3">
            <div className="col-12">
              <div className="alert alert-danger">{error}</div>
            </div>
          </div>
        )}

        <div className="row px-xl-5">
          <div className="col-12">
            <div className="bg-light p-3">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: "80px" }}>Mã đơn</th>
                      <th style={{ width: "145px" }}>Ngày tạo</th>
                      <th>Người nhận</th>
                      <th style={{ width: "160px" }}>Trạng thái</th>
                      <th className="text-right" style={{ width: "130px" }}>
                        Tổng tiền
                      </th>
                      <th>Lý do yêu cầu</th>
                      <th style={{ width: "250px" }}>Phản hồi từ Admin</th>
                      <th className="text-center" style={{ width: "160px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan="8" className="text-center py-5">
                          <div className="spinner-border text-warning"></div>
                          <div className="text-muted mt-2 small">
                            Đang tải...
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && orders.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-5 text-muted">
                          <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                          Bạn chưa có yêu cầu hoàn/trả nào.
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      orders.map((order) => {
                        const history = historyMap[order.id];
                        const loadingHistory = loadingHistoryIds.has(order.id);
                        const activityLogs = activityMap[order.id] || [];
                        const returnReason = history
                          ? getReturnRequestReason(history, activityLogs)
                          : null;
                        const isStillOpen = history
                          ? hasOpenReturnRequest(history, activityLogs)
                          : true;
                        const resolution = !isStillOpen
                          ? findAdminResolutionFromActivities(activityLogs) ||
                            findAdminResolution(history)
                          : null;

                        return (
                          <tr key={order.id}>
                            <td>
                              <strong>#{order.id}</strong>
                            </td>
                            <td>
                              <small>{formatDateTime(order.createdAt)}</small>
                            </td>
                            <td>
                              <div>{order.receiverName || ""}</div>
                              <small className="text-muted">
                                {order.phone || ""}
                              </small>
                            </td>
                            <td>
                              <span
                                className={`badge ${orderStatusBadgeClass(order.orderStatus)}`}
                              >
                                {formatOrderStatus(order.orderStatus)}
                              </span>
                              <div>
                                <small className="text-muted">
                                  {formatPaymentStatus(order.paymentStatus)}
                                  {order.paymentMethod
                                    ? ` · ${order.paymentMethod}`
                                    : ""}
                                </small>
                              </div>
                            </td>
                            <td className="text-right font-weight-bold">
                              {currencyFormatter.format(order.totalAmount)}
                            </td>
                            <td>
                              {loadingHistory ? (
                                <small className="text-muted">
                                  Đang tải...
                                </small>
                              ) : returnReason ? (
                                <small className="text-dark">
                                  {returnReason}
                                </small>
                              ) : (
                                <small className="text-muted font-italic">
                                  Không có lý do
                                </small>
                              )}
                            </td>
                            <td>
                              {loadingHistory ? (
                                <small className="text-muted">
                                  Đang tải...
                                </small>
                              ) : resolution ? (
                                <div>
                                  <span
                                    className={`badge ${resolution.approved ? "badge-success" : "badge-danger"} mb-1`}
                                  >
                                    {resolution.approved
                                      ? " Đã duyệt"
                                      : " Từ chối"}
                                  </span>
                                  {resolution.note && (
                                    <div>
                                      <small className="text-muted">
                                        {resolution.note}
                                      </small>
                                    </div>
                                  )}
                                  <div>
                                    <small className="text-muted">
                                      {formatDateTime(resolution.changedAt)}
                                    </small>
                                  </div>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center">
                                  <span
                                    className="spinner-grow spinner-grow-sm text-warning mr-1"
                                    role="status"
                                  ></span>
                                  <small className="text-muted">
                                    Đang chờ xử lý
                                  </small>
                                </div>
                              )}
                            </td>
                            <td className="text-center">
                              {canUserConfirmRefundReceived(order) && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success font-weight-bold"
                                  onClick={() => handleConfirmRefundReceived(order)}
                                >
                                  <i className="fas fa-check mr-1"></i>
                                  Đã nhận tiền
                                </button>
                              )}
                              {isWaitingAdminRefundTransfer(order) && (
                                <span className="badge badge-info">
                                  Chờ Admin hoàn tiền
                                </span>
                              )}
                              {order.paymentStatus === PAYMENT_STATUS.REFUNDED && (
                                <span className="badge badge-success">
                                  Đã hoàn tiền
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-wrap justify-content-center align-items-end mt-3">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>

            {/* Hướng dẫn */}
            <div className="bg-light border-top p-3 mt-0">
              <p className="mb-1 small text-muted">
                <i className="fas fa-info-circle text-primary mr-1"></i>
                Sau khi gửi yêu cầu, admin sẽ xem xét và phản hồi trong thời
                gian sớm nhất.
              </p>
              <p className="mb-0 small text-muted">
                Nếu yêu cầu được duyệt, bạn sẽ được hoàn tiền.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ShopShell>
  );
};

export default ShopOrderReturnRequests;

