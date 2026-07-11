export { BUCKET_NAME, PAGE_SIZE } from "../config/constants";
export { ITEM_CATEGORIES, DEFAULT_CATEGORY, DEFAULT_STOCK_IN_CATEGORY } from "../config/categories";
export { GAME_OPTIONS, LANGUAGE_OPTIONS, DEFAULT_GAME, DEFAULT_LANGUAGE } from "../config/languages";
export { navItems, mobilePrimaryNavKeys } from "../config/tabs";

import { DEFAULT_CATEGORY } from "../config/categories";
import { DEFAULT_GAME, DEFAULT_LANGUAGE } from "../config/languages";
import { CARD_STATUS_AVAILABLE } from "../config/constants";
import { TAB_TITLES, DEFAULT_PAGE_TITLE } from "../config/tabs";

export const emptyForm = {
  name: "",
  category: DEFAULT_CATEGORY,
  slab_company: "",
  slab_grade: "",
  quantity: 1,
  card_number: "",
  game: DEFAULT_GAME,
  language: DEFAULT_LANGUAGE,
  cost: "",
  price: "",
  purchase_date: "",
  payment_method: "",
  seller_name: "",
  seller_tel: "",
  storage_location: "",
  status: CARD_STATUS_AVAILABLE,
  notes: "",
};

export const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const fmtDate = (value) => (value ? new Date(value).toLocaleString() : "");

export const toNumber = (value, fallback = 0) => Number(value || fallback);

export function diffObjects(beforeObj = {}, afterObj = {}, keys = []) {
  const changes = [];
  keys.forEach((key) => {
    const beforeValue = beforeObj?.[key] ?? "";
    const afterValue = afterObj?.[key] ?? "";
    if (String(beforeValue) !== String(afterValue)) {
      changes.push(`${key}: ${beforeValue || "blank"} → ${afterValue || "blank"}`);
    }
  });
  return changes.length ? changes.join("; ") : "No field change detected";
}

export const getStyles = (isMobile) => ({
  app: { minHeight: "100vh", background: "#0b1120", color: "#e5e7eb", fontFamily: "Inter, Arial, sans-serif" },
  shell: { display: isMobile ? "block" : "grid", gridTemplateColumns: "272px 1fr", minHeight: "100vh" },
  sidebar: { background: "#080d19", borderRight: "1px solid #1f2937", padding: 16, position: isMobile ? "static" : "sticky", top: 0, height: isMobile ? "auto" : "100vh" },
  main: { padding: isMobile ? 14 : 22, maxWidth: 1480, width: "100%", boxSizing: "border-box" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", borderBottom: "1px solid #1f2937", paddingBottom: 14 },
  card: { border: "1px solid #243044", background: "#111827", borderRadius: 8, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.24)" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 11px", marginBottom: 10, borderRadius: 8, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb", outline: "none" },
  button: { border: "1px solid #334155", background: "#182235", color: "#e5e7eb", padding: "8px 11px", borderRadius: 8, cursor: "pointer", fontWeight: 650 },
  primary: { border: "1px solid #2563eb", background: "#2563eb", color: "white", padding: "8px 11px", borderRadius: 8, cursor: "pointer", fontWeight: 750 },
  danger: { border: "1px solid #b91c1c", background: "#7f1d1d", color: "white", padding: "8px 11px", borderRadius: 8, cursor: "pointer", fontWeight: 750 },
  muted: { color: "#9ca3af", fontSize: 13 },
});

export const getPageTitle = (tab, editingId) => {
  if (tab === "stockIn") return editingId ? "Edit Item" : TAB_TITLES.stockIn;
  return TAB_TITLES[tab] || DEFAULT_PAGE_TITLE;
};
