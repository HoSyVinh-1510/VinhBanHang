import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addressApi, userApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { normalizeAddress } from "../../utils/checkoutDataUtils";

const MAX_QR_UPLOAD_SIZE = 10 * 1024 * 1024;

const resolveText = (value, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const normalizeUserProfile = (apiUser, localUser) => ({
  id: resolveText(apiUser?.id ?? localUser?.userId),
  username: resolveText(apiUser?.username ?? localUser?.username),
  name: resolveText(apiUser?.name ?? localUser?.name),
  email: resolveText(apiUser?.email ?? localUser?.email),
  phone: resolveText(apiUser?.phone),
  position: resolveText(apiUser?.position),
  role: resolveText(localUser?.role),
  createdAt: apiUser?.created ?? "",
});

const normalizeRefundQr = (item) => ({
  id: Number(item?.id ?? item?.userRefundQrId ?? 0) || 0,
  displayName: resolveText(item?.displayName, ""),
  qrImageUrl: resolveText(item?.qrImageUrl, ""),
  isDefault: Boolean(item?.isDefault),
  createdAt: item?.createdAt ?? "",
  updatedAt: item?.updatedAt ?? "",
});

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("vi-VN");
};

const buildAddressText = (address) =>
  address?.fullAddress ||
  [address?.addressLine, address?.ward, address?.district, address?.province]
    .filter(Boolean)
    .join(", ");

