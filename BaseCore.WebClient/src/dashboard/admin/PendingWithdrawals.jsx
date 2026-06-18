import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { walletApi } from "../../services/api";
import { currencyFormatter, getPagedMeta } from "../../utils/shopDataUtils";
import { formatDateTime } from "../../utils/orderDataUtils";

const PendingWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalData, setQrModalData] = useState({
    displayName: "",
    qrImageUrl: "",
    tx: null,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const parseDescription = (desc) => {
    if (!desc) return { displayName: "Không rõ", qrImageUrl: "" };
    let displayName = "Không rõ";
    let qrImageUrl = "";

    // Extract display name
    const nameMatch = desc.match(
      /Yêu cầu rút tiền về tài khoản:\s*(.*?)(?:\.\s*Link QR:|$)/i,
    );
    if (nameMatch) {
      displayName = nameMatch[1].trim();
    }

    // Extract QR image url
    const qrMatch = desc.match(/Link QR:\s*(.*)/i);
    if (qrMatch) {
      qrImageUrl = qrMatch[1].split("|")[0].trim();
    }

    return { displayName, qrImageUrl };
  };

  const loadPendingWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await walletApi.getPendingWithdrawals({
        page,
        pageSize,
      });
      const payload = response?.data ?? {};
      setWithdrawals(payload.items || []);

      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: (payload.items || []).length,
      });
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setWithdrawals([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(
        loadError.response?.data?.message ||
          "Không thể tải danh sách yêu cầu rút tiền.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadPendingWithdrawals();
  }, [loadPendingWithdrawals]);

  const handleApprove = async (id, amount, reference) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn duyệt rút tiền ${currencyFormatter.format(Math.abs(amount))} cho giao dịch ${reference}? \nHãy đảm bảo bạn đã thực hiện chuyển tiền thành công cho khách hàng.`,
    );
    if (!confirm) return;

    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await walletApi.approveWithdrawal(id);
      setSuccess(res.data?.message || "Đã duyệt yêu cầu rút tiền thành công.");
      window.dispatchEvent(new Event("wallet-withdrawal-updated"));
      await loadPendingWithdrawals();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Lỗi hệ thống khi duyệt yêu cầu rút tiền.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, amount, reference) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn từ chối yêu cầu rút tiền ${currencyFormatter.format(Math.abs(amount))} cho giao dịch ${reference}? \nTiền sẽ được hoàn trả lại vào ví của người dùng.`,
    );
    if (!confirm) return;

    setProcessingId(id);
    setError("");
    setSuccess("");

    try {
      const res = await walletApi.rejectWithdrawal(id);
      setSuccess(
        res.data?.message ||
          "Đã từ chối yêu cầu rút tiền. Số tiền đã được hoàn trả lại ví user.",
      );
      window.dispatchEvent(new Event("wallet-withdrawal-updated"));
      await loadPendingWithdrawals();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Lỗi hệ thống khi từ chối yêu cầu rút tiền.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenQrModal = (tx) => {
    const parsed = parseDescription(tx.description);
    setQrModalData({
      displayName: parsed.displayName,
      qrImageUrl: parsed.qrImageUrl,
      tx: tx,
    });
    setShowQrModal(true);
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý rút tiền</h1>
            </div>
            <div className="col-sm-6 text-right">
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadPendingWithdrawals}
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
              <h5>
                <i className="icon fas fa-check"></i> Thành công!
              </h5>
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
              <h5>
                <i className="icon fas fa-ban"></i> Lỗi!
              </h5>
              {error}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Yêu cầu rút tiền chờ duyệt</h3>
              <div className="card-tools">
                <select
                  className="form-control"
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value) || 10);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
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
                      <th>Mã rút tiền</th>
                      <th>Ví nguồn</th>
                      <th>Tài khoản nhận tiền</th>
                      <th className="text-right">Số tiền rút</th>
                      <th>Thời gian tạo</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "320px" }} className="text-center">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted">
                          Không có yêu cầu rút tiền nào đang chờ duyệt.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((tx) => {
                        const { displayName, qrImageUrl } = parseDescription(
                          tx.description,
                        );
                        return (
                          <tr key={tx.transactionId}>
                            <td>{tx.transactionId}</td>
                            <td>
                              <strong>{tx.referenceId || "-"}</strong>
                            </td>
                            <td>
                              <small className="text-secondary">
                                {tx.walletId ? `W-${tx.walletId}` : "-"}
                              </small>
                            </td>
                            <td>
                              <div>{displayName}</div>
                              {qrImageUrl && (
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline-primary"
                                  onClick={() => handleOpenQrModal(tx)}
                                >
                                  Xem QR Nhận Tiền
                                </button>
                              )}
                            </td>
                            <td className="text-right">
                              {currencyFormatter.format(Math.abs(tx.amount))}
                            </td>
                            <td>{formatDateTime(tx.createdAt)}</td>
                            <td>
                              <span>Chờ duyệt</span>
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-success mr-3"
                                disabled={processingId === tx.transactionId}
                                onClick={() =>
                                  handleApprove(
                                    tx.transactionId,
                                    tx.amount,
                                    tx.referenceId,
                                  )
                                }
                              >
                                Duyệt rút tiến
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
              <div className="text-muted mb-2 mb-md-0">
                Tổng yêu cầu rút tiền: <strong>{totalCount}</strong>
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

      {/* Modal hiển thị mã QR nhận tiền của User */}
      {showQrModal && qrModalData.tx && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="font-weight-bold">
                  Thông tin QR Nhận Tiền của User
                </h5>
                <button
                  type="button"
                  className="close text-black"
                  onClick={() => setShowQrModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body text-center">
                <div className="text-center">Mã QR</div>
                {qrModalData.qrImageUrl ? (
                  <div className="p-3 border d-inline-block mb-3">
                    <img
                      src={qrModalData.qrImageUrl}
                      alt="User Refund QR"
                      style={{ maxHeight: "300px", objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <div className="alert alert-warning py-3">
                    Không có ảnh QR đi kèm.
                  </div>
                )}

                <div className="text-left border rounded p-3 bg-light">
                  <div className="mb-2">
                    <span className="text-muted small">Tài khoản nhận:</span>
                    <br />
                    <strong>{qrModalData.displayName}</strong>
                  </div>
                  <div>
                    <span className="text-muted small">Số tiền:</span>
                    <br />
                    <strong>
                      {currencyFormatter.format(
                        Math.abs(qrModalData.tx.amount),
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted small">Mã rút tiền:</span>
                    <br />
                    <strong>{qrModalData.tx.referenceId}</strong>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success font-weight-bold"
                  onClick={async () => {
                    setShowQrModal(false);
                    await handleApprove(
                      qrModalData.tx.transactionId,
                      qrModalData.tx.amount,
                      qrModalData.tx.referenceId,
                    );
                  }}
                >
                  Duyệt rút tiền
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showQrModal && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1050 }}
        ></div>
      )}
    </div>
  );
};

export default PendingWithdrawals;
