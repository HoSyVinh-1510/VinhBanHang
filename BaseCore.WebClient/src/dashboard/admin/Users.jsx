import React, { useEffect, useState } from "react";
import Pagination from "../../components/shared/Pagination";
import { userApi } from "../../services/api";
import { mapApiList, getPagedMeta } from "../../utils/shopDataUtils";

const createDefaultFormData = () => ({
  username: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  position: "",
  userType: 0,
  isActive: true,
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, keyword, userTypeFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await userApi.getAll({
        keyword: keyword.trim() || undefined,
        userType: userTypeFilter === "" ? undefined : Number(userTypeFilter),
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
        page,
        pageSize,
      });

      const payload = response?.data ?? {};
      const items = mapApiList(payload);
      setUsers(items);

      const meta = getPagedMeta(payload, {
        page,
        pageSize,
        fallbackCount: items.length,
      });
      setTotalPages(meta.totalPages);
      setTotalCount(meta.totalCount);
    } catch (loadError) {
      setUsers([]);
      setTotalPages(1);
      setTotalCount(0);
      setError(
        loadError.response?.data?.message || "Không thể tải người dùng.",
      );
    } finally {
      setLoading(false);
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
    setUserTypeFilter("");
    setStatusFilter("");
    setPageSize(10);
    setPage(1);
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username || "",
        password: "",
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        position: user.position || "",
        userType: user.userType ?? 0,
        isActive: Boolean(user.isActive),
      });
    } else {
      setEditingUser(null);
      setFormData(createDefaultFormData());
    }

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(createDefaultFormData());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (editingUser) {
        const payload = {
          name: formData.name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          position: formData.position || null,
          userType: Number(formData.userType),
          isActive: Boolean(formData.isActive),
        };

        if (formData.password) {
          payload.password = formData.password;
        }

        await userApi.update(editingUser.id, payload);
      } else {
        if (!formData.password) {
          setError("Mật khẩu là bắt buộc khi tạo người dùng mới.");
          setSaving(false);
          return;
        }

        await userApi.create({
          username: formData.username.trim(),
          password: formData.password,
          name: formData.name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          position: formData.position || null,
          userType: Number(formData.userType),
        });
      }

      closeModal();
      await loadUsers();
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Thao tác thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xoá người dùng này không?")) {
      return;
    }

    setError("");
    try {
      await userApi.delete(id);
      await loadUsers();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.message || "Không thể xoá người dùng.",
      );
    }
  };

  return (
    <div className="content-wrapper">
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Quản lý người dùng</h1>
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
              <div className="row">
                <div className="col-md-9">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="form-inline flex-wrap"
                  >
                    <input
                      type="text"
                      className="form-control mr-2 mb-2 mb-md-0"
                      placeholder="Tìm theo tên, email, số điện thoại..."
                      value={keywordInput}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={userTypeFilter}
                      onChange={(event) => {
                        setPage(1);
                        setUserTypeFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả vai trò</option>
                      <option value="1">Quản trị viên</option>
                      <option value="0">Người dùng</option>
                    </select>
                    <select
                      className="form-control mr-2 mb-2 mb-md-0"
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="true">Đang hoạt động</option>
                      <option value="false">Ngừng hoạt động</option>
                    </select>
                    <button
                      type="submit"
                      className="btn btn-primary mr-2 mb-2 mb-md-0"
                    >
                      <i className="fas fa-search"></i> Lọc
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary mr-2 mb-2 mb-md-0"
                      onClick={handleResetFilter}
                    >
                      Xoá lọc
                    </button>
                    <select
                      className="form-control mb-2 mb-md-0"
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
                  </form>
                </div>
                <div className="col-md-3 text-right mt-2 mt-md-0">
                  <button
                    className="btn btn-success"
                    onClick={() => openModal()}
                  >
                    <i className="fas fa-plus"></i> Thêm người dùng
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
                      <th>Tên đăng nhập</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Vai trò</th>
                      <th>Trạng thái</th>
                      <th style={{ width: "140px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          Không có người dùng phù hợp.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.username}</td>
                          <td>{user.name || "-"}</td>
                          <td>{user.email || "-"}</td>
                          <td>{user.phone || "-"}</td>
                          <td>
                            <span
                              className={`badge ${user.userType === 1 ? "badge-danger" : "badge-info"}`}
                            >
                              {user.userType === 1
                                ? "Quản trị viên"
                                : "Người dùng"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${user.isActive ? "badge-success" : "badge-secondary"}`}
                            >
                              {user.isActive
                                ? "Đang hoạt động"
                                : "Ngừng hoạt động"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-info mr-1"
                              onClick={() => openModal(user)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(user.id)}
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

            <div className="card-footer d-flex justify-content-between align-items-center">
              <span className="text-muted">
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
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
                  {editingUser ? "Sửa người dùng" : "Thêm người dùng"}
                </h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="form-group">
                    <label>Tên đăng nhập</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.username}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      required
                      disabled={Boolean(editingUser)}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Mật khẩu {editingUser ? "(để trống nếu giữ nguyên)" : ""}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      required={!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Họ tên</label>
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
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Chức vụ</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.position}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          position: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Vai trò</label>
                    <select
                      className="form-control"
                      value={formData.userType}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          userType: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>Người dùng</option>
                      <option value={1}>Quản trị viên</option>
                    </select>
                  </div>
                  {editingUser && (
                    <div className="form-group">
                      <div className="custom-control custom-switch">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="isActive"
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
                          htmlFor="isActive"
                        >
                          Đang hoạt động
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingUser
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

export default Users;
