import React, { useEffect, useState } from "react";
import { couponApi, orderApi } from "../../../services/api";
import { currencyFormatter } from "../../../utils/shopDataUtils";
import ModalFrame from "./ModalFrame";

const ShopCouponModal = ({ show, onClose, items = [], onSelectCoupon }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show) return;

    const loadAndValidate = async () => {
      setLoading(true);
      setError("");
      try {
        // 1. Fetch active coupons
        const resp = await couponApi.getActive();
        const rawCoupons =
          resp?.data?.items || resp?.data?.data || resp?.data || [];

        if (rawCoupons.length === 0) {
          setCoupons([]);
          return;
        }

        // If nào items in cart, we can't validate discount but we can display the coupons as inactive
        if (!items || items.length === 0) {
          const mapped = rawCoupons.map((coupon) => ({
            coupon,
            code: (coupon.code || "").toUpperCase(),
            applicable: false,
            discountAmount: 0,
            message: "Vui lòng chọn ít nhất 1 sản phẩm đề sử dụng mã.",
          }));
          setCoupons(mapped);
          return;
        }

        // 2. Validate coupons in parallel against cart items
        const payloadItems = items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        }));

        const validationPromises = rawCoupons.map(async (coupon) => {
          const code = (coupon.code || "").toUpperCase();
          try {
            const valResp = await orderApi.validateCoupon({
              couponCode: code,
              items: payloadItems,
            });
            const payload = valResp?.data ?? {};
            return {
              coupon,
              code,
              applicable: true,
              discountAmount: Number(payload.discountAmount ?? 0) || 0,
              message: payload.message || "Đủ điều kiện áp dụng",
            };
          } catch (err) {
            return {
              coupon,
              code,
              applicable: false,
              discountAmount: 0,
              message:
                err.response?.data?.message || "Không đủ điều kiện áp dụng",
            };
          }
        });

        const validatedResults = await Promise.all(validationPromises);

        // 3. Sort validated results:
        // - Applicable first, sorted by discountAmount descending
        // - Inapplicable last
        const sortedResults = validatedResults.sort((a, b) => {
          if (a.applicable && !b.applicable) return -1;
          if (!a.applicable && b.applicable) return 1;
          if (a.applicable && b.applicable) {
            return b.discountAmount - a.discountAmount; // descending discount
          }
          return 0;
        });

        setCoupons(sortedResults);
      } catch (err) {
        console.error("Failed to load or validate coupons:", err);
        setError("Không thể tải danh sách mã giảm giá.");
      } finally {
        setLoading(false);
      }
    };

    loadAndValidate();
  }, [show, items]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN");
  };

  const applicableCoupons = coupons.filter((c) => c.applicable);
  const inapplicableCoupons = coupons.filter((c) => !c.applicable);

  return (
    <>
      <style>{`
        .coupon-modal-body {
          max-height: 480px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .coupon-section-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6c757d;
          margin-bottom: 12px;
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 4px;
        }
        .coupon-ticket {
          display: flex;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          position: relative;
          margin-bottom: 16px;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.04);
          transition: all 0.25s ease;
          min-height: 110px;
          overflow: hidden;
        }
        .coupon-ticket:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
          border-color: #ffd333;
        }
        .coupon-ticket.disabled {
          background: #fdfdfd;
          border-color: #e9ecef;
        }
        .coupon-left {
          width: 30%;
          background: linear-gradient(135deg, #ffd333 0%, #ffc107 100%);
          color: #3d3d3d;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px;
          font-weight: bold;
          position: relative;
          text-align: center;
        }
        .coupon-ticket.disabled .coupon-left {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
          color: #8c8c8c;
        }
        .coupon-left::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #fff;
          border-radius: 50%;
          z-index: 2;
          border-left: 1px solid rgba(0, 0, 0, 0.08);
        }
        .coupon-right {
          width: 70%;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        .coupon-right::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #fff;
          border-radius: 50%;
          z-index: 2;
          border-right: 1px solid rgba(0, 0, 0, 0.08);
        }
        .coupon-value {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .coupon-type {
          font-size: 11px;
          opacity: 0.85;
          text-transform: uppercase;
        }
        .coupon-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .coupon-title {
          font-size: 14px;
          font-weight: 700;
          color: #2b2b2b;
          margin-right: 8px;
        }
        .coupon-code-badge {
          background: rgba(255, 211, 51, 0.12);
          color: #b58600;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          font-size: 11px;
          border: 1px dashed rgba(198, 149, 0, 0.3);
          text-transform: uppercase;
        }
        .coupon-ticket.disabled .coupon-code-badge {
          background: #f1f3f5;
          color: #868e96;
          border-color: #dee2e6;
        }
        .coupon-desc {
          font-size: 11.5px;
          color: #6c757d;
          margin-bottom: 6px;
          line-height: 1.35;
        }
        .coupon-alert {
          font-size: 11px;
          color: #e46a10;
          background: #fff9f3;
          border: 1px solid #ffe8d6;
          border-radius: 4px;
          padding: 3px 8px;
          margin-bottom: 6px;
          font-weight: 500;
        }
        .coupon-info-footer {
          display: flex;
          justify-content: right;
          align-items: <center></center>;
          font-size: 10.5px;
          color: #8c8c8c;
          border-top: 1px dashed #f1f3f5;
          padding-top: 6px;
          margin-top: auto;
        }
        .coupon-apply-btn {
          padding: 3px 12px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          background-color: #ffd333;
          color: #3d3d3d;
          transition: background 0.15s ease;
        }
        .coupon-apply-btn:hover {
          background-color: #f0c324;
        }
      `}</style>

      <ModalFrame
        show={show}
        onClose={onClose}
        title="Chọn mã giảm giá"
        dialogClassName="modal-md"
      >
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-warning mb-3"></div>
            <div className="text-muted small font-weight-bold">
              Đang kiểm duyệt các ưu đãi khả dụng...
            </div>
          </div>
        )}

        {error && !loading && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && coupons.length === 0 && (
          <div className="text-center py-5 text-muted">
            <div>Hệ thống đang không có mã giảm giá nào đang hoạt động.</div>
          </div>
        )}

        {!loading && !error && coupons.length > 0 && (
          <div className="coupon-modal-body">
            {/* 1. APPLICABLE COUPONS */}
            {applicableCoupons.length > 0 && (
              <div className="mb-4">
                Số mã giảm giá khả dụng ({applicableCoupons.length})
                {applicableCoupons.map((item, index) => {
                  const c = item.coupon;
                  const discountVal = c.discountValue || 0;
                  const discountType = c.discountType || "Direct";

                  return (
                    <div
                      className="coupon-ticket"
                      key={`app-${item.code}-${index}`}
                    >
                      {/* Ticket Left */}
                      <div className="coupon-left">
                        Giảm{" "}
                        {discountType === "Percent"
                          ? `${discountVal}%`
                          : `${Math.round(discountVal / 1000)}k`}{" "}
                      </div>

                      {/* Ticket Right */}
                      <div className="coupon-right">
                        <div>
                          <div className="coupon-header-row">
                            Tên mã: {c.name || "Mã ưu đãi"}
                            <br></br>
                            Mã code: {item.code}
                            <br></br>
                            Mô tả: {c.description || "-"}
                            {/* Real-time discount calculation display */}
                            <br></br>
                            Giảm:{" "}
                            {currencyFormatter.format(item.discountAmount)}
                            <br></br>
                            Hạn dùng:{" "}
                            {c.endAt
                              ? `${formatDate(c.endAt)}`
                              : `Không giới hạn`}
                            <br></br>
                            Đã dùng: {c.usedCount}/{c.usageLimit}
                          </div>
                        </div>

                        <div className="coupon-info-footer">
                          <button
                            type="button"
                            className="coupon-apply-btn"
                            onClick={() => {
                              onSelectCoupon(item.code);
                              onClose();
                            }}
                          >
                            Áp dụng mã
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. INAPPLICABLE COUPONS */}
            {inapplicableCoupons.length > 0 && (
              <div>
                Số mã giảm giá không đủ điều kiện ({inapplicableCoupons.length})
                {inapplicableCoupons.map((item, index) => {
                  const c = item.coupon;
                  const discountVal = c.discountValue || 0;
                  const discountType = c.discountType || "Direct";

                  return (
                    <div
                      className="coupon-ticket disabled"
                      key={`inapp-${item.code}-${index}`}
                    >
                      {/* Ticket Left */}
                      <div className="coupon-left">
                        Giảm:{" "}
                        {discountType === "Percent"
                          ? `${discountVal}%`
                          : `${Math.round(discountVal / 1000)}k`}
                      </div>

                      {/* Ticket Right */}
                      <div className="coupon-right">
                        <div>
                          <div className="coupon-header-row">
                            Tên mã: {c.name || "Mã ưu đãi"}
                            <br></br>
                            Mã code: {item.code}
                            <br></br>
                            Mô tả: {c.description || "-"}
                          </div>
                          {/* Validation reason */}
                          <b>
                            Lí do chưa đủ điều kiện:<i> {item.message}</i>
                          </b>
                          <br></br>
                          Hạn dùng:{" "}
                          {c.endAt
                            ? `${formatDate(c.endAt)}`
                            : `Không giới hạn`}
                          <br></br>
                          Đã dùng: {c.usedCount}/{c.usageLimit}
                        </div>

                        <div className="coupon-info-footer">
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary disabled"
                            disabled
                          >
                            Không thể dùng
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ModalFrame>
    </>
  );
};

export default ShopCouponModal;


