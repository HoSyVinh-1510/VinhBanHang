import React from "react";

const FilterCriteriaModal = ({
  show,
  title = "Tiêu chí lọc",
  onClose,
  onApply,
  onReset,
  applyLabel = "OK",
  resetLabel = "Xoá lọc",
  children,
}) => {
  if (!show) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onApply === "function") {
      onApply();
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block filter-criteria-modal"
        tabIndex="-1"
        role="dialog"
        style={{ zIndex: 1065 }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg filter-criteria-modal-dialog"
          role="document"
        >
          <div className="modal-content filter-criteria-modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button type="button" className="close" onClick={onClose}>
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body">
                {children}
              </div>

              <div className="modal-footer">
                {typeof onReset === "function" && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary mr-auto"
                    onClick={onReset}
                  >
                    {resetLabel}
                  </button>
                )}
                <button type="submit" className="btn btn-primary">
                  {applyLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
    </>
  );
};

export default FilterCriteriaModal;
