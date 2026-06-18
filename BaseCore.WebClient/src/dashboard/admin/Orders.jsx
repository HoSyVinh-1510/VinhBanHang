import React, { useCallback, useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api";
import FilterCriteriaModal from "../UI/components_UI/FilterCriteriaModal";
import OrderDetailModal from "../UI/components_UI/OrderDetailModal";
import {
  currencyFormatter,
  getPagedMeta,
  mapApiList,
} from "../../utils/shopDataUtils";
import {
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  canAdminSubmitRefundTransfer,
  getAdminOrderStatusActions,
  getAdminPaymentStatusActions,
  normalizeActivityLog,
  normalizeBill,
  normalizeOrder,
  normalizeOrderDetail,
  normalizeOrderStatus,
  normalizeStatusHistory,
} from "../../utils/orderDataUtils";
import CouponDetailModal from "../UI/components_UI/CouponDetailModal";

const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái đơn" },
  ...ORDER_STATUS_OPTIONS,
];

const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "Tất cả trạng thái thanh toán" },
  ...PAYMENT_STATUS_OPTIONS,
];

const DEFAULT_FILTERS = {
  keyword: "",
  orderStatus: "",
  paymentStatus: "",
  paymentMethod: "",
  fromDate: "",
  toDate: "",
  minTotal: "",
  maxTotal: "",
  sortBy: "createdAt",
  sortDirection: "desc",
};

const DEFAULT_PAGE_SIZE = 10;

const createFilterDraft = (overrides = {}) => ({
  ...DEFAULT_FILTERS,
  pageSize: DEFAULT_PAGE_SIZE,
  ...overrides,
});

