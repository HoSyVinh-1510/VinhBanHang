import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { addressApi, userApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import { normalizeAddress } from "../../utils/checkoutDataUtils";

const MAX_QR_UPLOAD_SIZE = 2 * 1024 * 1024;

const resolveUserField = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const normalizeUserProfile = (apiUser, localUser) => ({
  id: resolveUserField(apiUser?.id ?? localUser?.userId, "-"),
  username: resolveUserField(apiUser?.username ?? localUser?.username, "-"),
  name: resolveUserField(apiUser?.name ?? localUser?.name, "-"),
  email: resolveUserField(apiUser?.email ?? localUser?.email, "-"),
  phone: resolveUserField(apiUser?.phone, "-"),
  position: resolveUserField(apiUser?.position, "-"),
  refundQrImageUrl: resolveUserField(apiUser?.refundQrImageUrl, ""),
  role: resolveUserField(localUser?.role, "-"),
  createdAt: apiUser?.created ?? "",
});

const normalizeRefundQrItem = (item) => ({
  id: Number(item?.id ?? item?.userRefundQrId ?? 0) || 0,
  displayName: resolveUserField(item?.displayName, ""),
  qrImageUrl: resolveUserField(item?.qrImageUrl, ""),
  isDefault: Boolean(item?.isDefault),
  createdAt: item?.createdAt ?? "",
  updatedAt: item?.updatedAt ?? "",
});

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "-";
  }
  return dateValue.toLocaleString("vi-VN");
};

