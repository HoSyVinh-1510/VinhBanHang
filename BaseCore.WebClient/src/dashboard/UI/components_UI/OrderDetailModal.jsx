import React from "react";
import ModalFrame from "./ModalFrame";
import OrderDetailContent from "./OrderDetailContent";

const OrderDetailModal = ({
  show,
  onClose,
  order,
  details = [],
  history = [],
  activityLogs = [],
  bill = null,
  onCouponClick = null,
  reviewByOrderItemId = null,
  onOpenReview = null,
}) => (
  <ModalFrame
    show={show}
    onClose={onClose}
    title={`Chi tiết đơn #${order?.id || ""}`}
    dialogClassName="modal-xl modal-dialog-scrollable"
  >
    {!order && <div className="text-muted">Không có dữ liệu đơn hàng.</div>}
    {order && (
      <OrderDetailContent
        order={order}
        details={details}
        history={history}
        activityLogs={activityLogs}
        bill={bill}
        onCouponClick={onCouponClick}
        reviewByOrderItemId={reviewByOrderItemId}
        onOpenReview={onOpenReview}
      />
    )}
  </ModalFrame>
);

export default OrderDetailModal;
