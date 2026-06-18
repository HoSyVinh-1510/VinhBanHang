import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * ProtectedRoute — kiểm soát quyền truy cập route.
 *
 * Props:
 *   adminOnly  — chỉ Admin mới truy cập được (mặc định: false)
 *   publicOnly — chỉ khách chưa đăng nhập mới truy cập được, dùng cho /login
 */
const ProtectedRoute = ({ children, adminOnly = false, publicOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Đang tải...</span>
        </div>
      </div>
    );
  }

  // Trang chỉ dành cho khách (login): chuyển về /shop nếu đã đăng nhập
  if (publicOnly && isAuthenticated) return <Navigate to="/shop" replace />;

  // Trang yêu cầu đăng nhập: chuyển về /login nếu chưa xác thực
  if (!publicOnly && !isAuthenticated) return <Navigate to="/login" replace />;

  // Trang chỉ dành cho Admin: chuyển về /shop nếu không đủ quyền
  if (adminOnly && !isAdmin()) return <Navigate to="/shop" replace />;

  return children;
};

export default ProtectedRoute;
