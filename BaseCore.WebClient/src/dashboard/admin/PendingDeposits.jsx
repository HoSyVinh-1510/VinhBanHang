import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { walletApi } from "../../services/api";
import { currencyFormatter, getPagedMeta } from "../../utils/shopDataUtils";
import { formatDateTime } from "../../utils/orderDataUtils";

const PendingDeposits = () => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadPendingDeposits = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await walletApi.getPendingDeposits({ page, pageSize });
      const payload = response?.data ?? {};
      setDeposits(payload.items || []);

      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: (payload.items || []).length,
      });
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setDeposits([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(
        loadError.response?.data?.message ||
          "Không thể tải danh sách yêu cầu nạp tiền.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadPendingDeposits();
  }, [loadPendingDeposits]);

  const handleApprove = async (id, amount, reference) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn duyệt nạp tiền ${currencyFormatter.format(amount)} cho giao dịch ${reference}?`,
    );
    if (!confirm) return;

    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await walletApi.approveDeposit(id);
      setSuccess(res.data?.message || "Đã duyệt yêu cầu nạp tiền thành công.");
      window.dispatchEvent(new Event("wallet-deposit-updated"));
      await loadPendingDeposits();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Lỗi hệ thống khi duyệt yêu cầu nạp tiền.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, amount, reference) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn từ chối yêu cầu nạp tiền ${currencyFormatter.format(amount)} cho giao dịch ${reference}?`,
    );
    if (!confirm) return;

    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await walletApi.rejectDeposit(id);
      setSuccess(res.data?.message || "Đã từ chối yêu cầu nạp tiền.");
      window.dispatchEvent(new Event("wallet-deposit-updated"));
      await loadPendingDeposits();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Lỗi hệ thống khi từ chối yêu cầu nạp tiền.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Quản lý nạp tiền</h1>
            </div>
            <div className="col-sm-6 text-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadPendingDeposits}
                disabled={loading}
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid pb-3">
          {success && (
            <div className="alert alert-success alert-dismissible">
              <button
                type="button"
                className="close"
                onClick={() => setSuccess("")}
              >
                &times;
              </button>
              <h5>Thành công!</h5>
              {success}
            </div>
          )}

          {error && (
            <div className="alert alert-danger alert-dismissible">
              <button
                type="button"
                className="close"
                onClick={() => setError("")}
              >
                &times;
              </button>
              <h5>Lỗi!</h5>
              {error}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <b>Yêu cầu nạp tiền chờ duyệt</b>
              </h3>
              <div className="card-tools">
                <label>Phân trang</label>
                <select
                  className="form-control"
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value) || 20);
                  }}
                >
                  <option value={10}>10 / Trang</option>
                  <option value={20}>20 / Trang</option>
                  <option value={50}>50 / Trang</option>
                </select>
              </div>
            </div>

            <div className="card-body table-responsive p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Đang tải...</span>
                  </div>
                </div>
              ) : (
                <table className="table table-bordered table-hover mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>ID</th>
                      <th>Mã nạp tiền</th>
                      <th>Ví nhận</th>
                      <th className="text-right">Số tiền nạp</th>
                      <th>Mô tả / Ghi chú</th>
                      <th>Thời gian tạo</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "300px" }} className="text-center">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted">
                          Không có yêu cầu nạp tiền nào đang chờ duyệt.
                        </td>
                      </tr>
                    ) : (
                      deposits.map((tx) => (
                        <tr key={tx.transactionId}>
                          <td>{tx.transactionId}</td>
                          <td>{tx.referenceId || "-"}</td>
                          <td>
                            <small className="text-secondary">
                              W-{tx.walletId || "-"}
                            </small>
                          </td>
                          <td>{currencyFormatter.format(tx.amount) || "0"}</td>
                          <td>{tx.description}</td>
                          <td>{formatDateTime(tx.createdAt)}</td>
                          <td>Chờ duyệt</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-success mr-2"
                              disabled={processingId === tx.transactionId}
                              onClick={() =>
                                handleApprove(
                                  tx.transactionId,
                                  tx.amount,
                                  tx.referenceId,
                                )
                              }
                            >
                              Duyệt nạp tiền
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={processingId === tx.transactionId}
                              onClick={() =>
                                handleReject(
                                  tx.transactionId,
                                  tx.amount,
                                  tx.referenceId,
                                )
                              }
                            >
                              Từ chối
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
              <div className="text-muted mb-2 mb-md-0">
                Tổng yêu cầu nạp tiền: <strong>{totalCount}</strong>
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PendingDeposits;
