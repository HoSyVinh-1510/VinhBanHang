import React, { useEffect, useState } from "react";
import { couponApi } from "../../../services/api";
import { currencyFormatter } from "../../../utils/shopDataUtils";
import { normalizeCoupon } from "../../../utils/couponDataUtils";
import ModalFrame from "./ModalFrame";

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("vi-VN");
};

const CouponDetailModal = ({ couponCode, show, onClose }) => {
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !couponCode) {
      setCoupon(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const resp = await couponApi.getAll({
          keyword: couponCode,
          page: 1,
          pageSize: 1,
        });
        const items = resp?.data?.items || resp?.data?.data || [];
        const first = Array.isArray(items) ? items[0] : undefined;
        setCoupon(first ? normalizeCoupon(first) : null);
      } catch (error) {
        console.error("Failed to load coupon detail:", error);
        setCoupon(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [show, couponCode]);

  return (
    <ModalFrame
      show={show}
      onClose={onClose}
      title={`Thông tin mã giảm giá: ${couponCode || "-"}`}
      dialogClassName="modal-lg"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      }
    >
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary"></div>
        </div>
      )}

      {!loading && !coupon && (
        <div className="text-muted">Không tìm thấy thông tin mã giảm giá.</div>
      )}

      {!loading && coupon && (
        <div>
          <div className="form-row">
            <div className="form-group col-md-4">
              <label>Mã</label>
              <div>
                <strong>{coupon.code}</strong>
              </div>
            </div>
            <div className="form-group col-md-8">
              <label>Tên</label>
              <div>{coupon.name}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <div>{coupon.description || "-"}</div>
          </div>

          <div className="form-row">
            <div className="form-group col-md-3">
              <label>Loại</label>
              <div>
                {coupon.discountType === "Percent"
                  ? "Phần trăm"
                  : "Giảm thẳng"}
              </div>
            </div>
            <div className="form-group col-md-3">
              <label>Giá trị</label>
              <div>
                {coupon.discountType === "Percent"
                  ? `${coupon.discountValue}%`
                  : currencyFormatter.format(coupon.discountValue || 0)}
              </div>
            </div>
            <div className="form-group col-md-3">
              <label>Đơn tối thiểu</label>
              <div>
                {currencyFormatter.format(coupon.minOrderAmount || 0)}
              </div>
            </div>
            <div className="form-group col-md-3">
              <label>Lượt dùng</label>
              <div>
                {coupon.usedCount || 0}
                {coupon.usageLimit
                  ? ` / ${coupon.usageLimit}`
                  : " / Không giới hạn"}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Bắt đầu</label>
              <div>
                {coupon.startAt
                  ? formatDateTime(coupon.startAt)
                  : "-"}
              </div>
            </div>
            <div className="form-group col-md-6">
              <label>Kết thúc</label>
              <div>
                {coupon.endAt
                  ? formatDateTime(coupon.endAt)
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalFrame>
  );
};

export default CouponDetailModal;


