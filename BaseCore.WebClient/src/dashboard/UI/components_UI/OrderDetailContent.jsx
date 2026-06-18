import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatPrice, resolveProductImage } from "../../../utils/shopDataUtils";
import {
  ORDER_STATUS,
  ORDER_ACTIVITY_TYPE,
  PAYMENT_STATUS,
  isCashOnDeliveryMethod,
  buildOrderTimeline,
  formatActivityTitle,
  formatActivityTransition,
  formatDateTime,
  formatHistoryNote,
  formatPaymentStatus,
  normalizeOrderStatus,
  normalizePaymentStatus,
  sortByDateAscending,
} from "../../../utils/orderDataUtils";

const formatStepperTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  
  const pad = (num) => String(num).padStart(2, "0");
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  
  return `${hours}:${minutes} ${day}-${month}-${year}`;
};

const getStepperSteps = (order, activityLogs) => {
  const oStatus = normalizeOrderStatus(order.orderStatus);
  const pStatus = normalizePaymentStatus(order.paymentStatus);
  const isCod = isCashOnDeliveryMethod(order.paymentMethod);

  // Helper to find date of status/activity change
  const findDateForActivity = (type, toVal = null) => {
    const logs = activityLogs || [];
    const log = logs.find(l => {
      const actType = l.activityType || "";
      if (actType === type) {
        if (toVal) {
          const actualToVal = l.toValue ?? "";
          return actualToVal === toVal;
        }
        return true;
      }
      return false;
    });
    return log ? log.createdAt : null;
  };

  // Helper to find date when order status became specific status
  const findDateForOrderStatus = (status) => {
    return findDateForActivity(ORDER_ACTIVITY_TYPE.ORDER_STATUS_CHANGED, status);
  };

  const createdDate = order.createdAt;

  if (oStatus === ORDER_STATUS.CANCELLED) {
    // Cancelled Flow: 2 Steps
    const cancelledDate = findDateForOrderStatus(ORDER_STATUS.CANCELLED) || findDateForActivity(ORDER_ACTIVITY_TYPE.ORDER_CANCELLED) || order.createdAt;
    return [
      {
        label: "Đơn Hàng Đã Đặt",
        icon: "fas fa-clipboard-list",
        status: "completed",
        date: createdDate,
      },
      {
        label: "Đơn Hàng Đã Hủy",
        icon: "fas fa-times-circle",
        status: "cancelled",
        date: cancelledDate,
      }
    ];
  }

  if (oStatus === ORDER_STATUS.RETURN_REQUESTED || oStatus === ORDER_STATUS.RETURNED) {
    // Return Flow: 5 Steps
    const paidDate = findDateForActivity(ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED, PAYMENT_STATUS.PAID);
    const deliveredDate = findDateForOrderStatus(ORDER_STATUS.RECEIVED) || findDateForOrderStatus(ORDER_STATUS.COMPLETED);
    const returnReqDate = findDateForActivity(ORDER_ACTIVITY_TYPE.RETURN_REQUEST_OPENED) || findDateForOrderStatus(ORDER_STATUS.RETURN_REQUEST_OPENED);
    const returnedDate = findDateForOrderStatus(ORDER_STATUS.RETURNED) || findDateForActivity(ORDER_ACTIVITY_TYPE.RETURN_REQUEST_APPROVED);

    return [
      {
        label: "Đơn Hàng Đã Đặt",
        icon: "fas fa-clipboard-list",
        status: "completed",
        date: createdDate,
      },
      {
        label: "Đã Thanh Toán",
        icon: "fas fa-money-bill-wave",
        status: "completed",
        date: paidDate || createdDate,
      },
      {
        label: "Đã Giao Hàng",
        icon: "fas fa-box-open",
        status: "completed",
        date: deliveredDate || createdDate,
      },
      {
        label: "Yêu Cầu Hoàn/Trả",
        icon: "fas fa-exclamation-triangle",
        status: oStatus === ORDER_STATUS.RETURNED ? "completed" : "active",
        date: returnReqDate,
      },
      {
        label: "Đã Hoàn/Trả",
        icon: "fas fa-check-double",
        status: oStatus === ORDER_STATUS.RETURNED ? "active" : "pending",
        date: returnedDate,
      }
    ];
  }

  // Normal Flow
  const isPaid = [
    PAYMENT_STATUS.PAID,
    PAYMENT_STATUS.REFUND_PENDING,
    PAYMENT_STATUS.REFUND_TRANSFERRED,
    PAYMENT_STATUS.REFUNDED
  ].includes(pStatus);
  
  const step2Completed = isPaid || (isCod && [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPING, ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED].includes(oStatus));
  const step2Active = !step2Completed && (oStatus === ORDER_STATUS.PENDING || pStatus === PAYMENT_STATUS.PENDING);

  const step3Completed = [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPING, ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED].includes(oStatus);
  const step3Active = !step3Completed && step2Completed && oStatus === ORDER_STATUS.PENDING;

  const step4Completed = [ORDER_STATUS.SHIPPING, ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED].includes(oStatus);
  const step4Active = !step4Completed && step3Completed && oStatus === ORDER_STATUS.CONFIRMED;

  const step5Completed = [ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED].includes(oStatus);
  const step5Active = !step5Completed && step4Completed && oStatus === ORDER_STATUS.SHIPPING;

  const paidDate = findDateForActivity(ORDER_ACTIVITY_TYPE.PAYMENT_STATUS_CHANGED, PAYMENT_STATUS.PAID);
  const confirmedDate = findDateForOrderStatus(ORDER_STATUS.CONFIRMED);
  const shippingDate = findDateForOrderStatus(ORDER_STATUS.SHIPPING);
  const completedDate = findDateForOrderStatus(ORDER_STATUS.RECEIVED) || findDateForOrderStatus(ORDER_STATUS.COMPLETED);

  return [
    {
      label: "Đơn Hàng Đã Đặt",
      icon: "fas fa-clipboard-list",
      status: "completed",
      date: createdDate,
    },
    {
      label: "Đã Xác Nhận Thanh Toán",
      icon: "fas fa-money-bill-wave",
      status: step2Completed ? "completed" : (step2Active ? "active" : "pending"),
      date: paidDate || (step2Completed && isCod ? createdDate : null),
    },
    {
      label: "Chờ Lấy Hàng",
      icon: "fas fa-box",
      status: step3Completed ? "completed" : (step3Active || (oStatus === ORDER_STATUS.PENDING && step2Completed) ? "active" : "pending"),
      date: confirmedDate,
    },
    {
      label: "Đang Giao",
      icon: "fas fa-truck",
      status: step4Completed ? "completed" : (step4Active || (oStatus === ORDER_STATUS.CONFIRMED) ? "active" : "pending"),
      date: shippingDate,
    },
    {
      label: "Đánh Giá",
      icon: "fas fa-star",
      status: step5Completed ? "completed" : (step5Active || (oStatus === ORDER_STATUS.SHIPPING) ? "active" : "pending"),
      date: completedDate,
    }
  ];
};

