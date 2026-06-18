import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { addressApi, cartApi, orderApi, walletApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";
import {
  formatPrice,
  mapApiList,
  normalizeCartItem,
  resolveProductImage,
} from "../../utils/shopDataUtils";
import {
  isBankTransferMethod,
  normalizeOrder,
} from "../../utils/orderDataUtils";
import {
  normalizeAddress,
  parseSelectedProductIds,
  toOrderItemsPayload,
} from "../../utils/checkoutDataUtils";
import ShopAddressModal from "./components_UI/ShopAddressModal";
import ShopCouponModal from "./components_UI/ShopCouponModal";

const ShopCheckout = () => {
  useMultiShopStyles();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleEvent = () => setTick((t) => t + 1);
    window.addEventListener("shop-currency-changed", handleEvent);
    return () =>
      window.removeEventListener("shop-currency-changed", handleEvent);
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, isAdmin } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [wallet, setWallet] = useState(null);
  const [useWallet, setUseWallet] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [couponInput, setCouponInput] = useState(
    (searchParams.get("coupon") || "").trim().toUpperCase(),
  );
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [deliveryMethod, setDeliveryMethod] = useState("Delivery");
  const [pickupTime, setPickupTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(false);

  const selectedProductIdSet = useMemo(
    () => parseSelectedProductIds(searchParams.get("items")),
    [searchParams],
  );

  const loadCheckoutData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [cartResult, addressResult, walletResult] =
        await Promise.allSettled([
          cartApi.getAll(),
          addressApi.getAll(),
          walletApi.getWallet(),
        ]);

      const normalizedCartItems =
        cartResult.status === "fulfilled"
          ? mapApiList(cartResult.value?.data)
              .map(normalizeCartItem)
              .filter(
                (item) =>
                  Number.isInteger(Number(item.productId)) &&
                  Number(item.productId) > 0,
              )
          : [];

      if (cartResult.status === "rejected") {
        throw cartResult.reason;
      }

      const normalizedAddresses =
        addressResult.status === "fulfilled"
          ? mapApiList(addressResult.value?.data)
              .map(normalizeAddress)
              .filter((address) => address.id > 0)
          : [];

      setCartItems(normalizedCartItems);
      setAddresses(normalizedAddresses);
      if (walletResult.status === "fulfilled" && walletResult.value) {
        setWallet(walletResult.value.data);
      }

      const defaultAddress =
        normalizedAddresses.find((address) => address.isDefault) ??
        normalizedAddresses[0];
      setSelectedAddressId(defaultAddress ? String(defaultAddress.id) : "");

      if (addressResult.status === "rejected") {
        setError("Không tải được sổ địa chỉ, vui lòng nhập địa chỉ thủ công.");
      }
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Không thể tải dữ liệu thanh toán.",
      );
      setCartItems([]);
      setAddresses([]);
      setSelectedAddressId("");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAddresses = async () => {
    try {
      const addressResult = await addressApi.getAll();
      const normalizedAddresses = mapApiList(addressResult?.data)
        .map(normalizeAddress)
        .filter((address) => address.id > 0);
      setAddresses(normalizedAddresses);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const checkoutItems = useMemo(() => {
    if (!selectedProductIdSet) {
      return cartItems;
    }

    return cartItems.filter((item) =>
      selectedProductIdSet.has(Number(item.productId)),
    );
  }, [cartItems, selectedProductIdSet]);

  const selectedAddress = useMemo(
    () =>
      addresses.find((address) => String(address.id) === selectedAddressId) ??
      null,
    [addresses, selectedAddressId],
  );

  const subtotalAmount = useMemo(
    () =>
      checkoutItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [checkoutItems],
  );

  const discountAmount = useMemo(() => {
    const discount = Number(appliedCoupon?.discountAmount ?? 0);
    if (!Number.isFinite(discount) || discount <= 0) {
      return 0;
    }

    return Math.min(discount, subtotalAmount);
  }, [appliedCoupon, subtotalAmount]);

  const finalAmount = Math.max(0, subtotalAmount - discountAmount);

  const walletDeduction = useMemo(() => {
    if (!useWallet || !wallet || wallet.status !== "Active") return 0;
    return Math.min(wallet.balance, finalAmount);
  }, [useWallet, wallet, finalAmount]);

  const payableAmount = Math.max(0, finalAmount - walletDeduction);

  const checkoutItemSignature = useMemo(
    () =>
      checkoutItems
        .map((item) => `${item.productId}:${item.quantity}`)
        .sort()
        .join("|"),
    [checkoutItems],
  );

  const handleApplyCoupon = async (couponCodeToApply) => {
    const targetCode =
      typeof couponCodeToApply === "string" ? couponCodeToApply : couponInput;

    if (checkoutItems.length === 0) {
      setError("Không có sản phẩm nào đề áp mã giảm giá.");
      return;
    }

    if (!targetCode.trim()) {
      setAppliedCoupon(null);
      setCouponInput("");
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
        items: toOrderItemsPayload(checkoutItems),
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

  // Auto-validate coupon from URL query parameters on mount once checkout items are loaded
  useEffect(() => {
    const urlCoupon = (searchParams.get("coupon") || "").trim();
    if (urlCoupon && checkoutItems.length > 0 && !loading) {
      handleApplyCoupon(urlCoupon);
    }
  }, [loading, checkoutItems.length]);

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

  const handlePlaceOrder = async () => {
    if (checkoutItems.length === 0) {
      setError(
        "Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi đặt hàng.",
      );
      return;
    }

    const useSavedAddress = !!selectedAddress;
    if (deliveryMethod === "Delivery") {
      if (
        !useSavedAddress &&
        (!receiverName.trim() || !phone.trim() || !shippingAddress.trim())
      ) {
        setError(
          "Vui lòng nhập đầy đủ người nhận, số điện thoại và địa chỉ giao hàng.",
        );
        return;
      }
    } else if (deliveryMethod === "Pickup" && !pickupTime) {
      setError("Vui lòng chọn thời gian hẹn lấy hàng.");
      return;
    }

    const normalizedPaymentMethod = isBankTransferMethod(paymentMethod)
      ? "Bank Transfer"
      : "COD";

    const payload = {
      items: toOrderItemsPayload(checkoutItems),
      receiverName: useSavedAddress
        ? selectedAddress.receiverName
        : receiverName.trim(),
      phone: useSavedAddress ? selectedAddress.phone : phone.trim(),
      shippingAddress: useSavedAddress
        ? selectedAddress.fullAddress
        : shippingAddress.trim(),
      note: note.trim() || null,
      paymentMethod: normalizedPaymentMethod,
      couponCode: appliedCoupon?.couponCode || null,
      addressId:
        useSavedAddress && deliveryMethod === "Delivery"
          ? Number(selectedAddress.id)
          : null,
      useWallet: useWallet,
      deliveryMethod: deliveryMethod,
      pickupTime:
        deliveryMethod === "Pickup" && pickupTime
          ? new Date(pickupTime).toISOString()
          : null,
    };

    setPlacingOrder(true);
    setError("");
    setSuccess("");

    let orderPayload = null;
    try {
      const createResponse = await orderApi.create(payload);
      const responsePayload = createResponse?.data ?? {};
      orderPayload = normalizeOrder(responsePayload.order ?? responsePayload);

      const cleanupResults = await Promise.allSettled(
        checkoutItems.map((item) => cartApi.remove(Number(item.productId))),
      );
      const hasCleanupError = cleanupResults.some(
        (result) => result.status === "rejected",
      );
      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("notifications-updated"));
      if (hasCleanupError) {
        console.warn(
          "Order created successfully, but failed to clean up some cart items.",
        );
      }

      if (
        orderPayload.id > 0 &&
        isBankTransferMethod(
          orderPayload.paymentMethod || normalizedPaymentMethod,
        ) &&
        orderPayload.totalAmount > 0 &&
        orderPayload.paymentStatus !== "Paid"
      ) {
        navigate(`/shop/bank-transfer/${orderPayload.id}`);
        return;
      }

      navigate("/shop/orders");
    } catch (createError) {
      setError(
        createError.response?.data?.message || "Không thể tạo đơn hàng.",
      );
      return;
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <>
      <ShopShell
        activeRoute="checkout"
        userName={user?.name || user?.username}
        onLogout={handleLogout}
        isAdmin={isAdmin()}
        onGoAdmin={() => navigate("/")}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
      >
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

        <div className="container-fluid pb-5">
          <div className="row px-xl-5">
            <div className="col-lg-8">
              <div className="bg-light p-30 mb-4">
                <h5>Phương thức nhận hàng</h5>
                <div className="d-flex mb-4">
                  <div className="custom-control custom-radio mr-4">
                    <input
                      type="radio"
                      className="custom-control-input"
                      id="deliveryMethodDelivery"
                      checked={deliveryMethod === "Delivery"}
                      onChange={() => setDeliveryMethod("Delivery")}
                    />
                    <label
                      className="custom-control-label"
                      htmlFor="deliveryMethodDelivery"
                    >
                      Giao hàng tận nơi
                    </label>
                  </div>
                  <div className="custom-control custom-radio">
                    <input
                      type="radio"
                      className="custom-control-input"
                      id="deliveryMethodPickup"
                      checked={deliveryMethod === "Pickup"}
                      onChange={() => setDeliveryMethod("Pickup")}
                    />
                    <label
                      className="custom-control-label"
                      htmlFor="deliveryMethodPickup"
                    >
                      Lấy tại quán
                    </label>
                  </div>
                </div>

                {deliveryMethod === "Pickup" && (
                  <div className="form-group mb-4 p-3 border rounded bg-white">
                    <label className="font-weight-bold">
                      Chọn thời gian hẹn lấy hàng *
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                    />
                  </div>
                )}

                {deliveryMethod === "Delivery" && (
                  <>
                    <h5>Thông tin nhận hàng</h5>
                    {loading && (
                      <p className="text-muted mb-0">
                        Đang tải dữ liệu checkout...
                      </p>
                    )}

                    {!loading && addresses.length > 0 && (
                      <div className="mb-4 d-flex justify-content-between align-items-center">
                        <h4>Địa chỉ đã lưu</h4>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setShowAddressModal(true)}
                        >
                          Chọn địa chỉ
                        </button>
                      </div>
                    )}

                    {!loading && addresses.length === 0 && (
                      <div className="text-right">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => setShowAddressModal(true)}
                        >
                          + Thêm địa chỉ
                        </button>
                      </div>
                    )}

                    {selectedAddress ? (
                      <div className="alert alert-info position-relative">
                        <div>
                          <strong>Người nhận:</strong>{" "}
                          {selectedAddress.receiverName}
                        </div>
                        <div>
                          <strong>SĐT:</strong> {selectedAddress.phone}
                        </div>
                        <div>
                          <strong>Địa chỉ:</strong>{" "}
                          {selectedAddress.fullAddress}
                        </div>
                        {addresses.length > 0 && (
                          <button
                            className="btn btn-sm btn-light mt-2"
                            onClick={() => setSelectedAddressId("")}
                          >
                            Nhập địa chỉ mới (Không lưu)
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="form-row">
                        <div className="col-md-6 form-group">
                          <label>Người nhận</label>
                          <input
                            className="form-control"
                            type="text"
                            placeholder="Nhập tên người nhận"
                            value={receiverName}
                            onChange={(event) =>
                              setReceiverName(event.target.value)
                            }
                          />
                        </div>
                        <div className="col-md-6 form-group">
                          <label>Số điện thoại</label>
                          <input
                            className="form-control"
                            type="text"
                            placeholder="Nhập số điện thoại"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                          />
                        </div>
                        <div className="col-md-12 form-group">
                          <label>Địa chỉ giao hàng</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Ví dụ: 236 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội"
                            value={shippingAddress}
                            onChange={(event) =>
                              setShippingAddress(event.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="form-group mb-0">
                  <label>Ghi chú cho đơn hàng</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Ghi chú thêm (không bắt buộc)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </div>

              {payableAmount > 0 ? (
                <div className="bg-light p-30 mb-4">
                  <h4>Phương thức thanh toán</h4>
                  <div className="custom-control custom-radio mb-2">
                    <input
                      type="radio"
                      className="custom-control-input"
                      id="payment-cod"
                      name="paymentMethod"
                      checked={!isBankTransferMethod(paymentMethod)}
                      onChange={() => setPaymentMethod("COD")}
                    />
                    <label
                      className="custom-control-label"
                      htmlFor="payment-cod"
                    >
                      {deliveryMethod === "Pickup"
                        ? "COD - Thanh toán tại quầy khi đến lấy"
                        : "COD - Thanh toán khi nhận hàng"}
                    </label>
                  </div>
                  <div className="custom-control custom-radio">
                    <input
                      type="radio"
                      className="custom-control-input"
                      id="payment-bank-transfer"
                      name="paymentMethod"
                      checked={isBankTransferMethod(paymentMethod)}
                      onChange={() => setPaymentMethod("Bank Transfer")}
                    />
                    <label
                      className="custom-control-label"
                      htmlFor="payment-bank-transfer"
                    >
                      Banking transfer - Quét QR và chờ admin xác nhận
                    </label>
                  </div>

                  {isBankTransferMethod(paymentMethod) && (
                    <div className="alert alert-warning mt-3 mb-0">
                      Sau khi đặt hàng, bạn sẽ được chuyển sang trang QR chuyển
                      khoản trong 24giờ. Admin xác nhận giao dịch thành công thì
                      đơn hàng mới chuyển sang trạng thái chờ xác nhận.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-light p-30 mb-4 text-success font-weight-bold border rounded d-flex align-items-center bg-white shadow-sm">
                  <i className="fas fa-check-circle fa-2x mr-3 text-success"></i>
                  <div>
                    <div>Thanh toán ví thành viên</div>
                    <small className="text-muted font-weight-normal">
                      Đơn hàng sẽ được tự động khấu trừ toàn bộ từ số dư ví
                      thành viên của bạn.
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="col-lg-4">
              <div className="bg-light p-30 mb-4">
                <h4>Đơn hàng của bạn</h4>
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
                  <div className="alert alert-success py-2 px-3 mb-3">
                    Đã áp mã: <strong>{appliedCoupon.couponCode}</strong>
                    {couponLoading && (
                      <span className="ml-2 text-muted">
                        (Đang kiểm tra...)
                      </span>
                    )}
                  </div>
                )}

                {wallet && (
                  <div className="custom-control custom-checkbox mb-3 p-3 border rounded bg-white shadow-sm">
                    <input
                      type="checkbox"
                      className="custom-control-input"
                      id="use-wallet-balance"
                      checked={useWallet}
                      disabled={
                        wallet.status !== "Active" || wallet.balance <= 0
                      }
                      onChange={(e) => setUseWallet(e.target.checked)}
                      style={{
                        cursor:
                          wallet.balance > 0 && wallet.status === "Active"
                            ? "pointer"
                            : "default",
                      }}
                    />
                    <label
                      className="custom-control-label font-weight-bold text-dark mb-0 d-block"
                      htmlFor="use-wallet-balance"
                      style={{
                        cursor:
                          wallet.balance > 0 && wallet.status === "Active"
                            ? "pointer"
                            : "default",
                      }}
                    >
                      Dùng số dư ví HSV:{" "}
                      <span className="text-primary">
                        {formatPrice(wallet.balance)}
                      </span>
                      {wallet.status !== "Active" && (
                        <span className="text-danger small d-block">
                          (Ví của bạn đang bị khoá)
                        </span>
                      )}
                    </label>
                  </div>
                )}

                <div className="table-responsive">
                  <table className="table table-borderless mb-0">
                    <tbody>
                      {checkoutItems.length === 0 && (
                        <tr>
                          <td className="text-muted">
                            Không có sản phẩm để thanh toán.
                          </td>
                        </tr>
                      )}

                      {checkoutItems.map((item, index) => (
                        <tr key={item.id ?? `${item.productId}-${index}`}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={resolveProductImage(
                                  item.product.imageUrl,
                                  index,
                                )}
                                alt={item.product.name}
                                style={{
                                  width: "45px",
                                  height: "45px",
                                  objectFit: "cover",
                                }}
                                className="mr-2"
                              />
                              <div>
                                <div>{item.product.name}</div>
                                <small className="text-muted">
                                  {formatPrice(item.unitPrice)} x{" "}
                                  {item.quantity}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="text-right align-middle">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <hr />
                <div className="d-flex justify-content-between">
                  <h6>Tạm tính</h6>
                  <h6>{formatPrice(subtotalAmount)}</h6>
                </div>
                <div className="d-flex justify-content-between">
                  <h6>Giảm giá</h6>
                  <h6>-{formatPrice(discountAmount)}</h6>
                </div>
                {useWallet && walletDeduction > 0 && (
                  <div className="d-flex justify-content-between">
                    <h6>Khấu trừ từ ví</h6>
                    <h6 className="text-success">
                      -{formatPrice(walletDeduction)}
                    </h6>
                  </div>
                )}
                <div className="d-flex justify-content-between mt-2 pt-2 border-top">
                  <h5>Còn lại cần trả</h5>
                  <h5 className="text-danger">{formatPrice(payableAmount)}</h5>
                </div>

                <button
                  type="button"
                  className="btn btn-block btn-primary font-weight-bold py-3 mt-3"
                  onClick={handlePlaceOrder}
                  disabled={
                    placingOrder || loading || checkoutItems.length === 0
                  }
                >
                  Đặt hàng
                </button>
                <Link
                  to="/shop/cart"
                  className="btn btn-block btn-outline-secondary mt-2"
                >
                  Quay lại giỏ hàng
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ShopShell>

      <ShopAddressModal
        show={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={(id) => setSelectedAddressId(id)}
        onAddressesChanged={reloadAddresses}
      />

      {showCouponModal && (
        <ShopCouponModal
          show={showCouponModal}
          onClose={() => setShowCouponModal(false)}
          items={checkoutItems}
          onSelectCoupon={(code) => {
            setCouponInput(code);
            handleApplyCoupon(code);
          }}
        />
      )}
    </>
  );
};

export default ShopCheckout;