const AdminProfile = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(normalizeUserProfile(null, user));
  const [addresses, setAddresses] = useState([]);
  const [refundQrs, setRefundQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [showQrModal, setShowQrModal] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [qrDisplayName, setQrDisplayName] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrIsDefault, setQrIsDefault] = useState(false);
  const [savingQr, setSavingQr] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    const userId = resolveText(user?.userId, "");
    const userRequest = userId
      ? userApi.getById(userId)
      : Promise.resolve(null);

    const [userResult, addressResult, qrResult] = await Promise.allSettled([
      userRequest,
      addressApi.getAll(),
      userApi.getMyRefundQrs(),
    ]);

    if (userResult.status === "fulfilled" && userResult.value) {
      setProfile(normalizeUserProfile(userResult.value?.data ?? null, user));
    } else {
      setProfile(normalizeUserProfile(null, user));
    }

    if (addressResult.status === "fulfilled") {
      const items = addressResult.value?.data ?? [];
      setAddresses(items.map(normalizeAddress).filter((item) => item.id > 0));
    } else {
      setAddresses([]);
      setError(
        addressResult.reason?.response?.data?.message ||
          "Không thể tải danh sách địa chỉ.",
      );
    }

    if (qrResult.status === "fulfilled") {
      const items = qrResult.value?.data ?? [];
      setRefundQrs(
        items
          .map(normalizeRefundQr)
          .filter((item) => item.id > 0 && item.qrImageUrl),
      );
    } else {
      setRefundQrs([]);
      setError(
        (current) =>
          current ||
          qrResult.reason?.response?.data?.message ||
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

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault) ?? null,
    [addresses],
  );

  const defaultQr = useMemo(
    () => refundQrs.find((item) => item.isDefault) ?? refundQrs[0] ?? null,
    [refundQrs],
  );

  const resetAddressForm = () => {
    setEditingAddress(null);
    setReceiverName("");
    setPhone("");
    setAddressLine("");
    setWard("");
    setDistrict("");
    setProvince("");
    setAddressIsDefault(addresses.length === 0);
  };

  const openCreateAddress = () => {
    setMessage("");
    setError("");
    resetAddressForm();
    setShowAddressModal(true);
  };

  const openEditAddress = (address) => {
    setMessage("");
    setError("");
    setEditingAddress(address);
    setReceiverName(address.receiverName || "");
    setPhone(address.phone || "");
    setAddressLine(address.addressLine || "");
    setWard(address.ward || "");
    setDistrict(address.district || "");
    setProvince(address.province || "");
    setAddressIsDefault(Boolean(address.isDefault));
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    if (savingAddress) {
      return;
    }

    setShowAddressModal(false);
    resetAddressForm();
  };

  const saveAddress = async (event) => {
    event.preventDefault();

    if (!receiverName.trim() || !phone.trim() || !addressLine.trim()) {
      setError("Vui lòng nhập tên người nhận, số điện thoại và địa chỉ.");
      return;
    }

    setSavingAddress(true);
    setError("");
    setMessage("");

    const payload = {
      receiverName: receiverName.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      ward: ward.trim() || null,
      district: district.trim() || null,
      province: province.trim() || null,
      isDefault: addressIsDefault,
    };

    try {
      if (editingAddress?.id) {
        await addressApi.update(editingAddress.id, payload);
        setMessage("Đã cập nhật địa chỉ.");
      } else {
        await addressApi.create(payload);
        setMessage("Đã thêm địa chỉ mới.");
      }

      setShowAddressModal(false);
      resetAddressForm();
      await loadProfile();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Không thể lưu địa chỉ.");
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (address) => {
    if (!address?.id) {
      return;
    }

    if (!window.confirm("Bạn có chắc muốn xoá địa chỉ này?")) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await addressApi.delete(address.id);
      setMessage("Đã xoá địa chỉ.");
      await loadProfile();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Không thể xoá địa chỉ.");
    }
  };

  const setDefaultAddress = async (address) => {
    if (!address?.id || address.isDefault) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await addressApi.setDefault(address.id);
      setMessage("Đã đặt địa chỉ mặc định.");
      await loadProfile();
    } catch (setDefaultError) {
      setError(
        setDefaultError.response?.data?.message ||
          "Không thể đặt địa chỉ mặc định.",
      );
    }
  };

  const resetQrForm = () => {
    setEditingQr(null);
    setQrDisplayName("");
    setQrImageUrl("");
    setQrIsDefault(refundQrs.length === 0);
  };

  const openCreateQr = () => {
    setMessage("");
    setError("");
    resetQrForm();
    setShowQrModal(true);
  };

  const openEditQr = (qr) => {
    setMessage("");
    setError("");
    setEditingQr(qr);
    setQrDisplayName(qr.displayName || "");
    setQrImageUrl(qr.qrImageUrl || "");
    setQrIsDefault(Boolean(qr.isDefault));
    setShowQrModal(true);
  };

  const closeQrModal = () => {
    if (savingQr) {
      return;
    }

    setShowQrModal(false);
    resetQrForm();
  };

  const uploadQrImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh QR.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_QR_UPLOAD_SIZE) {
      setError("Ảnh QR vượt quá 10MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQrImageUrl(reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("Không thể đọc file ảnh QR.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const saveQr = async (event) => {
    event.preventDefault();

    if (!qrImageUrl.trim()) {
      setError("Vui lòng nhập link ảnh QR hoặc tải ảnh QR từ máy.");
      return;
    }

    setSavingQr(true);
    setError("");
    setMessage("");

    const payload = {
      displayName: qrDisplayName.trim() || undefined,
      qrImageUrl: qrImageUrl.trim(),
      isDefault: qrIsDefault,
    };

    try {
      if (editingQr?.id) {
        await userApi.updateMyRefundQrItem(editingQr.id, payload);
        setMessage("Đã cập nhật QR nhận tiền.");
      } else {
        await userApi.createMyRefundQr(payload);
        setMessage("Đã thêm QR nhận tiền.");
      }

      setShowQrModal(false);
      resetQrForm();
      await loadProfile();
    } catch (saveError) {
      setError(
        saveError.response?.data?.message || "Không thể lưu QR nhận tiền.",
      );
    } finally {
      setSavingQr(false);
    }
  };

  const setDefaultQr = async (qr) => {
    if (!qr?.id || qr.isDefault) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await userApi.setDefaultMyRefundQrItem(qr.id);
      setMessage("Đã đặt QR mặc định.");
      await loadProfile();
    } catch (setDefaultError) {
      setError(
        setDefaultError.response?.data?.message || "Không thể đặt QR mặc định.",
      );
    }
  };

  const deleteQr = async (qr) => {
    if (!qr?.id) {
      return;
    }

    const title = qr.displayName || `QR #${qr.id}`;
    if (!window.confirm(`Bạn có chắc muốn xoá "${title}"?`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await userApi.deleteMyRefundQrItem(qr.id);
      setMessage("Đã xoá QR nhận tiền.");
      await loadProfile();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message || "Không thể xoá QR nhận tiền.",
      );
    }
  };

  return (
    <>
      <div className="content-wrapper">
        <section className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1>Thông tin cá nhân</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item">Trang chủ</li>
                  <li className="breadcrumb-item active">Thông tin cá nhân</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="content">
          <div className="container-fluid">
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="row">
              <div className="col-lg-4">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Thông tin tài khoản</h3>
                  </div>
                  <div className="card-body">
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

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Mặc định</h3>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">
                      <strong>Địa chỉ:</strong>{" "}
                      {defaultAddress
                        ? buildAddressText(defaultAddress)
                        : "Chưa có"}
                    </p>
                    <p className="mb-0">
                      <strong>QR nhận tiền:</strong>{" "}
                      {defaultQr
                        ? defaultQr.displayName || `QR #${defaultQr.id}`
                        : "Chưa có"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="card">
                  <div className="card-header d-flex align-items-center">
                    <h3 className="card-title mb-0">Địa chỉ nhận hàng</h3>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ml-auto"
                      onClick={openCreateAddress}
                    >
                      Thêm địa chỉ
                    </button>
                  </div>
                  <div className="card-body p-0">
                    {loading ? (
                      <div className="p-3 text-muted">Đang tải địa chỉ...</div>
                    ) : addresses.length === 0 ? (
                      <div className="p-4 text-center text-muted">
                        Chưa có địa chỉ nhận hàng.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered table-hover mb-0">
                          <thead>
                            <tr>
                              <th>Người nhận</th>
                              <th>Số điện thoại</th>
                              <th>Địa chỉ</th>
                              <th style={{ width: 110 }}>Mặc định</th>
                              <th style={{ width: 210 }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {addresses.map((address) => (
                              <tr key={address.id}>
                                <td>{address.receiverName}</td>
                                <td>{address.phone}</td>
                                <td>{buildAddressText(address)}</td>
                                <td>
                                  {address.isDefault ? (
                                    <span className="badge badge-secondary">
                                      Mặc định
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>
                                  {!address.isDefault && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary btn-sm mr-1"
                                      onClick={() => setDefaultAddress(address)}
                                    >
                                      Đặt mặc định
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline-info btn-sm mr-1"
                                    onClick={() => openEditAddress(address)}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => deleteAddress(address)}
                                  >
                                    Xoá
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header d-flex align-items-center">
                    <h3 className="card-title mb-0">QR nhận tiền</h3>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm ml-auto"
                      onClick={openCreateQr}
                    >
                      Thêm QR
                    </button>
                  </div>
                  <div className="card-body p-0">
                    {loading ? (
                      <div className="p-3 text-muted">
                        Đang tải QR nhận tiền...
                      </div>
                    ) : refundQrs.length === 0 ? (
                      <div className="p-4 text-center text-muted">
                        Chưa có QR nhận tiền.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered table-hover mb-0">
                          <thead>
                            <tr>
                              <th style={{ width: 140 }}>Ảnh QR</th>
                              <th>Tên tài khoản</th>
                              <th style={{ width: 120 }}>Mặc định</th>
                              <th style={{ width: 170 }}>Cập nhật</th>
                              <th style={{ width: 210 }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {refundQrs.map((qr) => (
                              <tr key={qr.id}>
                                <td>
                                  <img
                                    src={qr.qrImageUrl}
                                    alt={qr.displayName || `QR #${qr.id}`}
                                    className="img-thumbnail"
                                    style={{
                                      width: 96,
                                      height: 96,
                                      objectFit: "contain",
                                    }}
                                  />
                                </td>
                                <td>{qr.displayName || `QR #${qr.id}`}</td>
                                <td>
                                  {qr.isDefault ? (
                                    <span className="badge badge-secondary">
                                      Mặc định
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>
                                  {formatDateTime(qr.updatedAt || qr.createdAt)}
                                </td>
                                <td>
                                  {!qr.isDefault && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary btn-sm mr-1"
                                      onClick={() => setDefaultQr(qr)}
                                    >
                                      Đặt mặc định
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline-info btn-sm mr-1"
                                    onClick={() => openEditQr(qr)}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => deleteQr(qr)}
                                  >
                                    Xoá
                                  </button>
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
          </div>
        </section>
      </div>

      {showAddressModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form onSubmit={saveAddress}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {editingAddress ? "Cập nhật địa chỉ" : "Thêm địa chỉ"}
                    </h5>
                    <button
                      type="button"
                      className="close"
                      onClick={closeAddressModal}
                      disabled={savingAddress}
                    >
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Người nhận</label>
                      <input
                        className="form-control"
                        value={receiverName}
                        onChange={(event) =>
                          setReceiverName(event.target.value)
                        }
                        disabled={savingAddress}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input
                        className="form-control"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={savingAddress}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Địa chỉ</label>
                      <input
                        className="form-control"
                        value={addressLine}
                        onChange={(event) => setAddressLine(event.target.value)}
                        disabled={savingAddress}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group col-md-4">
                        <label>Phường/Xã</label>
                        <input
                          className="form-control"
                          value={ward}
                          onChange={(event) => setWard(event.target.value)}
                          disabled={savingAddress}
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Quận/Huyện</label>
                        <input
                          className="form-control"
                          value={district}
                          onChange={(event) => setDistrict(event.target.value)}
                          disabled={savingAddress}
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Tỉnh/Thình phố</label>
                        <input
                          className="form-control"
                          value={province}
                          onChange={(event) => setProvince(event.target.value)}
                          disabled={savingAddress}
                        />
                      </div>
                    </div>
                    {!editingAddress?.isDefault && (
                      <div className="custom-control custom-checkbox">
                        <input
                          id="adminAddressDefault"
                          type="checkbox"
                          className="custom-control-input"
                          checked={addressIsDefault}
                          onChange={(event) =>
                            setAddressIsDefault(event.target.checked)
                          }
                          disabled={savingAddress || addresses.length === 0}
                        />
                        <label
                          className="custom-control-label"
                          htmlFor="adminAddressDefault"
                        >
                          Đặt làm mặc định
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeAddressModal}
                      disabled={savingAddress}
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingAddress}
                    >
                      {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {showQrModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <form onSubmit={saveQr}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {editingQr
                        ? "Cập nhật QR nhận tiền"
                        : "Thêm QR nhận tiền"}
                    </h5>
                    <button
                      type="button"
                      className="close"
                      onClick={closeQrModal}
                      disabled={savingQr}
                    >
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Tên tài khoản nhận tiền</label>
                      <input
                        className="form-control"
                        value={qrDisplayName}
                        onChange={(event) =>
                          setQrDisplayName(event.target.value)
                        }
                        placeholder="Ví dụ: Vietcombank, Momo..."
                        disabled={savingQr}
                        maxLength={120}
                      />
                    </div>
                    <div className="form-group">
                      <label>Link ảnh QR</label>
                      <input
                        className="form-control"
                        value={qrImageUrl}
                        onChange={(event) => setQrImageUrl(event.target.value)}
                        placeholder="Dán link ảnh QR hoặc tải ảnh từ máy"
                        disabled={savingQr}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tải ảnh QR</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={uploadQrImage}
                        disabled={savingQr}
                      />
                      <small className="form-text text-muted">
                        Tối đa 10MB.
                      </small>
                    </div>
                    <div className="custom-control custom-checkbox mb-3">
                      <input
                        id="adminQrDefault"
                        type="checkbox"
                        className="custom-control-input"
                        checked={qrIsDefault}
                        onChange={(event) =>
                          setQrIsDefault(event.target.checked)
                        }
                        disabled={savingQr || refundQrs.length === 0}
                      />
                      <label
                        className="custom-control-label"
                        htmlFor="adminQrDefault"
                      >
                        Đặt làm mặc định
                      </label>
                    </div>
                    {qrImageUrl && (
                      <div className="text-center border rounded p-2">
                        <img
                          src={qrImageUrl}
                          alt="Xem trước QR"
                          className="img-fluid"
                          style={{ maxWidth: 220, maxHeight: 220 }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeQrModal}
                      disabled={savingQr}
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingQr}
                    >
                      {savingQr ? "Đang lưu..." : "Lưu QR"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AdminProfile;