const OrderDetailContent = ({
  order,
  details = [],
  history = [],
  activityLogs = [],
  bill = null,
  onCouponClick = null,
  reviewByOrderItemId = null,
  onOpenReview = null,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick(t => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () => window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  if (!order) {
    return <div className="text-muted">Không có dữ liệu đơn hàng.</div>;
  }

  const canReviewInOrder = [
    ORDER_STATUS.RECEIVED,
    ORDER_STATUS.COMPLETED,
  ].includes(normalizeOrderStatus(order.orderStatus));
  const sortedActivityLogs = sortByDateAscending(
    activityLogs,
    (activityLog) => activityLog.createdAt,
  );

  const steps = getStepperSteps(order, activityLogs);
  
  let activeIndex = 0;
  steps.forEach((step, idx) => {
    if (step.status === "completed" || step.status === "active" || step.status === "cancelled") {
      activeIndex = idx;
    }
  });

  const isCancelledFlow = steps.length === 2 && steps[1].status === "cancelled";
  const leftPercent = isCancelledFlow ? 25 : 10;
  const totalWidthPercent = isCancelledFlow ? 50 : 80;
  const progressPercent = steps.length > 1 ? (activeIndex / (steps.length - 1)) : 0;
  const activeLineWidth = totalWidthPercent * progressPercent;

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="order-stepper-container">
          <style>{`
            .order-stepper-container {
              background: #ffffff;
              border: 1px solid #e9ecef;
              border-radius: 12px;
              padding: 2rem 1.5rem;
              margin-bottom: 0.5rem;
              position: relative;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
            }
            .order-stepper {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              position: relative;
              width: 100%;
            }
            .stepper-line {
              position: absolute;
              top: 27px;
              left: ${leftPercent}%;
              width: ${totalWidthPercent}%;
              height: 4px;
              background: #e9ecef;
              z-index: 1;
              border-radius: 2px;
            }
            .stepper-line-active {
              position: absolute;
              top: 27px;
              left: ${leftPercent}%;
              width: ${activeLineWidth}%;
              height: 4px;
              background: #28a745;
              z-index: 2;
              transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              border-radius: 2px;
            }
            .stepper-line-cancelled {
              background: #dc3545 !important;
            }
            .stepper-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              z-index: 3;
              flex: 1;
              text-align: center;
            }
            .stepper-icon-wrap {
              width: 54px;
              height: 54px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              border: 3px solid #dee2e6;
              color: #adb5bd;
              font-size: 1.2rem;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              margin-bottom: 0.75rem;
              box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            }
            /* Completed Step */
            .stepper-item.completed .stepper-icon-wrap {
              border-color: #28a745;
              color: #28a745;
              background: #ffffff;
            }
            /* Active Step */
            .stepper-item.active .stepper-icon-wrap {
              border-color: #28a745;
              background: #28a745;
              color: #ffffff;
              box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.15);
            }
            /* Cancelled Step */
            .stepper-item.cancelled .stepper-icon-wrap {
              border-color: #dc3545;
              background: #dc3545;
              color: #ffffff;
              box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.15);
            }
            .stepper-label {
              font-size: 13px;
              font-weight: 700;
              color: #6c757d;
              margin-bottom: 0.25rem;
              transition: color 0.3s ease;
            }
            .stepper-item.completed .stepper-label,
            .stepper-item.active .stepper-label {
              color: #212529;
            }
            .stepper-item.cancelled .stepper-label {
              color: #dc3545;
            }
            .stepper-time {
              font-size: 11px;
              color: #868e96;
              min-height: 15px;
              display: block;
              margin-top: 0.1rem;
            }
            @media (max-width: 768px) {
              .order-stepper-container {
                padding: 1.25rem 0.5rem;
              }
              .stepper-icon-wrap {
                width: 44px;
                height: 44px;
                font-size: 1rem;
                border-width: 2.5px;
                margin-bottom: 0.5rem;
              }
              .stepper-line, .stepper-line-active {
                top: 22px;
              }
              .stepper-label {
                font-size: 10px;
                line-height: 1.2;
              }
              .stepper-time {
                font-size: 9px;
              }
            }
          `}</style>
          <div className="order-stepper">
            <div className="stepper-line"></div>
            <div
              className={`stepper-line-active ${isCancelledFlow ? "stepper-line-cancelled" : ""}`}
              style={{ width: `${activeLineWidth}%` }}
            ></div>
            {steps.map((step, index) => (
              <div key={index} className={`stepper-item ${step.status}`}>
                <div className="stepper-icon-wrap">
                  <i className={step.icon}></i>
                </div>
                <span className="stepper-label">{step.label}</span>
                <span className="stepper-time">
                  {step.date ? formatStepperTime(step.date) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-lg-7">
        <h6 className="mb-2">Phương thức nhận hàng</h6>
        <div className="mb-3 p-3 border rounded bg-light">
          <div className="d-flex align-items-center">
            <strong className="mr-2">Hình thức:</strong>
            {order.deliveryMethod === "Pickup" ? (
              <span className="badge badge-primary px-2 py-1"><i className="fas fa-store mr-1"></i> Lấy tại quán</span>
            ) : (
              <span className="badge badge-info px-2 py-1"><i className="fas fa-motorcycle mr-1"></i> Giao tận nơi</span>
            )}
          </div>
          {order.deliveryMethod === "Pickup" && order.pickupTime && (
            <div className="mt-2 text-primary font-weight-bold">
              <i className="fas fa-clock mr-1"></i>
              Thời gian hẹn lấy: {new Date(order.pickupTime).toLocaleString("vi-VN", { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          )}
        </div>

        <h6 className="mb-2">Thông tin người nhận</h6>
        <div className="mb-3">
          <div>
            <strong>Người nhận:</strong> {order.receiverName || "-"}
          </div>
          <div>
            <strong>Số điện thoại:</strong> {order.phone || "-"}
          </div>
          <div>
            <strong>Địa chỉ:</strong> {order.shippingAddress || "-"}
          </div>
          <div>
            <strong>Mã giảm giá:</strong>{" "}
            {order.couponCode ? (
              onCouponClick ? (
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => onCouponClick(order.couponCode)}
                >
                  <strong>{order.couponCode}</strong>
                </button>
              ) : (
                <strong>{order.couponCode}</strong>
              )
            ) : (
              "Không dùng mã giảm giá"
            )}
          </div>
        </div>

        <h6 className="mb-2">Sản phẩm trong đơn</h6>
        {details.length === 0 && (
          <div className="text-muted">Không có sản phẩm.</div>
        )}

        {details.map((detail, index) => {
          const review = reviewByOrderItemId?.[detail.id] || null;
          const isReviewable =
            Boolean(onOpenReview) &&
            canReviewInOrder &&
            detail.id > 0 &&
            detail.productId > 0;

          return (
            <div
              key={detail.id || `${detail.productId}-${index}`}
              className="d-flex flex-wrap justify-content-between align-items-center border-bottom py-2"
            >
              <div className="d-flex align-items-center mb-2 mb-md-0">
                {detail.productId ? (
                  <Link to={`/shop/product/${detail.productId}`}>
                    <img
                      src={resolveProductImage(detail.product.imageUrl, index)}
                      alt={detail.product.name}
                      style={{
                        width: "44px",
                        height: "44px",
                        objectFit: "cover",
                      }}
                      className="mr-2"
                    />
                  </Link>
                ) : (
                  <img
                    src={resolveProductImage(detail.product.imageUrl, index)}
                    alt={detail.product.name}
                    style={{
                      width: "44px",
                      height: "44px",
                      objectFit: "cover",
                    }}
                    className="mr-2"
                  />
                )}
                <div>
                  <div>
                    {detail.product.name || `Sản phẩm #${detail.productId}`}
                  </div>
                  <small className="text-muted">
                    {formatPrice(detail.unitPrice)} x{" "}
                    {detail.quantity}
                  </small>
                </div>
              </div>

              <div className="text-right">
                <strong className="d-block mb-1">
                  {formatPrice(detail.total)}
                </strong>
                {isReviewable && review && (
                  <span className="badge badge-success">
                    Đã đánh giá {review.rating}/5 sao
                  </span>
                )}
                {isReviewable && !review && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onOpenReview(order, detail)}
                  >
                    Đánh giá
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="col-lg-5">
        {bill && (
          <div className="border-bottom pb-3 mb-3">
            <h6 className="mb-2">Hóa đơn thanh toán</h6>
            <div className="d-flex justify-content-between">
              <span>Mã bill</span>
              <strong>{bill.billCode || "-"}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Tạm tính</span>
              <span>{formatPrice(bill.subtotalAmount)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Giảm giá</span>
              <span>-{formatPrice(bill.discountAmount)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Tổng thanh toán</span>
              <strong>{formatPrice(bill.totalAmount)}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Phương thức thanh toán</span>
              <strong>{bill.paymentMethod || "-"}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Trạng thái thanh toán</span>
              <strong>{formatPaymentStatus(bill.paymentStatus) || "-"}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Ngày tạo bill</span>
              <strong>{formatDateTime(bill.createdAt || "-")}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span>Ngày thanh toán</span>
              <strong>{formatDateTime(bill.paidAt)}</strong>
            </div>

            <div className="mt-2">
              <small className="font-weight-bold d-block mb-1">
                Chi tiết bill
              </small>
              {(bill.details || []).length === 0 ? (
                <small className="text-muted">Không có dòng hóa đơn.</small>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <thead>
                      <tr>
                        <th>Tên sản phẩm</th>
                        <th className="text-center">SL</th>
                        <th className="text-right">Đơn giá</th>
                        <th className="text-right">Thình tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bill.details || []).map(
                        (billDetail, billDetailIndex) => (
                          <tr
                            key={
                              billDetail.id ||
                              `${billDetail.productId}-${billDetailIndex}`
                            }
                          >
                            <td>
                              {billDetail.productName ||
                                `Sản phẩm #${billDetail.productId}`}
                            </td>
                            <td className="text-center">
                              {billDetail.quantity}
                            </td>
                            <td className="text-right">
                              {formatPrice(billDetail.unitPrice)}
                            </td>
                            <td className="text-right">
                              {formatPrice(billDetail.subTotal)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <h6 className="mb-2">Tiến trình đơn hàng</h6>
        {history.length === 0 && (
          <div className="text-muted">Chưa có tiến trình trạng thái.</div>
        )}
        <ul className="list-unstyled mb-3">
          {buildOrderTimeline(history, activityLogs).map((item) => (
            <li key={item.id} className="border-left pl-3 mb-2">
              <div>
                <strong>{item.title}</strong>
              </div>
              <small className="text-muted d-block">
                {formatDateTime(item.date)}
              </small>
              {item.description && (
                <small className="d-block">{item.description}</small>
              )}
              {item.actor && (
                <small className="d-block text-muted">{item.actor}</small>
              )}
            </li>
          ))}
        </ul>

        <h6 className="mb-2">Nhật ký xử lý</h6>
        {sortedActivityLogs.length === 0 && (
          <div className="text-muted">Chưa có nhật ký xử lý.</div>
        )}
        <ul className="list-unstyled mb-0">
          {sortedActivityLogs.map((activityLog) => (
            <li key={activityLog.id} className="border-left pl-3 mb-2">
              <div>
                <strong>{formatActivityTitle(activityLog)}</strong>
              </div>
              <small className="text-muted d-block">
                {formatDateTime(activityLog.createdAt)}
              </small>
              {activityLog.description && (
                <small className="d-block">
                  {formatHistoryNote(activityLog.description)}
                </small>
              )}
              {(activityLog.fromValue || activityLog.toValue) && (
                <small className="d-block">
                  {formatActivityTransition(activityLog)}
                </small>
              )}
              {(activityLog.actorRole || activityLog.actorUserId) && (
                <small className="d-block text-muted">
                  {activityLog.actorRole || "User"} -{" "}
                  {activityLog.actorUserId || "N/A"}
                </small>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrderDetailContent;


