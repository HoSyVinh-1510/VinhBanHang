import React, { useCallback, useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { couponApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import FilterCriteriaModal from "./components_UI/FilterCriteriaModal";
import CouponDetailModal from "./components_UI/CouponDetailModal";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  currencyFormatter,
  getPagedMeta,
  mapApiList,
} from "../../utils/shopDataUtils";
import {
  buildDiscountText,
  createDefaultCouponFormData,
  formatDateTime,
  normalizeCoupon,
  toDateTimeInputValue,
} from "../../utils/couponDataUtils";

const ACTIVE_MIN_ORDER_OPTIONS = [
  { id: "all", label: "Tất cả điều kiện", amount: null },
  { id: "0", label: "Không cần đơn tối thiểu", amount: 0 },
  { id: "50000", label: "Đơn của tôi từ 50.000đ", amount: 50000 },
  { id: "100000", label: "Đơn của tôi từ 100.000đ", amount: 100000 },
  { id: "200000", label: "Đơn của tôi từ 200.000đ", amount: 200000 },
];

const ACTIVE_SORT_OPTIONS = [
  { id: "display", label: "Gợi ý của shop" },
  { id: "endingSoon", label: "Sắp hết hạn" },
  { id: "discountDesc", label: "Giảm nhiều nhất" },
  { id: "minOrderAsc", label: "Điều kiện thấp nhất" },
];

const ShopCoupons = () => {
  useMultiShopStyles();

  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [searchInput, setSearchInput] = useState("");

  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loadingActiveCoupons, setLoadingActiveCoupons] = useState(true);
  const [activeKeywordInput, setActiveKeywordInput] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [activeDiscountTypeFilter, setActiveDiscountTypeFilter] = useState("");
  const [activeMinOrderFilter, setActiveMinOrderFilter] = useState("all");
  const [activeSortBy, setActiveSortBy] = useState("display");
  const [activePage, setActivePage] = useState(1);
  const [activePageSize, setActivePageSize] = useState(9);
  const [activeTotalCount, setActiveTotalCount] = useState(0);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [activeLoadError, setActiveLoadError] = useState("");
  const [showActiveFilterModal, setShowActiveFilterModal] = useState(false);
  const [activeFilterDraft, setActiveFilterDraft] = useState({
    keywordInput: "",
    discountType: "",
    minOrderFilter: "all",
    sortBy: "display",
    pageSize: 9,
  });

  const [adminCoupons, setAdminCoupons] = useState([]);
  const [loadingAdminCoupons, setLoadingAdminCoupons] = useState(false);
  const [adminKeywordInput, setAdminKeywordInput] = useState("");
  const [adminKeyword, setAdminKeyword] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [formData, setFormData] = useState(createDefaultCouponFormData());
  const [formError, setFormError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [togglingCouponId, setTogglingCouponId] = useState(null);

  const loadActiveCoupons = useCallback(async () => {
    setLoadingActiveCoupons(true);
    setActiveLoadError("");

    try {
      const selectedMinOrder =
        ACTIVE_MIN_ORDER_OPTIONS.find((option) => option.id === activeMinOrderFilter) ||
        ACTIVE_MIN_ORDER_OPTIONS[0];
      const response = await couponApi.getActive({
        keyword: activeKeyword.trim() || undefined,
        discountType: activeDiscountTypeFilter || undefined,
        maxMinOrderAmount:
          selectedMinOrder.amount === null ? undefined : selectedMinOrder.amount,
        sortBy: activeSortBy,
        page: activePage,
        pageSize: activePageSize,
      });
      const payload = response?.data ?? {};
      const coupons = mapApiList(payload).map(normalizeCoupon);
      const meta = getPagedMeta(payload, {
        page: activePage,
        pageSize: activePageSize,
        fallbackCount: coupons.length,
      });
      setActiveCoupons(coupons);
      setActiveTotalCount(meta.totalCount);
      setActiveTotalPages(meta.totalPages);
    } catch (loadError) {
      setActiveLoadError(loadError.response?.data?.message || "Không thể tải danh sách mã giảm giá.");
      setActiveCoupons([]);
      setActiveTotalCount(0);
      setActiveTotalPages(1);
    } finally {
      setLoadingActiveCoupons(false);
    }
  }, [
    activeDiscountTypeFilter,
    activeKeyword,
    activeMinOrderFilter,
    activePage,
    activePageSize,
    activeSortBy,
  ]);

  const loadAdminCoupons = useCallback(async () => {
    if (!isAdminUser) {
      return;
    }

    setLoadingAdminCoupons(true);
    setAdminError("");

    try {
      const params = {
        keyword: adminKeyword.trim() || undefined,
        isActive: adminStatusFilter === "" ? undefined : adminStatusFilter === "true",
        page,
        pageSize,
      };

      const response = await couponApi.getAll(params);
      const payload = response?.data ?? {};
      const items = mapApiList(payload).map(normalizeCoupon);
      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: items.length,
      });

      setAdminCoupons(items);
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setAdminError(loadError.response?.data?.message || "Không thể tải danh sách quản trị mã giảm giá.");
      setAdminCoupons([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoadingAdminCoupons(false);
    }
  }, [adminKeyword, adminStatusFilter, isAdminUser, page, pageSize]);

  useEffect(() => {
    loadActiveCoupons();
  }, [loadActiveCoupons]);

  useEffect(() => {
    loadAdminCoupons();
  }, [loadAdminCoupons]);

  useEffect(() => {
    if (activePage > activeTotalPages) {
      setActivePage(activeTotalPages);
    }
  }, [activePage, activeTotalPages]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list");
  };

  const openActiveFilterModal = () => {
    setActiveFilterDraft({
      keywordInput: activeKeywordInput,
      discountType: activeDiscountTypeFilter,
      minOrderFilter: activeMinOrderFilter,
      sortBy: activeSortBy,
      pageSize: activePageSize,
    });
    setShowActiveFilterModal(true);
  };

  const applyActiveFiltersFromModal = () => {
    const normalizedKeyword = (activeFilterDraft.keywordInput || "").trim();
    setActiveKeywordInput(activeFilterDraft.keywordInput || "");
    setActiveKeyword(normalizedKeyword);
    setActiveDiscountTypeFilter(activeFilterDraft.discountType || "");
    setActiveMinOrderFilter(activeFilterDraft.minOrderFilter || "all");
    setActiveSortBy(activeFilterDraft.sortBy || "display");
    setActivePageSize(Number(activeFilterDraft.pageSize) || 9);
    setActivePage(1);
    setShowActiveFilterModal(false);
  };

  const handleActiveResetFilters = () => {
    setActiveKeywordInput("");
    setActiveKeyword("");
    setActiveDiscountTypeFilter("");
    setActiveMinOrderFilter("all");
    setActiveSortBy("display");
    setActivePageSize(9);
    setActiveFilterDraft({
      keywordInput: "",
      discountType: "",
      minOrderFilter: "all",
      sortBy: "display",
      pageSize: 9,
    });
    setActivePage(1);
  };

  const handleAdminFilterSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setAdminKeyword(adminKeywordInput);
  };

  const handleAdminResetFilters = () => {
    setAdminKeywordInput("");
    setAdminKeyword("");
    setAdminStatusFilter("");
    setPage(1);
  };

  const openModal = (coupon = null) => {
    if (coupon) {
      const normalizedCoupon = normalizeCoupon(coupon);
      setEditingCoupon(normalizedCoupon);
      setFormData({
        code: normalizedCoupon.code || "",
        name: normalizedCoupon.name || "",
        description: normalizedCoupon.description || "",
        discountType: normalizedCoupon.discountType || "Percent",
        discountValue: normalizedCoupon.discountValue ?? "",
        minOrderAmount: normalizedCoupon.minOrderAmount ?? 0,
        maxDiscountAmount: normalizedCoupon.maxDiscountAmount ?? "",
        startAt: toDateTimeInputValue(normalizedCoupon.startAt),
        endAt: toDateTimeInputValue(normalizedCoupon.endAt),
        usageLimit: normalizedCoupon.usageLimit ?? "",
        isActive: normalizedCoupon.isActive ?? true,
        isPublic: normalizedCoupon.isPublic ?? true,
        displayOrder: normalizedCoupon.displayOrder ?? 0,
      });
    } else {
      setEditingCoupon(null);
      setFormData(createDefaultCouponFormData());
    }

    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
    setFormData(createDefaultCouponFormData());
    setFormError("");
  };

  const openDetailModal = (coupon) => {
    const normalizedCoupon = normalizeCoupon(coupon);
    setSelectedCoupon(normalizedCoupon);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedCoupon(null);
    setShowDetailModal(false);
  };

  const handleSaveCoupon = async (event) => {
    event.preventDefault();
    setFormError("");
    setAdminError("");
    setAdminSuccess("");

    const discountValue = parseFloat(formData.discountValue || 0);
    const minOrderAmount = parseFloat(formData.minOrderAmount || 0);
    const displayOrder = Number(formData.displayOrder || 0);
    const usageLimit =
      formData.usageLimit === "" ? null : parseInt(formData.usageLimit, 10);
    const maxDiscountAmount =
      formData.discountType === "Percent" && formData.maxDiscountAmount !== ""
        ? parseFloat(formData.maxDiscountAmount)
        : null;

    if (!formData.code.trim()) {
      setFormError("Vui lòng nhập mã giảm giá.");
      return;
    }

    if (!formData.name.trim()) {
      setFormError("Vui lòng nhập tên mã giảm giá.");
      return;
    }

    if (discountValue <= 0) {
      setFormError("Giá trị giảm giá phải lớn hơn 0.");
      return;
    }

    if (formData.discountType === "Percent" && discountValue > 100) {
      setFormError("Giảm theo phần trăm không được vượt quá 100.");
      return;
    }

    if (usageLimit !== null && usageLimit <= 0) {
      setFormError("Giới hạn lượt dùng phải lớn hơn 0.");
      return;
    }

    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      setFormError("Thứ tự hiển thị phải là số không âm.");
      return;
    }

    if (maxDiscountAmount !== null && maxDiscountAmount < 0) {
      setFormError("Giảm tối đa không được âm.");
      return;
    }

    if (new Date(formData.endAt) <= new Date(formData.startAt)) {
      setFormError("Thời gian kết thúc phải lớn hơn thời gian bắt đầu.");
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      discountType: formData.discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      startAt: formData.startAt,
      endAt: formData.endAt,
      usageLimit,
      isActive: formData.isActive,
      isPublic: formData.isPublic,
      displayOrder: Math.floor(displayOrder),
    };

    try {
      setSavingCoupon(true);
      if (editingCoupon) {
        await couponApi.update(editingCoupon.id, payload);
        setAdminSuccess("Đã cập nhật mã giảm giá.");
      } else {
        await couponApi.create(payload);
        setAdminSuccess("Đã tạo mã giảm giá.");
        setPage(1);
      }

      closeModal();
      await Promise.all([loadActiveCoupons(), loadAdminCoupons()]);
    } catch (saveError) {
      setFormError(saveError.response?.data?.message || "Không thể lưu mã giảm giá.");
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Bạn có chắc muốn xoá mã giảm giá này không?")) {
      return;
    }

    setAdminError("");
    setAdminSuccess("");

    try {
      await couponApi.delete(couponId);
      setAdminSuccess("Đã xoá mã giảm giá.");
      await Promise.all([loadActiveCoupons(), loadAdminCoupons()]);
    } catch (deleteError) {
      setAdminError(deleteError.response?.data?.message || "Không thể xoá mã giảm giá.");
    }
  };

  const handleToggleCouponStatus = async (coupon) => {
    setAdminError("");
    setAdminSuccess("");
    setTogglingCouponId(coupon.id);

    try {
      await couponApi.updateStatus(coupon.id, !coupon.isActive);
      setAdminSuccess(
        coupon.isActive ? "Đã tắt mã giảm giá." : "Đã bật mã giảm giá."
      );
      await Promise.all([loadActiveCoupons(), loadAdminCoupons()]);
    } catch (toggleError) {
      setAdminError(toggleError.response?.data?.message || "Không thể đổi trạng thái mã giảm giá.");
    } finally {
      setTogglingCouponId(null);
    }
  };

  return (
    <ShopShell
      activeRoute="coupons"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdminUser}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
    >
      <div className="container-fluid pt-4">
        <div className="row px-xl-5">
          <div className="col-12">
            <h5 className="section-title position-relative text-uppercase mb-3">
              <b>Mã giảm giá đang hiệu lực</b>
            </h5>
          </div>
        </div>

        <div className="row px-xl-5">
          <div className="col-12">
            <div className="bg-light p-3 mb-4 shop-toolbar-panel">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                <div className="mb-2 mb-md-0">
                  <button
                    type="button"
                    className="btn btn-primary mr-2 shop-toolbar-btn"
                    onClick={openActiveFilterModal}
                  >
                    Tiêu chí lọc
                  </button>
                </div>
                <small className="text-muted">
                  Tìm thấy <strong>{activeTotalCount}</strong> mã phù hợp.
                </small>
              </div>

            </div>
          </div>
        </div>

        <div className="row px-xl-5 pb-3">
          {loadingActiveCoupons && (
            <div className="col-12 text-muted py-4">Đang tải mã giảm giá...</div>
          )}

          {!loadingActiveCoupons && activeLoadError && (
            <div className="col-12">
              <div className="alert alert-danger">{activeLoadError}</div>
            </div>
          )}

          {!loadingActiveCoupons && !activeLoadError && activeCoupons.length === 0 && (
            <div className="col-12 text-muted py-4">
              Hiện chưa có mã giảm giá khả dụng.
            </div>
          )}

          {!loadingActiveCoupons &&
            !activeLoadError &&
            activeCoupons.map((coupon) => (
              <div className="col-lg-4 col-md-6 mb-4" key={coupon.id}>
                <div
                  className="bg-light p-4 h-100 border rounded shop-clickable-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetailModal(coupon)}
                  title="Xem chi tiết mã giảm giá"
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="mb-0 text-dark">{coupon.code}</h5>
                    <span className="badge badge-success">Còn Hiệu Lực</span>
                  </div>
                  <p className="mb-2 font-weight-bold">{coupon.name}</p>
                  <p className="mb-2">{buildDiscountText(coupon)}</p>
                  <p className="mb-2">
                    Đơn tối thiểu: {currencyFormatter.format(coupon.minOrderAmount || 0)}
                  </p>
                  <p className="mb-2 text-muted">
                    Hạn dùng: {formatDateTime(coupon.endAt)}
                  </p>
                  {coupon.description && (
                    <p className="mb-2 text-muted">Mô tả: {coupon.description}</p>
                  )}
                </div>
              </div>
            ))}
        </div>


        <div className="row px-xl-5 pb-4">

          <div className="col-6 text-muted mb-2 mb-md-0">
            Tổng mã hiển thị: <strong>{activeTotalCount}</strong>
          </div>
          <ul className="col-6 pagination mb-0">
            <li className={`page-item ${activePage <= 1 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setActivePage((current) => Math.max(1, current - 1))}
                disabled={activePage <= 1}
              >
                Trước
              </button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">
                {activePage}/{activeTotalPages}
              </span>
            </li>
            <li className={`page-item ${activePage >= activeTotalPages ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => setActivePage((current) => Math.min(activeTotalPages, current + 1))}
                disabled={activePage >= activeTotalPages}
              >
                Sau
              </button>
            </li>
          </ul>
        </div>
      </div>

      {isAdminUser && (
        <div className="container-fluid pb-5">
          <div className="row px-xl-5">
            <div className="col-12">
              <h5 className="text-uppercase mb-3">
                <b>Quản trị mã giảm giá (Chỉ dành cho Admin)</b>
              </h5>

              <div className="bg-light p-3 mb-3">
                <form className="form-row align-items-end" onSubmit={handleAdminFilterSubmit}>
                  <div className="form-group col-md-4 mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm theo mã hoặc tên"
                      value={adminKeywordInput}
                      onChange={(event) => setAdminKeywordInput(event.target.value)}
                    />
                  </div>
                  <div className="form-group col-md-2 mb-2">
                    <select
                      className="form-control"
                      value={adminStatusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setAdminStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="true">Đang hoạt động</option>
                      <option value="false">Ngừng hoạt động</option>
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-2">
                    <select
                      className="form-control"
                      value={pageSize}
                      onChange={(event) => {
                        setPage(1);
                        setPageSize(Number(event.target.value) || 10);
                      }}
                    >
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                    </select>
                  </div>
                  <div className="form-group col-md-4 mb-2 text-right">
                    <button type="submit" className="btn btn-primary mr-2">
                      Tìm kiếm
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary mr-2"
                      onClick={handleAdminResetFilters}
                    >
                      Xoá bộ lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => openModal()}
                    >
                      Thêm mã
                    </button>
                  </div>
                </form>
              </div>

              {adminSuccess && <div className="alert alert-success">{adminSuccess}</div>}
              {adminError && <div className="alert alert-danger">{adminError}</div>}

              <div className="table-responsive bg-light">
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Giá trị</th>
                      <th>Hiển thị</th>
                      <th>Thứ tự</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "160px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAdminCoupons && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          Đang tải danh sách quản trị...
                        </td>
                      </tr>
                    )}

                    {!loadingAdminCoupons && adminCoupons.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-4">
                          Không có mã giảm giá.
                        </td>
                      </tr>
                    )}

                    {!loadingAdminCoupons &&
                      adminCoupons.map((coupon) => (
                        <tr key={coupon.id}>
                          <td>
                            <strong>{coupon.code}</strong>
                          </td>
                          <td>{coupon.name}</td>
                          <td>{buildDiscountText(coupon)}</td>
                          <td>{coupon.isPublic ? "Có" : "Không"}</td>
                          <td>{coupon.displayOrder ?? 0}</td>
                          <td>{coupon.isActive ? "Bật" : "Tắt"}</td>
                          <td>
                            <button
                              type="button"
                              className={`btn btn-sm mr-1 ${coupon.isActive ? "btn-warning" : "btn-success"
                                }`}
                              onClick={() => handleToggleCouponStatus(coupon)}
                              disabled={togglingCouponId === coupon.id}
                              title={coupon.isActive ? "Tắt mã" : "Bật mã"}
                            >
                              {togglingCouponId === coupon.id ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                <i
                                  className={`fas ${coupon.isActive ? "fa-toggle-off" : "fa-toggle-on"
                                    }`}
                                ></i>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-info mr-1"
                              onClick={() => openModal(coupon)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCoupon(coupon.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-wrap justify-content-between align-items-center mt-3">
                <div className="text-muted mb-2 mb-md-0">
                  Tổng mã: <strong>{totalCount}</strong>
                </div>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          </div>
        </div>
      )}

      <FilterCriteriaModal
        show={showActiveFilterModal}
        title="Tiêu chí lọc mã giảm giá"
        onClose={() => setShowActiveFilterModal(false)}
        onApply={applyActiveFiltersFromModal}
        onReset={handleActiveResetFilters}
      >
        <div className="form-row">
          <div className="form-group col-md-12">
            <label>Từ khóa</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập mã, tên hoặc mô tả"
              value={activeFilterDraft.keywordInput}
              onChange={(event) =>
                setActiveFilterDraft((current) => ({
                  ...current,
                  keywordInput: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-group col-md-6">
            <label>Loại giảm</label>
            <select
              className="form-control"
              value={activeFilterDraft.discountType}
              onChange={(event) =>
                setActiveFilterDraft((current) => ({
                  ...current,
                  discountType: event.target.value,
                }))
              }
            >
              <option value="">Tất cả loại</option>
              <option value="Percent">Giảm phần trăm</option>
              <option value="Fixed">Giảm tiền mặt</option>
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Điều kiện đơn hàng</label>
            <select
              className="form-control"
              value={activeFilterDraft.minOrderFilter}
              onChange={(event) =>
                setActiveFilterDraft((current) => ({
                  ...current,
                  minOrderFilter: event.target.value,
                }))
              }
            >
              {ACTIVE_MIN_ORDER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6 mb-0">
            <label>Sắp xếp</label>
            <select
              className="form-control"
              value={activeFilterDraft.sortBy}
              onChange={(event) =>
                setActiveFilterDraft((current) => ({
                  ...current,
                  sortBy: event.target.value,
                }))
              }
            >
              {ACTIVE_SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6 mb-0">
            <label>Hiển thị</label>
            <select
              className="form-control"
              value={activeFilterDraft.pageSize}
              onChange={(event) =>
                setActiveFilterDraft((current) => ({
                  ...current,
                  pageSize: Number(event.target.value) || 9,
                }))
              }
            >
              <option value={10}>10 /trang</option>
              <option value={20}>20 /trang</option>
              <option value={50}>50 /trang</option>
            </select>
          </div>
        </div>
      </FilterCriteriaModal>

      {showModal && (
        <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCoupon ? "Sửa mã giảm giá" : "Thêm mã giảm giá"}
                </h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSaveCoupon}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger">{formError}</div>}

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Mã</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.code}
                        onChange={(event) =>
                          setFormData({ ...formData, code: event.target.value.toUpperCase() })
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-8">
                      <label>Tên mã giảm giá</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData({ ...formData, name: event.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData({ ...formData, description: event.target.value })
                      }
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-3">
                      <label>Loại giảm giá</label>
                      <select
                        className="form-control"
                        value={formData.discountType}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            discountType: event.target.value,
                            maxDiscountAmount:
                              event.target.value === "Percent"
                                ? formData.maxDiscountAmount
                                : "",
                          })
                        }
                      >
                        <option value="Percent">Phần trăm</option>
                        <option value="Fixed">Giảm thẳng</option>
                      </select>
                    </div>
                    <div className="form-group col-md-3">
                      <label>Giá trị ({formData.discountType === "Percent" ? "%" : "�"})</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.discountValue}
                        onChange={(event) =>
                          setFormData({ ...formData, discountValue: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Đơn tối thiểu (đ)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.minOrderAmount}
                        onChange={(event) =>
                          setFormData({ ...formData, minOrderAmount: event.target.value })
                        }
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Giảm tối đa (đ)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={(event) =>
                          setFormData({ ...formData, maxDiscountAmount: event.target.value })
                        }
                        disabled={formData.discountType !== "Percent"}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Ngày bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.startAt}
                        onChange={(event) =>
                          setFormData({ ...formData, startAt: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Ngày kết thúc</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.endAt}
                        onChange={(event) =>
                          setFormData({ ...formData, endAt: event.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Giới hạn lượt dùng</label>
                      <input
                        type="number"
                        className="form-control"
                        min="1"
                        value={formData.usageLimit}
                        onChange={(event) =>
                          setFormData({ ...formData, usageLimit: event.target.value })
                        }
                        placeholder="Để trống = không giới hạn"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Thứ tự hiển thị</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.displayOrder}
                        onChange={(event) =>
                          setFormData({ ...formData, displayOrder: event.target.value })
                        }
                      />
                    </div>
                    <div className="form-group col-md-8 d-flex align-items-end">
                      <div className="custom-control custom-checkbox mr-3">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="couponActiveSwitchShop"
                          checked={formData.isActive}
                          onChange={(event) =>
                            setFormData({ ...formData, isActive: event.target.checked })
                          }
                        />
                        <label
                          className="custom-control-label"
                          htmlFor="couponActiveSwitchShop"
                        >
                          Bật mã giảm giá
                        </label>
                      </div>

                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="couponPublicSwitchShop"
                          checked={formData.isPublic}
                          onChange={(event) =>
                            setFormData({ ...formData, isPublic: event.target.checked })
                          }
                        />
                        <label
                          className="custom-control-label"
                          htmlFor="couponPublicSwitchShop"
                        >
                          Hiển thị cho người dùng
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-success" disabled={savingCoupon}>
                    {savingCoupon
                      ? "Đang lưu..."
                      : editingCoupon
                        ? "Cập nhật"
                        : "Lưu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}

      <CouponDetailModal
        couponCode={selectedCoupon?.code || ""}
        show={showDetailModal}
        onClose={closeDetailModal}
      />
    </ShopShell>
  );
};

export default ShopCoupons;

