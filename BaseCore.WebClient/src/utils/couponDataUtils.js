import { currencyFormatter } from "./shopDataUtils";

export const toDateTimeInputValue = (value) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const offsetMs = parsedDate.getTimezoneOffset() * 60000;
  return new Date(parsedDate.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("vi-VN");
};

const normalizeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const normalizeCoupon = (item) => ({
  id: normalizeNumber(item?.id ?? item?.couponId, 0),
  code: item?.code ?? "",
  name: item?.name ?? "",
  description: item?.description ?? "",
  discountType: item?.discountType ?? "Percent",
  discountValue: normalizeNumber(item?.discountValue, 0),
  minOrderAmount: normalizeNumber(item?.minOrderAmount, 0),
  maxDiscountAmount: item?.maxDiscountAmount ?? null,
  startAt: item?.startAt ?? "",
  endAt: item?.endAt ?? "",
  usageLimit: item?.usageLimit ?? null,
  usedCount: normalizeNumber(item?.usedCount, 0),
  isActive: Boolean(item?.isActive),
  isPublic: Boolean(item?.isPublic),
  displayOrder: normalizeNumber(item?.displayOrder, 0),
});

export const buildDiscountText = (coupon) => {
  if (coupon.discountType === "Percent") {
    const maxDiscount = coupon.maxDiscountAmount
      ? ` (Tối đa: ${currencyFormatter.format(coupon.maxDiscountAmount)})`
      : "";
    return `Giảm ${coupon.discountValue}%${maxDiscount}`; 
  }

  return `Giảm ${currencyFormatter.format(coupon.discountValue)}`;
};

export const createDefaultCouponFormData = () => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    code: "",
    name: "",
    description: "",
    discountType: "Percent",
    discountValue: "",
    minOrderAmount: 0,
    maxDiscountAmount: "",
    startAt: toDateTimeInputValue(now),
    endAt: toDateTimeInputValue(endDate),
    usageLimit: "",
    isActive: true,
    isPublic: true,
    displayOrder: 0,
  };
};
