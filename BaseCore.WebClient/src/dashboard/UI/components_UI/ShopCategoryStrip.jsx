import React from "react";
import { Link } from "react-router-dom";
import { resolveCategoryImage } from "../../../utils/shopDataUtils";

const normalizeSelectedCategoryId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
};

const getCategoryCount = (productCountByCategory, categoryId) => {
  if (!productCountByCategory || categoryId === null || categoryId === undefined) {
    return null;
  }

  if (typeof productCountByCategory.get === "function") {
    return (
      productCountByCategory.get(String(categoryId)) ??
      productCountByCategory.get(Number(categoryId)) ??
      null
    );
  }

  return productCountByCategory[String(categoryId)] ?? productCountByCategory[categoryId] ?? null;
};

const ShopCategoryStrip = ({
  categories = [],
  loading = false,
  selectedCategoryId,
  productCountByCategory,
  buildCategoryPath,
  onSelectCategory,
  title = "Danh mục nhanh",
  className = "",
}) => {
  const normalizedSelectedCategoryId = normalizeSelectedCategoryId(selectedCategoryId);

  const renderCategoryContent = (category, index) => {
    if (!category) {
      return (
        <>
          <span className="shop-category-pill-icon">
            <i className="fa fa-store"></i>
          </span>
          <span>
            <strong>Tất cả</strong>
            <small>Xem toàn bộ sản phẩm</small>
          </span>
        </>
      );
    }

    const productCount = getCategoryCount(productCountByCategory, category.id);

    return (
      <>
        <img
          className="shop-category-pill-image"
          src={resolveCategoryImage(category.imageUrl, index)}
          alt={category.name}
        />
        <span>
          <strong>{category.name}</strong>
          {productCount !== null && <small>{productCount} sản phẩm</small>}
        </span>
      </>
    );
  };

  const renderCategoryItem = (category, index = 0) => {
    const categoryId = category?.id ?? null;
    const isActive = normalizeSelectedCategoryId(categoryId) === normalizedSelectedCategoryId;
    const itemClass = `shop-category-pill${isActive ? " active" : ""}`;

    if (typeof onSelectCategory === "function") {
      return (
        <button
          key={categoryId ?? "all"}
          type="button"
          className={itemClass}
          onClick={() => onSelectCategory(categoryId)}
        >
          {renderCategoryContent(category, index)}
        </button>
      );
    }

    const path = typeof buildCategoryPath === "function" ? buildCategoryPath(categoryId) : "/shop/list";

    return (
      <Link key={categoryId ?? "all"} to={path} className={itemClass}>
        {renderCategoryContent(category, index)}
      </Link>
    );
  };

  return (
    <div className={`container-fluid mb-4 ${className}`.trim()}>
      <div className="row px-xl-5">
        <div className="col-12">
          <div className="shop-category-strip">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
              <h5 className="mb-2 mb-sm-0">{title}</h5>
              <Link to="/shop/list" className="small font-weight-bold text-primary">
                Xem cửa hàng <i className="fa fa-angle-right ml-1"></i>
              </Link>
            </div>

            <div className="shop-category-strip-scroll">
              {renderCategoryItem(null)}
              {loading && (
                <div className="shop-category-pill disabled">
                  <span className="shop-category-pill-icon">
                    <i className="fa fa-spinner fa-spin"></i>
                  </span>
                  <span>
                    <strong>Đang tải</strong>
                    <small>Danh mục sản phẩm</small>
                  </span>
                </div>
              )}
              {!loading &&
                categories.map((category, index) => renderCategoryItem(category, index))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopCategoryStrip;


