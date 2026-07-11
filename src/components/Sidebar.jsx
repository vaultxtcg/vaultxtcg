import { navItems, mobilePrimaryNavKeys } from "../utils/helpers";

function NavButton({ item, tab, onNavigate, cancelEdit, setForm, emptyForm }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (item.key === "stockIn" || item.key === "quickAddCard") cancelEdit();
        if (item.key === "quickAddCard") setForm({ ...emptyForm, category: "Raw" });
        if (item.key === "stockIn") setForm({ ...emptyForm, category: "Sealed" });
        onNavigate(item.key);
      }}
      style={{
        width: "100%", textAlign: "left", marginBottom: 6, padding: "10px 11px", borderRadius: 8,
        border: tab === item.key ? "1px solid #2563eb" : "1px solid transparent",
        background: tab === item.key ? "#172554" : "transparent", color: "#e5e7eb", cursor: "pointer", fontWeight: 700,
      }}
    >
      <span style={{ marginRight: 8 }}>{item.icon}</span>{item.label}
    </button>
  );
}

export default function Sidebar({
  tab,
  setTab,
  setSelectedCard,
  user,
  userRole,
  isMobile,
  showMoreMenu,
  setShowMoreMenu,
  cartCount,
  cancelEdit,
  setForm,
  emptyForm,
  logout,
  styles,
}) {
  const mobilePrimaryNavItems = navItems.filter((item) => mobilePrimaryNavKeys.includes(item.key));
  const mobileMoreNavItems = navItems.filter((item) => !mobilePrimaryNavKeys.includes(item.key));
  const isMoreTabActive = isMobile && !mobilePrimaryNavKeys.includes(tab) && tab !== "detail";

  const handleNav = (item) => {
    if (item.key === "stockIn" || item.key === "quickAddCard") cancelEdit();
    if (item.key === "quickAddCard") setForm({ ...emptyForm, category: "Raw" });
    if (item.key === "stockIn") setForm({ ...emptyForm, category: "Sealed" });
    setSelectedCard(null);
    setTab(item.key);
    if (isMobile && !mobilePrimaryNavKeys.includes(item.key)) setShowMoreMenu(false);
  };

  return (
    <aside style={styles.sidebar}>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Vault X TCG</div>
      <div style={{ ...styles.card, padding: 10, marginBottom: 14, background: "#0b1220" }}>
        <div style={{ ...styles.muted, textTransform: "uppercase", letterSpacing: 0, fontSize: 11, fontWeight: 800 }}>{userRole || "user"}</div>
        <div style={{ fontSize: 13, marginTop: 3, wordBreak: "break-word" }}>{user?.email}</div>
      </div>
      {isMobile ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {mobilePrimaryNavItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNav(item)}
                style={{
                  width: "100%", textAlign: "left", marginBottom: 0, padding: "10px 11px", borderRadius: 8,
                  border: tab === item.key ? "1px solid #2563eb" : "1px solid transparent",
                  background: tab === item.key ? "#172554" : "transparent", color: "#e5e7eb", cursor: "pointer", fontWeight: 700,
                }}
              >
                <span style={{ marginRight: 8 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMoreMenu((prev) => !prev)}
            style={{
              width: "100%",
              textAlign: "left",
              marginBottom: 8,
              padding: "10px 11px",
              borderRadius: 8,
              border: isMoreTabActive || showMoreMenu ? "1px solid #3b82f6" : "1px solid #334155",
              background: isMoreTabActive || showMoreMenu ? "#172554" : "#182235",
              color: "#e5e7eb",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ☰ More {showMoreMenu ? "▲" : "▼"}
          </button>

          {showMoreMenu && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              {mobileMoreNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNav(item)}
                  style={{
                    width: "100%", textAlign: "left", marginBottom: 0, padding: "10px 11px", borderRadius: 8,
                    border: tab === item.key ? "1px solid #2563eb" : "1px solid transparent",
                    background: tab === item.key ? "#172554" : "transparent", color: "#e5e7eb", cursor: "pointer", fontWeight: 700,
                  }}
                >
                  <span style={{ marginRight: 8 }}>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        navItems.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            tab={tab}
            onNavigate={(key) => { setSelectedCard(null); setTab(key); }}
            cancelEdit={cancelEdit}
            setForm={setForm}
            emptyForm={emptyForm}
          />
        ))
      )}
      {cartCount > 0 && <button type="button" onClick={() => setTab("cart")} style={{ ...styles.primary, width: "100%", marginTop: 8 }}>🛒 Checkout ({cartCount})</button>}
      <button type="button" onClick={logout} style={{ ...styles.button, width: "100%", marginTop: 14 }}>Logout</button>
    </aside>
  );
}