const ShopProfile = () => {
  useMultiShopStyles();

  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [profile, setProfile] = useState(normalizeUserProfile(null, user));
  const [addresses, setAddresses] = useState([]);
  const [refundQrs, setRefundQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refundQrError, setRefundQrError] = useState("");
  const [refundQrSuccess, setRefundQrSuccess] = useState("");
  const [showRefundQrModal, setShowRefundQrModal] = useState(false);
  const [editingRefundQr, setEditingRefundQr] = useState(null);
  const [qrDisplayNameInput, setQrDisplayNameInput] = useState("");
  const [qrImageUrlInput, setQrImageUrlInput] = useState("");
  const [qrIsDefaultInput, setQrIsDefaultInput] = useState(false);
  const [savingRefundQr, setSavingRefundQr] = useState(false);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError("");
    setRefundQrError("");

    const userId = resolveUserField(user?.userId, "");
    const userRequest = userApi.getProfile();

    const [userResult, addressResult, refundQrResult] =
      await Promise.allSettled([
        userRequest ?? Promise.resolve(null),
        addressApi.getAll(),
        userApi.getMyRefundQrs(),
      ]);

    let apiUser = null;
    if (userResult.status === "fulfilled" && userResult.value) {
      apiUser = userResult.value?.data ?? null;
    }

    if (addressResult.status === "fulfilled") {
      const rawItems = addressResult.value?.data || [];
      setAddresses(
        rawItems.map(normalizeAddress).filter((item) => item.id > 0),
      );
    } else {
      setAddresses([]);
      setError(
        addressResult.reason?.response?.data?.message ||
          "Không thể tải danh sách địa chỉ nhận hàng.",
      );
    }

    if (refundQrResult.status === "fulfilled") {
      const rawItems = refundQrResult.value?.data || [];
      const normalizedItems = rawItems
        .map(normalizeRefundQrItem)
        .filter((item) => item.id > 0 && item.qrImageUrl);
      setRefundQrs(normalizedItems);
    } else {
      setRefundQrs([]);
      setRefundQrError(
        refundQrResult.reason?.response?.data?.message ||
          "Không thể tải danh sách QR nhận tiền.",
      );
    }

    if (userResult.status === "rejected") {
      setError(
        (current) =>
          current ||
          userResult.reason?.response?.data?.message ||
          "Không thể tải thông tin cá nhân.",
      );
    }

    const nextProfile = normalizeUserProfile(apiUser, user);
    setProfile(nextProfile);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault) ?? null,
    [addresses],
  );

  const defaultRefundQr = useMemo(
    () => refundQrs.find((item) => item.isDefault) ?? refundQrs[0] ?? null,
    [refundQrs],
  );

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

  const closeRefundQrModal = (force = false) => {
    if (savingRefundQr && !force) {
      return;
    }
    setShowRefundQrModal(false);
    setEditingRefundQr(null);
    setQrDisplayNameInput("");
    setQrImageUrlInput("");
    setQrIsDefaultInput(false);
  };

  const openCreateRefundQrModal = () => {
    setRefundQrError("");
    setRefundQrSuccess("");
    setEditingRefundQr(null);
    setQrDisplayNameInput("");
    setQrImageUrlInput("");
    setQrIsDefaultInput(refundQrs.length === 0);
    setShowRefundQrModal(true);
  };

  const openEditRefundQrModal = (item) => {
    setRefundQrError("");
    setRefundQrSuccess("");
    setEditingRefundQr(item);
    setQrDisplayNameInput(item.displayName || "");
    setQrImageUrlInput(item.qrImageUrl || "");
    setQrIsDefaultInput(Boolean(item.isDefault));
    setShowRefundQrModal(true);
  };

  const handleUploadQrImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setRefundQrError("Chỉ chấp nhận file ảnh QR.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_QR_UPLOAD_SIZE) {
      setRefundQrError("Ảnh QR vượt quá 2MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQrImageUrlInput(reader.result);
        setRefundQrError("");
      }
    };
    reader.onerror = () => {
      setRefundQrError("Không thể đọc file ảnh QR.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSaveRefundQr = async () => {
    const normalizedImage = qrImageUrlInput.trim();
    if (!normalizedImage) {
      setRefundQrError("Vui lòng nhập link ảnh QR hoặc tải ảnh từ máy.");
      return;
    }

    setSavingRefundQr(true);
    setRefundQrError("");
    setRefundQrSuccess("");

    try {
      const payload = {
        displayName: qrDisplayNameInput.trim() || undefined,
        qrImageUrl: normalizedImage,
        isDefault: qrIsDefaultInput,
      };

      if (editingRefundQr?.id) {
        await userApi.updateMyRefundQrItem(editingRefundQr.id, payload);
        setRefundQrSuccess("Đã cập nhật QR nhận tiền.");
      } else {
        await userApi.createMyRefundQr(payload);
        setRefundQrSuccess("Đã thêm QR nhận tiền.");
      }

      closeRefundQrModal(true);
      await loadProfileData();
    } catch (saveError) {
      setRefundQrError(
        saveError.response?.data?.message || "Không thể lưu QR nhận tiền.",
      );
    } finally {
      setSavingRefundQr(false);
    }
  };

  const handleSetDefaultRefundQr = async (item) => {
    if (!item?.id || item.isDefault) {
      return;
    }

    setRefundQrError("");
    setRefundQrSuccess("");
    try {
      await userApi.setDefaultMyRefundQrItem(item.id);
      setRefundQrSuccess(
        `Đã đặt "${item.displayName || `QR #${item.id}`}" làm mặc định.`,
      );
      await loadProfileData();
    } catch (setDefaultError) {
      setRefundQrError(
        setDefaultError.response?.data?.message || "Không thể đặt QR mặc định.",
      );
    }
  };

  const handleDeleteRefundQr = async (item) => {
    if (!item?.id) {
      return;
    }

    const title = item.displayName || `QR #${item.id}`;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá "${title}"?`)) {
      return;
    }

    setRefundQrError("");
    setRefundQrSuccess("");
    try {
      await userApi.deleteMyRefundQrItem(item.id);
      setRefundQrSuccess(`Đã xoá "${title}".`);
      await loadProfileData();
    } catch (deleteError) {
      setRefundQrError(
        deleteError.response?.data?.message || "Không thể xoá QR nhận tiền.",
      );
    }
  };

  return (
    <>
      <ShopShell
        activeRoute="profile"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={isAdmin()}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      >
        <div className="container-fluid pb-5">
          <div className="row px-xl-5">
            <div className="col-lg-4 mb-4">
              <div className="bg-light p-4 h-100">
                <h5 className="section-title position-relative text-uppercase mb-4">
                  <span className="bg-light pr-3">Tài khoản của tôi</span>
                </h5>

                {loading ? (
                  <p className="text-muted mb-0">Đang tải thông tin...</p>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Mã tài khoản</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.id}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tên đăng nhập</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.username}
                      />
                    </div>
                    <div className="form-group">
                      <label>Họ và tên</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.name}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.email}
                      />
                    </div>
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.phone}
                      />
                    </div>
                    <div className="form-group">
                      <label>Vai trò</label>
                      <input
                        className="form-control"
                        readOnly
                        value={profile.role}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label>Ngày tạo tài khoản</label>
                      <input
                        className="form-control"
                        readOnly
                        value={formatDateTime(profile.createdAt)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-lg-8 mb-4">
              <div className="bg-light p-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="section-title position-relative text-uppercase mb-0">
                    <span className="bg-light pr-3">Địa chỉ nhận hàng</span>
                  </h5>
                  <Link
                    to="/shop/addresses"
                    className="btn btn-primary btn-sm font-weight-bold"
                  >
                    Quản lý địa chỉ
                  </Link>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                {loading ? (
                  <p className="text-muted mb-0">Đang tải địa chỉ...</p>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted mb-3">
                      Bạn chưa có địa chỉ nhận hàng.
                    </p>
                    <Link
                      to="/shop/addresses"
                      className="btn btn-outline-primary btn-sm"
                    >
                      + Thêm địa chỉ mới
                    </Link>
                  </div>
                ) : (
                  <div className="list-group">
                    {addresses.map((addressItem) => (
                      <div key={addressItem.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            <strong>{addressItem.receiverName}</strong>
                            <span className="text-muted ml-2">
                              {addressItem.phone}
                            </span>
                          </div>
                          {addressItem.isDefault && (
                            <span className="badge badge-primary">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="text-muted">
                          {addressItem.fullAddress ||
                            [
                              addressItem.addressLine,
                              addressItem.ward,
                              addressItem.district,
                              addressItem.province,
                            ]
                              .filter(Boolean)
                              .join("- ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!loading && defaultAddress && (
                  <div className="mt-3 alert alert-secondary mb-0">
                    <strong>Địa chỉ mặc định:</strong>{" "}
                    {defaultAddress.fullAddress}
                  </div>
                )}

                <hr className="my-4" />

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="section-title position-relative text-uppercase mb-0">
                    <span className="bg-light pr-3">QR Thanh Toán</span>
                  </h5>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm font-weight-bold"
                    onClick={openCreateRefundQrModal}
                  >
                    + Thêm QR
                  </button>
                </div>

                {refundQrSuccess && (
                  <div className="alert alert-success">{refundQrSuccess}</div>
                )}
                {refundQrError && (
                  <div className="alert alert-danger">{refundQrError}</div>
                )}

                {loading ? (
                  <p className="text-muted mb-0">Đang tải danh sách QR...</p>
                ) : refundQrs.length === 0 ? (
                  <div className="text-center py-4 border rounded bg-white">
                    <p className="text-muted mb-3">
                      Bạn chưa thêm QR nhận tiền nào.
                    </p>
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={openCreateRefundQrModal}
                    >
                      + Thêm QR đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="list-group">
                    {refundQrs.map((item) => (
                      <div key={item.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <strong>
                              {item.displayName || `QR #${item.id}`}
                            </strong>
                            {item.isDefault && (
                              <span className="badge badge-primary ml-2">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {!item.isDefault && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary mr-2 mb-1"
                                onClick={() => handleSetDefaultRefundQr(item)}
                              >
                                Đặt mặc định
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info mr-2 mb-1"
                              onClick={() => openEditRefundQrModal(item)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger mb-1"
                              onClick={() => handleDeleteRefundQr(item)}
                            >
                              Xoá
                            </button>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap align-items-start">
                          <div className="border rounded p-2 bg-white mr-3 mb-2">
                            <img
                              src={item.qrImageUrl}
                              alt={item.displayName || `QR #${item.id}`}
                              className="img-fluid"
                              style={{ maxWidth: "150px", maxHeight: "150px" }}
                            />
                          </div>
                          <div className="text-muted small mb-2">
                            <div>Tạo lúc: {formatDateTime(item.createdAt)}</div>
                            <div>
                              Cập nhật gần nhất:{" "}
                              {formatDateTime(item.updatedAt || item.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ShopShell>

      {showRefundQrModal && (
        <div
          className="modal fade show"
          style={{ display: "block", zIndex: 1055 }}
          tabIndex="-1"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingRefundQr
                    ? "Cập nhật QR nhận tiền"
                    : "Thêm QR nhận tiền"}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeRefundQrModal}
                  disabled={savingRefundQr}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên tài khoản nhận tiền</label>
                  <input
                    type="text"
                    className="form-control"
                    value={qrDisplayNameInput}
                    onChange={(event) =>
                      setQrDisplayNameInput(event.target.value)
                    }
                    placeholder="Tải ảnh mã QR vào đây!"
                    maxLength={120}
                    disabled={savingRefundQr}
                  />
                </div>

                <div className="form-group">
                  <label>Link ảnh QR</label>
                  <input
                    type="text"
                    className="form-control"
                    value={qrImageUrlInput}
                    onChange={(event) => setQrImageUrlInput(event.target.value)}
                    placeholder="Dán link ảnh QR hoặc tải file ảnh bên dưới"
                    disabled={savingRefundQr}
                  />
                </div>

                <div className="form-group">
                  <label>Tải ảnh QR từ máy tính</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleUploadQrImage}
                    disabled={savingRefundQr}
                  />
                  <small className="text-muted">
                    Tối đa 2MB. Ảnh sẽ được lưu trực tiếp vào tài khoản.
                  </small>
                </div>

                <div className="custom-control custom-checkbox mb-3">
                  <input
                    id="refundQrDefaultCheck"
                    type="checkbox"
                    className="custom-control-input"
                    checked={qrIsDefaultInput}
                    onChange={(event) =>
                      setQrIsDefaultInput(event.target.checked)
                    }
                    disabled={savingRefundQr || refundQrs.length === 0}
                  />
                  <label
                    className="custom-control-label"
                    htmlFor="refundQrDefaultCheck"
                  >
                    Đặt làm QR mặc định
                  </label>
                </div>

                {qrImageUrlInput && (
                  <div className="text-center border rounded p-2 bg-white">
                    <img
                      src={qrImageUrlInput}
                      alt="Xem trước QR"
                      className="img-fluid"
                      style={{ maxWidth: "220px", maxHeight: "220px" }}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeRefundQrModal}
                  disabled={savingRefundQr}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveRefundQr}
                  disabled={savingRefundQr}
                >
                  {savingRefundQr ? "Đang lưu..." : "Lưu QR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRefundQrModal && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1050 }}
        ></div>
      )}
    </>
  );
};

export default ShopProfile;

