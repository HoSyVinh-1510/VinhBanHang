import React from "react";

const toDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const AddressDetailModal = ({
  show,
  address,
  onClose,
  onEdit,
  backdropZIndex = 1060,
  modalZIndex = 1065,
}) => {
  if (!show || !address) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: backdropZIndex }}></div>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        style={{ zIndex: modalZIndex }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Thông tin địa chỉ</h5>
              <button type="button" className="close" onClick={onClose}>
                <span>&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group col-md-6">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    className="form-control"
                    value={toDisplayValue(address.receiverName)}
                    readOnly
                  />
                </div>
                <div className="form-group col-md-6">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control"
                    value={toDisplayValue(address.phone)}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ cụ thể</label>
                <input
                  type="text"
                  className="form-control"
                  value={toDisplayValue(address.addressLine)}
                  readOnly
                />
              </div>

              <div className="form-row">
                <div className="form-group col-md-4">
                  <label>Phường/Xã</label>
                  <input
                    type="text"
                    className="form-control"
                    value={toDisplayValue(address.ward)}
                    readOnly
                  />
                </div>
                <div className="form-group col-md-4">
                  <label>Quận/Huyện</label>
                  <input
                    type="text"
                    className="form-control"
                    value={toDisplayValue(address.district)}
                    readOnly
                  />
                </div>
                <div className="form-group col-md-4">
                  <label>Tỉnh/Thình phố</label>
                  <input
                    type="text"
                    className="form-control"
                    value={toDisplayValue(address.province)}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Địa chỉ đầy đủ</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={toDisplayValue(address.fullAddress)}
                  readOnly
                />
              </div>

              <div className="custom-control custom-checkbox">
                <input
                  type="checkbox"
                  className="custom-control-input"
                  id="addressDetailDefaultCheck"
                  checked={Boolean(address.isDefault)}
                  disabled
                  readOnly
                />
                <label className="custom-control-label" htmlFor="addressDetailDefaultCheck">
                  Địa chỉ mặc định
                </label>
              </div>
            </div>
            <div className="modal-footer">
              {typeof onEdit === "function" && (
                <button type="button" className="btn btn-outline-primary" onClick={onEdit}>
                  Sửa địa chỉ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddressDetailModal;
