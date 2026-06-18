import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { analyticsApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const Dashboard = () => {
  const { isAdmin } = useAuth();

  // Date defaults: 30 days ago to today
  const getDefaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [limit, setLimit] = useState("10");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProductsSold: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Colors for Pie Chart
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#6b7280",
    "#00b894",
    "#2f80ed",
    "#f6c23e",
  ];

  useEffect(() => {
    if (isAdmin()) {
      fetchAnalyticsData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      const [summaryRes, revenueRes, topProductsRes, categoryRes] =
        await Promise.all([
          analyticsApi.getSummary(params),
          analyticsApi.getRevenue(params),
          analyticsApi.getTopProducts({ startDate, endDate, limit }),
          analyticsApi.getCategoryRevenue(params),
        ]);

      const s = summaryRes.data || {};
      const normalizedSummary = {
        totalRevenue: s.TotalRevenue ?? s.totalRevenue ?? 0,
        totalOrders: s.TotalOrders ?? s.totalOrders ?? 0,
        totalCustomers: s.TotalCustomers ?? s.totalCustomers ?? 0,
        totalProductsSold: s.TotalProductsSold ?? s.totalProductsSold ?? 0,
      };

      const rev = (revenueRes.data || []).map((r) => ({
        timePeriod: r.TimePeriod ?? r.timePeriod ?? "",
        revenue: r.Revenue ?? r.revenue ?? 0,
        orderCount: r.OrderCount ?? r.orderCount ?? 0,
      }));

      const top = (topProductsRes.data || []).map((p) => ({
        productId: p.ProductId ?? p.productId ?? 0,
        productName: p.ProductName ?? p.productName ?? "",
        price: p.Price ?? p.price ?? 0,
        totalQtySold: p.TotalQtySold ?? p.totalQtySold ?? 0,
        totalRevenueGenerated:
          p.TotalRevenueGenerated ?? p.totalRevenueGenerated ?? 0,
      }));

      const categories = (categoryRes.data || []).map((c) => ({
        categoryId: c.CategoryId ?? c.categoryId ?? 0,
        categoryName: c.CategoryName ?? c.categoryName ?? "",
        revenue: c.Revenue ?? c.revenue ?? 0,
      }));

      setSummary(normalizedSummary);
      setRevenueData(rev);
      setTopProducts(top);
      setCategoryData(categories);
    } catch (error) {
      console.error("Failed to load analytics stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(val);
  };

  // If not admin, restrict view or show welcome message
  if (!isAdmin()) {
    return (
      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <h1 className="m-0">Tổng quan</h1>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <div className="card card-outline card-primary p-4 text-center">
              <h3>Chào mừng bạn quay trở lại!</h3>
              <p className="text-muted">
                Bạn đang đăng nhập bằng tài khoản khách hàng.
              </p>
              <div className="mt-3">
                <Link to="/" className="btn btn-primary mr-2">
                  <i className="fas fa-shopping-bag mr-2"></i>Tiếp tục mua sắm
                </Link>
                <Link to="/profile" className="btn btn-outline-secondary">
                  <i className="fas fa-user mr-2"></i>Trang cá nhân
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-wrapper admin-dashboard-page">
      {/* Content Header */}
      <div className="content-header">
        <div className="container-fluid">
          <div className="d-sm-flex align-items-center justify-content-between mb-4">
            <h1 className="m-0 text-dark font-weight-bold">
              Báo cáo & Thống kê
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="content">
        <div className="container-fluid">
          {/* Filters Bar */}
          <div
            className="card shadow-sm mb-4"
            style={{ borderRadius: "12px", border: "none" }}
          >
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-5 col-sm-6 mb-3 mb-md-0">
                  <label>TỪ NGÀY</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-md-5 col-sm-6 mb-3 mb-md-0">
                  <label>ĐẾN NGÀY</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="col-md-2 col-sm-12">
                  <button
                    onClick={fetchAnalyticsData}
                    className="btn btn-primary btn-block shadow-sm"
                  >
                    THỐNG KÊ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Đang tải dữ liệu...</span>
              </div>
              <p className="mt-3 text-muted">Đang phân tích số liệu...</p>
            </div>
          ) : (
            <>
              {/* KPI Cards Grid */}
              <div className="row">
                {/* Total Revenue Card */}
                <div className="col-lg-3 col-md-6 col-12 mb-4">
                  <div className="card shadow-sm h-100 border-left border-primary">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                          Doanh Thu
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">
                          {formatCurrency(summary.totalRevenue)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Orders Card */}
                <div className="col-lg-3 col-md-6 col-12 mb-4">
                  <div className="card shadow-sm h-100 border-left border-primary">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                          Đơn Hàng
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">
                          {summary.totalOrders}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Products Sold Card */}
                <div className="col-lg-3 col-md-6 col-12 mb-4">
                  <div className="card shadow-sm h-100 border-left border-info">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                          Sản Phẩm Đã Bán
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">
                          {summary.totalProductsSold}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total New Customers Card */}
                <div className="col-lg-3 col-md-6 col-12 mb-4">
                  <div className="card shadow-sm h-100 border-left border-info">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                          Khách Hàng Mới
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">
                          {summary.totalCustomers}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Section: Pie chart and Table */}
              <div className="row">
                {/* Category Revenue Breakdown */}
                <div className="col-xl-5 col-lg-6 mb-4">
                  <div className="card shadow-sm h-100">
                    <div className="card-header bg-white py-3 border-0">
                      <h6>Cơ cấu doanh thu theo Danh mục</h6>
                    </div>
                    <div className="card-body d-flex flex-column align-items-center justify-content-center">
                      {categoryData.length === 0 ? (
                        <div>Không có dữ liệu danh mục.</div>
                      ) : (
                        <div>
                          <div style={{ width: "100%", height: 350 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={categoryData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={120}
                                  paddingAngle={5}
                                  dataKey="revenue"
                                >
                                  {categoryData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={COLORS[index % COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value) => formatCurrency(value)}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Legend display */}
                          <div className="mt-3 w-200">
                            <div className="row">
                              {categoryData.map((item, index) => (
                                <div
                                  className="col-6 mb-3 d-flex align-items-center"
                                  key={item.categoryId}
                                >
                                  <span
                                    className="d-inline-block mr-2"
                                    style={{
                                      width: "15px",
                                      height: "15px",
                                      background: COLORS[index % COLORS.length],
                                    }}
                                  ></span>
                                  <span className="text-truncate font-weight-bold text-secondary">
                                    {item.categoryName}:{" "}
                                    {formatCurrency(item.revenue)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Products Table */}
                <div className="col-xl-7 col-lg-6 mb-4">
                  <div className="card shadow-sm h-100">
                    <div className="row align-items-center">
                      <div className="card-header bg-white py-3 border-0">
                        <h6 style={{ margin: "10px" }}>
                          Top {limit} sản phẩm bán chạy nhất
                        </h6>
                      </div>
                      <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
                        <select
                          className="form-control"
                          value={limit}
                          onChange={(e) => setLimit(e.target.value)}
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                        </select>
                      </div>

                      <div className="col-md-3 col-sm-6 mb-3 mb-md-0">
                        <button
                          onClick={fetchAnalyticsData}
                          className="btn btn-primary btn-block shadow-sm"
                        >
                          Tính toán
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {topProducts.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          Chưa có sản phẩm bán chạy trong khoảng thời gian này.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: "#f8fafc" }}>
                              <tr>
                                <th scope="col" style={{ width: "100px" }}>
                                  Mã
                                </th>
                                <th scope="col">Tên sản phẩm</th>
                                <th scope="col" className="text-center">
                                  Đã bán
                                </th>
                                <th scope="col" className="text-right">
                                  Doanh thu
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {topProducts.map((item) => (
                                <tr key={item.productId}>
                                  <td className="font-weight-bold">
                                    {item.productId}
                                  </td>
                                  <td className="font-weight-bold">
                                    {item.productName}
                                  </td>
                                  <td className="text-center font-weight-bold">
                                    {item.totalQtySold}
                                  </td>
                                  <td className="text-right font-weight-bold">
                                    {formatCurrency(item.totalRevenueGenerated)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
