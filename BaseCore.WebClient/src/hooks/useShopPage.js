import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * useShopPage — hook dùng chung cho tất cả các trang Shop.
 *
 * Đóng gói logic lặp lại:
 *   - Lấy thông tin user, isAdmin
 *   - handleLogout (xóa token + chuyển về /login)
 *   - searchInput state
 *   - handleSearchSubmit (chuyển tới /shop/list?q=...)
 *
 * Cách dùng:
 *   const { user, isAdmin, navigate, handleLogout,
 *           searchInput, setSearchInput, handleSearchSubmit } = useShopPage();
 */
const useShopPage = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (query) navigate(`/shop/list?q=${encodeURIComponent(query)}`);
  };

  return {
    user,
    isAdmin: isAdmin(),
    navigate,
    handleLogout,
    searchInput,
    setSearchInput,
    handleSearchSubmit,
  };
};

export default useShopPage;
