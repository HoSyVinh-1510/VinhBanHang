import React, { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { Link, useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api";
import {
  currencyFormatter,
  getPagedMeta,
  mapApiList,
} from "../../utils/shopDataUtils";
import {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  canQuickConfirmTransfer,
  findLatestBankTransferSubmission,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  normalizeActivityLog,
  normalizeOrder,
} from "../../utils/orderDataUtils";

const OrderTransferConfirmations = () => {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyWaitingPayment, setOnlyWaitingPayment] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingOrderId, setProcessingOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [transferSubmissionMap, setTransferSubmissionMap] = useState({});
  const [loadingTransferSubmissionIds, setLoadingTransferSubmissionIds] =
    useState(new Set());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await orderApi.getAll({
        keyword: keyword.trim() || undefined,
        orderStatus: undefined,
        paymentStatus: onlyWaitingPayment
          ? PAYMENT_STATUS.PENDING
          : paymentStatusFilter || undefined,
        paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sortBy: "createdAt",
        sortDirection: "desc",
        page,
        pageSize,
      });

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
          "Không thể tải danh sách đơn chuyển khoản.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    keyword,
    onlyWaitingPayment,
    paymentStatusFilter,
    fromDate,
    toDate,
    page,
    pageSize,
  ]);

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

          const activityLogs = mapApiList(
            payload?.activityLogs,
          ).map(normalizeActivityLog);

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

  const waitingToConfirmCount = useMemo(
    () =>
      orders.filter((order) => {
        const submission = transferSubmissionMap[order.id];
        return (
          canQuickConfirmTransfer(order) && Boolean(submission?.submittedAt)
        );
      }).length,
    [orders, transferSubmissionMap],
  );

  const handleQuickConfirm = async (order) => {
    if (!order?.id || !canQuickConfirmTransfer(order)) {
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

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput);
  };

  const handleResetFilter = () => {
    setKeywordInput("");
    setKeyword("");
    setOnlyWaitingPayment(true);
    setPaymentStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setPageSize(20);
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Xác nhận chuyển khoản</h1>
            </div>
            <div className="col-sm-6 text-right text-muted">
              Đơn chờ xác nhận: <strong>{waitingToConfirmCount}</strong>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid pb-3 admin-transfer-page">
          {success && (
            <div className="row">
              <div className="col-12">
                <div className="alert alert-success">{success}</div>
              </div>
            </div>
          )}
          {error && (
            <div className="row">
              <div className="col-12">
                <div className="alert alert-danger">{error}</div>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col-12">
              <div className="card card-body mb-3">
                <form
                  className="form-row align-items-end"
                  onSubmit={handleFilterSubmit}
                >
                  <div className="form-group col-md-3 mb-2">
                    <label className="mb-1">Tìm kiếm</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Mã đơn, user, SĐT..."
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                  </div>

                  <div className="form-group col-md-2 mb-2">
                    <label className="mb-1">Lọc nhanh</label>
                    <div>
                      <button
                        type="button"
                        className={`btn btn-sm mr-2 ${onlyWaitingPayment ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => {
                          setPage(1);
                          setOnlyWaitingPayment(true);
                          setPaymentStatusFilter("");
                        }}
                      >
                        Chờ duyệt
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${!onlyWaitingPayment ? "btn-secondary" : "btn-outline-secondary"}`}
                        onClick={() => {
                          setPage(1);
                          setOnlyWaitingPayment(false);
                        }}
                      >
                        Tất cả
                      </button>
                    </div>
                  </div>

                  <div className="form-group col-md-2 mb-2">
                    <label className="mb-1">Thanh toán</label>
                    <select
                      className="form-control"
                      value={
                        onlyWaitingPayment
                          ? PAYMENT_STATUS.PENDING
                          : paymentStatusFilter
                      }
                      disabled={onlyWaitingPayment}
                      onChange={(event) => {
                        setPage(1);
                        setPaymentStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả thanh toán</option>
                      <option value={PAYMENT_STATUS.PENDING}>
                        Chờ xác nhận
                      </option>
                      <option value={PAYMENT_STATUS.UNPAID}>
                        Chưa thanh toán
                      </option>
                      <option value={PAYMENT_STATUS.PAID}>Đã thanh toán</option>
                      <option value={PAYMENT_STATUS.FAILED}>
                        Thanh toán lỗi
                      </option>
                      <option value={PAYMENT_STATUS.REFUNDED}>
                        Đã hoàn tiền
                      </option>
                    </select>
                  </div>

                  <div className="form-group col-md-2 mb-2">
                    <label className="mb-1">Từ ngày</label>
                    <input
                      type="date"
                      className="form-control"
                      value={fromDate}
                      onChange={(event) => {
                        setPage(1);
                        setFromDate(event.target.value);
                      }}
                    />
                  </div>

                  <div className="form-group col-md-2 mb-2">
                    <label className="mb-1">Đến ngày</label>
                    <input
                      type="date"
                      className="form-control"
                      value={toDate}
                      onChange={(event) => {
                        setPage(1);
                        setToDate(event.target.value);
                      }}
                    />
                  </div>

                  <div className="form-group col-md-1 mb-2">
                    <label className="mb-1">Số lượng</label>
                    <select
                      className="form-control"
                      value={pageSize}
                      onChange={(event) => {
                        setPage(1);
                        setPageSize(Number(event.target.value) || 20);
                      }}
                    >
                      <option value={10}>10 /Trang</option>
                      <option value={20}>20 /Trang</option>
                      <option value={50}>50 /Trang</option>
                    </select>
                  </div>

                  <div className="form-group col-md-12 mb-2 text-right">
                    <button type="submit" className="btn btn-primary mr-2">
                      Lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary mr-2"
                      onClick={handleResetFilter}
                    >
                      Xoá lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-success mr-2"
                      onClick={loadOrders}
                    >
                      Làm mới
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card mb-3">
                <div className="card-body table-responsive p-0">
                  {loading ? (
                    <div className="text-center py-5">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="sr-only">Đang tải...</span>
                      </div>
                    </div>
                  ) : (
                    <table className="table table-bordered table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "80px" }}>Mã đơn</th>
                          <th style={{ width: "150px" }}>Ngày tạo</th>
                          <th style={{ width: "120px" }}>Khách hàng</th>
                          <th style={{ width: "150px" }}>Người nhận đơn</th>
                          <th style={{ width: "120px" }}>Số điện thoại</th>
                          <th style={{ width: "120px" }}>Tổng tiền</th>
                          <th style={{ width: "130px" }}>Trạng thái đơn</th>
                          <th style={{ width: "170px" }}>
                            Trạng thái thanh toán
                          </th>
                          <th style={{ width: "150px" }}>User Đã chuyển</th>
                          <th style={{ width: "190px" }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 && (
                          <tr>
                            <td
                              colSpan={10}
                              className="text-center py-4 text-muted"
                            >
                              Không có đơn chuyển khoản phù hợp.
                            </td>
                          </tr>
                        )}

                        {orders.map((order) => {
                          const quickConfirmable =
                            canQuickConfirmTransfer(order);
                          const transferSubmission =
                            transferSubmissionMap[order.id];
                          const hasSubmittedTransfer = Boolean(
                            transferSubmission?.submittedAt,
                          );
                          const loadingSubmission =
                            loadingTransferSubmissionIds.has(order.id);
                          return (
                            <tr key={order.id}>
                              <td>
                                <strong>#{order.id}</strong>
                              </td>
                              <td>{formatDateTime(order.createdAt)}</td>
                              <td>{order.userId || "-"}</td>
                              <td>{order.receiverName || "-"}</td>
                              <td>{order.phone || "-"}</td>
                              <td className="text-right">
                                {currencyFormatter.format(order.totalAmount)}
                              </td>
                              <td>{formatOrderStatus(order.orderStatus)}</td>
                              <td>
                                {formatPaymentStatus(order.paymentStatus)}
                              </td>
                              <td>
                                {loadingSubmission ? (
                                  <small className="text-muted">
                                    Đang tải...
                                  </small>
                                ) : hasSubmittedTransfer ? (
                                  <div>
                                    <small className="d-block text-success font-weight-bold">
                                      Đã báo chuyển
                                    </small>
                                    <small className="d-block text-muted">
                                      {formatDateTime(
                                        transferSubmission.submittedAt,
                                      )}
                                    </small>
                                  </div>
                                ) : (
                                  <small className="text-muted">
                                    Chưa báo chuyển
                                  </small>
                                )}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${quickConfirmable ? "btn-success" : "btn-secondary"}`}
                                  disabled={
                                    !quickConfirmable ||
                                    !hasSubmittedTransfer ||
                                    processingOrderId === order.id
                                  }
                                  onClick={() => handleQuickConfirm(order)}
                                  title={
                                    hasSubmittedTransfer
                                      ? "Xác nhận đã nhận tiền chuyển khoản"
                                      : "Chờ user bấm 'Đã chuyển khoản'"
                                  }
                                >
                                  {processingOrderId === order.id
                                    ? "Đang xác nhận..."
                                    : "Xác nhận đã nhận tiền"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
                  <div className="text-muted mb-2 mb-md-0">
                    Tổng đơn chuyển khoản: <strong>{totalCount}</strong>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrderTransferConfirmations;
