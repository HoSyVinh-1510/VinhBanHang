export const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export const formatPrice = (vndAmount) => {
  if (
    vndAmount === null ||
    vndAmount === undefined ||
    Number.isNaN(Number(vndAmount))
  ) {
    return "-";
  }

  const numericVnd = Number(vndAmount);
  const formattedVnd = currencyFormatter.format(numericVnd);

  const currentCurrency = localStorage.getItem("shop-currency") || "VND";
  if (currentCurrency === "VND") {
    return formattedVnd;
  }

  // Lấy tỷ giá từ localStorage (đã được nạp từ Ruby Promotions Service)
  const ratesStr = localStorage.getItem("shop-exchange-rates");
  let rates = { USD: 1.0 / 25400.0, EUR: 1.0 / 27500.0 };

  if (ratesStr) {
    try {
      const parsed = JSON.parse(ratesStr);
      if (parsed && parsed.USD && parsed.EUR) {
        rates = parsed;
      }
    } catch (e) {
      // Bỏ qua lỗi parse, sử dụng localStorage
    }
  }

  const rate =
    rates[currentCurrency] ||
    (currentCurrency === "USD" ? 1.0 / 25400.0 : 1.0 / 27500.0);
  const convertedAmount = numericVnd * rate;

  if (currentCurrency === "USD") {
    const usdFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(convertedAmount);
    return `${formattedVnd} (~ ${usdFormatted})`;
  }

  if (currentCurrency === "EUR") {
    const eurFormatted = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(convertedAmount);
    return `${formattedVnd} (~ ${eurFormatted})`;
  }

  return formattedVnd;
};

const normalizeId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  return String(value).trim();
};

const normalizeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return Boolean(value);
};

const productFallbackImages = [
  "/multishop/img/product-1.jpg",
  "/multishop/img/product-2.jpg",
  "/multishop/img/product-3.jpg",
  "/multishop/img/product-4.jpg",
  "/multishop/img/product-5.jpg",
  "/multishop/img/product-6.jpg",
  "/multishop/img/product-7.jpg",
  "/multishop/img/product-8.jpg",
];

export const categoryFallbackImages = [
  "/multishop/img/cat-1.jpg",
  "/multishop/img/cat-2.jpg",
  "/multishop/img/cat-3.jpg",
  "/multishop/img/cat-4.jpg",
];

export const mapApiList = (responseData) => {
  if (Array.isArray(responseData)) {
    return responseData;
  }
  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }
  if (Array.isArray(responseData?.items)) {
    return responseData.items;
  }
  if (Array.isArray(responseData?.data?.items)) {
    return responseData.data.items;
  }
  return [];
};

export const getPagedMeta = (responseData, defaults = {}) => {
  const defaultPage = Number(defaults.page ?? 1) || 1;
  const defaultPageSize = Number(defaults.pageSize ?? 10) || 10;
  const fallbackCount = Number(defaults.fallbackCount ?? 0) || 0;

  const totalCount = Number(responseData?.totalCount) || fallbackCount;
  const page = Number(responseData?.page) || defaultPage;
  const pageSize = Number(responseData?.pageSize) || defaultPageSize;
  const totalPages =
    Number(responseData?.totalPages) ||
    Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));

  return {
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, totalPages),
  };
};

export const normalizeCategory = (item) => ({
  id: normalizeId(item?.id ?? item?.categoryId),
  name: item?.name ?? item?.categoryName ?? "Danh mục chưa đặt tên",
  description: item?.description ?? "",
  imageUrl: item?.imageUrl ?? "",
  isActive: normalizeBoolean(item?.isActive, true),
});

const normalizeImageUrls = (item) => {
  const candidateImageUrls = [
    ...(Array.isArray(item?.imageUrls) ? item.imageUrls : []),
    ...(Array.isArray(item?.productImages)
      ? item.productImages.map((image) => image?.imageUrl)
      : []),
  ];

  return candidateImageUrls
    .filter((imageUrl) => typeof imageUrl === "string")
    .map((imageUrl) => imageUrl.trim())
    .filter((imageUrl) => imageUrl.length > 0)
    .filter(
      (imageUrl, index, array) =>
        array.findIndex(
          (value) => value.toLowerCase() === imageUrl.toLowerCase(),
        ) === index,
    );
};

export const normalizeProduct = (item) => {
  const imageUrls = normalizeImageUrls(item);
  const mainImageFromPayload =
    item?.mainImageUrl ?? item?.imageUrl ?? item?.thumbnailUrl ?? "";

  const mainImageUrl =
    (typeof mainImageFromPayload === "string"
      ? mainImageFromPayload.trim()
      : "") ||
    imageUrls[0] ||
    "";

  return {
    id: normalizeId(item?.id ?? item?.productId),
    name: item?.name ?? item?.productName ?? "Sản phẩm chưa đặt tên",
    description: item?.description ?? "",
    price: normalizeNumber(item?.price, 0),
    imageUrl: mainImageUrl,
    imageUrls,
    categoryId: normalizeId(item?.categoryId),
    categoryName: item?.category?.name ?? item?.categoryName ?? "",
    unit: item?.unit ?? "",
    isFeatured: normalizeBoolean(item?.isFeatured, false),
    isActive: normalizeBoolean(item?.isActive, true),
    stock: normalizeNumber(item?.stock ?? item?.stockQuantity, 0),
    soldCount: normalizeNumber(item?.soldCount ?? item?.sold, 0),
    averageRating: normalizeNumber(item?.averageRating ?? item?.rating, 0),
    totalReviews: normalizeNumber(item?.totalReviews ?? item?.reviewCount, 0),
  };
};

export const normalizeCartItem = (item) => {
  const product = normalizeProduct(item?.product ?? {});
  const quantity = normalizeNumber(item?.quantity, 0);
  const unitPrice = product.price;

  return {
    id: normalizeId(item?.id ?? item?.cartItemId),
    productId: normalizeId(item?.productId ?? product.id),
    quantity,
    unitPrice,
    total: unitPrice * quantity,
    product,
  };
};

export const resolveProductImage = (imageUrl, index = 0) => {
  if (!imageUrl) {
    return productFallbackImages[index % productFallbackImages.length];
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  return `/multishop/${imageUrl.replace(/^\/+/, "")}`;
};

export const resolveCategoryImage = (imageUrl, index = 0) => {
  if (!imageUrl) {
    return categoryFallbackImages[index % categoryFallbackImages.length];
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return imageUrl;
  }

  return `/multishop/${imageUrl.replace(/^\/+/, "")}`;
};
