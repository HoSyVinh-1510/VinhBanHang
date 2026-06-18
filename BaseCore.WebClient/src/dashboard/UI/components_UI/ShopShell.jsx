import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { orderApi, promotionsApi, notificationApi } from "../../../services/api";
import { PAYMENT_METHOD, PAYMENT_STATUS, ORDER_STATUS } from "../../../utils/orderDataUtils";

const buildNavClass = (activeRoute, route) =>
  `nav-item nav-link${activeRoute === route ? " active" : ""}`;

const ShopShell = ({
  activeRoute,
  userName,
  onLogout,
  isAdmin,
  onGoAdmin,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  productDetailPath,
  children,
}) => {
  const location = useLocation();
  const isShopRoute = location.pathname.startsWith("/shop");

  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [waitingTransferCount, setWaitingTransferCount] = useState(0);
  const [openReturnCount, setOpenReturnCount] = useState(0);

  const [currency, setCurrency] = useState(
    localStorage.getItem("shop-currency") || "VND",
  );

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Fetch exchange rates from Ruby microservice
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await promotionsApi.getExchangeRates();
        if (res.data?.success && res.data?.rates) {
          localStorage.setItem(
            "shop-exchange-rates",
            JSON.stringify(res.data.rates),
          );
          window.dispatchEvent(new Event("shop-currency-changed"));
        }
      } catch (err) {
        console.error("Failed to fetch exchange rates", err);
      }
    };
    fetchRates();
  }, []);

  // Listen to currency changes globally to update combobox state
  useEffect(() => {
    const handleEvent = () => {
      setCurrency(localStorage.getItem("shop-currency") || "VND");
    };
    window.addEventListener("shop-currency-changed", handleEvent);
    return () =>
      window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    localStorage.setItem("shop-currency", newCurrency);
    setCurrency(newCurrency);
    window.dispatchEvent(new Event("shop-currency-changed"));
  };

  const loadNotifications = useCallback(async () => {
    if (!userName) return;
    try {
      const response = await notificationApi.getAll({ page: 1, pageSize: 5 });
      const data = response?.data ?? {};
      setNotifications(data.items || []);
      setUnreadNotificationCount(Number(data.unreadCount || 0));
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }, [userName]);

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await notificationApi.markAsRead(notif.id);
        loadNotifications();
      }
      setShowNotificationDropdown(false);
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      loadNotifications();
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const loadBadgeCount = useCallback(
    async (request, setValue) => {
      if (!userName) {
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
    [userName],
  );

  const loadWaitingTransferCount = useCallback(async () => {
    if (!userName) return;
    try {
      if (isAdmin) {
        const [pendingRes, refundPendingRes] = await Promise.all([
          orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.PENDING,
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            page: 1,
            pageSize: 1,
          }),
          orderApi.getAll({
            paymentStatus: PAYMENT_STATUS.REFUND_PENDING,
            page: 1,
            pageSize: 1,
          }),
        ]);
        const count =
          (Number(pendingRes?.data?.totalCount) || 0) +
          (Number(refundPendingRes?.data?.totalCount) || 0);
        setWaitingTransferCount(count);
      } else {
        const [unpaidRes, refundTransRes] = await Promise.all([
          orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.UNPAID,
            paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
            page: 1,
            pageSize: 1,
          }),
          orderApi.getMyOrders({
            paymentStatus: PAYMENT_STATUS.REFUND_TRANSFERRED,
            page: 1,
            pageSize: 1,
          }),
        ]);
        const count =
          (Number(unpaidRes?.data?.totalCount) || 0) +
          (Number(refundTransRes?.data?.totalCount) || 0);
        setWaitingTransferCount(count);
      }
    } catch {
      setWaitingTransferCount(0);
    }
  }, [isAdmin, userName]);

  const loadAllCounts = useCallback(async () => {
    if (!userName) return;

    // 1. Orders waiting for user/admin action
    try {
      if (isAdmin) {
        // Admin: orders in "Pending" (Chờ xác nhận)
        const response = await orderApi.getAll({
          orderStatus: ORDER_STATUS.PENDING,
          page: 1,
          pageSize: 1,
        });
        setTotalOrderCount(Number(response?.data?.totalCount) || 0);
      } else {
        // User: orders in "WaitingPayment" (Chờ thanh toán) or "Shipping" (Đang giao -> click to receive)
        const response = await orderApi.getMyOrders({ page: 1, pageSize: 100 });
        const list = response?.data?.items ?? response?.data ?? [];
        const count = list.filter((item) => {
          const status = item.orderStatus;
          return (
            status === ORDER_STATUS.WAITING_PAYMENT ||
            status === ORDER_STATUS.SHIPPING
          );
        }).length;
        setTotalOrderCount(count);
      }
    } catch {
      setTotalOrderCount(0);
    }

    // 2. Bank transfers waiting for user/admin action
    loadWaitingTransferCount();

    // 3. Return requests waiting for action
    try {
      if (isAdmin) {
        // Admin: all unresolved return requests
        const response = await orderApi.getReturnRequests({
          page: 1,
          pageSize: 1,
        });
        setOpenReturnCount(Number(response?.data?.totalCount) || 0);
      } else {
        // User: user's unresolved return requests
        const response = await orderApi.getMyOrders({ page: 1, pageSize: 100 });
        const list = response?.data?.items ?? response?.data ?? [];
        const count = list.filter((item) => {
          const status = item.orderStatus;
          return status === ORDER_STATUS.RETURN_REQUESTED;
        }).length;
        setOpenReturnCount(count);
      }
    } catch {
      setOpenReturnCount(0);
    }

    // 4. Load notifications
    loadNotifications();
  }, [userName, isAdmin, loadWaitingTransferCount, loadNotifications]);

  useEffect(() => {
    loadAllCounts();
    const intervalId = window.setInterval(loadAllCounts, 30000);

    const onUpdate = () => loadAllCounts();
    const onNotifUpdate = () => loadNotifications();

    window.addEventListener("order-transfer-updated", onUpdate);
    window.addEventListener("order-return-request-updated", onUpdate);
    window.addEventListener("admin-orders-updated", onUpdate);
    window.addEventListener("order-transfer-submitted", onUpdate);
    window.addEventListener("order-refund-transfer-submitted", onUpdate);
    window.addEventListener("notifications-updated", onNotifUpdate);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("order-transfer-updated", onUpdate);
      window.removeEventListener("order-return-request-updated", onUpdate);
      window.removeEventListener("admin-orders-updated", onUpdate);
      window.removeEventListener("order-transfer-submitted", onUpdate);
      window.removeEventListener("order-refund-transfer-submitted", onUpdate);
      window.removeEventListener("notifications-updated", onNotifUpdate);
    };
  }, [loadAllCounts, loadNotifications]);

  if (!isShopRoute) {
    return <>{children}</>;
  }
  return (
    <div className="shop-shell-root">
      <div className="container-fluid">
        <div className="row align-items-center bg-light py-3 px-xl-5 d-none d-lg-flex shop-brand-row">
          <div className="col-lg-4 shop-brand-col">
            <Link to="/shop" className="text-decoration-none">
              <span className="h1 text-dark bg-primary px-2">Tạp Hoá</span>
              <span className="h1 text-light bg-dark px-2 ml-n1">Online</span>
            </Link>
          </div>
          <div className="col-lg-4 col-6 text-left">
            <form onSubmit={onSearchSubmit} className="shop-search-form">
              <div className="input-group shop-search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm sản phẩm trong shop của Vinh :33"
                  value={searchInput}
                  onChange={(event) => onSearchInputChange(event.target.value)}
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-transparent text-primary p-0">
                    <button
                      type="submit"
                      className="btn text-primary border-0 d-flex align-items-center justify-content-center h-100 px-3"
                    >
                      <i className="fa fa-search"></i>
                    </button>
                  </span>
                </div>
              </div>
            </form>
          </div>
          <div className="col-lg-4 col-6 text-right d-flex align-items-center justify-content-end shop-topbar-actions">
            <div className="btn-group">
              <select
                className="form-control form-control-sm border-secondary text-dark font-weight-bold"
                style={{
                  cursor: "pointer",
                  marginRight: "20px",
                }}
                value={currency}
                onChange={handleCurrencyChange}
              >
                <option value="VND">VND (đ)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (đ)</option>
              </select>
            </div>

            <div className="btn-group position-relative mr-3 notification-bell-group">
              <button
                type="button"
                className="btn btn-sm btn-light position-relative d-flex align-items-center justify-content-center"
                style={{ width: "35px", height: "35px", borderRadius: "50%", border: "1px solid #ccc" }}
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <i className="fa fa-bell text-dark" style={{ fontSize: "16px" }}></i>
                {unreadNotificationCount > 0 && (
                  <span
                    className="position-absolute bg-danger text-white d-flex align-items-center justify-content-center"
                    style={{
                      top: "-4px",
                      right: "-4px",
                      fontSize: "9px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      fontWeight: "bold",
                    }}
                  >
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div
                  className="position-absolute bg-white border rounded shadow text-left"
                  style={{
                    top: "40px",
                    right: "0px",
                    width: "320px",
                    zIndex: 9999,
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  <div className="p-2 border-bottom d-flex justify-content-between align-items-center">
                    <span className="font-weight-bold" style={{ fontSize: "14px" }}>Thông báo mới nhất</span>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-decoration-none"
                        style={{ fontSize: "12px" }}
                        onClick={handleMarkAllRead}
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="list-group list-group-flush">
                    {notifications.length === 0 ? (
                      <div className="p-3 text-center text-muted" style={{ fontSize: "13px" }}>
                        Không có thông báo nào.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <Link
                          key={notif.id}
                          to={notif.url || "#"}
                          className={`list-group-item list-group-item-action p-2 border-bottom d-block text-decoration-none ${
                            !notif.isRead ? "bg-light font-weight-bold" : ""
                          }`}
                          style={{ borderLeft: !notif.isRead ? "3px solid #ffc107" : "none" }}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="text-dark" style={{ fontSize: "13px" }}>{notif.title}</span>
                            <small className="text-muted" style={{ fontSize: "10px" }}>
                              {new Date(notif.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                            </small>
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: "11px", fontWeight: "normal" }}>
                            {notif.message}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  <div className="p-2 text-center border-top">
                    <Link
                      to="/shop/notifications"
                      className="btn btn-sm btn-link p-0 text-decoration-none font-weight-bold"
                      style={{ fontSize: "12px" }}
                      onClick={() => setShowNotificationDropdown(false)}
                    >
                      Xem tất cả thông báo
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="btn-group">
              <button
                type="button"
                className="btn btn-sm btn-light dropdown-toggle"
                data-toggle="dropdown"
              >
                {userName || "Tài khoản của tôi"}
              </button>
              <div className="dropdown-menu dropdown-menu-right">
                <Link to="/shop/profile" className="dropdown-item">
                  Thông tin cá nhân
                </Link>
                <Link to="/shop/wallet" className="dropdown-item">
                  Ví thành viên
                </Link>
                {isAdmin && (
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={onGoAdmin}
                  >
                    Trang quản trị
                  </button>
                )}
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={onLogout}
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row bg-light py-2 px-3 d-lg-none shop-mobile-brand-row">
          <div className="col-12">
            <form onSubmit={onSearchSubmit} className="shop-search-form">
              <div className="input-group shop-search-input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm sản phẩm"
                  value={searchInput}
                  onChange={(event) => onSearchInputChange(event.target.value)}
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-transparent text-primary p-0">
                    <button
                      type="submit"
                      className="btn text-primary border-0 d-flex align-items-center justify-content-center h-100 px-3"
                      style={{ boxShadow: "none" }}
                    >
                      <i className="fa fa-search"></i>
                    </button>
                  </span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="container-fluid bg-dark mb-30 shop-main-nav">
        <div className="row px-xl-5">
          <div className="col-12">
            <nav className="navbar navbar-expand-lg bg-dark navbar-dark py-3 py-lg-0 px-0 shop-main-navbar">
              <button
                type="button"
                className="navbar-toggler"
                data-toggle="collapse"
                data-target="#navbarCollapse"
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              <div
                className="collapse navbar-collapse justify-content-between shop-main-collapse"
                id="navbarCollapse"
              >
                <div className="navbar-nav mr-auto py-0 shop-main-links">
                  <Link
                    to="/shop"
                    className={buildNavClass(activeRoute, "home")}
                  >
                    Trang chủ
                  </Link>
                  <Link
                    to="/shop/list"
                    className={buildNavClass(activeRoute, "shop")}
                  >
                    Sản phẩm
                  </Link>
                  {productDetailPath && (
                    <Link
                      to={productDetailPath}
                      className={buildNavClass(activeRoute, "product-detail")}
                    >
                      Chi tiết sản phẩm
                    </Link>
                  )}
                  <Link
                    to="/shop/coupons"
                    className={buildNavClass(activeRoute, "coupons")}
                  >
                    Mã giảm giá
                  </Link>
                  <Link
                    to="/shop/cart"
                    className={buildNavClass(activeRoute, "cart")}
                  >
                    Giỏ hàng
                  </Link>
                  <Link
                    to="/shop/orders"
                    className={buildNavClass(activeRoute, "orders")}
                  >
                    Đơn hàng
                    {totalOrderCount > 0 && (
                      <span className="badge badge-info ml-1">
                        {totalOrderCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/shop/orders/transfer-confirmations"
                    className={buildNavClass(
                      activeRoute,
                      "transfer-confirmations",
                    )}
                  >
                    Xác nhận chuyển khoản
                    {waitingTransferCount > 0 && (
                      <span className="badge badge-danger ml-1">
                        {waitingTransferCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/shop/orders/return-requests"
                    className={buildNavClass(activeRoute, "return-requests")}
                  >
                    Yêu cầu hoàn/trả
                    {openReturnCount > 0 && (
                      <span className="badge badge-warning ml-1">
                        {openReturnCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/shop/wallet"
                    className={buildNavClass(activeRoute, "wallet")}
                  >
                    Ví thành viên
                  </Link>
                  <Link
                    to="/shop/checkout"
                    className={buildNavClass(activeRoute, "checkout")}
                  >
                    Thanh toán
                  </Link>
                  <Link
                    to="/shop/messages"
                    className={buildNavClass(activeRoute, "messages")}
                  >
                    Hỗ trợ & Nhắn tin
                  </Link>
                </div>

                <div className="navbar-nav py-0">
                  <Link
                    to="/shop/cart"
                    className={`nav-item nav-link px-3 shop-nav-cart-link ${
                      activeRoute === "cart" ? "active" : ""
                    }`}
                    title="Mã  giỏ hàng"
                  >
                    <i className="fas fa-shopping-cart text-primary mr-1"></i>
                    <span className="d-inline d-lg-none">Giỏ hàng</span>
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <main className="shop-page-surface">{children}</main>

      <div className="container-fluid bg-dark text-secondary mt-5 pt-5 shop-footer">
        <div className="row px-xl-5 pt-5">
          <div className="col-lg-4 col-md-12 mb-5 pr-3 pr-xl-5">
            <h5 className="text-secondary text-uppercase mb-4">Liên hệ</h5>
            <p className="mb-2">
              <i className="fa fa-map-marker-alt text-primary mr-3"></i>
              Hưng Yên / Hà Nội, Việt Nam
            </p>
            <p className="mb-2">
              <i className="fa fa-envelope text-primary mr-3"></i>
              babyvinh46@gmail.com
            </p>
            <p className="mb-0">
              <i className="fa fa-phone-alt text-primary mr-3"></i>
              SĐT/Zalo: +84 0865165424
            </p>
          </div>

          <div className="col-lg-8 col-md-12">
            <div className="row">
              <div className="col-md-4 mb-5">
                <h5 className="text-secondary text-uppercase mb-4">
                  Mua nhanh
                </h5>
                <div className="d-flex flex-column justify-content-start">
                  <Link to="/shop" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Trang chủ
                  </Link>
                  <Link to="/shop/list" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Cửa hàng
                  </Link>
                  <Link to="/shop/coupons" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Mã giảm giá
                  </Link>
                </div>
              </div>

              <div className="col-md-4 mb-5">
                <h5 className="text-secondary text-uppercase mb-4">
                  Tài khoản
                </h5>
                <div className="d-flex flex-column justify-content-start">
                  <Link to="/shop/cart" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Giỏ hàng
                  </Link>
                  <Link to="/shop/profile" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Thông tin cá nhân
                  </Link>
                  <Link to="/shop/wallet" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Ví thành viên
                  </Link>
                  <Link to="/shop/checkout" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Thanh toán
                  </Link>
                  <Link to="/shop/orders" className="text-secondary mb-2">
                    <i className="fa fa-angle-right mr-2"></i>Đơn hàng của tôi
                  </Link>
                  <Link
                    to="/shop/orders/transfer-confirmations"
                    className="text-secondary mb-2"
                  >
                    <i className="fa fa-angle-right mr-2"></i>Xác nhận chuyển
                    khoản
                  </Link>
                  <Link
                    to="/shop/orders/return-requests"
                    className="text-secondary mb-2"
                  >
                    <i className="fa fa-angle-right mr-2"></i>Yêu cầu hoàn/trả
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopShell;


