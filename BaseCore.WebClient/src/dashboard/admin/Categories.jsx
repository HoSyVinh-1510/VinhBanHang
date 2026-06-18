import React, { useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { categoryApi } from "../../services/api";
import {
  getPagedMeta,
  mapApiList,
  normalizeCategory,
} from "../../utils/shopDataUtils";

const createDefaultFormData = () => ({
  name: "",
  description: "",
  isActive: true,
});

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasImageFilter, setHasImageFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [keyword, statusFilter, hasImageFilter, page, pageSize]);

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        keyword: keyword.trim() || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
        hasImage: hasImageFilter === "" ? undefined : hasImageFilter === "true",
        page,
        pageSize,
      };

      const response = await categoryApi.getAll(params);
      const payload = response?.data ?? {};
      const items = mapApiList(payload).map(normalizeCategory);
      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: items.length,
      });

      setCategories(items);
      setTotalCount(meta.totalCount);
      setTotalPages(meta.totalPages);
    } catch (loadError) {
      setCategories([]);
      setTotalCount(0);
      setTotalPages(1);
      setError(loadError.response?.data?.message || "Không thể tải danh mục.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name || "",
        description: category.description || "",
        isActive: category.isActive ?? true,
      });
    } else {
      setEditingCategory(null);
      setFormData(createDefaultFormData());
    }

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(createDefaultFormData());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isActive: Boolean(formData.isActive),
      };

      if (editingCategory?.id) {
        await categoryApi.update(editingCategory.id, payload);
      } else {
        await categoryApi.create(payload);
      }

      closeModal();
      await loadCategories();
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn vô hiệu hóa danh mục này không?")) {
      return;
    }

    setError("");
    try {
      await categoryApi.delete(id);
      await loadCategories();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message || "Không thể xoá danh mục.",
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
    setStatusFilter("");
    setHasImageFilter("");
    setPage(1);
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý danh mục</h1>
            </div>
            <div className="col-sm-6 text-right text-muted">
              Tổng: <strong>{totalCount} danh mục</strong>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-header">
              <div className="row">
                <div className="col-md-8">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="form-inline flex-wrap"
                  >
                    <input
                      type="text"
                      className="form-control mr-2 mb-2 mb-md-0"
                      placeholder="Tìm theo tên hoặc mô tả..."
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="true">Đang bật</option>
                      <option value="false">Đang tắt</option>
                    </select>
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={hasImageFilter}
                      onChange={(event) => {
                        setPage(1);
                        setHasImageFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả ảnh</option>
                      <option value="true">Có ảnh</option>
                      <option value="false">Không có ảnh</option>
                    </select>
                    <button
                      type="submit"
                      className="btn btn-primary mr-2 mb-2 mb-md-0"
                    >
                      <i className="fas fa-search"></i> Lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary mb-2 mb-md-0"
                      onClick={handleResetFilter}
                    >
                      Xoá lọc
                    </button>
                  </form>
                </div>
                <div className="col-md-4 text-right mt-2 mt-md-0">
                  <button
                    className="btn btn-success"
                    onClick={() => openModal()}
                  >
                    <i className="fas fa-plus"></i> Thêm danh mục
                  </button>
                </div>
              </div>
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
                      <th style={{ width: "60px" }}>ID</th>
                      <th>Tên danh mục</th>
                      <th>Mô tả</th>
                      <th style={{ width: "120px" }}>Trạng thái</th>
                      <th style={{ width: "120px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          Không có danh mục nào.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id}>
                          <td>{category.id}</td>
                          <td>{category.name}</td>
                          <td>{category.description || "-"}</td>
                          <td>
                            <span
                              className={`badge ${category.isActive ? "badge-success" : "badge-secondary"}`}
                            >
                              {category.isActive ? "Đang bật" : "Đang tắt"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-info mr-1"
                              onClick={() => openModal(category)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(category.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-footer d-flex flex-wrap justify-content-between align-items-center">
              <div className="text-muted mb-2 mb-md-0">
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </div>
              <div className="d-flex align-items-center">
                <select
                  className="form-control form-control-sm mr-2"
                  value={pageSize}
                  onChange={(event) => {
                    setPage(1);
                    setPageSize(Number(event.target.value) || 10);
                  }}
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={30}>30 / trang</option>
                </select>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCategory ? "Cập nhật danh mục" : "Tạo danh mục"}
                </h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Tên danh mục</label>
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
                  <div className="custom-control custom-checkbox">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="categoryActiveSwitch"
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
                      htmlFor="categoryActiveSwitch"
                    >
                      Đang hoạt động
                    </label>
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
                      : editingCategory
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

export default Categories;
