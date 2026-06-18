import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { couponApi, orderApi, userApi, walletApi } from "../services/api";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../utils/orderDataUtils";
const MainLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const adminUser = isAdmin();
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [waitingTransferCount, setWaitingTransferCount] = useState(0);
  const [openReturnCount, setOpenReturnCount] = useState(0);
  const [pendingDepositCount, setPendingDepositCount] = useState(0);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [couponCount, setCouponCount] = useState(0);

  const loadAdminBadgeCount = useCallback(
    async (request, setValue) => {
      if (!adminUser) {
        setValue(0);
        return;
      }

      try {
        const response = await request();
        const payload = response?.data ?? {};
        const totalCount = Number(payload.totalCount ?? 0) || 0;
        setValue(totalCount);
      } catch {
        setValue(0);
      }
    },
    [adminUser],
  );

  const loadWaitingTransferCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () =>
        orderApi.getAll({
          paymentStatus: PAYMENT_STATUS.PENDING,
          paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
          page: 1,
          pageSize: 1,
        }),
      setWaitingTransferCount,
    );
  }, [loadAdminBadgeCount]);

  const loadOrderCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () =>
        orderApi.getAll({
          page: 1,
          pageSize: 1,
        }),
      setTotalOrderCount,
    );
  }, [loadAdminBadgeCount]);

  const loadOpenReturnCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () =>
        orderApi.getReturnRequests({
          page: 1,
          pageSize: 1,
        }),
      setOpenReturnCount,
    );
  }, [loadAdminBadgeCount]);

  const loadPendingDepositsCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () =>
        walletApi.getPendingDeposits({
          page: 1,
          pageSize: 1,
        }),
      setPendingDepositCount,
    );
  }, [loadAdminBadgeCount]);

  const loadPendingWithdrawalsCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () =>
        walletApi.getPendingWithdrawals({
          page: 1,
          pageSize: 1,
        }),
      setPendingWithdrawalCount,
    );
  }, [loadAdminBadgeCount]);

  const loadCouponCount = useCallback(async () => {
    await loadAdminBadgeCount(
      () => couponApi.getAll({ page: 1, pageSize: 1 }),
      setCouponCount,
    );
  }, [loadAdminBadgeCount]);

  useEffect(() => {
    if (!adminUser) {
      return undefined;
    }

    loadOrderCount();
    loadWaitingTransferCount();
    loadOpenReturnCount();
    loadPendingDepositsCount();
    loadPendingWithdrawalsCount();
    loadCouponCount();
    const intervalId = window.setInterval(() => {
      loadOrderCount();
      loadWaitingTransferCount();
      loadOpenReturnCount();
      loadPendingDepositsCount();
      loadPendingWithdrawalsCount();
      loadCouponCount();
    }, 30000);

    const onTransferUpdated = () => {
      loadOrderCount();
      loadWaitingTransferCount();
    };
    const onReturnRequestUpdated = () => {
      loadOrderCount();
      loadOpenReturnCount();
    };
    const onAdminOrdersUpdated = () => {
      loadOrderCount();
      loadWaitingTransferCount();
      loadOpenReturnCount();
    };
    const onWalletDepositUpdated = () => {
      loadPendingDepositsCount();
    };
    const onWalletWithdrawalUpdated = () => {
      loadPendingWithdrawalsCount();
    };
    const onCouponUpdated = () => {
      loadCouponCount();
    };
    window.addEventListener("order-transfer-updated", onTransferUpdated);
    window.addEventListener(
      "order-return-request-updated",
      onReturnRequestUpdated,
    );
    window.addEventListener("admin-orders-updated", onAdminOrdersUpdated);
    window.addEventListener("wallet-deposit-updated", onWalletDepositUpdated);
    window.addEventListener(
      "wallet-withdrawal-updated",
      onWalletWithdrawalUpdated,
    );
    window.addEventListener("coupon-update", onCouponUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("order-transfer-updated", onTransferUpdated);
      window.removeEventListener(
        "order-return-request-updated",
        onReturnRequestUpdated,
      );
      window.removeEventListener("admin-orders-updated", onAdminOrdersUpdated);
      window.removeEventListener(
        "wallet-deposit-updated",
        onWalletDepositUpdated,
      );
      window.removeEventListener(
        "wallet-withdrawal-updated",
        onWalletWithdrawalUpdated,
      );
      window.removeEventListener("coupon-update", onCouponUpdated);
    };
  }, [
    adminUser,
    loadOrderCount,
    loadWaitingTransferCount,
    loadOpenReturnCount,
    loadPendingDepositsCount,
    loadPendingWithdrawalsCount,
    loadCouponCount,
  ]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/" ? "active" : "";
    }

    if (path === "/orders") {
      return location.pathname === "/orders" ||
        location.pathname.startsWith("/orders/refund/")
        ? "active"
        : "";
    }

    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav ml-auto">
          <li className="nav-item dropdown">
            <button
              type="button"
              className="nav-link btn btn-link border-0 p-0"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <i className="fas fa-bars"></i> {user?.name || user?.username}
            </button>
            <div className="dropdown-menu dropdown-menu-right">
              <span className="dropdown-item dropdown-header">
                {user?.email}
              </span>

              <button className="dropdown-item" type="button">
                <Link to="/shop">Vào trang UI</Link>
              </button>

              {adminUser && (
                <button className="dropdown-item" type="button">
                  <Link to="/profile">Thông tin cá nhân</Link>
                </button>
              )}
              <button
                className="dropdown-item"
                type="button"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt mr-2"></i> Đăng xuất
              </button>
            </div>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 text-center">
            <span className="d-block text-light">Thanh DashBoard</span>
          </div>

          <nav className="mt-2">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              data-widget="treeview"
              role="menu"
            >
              <li className="nav-item">
                <Link to="/" className={`nav-link ${isActive("/")}`}>
                  <i className="nav-icon fas fa-tachometer-alt"></i>
                  <p>Tổng quan</p>
                </Link>
              </li>

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/profile"
                    className={`nav-link ${isActive("/profile")}`}
                  >
                    <i className="nav-icon far fa-id-card"></i>
                    <p>Thông tin cá nhân</p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/products"
                    className={`nav-link ${isActive("/products")}`}
                  >
                    <i className="nav-icon fas fa-box"></i>
                    <p>Sản phẩm</p>
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <Link
                  to="/categories"
                  className={`nav-link ${isActive("/categories")}`}
                >
                  <i className="nav-icon fas fa-tags"></i>
                  <p>Danh mục</p>
                </Link>
              </li>

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/users"
                    className={`nav-link ${isActive("/users")}`}
                  >
                    <i className="nav-icon fas fa-users"></i>
                    <p>Người dùng</p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/coupons"
                    className={`nav-link ${isActive("/coupons")}`}
                  >
                    <i className="nav-icon fas fa-ticket-alt"></i>
                    <p>
                      Mã giảm giá
                      {couponCount > 0 && (
                        <span className="right badge badge-info ml-2">
                          {couponCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/orders"
                    className={`nav-link ${isActive("/orders")}`}
                  >
                    <i className="nav-icon fas fa-shopping-bag"></i>
                    <p>
                      Đơn hàng
                      {totalOrderCount > 0 && (
                        <span className="right badge badge-info ml-2">
                          {totalOrderCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/orders/transfer-confirmations"
                    className={`nav-link ${isActive("/orders/transfer-confirmations")}`}
                  >
                    <i className="nav-icon fas fa-money-check-alt"></i>
                    <p>
                      Xác nhận chuyển khoản
                      {waitingTransferCount > 0 && (
                        <span className="right badge badge-danger ml-2">
                          {waitingTransferCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/admin/wallet/pending-deposits"
                    className={`nav-link ${isActive("/admin/wallet/pending-deposits")}`}
                  >
                    <i className="nav-icon fas fa-wallet"></i>
                    <p>
                      Duyệt nạp tiền ví
                      {pendingDepositCount > 0 && (
                        <span className="right badge badge-warning ml-2">
                          {pendingDepositCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/admin/wallet/pending-withdrawals"
                    className={`nav-link ${isActive("/admin/wallet/pending-withdrawals")}`}
                  >
                    <i className="nav-icon fas fa-money-bill-wave"></i>
                    <p>
                      Duyệt rút tiền ví
                      {pendingWithdrawalCount > 0 && (
                        <span className="right badge badge-danger ml-2">
                          {pendingWithdrawalCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/orders/return-requests"
                    className={`nav-link ${isActive("/orders/return-requests")}`}
                  >
                    <i className="nav-icon fas fa-undo-alt"></i>
                    <p>
                      Yêu cầu hoàn trả
                      {openReturnCount > 0 && (
                        <span className="right badge badge-warning ml-2">
                          {openReturnCount}
                        </span>
                      )}
                    </p>
                  </Link>
                </li>
              )}

              {adminUser && (
                <li className="nav-item">
                  <Link
                    to="/messages"
                    className={`nav-link ${isActive("/messages")}`}
                  >
                    <p>Tin nhắn hỗ trợ</p>
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </aside>

      {children}
    </div>
  );
};

export default MainLayout;
