import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice, resolveProductImage } from "../../../utils/shopDataUtils";

const formatReviewSummary = (product) => {
  const averageRating = Number(product?.averageRating || 0).toFixed(1);
  const totalReviews = Number(product?.totalReviews || 0).toLocaleString(
    "vi-VN",
  );
  return (
    <b>
      Điểm: {averageRating} - Số đánh giá: {totalReviews}
    </b>
  );
};

const ShopProductCard = ({ product, index, onAddToCart }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick(t => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () => window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const productDetailPath = product?.id ? `/shop/product/${product.id}` : null;

  const productImage = (
    <img
      className="img-fluid w-100"
      src={resolveProductImage(product.imageUrl, index)}
      alt={product.name}
    />
  );

  return (
    <div className="col-lg-3 col-md-4 col-sm-6 pb-1">
      <div className="product-item bg-light mb-4 h-100">
        <div className="product-img position-relative overflow-hidden">
          {productDetailPath ? (
            <Link to={productDetailPath} className="d-block">
              {productImage}
            </Link>
          ) : (
            productImage
          )}
          <div className="product-action">
            <button
              className="btn btn-outline-dark btn-square"
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={product.stock <= 0 || typeof onAddToCart !== "function"}
            >
              <i className="fa fa-shopping-cart"></i>
            </button>

            {productDetailPath ? (
              <Link
                className="btn btn-outline-dark btn-square"
                style={{ marginTop: 0, opacity: 1 }}
                to={productDetailPath}
              >
                <i className="fa fa-search"></i>
              </Link>
            ) : (
              <button
                className="btn btn-outline-dark btn-square"
                type="button"
                disabled
              >
                <i className="fa fa-search"></i>
              </button>
            )}
          </div>
        </div>
        <div className="text-center py-4">
          {productDetailPath ? (
            <Link
              to={productDetailPath}
              className="h6 text-decoration-none text-truncate d-block px-2"
            >
              {product.name}
            </Link>
          ) : (
            <span className="h6 text-decoration-none text-truncate d-block px-2">
              {product.name}
            </span>
          )}
          <div className="d-flex align-items-center justify-content-center mt-2 font-weight-bold">
            Giá: {formatPrice(product.price)}
          </div>


          <div className="d-flex align-items-center justify-content-center mt-2">
            <i>
              Còn lại:
              {product.stock <= 0 && (
                <small className="text-danger"> Hết hàng</small>
              )}
              {product.stock > 0 && <i> {product.stock}</i>}
            </i>
          </div>
          <div className="d-flex align-items-center justify-content-center mt-1">
            <small>Đã bán: {product.soldCount || 0}</small>
          </div>
          <div className="d-flex align-items-center justify-content-center mb-1">
            {[...Array(5)].map((_, i) => {
              const rating = product.averageRating || 0;
              if (i < Math.floor(rating)) {
                return (
                  <small
                    key={i}
                    className="fa fa-star text-primary mr-1"
                  ></small>
                );
              } else if (i < rating) {
                return (
                  <small
                    key={i}
                    className="fa fa-star-half-alt text-primary mr-1"
                  ></small>
                );
              } else {
                return (
                  <small
                    key={i}
                    className="far fa-star text-primary mr-1"
                  ></small>
                );
              }
            })}
            <small>{formatReviewSummary(product)}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopProductCard;


