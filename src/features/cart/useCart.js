import { useState } from "react";
import {
  DEFAULT_CART_TAX_ENABLED,
  DEFAULT_CART_TAX_RATE,
  DEFAULT_CART_DISCOUNT_TYPE,
  DEFAULT_CART_DISCOUNT_VALUE,
} from "../../config/tax";
import * as cartCalculations from "../../services/cartCalculations";

export function useCart({ askModal, showToast }) {
  const [cart, setCart] = useState([]);
  const [cartTaxEnabled, setCartTaxEnabled] = useState(DEFAULT_CART_TAX_ENABLED);
  const [cartTaxRate, setCartTaxRate] = useState(DEFAULT_CART_TAX_RATE);
  const [cartDiscountType, setCartDiscountType] = useState(DEFAULT_CART_DISCOUNT_TYPE);
  const [cartDiscountValue, setCartDiscountValue] = useState(DEFAULT_CART_DISCOUNT_VALUE);

  const cartSubtotal = cartCalculations.cartSubtotal(cart);
  const cartCount = cartCalculations.cartCount(cart);
  const cartDiscountAmount = cartCalculations.cartDiscountAmount(cartSubtotal, cartDiscountType, cartDiscountValue);
  const cartTaxableSubtotal = cartCalculations.cartTaxableSubtotal(cartSubtotal, cartDiscountAmount);
  const cartTax = cartCalculations.cartTax(cartTaxableSubtotal, cartTaxEnabled, cartTaxRate);
  const cartTotal = cartCalculations.cartTotal(cartTaxableSubtotal, cartTax);

  const addToCart = async (card) => {
    const availableQty = Number(card.quantity || 0);
    if (availableQty < 1) return showToast("No inventory available", "error");
    const result = await askModal({
      title: "Add to cart",
      message: `${card.inventory_id} · ${card.name} · Available: ${availableQty}`,
      confirmText: "Add to Cart",
      fields: [
        { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
        { name: "unitPrice", label: "Unit Price", type: "number", defaultValue: Number(card.price || 0) > 0 ? Number(card.price || 0) : Number(card.cost || 0) * 1.3 },
      ],
    });
    if (!result) return;
    const quantity = Number(result.quantity || 0);
    const unitPrice = Number(result.unitPrice || 0);
    if (quantity < 1) return showToast("Quantity must be at least 1", "error");
    if (quantity > availableQty) return showToast("Not enough inventory", "error");
    if (unitPrice < 0) return showToast("Unit price cannot be negative", "error");
    setCart((prev) => {
      const existing = prev.find((item) => item.cardId === card.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > availableQty) { showToast("Not enough inventory", "error"); return prev; }
        return prev.map((item) => item.cardId === card.id ? { ...item, quantity: newQty, unitPrice } : item);
      }
      return [...prev, { cardId: card.id, inventoryId: card.inventory_id, name: card.name, cardNumber: card.card_number, image: card.front_image || "", quantity, unitPrice, cost: Number(card.cost || 0), availableQty }];
    });
    showToast("Added to cart");
  };

  const updateCartQty = (cardId, quantity) => {
    setCart((prev) => prev.map((item) => item.cardId === cardId ? { ...item, quantity: Math.max(1, Number(quantity || 1)) } : item));
  };

  const updateCartUnitPrice = (cardId, unitPrice) => {
    setCart((prev) => prev.map((item) => item.cardId === cardId ? { ...item, unitPrice: Math.max(0, Number(unitPrice || 0)) } : item));
  };

  const removeFromCart = (cardId) => setCart((prev) => prev.filter((item) => item.cardId !== cardId));
  const clearCart = () => setCart([]);

  return {
    cart,
    setCart,
    cartTaxEnabled,
    setCartTaxEnabled,
    cartTaxRate,
    setCartTaxRate,
    cartDiscountType,
    setCartDiscountType,
    cartDiscountValue,
    setCartDiscountValue,
    cartSubtotal,
    cartCount,
    cartDiscountAmount,
    cartTaxableSubtotal,
    cartTax,
    cartTotal,
    addToCart,
    updateCartQty,
    updateCartUnitPrice,
    removeFromCart,
    clearCart,
  };
}
