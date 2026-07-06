export function cartSubtotal(cart) {
  return cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
}

export function cartCount(cart) {
  return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function cartDiscountAmount(subtotal, cartDiscountType, cartDiscountValue) {
  const rawDiscountAmount = cartDiscountType === "%"
    ? subtotal * (Number(cartDiscountValue || 0) / 100)
    : Number(cartDiscountValue || 0);
  return Math.min(Math.max(rawDiscountAmount, 0), subtotal);
}

export function cartTaxableSubtotal(subtotal, discountAmount) {
  return Math.max(0, subtotal - discountAmount);
}

export function cartTax(taxableSubtotal, cartTaxEnabled, cartTaxRate) {
  return cartTaxEnabled ? taxableSubtotal * (Number(cartTaxRate || 0) / 100) : 0;
}

export function cartTotal(taxableSubtotal, tax) {
  return taxableSubtotal + tax;
}
