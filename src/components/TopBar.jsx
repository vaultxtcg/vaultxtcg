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
        <h1 style={{ margin: 0 }}>{getPageTitle(tab, editingId)}</h1>
        <div style={styles.muted}>Reliable inventory, sales, trade, and audit tracking.</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={styles.button} onClick={() => refreshAll()}>Refresh</button>
        <button type="button" style={styles.button} onClick={() => setTab("cart")}>Cart ({cartCount})</button>
        <button type="button" style={styles.button} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Raw Card" }); setTab("quickAddCard"); }}>Quick Add Card</button>
        <button type="button" style={styles.primary} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Sealed Product" }); setTab("stockIn"); }}>Stock In</button>
      </div>
    </div>
  );
}