const buildQueryParams = (filters, page, pageSize) => ({
  keyword: filters.keyword.trim() || undefined,
  orderStatus: filters.orderStatus || undefined,
  paymentStatus: filters.paymentStatus || undefined,
  paymentMethod: filters.paymentMethod || undefined,
  fromDate: filters.fromDate || undefined,
  toDate: filters.toDate || undefined,
  minTotal: filters.minTotal ? Number(filters.minTotal) : undefined,
  maxTotal: filters.maxTotal ? Number(filters.maxTotal) : undefined,
  sortBy: filters.sortBy,
  sortDirection: filters.sortDirection,
  page,
  pageSize,
});

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDraft, setFilterDraft] = useState(createFilterDraft());
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState([]);
  const [selectedOrderHistory, setSelectedOrderHistory] = useState([]);
  const [selectedOrderActivityLogs, setSelectedOrderActivityLogs] = useState(
    [],
  );
  const [selectedOrderBill, setSelectedOrderBill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [couponCodeForModal, setCouponCodeForModal] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await orderApi.getAll(
        buildQueryParams(filters, page, pageSize),
      );
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
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const patchFilterDraft = useCallback((patch) => {
    setFilterDraft((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const updateDraftField = useCallback(
    (field) => (event) => {
      patchFilterDraft({ [field]: event.target.value });
    },
    [patchFilterDraft],
  );

  const updateDraftPageSize = useCallback(
    (event) => {
      patchFilterDraft({
        pageSize: Number(event.target.value) || DEFAULT_PAGE_SIZE,
      });
    },
    [patchFilterDraft],
  );

  const openFilterModal = () => {
    setFilterDraft(createFilterDraft({ ...filters, pageSize }));
    setShowFilterModal(true);
  };

  const applyFiltersFromModal = () => {
    const {
      pageSize: draftPageSize,
      keyword,
      orderStatus,
      paymentStatus,
      paymentMethod,
      fromDate,
      toDate,
      minTotal,
      maxTotal,
      sortBy,
      sortDirection,
    } = filterDraft;

    setFilters({
      ...DEFAULT_FILTERS,
      keyword: keyword || "",
      orderStatus: orderStatus || "",
      paymentStatus: paymentStatus || "",
      paymentMethod: paymentMethod || "",
      fromDate: fromDate || "",
      toDate: toDate || "",
      minTotal: minTotal || "",
      maxTotal: maxTotal || "",
      sortBy: sortBy || DEFAULT_FILTERS.sortBy,
      sortDirection: sortDirection || DEFAULT_FILTERS.sortDirection,
    });
    setPageSize(Number(draftPageSize) || DEFAULT_PAGE_SIZE);
    setPage(1);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPageSize(DEFAULT_PAGE_SIZE);
    setFilterDraft(createFilterDraft());
    setPage(1);
  };

  const handleOpenDetail = async (orderId) => {
    setLoadingDetail(true);
    setError("");

    try {
      const response = await orderApi.getById(orderId);
      const payload = response?.data ?? {};

      setSelectedOrder(normalizeOrder(payload?.order ?? {}));
      setSelectedOrderDetails(
        mapApiList(payload?.details).map(normalizeOrderDetail),
      );
      setSelectedOrderHistory(
        mapApiList(payload?.statusHistory).map(normalizeStatusHistory),
      );
      setSelectedOrderActivityLogs(
        mapApiList(payload?.activityLogs).map(normalizeActivityLog),
      );
      setSelectedOrderBill(payload?.bill ? normalizeBill(payload?.bill) : null);
      setShowDetailModal(true);
    } catch (detailError) {
      setError(
        detailError.response?.data?.message ||
          "Không thể tải chi tiết đơn hàng.",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const clearOrderDetailState = useCallback(() => {
    setSelectedOrder(null);
    setSelectedOrderDetails([]);
    setSelectedOrderHistory([]);
    setSelectedOrderActivityLogs([]);
    setSelectedOrderBill(null);
  }, []);

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    clearOrderDetailState();
  };

  const openCouponModal = (code) => {
    if (!code) return;
    setCouponCodeForModal(code);
  };

  const closeCouponModal = () => {
    setCouponCodeForModal(null);
  };

  const reloadCurrentDetailIfNeeded = async (orderId) => {
    if (!showDetailModal || selectedOrder?.id !== orderId) {
      return;
    }

    await handleOpenDetail(orderId);
  };

  const refreshOrdersAndDetail = async (orderId) => {
    await loadOrders();
    await reloadCurrentDetailIfNeeded(orderId);
  };

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
      window.dispatchEvent(new Event("admin-orders-updated"));
      await refreshOrdersAndDetail(order.id);
    } catch (updateError) {
      setError(
        updateError.response?.data?.message ||
          "Không thể cập nhật trạng thái đơn hàng.",
      );
      await refreshOrdersAndDetail(order.id);
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
      window.dispatchEvent(new Event("order-transfer-updated"));
      window.dispatchEvent(new Event("admin-orders-updated"));
      await refreshOrdersAndDetail(order.id);
    } catch (updateError) {
      setError(
        updateError.response?.data?.message ||
          "Không thể cập nhật trạng thái thanh toán.",
      );
      await refreshOrdersAndDetail(order.id);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  return (
    <>
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Quản lý đơn hàng</h1>
              </div>
              <div className="col-sm-6 text-right text-muted">
                Tổng đơn: <strong>{totalCount}</strong> đơn
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid pb-3 admin-orders-page">
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
                <div className="card card-body mb-3 d-flex flex-wrap justify-content-between align-items-center">
                  <div className="mb-2 mb-md-0">
                    <button
                      type="button"
                      className="btn btn-primary mr-2"
                      onClick={openFilterModal}
                    >
                      Lọc đơn
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleResetFilters}
                    >
                      Xoá lọc
                    </button>
                  </div>
                  <small className="text-muted">
                    Hiển thị: <strong>{pageSize}</strong> đơn/trang
                  </small>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="card mb-3">
                  <div className="card-body table-responsive p-0">
                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary"></div>
                      </div>
                    ) : (
                      <table className="table table-bordered table-hover mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: "40px" }}>ID</th>
                            <th style={{ width: "130px" }}>Ngày tạo</th>
                            <th style={{ width: "100px" }}>Khách hàng</th>
                            <th style={{ width: "160px" }}>Người nhận</th>
                            <th style={{ width: "150px" }}>Trạng thái đơn</th>
                            <th style={{ width: "170px" }}>Thanh toán</th>
                            <th style={{ width: "120px" }}>Phương thức</th>
                            <th
                              className="text-right"
                              style={{ width: "100px" }}
                            >
                              Tổng tiền
                            </th>
                            <th
                              style={{ width: "120px" }}
                              className="text-center"
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.length === 0 ? (
                            <tr>
                              <td
                                colSpan="9"
                                className="text-center py-4 text-muted"
                              >
                                Không có đơn hàng phù hợp.
                              </td>
                            </tr>
                          ) : (
                            orders.map((order) => {
                              const orderStatusActions =
                                getAdminOrderStatusActions(order);
                              const paymentStatusActions =
                                getAdminPaymentStatusActions(order);
                              const canOpenRefundFlow =
                                canAdminSubmitRefundTransfer(order) ||
                                normalizeOrderStatus(order.orderStatus) ===
                                  ORDER_STATUS.RETURN_REQUESTED;
                              return (
                                <tr key={order.id}>
                                  <td>
                                    <strong>{order.id}</strong>
                                  </td>
                                  <td>{formatDateTime(order.createdAt)}</td>
                                  <td>{order.userId || "-"}</td>
                                  <td>
                                    <div>
                                      Tên: {order.receiverName || "-"}
                                      <br></br>
                                      <small className="text-muted">
                                        SĐT: {order.phone || "-"}
                                      </small>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="font-weight-bold">
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
                                  </td>

                                  <td>
                                    <div className="font-weight-bold mb-1">
                                      {formatPaymentStatus(order.paymentStatus)}
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
                                  </td>
                                  <td>
                                    {order.deliveryMethod === "Pickup" ? (
                                      <p>
                                        Nhận hàng: <b>Lấy tại quán</b>
                                      </p>
                                    ) : (
                                      <p>
                                        Nhận hàng:
                                        <b>Giao tận nơi</b>
                                      </p>
                                    )}
                                    Thanh toán:{" "}
                                    <b>{order.paymentMethod || "-"}</b>
                                  </td>
                                  <td className="text-right">
                                    {currencyFormatter.format(
                                      order.totalAmount,
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-info w-100 mb-1"
                                      onClick={() => handleOpenDetail(order.id)}
                                      disabled={loadingDetail}
                                    >
                                      Chi tiết đơn
                                    </button>
                                    {canOpenRefundFlow && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-warning w-100"
                                        onClick={() =>
                                          navigate(`/orders/refund/${order.id}`)
                                        }
                                      >
                                        Hoàn tiền
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
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
        </section>
      </div>

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
              placeholder="Tìm mã đơn, user, người nhận..."
              value={filterDraft.keyword}
              onChange={updateDraftField("keyword")}
            />
          </div>

          <div className="form-group col-md-4">
            <label>Trạng thái đơn</label>
            <select
              className="form-control"
              value={filterDraft.orderStatus}
              onChange={updateDraftField("orderStatus")}
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

          <div className="form-group col-md-4">
            <label>Trạng thái thanh toán</label>
            <select
              className="form-control"
              value={filterDraft.paymentStatus}
              onChange={updateDraftField("paymentStatus")}
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

          <div className="form-group col-md-4">
            <label>Phương thức thanh toán</label>
            <select
              className="form-control"
              value={filterDraft.paymentMethod}
              onChange={updateDraftField("paymentMethod")}
            >
              <option value="">Tất cả phương thức</option>
              {PAYMENT_METHOD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-3">
            <label>Tổng tiền từ</label>
            <input
              type="number"
              className="form-control"
              min="0"
              value={filterDraft.minTotal}
              onChange={updateDraftField("minTotal")}
            />
          </div>

          <div className="form-group col-md-3">
            <label>Tổng tiền đến</label>
            <input
              type="number"
              className="form-control"
              min="0"
              value={filterDraft.maxTotal}
              onChange={updateDraftField("maxTotal")}
            />
          </div>

          <div className="form-group col-md-3">
            <label>Từ ngày</label>
            <input
              type="date"
              className="form-control"
              value={filterDraft.fromDate}
              onChange={updateDraftField("fromDate")}
            />
          </div>

          <div className="form-group col-md-3">
            <label>Đến ngày</label>
            <input
              type="date"
              className="form-control"
              value={filterDraft.toDate}
              onChange={updateDraftField("toDate")}
            />
          </div>

          <div className="form-group col-md-4 mb-0">
            <label>Sắp xếp theo</label>
            <select
              className="form-control"
              value={filterDraft.sortBy}
              onChange={updateDraftField("sortBy")}
            >
              <option value="createdAt">Sắp xếp theo ngày</option>
              <option value="id">Sắp xếp theo mã đơn</option>
              <option value="totalAmount">Sắp xếp theo tổng tiền</option>
              <option value="orderStatus">Sắp xếp theo trạng thái đơn</option>
              <option value="paymentStatus">Sắp xếp theo thanh toán</option>
            </select>
          </div>

          <div className="form-group col-md-4 mb-0">
            <label>Thứ tự</label>
            <select
              className="form-control"
              value={filterDraft.sortDirection}
              onChange={updateDraftField("sortDirection")}
            >
              <option value="desc">Giảm dần</option>
              <option value="asc">Tăng dần</option>
            </select>
          </div>

          <div className="form-group col-md-4 mb-0">
            <label>Hiển thị</label>
            <select
              className="form-control"
              value={filterDraft.pageSize}
              onChange={updateDraftPageSize}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>
      </FilterCriteriaModal>

      <OrderDetailModal
        show={showDetailModal}
        onClose={handleCloseDetail}
        order={selectedOrder}
        details={selectedOrderDetails}
        history={selectedOrderHistory}
        activityLogs={selectedOrderActivityLogs}
        bill={selectedOrderBill}
        onCouponClick={openCouponModal}
      />
      {couponCodeForModal && (
        <CouponDetailModal
          couponCode={couponCodeForModal}
          show={Boolean(couponCodeForModal)}
          onClose={closeCouponModal}
        />
      )}
    </>
  );
};

export default Orders;
