import { DetailRow } from "./Common";
import { money } from "../utils/helpers";

export default function CartView({
  cart,
  cartCount,
  cartSubtotal,
  cartDiscountType,
  setCartDiscountType,
  cartDiscountValue,
  setCartDiscountValue,
  cartDiscountAmount,
  cartTaxEnabled,
  setCartTaxEnabled,
  cartTaxRate,
  setCartTaxRate,
  cartTaxableSubtotal,
  cartTax,
  cartTotal,
  isMobile,
  styles,
  updateCartQty,
  updateCartUnitPrice,
  removeFromCart,
  completeCheckout,
  clearCart,
  saving,
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Cart Items</h3>
          {cart.length === 0 && <div style={styles.muted}>Cart is empty. Go to Inventory and click Add to Cart.</div>}
          {cart.map((item) => (
            <div
              key={item.cardId}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "76px 1fr" : "76px 1fr 110px 130px 90px",
                gap: 10,
                alignItems: "center",
                borderTop: "1px solid #1e293b",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <div>
                {item.image ? (
                  <img
                    loading="lazy"
                    src={item.image}
                    alt={item.name}
                    style={{ width: 64, height: 88, objectFit: "cover", borderRadius: 10, border: "1px solid #1e293b" }}
                  />
                ) : (
                  <div style={{ width: 64, height: 88, borderRadius: 10, background: "#020617", border: "1px solid #1e293b", display: "grid", placeItems: "center", color: "#64748b", fontSize: 12 }}>No Image</div>
                )}
              </div>
              <div>
                <b>{item.name}</b>
                <div style={styles.muted}>{item.inventoryId} · {item.cardNumber || "N/A"} · Available {item.availableQty}</div>
                {isMobile && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <label>
                      <div style={styles.muted}>Qty</div>
                      <input type="number" min="1" max={item.availableQty} value={item.quantity} onChange={(e) => updateCartQty(item.cardId, e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
                    </label>
                    <label>
                      <div style={styles.muted}>Unit Price</div>
                      <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateCartUnitPrice(item.cardId, e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
                    </label>
                  </div>
                )}
                {isMobile && <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={() => removeFromCart(item.cardId)}>Remove</button>}
              </div>
              {!isMobile && <input type="number" min="1" max={item.availableQty} value={item.quantity} onChange={(e) => updateCartQty(item.cardId, e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />}
              {!isMobile && <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateCartUnitPrice(item.cardId, e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />}
              {!isMobile && <button type="button" style={styles.button} onClick={() => removeFromCart(item.cardId)}>Remove</button>}
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Checkout</h3>
          <DetailRow label="Items" value={cartCount} styles={styles} />
          <DetailRow label="Subtotal" value={money(cartSubtotal)} styles={styles} />

          <div style={{ borderBottom: "1px solid #1e293b", padding: "8px 0" }}>
            <div style={{ ...styles.muted, marginBottom: 6 }}>Discount</div>
            <div style={{ display: "grid", gridTemplateColumns: "86px 1fr", gap: 8 }}>
              <select value={cartDiscountType} onChange={(e) => setCartDiscountType(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
                <option value="$">$ Off</option>
                <option value="%">% Off</option>
              </select>
              <input type="number" min="0" value={cartDiscountValue} onChange={(e) => setCartDiscountValue(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
            </div>
            <div style={{ ...styles.muted, marginTop: 6 }}>Discount Amount: {money(cartDiscountAmount)}</div>
          </div>

          <div style={{ borderBottom: "1px solid #1e293b", padding: "8px 0" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input type="checkbox" checked={cartTaxEnabled} onChange={(e) => setCartTaxEnabled(e.target.checked)} />
              <b>Charge Tax</b>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
              <input type="number" min="0" step="0.01" value={cartTaxRate} onChange={(e) => setCartTaxRate(e.target.value)} disabled={!cartTaxEnabled} style={{ ...styles.input, marginBottom: 0, opacity: cartTaxEnabled ? 1 : 0.5 }} />
              <span style={styles.muted}>%</span>
            </div>
          </div>

          <DetailRow label="Taxable Subtotal" value={money(cartTaxableSubtotal)} styles={styles} />
          <DetailRow label="Tax" value={money(cartTax)} styles={styles} />
          <DetailRow label="Total" value={money(cartTotal)} styles={styles} />
          <button type="button" disabled={!cart.length || saving} style={{ ...styles.primary, width: "100%", marginTop: 12 }} onClick={completeCheckout}>Complete Sale</button>
          <button type="button" disabled={!cart.length} style={{ ...styles.button, width: "100%", marginTop: 10 }} onClick={clearCart}>Clear Cart</button>
        </div>
      </div>
    </div>
  );
}
