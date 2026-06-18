import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cartApi, categoryApi, productApi } from "../../services/api";
import FilterCriteriaModal from "./components_UI/FilterCriteriaModal";
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

const PRICE_FILTERS = [
  { id: "all", label: "Tất cả mức giá" },
  { id: "under-50000", label: "Dưới 50.000đ", min: 0, max: 49999 },
  { id: "50000-100000", label: "50.000đ - 100.000đ", min: 50000, max: 100000 },
  {
    id: "100000-200000",
    label: "100.000đ - 200.000đ",
    min: 100000,
    max: 200000,
  },
  { id: "over-200000", label: "Trên 200.000đ", min: 200000, max: null },
];

const STOCK_FILTERS = [
  { id: "all", label: "Tất cả trạng thái" },
  { id: "in-stock", label: "Còn hàng" },
  { id: "out-stock", label: "Hết hàng" },
];

const SORT_OPTIONS = [
  {
    id: "latest",
    label: "Mới nhất",
    sortBy: "createdAt",
    sortDirection: "desc",
  },
  {
    id: "best-selling",
    label: "Bán chạy",
    sortBy: "soldCount",
    sortDirection: "desc",
  },
  {
    id: "rating-desc",
    label: "Đánh giá cao",
    sortBy: "averageRating",
    sortDirection: "desc",
  },
  {
    id: "price-asc",
    label: "Giá tăng dần",
    sortBy: "price",
    sortDirection: "asc",
  },
  {
    id: "price-desc",
    label: "Giá giảm dần",
    sortBy: "price",
    sortDirection: "desc",
  },
  { id: "name-asc", label: "Tên A - Z", sortBy: "name", sortDirection: "asc" },
  {
    id: "stock-desc",
    label: "Tồn kho giảm dần",
    sortBy: "stock",
    sortDirection: "desc",
  },
];

