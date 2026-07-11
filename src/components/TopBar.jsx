import { getPageTitle } from "../utils/helpers";

export default function TopBar({
  tab,
  editingId,
  cartCount,
  refreshAll,
  setTab,
  cancelEdit,
  setForm,
  emptyForm,
  styles,
}) {
  return (
    <div style={styles.topbar}>
      <div>
        <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}>{getPageTitle(tab, editingId)}</h1>
        <div style={styles.muted}>Inventory, sales, trade, and audit operations</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={styles.button} onClick={() => refreshAll()}>Refresh Data</button>
        <button type="button" style={styles.button} onClick={() => setTab("cart")}>Cart ({cartCount})</button>
        <button type="button" style={styles.button} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Raw" }); setTab("quickAddCard"); }}>Quick Add Card</button>
        <button type="button" style={styles.primary} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Sealed" }); setTab("stockIn"); }}>Stock In</button>
      </div>
    </div>
  );
}
