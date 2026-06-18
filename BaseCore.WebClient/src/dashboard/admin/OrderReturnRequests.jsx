import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate } from "react-router-dom";
import { orderApi } from "../../services/api";
import {
  PAYMENT_STATUS,
  formatDateTime,
  formatOrderStatus,
  formatPaymentStatus,
  normalizeOrder,
} from "../../utils/orderDataUtils";
import { currencyFormatter } from "../../utils/shopDataUtils";

const OrderReturnRequests = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const loadReturnRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await orderApi.getReturnRequests({
        keyword: keyword.trim() || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
      });

      const payload = response?.data ?? {};
      const rawItems = Array.isArray(payload.items) ? payload.items : [];

      setItems(
        rawItems.map((item) => ({
          order: normalizeOrder(item.order ?? {}),
          returnRequestNote: item.returnRequestNote ?? "",
          returnRequestAt: item.returnRequestAt ?? "",
          returnRequestByUserId: item.returnRequestByUserId ?? "",
        })),
      );

      setTotalCount(Number(payload.totalCount ?? 0) || 0);
      setTotalPages(Number(payload.totalPages ?? 1) || 1);
    } catch (loadErr) {
      setError(
        loadErr.response?.data?.message ||
          "Không thể tải danh sách yêu cầu hoàn/trả.",
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, paymentStatusFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    loadReturnRequests();
  }, [loadReturnRequests]);

  const parseReturnNote = (raw) => {
    if (!raw) return "";
    return raw
      .replace("[ReturnRequest][Open]", "")
      .replace("[ReturnRequest][Resolved]", "")
      .trim();
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput);
  };

  const handleResetFilter = () => {
    setKeywordInput("");
    setKeyword("");
    setPaymentStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setPageSize(15);
  };

  const handleOpenReject = (orderId) => {
    setRejectOrderId(orderId);
    setRejectNote("");
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    if (!rejectOrderId) return;
    setSubmittingReject(true);
    setError("");
    setSuccess("");

    try {
      await orderApi.resolveReturnRequest(
        rejectOrderId,
        false,
        rejectNote.trim() || undefined,
      );
      setSuccess(`Đã từ chối yêu cầu hoàn/trả cho đơn #${rejectOrderId}.`);
      window.dispatchEvent(new Event("order-return-request-updated"));
      window.dispatchEvent(new Event("admin-orders-updated"));
      setShowRejectModal(false);
      await loadReturnRequests();
    } catch (resolveErr) {
      setError(
        resolveErr.response?.data?.message || "Không thể xử lý yêu cầu.",
      );
      await loadReturnRequests();
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <>
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0">Yêu cầu hoàn trả</h1>
              </div>
              <div className="col-sm-6 text-right text-muted">
                Đang chờ xử lý: <strong>{totalCount}</strong>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid pb-3 admin-return-page">
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
                    <div className="form-group col-md-4 mb-2">
                      <label className="mb-1">Tìm kiếm từ khoá</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Mã đơn, user, người nhận..."
                        value={keywordInput}
                        onChange={(event) =>
                          setKeywordInput(event.target.value)
                        }
                      />
                    </div>

                    <div className="form-group col-md-2 mb-2">
                      <label className="mb-1">Thanh toán</label>
                      <select
                        className="form-control"
                        value={paymentStatusFilter}
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
                        <option value={PAYMENT_STATUS.PAID}>
                          Đã thanh toán
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

                    <div className="form-group col-md-2 mb-2">
                      <label className="mb-1">Số dòng</label>
                      <select
                        className="form-control"
                        value={pageSize}
                        onChange={(event) => {
                          setPage(1);
                          setPageSize(Number(event.target.value) || 10);
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
                        Xóa lọc
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={loadReturnRequests}
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
                        <div className="spinner-border text-warning"></div>
                      </div>
                    ) : (
                      <table className="table table-bordered table-hover mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: "100px" }}>Mã đơn</th>
                            <th style={{ width: "180px" }}>Ngày yêu cầu</th>
                            <th style={{ width: "200px" }}>Khách hàng</th>
                            <th style={{ width: "200px" }}>Trạng thái đơn</th>
                            <th
                              className="text-right"
                              style={{ width: "150px" }}
                            >
                              Tổng tiền
                            </th>
                            <th>Lý do hoàn/trả</th>
                            <th
                              className="text-center"
                              style={{ width: "250px" }}
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td
                                colSpan="7"
                                className="text-center py-4 text-muted"
                              >
                                Không có yêu cầu hoàn/trả nào đang chờ xử lý.
                              </td>
                            </tr>
                          ) : (
                            items.map
                            (
                              ({
                                order,
                                returnRequestNote,
                                returnRequestAt,
                                returnRequestByUserId,
                              }) => (
                                <tr key={order.id}>
                                  <td>
                                    <strong>#{order.id}</strong>
                                  </td>
                                  <td>{formatDateTime(returnRequestAt)}</td>
                                  <td>
                                    <div>{order.receiverName || "-"}</div>
                                    <small className="text-muted">
                                      {returnRequestByUserId ||
                                        order.userId ||
                                        "-"}
                                    </small>
                                  </td>
                                  <td>
                                    <span className="badge badge-warning">
                                      {formatOrderStatus(order.orderStatus)}
                                    </span>
                                    <div>
                                      <small className="text-muted">
                                        {formatPaymentStatus(
                                          order.paymentStatus,
                                        )}{" "}
                                        · {order.paymentMethod || "-"}
                                      </small>
                                    </div>
                                  </td>
                                  <td className="text-right">
                                    {currencyFormatter.format(
                                      order.totalAmount,
                                    )}
                                  </td>
                                  <td>
                                    <small>
                                      {parseReturnNote(returnRequestNote) || (
                                        <em className="text-muted">
                                          Không có lý do
                                        </em>
                                      )}
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success mr-1"
                                      onClick={() =>
                                        navigate(
                                          `/orders/refund/${order.id}?fromReturnRequest=1`,
                                        )
                                      }
                                      title="Duyệt và chuyển sang trang hoàn tiền"
                                    >
                                      <i className="fas fa-check mr-1"></i>
                                      Đồng ý
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      onClick={() => handleOpenReject(order.id)}
                                      title="Từ chối yêu cầu"
                                    >
                                      <i className="fas fa-times mr-1"></i>
                                      Từ chối
                                    </button>
                                  </td>
                                </tr>
                              )
                            )
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {totalPages > 1 && (  
                    <div className="card-footer d-flex flex-wrap justify-content-end align-items-center">
                      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showRejectModal && ( 
        <div
          className="modal fade show"
          style={{ display: "block", zIndex: 1055 }}
          tabIndex="-1"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5>
                  Từ chối yêu cầu hoàn/trả - Đơn #{rejectOrderId}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submittingReject}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="rejectNoteInput">
                    Ghi chú (không bắt buộc)
                  </label>
                  <textarea
                    id="rejectNoteInput"
                    className="form-control"
                    rows={3}
                    placeholder="Lý do từ chối..."
                    value={rejectNote}
                    onChange={(event) => setRejectNote(event.target.value)}
                    disabled={submittingReject}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSubmitReject}
                  disabled={submittingReject}
                >
                  {submittingReject ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRejectModal && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1050 }}
        ></div>
      )}
    </>
  );
};

export default OrderReturnRequests;
