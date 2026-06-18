import React from "react";

/**
 * Component phân trang (Pagination) dùng chung cho toàn bộ dự án.
 * @param {number} page - Trang hiện tại (1-indexed)
 * @param {number} totalPages - Tổng số trang
 * @param {function} onPageChange - Callback khi chuyển trang, nhận vào trang mới (number)
 */
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-center mt-4">
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Trước
          </button>
        </li>
        <li className="page-item disabled">
          <span className="page-link">
            Trang {page} / {totalPages}
          </span>
        </li>
        <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Sau
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;
