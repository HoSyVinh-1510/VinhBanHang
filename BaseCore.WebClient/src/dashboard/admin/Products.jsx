import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { categoryApi, productApi } from "../../services/api";
import {
  getPagedMeta,
  mapApiList,
  normalizeCategory,
  normalizeProduct,
} from "../../utils/shopDataUtils";

const createDefaultFormData = (defaultCategoryId = "") => ({
  name: "",
  price: 0,
  stock: 0,
  description: "",
  imageUrl: "",
  imageUrlsText: "",
  unit: "",
  categoryId: defaultCategoryId,
  isFeatured: false,
  isActive: true,
});

const parseImageUrls = (value) =>
  (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(
      (item, index, array) => item.length > 0 && array.indexOf(item) === index,
    );

const formatReviewSummary = (product) => {
  const averageRating = Number(product?.averageRating || 0).toFixed(1);
  const totalReviews = Number(product?.totalReviews || 0).toLocaleString(
    "vi-VN",
  );
  return `${averageRating} (${totalReviews})`;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("true");
  const [sortBy, setSortBy] = useState("Id");
  const [sortDirection, setSortDirection] = useState("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [
    keyword,
    categoryId,
    stockFilter,
    featuredFilter,
    statusFilter,
    sortBy,
    sortDirection,
    page,
    pageSize,
  ]);

  const categoryMap = useMemo(
    () =>
      new Map(
        categories
          .filter((category) => category.id !== null)
          .map((category) => [Number(category.id), category]),
      ),
    [categories],
  );

  const loadCategories = async () => {
    try {
      const response = await categoryApi.getAll({
        isActive: true,
        page: 1,
        pageSize: 500,
      });
      const items = mapApiList(response?.data).map(normalizeCategory);
      setCategories(items);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không thể tải danh mục.");
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        keyword: keyword.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        inStock: stockFilter === "" ? undefined : stockFilter === "true",
        isFeatured:
          featuredFilter === "" ? undefined : featuredFilter === "true",
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
        sortBy,
        sortDirection,
        page,
        pageSize,
      };

      const response = await productApi.getAll(params);
      const payload = response?.data ?? {};
      const items = mapApiList(payload).map(normalizeProduct);
      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: items.length,
      });

      setProducts(items);
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(loadError.response?.data?.message || "Không thể tải sản phẩm.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || "",
        price: product.price ?? 0,
        stock: product.stock ?? 0,
        description: product.description || "",
        imageUrl: product.imageUrl || "",
        imageUrlsText: Array.isArray(product.imageUrls)
          ? product.imageUrls.join("\n")
          : "",
        unit: product.unit || "",
        categoryId: product.categoryId ?? "",
        isFeatured: Boolean(product.isFeatured),
        isActive: Boolean(product.isActive),
      });
    } else {
      setEditingProduct(null);
      setFormData(createDefaultFormData(categories[0]?.id ?? ""));
    }

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(createDefaultFormData(categories[0]?.id ?? ""));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        description: formData.description.trim() || null,
        imageUrl: formData.imageUrl.trim() || null,
        imageUrls: parseImageUrls(formData.imageUrlsText),
        unit: formData.unit.trim() || null,
        categoryId: Number(formData.categoryId),
        isFeatured: Boolean(formData.isFeatured),
        isActive: Boolean(formData.isActive),
      };

      if (editingProduct?.id) {
        await productApi.update(editingProduct.id, payload);
      } else {
        await productApi.create(payload);
      }

      closeModal();
      await loadProducts();
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn vô hiệu hóa sản phẩm này không?")) {
      return;
    }

    setError("");
    try {
      await productApi.delete(id);
      await loadProducts();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message || "Không thể xoá sản phẩm.",
      );
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput);
  };

  const handleResetFilter = () => {
    setKeywordInput("");
    setKeyword("");
    setCategoryId("");
    setStockFilter("");
    setFeaturedFilter("");
    setStatusFilter("true");
    setSortBy("createdAt");
    setSortDirection("desc");
    setPage(1);
  };

  const handleSortByChange = (event) => {
    const nextSortBy = event.target.value;
    setSortBy(nextSortBy);

    if (nextSortBy === "soldCount" || nextSortBy === "averageRating") {
      setSortDirection("desc");
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý sản phẩm</h1>
            </div>
            <div className="col-sm-6 text-right text-muted">
              Tổng: <strong>{totalCount}</strong>
            </div>
          </div>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-header">
              <form onSubmit={handleSearchSubmit}>
                <div className="form-row">
                  <div className="form-group col-md-3 mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm theo tên hoặc mô tả..."
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                  </div>
                  <div className="form-group col-md-2 mb-2">
                    <select
                      className="form-control"
                      value={categoryId}
                      onChange={(event) => {
                        setPage(1);
                        setCategoryId(event.target.value);
                      }}
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-2">
                    <select
                      className="form-control"
                      value={stockFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStockFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả tồn kho</option>
                      <option value="true">Còn hàng</option>
                      <option value="false">Hết hàng</option>
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-2">
                    <select
                      className="form-control"
                      value={featuredFilter}
                      onChange={(event) => {
                        setPage(1);
                        setFeaturedFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả loại</option>
                      <option value="true">Nổi bật</option>
                      <option value="false">Thường</option>
                    </select>
                  </div>
                  <div className="form-group col-md-1 mb-2">
                    <select
                      className="form-control"
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-2 d-flex justify-content-end">
                    <button type="submit" className="btn btn-primary mr-2">
                      <i className="fas fa-search"></i> Lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleResetFilter}
                    >
                      Xoá
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-2 mb-0">
                    <select
                      className="form-control"
                      value={sortBy}
                      onChange={handleSortByChange}
                    >
                      <option value="soldCount">Bán chạy</option>
                      <option value="averageRating">Đánh giá cao</option>
                      <option value="createdAt">Mỗi nhất</option>
                      <option value="name">Tên</option>
                      <option value="price">Giá</option>
                      <option value="stock">Tồn kho</option>
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-0">
                    <select
                      className="form-control"
                      value={sortDirection}
                      onChange={(event) => setSortDirection(event.target.value)}
                    >
                      <option value="desc">Giảm dần ID</option>
                      <option value="asc">Tăng dần ID</option>
                    </select>
                  </div>
                  <div className="form-group col-md-2 mb-0">
                    <select
                      className="form-control"
                      value={pageSize}
                      onChange={(event) => {
                        setPage(1);
                        setPageSize(Number(event.target.value) || 10);
                      }}
                    >
                      <option value={10}>10 / trang</option>
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                    </select>
                  </div>

                  <div className="form-group col-md-6 mb-0 text-right">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => openModal()}
                    >
                      <i className="fas fa-plus"></i> Thêm sản phẩm
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="card-body table-responsive p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : (
                <table className="table table-bordered table-striped mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "90px" }}>ID</th>
                      <th>Tên sản phẩm</th>
                      <th>Danh mục</th>
                      <th className="text-right">Giá</th>
                      <th className="text-right">Tồn kho</th>
                      <th style={{ width: "100px" }}>Nổi bật</th>
                      <th style={{ width: "100px" }}>Trạng thái</th>
                      <th style={{ width: "150px" }}>Thao tác</th>
                      <th className="text-right">Đánh giá</th>
                      <th className="text-right">Đã bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="text-center py-4 text-muted"
                        >
                          Không có sản phẩm phù hợp.
                        </td>
                      </tr>
                    ) : (
                      // Load Data vào table ở đây (Đang map để ánh xạ từng phần tử của list)
                      products.map((product) => {
                        const category = categoryMap.get(
                          Number(product.categoryId),
                        );
                        return (
                          <tr key={product.id}>
                            <td>{product.id}</td>
                            <td>{product.name}</td>
                            <td>
                              {category?.name || product.categoryName || "-"}
                            </td>
                            <td className="text-right">
                              {Number(product.price || 0).toLocaleString(
                                "vi-VN",
                              )}{" "}
                              đ
                            </td>
                            <td className="text-right">{product.stock}</td>
                            <td>{product.isFeatured ? "Có" : "Không"}</td>
                            <td>
                              <span
                                className={`badge ${product.isActive ? "badge-success" : "badge-secondary"}`}
                              >
                                {product.isActive ? "Đang bán" : "Ngừng bán"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-info mr-1"
                                onClick={() => openModal(product)}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(product.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                            <td className="text-right">
                              {formatReviewSummary(product)}
                            </td>
                            <td className="text-right">
                              {Number(product.soldCount || 0).toLocaleString(
                                "vi-VN",
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
              <div className="text-muted mb-2 mb-md-0">
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </section>
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingProduct ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
                </h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label>Tên sản phẩm</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-4">
                      <label>Danh mục</label>
                      <select
                        className="form-control"
                        value={formData.categoryId}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            categoryId: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-3">
                      <label>Giá(đ)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        className="form-control"
                        value={formData.price}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            price: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Tồn kho</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={formData.stock}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            stock: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>Đơn vị</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.unit}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            unit: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="form-group col-md-3">
                      <label>URL ảnh</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.imageUrl}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            imageUrl: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Bộ ảnh chi tiết (mới dòng 1 URL)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="https://example.com/image-1.jpg"
                      value={formData.imageUrlsText}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          imageUrlsText: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-3">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="productFeaturedSwitch"
                          checked={formData.isFeatured}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              isFeatured: event.target.checked,
                            }))
                          }
                        />
                        <label
                          className="custom-control-label"
                          htmlFor="productFeaturedSwitch"
                        >
                          Sản phẩm nổi bật
                        </label>
                      </div>
                    </div>
                    <div className="form-group col-md-3">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="productActiveSwitch"
                          checked={formData.isActive}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                        <label
                          className="custom-control-label"
                          htmlFor="productActiveSwitch"
                        >
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingProduct
                        ? "Cập nhật"
                        : "Tạo mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Products;
