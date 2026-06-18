import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import React from "react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Login from "./dashboard/auth/Login";
import Dashboard from "./dashboard/admin/Dashboard";
import Products from "./dashboard/admin/Products";
import Users from "./dashboard/admin/Users";
import Categories from "./dashboard/admin/Categories";
import ShopHome from "./dashboard/UI/ShopHome";
import ShopList from "./dashboard/UI/ShopList";
import ShopCart from "./dashboard/UI/ShopCart";
import ShopCheckout from "./dashboard/UI/ShopCheckout";
import ShopMessages from "./dashboard/UI/ShopMessages";
import ShopProductDetail from "./dashboard/UI/ShopProductDetail";
import ShopCoupons from "./dashboard/UI/ShopCoupons";
import ShopOrders from "./dashboard/UI/ShopOrders";
import ShopBankTransfer from "./dashboard/UI/ShopBankTransfer";
import Coupons from "./dashboard/admin/Coupons";
import Orders from "./dashboard/admin/Orders";
import AdminProfile from "./dashboard/admin/AdminProfile";
import AdminRefundTransfer from "./dashboard/admin/AdminRefundTransfer";
import OrderTransferConfirmations from "./dashboard/admin/OrderTransferConfirmations";
import OrderReturnRequests from "./dashboard/admin/OrderReturnRequests";
import ShopOrderTransferConfirmations from "./dashboard/UI/ShopOrderTransferConfirmations";
import ShopOrderReturnRequests from "./dashboard/UI/ShopOrderReturnRequests";
import ShopAddresses from "./dashboard/UI/ShopAddresses";
import ShopProfile from "./dashboard/UI/ShopProfile";
import AdminMessages from "./dashboard/admin/AdminMessages";
import ShopNotifications from "./dashboard/UI/ShopNotifications";
import ShopWallet from "./dashboard/UI/ShopWallet";
import PendingDeposits from "./dashboard/admin/PendingDeposits";
import PendingWithdrawals from "./dashboard/admin/PendingWithdrawals";

// Helper: bọc trang trong ProtectedRoute
const shopRoute = (path, element) => (
  <Route
    key={path}
    path={path}
    element={<ProtectedRoute>{element}</ProtectedRoute>}
  />
);

// Helper: bọc trang Admin trong ProtectedRoute + MainLayout
const adminRoute = (path, element) => (
  <Route
    key={path}
    path={path}
    element={
      <ProtectedRoute adminOnly={true}>
        <MainLayout>{element}</MainLayout>
      </ProtectedRoute>
    }
  />
);

function AppRoutes() {
  return (
    <Routes>
      {/* Public: Trang đăng nhập */}
      <Route
        path="/login"
        element={
          <ProtectedRoute publicOnly>
            <Login />
          </ProtectedRoute>
        }
      />

      {/* Shop routes — người dùng */}
      {shopRoute("/shop", <ShopHome />)}
      {shopRoute("/shop/list", <ShopList />)}
      {shopRoute("/shop/cart", <ShopCart />)}
      {shopRoute("/shop/orders", <ShopOrders />)}
      {shopRoute(
        "/shop/orders/transfer-confirmations",
        <ShopOrderTransferConfirmations />,
      )}
      {shopRoute("/shop/orders/return-requests", <ShopOrderReturnRequests />)}
      {shopRoute("/shop/checkout", <ShopCheckout />)}
      {shopRoute("/shop/bank-transfer/:orderId", <ShopBankTransfer />)}
      {shopRoute("/shop/messages", <ShopMessages />)}
      {shopRoute("/shop/coupons", <ShopCoupons />)}
      {shopRoute("/shop/addresses", <ShopAddresses />)}
      {shopRoute("/shop/notifications", <ShopNotifications />)}
      {shopRoute("/shop/profile", <ShopProfile />)}
      {shopRoute("/shop/wallet", <ShopWallet />)}
      {shopRoute("/shop/product/:id", <ShopProductDetail />)}
      <Route
        path="/shop/orders/refund/:orderId"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminRefundTransfer />
          </ProtectedRoute>
        }
      />

      {/* Admin routes — bố cục MainLayout */}
      {adminRoute("/", <Dashboard />)}
      {adminRoute("/products", <Products />)}
      {adminRoute("/categories", <Categories />)}
      {adminRoute("/users", <Users />)}
      {adminRoute("/profile", <AdminProfile />)}
      {adminRoute("/coupons", <Coupons />)}
      {adminRoute("/messages", <AdminMessages />)}
      {adminRoute("/orders", <Orders />)}
      {adminRoute("/orders/refund/:orderId", <AdminRefundTransfer />)}
      {adminRoute(
        "/orders/transfer-confirmations",
        <OrderTransferConfirmations />,
      )}
      {adminRoute("/orders/return-requests", <OrderReturnRequests />)}
      {adminRoute("/admin/wallet/pending-deposits", <PendingDeposits />)}
      {adminRoute("/admin/wallet/pending-withdrawals", <PendingWithdrawals />)}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