const parseCategoryId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const ShopList = () => {
  useMultiShopStyles();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, isAdmin } = useAuth();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategoryId = parseCategoryId(searchParams.get("categoryId"));

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(initialCategoryId);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [priceFilter, setPriceFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDraft, setFilterDraft] = useState({
    priceFilter: "all",
    stockFilter: "all",
    featuredOnly: false,
    sortBy: "latest",
    pageSize: 12,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const query = searchParams.get("q") ?? "";
    const categoryIdFromUrl = parseCategoryId(searchParams.get("categoryId"));

    setSearchInput(query);
    setSearchKeyword(query);
    setSelectedCategoryId(categoryIdFromUrl);
    setPage(1);
  }, [searchParams]);

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

    const loadProducts = async () => {
      setLoadingProducts(true);
      setError("");

      const selectedPrice =
        PRICE_FILTERS.find((option) => option.id === priceFilter) ||
        PRICE_FILTERS[0];
      const sortOption =
        SORT_OPTIONS.find((option) => option.id === sortBy) || SORT_OPTIONS[0];

      const minPrice =
        selectedPrice.id === "all" ? undefined : selectedPrice.min;
      const maxPrice =
        selectedPrice.id === "all" ? undefined : selectedPrice.max;
      const inStock =
        stockFilter === "all"
          ? undefined
          : stockFilter === "in-stock"
            ? true
            : false;

      try {
        const response = await productApi.getAll({
          keyword: searchKeyword || undefined,
          categoryId: selectedCategoryId || undefined,
          minPrice,
          maxPrice,
          inStock,
          isFeatured: featuredOnly ? true : undefined,
          isActive: true,
          sortBy: sortOption.sortBy,
          sortDirection: sortOption.sortDirection,
          page,
          pageSize,
        });

        const payload = response.data ?? {};
        const normalized = mapApiList(payload)
          .map(normalizeProduct)
          .filter((product) => product.id !== null);

        if (mounted) {
          setProducts(normalized);
          setTotalCount(
            Number(payload.totalCount ?? normalized.length) ||
              normalized.length,
          );
          setTotalPages(
            Math.max(
              1,
              Number(
                payload.totalPages ?? Math.ceil(normalized.length / pageSize),
              ) || 1,
            ),
          );
        }
      } catch (loadError) {
        if (mounted) {
          setProducts([]);
          setTotalCount(0);
          setTotalPages(1);
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

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [
    featuredOnly,
    page,
    pageSize,
    priceFilter,
    searchKeyword,
    selectedCategoryId,
    sortBy,
    stockFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [featuredOnly, priceFilter, stockFilter, sortBy]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const syncQueryParams = (queryValue, categoryIdValue) => {
    const nextParams = {};
    if (queryValue) {
      nextParams.q = queryValue;
    }
    if (categoryIdValue !== null && categoryIdValue !== undefined) {
      nextParams.categoryId = String(categoryIdValue);
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    setPage(1);
    setSearchKeyword(query);
    syncQueryParams(query, selectedCategoryId);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
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

  const handleSelectCategory = (categoryId) => {
    const query = searchKeyword.trim();
    setPage(1);
    setSelectedCategoryId(categoryId);
    syncQueryParams(query, categoryId);
  };

  const handleResetFilters = () => {
    setPriceFilter("all");
    setStockFilter("all");
    setFeaturedOnly(false);
    setSortBy("latest");
    setPageSize(12);
    setFilterDraft({
      priceFilter: "all",
      stockFilter: "all",
      featuredOnly: false,
      sortBy: "latest",
      pageSize: 12,
    });
    setPage(1);
  };

  const openFilterModal = () => {
    setFilterDraft({
      priceFilter,
      stockFilter,
      featuredOnly,
      sortBy,
      pageSize,
    });
    setShowFilterModal(true);
  };

  const applyFiltersFromModal = () => {
    setPriceFilter(filterDraft.priceFilter || "all");
    setStockFilter(filterDraft.stockFilter || "all");
    setFeaturedOnly(Boolean(filterDraft.featuredOnly));
    setSortBy(filterDraft.sortBy || "latest");
    setPageSize(Number(filterDraft.pageSize) || 12);
    setPage(1);
    setShowFilterModal(false);
  };

  const pageArray = useMemo(() => {
    const maxPagesToShow = 5;
    const pages = [];
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    for (let current = startPage; current <= endPage; current += 1) {
      pages.push(current);
    }
    return pages;
  }, [page, totalPages]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => String(category.id) === String(selectedCategoryId),
      ) ?? null,
    [categories, selectedCategoryId],
  );
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (priceFilter !== "all") count += 1;
    if (stockFilter !== "all") count += 1;
    if (featuredOnly) count += 1;
    if (sortBy !== "latest") count += 1;
    if (pageSize !== 12) count += 1;
    return count;
  }, [featuredOnly, pageSize, priceFilter, sortBy, stockFilter]);

  return (
    <ShopShell
      activeRoute="shop"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin()}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
    >
      <div className="container-fluid">
        <div className="row px-xl-5">
          <div className="col-12 d-flex flex-wrap justify-content-between align-items-center">
            <h2 className="section-title position-relative text-uppercase mb-4">
              Sản phẩm tại cửa hàng
            </h2>
          </div>
        </div>
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

      <ShopCategoryStrip
        categories={categories}
        loading={loadingCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
        title="Chọn nhanh danh mục"
      />

      <div className="container-fluid pb-3">
        <div className="row px-xl-5">
          <div className="col-12">
            <div className="d-flex flex-wrap justify-content-between align-items-center bg-light p-3 mb-3 shop-toolbar-panel">
              <div className="text-muted mb-2 mb-md-0">
                Đang xem danh mục:{" "}
                <strong>{selectedCategory?.name ?? " Tất cả sản phẩm"} </strong>
                <br></br>
                Hiển thị <strong>{totalCount}</strong> sản phẩm
              </div>
              <div className="d-flex align-items-center">
                <button
                  type="button"
                  className="btn btn-primary btn-sm mr-2 shop-toolbar-btn"
                  onClick={openFilterModal}
                >
                  Bộ Lọc
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm shop-toolbar-btn"
                  onClick={handleResetFilters}
                >
                  Xoá Lọc
                </button>
              </div>
            </div>

            <div className="row shop-product-grid-row">
              {loadingProducts && (
                <div className="col-12 text-center text-muted py-4">
                  Đang tải sản phẩm...
                </div>
              )}

              {!loadingProducts && products.length === 0 && (
                <div className="col-12 text-center text-muted py-4">
                  Không tìm thấy sản phẩm phù hợp bộ lọc.
                </div>
              )}

              {!loadingProducts &&
                products.map((product, index) => (
                  <ShopProductCard
                    key={product.id ?? index}
                    product={product}
                    index={index}
                    onAddToCart={handleAddToCart}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      <FilterCriteriaModal
        show={showFilterModal}
        title="Tiêu chí lọc sản phẩm"
        onClose={() => setShowFilterModal(false)}
        onApply={applyFiltersFromModal}
        onReset={handleResetFilters}
      >
        <div className="form-row">
          <div className="form-group col-md-6">
            <label>Khoảng giá</label>
            <select
              className="form-control"
              value={filterDraft.priceFilter}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  priceFilter: event.target.value,
                }))
              }
            >
              {PRICE_FILTERS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Còn hàng</label>
            <select
              className="form-control"
              value={filterDraft.stockFilter}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  stockFilter: event.target.value,
                }))
              }
            >
              {STOCK_FILTERS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Sắp xếp theo</label>
            <select
              className="form-control"
              value={filterDraft.sortBy}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  sortBy: event.target.value,
                }))
              }
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-md-6">
            <label>Hiển thị số lượng trên trang</label>
            <select
              className="form-control"
              value={filterDraft.pageSize}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  pageSize: Number(event.target.value) || 12,
                }))
              }
            >
              <option value={12}>12 / trang</option>
              <option value={24}>24 / trang</option>
              <option value={36}>36 / trang</option>
            </select>
          </div>

          <div className="form-group col-12 mb-0">
            <div className="custom-control custom-checkbox">
              <input
                type="checkbox"
                className="custom-control-input"
                id="shopFeaturedOnlyFilterModal"
                checked={Boolean(filterDraft.featuredOnly)}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    featuredOnly: event.target.checked,
                  }))
                }
              />
              <label
                className="custom-control-label"
                htmlFor="shopFeaturedOnlyFilterModal"
              >
                Chỉ hiển thị sản phẩm nội bật
              </label>
            </div>
          </div>
        </div>
      </FilterCriteriaModal>

      <div className="container-fluid pb-4">
        <div className="row px-xl-5">
          <div className="col-12 d-flex justify-content-center">
            <nav aria-label="Phân trang cửa hàng">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </nav>
          </div>
        </div>
      </div>
    </ShopShell>
  );
};

export default ShopList;

