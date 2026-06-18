export const parseSelectedProductIds = (value) => {
  if (!value) {
    return null;
  }

  const ids = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (ids.length === 0) {
    return null;
  }

  return new Set(ids);
};

export const normalizeAddress = (item) => {
  const id = Number(item?.id ?? item?.customerAddressId ?? 0) || 0;
  const receiverName = item?.receiverName ?? "";
  const phone = item?.phone ?? "";
  const addressLine = item?.addressLine ?? "";
  const ward = item?.ward ?? "";
  const district = item?.district ?? "";
  const province = item?.province ?? "";
  const fullAddress =
    item?.fullAddress ??
    [addressLine, ward, district, province]
      .filter((part) => !!String(part).trim())
      .join(", ");

  return {
    id,
    receiverName,
    phone,
    addressLine,
    ward,
    district,
    province,
    fullAddress,
    isDefault: Boolean(item?.isDefault),
  };
};

export const toOrderItemsPayload = (items) =>
  items.map((item) => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity),
  }));
