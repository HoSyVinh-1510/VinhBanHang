import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { notificationApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import { formatDateTime } from "../../utils/couponDataUtils";
import useShopPage from "../../hooks/useShopPage";

const PAGE_SIZE = 10;

const ShopNotifications = () => {
  useMultiShopStyles();
  const {
    user,
    isAdmin,
    navigate,
    handleLogout,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
  } = useShopPage();

  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await notificationApi.getAll({
        page,
        pageSize: PAGE_SIZE,
      });
      setNotifications(data.items || []);
      setTotalCount(data.totalCount || 0);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError("Không thể tải danh sách thông báo.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Phát sự kiện đề ShopShell cập nhật badge thông báo
  const emitUpdate = () =>
    window.dispatchEvent(new Event("notifications-updated"));

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await notificationApi.markAsRead(id);
      await loadNotifications();
      emitUpdate();
    } catch {
      setError("Không thể cập nhật trạng thái thông báo.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;
    try {
      await notificationApi.delete(id);
      await loadNotifications();
      emitUpdate();
    } catch {
      setError("Không thể xóa thông báo.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      await loadNotifications();
      emitUpdate();
    } catch {
      setError("Không thể đánh dấu đọc tất cả.");
    }
  };

  return (
    <ShopShell
      activeRoute="notifications"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
    >
      <div className="container-fluid pb-5">
        <div className="row px-xl-5">
          <div className="col-lg-8 mx-auto">
            <div className="bg-light p-4 rounded">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="m-0 font-weight-semi-bold">
                  Thông báo của tôi ({unreadCount} chưa đọc)
                </h4>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleMarkAllRead}
                  >
                    Đọc tất cả
                  </button>
                )}
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {loading && (
                <div className="text-center text-muted py-5">
                  Đang tải thông báo...
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="text-center text-muted py-5">
                  Bạn chưa nhận được thông báo nào.
                </div>
              )}

              {/* Danh sách thông báo */}
              {!loading && notifications.length > 0 && (
                <div className="list-group list-group-flush mb-4">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`list-group-item p-3 border rounded mb-2 bg-white d-flex justify-content-between align-items-start ${
                        !notif.isRead ? "border-warning" : "border-light"
                      }`}
                      style={{
                        borderLeft: !notif.isRead
                          ? "4px solid #ffc107"
                          : "1px solid #dee2e6",
                      }}
                    >
                      {/* Nội dung thông báo */}
                      <div
                        className="flex-grow-1 mr-3"
                        style={{ cursor: notif.url ? "pointer" : "default" }}
                        onClick={() => {
                          handleMarkAsRead(notif.id, notif.isRead);
                          if (notif.url) navigate(notif.url);
                        }}
                      >
                        <div className="d-flex align-items-center mb-1">
                          <h6
                            className={`m-0 ${!notif.isRead ? "font-weight-bold" : ""}`}
                          >
                            {notif.title}
                          </h6>
                          {!notif.isRead && (
                            <span
                              className="badge badge-warning ml-2"
                              style={{ fontSize: "10px" }}
                            >
                              Chưa đọc
                            </span>
                          )}
                        </div>
                        <p
                          className="text-muted mb-2"
                          style={{ fontSize: "14px" }}
                        >
                          {notif.message}
                        </p>
                        <small className="text-muted d-block">
                          Thời gian: {formatDateTime(notif.createdAt)}
                        </small>
                      </div>

                      {/* Nút xóa */}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger p-1"
                        style={{
                          fontSize: "11px",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onClick={() => handleDelete(notif.id)}
                        title="Xóa thông báo"
                      >
                        <i className="fa fa-times" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ShopShell>
  );
};

export default ShopNotifications;
