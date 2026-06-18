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
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  canOpenBankTransfer,
  findLatestBankTransferSubmission,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  isBankTransferMethod,
  normalizeActivityLog,
  normalizeOrder,
  normalizePaymentStatus,
} from "../../utils/orderDataUtils";

const paymentBadgeClass = (status) => {
  switch (status) {
    case "Paid":
      return "badge-success";
    case "Pending":
      return "badge-warning";
    case "Failed":
      return "badge-danger";
    case "Refunded":
      return "badge-info";
    default:
      return "badge-secondary";
  }
};

const ShopOrderTransferConfirmations = () => {
  useMultiShopStyles();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const adminView = isAdmin();
  const [searchInput, setSearchInput] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [transferSubmissionMap, setTransferSubmissionMap] = useState({});
  const [loadingTransferSubmissionIds, setLoadingTransferSubmissionIds] =
    useState(new Set());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const limit = 200;
      let fetchedOrders = [];

      if (adminView) {
        if (!showAll) {
          const p1 = orderApi.getAll({
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            paymentStatus: PAYMENT_STATUS.PENDING,
            pageSize: limit,
          });
          const p2 = orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
            pageSize: limit,
          });
          const [r1, r2] = await Promise.all([p1, p2]);
          const items1 = mapApiList(r1?.data ?? {}).map(normalizeOrder);
          const items2 = mapApiList(r2?.data ?? {}).map(normalizeOrder);
          fetchedOrders = [...items1, ...items2];
        } else {
          const p1 = orderApi.getAll({
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            pageSize: limit,
          });
          const p2 = orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
            pageSize: limit,
          });
          const p3 = orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.REFUND_TRANSFERRED,
            pageSize: limit,
          });
          const p4 = orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.REFUNDED,
            pageSize: limit,
          });
          const [r1, r2, r3, r4] = await Promise.all([p1, p2, p3, p4]);
          const items1 = mapApiList(r1?.data ?? {}).map(normalizeOrder);
          const items2 = mapApiList(r2?.data ?? {}).map(normalizeOrder);
          const items3 = mapApiList(r3?.data ?? {}).map(normalizeOrder);
          const items4 = mapApiList(r4?.data ?? {}).map(normalizeOrder);
          fetchedOrders = [...items1, ...items2, ...items3, ...items4];
        }
      } else {
        if (!showAll) {
          const p1 = orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.REFUND_TRANSFERRED,
            pageSize: limit,
          });
          const p2 = orderApi.getMyOrders({
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            pageSize: limit,
          });
          const [r1, r2] = await Promise.all([p1, p2]);
          const items1 = mapApiList(r1?.data ?? {}).map(normalizeOrder);
          const items2 = mapApiList(r2?.data ?? {}).map(normalizeOrder);
          fetchedOrders = [...items1, ...items2];
        } else {
          const p1 = orderApi.getMyOrders({
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            pageSize: limit,
          });
          const p2 = orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
            pageSize: limit,
          });
          const p3 = orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.REFUND_TRANSFERRED,
            pageSize: limit,
          });
          const p4 = orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.REFUNDED,
            pageSize: limit,
          });
          const [r1, r2, r3, r4] = await Promise.all([p1, p2, p3, p4]);
          const items1 = mapApiList(r1?.data ?? {}).map(normalizeOrder);
          const items2 = mapApiList(r2?.data ?? {}).map(normalizeOrder);
          const items3 = mapApiList(r3?.data ?? {}).map(normalizeOrder);
          const items4 = mapApiList(r4?.data ?? {}).map(normalizeOrder);
          fetchedOrders = [...items1, ...items2, ...items3, ...items4];
        }
      }

      const orderMap = new Map();
      fetchedOrders.forEach((o) => {
        if (o && o.id) {
          orderMap.set(o.id, o);
        }
      });

      let finalItems = Array.from(orderMap.values());

      if (adminView) {
        if (!showAll) {
          finalItems = finalItems.filter((o) => {
            const pStatus = normalizePaymentStatus(o.paymentStatus);
            return (
              (isBankTransferMethod(o.paymentMethod) &&
                pStatus === PAYMENT_STATUS.PENDING) ||
              pStatus === PAYMENT_STATUS.REFUND_PENDING
            );
          });
        } else {
          finalItems = finalItems.filter((o) => {
            const pStatus = normalizePaymentStatus(o.paymentStatus);
            return (
              isBankTransferMethod(o.paymentMethod) ||
              [
                PAYMENT_STATUS.REFUND_PENDING,
                PAYMENT_STATUS.REFUND_TRANSFERRED,
                PAYMENT_STATUS.REFUNDED,
              ].includes(pStatus)
            );
          });
        }
      } else {
        if (!showAll) {
          finalItems = finalItems.filter((o) => {
            const pStatus = normalizePaymentStatus(o.paymentStatus);
            return (
              pStatus === PAYMENT_STATUS.REFUND_TRANSFERRED ||
              canOpenBankTransfer(o)
            );
          });
        } else {
          finalItems = finalItems.filter((o) => {
            const pStatus = normalizePaymentStatus(o.paymentStatus);
            return (
              isBankTransferMethod(o.paymentMethod) ||
              [
                PAYMENT_STATUS.REFUND_PENDING,
                PAYMENT_STATUS.REFUND_TRANSFERRED,
                PAYMENT_STATUS.REFUNDED,
              ].includes(pStatus)
            );
          });
        }
      }

      finalItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const count = finalItems.length;
      setTotalCount(count);

      const calculatedTotalPages = Math.ceil(count / pageSize) || 1;
      setTotalPages(calculatedTotalPages);

      // Adjust page if current page exceeds total pages
      const activePage = page > calculatedTotalPages ? 1 : page;
      if (activePage !== page) {
        setPage(activePage);
      }

      const startIndex = (activePage - 1) * pageSize;
      const paginatedItems = finalItems.slice(
        startIndex,
        startIndex + pageSize,
      );

      setOrders(paginatedItems);
    } catch {
      setError("Không thể tải danh sách đơn hàng chuyển khoản.");
      setOrders([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [adminView, page, pageSize, showAll]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    orders.forEach((order) => {
      if (!order?.id) {
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

  const handleQuickConfirm = async (order) => {
    if (
      !order?.id ||
      normalizePaymentStatus(order.paymentStatus) !== PAYMENT_STATUS.PENDING
    ) {
      return;
    }

    const accepted = window.confirm(
      `Xác nhận đã nhận chuyển khoản cho đơn #${order.id} với số tiền ${currencyFormatter.format(order.totalAmount)}?`,
    );
    if (!accepted) {
      return;
    }

    setProcessingOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      await orderApi.updatePaymentStatus(order.id, PAYMENT_STATUS.PAID);
      setSuccess(`Đã xác nhận thanh toán chuyển khoản cho đơn #${order.id}.`);
      window.dispatchEvent(new Event("order-transfer-updated"));
      window.dispatchEvent(new Event("admin-orders-updated"));
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
    } catch (confirmError) {
      setError(
        confirmError.response?.data?.message ||
          "Không thể xác nhận thanh toán cho đơn hàng.",
      );
      await loadOrders();
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmRefundReceived = async (order) => {
    if (
      !order?.id ||
      normalizePaymentStatus(order.paymentStatus) !==
        PAYMENT_STATUS.REFUND_TRANSFERRED
    ) {
      return;
    }

    const accepted = window.confirm(
      `Xác nhận bạn đã nhận được tiền hoàn trả số tiền ${currencyFormatter.format(order.totalAmount)} cho đơn #${order.id}?`,
    );
    if (!accepted) {
      return;
    }

    setProcessingOrderId(order.id);
    setError("");
    setSuccess("");

    try {
      await orderApi.confirmRefundReceived(order.id);
      setSuccess(`Đã xác nhận nhận tiền hoàn trả cho đơn #${order.id}.`);
      window.dispatchEvent(new Event("order-transfer-updated"));
      window.dispatchEvent(new Event("user-orders-updated"));
      window.dispatchEvent(new Event("notifications-updated"));
      await loadOrders();
    } catch (confirmError) {
      setError(
        confirmError.response?.data?.message ||
          "Không thể xác nhận nhận tiền hoàn trả.",
      );
      await loadOrders();
    } finally {
      setProcessingOrderId(null);
    }
  };

  const pendingCount = orders.filter((o) => {
    if (adminView) {
      const pStatus = normalizePaymentStatus(o.paymentStatus);
      return (
        (isBankTransferMethod(o.paymentMethod) &&
          pStatus === PAYMENT_STATUS.PENDING) ||
        pStatus === PAYMENT_STATUS.REFUND_PENDING
      );
    } else {
      const pStatus = normalizePaymentStatus(o.paymentStatus);
      return (
        pStatus === PAYMENT_STATUS.REFUND_TRANSFERRED || canOpenBankTransfer(o)
      );
    }
  }).length;

  return (
    <ShopShell
      activeRoute="transfer-confirmations"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={adminView}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleShopSearchSubmit}
    >
      <div className="container-fluid pb-5">
        <div className="row px-xl-5 pt-4 pb-2">
          <div className="col-12">
            <h4 className="mb-1">Xác nhận chuyển khoản</h4>
            <p className="text-muted mb-0">
              {adminView
                ? "Các yêu cầu chuyển khoản của User."
                : "Các đơn hàng bạn đã chọn thanh toán bằng "}
              {!adminView && <strong>chuyển khoản ngân hàng</strong>}
              {pendingCount > 0 && !showAll && (
                <span className="badge badge-warning ml-2">
                  {pendingCount}{" "}
                  {adminView ? "đơn chờ duyệt" : "đơn chờ thanh toán/nhận tiền"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="row px-xl-5 mb-3">
          <div className="col-12">
            <div className="d-flex align-items-center">
              <button
                type="button"
                className={`btn btn-sm mr-2 ${!showAll ? "btn-primary" : ""}`}
                onClick={() => {
                  setShowAll(false);
                  setPage(1);
                }}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                className={`btn btn-sm mr-2 ${showAll ? "btn-primary" : ""}`}
                onClick={() => {
                  setShowAll(true);
                  setPage(1);
                }}
              >
                Tất cả
              </button>
              <span className="ml-auto text-muted small">
                Tổng: <strong>{totalCount}</strong> đơn
              </span>
            </div>
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
            <div className="bg-light p-3">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th>Mã đơn</th>
                      <th>Ngày tạo</th>
                      <th>Khách hàng</th>
                      <th>Người nhận</th>
                      <th style={{ width: "180px" }}>Trạng thái đơn</th>
                      <th style={{ width: "250px" }}>Thanh toán</th>
                      <th className="text-right" style={{ width: "150px" }}>
                        Tổng tiền
                      </th>
                      <th style={{ width: "200px" }}>Thời gian thanh toán</th>
                      <th className="text-center" style={{ width: "200px" }}>
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td
                          colSpan={adminView ? "9" : "8"}
                          className="text-center py-5"
                        >
                          <div className="spinner-border text-primary"></div>
                          <div className="text-muted mt-2 small">
                            Đang tải...
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={adminView ? "9" : "8"}
                          className="text-center py-5 text-muted"
                        >
                          <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                          {showAll
                            ? "Không có đơn chuyển khoản."
                            : "Không có yêu cầu chuyển khoản chờ duyệt."}
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      orders.map((order) => {
                        const canPay = canOpenBankTransfer(order);
                        const transferSubmission =
                          transferSubmissionMap[order.id];
                        const loadingSubmission =
                          loadingTransferSubmissionIds.has(order.id);

                        return (
                          <tr key={order.id}>
                            <td>
                              <strong>{order.id}</strong>
                            </td>
                            <td>{formatDateTime(order.createdAt)}</td>
                            <td>{order.userId || "-"}</td>
                            <td>
                              Tên: {order.receiverName || "-"}
                              <br></br>
                              SDT: {order.phone || ""}
                            </td>
                            <td>{formatOrderStatus(order.orderStatus)}</td>
                            <td>{formatPaymentStatus(order.paymentStatus)}</td>
                            <td>
                              {currencyFormatter.format(order.totalAmount)}
                            </td>
                            <td>
                              {loadingSubmission ? (
                                <small className="text-muted">
                                  Đang tải...
                                </small>
                              ) : transferSubmission?.submittedAt ? (
                                formatDateTime(transferSubmission.submittedAt)
                              ) : (
                                <small className="text-muted">
                                  Chưa báo chuyển
                                </small>
                              )}
                            </td>
                            <td className="text-center">
                              {adminView ? (
                                <>
                                  {normalizePaymentStatus(
                                    order.paymentStatus,
                                  ) === PAYMENT_STATUS.PENDING ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success font-weight-bold mr-1"
                                      disabled={processingOrderId === order.id}
                                      onClick={() => handleQuickConfirm(order)}
                                    >
                                      Xác nhận thanh toán
                                    </button>
                                  ) : normalizePaymentStatus(
                                      order.paymentStatus,
                                    ) === PAYMENT_STATUS.REFUND_PENDING ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning font-weight-bold mr-1"
                                      onClick={() =>
                                        navigate(
                                          `/shop/orders/refund/${order.id}`,
                                        )
                                      }
                                    >
                                      Hoàn tiền
                                    </button>
                                  ) : (
                                    <></>
                                  )}
                                </>
                              ) : (
                                <>
                                  {normalizePaymentStatus(
                                    order.paymentStatus,
                                  ) === PAYMENT_STATUS.REFUND_TRANSFERRED ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success font-weight-bold mr-1"
                                      disabled={processingOrderId === order.id}
                                      onClick={() =>
                                        handleConfirmRefundReceived(order)
                                      }
                                    >
                                      Xác nhận nhận tiền
                                    </button>
                                  ) : canPay ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-warning font-weight-bold mr-1"
                                      onClick={() =>
                                        navigate(
                                          `/shop/bank-transfer/${order.id}`,
                                        )
                                      }
                                    >
                                      Thanh toán
                                    </button>
                                  ) : null}
                                </>
                              )}
                            </td>
                          </tr>
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
  );
};

export default ShopOrderTransferConfirmations;
