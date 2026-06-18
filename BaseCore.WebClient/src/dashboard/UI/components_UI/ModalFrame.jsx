import React from "react";

const ModalFrame = ({
  show,
  title,
  onClose,
  children,
  footer = null,
  dialogClassName = "",
  contentClassName = "",
  bodyClassName = "",
  modalClassName = "",
  zIndex = 1055,
  backdropZIndex = 1050,
  closeDisabled = false,
}) => {
  if (!show) {
    return null;
  }

  return (
    <>
      <div
        className={`modal fade show ${modalClassName}`.trim()}
        style={{ display: "block", zIndex }}
        tabIndex="-1"
      >
        <div className={`modal-dialog ${dialogClassName}`.trim()}>
          <div className={`modal-content ${contentClassName}`.trim()}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className="close"
                onClick={onClose}
                disabled={closeDisabled}
              >
                <span>&times;</span>
              </button>
            </div>
            <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: backdropZIndex }}></div>
    </>
  );
};

export default ModalFrame;
