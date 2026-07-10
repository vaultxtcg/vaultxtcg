import { memo } from "react";
import { fmtDate, money, ITEM_CATEGORIES, GAME_OR_LANGUAGE_OPTIONS, PAGE_SIZE } from "../utils/helpers";

export function Toast({ toast }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100, padding: "12px 14px", borderRadius: 12, background: toast.type === "error" ? "#7f1d1d" : "#064e3b", color: "white", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", maxWidth: 360 }}>
      {toast.message}
    </div>
  );
}

export function Modal({ modal, setModal, closeModal, styles }) {
  const updateValue = (name, value) => {
    setModal((prev) => ({ ...prev, values: { ...prev.values, [name]: value } }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", zIndex: 80, display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>{modal.title}</h2>
        {modal.message && <div style={{ color: "#94a3b8", marginBottom: 14 }}>{modal.message}</div>}
        {modal.fields.map((field) => (
          <label key={field.name} style={{ display: "block", marginBottom: 10 }}>
            <div style={{ marginBottom: 5, fontWeight: 700 }}>{field.label}</div>
            <input
              type={field.type || "text"}
              placeholder={field.placeholder || ""}
              value={modal.values[field.name] ?? ""}
              onChange={(e) => updateValue(field.name, e.target.value)}
              style={styles.input}
            />
          </label>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button type="button" style={styles.button} onClick={() => closeModal(null)}>Cancel</button>
          <button type="button" style={modal.danger ? styles.danger : styles.primary} onClick={() => closeModal(modal.values)}>{modal.confirmText || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

export function Skeleton({ styles }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={styles.card}>Loading inventory...</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: status === "Sold" ? "#7f1d1d" : status === "Hold" ? "#713f12" : "#064e3b" }}>
      {status || "Available"}
    </span>
  );
}

export function FormSection({ title, children, styles }) {
  return <div style={{ ...styles.card, marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>;
}

export function DetailRow({ label, value, styles }) {
  return <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b" }}><div style={styles.muted}>{label}</div><div>{value || "N/A"}</div></div>;
}

export function Barcode({ value }) {
  const bars = String(value || "VX").split("").map((ch) => (ch.charCodeAt(0) % 4) + 2);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "end", gap: 2, height: 42, background: "white", padding: 6, borderRadius: 6, width: "fit-content" }}>
        {bars.map((w, i) => <div key={i} style={{ width: w, height: 30 + (i % 3) * 4, background: "black" }} />)}
      </div>
      <div style={{ fontFamily: "monospace", marginTop: 4 }}>{value}</div>
    </div>
  );
}

export const SearchInput = memo(function SearchInput({ value, onChange, placeholder, styles }) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ ...styles.input, marginBottom: 0 }}
    />
  );
});

