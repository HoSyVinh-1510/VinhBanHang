import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { addressApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import { normalizeAddress } from "../../utils/checkoutDataUtils";
import AddressDetailModal from "./components_UI/AddressDetailModal";

const ShopAddresses = () => {
  useMultiShopStyles();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [searchInput, setSearchInput] = useState("");

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Form states
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const response = await addressApi.getAll();
      const items = response?.data || [];
      const normalized = items.map(normalizeAddress).filter((a) => a.id > 0);
      setAddresses(normalized);
    } catch (err) {
      setError("Không thể tải danh sách địa chỉ.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleShopSearchSubmit = (event) => {
    event.preventDefault();
    if (searchInput.trim()) {
      navigate(`/shop/list?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setReceiverName("");
    setPhone("");
    setAddressLine("");
    setWard("");
    setDistrict("");
    setProvince("");
    setIsDefault(addresses.length === 0);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setReceiverName(addr.receiverName || "");
    setPhone(addr.phone || "");
    setAddressLine(addr.addressLine || "");
    setWard(addr.ward || "");
    setDistrict(addr.district || "");
    setProvince(addr.province || "");
    setIsDefault(addr.isDefault);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openDetailModal = (addr) => {
    setSelectedAddress(addr);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedAddress(null);
    setShowDetailModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!receiverName.trim() || !phone.trim() || !addressLine.trim()) {
      setError("Vui lòng nhập đầy đủ Tên, Số điện thoại và Địa chỉ (Số nhà/Đường).");
      return;
    }

    setSaving(true);
    const payload = {
      receiverName: receiverName.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim(),
      ward: ward.trim() || null,
      district: district.trim() || null,
      province: province.trim() || null,
      isDefault,
    };

    try {
      if (editingAddress) {
        await addressApi.update(editingAddress.id, payload);
        setSuccess("Cập nhật địa chỉ thành công!");
      } else {
        await addressApi.create(payload);
        setSuccess("Thêm địa chỉ mới thành công!");
      }
      setShowModal(false);
      loadAddresses();
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá địa chỉ này?")) {
      return;
    }
    try {
      await addressApi.delete(id);
      if (selectedAddress && Number(selectedAddress.id) === Number(id)) {
        closeDetailModal();
      }
      setSuccess("Đã xoá địa chỉ!");
      loadAddresses();
    } catch (err) {
      setError("Không thể xoá địa chỉ.");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressApi.setDefault(id);
      setSuccess("Đã đặt làm địa chỉ mặc định!");
      loadAddresses();
    } catch (err) {
      setError("Không thể cập nhật địa chỉ mặc định.");
    }
  };

  return (
    <>
      <ShopShell
        activeRoute="addresses"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={isAdmin()}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleShopSearchSubmit}
      >
        <div className="container-fluid pb-5">
          <div className="row px-xl-5">
            <div className="col-lg-9 col-md-8">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="section-title position-relative text-uppercase mb-0">
                  <span className="bg-light pr-3">Sổ địa chỉ</span>
                </h5>
                <button className="btn btn-primary font-weight-bold" onClick={openAddModal}>
                  + Thêm địa chỉ mới
                </button>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {loading ? (
                <p>Đang tải...</p>
              ) : addresses.length === 0 ? (
                <div className="bg-light p-5 text-center">
                  <p className="text-muted mb-3">Bạn chưa lưu địa chỉ nào.</p>
                  <button className="btn btn-primary" onClick={openAddModal}>
                    Thêm địa chỉ ngay
                  </button>
                </div>
              ) : (
                <div className="row">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="col-md-6 mb-4">
                      <div className={`card h-100 ${addr.isDefault ? "border-primary" : ""}`}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6
                              className="font-weight-bold mb-0"
                              style={{ cursor: "pointer" }}
                              onClick={() => openDetailModal(addr)}
                            >
                              {addr.receiverName}
                              {addr.isDefault && (
                                <span className="badge badge-primary ml-2">Mặc định</span>
                              )}
                            </h6>
                            <div>
                              <button
                                className="btn btn-sm btn-outline-info mr-2"
                                onClick={() => openEditModal(addr)}
                              >
                                Sửa
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(addr.id)}
                              >
                                Xoá
                              </button>
                            </div>
                          </div>
                          <p className="mb-1 text-muted">SĐT: {addr.phone}</p>
                          <p
                            className="mb-3 text-muted"
                            style={{ cursor: "pointer" }}
                            onClick={() => openDetailModal(addr)}
                          >
                            Địa chỉ: {addr.fullAddress}
                          </p>

                          {!addr.isDefault && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleSetDefault(addr.id)}
                            >
                              Đặt làm mặc định
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </ShopShell>

      <AddressDetailModal
        show={showDetailModal}
        address={selectedAddress}
        onClose={closeDetailModal}
        onEdit={() => {
          if (!selectedAddress) {
            return;
          }
          closeDetailModal();
          openEditModal(selectedAddress);
        }}
      />

      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleSave}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {editingAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
                    </h5>
                    <button type="button" className="close" onClick={handleCloseModal}>
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Họ và tên người nhận</label>
                      <input
                        type="text"
                        className="form-control"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input
                        type="text"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Địa chỉ (Số nhà, Tên đường)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group col-md-4">
                        <label>Phường/Xã</label>
                        <input
                          type="text"
                          className="form-control"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Quận/Huyện</label>
                        <input
                          type="text"
                          className="form-control"
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                        />
                      </div>
                      <div className="form-group col-md-4">
                        <label>Tỉnh/Thành phố</label>
                        <input
                          type="text"
                          className="form-control"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                        />
                      </div>
                    </div>
                    {!editingAddress?.isDefault && (
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="isDefaultCheck"
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          disabled={addresses.length === 0}
                        />
                        <label className="custom-control-label" htmlFor="isDefaultCheck">
                          Đặt làm địa chỉ mặc định
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Đang lưu..." : "Lưu địa chỉ"}
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

export default ShopAddresses;

