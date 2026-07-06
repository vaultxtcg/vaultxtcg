import { money, fmtDate } from "../utils/helpers";

export default function SalesView({ sales, lastReceipt, setLastReceipt, cartTaxRate, styles, isMobile }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {lastReceipt && <button type="button" style={styles.button} onClick={() => setLastReceipt(lastReceipt)}>View Last Receipt</button>}
      {sales.length === 0 && <div style={styles.card}>No sales yet.</div>}
      {sales.map((sale) => (
        <div key={sale.id} style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{sale.sale_number || `S-${String(sale.id).padStart(6, "0")}`}</h3>
              <div style={styles.muted}>{fmtDate(sale.created_at)} · {sale.customer_name || "Walk-in Customer"}</div>
            </div>
            <div style={{ textAlign: isMobile ? "left" : "right" }}>
              <b>{money(sale.total)}</b>
              <div style={styles.muted}>{sale.payment_method || "N/A"}</div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            {(sale.sale_items || []).map((item) => (
              <div key={item.id} style={styles.muted}>{item.card_name} · Qty {item.quantity} · {money(item.total_price)} · {item.inventory_id}</div>
            ))}
          </div>
          <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => setLastReceipt({
            sale_number: sale.sale_number || `S-${String(sale.id).padStart(6, "0")}`,
            created_at: sale.created_at,
            customer_name: sale.customer_name,
            subtotal: sale.subtotal,
            discount: 0,
            tax_enabled: Number(sale.tax || 0) > 0,
            tax_rate: cartTaxRate,
            tax: sale.tax,
            store_credit_used: sale.store_credit_used,
            total: sale.total,
            payment_method: sale.payment_method,
            items: (sale.sale_items || []).map((i) => ({ name: i.card_name, inventoryId: i.inventory_id, quantity: i.quantity, unitPrice: i.unit_price }))
          })}>Receipt</button>
        </div>
      ))}
    </div>
  );
}
