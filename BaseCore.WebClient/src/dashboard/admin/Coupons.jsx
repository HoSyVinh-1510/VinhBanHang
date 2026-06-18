import React, { useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { couponApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { getPagedMeta, mapApiList } from "../../utils/shopDataUtils";
import {
  createDefaultCouponFormData,
  formatDateTime,
  normalizeCoupon,
  toDateTimeInputValue,
} from "../../utils/couponDataUtils";

const formatCurrency = (value) => `${(value || 0).toLocaleString("vi-VN")} đ`;

const DEFAULT_PAGE_SIZE = 10;

const parseNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const parseNullableInt = (value) => {
  if (value === "") {
    return null;
  }

  const numericValue = parseInt(value, 10);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const parseNullableDecimal = (value) => {
  if (value === "") {
    return null;
  }

  const numericValue = parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const mapCouponToFormData = (coupon) => {
  const normalizedCoupon = normalizeCoupon(coupon);
  return {
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
  };
};

const buildCouponPayload = (formData) => {
  const discountValue = parseFloat(formData.discountValue || 0);
  const minOrderAmount = parseFloat(formData.minOrderAmount || 0);
  const usageLimit = parseNullableInt(formData.usageLimit);
  const displayOrder = parseNumber(formData.displayOrder || 0, 0);
  const maxDiscountAmount =
    formData.discountType === "Percent"
      ? parseNullableDecimal(formData.maxDiscountAmount)
      : null;

  return {
    parsed: {
      discountValue,
      minOrderAmount,
      usageLimit,
      displayOrder,
      maxDiscountAmount,
    },
    payload: {
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
    },
  };
};

const validateCouponForm = (formData, parsedData) => {
  if (!formData.code.trim()) {
    return "Vui lòng nhập mã giảm giá.";
  }

  if (!formData.name.trim()) {
    return "Vui lòng nhập tên mã giảm giá.";
  }

  if (parsedData.discountValue <= 0) {
    return "Giá trị giảm giá phải lớn hơn 0.";
  }

  if (
    formData.discountType === "Percent" &&
    parsedData.discountValue > 100 &&
    parsedData.discountValue < 0
  ) {
    return "Giảm theo phần trăm nằm giữa 0 và 100.";
  }

  if (new Date(formData.endAt) <= new Date(formData.startAt)) {
    return "Thời gian kết thúc phải lớn hơn thời gian bắt đầu.";
  }

  if (parsedData.usageLimit !== null && parsedData.usageLimit <= 0) {
    return "Giới hạn lượt dùng phải lớn hơn 0.";
  }

  if (
    parsedData.maxDiscountAmount !== null &&
    parsedData.maxDiscountAmount < 0
  ) {
    return "Giảm tối đa không được âm.";
  }

  if (
    !Number.isFinite(parsedData.displayOrder) ||
    parsedData.displayOrder < 0
  ) {
    return "Thứ tự hiển thị phải là số không âm.";
  }
  return "";
};

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("");
  const [isPublicFilter, setIsPublicFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState(createDefaultCouponFormData());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [togglingCouponId, setTogglingCouponId] = useState(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadCoupons();
  }, [
    keyword,
    statusFilter,
    discountTypeFilter,
    isPublicFilter,
    page,
    pageSize,
  ]);

  const loadCoupons = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        keyword: keyword.trim() || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
        discountType: discountTypeFilter || undefined,
        isPublic: isPublicFilter === "" ? undefined : isPublicFilter === "true",
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

      setCoupons(items);
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setCoupons([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(
        loadError.response?.data?.message || "Không thể tải mã giảm giá.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput);
  };

  const handleResetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setStatusFilter("");
    setDiscountTypeFilter("");
    setIsPublicFilter("");
    setPageSize(DEFAULT_PAGE_SIZE);
    setPage(1);
  };

  const openModal = (coupon = null) => {
    if (coupon) {
      const normalizedCoupon = normalizeCoupon(coupon);
      setEditingCoupon(normalizedCoupon);
      setFormData(mapCouponToFormData(normalizedCoupon));
    } else {
      setEditingCoupon(null);
      setFormData(createDefaultCouponFormData());
    }

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCoupon(null);
    setFormData(createDefaultCouponFormData());
    setError("");
  };

  const setFormValue = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleFormInputChange = (field) => (event) => {
    setFormValue(field, event.target.value);
  };

  const handleFormCheckboxChange = (field) => (event) => {
    setFormValue(field, event.target.checked);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const { parsed, payload } = buildCouponPayload(formData);
    const validationError = validateCouponForm(formData, parsed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      if (editingCoupon) {
        await couponApi.update(editingCoupon.id, payload);
      } else {
        await couponApi.create(payload);
      }

      closeModal();
      await loadCoupons();
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá mã giảm giá này không?")) {
      return;
    }

    setError("");
    try {
      await couponApi.delete(id);
      await loadCoupons();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message || "Không thể xoá mã giảm giá.",
      );
    }
  };

  const handleToggleStatus = async (coupon) => {
    setError("");
    setTogglingCouponId(coupon.id);
    try {
      await couponApi.updateStatus(coupon.id, !coupon.isActive);
      await loadCoupons();
    } catch (toggleError) {
      setError(
        toggleError.response?.data?.message ||
          "Không thể thay đổi trạng thái mã giảm giá.",
      );
    } finally {
      setTogglingCouponId(null);
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý mã giảm giá</h1>
            </div>
            <div className="col-sm-6 text-right text-muted">
              Tổng: <strong>{totalCount}</strong> mã giảm giá
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-header">
              <div className="row">
                <div className="col-md-9">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="form-inline flex-wrap"
                  >
                    <input
                      type="text"
                      className="form-control mr-2 mb-2 mb-md-0"
                      placeholder="Tìm theo mã hoặc tên..."
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="true">Đang bật</option>
                      <option value="false">Đang tắt</option>
                    </select>
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={discountTypeFilter}
                      onChange={(event) =>
                        setDiscountTypeFilter(event.target.value)
                      }
                    >
                      <option value="">Tất cả loại giảm</option>
                      <option value="Percent">Phần trăm</option>
                      <option value="Fixed">Giảm thẳng</option>
                    </select>
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={isPublicFilter}
                      onChange={(event) =>
                        setIsPublicFilter(event.target.value)
                      }
                    >
                      <option value="">Tất cả hiển thị</option>
                      <option value="true">Công khai</option>
                      <option value="false">Nội bộ</option>
                    </select>
                    <button
                      type="submit"
                      className="btn btn-primary mr-2 mb-2 mb-md-0"
                    >
                      <i className="fas fa-search"></i> Lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary mr-2 mb-2 mb-md-0"
                      onClick={handleResetFilters}
                    >
                      Xoá lọc
                    </button>
                    <select
                      className="form-control mb-2 mb-md-0"
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
                  </form>
                </div>
                <div className="col-md-3 text-right mt-2 mt-md-0">
                  {isAdmin() && (
                    <button
                      className="btn btn-success"
                      onClick={() => openModal()}
                    >
                      Thêm mã giảm giá
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : (
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>ID</th>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Loại</th>
                      <th>Giá trị</th>
                      <th>Đơn tối thiểu</th>
                      <th>Thời gian áp dụng</th>
                      <th>Lượt dùng</th>
                      <th>Trạng thái</th>
                      {isAdmin() && (
                        <th style={{ width: "180px" }}>Thao tác</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin() ? 10 : 9}
                          className="text-center"
                        >
                          Không có mã giảm giá nào
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id}>
                          <td>{coupon.id}</td>
                          <td>
                            <strong>{coupon.code}</strong>
                          </td>
                          <td>{coupon.name}</td>
                          <td>
                            {coupon.discountType === "Percent"
                              ? "Phần trăm"
                              : "Giảm thẳng"}
                          </td>
                          <td>
                            {coupon.discountType === "Percent"
                              ? `${coupon.discountValue}%${coupon.maxDiscountAmount ? ` (Tối đa ${formatCurrency(coupon.maxDiscountAmount)})` : ""}`
                              : formatCurrency(coupon.discountValue)}
                          </td>
                          <td>{formatCurrency(coupon.minOrderAmount)}</td>
                          <td>
                            Bắt đầu: {formatDateTime(coupon.startAt)}
                            <br />
                            Kết thúc: {formatDateTime(coupon.endAt)}
                          </td>
                          <td>
                            {coupon.usedCount}
                            {coupon.usageLimit
                              ? ` / ${coupon.usageLimit}`
                              : " / Không giới hạn"}
                          </td>
                          <td>
                              {coupon.isActive ? "Đang bật" : "Đang tắt"}                   
                          </td>
                          {isAdmin() && (
                            <td>
                              <button
                                className={`btn btn-sm mr-1 ${coupon.isActive ? "btn-success" : "btn-warning"}`}
                                onClick={() => handleToggleStatus(coupon)}
                                disabled={togglingCouponId === coupon.id}
                                title={
                                  coupon.isActive
                                    ? "Tắt mã giảm giá"
                                    : "Bật mã giảm giá"
                                }
                              >
                                {togglingCouponId === coupon.id ? (
                                  <i className="fas fa-spinner fa-spin"></i>
                                ) : (
                                  <i
                                    className={`fas ${coupon.isActive ? "fa-toggle-off" : "fa-toggle-on"}`}
                                  ></i>
                                )}
                              </button>
                              <button
                                className="btn btn-sm btn-info mr-1"
                                onClick={() => openModal(coupon)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(coupon.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center">
              <span className="text-muted">
                Trang: <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex="-1"
        >
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

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Mã</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.code}
                        onChange={(event) =>
                          setFormValue("code", event.target.value.toUpperCase())
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
                        onChange={handleFormInputChange("name")}
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
                      onChange={handleFormInputChange("description")}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-3">
                      <label>Loại giảm giá</label>
                      <select
                        className="form-control"
                        value={formData.discountType}
                        onChange={(event) => {
                          const nextDiscountType = event.target.value;
                          setFormData((current) => ({
                            ...current,
                            discountType: nextDiscountType,
                            maxDiscountAmount:
                              nextDiscountType === "Percent"
                                ? current.maxDiscountAmount
                                : "",
                          }));
                        }}
                      >
                        <option value="Percent">Phần trăm</option>
                        <option value="Fixed">Giảm thẳng</option>
                      </select>
                    </div>
                    <div className="form-group col-md-3">
                      <label>
                        Giá trị
                        {formData.discountType === "Percent" ? " (%)" : " (đ)"}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.01"
                        value={formData.discountValue}
                        onChange={handleFormInputChange("discountValue")}
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
                        onChange={handleFormInputChange("minOrderAmount")}
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Giảm tối đa (đ)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={handleFormInputChange("maxDiscountAmount")}
                        disabled={formData.discountType !== "Percent"}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.startAt}
                        onChange={handleFormInputChange("startAt")}
                        required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Kết thúc</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.endAt}
                        onChange={handleFormInputChange("endAt")}
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
                        onChange={handleFormInputChange("usageLimit")}
                        placeholder="Để trống = không giới hạn"
                      />
                    </div>
                  </div>

                  <div className="form-group mb-0">
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="couponActiveSwitch"
                        checked={formData.isActive}
                        onChange={handleFormCheckboxChange("isActive")}
                      />
                      <label
                        className="custom-control-label"
                        htmlFor="couponActiveSwitch"
                      >
                        Bật mã giảm giá
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn btn-primary mr-2 mb-2 mb-md-0"
                    disabled={saving}
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingCoupon
                        ? "Cập nhật"
                        : "Tạo mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Coupons;
