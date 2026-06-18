import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { walletApi, userApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import { formatPrice } from "../../utils/shopDataUtils";
import Pagination from "../../components/shared/Pagination";

const BANK_TRANSFER_CONFIG = {
  bankId: "MB",
  bankName: "MBBank",
  accountNumber: "2215102005",
  accountName: "HoSyVinh",
};

const ShopWallet = () => {
  useMultiShopStyles();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(7);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  // Tab navigation
  const [activeTab, setActiveTab] = useState("deposit"); // "deposit" or "withdraw"

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState("");
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositError, setDepositError] = useState("");

  // Pending deposit details modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [currentDepositTx, setCurrentDepositTx] = useState(null);

  // Withdrawal form state
  const [refundQrs, setRefundQrs] = useState([]);
  const [selectedQrId, setSelectedQrId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  // Admin state
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [adminTotalCount, setAdminTotalCount] = useState(0);
  const [adminPage, setAdminPage] = useState(1);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [submittingAdminAction, setSubmittingAdminAction] = useState(false);

  const loadWalletInfo = useCallback(async () => {
    try {
      const res = await walletApi.getWallet();
      setWallet(res.data);
    } catch (err) {
      console.error("Failed to load wallet", err);
      setError("Không thể tải thông tin ví của bạn.");
    }
  }, []);

  const loadTransactionHistory = useCallback(
    async (p = 1) => {
      setLoadingHistory(true);
      try {
        const res = await walletApi.getTransactions({ page: p, pageSize });
        setTransactions(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        setPage(p);
      } catch (err) {
        console.error("Failed to load transactions", err);
      } finally {
        setLoadingHistory(false);
      }
    },
    [pageSize],
  );

  const loadAdminTransactions = useCallback(
    async (p = 1, type = "deposit") => {
      setLoadingAdmin(true);
      try {
        const apiCall =
          type === "deposit"
            ? walletApi.getPendingDeposits
            : walletApi.getPendingWithdrawals;

        const res = await apiCall({ page: p, pageSize });
        setAdminTransactions(res.data.items || []);
        setAdminTotalCount(res.data.totalCount || 0);
        setAdminPage(p);
      } catch (err) {
        console.error("Failed to load admin transactions", err);
      } finally {
        setLoadingAdmin(false);
      }
    },
    [pageSize],
  );

  const loadRefundQrs = useCallback(async () => {
    try {
      const res = await userApi.getMyRefundQrs();
      const items = res.data || [];
      setRefundQrs(items);
      const defaultQr = items.find((x) => x.isDefault) || items[0];
      if (defaultQr) {
        setSelectedQrId(String(defaultQr.id || defaultQr.userRefundQrId));
      }
    } catch (err) {
      console.error("Failed to load refund QRs", err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    await Promise.all([
      loadWalletInfo(),
      loadTransactionHistory(1),
      loadRefundQrs(),
    ]);
    setLoading(false);
  }, [loadWalletInfo, loadTransactionHistory, loadRefundQrs]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab === "admin-deposit") {
      loadAdminTransactions(1, "deposit");
    } else if (activeTab === "admin-withdraw") {
      loadAdminTransactions(1, "withdraw");
    }
  }, [activeTab, loadAdminTransactions]);

  const handleAdminApprove = async (id, type) => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu này?")) return;
    setSubmittingAdminAction(true);
    try {
      const apiCall =
        type === "deposit"
          ? walletApi.approveDeposit
          : walletApi.approveWithdrawal;
      await apiCall(id);
      alert("Duyệt yêu cầu thành công!");
      loadAdminTransactions(adminPage, type);
    } catch (err) {
      console.error("Failed to approve", err);
      alert(err.response?.data?.message || "Lỗi khi duyệt yêu cầu.");
    } finally {
      setSubmittingAdminAction(false);
    }
  };

  const handleAdminReject = async (id, type) => {
    if (!window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) return;
    setSubmittingAdminAction(true);
    try {
      const apiCall =
        type === "deposit"
          ? walletApi.rejectDeposit
          : walletApi.rejectWithdrawal;
      await apiCall(id);
      alert("Từ chối yêu cầu thành công!");
      loadAdminTransactions(adminPage, type);
    } catch (err) {
      console.error("Failed to reject", err);
      alert(err.response?.data?.message || "Lỗi khi từ chối yêu cầu.");
    } finally {
      setSubmittingAdminAction(false);
    }
  };

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

  const [isViewingExisting, setIsViewingExisting] = useState(false);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Vui lòng nhập số tiền nạp hợp lệ lớn hơn 0.");
      return;
    }

    if (amount < 10000) {
      setDepositError("Số tiền nạp tối thiểu là 10.000đ.");
      return;
    }

    setDepositError("");
    setIsViewingExisting(false);

    // Generate temporary reference ID for QR code (before API call)
    const tempReferenceId = `DEP-${Date.now()}`;

    // Set current tx to local state only (not saved in backend yet)
    setCurrentDepositTx({
      amount: amount,
      referenceId: tempReferenceId,
    });

    setShowDepositModal(true);
  };

  const handleConfirmDepositTransfer = async () => {
    setSubmittingDeposit(true);
    setDepositError("");

    try {
      // Call API to officially create transaction using the tempReferenceId
      const res = await walletApi.deposit({
        amount: currentDepositTx.amount,
        referenceId: currentDepositTx.referenceId,
      });

      if (res.data) {
        setShowDepositModal(false);
        setDepositAmount("");
        await loadAllData();
      }
    } catch (err) {
      console.error("Failed to request deposit", err);
      alert(
        err.response?.data?.message || "Lỗi hệ thống khi tạo yêu cầu nạp tiền.",
      );
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("Vui lòng nhập số tiền rút hợp lệ lớn hơn 0.");
      return;
    }

    if (amount < 10000) {
      setWithdrawError("Số tiền rút tối thiểu là 10.000đ.");
      return;
    }

    if (!wallet || wallet.balance < amount) {
      setWithdrawError("Số dư ví không đủ để rút số tiền này.");
      return;
    }

    if (!selectedQrId) {
      setWithdrawError("Vui lòng chọn tài khoản/QR nhận tiền.");
      return;
    }

    setSubmittingWithdraw(true);
    setWithdrawError("");
    setWithdrawSuccess("");

    try {
      const res = await walletApi.withdraw({
        amount,
        refundQrId: Number(selectedQrId),
      });
      setWithdrawSuccess(
        res.data?.message || "Đã gửi yêu cầu rút tiền thành công.",
      );
      setWithdrawAmount("");
      await Promise.all([loadWalletInfo(), loadTransactionHistory(1)]);
    } catch (err) {
      console.error("Failed to request withdrawal", err);
      setWithdrawError(
        err.response?.data?.message || "Lỗi hệ thống khi tạo yêu cầu rút tiền.",
      );
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const selectPresetAmount = (amount) => {
    setDepositAmount(amount.toString());
    setDepositError("");
  };

  const selectPresetAmount1 = (amount) => {
    setWithdrawAmount(amount.toString());
    withdrawAmount > 10000
      ? setWithdrawError("")
      : setDepositError("Withdrawal phải lớn hơn 10000đ");
  };

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

  const formatTxType = (type) => {
    switch (type) {
      case "Deposit":
        return <span className="badge badge-success">Nạp tiền</span>;
      case "Withdrawal":
        return <span className="badge badge-warning">Rút tiền</span>;
      case "Payment":
        return <span className="badge badge-danger">Thanh toán</span>;
      case "Refund":
        return <span className="badge badge-primary">Hoàn tiền</span>;
      default:
        return <span className="badge badge-secondary">{type}</span>;
    }
  };

  const formatTxStatus = (status) => {
    switch (status) {
      case "Pending":
        return <span className="badge badge-warning">Chờ duyệt</span>;
      case "Completed":
        return <span className="badge badge-success">Thành công</span>;
      case "Failed":
        return <span className="badge badge-danger">Thất bại</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getVietQrUrl = (tx) => {
    if (!tx) return "";
    const memo = tx.referenceId || `DEP${tx.transactionId}`;
    return `https://img.vietqr.io/image/${BANK_TRANSFER_CONFIG.bankId}-${BANK_TRANSFER_CONFIG.accountNumber}-compact2.png?amount=${tx.amount}&addInfo=${memo}&accountName=${encodeURIComponent(BANK_TRANSFER_CONFIG.accountName)}`;
  };

  const renderAdminTable = () => {
    const isDeposit = activeTab === "admin-deposit";
    const typeLabel = isDeposit ? "Nạp tiền" : "Rút tiền";
    const adminTotalPages = Math.ceil(adminTotalCount / pageSize);

    return (
      <div className="col-lg-7 mb-4 bg-light p-4 rounded shadow-sm h-100 d-flex flex-column border ">
        <h5 className="mb-4">Duyệt Yêu cầu {typeLabel}</h5>
        {loadingAdmin ? (
          <div className="text-center py-5">
            <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
            <p className="text-muted">Đang tải dữ liệu...</p>
          </div>
        ) : adminTransactions.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>
              Không có yêu cầu {typeLabel.toLowerCase()} nào đang chờ duyệt.
            </p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mã rút tiền</th>
                    <th>Ví nguồn</th>
                    <th>Tài khoản nhận tiền</th>
                    <th className="text-right">Số tiền rút</th>
                    <th>Thời gian tạo</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {adminTransactions.map((tx) => (
                    <tr key={tx.transactionId}>
                      <td>{tx.transactionId}</td>

                      <td>{tx.referenceId}</td>

                      <td>{tx.walletId ? `Ví ${tx.walletId}` : "-"}</td>

                      <td>
                        <div className="">
                          {parseDescription(tx.description).displayName}
                        </div>
                        {parseDescription(tx.description).qrImageUrl && (
                          <button
                            type="button"
                            className="btn btn-outline-info"
                            onClick={() => {
                              setCurrentDepositTx(tx);
                              setIsViewingExisting(true);
                              setShowDepositModal(true);
                            }}
                          >
                            Xem chi tiết
                          </button>
                        )}
                      </td>
                      <td>{formatPrice(Math.abs(tx.amount))}</td>

                      <td>{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>

                      <td>{formatTxStatus(tx.status)}</td>

                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-sm btn-success mr-2 mb-1"
                          disabled={submittingAdminAction}
                          onClick={() =>
                            handleAdminApprove(
                              tx.transactionId,
                              isDeposit ? "deposit" : "withdraw",
                            )
                          }
                        >
                          <i className="fas fa-check"></i> Duyệt
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger mb-1"
                          disabled={submittingAdminAction}
                          onClick={() =>
                            handleAdminReject(
                              tx.transactionId,
                              isDeposit ? "deposit" : "withdraw",
                            )
                          }
                        >
                          <i className="fas fa-times"></i> Từ chối
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adminTotalPages > 1 && (
              <Pagination
                page={adminPage}
                totalPages={adminTotalPages}
                onPageChange={(p) =>
                  loadAdminTransactions(p, isDeposit ? "deposit" : "withdraw")
                }
              />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <ShopShell
        activeRoute="wallet"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={isAdmin()}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      >
        <div className="container-fluid pb-5">
          {error && (
            <div className="row px-xl-5">
              <div className="col-12">
                <div className="alert alert-danger">{error}</div>
              </div>
            </div>
          )}

          <div className="row px-xl-5">
            <div className="col-lg-5 mb-5">
              <div className="rounded bg-white p-4 mb-5 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-uppercase tracking-wider font-weight-bold">
                    Ví của tôi
                  </span>
                  <div style={{ fontSize: "20px" }}>
                    Trạng thái:{" "}
                    <span className={wallet?.status}>{wallet?.status}</span>
                  </div>
                </div>

                <h2
                  className="font-weight-bold mb-1"
                  style={{ fontSize: "32px" }}
                >
                  {loading ? "..." : formatPrice(wallet?.balance ?? 0)}
                </h2>

                <p className="small mb-0 mt-3">
                  Mã ví: <b>W-{wallet?.walletId || "Pending"}</b>
                  <br></br>Thời gian cập nhật gần nhất:{" "}
                  {wallet?.updatedAt
                    ? new Date(wallet.updatedAt).toLocaleString("vi-VN")
                    : "-"}
                </p>
              </div>

              {/* Tab Navigation */}
              <div className="bg-light rounded shadow-sm mb-4 border">
                <div className="d-flex border-bottom bg-white flex-wrap">
                  <button
                    type="button"
                    className="btn btn-link flex-grow-1 text-center font-weight-bold"
                    onClick={() => {
                      setActiveTab("deposit");
                      setWithdrawError("");
                      setWithdrawSuccess("");
                    }}
                  >
                    Nạp tiền
                  </button>
                  <button
                    type="button"
                    className="btn btn-link flex-grow-1 text-center font-weight-bold"
                    onClick={() => {
                      setActiveTab("withdraw");
                      setDepositError("");
                    }}
                  >
                    Rút tiền
                  </button>

                  {isAdmin() && (
                    <>
                      <button
                        type="button"
                        className="btn btn-link flex-grow-1 text-center font-weight-bold"
                        onClick={() => setActiveTab("admin-deposit")}
                      >
                        Duyệt Nạp
                      </button>
                      <button
                        type="button"
                        className="btn btn-link flex-grow-1 text-center font-weight-bold"
                        onClick={() => setActiveTab("admin-withdraw")}
                      >
                        Duyệt Rút
                      </button>
                    </>
                  )}
                </div>

                <div
                  className="p-4 bg-light"
                  style={{ borderRadius: "0 0 4px 4px" }}
                >
                  {activeTab === "deposit" ? (
                    // Nạp tiền
                    <form onSubmit={handleDepositSubmit}>
                      <h4>Nạp tiền vào tài khoản</h4>
                      <p className="text-muted small">
                        Nhập số tiền bạn muốn nạp. Bạn sẽ thực hiện chuyển khoản
                        ngân hàng, Admin sẽ phê duyệt cho bạn.
                      </p>

                      {depositError && (
                        <div className="alert alert-danger py-2">
                          {depositError}
                        </div>
                      )}

                      <div className="form-group mb-3">
                        <label>Số tiền cần nạp (VND)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control form-control-lg text-primary font-weight-bold"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="Ví dụ: 100000"
                            min="10000"
                            step="1000"
                            disabled={
                              submittingDeposit || wallet?.status !== "Active"
                            }
                          />
                        </div>
                      </div>

                      {/* Preset Buttons */}
                      <div
                        className="d-flex flex-wrap gap-2 mb-4"
                        style={{ gap: "8px" }}
                      >
                        {[50000, 100000, 200000, 500000, 1000000].map(
                          (preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="btn btn-outline-secondary btn-sm font-weight-bold py-2 px-3"
                              onClick={() => selectPresetAmount(preset)}
                              disabled={
                                submittingDeposit || wallet?.status !== "Active"
                              }
                            >
                              {preset.toLocaleString("vi-VN")}
                            </button>
                          ),
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block font-weight-bold py-3"
                        disabled={
                          submittingDeposit ||
                          wallet?.status !== "Active" ||
                          !depositAmount
                        }
                      >
                        {submittingDeposit ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Đang tạo yêu cầu...
                          </>
                        ) : (
                          "Tạo yêu cầu nạp tiền"
                        )}
                      </button>
                    </form>
                  ) : activeTab === "withdraw" ? (
                    <form onSubmit={handleWithdrawSubmit}>
                      <h4>Rút tiền về ngân hàng</h4>
                      <p className="text-muted small">
                        Yêu cầu rút tiền từ số dư ví về tài khoản ngân hàng. Số
                        tiền rút sẽ tạm thời được khấu trừ ngay lập tức khỏi số
                        dư khả dụng và chờ Admin chuyển khoản cho bạn.
                      </p>

                      {withdrawSuccess && (
                        <div className="alert alert-success py-2">
                          {withdrawSuccess}
                        </div>
                      )}
                      {withdrawError && (
                        <div className="alert alert-danger py-2">
                          {withdrawError}
                        </div>
                      )}

                      <div className="form-group mb-3">
                        <label>Số tiền muốn rút (VND)</label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control form-control-lg text-primary font-weight-bold"
                            value={withdrawAmount}
                            onChange={(e) => {
                              setWithdrawAmount(e.target.value);
                              setWithdrawError("");
                            }}
                            placeholder="Ví dụ: 50000"
                            min="10000"
                            step="1000"
                            max={wallet?.balance || 0}
                            disabled={
                              submittingWithdraw ||
                              wallet?.status !== "Active" ||
                              !wallet ||
                              wallet.balance < 10000
                            }
                          />
                        </div>
                        {wallet && wallet.balance < 10000 && (
                          <small className="text-danger font-weight-bold mt-1 d-block">
                            Số dư khả dụng tối thiểu để rút tiền là 10.000đ.
                          </small>
                        )}
                      </div>
                      <div
                        className="d-flex flex-wrap gap-2 mb-4"
                        style={{ gap: "8px" }}
                      >
                        {[50000, 100000, 200000, 500000, 1000000].map(
                          (preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="btn btn-outline-secondary btn-sm font-weight-bold py-2 px-3"
                              onClick={() => selectPresetAmount1(preset)}
                              disabled={
                                submittingWithdraw ||
                                wallet?.status !== "Active" ||
                                !wallet ||
                                wallet.balance < 10000
                              }
                            >
                              {preset.toLocaleString("vi-VN")}
                            </button>
                          ),
                        )}
                      </div>

                      <div className="form-group mb-4">
                        <label>Chọn QR nhận tiền</label>
                        {refundQrs.length === 0 ? (
                          <div className="alert alert-warning py-2 mb-0 small">
                            Bạn chưa có QR nhận tiền nào.
                            <Link
                              to="/shop/profile"
                              className="font-weight-bold ml-1 text-primary"
                            >
                              Cập nhật QR nhận tiền tại đây &raquo;
                            </Link>
                          </div>
                        ) : (
                          <select
                            className="form-control form-control-lg "
                            value={selectedQrId}
                            onChange={(e) => setSelectedQrId(e.target.value)}
                            disabled={
                              submittingWithdraw || wallet?.status !== "Active"
                            }
                          >
                            <option value="">
                              -- Chọn QR nhận tiền của bạn --
                            </option>
                            {refundQrs.map((qr) => (
                              <option
                                key={qr.id || qr.userRefundQrId}
                                value={qr.id || qr.userRefundQrId}
                              >
                                {qr.displayName || "QR nhận tiền"}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-block font-weight-bold py-3"
                        disabled={
                          submittingWithdraw ||
                          wallet?.status !== "Active" ||
                          !withdrawAmount ||
                          refundQrs.length === 0 ||
                          !wallet ||
                          wallet.balance < 10000
                        }
                      >
                        {submittingWithdraw ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Đang xử lý yêu cầu...
                          </>
                        ) : (
                          "Gửi yêu cầu rút tiền"
                        )}
                      </button>
                    </form>
                  ) : (
                    <></>
                  )}
                  <div>
                    {activeTab.startsWith("admin-") ? (
                      <p>Xem Duyệt Nạp/Rút ở modal bên phải</p>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Lịch sử giao dịch (Ẩn khi ở tab Admin) */}
            {!activeTab.startsWith("admin-") ? (
              <div className="col-lg-7 mb-4">
                <div className="bg-light p-4 rounded shadow-sm h-100 d-flex flex-column border">
                  <h4>Lịch sử giao dịch ví</h4>
                  {loadingHistory && transactions.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                      <p className="text-muted">
                        Đang tải lịch sử giao dịch...
                      </p>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-5 bg-white border rounded flex-grow-1 d-flex flex-column justify-content-center">
                      <i className="fas fa-receipt fa-3x text-muted mb-3"></i>
                      <p className="text-muted">
                        Bạn chưa thực hiện giao dịch nào.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="table-responsive flex-grow-1">
                        <table className="table table-hover table-striped bg-white border">
                          <thead>
                            <tr>
                              <th>Thời gian</th>
                              <th>Mã giao dịch</th>
                              <th>Loại</th>
                              <th>Nội dung</th>
                              <th className="text-right">Số tiền</th>
                              <th>Trạng thái</th>
                              <th>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((tx) => {
                              const isPositive =
                                tx.type === "Deposit" || tx.type === "Refund";
                              return (
                                <tr key={tx.transactionId}>
                                  <td>
                                    {new Date(tx.createdAt).toLocaleString(
                                      "vi-VN",
                                      {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </td>
                                  <td>{tx.referenceId || tx.transactionId}</td>
                                  <td>{formatTxType(tx.type)}</td>
                                  <td
                                    style={{ maxWidth: "200px" }}
                                    title={tx.description}
                                  >
                                    {tx.description}
                                  </td>
                                  <td>
                                    {isPositive ? "+" : "-"}
                                    {formatPrice(Math.abs(tx.amount))}
                                  </td>
                                  <td>{formatTxStatus(tx.status)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="btn btn-outline-info"
                                      onClick={() => {
                                        setCurrentDepositTx(tx);
                                        setIsViewingExisting(true);
                                        setShowDepositModal(true);
                                      }}
                                    >
                                      Xem chi tiết
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <Pagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={loadTransactionHistory}
                      />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>{activeTab.startsWith("admin-") && renderAdminTable()}</>
            )}
          </div>
        </div>
      </ShopShell>

      {/* Modal hướng dẫn nạp tiền chuyển khoản */}
      {showDepositModal && currentDepositTx && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="text-white">Thông tin chuyển khoản nạp tiền</h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={() => setShowDepositModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div
                className="modal-body text-center"
                style={{ maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}
              >
                {/* QR Code */}
                <img
                  src={getVietQrUrl(currentDepositTx)}
                  alt="VietQR Chuyển Khoản"
                  className="img-fluid"
                  style={{ maxWidth: "350px" }}
                />

                {/* Text details */}
                <div className="text-left border rounded p-3 bg-light">
                  <div className="mb-2">
                    <span className="text-muted small">Ngân hàng:</span>
                    <br />
                    <strong className="text-dark">
                      {BANK_TRANSFER_CONFIG.bankName} (
                      {BANK_TRANSFER_CONFIG.bankId})
                    </strong>
                  </div>
                  <div className="mb-2 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small">Số tài khoản:</span>
                      <br />
                      <strong className="text-dark h5 mb-0">
                        {BANK_TRANSFER_CONFIG.accountNumber}
                      </strong>
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">Chủ tài khoản:</span>
                    <br />
                    <strong>{BANK_TRANSFER_CONFIG.accountName}</strong>
                  </div>
                  <div className="mb-2">
                    <span className="text-muted small">Số tiền chuyển:</span>
                    <br />
                    <strong>{formatPrice(currentDepositTx.amount)}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small">
                        Nội dung chuyển khoản:
                      </span>
                      <br />
                      <strong>
                        {currentDepositTx.referenceId ||
                          `DEP${currentDepositTx.transactionId}`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                {isViewingExisting ? (
                  <></>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmDepositTransfer}
                    disabled={submittingDeposit}
                  >
                    {submittingDeposit ? "Đang xử lý..." : "Tôi đã chuyển tiền"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDepositModal && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1050 }}
        ></div>
      )}
    </>
  );
};

export default ShopWallet;