export function PaginationControls({ filteredLength, page, setPage, styles }) {
  const totalPages = Math.max(1, Math.ceil(filteredLength / PAGE_SIZE));
  if (filteredLength <= PAGE_SIZE) return null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
      <div style={styles.muted}>
        Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredLength)} of {filteredLength}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{ ...styles.button, opacity: page === 1 ? 0.45 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
        >
          Previous
        </button>
        <span style={styles.muted}>Page {page} / {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          style={{ ...styles.button, opacity: page >= totalPages ? 0.45 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function LogTable({ rows, headers, styles }) {
  const headerLabels = {
    created_at: "Date",
    user_email: "Account",
    action: "Action",
    transaction_type: "Transaction",
    inventory_id: "Inventory ID",
    card_number: "Card #",
    quantity: "Qty",
    cost: "Cost",
    price: "Price",
    notes: "Notes",
  };

  const formatCell = (row, header) => {
    if (header === "created_at") return fmtDate(row[header]);
    if (header === "cost" || header === "price") return money(row[header]);
    if (header === "user_email") return row[header] || "Unknown account";
    return String(row[header] ?? "");
  };

  const getActionRowStyle = (row) => {
    const action = String(row.action || row.transaction_type || "").toUpperCase();
    if (["ADD", "IMPORT", "TRADE_IN"].includes(action)) return { background: "rgba(22, 101, 52, 0.18)" };
    if (["SOLD", "SELL", "TRADE_OUT"].includes(action)) return { background: "rgba(127, 29, 29, 0.22)" };
    if (["EDIT", "EDIT_SALE", "ADJUSTMENT", "BULK_EDIT", "COUNT_ADJUSTMENT"].includes(action)) return { background: "rgba(113, 63, 18, 0.22)" };
    if (["HOLD", "RELEASE_HOLD", "TRADE"].includes(action)) return { background: "rgba(30, 64, 175, 0.20)" };
    if (["DELETE", "UNDO_SALE"].includes(action)) return { background: "rgba(88, 28, 135, 0.20)" };
    return {};
  };
  return (
    <div style={{ ...styles.card, overflowX: "auto", padding: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead><tr style={{ background: "#020617", color: "#94a3b8", textAlign: "left" }}>{headers.map((h) => <th key={h} style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>{headerLabels[h] || h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 18, color: "#94a3b8" }}>No records found.</td></tr>}
          {rows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #1e293b", ...getActionRowStyle(row) }}>{headers.map((h) => <td key={h} style={{ padding: 12, verticalAlign: "top" }}>{formatCell(row, h)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardCards({ stats, isMobile, styles }) {
  const items = [
    { label: "Inventory Qty", value: stats.inventoryQty },
    { label: "Inventory Cost", value: money(stats.totalCost) },
    { label: "Inventory Value", value: money(stats.totalValue) },
    { label: "Today Sales", value: money(stats.todaySales) },
    { label: "Sold Revenue", value: money(stats.soldRevenue) },
    { label: "Realized Profit", value: money(stats.soldRevenue - stats.soldCost) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 12, marginBottom: 16 }}>
      {items.map((item) => (
        <div key={item.label} style={styles.card}>
          <div style={styles.muted}>{item.label}</div>
          <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, marginTop: 6 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function SearchResultCard({ title, rows, render, styles }) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {rows.length ? rows.map(render) : <div style={styles.muted}>No matches.</div>}
    </div>
  );
}

export function MiniActivityList({ title, rows, render, styles }) {
  return (
    <div>
      <h4 style={{ marginTop: 0 }}>{title}</h4>
      {rows.length ? rows.map((row, index) => <div key={`${title}-${row.id || index}`} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>{render(row)}</div>) : <div style={styles.muted}>No records.</div>}
    </div>
  );
}

export function CategorySelect({ value, onChange, styles }) {
  return (
    <select value={value} onChange={onChange} style={styles.input}>
      {ITEM_CATEGORIES.map((category) => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>
  );
}

export function GameLanguageSelect({ value, onChange, styles }) {
  return (
    <select value={value} onChange={onChange} style={styles.input}>
      {GAME_OR_LANGUAGE_OPTIONS.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

export function ReceiptModal({ receipt, close, styles }) {
  const printReceipt = () => window.print();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", zIndex: 90, display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Vault X TCG Receipt</h2>
        <div style={{ color: "#94a3b8", marginBottom: 12 }}>{receipt.sale_number} · {new Date(receipt.created_at).toLocaleString()}</div>
        <div style={{ marginBottom: 12 }}>Customer: {receipt.customer_name || "Walk-in Customer"}</div>
        {(receipt.items || []).map((item, index) => (
          <div key={index} style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", borderBottom: "1px solid #1e293b", padding: "8px 0", gap: 10, alignItems: "center" }}>
            <div>
              {item.image ? (
                <img src={item.image} alt={item.name} style={{ width: 42, height: 58, objectFit: "cover", borderRadius: 6 }} />
              ) : (
                <div style={{ width: 42, height: 58, borderRadius: 6, background: "#020617" }} />
              )}
            </div>
            <div>{item.name}<div style={{ color: "#94a3b8", fontSize: 12 }}>{item.inventoryId} · Qty {item.quantity} · Unit {money(item.unitPrice)}</div></div>
            <div>{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><b>{money(receipt.subtotal)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><b>-{money(receipt.discount || 0)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax {receipt.tax_enabled === false ? "(Off)" : receipt.tax_rate ? `(${receipt.tax_rate}%)` : ""}</span><b>{money(receipt.tax)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Store Credit Used</span><b>{money(receipt.store_credit_used)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, marginTop: 8 }}><span>Total</span><b>{money(receipt.total)}</b></div>
          <div style={{ color: "#94a3b8", marginTop: 8 }}>Payment: {receipt.payment_method}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button type="button" style={styles.button} onClick={printReceipt}>Print</button>
          <button type="button" style={styles.primary} onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}
