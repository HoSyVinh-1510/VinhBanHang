import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cartApi, categoryApi, productApi } from "../../services/api";
import ShopCategoryStrip from "./components_UI/ShopCategoryStrip";
import ShopShell from "./components_UI/ShopShell";
import ShopProductCard from "./components_UI/ShopProductCard";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  mapApiList,
  normalizeCartItem,
  normalizeCategory,
  normalizeProduct,
} from "../../utils/shopDataUtils";

const ProductSection = ({
  sectionId,
  title,
  products,
  isLoading,
  onAddToCart,
}) => (
  <div id={sectionId} className="container-fluid pt-5 pb-3">
    <h2 className="section-title position-relative text-uppercase mx-xl-5 mb-4">
      {title}
    </h2>
    <div className="row px-xl-5">
      {isLoading && (
        <div className="col-12 text-center text-muted py-4">
          Đang tải sản phẩm...
        </div>
      )}
      {!isLoading && products.length === 0 && (
        <div className="col-12 text-center text-muted py-4">
          Không tìm thấy sản phẩm.
        </div>
      )}
      {!isLoading &&
        products.map((product, index) => (
          <ShopProductCard
            key={`${title}-${product.id ?? index}`}
            product={product}
            index={index}
            onAddToCart={onAddToCart}
          />
        ))}
    </div>
  </div>
);

const ShopHome = () => {
  useMultiShopStyles();

  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [productCountByCategory, setProductCountByCategory] = useState(
    new Map(),
  );
  const [searchInput, setSearchInput] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProductCounts, setLoadingProductCounts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await categoryApi.getAll();
        const normalized = mapApiList(response.data)
          .map(normalizeCategory)
          .filter((category) => category.id !== null && category.isActive);

        if (mounted) {
          setCategories(normalized);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError.response?.data?.message || "Không thể tải danh mục.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingCategories(false);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProductCounts = async () => {
      setLoadingProductCounts(true);
      try {
        const response = await productApi.getCategoryCounts();
        const items = mapApiList(response?.data);
        const allCounts = new Map(
          items.map((item) => [
            String(item?.categoryId ?? ""),
            Number(item?.productCount ?? 0) || 0,
          ]),
        );

        if (mounted) {
          setProductCountByCategory(allCounts);
        }
      } catch {
        if (mounted) {
          setProductCountByCategory(new Map());
        }
      } finally {
        if (mounted) {
          setLoadingProductCounts(false);
        }
      }
    };

    loadProductCounts();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProductSections = async () => {
      setLoadingProducts(true);
      setError("");
      try {
        const [featuredResponse, recentResponse] = await Promise.all([
          productApi.getAll({
            isFeatured: true,
            isActive: true,
            sortBy: "createdAt",
            sortDirection: "desc",
            page: 1,
            pageSize: 8,
          }),
          productApi.getAll({
            isActive: true,
            sortBy: "createdAt",
            sortDirection: "desc",
            page: 1,
            pageSize: 8,
          }),
        ]);

        const featuredItems = mapApiList(featuredResponse?.data)
          .map(normalizeProduct)
          .filter((product) => product.id !== null);

        const recentItems = mapApiList(recentResponse?.data)
          .map(normalizeProduct)
          .filter((product) => product.id !== null);

        if (mounted) {
          setFeaturedProducts(featuredItems);
          setRecentProducts(recentItems);
        }
      } catch (loadError) {
        if (mounted) {
          setFeaturedProducts([]);
          setRecentProducts([]);
          setError(
            loadError.response?.data?.message || "Không thể tải sản phẩm.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    };

    loadProductSections();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(
      query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list",
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getShopListPath = (categoryId = null) => {
    const params = new URLSearchParams();
    const query = searchInput.trim();

    if (query) {
      params.set("q", query);
    }

    if (categoryId !== null && categoryId !== undefined) {
      params.set("categoryId", String(categoryId));
    }

    const queryString = params.toString();
    return queryString ? `/shop/list?${queryString}` : "/shop/list";
  };

  const handleAddToCart = async (product) => {
    if (!product?.id) {
      return;
    }

    const productId = Number(product.id);
    if (!Number.isFinite(productId)) {
      return;
    }

    if (Number(product.stock) <= 0) {
      setSuccess("");
      setError(`Sản phẩm "${product.name}" đã hết hàng.`);
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
        (item) => Number(item.productId) === productId,
      );
      const nextQuantity = (existingItem?.quantity ?? 0) + 1;

      if (product.stock > 0 && nextQuantity > product.stock) {
        setError(`Số lượng trong giỏ vượt tồn kho (tối đa ${product.stock}).`);
        return;
      }

      await cartApi.setQuantity(productId, nextQuantity);
      window.dispatchEvent(new Event("cart-updated"));
      setSuccess(`Đã thêm "${product.name}" vào giỏ hàng (${nextQuantity}).`);
    } catch (addError) {
      setSuccess("");
      setError(
        addError.response?.data?.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );
    }
  };

  return (
    <ShopShell
      activeRoute="home"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin()}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
    >
    <ShopCategoryStrip
      categories={categories}
      loading={loadingCategories || loadingProductCounts}
      productCountByCategory={productCountByCategory}
      buildCategoryPath={getShopListPath}
      title="Khám phá nhanh theo danh mục"
    />

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

      <ProductSection
        sectionId="featured-products"
        title="Sản phẩm nổi bật"
        products={featuredProducts}
        isLoading={loadingProducts}
        onAddToCart={handleAddToCart}
      />
      <ProductSection
        sectionId="new-products"
        title="Sản phẩm mới"
        products={recentProducts}
        isLoading={loadingProducts}
        onAddToCart={handleAddToCart}
      />
    </ShopShell>
  );
};

export default ShopHome;

