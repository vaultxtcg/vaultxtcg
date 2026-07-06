export { BUCKET_NAME, PAGE_SIZE } from "../config/constants";
export { ITEM_CATEGORIES, DEFAULT_CATEGORY, DEFAULT_STOCK_IN_CATEGORY } from "../config/categories";
export { GAME_OR_LANGUAGE_OPTIONS, DEFAULT_LANGUAGE } from "../config/languages";
export { navItems, mobilePrimaryNavKeys } from "../config/tabs";

import { DEFAULT_CATEGORY } from "../config/categories";
import { DEFAULT_LANGUAGE } from "../config/languages";
import { CARD_STATUS_AVAILABLE } from "../config/constants";
import { TAB_TITLES, DEFAULT_PAGE_TITLE } from "../config/tabs";

export const emptyForm = {
  name: "",
  category: DEFAULT_CATEGORY,
  slab_company: "",
  slab_grade: "",
  quantity: 1,
  card_number: "",
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
  app: { minHeight: "100vh", background: "#0f172a", color: "#e5e7eb", fontFamily: "Inter, Arial, sans-serif" },
  shell: { display: isMobile ? "block" : "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" },
  sidebar: { background: "#020617", borderRight: "1px solid #1e293b", padding: 18, position: isMobile ? "static" : "sticky", top: 0, height: isMobile ? "auto" : "100vh" },
  main: { padding: isMobile ? 14 : 24, maxWidth: 1440, width: "100%", boxSizing: "border-box" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" },
  card: { border: "1px solid #1e293b", background: "#111827", borderRadius: 16, padding: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.18)" },
  input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", marginBottom: 10, borderRadius: 10, border: "1px solid #334155", background: "#020617", color: "#e5e7eb" },
  button: { border: "1px solid #334155", background: "#1e293b", color: "#e5e7eb", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 600 },
  primary: { border: "1px solid #2563eb", background: "#2563eb", color: "white", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  danger: { border: "1px solid #dc2626", background: "#7f1d1d", color: "white", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  muted: { color: "#94a3b8", fontSize: 13 },
});

export const getPageTitle = (tab, editingId) => {
  if (tab === "stockIn") return editingId ? "Edit Item" : TAB_TITLES.stockIn;
  return TAB_TITLES[tab] || DEFAULT_PAGE_TITLE;
};
