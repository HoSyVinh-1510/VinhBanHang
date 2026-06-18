import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Tạo axios instance dùng chung
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Gắn Bearer token vào mọi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Xử lý lỗi 401 — tự động đăng xuất
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  register: (data) => api.post("/auth/register", data),
};

// User
export const userApi = {
  getProfile: () => api.get("/users/profile"),
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  getMyRefundQrs: () => api.get("/users/me/refund-qrs"),
  createMyRefundQr: (data) => api.post("/users/me/refund-qrs", data),
  updateMyRefundQrItem: (id, data) =>
    api.put(`/users/me/refund-qrs/${id}`, data),
  setDefaultMyRefundQrItem: (id) =>
    api.put(`/users/me/refund-qrs/${id}/default`),
  deleteMyRefundQrItem: (id) => api.delete(`/users/me/refund-qrs/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Product
export const productApi = {
  getAll: (params) => api.get("/products", { params }),
  getCategoryCounts: () => api.get("/products/category-counts"),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Category
export const categoryApi = {
  getAll: (params) => api.get("/categories", { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post("/categories", data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Order
export const orderApi = {
  create: (data) => api.post("/orders", data),
  validateCoupon: (data) => api.post("/orders/validate-coupon", data),
  getMyOrders: (params) => api.get("/orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getStatusHistory: (id) => api.get(`/orders/${id}/status-history`),
  submitTransfer: (id, note) =>
    api.put(`/orders/${id}/submit-transfer`, { note }),
  submitRefundTransfer: (id, note, refundMethod) =>
    api.put(`/orders/${id}/submit-refund-transfer`, { note, refundMethod }),
  confirmRefundReceived: (id) =>
    api.put(`/orders/${id}/confirm-refund-received`),
  updateStatus: (id, status, note) =>
    api.put(`/orders/${id}/status`, { status, note }),
  updatePaymentStatus: (id, paymentStatus) =>
    api.put(`/orders/${id}/payment-status`, { paymentStatus }),
  cancel: (id, data) => api.put(`/orders/${id}/cancel`, data),
  receive: (id) => api.put(`/orders/${id}/receive`),
  returnRequest: (id, reason) =>
    api.put(`/orders/${id}/return-request`, { reason }),
  resolveReturnRequest: (id, isApproved, note) =>
    api.put(`/orders/${id}/return-request/resolve`, { isApproved, note }),
  getReturnRequests: (params) => api.get("/orders/return-requests", { params }),
};

// Address
export const addressApi = {
  getAll: () => api.get("/addresses"),
  create: (data) => api.post("/addresses", data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  setDefault: (id) => api.put(`/addresses/${id}/default`),
  delete: (id) => api.delete(`/addresses/${id}`),
};

// Product Review
export const reviewApi = {
  getByProduct: (productId, params) =>
    api.get(`/products/${productId}/reviews`, { params }),
  getMineByOrder: (orderId) => api.get(`/orders/${orderId}/reviews`),
  upsert: (productId, data) => api.post(`/products/${productId}/reviews`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Coupon
export const couponApi = {
  getActive: (params) => api.get("/coupons/active", { params }),
  getAll: (params) => api.get("/coupons", { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post("/coupons", data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  updateStatus: (id, isActive) =>
    api.put(`/coupons/${id}/status`, { isActive }),
  delete: (id) => api.delete(`/coupons/${id}`),
};

// Cart
export const cartApi = {
  getAll: () => api.get("/cart"),
  setQuantity: (productId, quantity) =>
    api.post("/cart", { productId, quantity }),
  remove: (productId) => api.delete(`/cart/${productId}`),
  clear: () => api.delete("/cart"),
};

// Message
export const messageApi = {
  create: (data) => api.post("/messages", data),
  getAll: (page = 1, pageSize = 20) =>
    api.get("/messages", { params: { page, pageSize } }),
  getMyMessages: () => api.get("/messages/my-messages"),
  reply: (id, replyMessage) =>
    api.put(`/messages/${id}/reply`, { replyMessage }),
};

// Promotions (Ruby service)
export const promotionsApi = {
  getExchangeRates: () => api.get("/promotions/exchange-rates"),
};

// Notification
export const notificationApi = {
  getAll: (params) => api.get("/notifications", { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Analytics (Dashboard & Reports)
export const analyticsApi = {
  getSummary: (params) => api.get("/analytics/summary", { params }),
  getRevenue: (params) => api.get("/analytics/revenue", { params }),
  getTopProducts: (params) => api.get("/analytics/top-products", { params }),
  getCategoryRevenue: (params) =>
    api.get("/analytics/category-revenue", { params }),
};

// Wallet
export const walletApi = {
  getWallet: () => api.get("/wallet/my-wallet"),
  getTransactions: (params) => api.get("/wallet/transactions", { params }),
  deposit: (data) => api.post("/wallet/deposit", data),
  getPendingDeposits: (params) =>
    api.get("/wallet/admin/pending-deposits", { params }),
  approveDeposit: (id) => api.post(`/wallet/admin/approve-deposit/${id}`),
  rejectDeposit: (id) => api.post(`/wallet/admin/reject-deposit/${id}`),
  withdraw: (data) => api.post("/wallet/withdraw", data),
  getPendingWithdrawals: (params) =>
    api.get("/wallet/admin/pending-withdrawals", { params }),
  approveWithdrawal: (id) => api.post(`/wallet/admin/approve-withdrawal/${id}`),
  rejectWithdrawal: (id) => api.post(`/wallet/admin/reject-withdrawal/${id}`),
};

export default api;
