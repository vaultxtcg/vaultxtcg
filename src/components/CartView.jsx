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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) 380px", gap: 16, alignItems: "start" }}>
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h3 style={{ marginTop: 0 }}>Cart Items</h3>
            <div style={styles.muted}>{cartCount} item(s)</div>
          </div>
          {cart.length === 0 && <div style={styles.muted}>Cart is empty. Go to Inventory and click Add to Cart.</div>}
          {cart.map((item) => (
            <div
              key={item.cardId}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "76px 1fr" : "76px 1fr 110px 130px 90px",
                gap: 10,
                alignItems: "center",
                borderTop: "1px solid #243044",
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
                    style={{ width: 64, height: 88, objectFit: "cover", borderRadius: 8, border: "1px solid #243044" }}
                  />
                ) : (
                  <div style={{ width: 64, height: 88, borderRadius: 8, background: "#0b1220", border: "1px solid #243044", display: "grid", placeItems: "center", color: "#64748b", fontSize: 12 }}>No Image</div>
                )}
              </div>
              <div>
                <b>{item.name}</b>
                <div style={styles.muted}>{item.inventoryId} · {item.cardNumber || "N/A"} · Available {item.availableQty}</div>
                <div style={{ marginTop: 6, fontWeight: 800 }}>{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</div>
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

        <div style={{ ...styles.card, position: isMobile ? "static" : "sticky", top: 16 }}>
          <h3 style={{ marginTop: 0 }}>Checkout Summary</h3>
          <DetailRow label="Items" value={cartCount} styles={styles} />
          <DetailRow label="Subtotal" value={money(cartSubtotal)} styles={styles} />

          <div style={{ borderBottom: "1px solid #243044", padding: "10px 0" }}>
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

          <div style={{ borderBottom: "1px solid #243044", padding: "10px 0" }}>
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
          <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: "#0b1220", border: "1px solid #243044" }}>
            <div style={styles.muted}>Total Due</div>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.15 }}>{money(cartTotal)}</div>
          </div>
          <button type="button" disabled={!cart.length || saving} style={{ ...styles.primary, width: "100%", marginTop: 12, fontSize: 16, padding: "11px 12px" }} onClick={completeCheckout}>Complete Sale</button>
          <button type="button" disabled={!cart.length} style={{ ...styles.button, width: "100%", marginTop: 10 }} onClick={clearCart}>Clear Cart</button>
        </div>
      </div>
    </div>
  );
}
