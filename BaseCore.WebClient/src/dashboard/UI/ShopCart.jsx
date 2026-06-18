import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cartApi, orderApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import ShopCouponModal from "./components_UI/ShopCouponModal";
import {
  formatPrice,
  mapApiList,
  normalizeCartItem,
  resolveProductImage,
} from "../../utils/shopDataUtils";

const toProductKey = (productId) => String(productId);

const ShopCart = () => {
  useMultiShopStyles();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick(t => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () => window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const navigate = useNavigate();

  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [selectedProductKeys, setSelectedProductKeys] = useState([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCouponModal, setShowCouponModal] = useState(false);

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await cartApi.getAll();
      const normalized = mapApiList(response?.data)
        .map(normalizeCartItem)
        .filter((item) => item.productId !== null);

      setCartItems(normalized);

      const availableKeySet = new Set(
        normalized.map((item) => toProductKey(item.productId)),
      );

      if (!selectionInitialized) {
        setSelectedProductKeys(Array.from(availableKeySet));
        setSelectionInitialized(true);
      } else {
        setSelectedProductKeys((current) =>
          current.filter((productKey) => availableKeySet.has(productKey)),
        );
      }
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không thể tải giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }, [selectionInitialized]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const selectedKeySet = useMemo(
    () => new Set(selectedProductKeys),
    [selectedProductKeys],
  );

  const selectedItems = useMemo(
    () =>
      cartItems.filter((item) =>
        selectedKeySet.has(toProductKey(item.productId)),
      ),
    [cartItems, selectedKeySet],
  );
  const selectedItemSignature = useMemo(
    () =>
      selectedItems
        .map((item) => `${item.productId}:${item.quantity}`)
        .sort()
        .join("|"),
    [selectedItems],
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems],
  );

  const selectedSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [selectedItems],
  );
  const discountAmount = useMemo(() => {
    const discount = Number(appliedCoupon?.discountAmount ?? 0);
    if (!Number.isFinite(discount) || discount <= 0) {
      return 0;
    }
    return Math.min(discount, selectedSubtotal);
  }, [appliedCoupon, selectedSubtotal]);
  const payableSelectedTotal = Math.max(0, selectedSubtotal - discountAmount);

  const isAllSelected =
    cartItems.length > 0 && selectedItems.length === cartItems.length;

  useEffect(() => {
    setAppliedCoupon(null);
  }, [selectedItemSignature]);

  useEffect(() => {
    if (!appliedCoupon) {
      return;
    }
    const currentCoupon = couponInput.trim().toUpperCase();
    const appliedCode = String(appliedCoupon.couponCode || "").toUpperCase();
    if (currentCoupon !== appliedCode) {
      setAppliedCoupon(null);
    }
  }, [appliedCoupon, couponInput]);

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

  const handleToggleItemSelection = (productId) => {
    const productKey = toProductKey(productId);
    setSelectedProductKeys((current) => {
      if (current.includes(productKey)) {
        return current.filter((key) => key !== productKey);
      }

      return [...current, productKey];
    });
  };

  const handleSelectAllItems = () => {
    setSelectedProductKeys(
      cartItems.map((item) => toProductKey(item.productId)),
    );
  };

  const handleClearSelection = () => {
    setSelectedProductKeys([]);
  };

  const handleToggleSelectAllByCheckbox = () => {
    if (isAllSelected) {
      handleClearSelection();
      return;
    }

    handleSelectAllItems();
  };

  const handleChangeQuantity = async (productId, quantity) => {
    const quantityValue = Number(quantity);
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await cartApi.setQuantity(productId, quantityValue);
      setSuccess("Đã cập nhật giỏ hàng.");
      await loadCart();
    } catch (updateError) {
      setError(
        updateError.response?.data?.message || "Không thể cập nhật giỏ hàng.",
      );
    }
  };

  const handleRemoveItem = async (productId) => {
    setError("");
    setSuccess("");

    try {
      await cartApi.remove(productId);
      setSelectedProductKeys((current) =>
        current.filter((productKey) => productKey !== toProductKey(productId)),
      );
      setSuccess("Đã xoá sản phẩm khỏi giỏ hàng.");
      await loadCart();
    } catch (removeError) {
      setError(
        removeError.response?.data?.message || "Không thể xoá sản phẩm.",
      );
    }
  };

  const handleClearCart = async () => {
    setError("");
    setSuccess("");

    try {
      await cartApi.clear();
      setSelectedProductKeys([]);
      setSuccess("Đã xoá toàn bộ giỏ hàng.");
      await loadCart();
    } catch (clearError) {
      setError(clearError.response?.data?.message || "Không thể xoá giỏ hàng.");
    }
  };

  const handleApplyCoupon = async (couponCodeToApply) => {
    const targetCode =
      typeof couponCodeToApply === "string" ? couponCodeToApply : couponInput;

    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất 1 món trước khi áp mã giảm giá.");
      return;
    }

    if (!targetCode.trim()) {
      setAppliedCoupon(null);
      setSuccess("Đã bỏ mã giảm giá.");
      setError("");
      return;
    }

    setCouponLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await orderApi.validateCoupon({
        couponCode: targetCode.trim(),
        items: selectedItems.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
      });
      const payload = response?.data ?? {};
      setAppliedCoupon({
        couponCode: payload.couponCode ?? targetCode.trim().toUpperCase(),
        discountAmount: Number(payload.discountAmount ?? 0) || 0,
      });
      setSuccess(payload.message || "Áp mã giảm giá thành công.");
    } catch (applyError) {
      setAppliedCoupon(null);
      setError(
        applyError.response?.data?.message || "Không thể áp mã giảm giá.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckoutSelected = () => {
    if (selectedItems.length === 0) {
      setError("Vui lòng chọn ít nhất 1 món để thanh toán.");
      return;
    }

    const selectedProductIds = selectedItems.map((item) => item.productId);
    const params = new URLSearchParams({
      items: selectedProductIds.join(","),
    });
    if (appliedCoupon?.couponCode) {
      params.set("coupon", appliedCoupon.couponCode);
    }
    const query = params.toString();

    navigate(`/shop/checkout?${query}`);
  };

  const handleCheckoutAll = () => {
    const params = new URLSearchParams();
    if (appliedCoupon?.couponCode) {
      params.set("coupon", appliedCoupon.couponCode);
    }
    const query = params.toString();
    navigate(query ? `/shop/checkout?${query}` : "/shop/checkout");
  };

  return (
    <ShopShell
      activeRoute="cart"
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
          <div className="col-lg-8 table-responsive mb-5">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <h3>Chọn món để thanh toán</h3>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleClearSelection}
                  disabled={selectedItems.length === 0}
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            <table className="table table-light table-borderless table-hover text-center mb-0">
              <thead className="thead-dark">
                <tr>
                  <th style={{ width: "80px" }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAllByCheckbox}
                      disabled={cartItems.length === 0}
                    />{" "}
                    All
                  </th>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Tổng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody className="align-middle">
                {loading && (
                  <tr>
                    <td colSpan="6" className="text-muted py-4">
                      Đang tải giỏ hàng...
                    </td>
                  </tr>
                )}

                {!loading && cartItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-muted py-4">
                      Giỏ hàng của bạn đang trống.
                    </td>
                  </tr>
                )}

                {!loading &&
                  cartItems.map((item, index) => {
                    const productKey = toProductKey(item.productId);
                    const isSelected = selectedKeySet.has(productKey);

                    return (
                      <tr
                        key={item.id ?? `${item.productId}-${index}`}
                        className={isSelected ? "table-active" : ""}
                      >
                        <td className="align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handleToggleItemSelection(item.productId)
                            }
                          />
                        </td>
                        <td className="align-middle text-left">
                          {item.productId ? (
                            <Link
                              to={`/shop/product/${item.productId}`}
                              className="text-dark text-decoration-none"
                            >
                              <img
                                src={resolveProductImage(
                                  item.product.imageUrl,
                                  index,
                                )}
                                alt={item.product.name}
                                style={{ width: "50px" }}
                                className="mr-2"
                              />
                              {item.product.name}
                            </Link>
                          ) : (
                            <>
                              <img
                                src={resolveProductImage(
                                  item.product.imageUrl,
                                  index,
                                )}
                                alt={item.product.name}
                                style={{ width: "50px" }}
                                className="mr-2"
                              />
                              {item.product.name}
                            </>
                          )}
                        </td>
                        <td className="align-middle">
                          {formatPrice(item.unitPrice)}
                        </td>
                        <td className="align-middle" style={{ width: "160px" }}>
                          <input
                            className="form-control form-control-sm text-center"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              setCartItems((current) =>
                                current.map((cartItem) => {
                                  if (cartItem.productId !== item.productId) {
                                    return cartItem;
                                  }

                                  const nextQuantity = Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  );
                                  return {
                                    ...cartItem,
                                    quantity: nextQuantity,
                                    total: cartItem.unitPrice * nextQuantity,
                                  };
                                }),
                              )
                            }
                            onBlur={(event) =>
                              handleChangeQuantity(
                                item.productId,
                                Math.max(1, Number(event.target.value) || 1),
                              )
                            }
                          />
                        </td>
                        <td className="align-middle">
                          {formatPrice(
                            item.unitPrice * item.quantity,
                          )}
                        </td>
                        <td className="align-middle">
                          <button
                            className="btn btn-sm btn-danger"
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            Xoá sản phẩm
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="col-lg-4">
            <div className="bg-light p-30 mb-5">
              <h5 className="section-title position-relative text-uppercase mb-3">
                Tóm tắt giỏ hàng
              </h5>
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập mã giảm giá"
                  value={couponInput}
                  onChange={(event) =>
                    setCouponInput(event.target.value.toUpperCase())
                  }
                />
                <div className="input-group-append">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || loading}
                  >
                    {couponLoading ? "Đang áp mã..." : "Áp dụng"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => setShowCouponModal(true)}
                    disabled={loading}
                  >
                    Chọn mã
                  </button>
                </div>
              </div>
              {appliedCoupon?.couponCode && (
                <small className="d-block text-success mb-3">
                  Đã áp mã <strong>{appliedCoupon.couponCode}</strong>
                  <br></br>
                  Giảm: {formatPrice(discountAmount)}
                </small>
              )}

              <div className="d-flex justify-content-between mb-3">
                <h6>Đã chọn thanh toán</h6>
                <h6 className={selectedItems.length > 0 ? "text-primary" : ""}>
                  {formatPrice(selectedSubtotal)}
                </h6>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <h5>Đã chọn ({selectedItems.length} món)</h5>
                <h5>{formatPrice(selectedSubtotal)}</h5>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <h5>Giảm giá</h5>
                <h5>-{formatPrice(discountAmount)}</h5>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <h5>Cần thanh toán</h5>
                <h5>{formatPrice(payableSelectedTotal)}</h5>
              </div>

              <button
                className="btn btn-block btn-primary font-weight-bold my-3 py-3"
                type="button"
                onClick={handleCheckoutSelected}
                disabled={selectedItems.length === 0}
              >
                Thanh toán món đã chọn
              </button>
              <button
                className="btn btn-block btn-outline-danger font-weight-bold py-2"
                type="button"
                onClick={handleClearCart}
                disabled={cartItems.length === 0}
              >
                Xoá giỏ hàng
              </button>
            </div>
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
      {showCouponModal && (
        <ShopCouponModal
          show={showCouponModal}
          onClose={() => setShowCouponModal(false)}
          items={selectedItems}
          onSelectCoupon={(code) => {
            setCouponInput(code);
            handleApplyCoupon(code);
          }}
        />
      )}
    </ShopShell>
  );
};

export default ShopCart;

