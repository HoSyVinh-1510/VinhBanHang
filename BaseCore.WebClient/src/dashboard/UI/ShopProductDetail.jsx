import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cartApi, productApi, reviewApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import ShopProductCard from "./components_UI/ShopProductCard";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  formatPrice,
  getPagedMeta,
  mapApiList,
  normalizeCartItem,
  normalizeProduct,
  resolveProductImage,
} from "../../utils/shopDataUtils";

const ShopProductDetail = () => {
  useMultiShopStyles();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick((t) => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () =>
      window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    totalReviews: 0,
    averageRating: 0,
  });
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const reviewPageSize = 5;
  const [relatedSearchInput, setRelatedSearchInput] = useState("");
  const [relatedKeyword, setRelatedKeyword] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [error, setError] = useState("");
  const [relatedError, setRelatedError] = useState("");
  const [success, setSuccess] = useState("");

  const productId = Number(id);
  const productImages = useMemo(() => {
    const fromMain = product?.imageUrl ? [product.imageUrl] : [];
    const fromGallery = Array.isArray(product?.imageUrls)
      ? product.imageUrls
      : [];

    const merged = [...fromMain, ...fromGallery]
      .map((imageUrl) => (typeof imageUrl === "string" ? imageUrl.trim() : ""))
      .filter((imageUrl) => imageUrl.length > 0)
      .filter(
        (imageUrl, index, array) =>
          array.findIndex(
            (value) => value.toLowerCase() === imageUrl.toLowerCase(),
          ) === index,
      );

    return merged.length > 0 ? merged : [""];
  }, [product?.imageUrl, product?.imageUrls]);

  useEffect(() => {
    let mounted = true;

    const loadProduct = async () => {
      if (!Number.isInteger(productId) || productId <= 0) {
        if (mounted) {
          setLoading(false);
          setError("Sản phẩm không hợp lệ.");
        }
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await productApi.getById(productId);
        const normalized = normalizeProduct(response.data ?? {});

        if (mounted) {
          if (normalized.id === null) {
            setError("Không tìm thấy sản phẩm.");
            setProduct(null);
          } else {
            setProduct(normalized);
            setQuantity(1);
            setSelectedImageIndex(0);
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError.response?.data?.message || "Không thể tải sản phẩm.",
          );
          setProduct(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (selectedImageIndex >= productImages.length) {
      setSelectedImageIndex(0);
    }
  }, [productImages.length, selectedImageIndex]);

  useEffect(() => {
    let mounted = true;

    const loadRelatedProducts = async () => {
      if (!product?.categoryId || !product?.id) {
        if (mounted) {
          setRelatedProducts([]);
          setRelatedError("");
          setLoadingRelated(false);
        }
        return;
      }

      setLoadingRelated(true);
      setRelatedError("");

      try {
        const response = await productApi.getAll({
          keyword: relatedKeyword || undefined,
          categoryId: product.categoryId,
          isActive: true,
          sortBy: "createdAt",
          sortDirection: "desc",
          page: 1,
          pageSize: 12,
        });

        const normalized = mapApiList(response.data)
          .map(normalizeProduct)
          .filter(
            (item) =>
              item.id !== null && Number(item.id) !== Number(product.id),
          );

        if (mounted) {
          setRelatedProducts(normalized);
        }
      } catch (loadError) {
        if (mounted) {
          setRelatedProducts([]);
          setRelatedError(
            loadError.response?.data?.message ||
              "Không thể tải sản phẩm liên quan cùng danh mục.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingRelated(false);
        }
      }
    };

    loadRelatedProducts();

    return () => {
      mounted = false;
    };
  }, [product?.id, product?.categoryId, relatedKeyword]);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async () => {
      if (!productId) {
        return;
      }

      try {
        const response = await reviewApi.getByProduct(productId, {
          page: reviewPage,
          pageSize: reviewPageSize,
        });
        const payload = response?.data || {};

        if (mounted) {
          setReviews(payload.items || []);
          setReviewSummary({
            totalReviews: payload.totalReviews || 0,
            averageRating: payload.averageRating || 0,
          });
          const meta = getPagedMeta(payload, {
            page: reviewPage,
            pageSize: reviewPageSize,
            fallbackCount: payload.totalReviews || payload.items?.length || 0,
          });
          setReviewTotalPages(meta.totalPages);
        }
      } catch (loadError) {
        console.error("Failed to load reviews:", loadError);
      }
    };

    loadReviews();

    return () => {
      mounted = false;
    };
  }, [productId, reviewPage, reviewPageSize]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(
      query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list",
    );
  };

  const handleRelatedSearchSubmit = (event) => {
    event.preventDefault();
    setRelatedKeyword(relatedSearchInput.trim());
  };

  const addProductToCart = async (targetProduct, requestedQuantity = 1) => {
    if (!targetProduct?.id) {
      return;
    }

    const quantityValue = Math.max(1, Number(requestedQuantity) || 1);

    if (targetProduct.stock > 0 && quantityValue > targetProduct.stock) {
      setSuccess("");
      setError(`Số lượng vượt tồn kho (tối đa ${targetProduct.stock}).`);
      return;
    }

    try {
      setError("");
      setSuccess("");

      const cartResponse = await cartApi.getAll();
      const currentItems = mapApiList(cartResponse.data)
        .map(normalizeCartItem)
        .filter((item) => item.productId !== null);
      const existingItem = currentItems.find(
        (item) => Number(item.productId) === Number(targetProduct.id),
      );
      const nextQuantity = (existingItem?.quantity ?? 0) + quantityValue;

      if (targetProduct.stock > 0 && nextQuantity > targetProduct.stock) {
        setError(
          `Số lượng trong giỏ vượt tồn kho (tối đa ${targetProduct.stock}).`,
        );
        return;
      }

      await cartApi.setQuantity(targetProduct.id, nextQuantity);
      setSuccess(
        `Đã thêm "${targetProduct.name}" vào giỏ hàng (${nextQuantity}).`,
      );
    } catch (addError) {
      setError(
        addError.response?.data?.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );
    }
  };

  return (
    <ShopShell
      activeRoute="product-detail"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin()}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
      productDetailPath={`/shop/product/${product?.id ?? id}`}
    >
      <div className="container-fluid pb-5">
        {loading && (
          <div className="row px-xl-5">
            <div className="col-12 text-center text-muted py-5">
              Đang tải sản phẩm...
            </div>
          </div>
        )}

        {!loading && product && (
          <>
            <div className="row px-xl-5">
              <div className="col-lg-5 pb-3">
                <div className="d-flex flex-column h-100">
                  <div className="bg-light flex-grow-1 d-flex align-items-center justify-content-center p-3 position-relative">
                    <img
                      className="img-fluid"
                      src={resolveProductImage(
                        productImages[selectedImageIndex],
                        selectedImageIndex,
                      )}
                      alt={product.name}
                    />
                    {productImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-dark position-absolute"
                          style={{
                            top: "50%",
                            left: "0px",
                            transform: "translateY(-50%)",
                            opacity: 0.5,
                            zIndex: 1,
                          }}
                          onClick={() =>
                            setSelectedImageIndex((prev) =>
                              prev > 0 ? prev - 1 : productImages.length - 1,
                            )
                          }
                        >
                          <i className="fa fa-chevron-left"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-dark position-absolute"
                          style={{
                            top: "50%",
                            right: "10px",
                            transform: "translateY(-50%)",
                            opacity: 0.5,
                            zIndex: 1,
                          }}
                          onClick={() =>
                            setSelectedImageIndex((prev) =>
                              prev < productImages.length - 1 ? prev + 1 : 0,
                            )
                          }
                        >
                          <i className="fa fa-chevron-right"></i>
                        </button>
                      </>
                    )}
                  </div>
                  {productImages.length > 1 && (
                    <div className="d-flex flex-wrap mt-3">
                      {productImages.map((imageUrl, index) => (
                        <button
                          key={`${product.id}-image-${index}`}
                          type="button"
                          className={`btn p-0 mr-2 mb-2 border ${
                            selectedImageIndex === index ? "border-primary" : ""
                          }`}
                          style={{
                            width: "72px",
                            height: "72px",
                            overflow: "hidden",
                          }}
                          onClick={() => setSelectedImageIndex(index)}
                        >
                          <img
                            src={resolveProductImage(imageUrl, index)}
                            alt={`${product.name} ${index + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-lg-7 pb-3">
                <div className="bg-light p-4 h-100">
                  <h3 className="mb-3">Tên sản phẩm: {product.name}</h3>
                  <h3>Giá: {formatPrice(product.price)}</h3>
                  <p className="mb-3">
                    <strong>Mô tả:</strong>{" "}
                    {product.description?.trim() || "Sản phẩm chưa có mô tả."}
                  </p>

                  <p className="mb-2">
                    <strong>Danh mục: </strong>{" "}
                    {product.categoryName ||
                      `Danh mục #${product.categoryId ?? "-"}`}
                  </p>
                  <p className="mb-2">
                    <strong>Còn lại trong kho:</strong>{" "}
                    {product.stock > 0 ? product.stock : "Hết hàng"} sản phẩm
                  </p>
                  {product.unit && (
                    <p className="mb-3">
                      <strong>Đơn vị: </strong> {product.unit}
                    </p>
                  )}

                  <div className="d-flex align-items-center mb-3">
                    <input
                      type="number"
                      min="1"
                      className="form-control mr-2"
                      style={{ maxWidth: "100px" }}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      disabled={product.stock <= 0}
                    />
                    <button
                      type="button"
                      className="btn btn-primary px-3"
                      onClick={() => addProductToCart(product, quantity)}
                      disabled={product.stock <= 0}
                    >
                      <i className="fa fa-shopping-cart mr-1"></i> Thêm vào giỏ
                      hàng
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate("/shop/list")}
                  >
                    Về trang toàn bộ sản phẩm
                  </button>
                </div>
              </div>
            </div>

            <div className="row px-xl-5 pt-4">
              <div className="col-12 mb-4">
                <h4 className="section-title position-relative text-uppercase mb-3">
                  Phản hồi của khách hàng
                </h4>
                <div className="bg-light p-4">
                  <div className="mb-4 pb-2 border-bottom d-flex align-items-center">
                    <strong className="mr-2" style={{ fontSize: "1.5rem" }}>
                      {reviewSummary.averageRating || 0}/5 sao
                    </strong>
                    <span className="text-muted">
                      ({reviewSummary.totalReviews} đánh giá)
                    </span>
                  </div>

                  {reviews.length === 0 && (
                    <p className="text-muted mb-0">
                      Chưa có đánh giá nào cho sản phẩm này.
                    </p>
                  )}
                  {reviews.map((review) => (
                    <div className="border-bottom pb-3 mb-3" key={review.id}>
                      <div className="d-flex justify-content-between">
                        <strong>
                          Khách hàng: {review.userName || "Khách hàng"}
                        </strong>
                        <span className="text-primary">
                          Đánh giá: {review.rating}/5 sao
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mb-1 mt-2">
                          <strong>Bình luận:</strong> {review.comment}
                        </p>
                      )}
                      <small className="text-muted">
                        <strong>Ngày bình luận: </strong>
                        {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                      </small>
                    </div>
                  ))}

                  {reviews.length > 0 && reviewTotalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <Pagination
                        page={page}
                        totalPages={reviewTotalPages}
                        onPageChange={setPage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="row px-xl-5 pt-4">
              <div className="col-12 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between mb-3">
                <h4 className="section-title position-relative text-uppercase mb-3 mb-lg-0">
                  Sản phẩm liên quan cùng danh mục
                </h4>
                <form
                  onSubmit={handleRelatedSearchSubmit}
                  className="w-100"
                  style={{ maxWidth: "420px" }}
                >
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm trong sản phẩm liên quan"
                      value={relatedSearchInput}
                      onChange={(event) =>
                        setRelatedSearchInput(event.target.value)
                      }
                    />
                    <div className="input-group-append">
                      <button className="btn btn-primary" type="submit">
                        Tìm kiếm
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="row px-xl-5 pb-2">
              {loadingRelated && (
                <div className="col-12 text-center text-muted py-4">
                  Đang tải sản phẩm liên quan...
                </div>
              )}

              {!loadingRelated && relatedError && (
                <div className="col-12">
                  <div className="alert alert-warning">{relatedError}</div>
                </div>
              )}

              {!loadingRelated &&
                !relatedError &&
                relatedProducts.length === 0 && (
                  <div className="col-12 text-center text-muted py-4">
                    Không tìm thấy sản phẩm liên quan phù hợp.
                  </div>
                )}

              {!loadingRelated &&
                !relatedError &&
                relatedProducts.map((item, index) => (
                  <ShopProductCard
                    key={item.id ?? `related-${index}`}
                    product={item}
                    index={index}
                    onAddToCart={() => addProductToCart(item, 1)}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      {success && (
        <div className="container-fluid">
          <div className="row px-xl-5">
            <div className="col-12">
              <div className="alert alert-success">{success}</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="container-fluid">
          <div className="row px-xl-5">
            <div className="col-12">
              <div className="alert alert-danger">{error}</div>
            </div>
          </div>
        </div>
      )}
    </ShopShell>
  );
};

export default ShopProductDetail;
