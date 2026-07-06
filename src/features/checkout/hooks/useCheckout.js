import { DEFAULT_WALK_IN_CUSTOMER } from "../../../config/constants";
import { DEFAULT_PAYMENT_METHOD } from "../../../config/paymentMethods";
import { money } from "../../../utils/helpers";
import { validateCheckout, executeCheckout } from "../services/checkoutService";

export function useCheckout({
  cart,
  setCart,
  cartSubtotal,
  cartDiscountAmount,
  cartTax,
  cartTotal,
  cartTaxEnabled,
  cartTaxRate,
  cartDiscountType,
  cartDiscountValue,
  cards,
  customers,
  companyId,
  user,
  askModal,
  showToast,
  setSaving,
  setLastReceipt,
  setTab,
  refreshAll,
}) {
  const completeCheckout = async () => {
    const validation = validateCheckout({ cart, cards });
    if (!validation.success) return showToast(validation.error, "error");
    const result = await askModal({
      title: "Checkout",
      message: `Subtotal ${money(cartSubtotal)} · Discount ${money(cartDiscountAmount)} · Tax ${money(cartTax)} · Total ${money(cartTotal)}`,
      confirmText: "Complete Sale",
      fields: [
        { name: "customerName", label: "Customer Name", placeholder: DEFAULT_WALK_IN_CUSTOMER },
        { name: "customerTel", label: "Customer Tel" },
        { name: "paymentMethod", label: "Payment Method", defaultValue: DEFAULT_PAYMENT_METHOD },
        { name: "storeCreditUsed", label: "Store Credit Used", type: "number", defaultValue: 0 },
        { name: "notes", label: "Sale Notes" },
      ],
    });
    if (!result) return;
    setSaving(true);
    const checkoutResult = await executeCheckout({
      companyId,
      userEmail: user?.email,
      customers,
      cards,
      cart,
      cartSubtotal,
      cartDiscountAmount,
      cartTax,
      cartTotal,
      cartTaxEnabled,
      cartTaxRate,
      cartDiscountType,
      cartDiscountValue,
      modalResult: result,
    });
    if (!checkoutResult.success) {
      setSaving(false);
      showToast(checkoutResult.error, "error");
      return;
    }
    setLastReceipt(checkoutResult.receipt);
    setCart([]);
    await refreshAll();
    setSaving(false);
    setTab("sales");
    showToast(`${checkoutResult.saleNumber} completed`);
  };

  return {
    completeCheckout,
  };
}
