import React, { useState } from "react";
import { addressApi } from "../../../services/api";
import AddressDetailModal from "./AddressDetailModal";

const ShopAddressModal = ({
  show,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressesChanged,
}) => {
  const [viewMode, setViewMode] = useState("list"); // "list", "add", "edit"
  const [editingAddress, setEditingAddress] = useState(null);

  // Form states
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  if (!show) return null;

  const openAddForm = () => {
    setEditingAddress(null);
    setReceiverName("");
    setPhone("");
    setAddressLine("");
    setWard("");
    setDistrict("");
    setProvince("");
    setIsDefault(addresses.length === 0);
    setError("");
    setViewMode("add");
  };

  const openEditForm = (addr) => {
    setEditingAddress(addr);
    setReceiverName(addr.receiverName || "");
    setPhone(addr.phone || "");
    setAddressLine(addr.addressLine || "");
    setWard(addr.ward || "");
    setDistrict(addr.district || "");
    setProvince(addr.province || "");
    setIsDefault(addr.isDefault);
    setError("");
    setViewMode("edit");
  };

  const openDetailModal = (addr) => {
    setSelectedAddress(addr);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedAddress(null);
    setShowDetailModal(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!receiverName.trim() || !phone.trim() || !addressLine.trim()) {
      setError(
        "Vui lòng nhập đầy đủ Tên, Số điện thoại và Địa chỉ (Số nhà/Đường).",
      );
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
      let savedAddress;
      if (editingAddress) {
        const response = await addressApi.update(editingAddress.id, payload);
        savedAddress = response.data;
      } else {
        const response = await addressApi.create(payload);
        savedAddress = response.data;
      }

      await onAddressesChanged();

      // If it's a new address or they set it as default, we might want to auto-select it
      if (!editingAddress || isDefault) {
        onSelectAddress(String(savedAddress.id));
      }

      setViewMode("list");
    } catch (err) {
      setError(err.response?.data?.message || "Có lỗi xảy ra khi lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá địa chỉ này?")) return;
    try {
      await addressApi.delete(id);
      if (selectedAddress && Number(selectedAddress.id) === Number(id)) {
        closeDetailModal();
      }
      await onAddressesChanged();
      if (String(id) === String(selectedAddressId)) {
        onSelectAddress("");
      }
    } catch (err) {
      alert("Không thể xoá địa chỉ.");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await addressApi.setDefault(id);
      await onAddressesChanged();
    } catch (err) {
      alert("Không thể cập nhật địa chỉ mặc định.");
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        style={{ zIndex: 1050 }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          role="document"
        >
          <div className="modal-content">
            {viewMode === "list" ? (
              <>
                <div className="modal-header">
                  <h5 className="modal-title">Địa chỉ của tôi</h5>
                  <button type="button" className="close" onClick={onClose}>
                    <span>&times;</span>
                  </button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "60vh", overflowY: "auto" }}
                >
                  {addresses.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-muted">
                        Bạn chưa có địa chỉ nào được lưu.
                      </p>
                    </div>
                  ) : (
                    <div className="list-group">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                            String(selectedAddressId) === String(addr.id)
                              ? "border-primary"
                              : ""
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => onSelectAddress(String(addr.id))}
                        >
                          <div className="custom-control custom-radio mt-1 mr-3">
                            <input
                              type="radio"
                              className="custom-control-input"
                              checked={
                                String(selectedAddressId) === String(addr.id)
                              }
                              readOnly
                            />
                            <label className="custom-control-label"></label>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-1">
                              <span className="font-weight-bold border-right pr-2 mr-2">
                                {addr.receiverName}
                              </span>
                              <span className="text-muted">{addr.phone}</span>
                              {addr.isDefault && (
                                <span className="badge badge-primary ml-2">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <p className="mb-0 text-muted">
                              {addr.addressLine}
                            </p>
                            <p className="mb-0 text-muted">
                              {[addr.ward, addr.district, addr.province]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                          <div
                            className="d-flex flex-column align-items-end ml-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mb-2">
                              <button
                                className="btn btn-sm btn-link text-secondary p-0 mr-3"
                                onClick={() => openDetailModal(addr)}
                              >
                                Chi tiết
                              </button>
                              <button
                                className="btn btn-sm btn-link text-info p-0 mr-3"
                                onClick={() => openEditForm(addr)}
                              >
                                Cập nhật
                              </button>
                              <button
                                className="btn btn-sm btn-link text-danger p-0"
                                onClick={() => handleDelete(addr.id)}
                              >
                                Xóa
                              </button>
                            </div>
                            {!addr.isDefault && (
                              <button
                                className="btn btn-sm btn-outline-secondary mt-1"
                                onClick={() => handleSetDefault(addr.id)}
                              >
                                Thiết lập mặc định
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    className="btn btn-outline-primary btn-block mt-3 py-2"
                    onClick={openAddForm}
                  >
                    + Thêm Địa Chỉ Mỗi
                  </button>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onClose}
                  >
                    Xác nhận
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {viewMode === "add"
                      ? "Thêm địa chỉ mới"
                      : "Cập nhật địa chỉ"}
                  </h5>
                  <button
                    type="button"
                    className="close"
                    onClick={() => setViewMode("list")}
                  >
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Họ và tên</label>
                      <input
                        type="text"
                        className="form-control"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        placeholder="Họ và tên"
                        required
                      />
                    </div>
                    <div className="form-group col-md-6">
                      <label>Số điện thoại</label>
                      <input
                        type="text"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Số điện thoại"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Địa chỉ cụ thể</label>
                    <input
                      type="text"
                      className="form-control"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="Số nhà, tên đường..."
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
                      <label>Tỉnh/Thình phố</label>
                      <input
                        type="text"
                        className="form-control"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                      />
                    </div>
                  </div>
                  {!editingAddress?.isDefault && (
                    <div className="custom-control custom-checkbox mt-2">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="checkoutDefaultCheck"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        disabled={addresses.length === 0}
                      />
                      <label
                        className="custom-control-label"
                        htmlFor="checkoutDefaultCheck"
                      >
                        Đặt làm địa chỉ mặc định
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewMode("list")}
                  >
                    Trở lại
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Hoàn thình"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <AddressDetailModal
        show={showDetailModal}
        address={selectedAddress}
        onClose={closeDetailModal}
        onEdit={() => {
          if (!selectedAddress) {
            return;
          }
          closeDetailModal();
          openEditForm(selectedAddress);
        }}
        backdropZIndex={1060}
        modalZIndex={1065}
      />
    </>
  );
};

export default ShopAddressModal;
