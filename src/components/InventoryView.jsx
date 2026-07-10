import { DashboardCards, SearchInput, StatusBadge, PaginationControls } from "./Common";
import { money } from "../utils/helpers";

function priceChartingUrl(card) {
  const query = [card.name, card.card_number].filter(Boolean).join(" ");
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
}

function ActionButtons({ card, styles, onView, onAddToCart, onQuickSell }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={styles.button} onClick={() => onView(card)}>View</button>
      {card.status !== "Sold" && <button type="button" style={styles.primary} onClick={() => onAddToCart(card)}>Add to Cart</button>}
      {card.status !== "Sold" && <button type="button" style={styles.button} onClick={() => onQuickSell(card)}>Quick Sell</button>}
      <button type="button" style={styles.button} onClick={() => window.open(priceChartingUrl(card), "_blank", "noopener,noreferrer")}>PriceCharting</button>
    </div>
  );
}

function DesktopInventoryTable({ pagedCards, filteredLength, canAdjust, bulkSelected, setBulkSelected, styles, StatusBadgeComp, ActionButtonsComp }) {
  return (
    <>
      <div style={{ ...styles.card, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#020617", color: "#94a3b8", textAlign: "left" }}>
              {(canAdjust ? ["Select", "Image", "Inventory ID", "Name", "Card #", "Qty", "Cost", "Price", "Location", "Status", "Actions"] : ["Image", "Inventory ID", "Name", "Card #", "Qty", "Cost", "Price", "Location", "Status", "Actions"]).map((h) => <th key={h} style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredLength === 0 && <tr><td colSpan={canAdjust ? 11 : 10} style={{ padding: 20, color: "#94a3b8" }}>No items found.</td></tr>}
            {pagedCards.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                {canAdjust && <td style={{ padding: 10 }}><input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={(e) => setBulkSelected((prev) => e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id))} /></td>}
                <td style={{ padding: 10 }}>{c.front_image ? <img loading="lazy" src={c.front_image} alt="front" style={{ width: 46, height: 64, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 46, height: 64, borderRadius: 8, background: "#020617" }} />}</td>
                <td style={{ padding: 10, fontWeight: 800 }}>{c.inventory_id || "N/A"}</td>
                <td style={{ padding: 10 }}>{c.name}</td>
                <td style={{ padding: 10, color: "#94a3b8" }}>{c.card_number || "N/A"}</td>
                <td style={{ padding: 10 }}>{c.quantity || 0}</td>
                <td style={{ padding: 10 }}>{money(c.cost)}</td>
                <td style={{ padding: 10 }}>{money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)}</td>
                <td style={{ padding: 10 }}>{c.storage_location || "N/A"}</td>
                <td style={{ padding: 10 }}><StatusBadgeComp status={c.status} /></td>
                <td style={{ padding: 10 }}><ActionButtonsComp card={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileInventoryCards({ pagedCards, filteredLength, canAdjust, bulkSelected, setBulkSelected, styles, StatusBadgeComp, ActionButtonsComp }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {filteredLength === 0 && <div style={styles.card}>No items found.</div>}
      {pagedCards.map((c) => (
        <div key={c.id} style={styles.card}>
          {canAdjust && <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={(e) => setBulkSelected((prev) => e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id))} /> Select</label>}
          <div style={{ display: "flex", gap: 12 }}>
            {c.front_image && <img loading="lazy" src={c.front_image} alt="front" style={{ width: 84, height: 116, objectFit: "cover", borderRadius: 10 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ ...styles.muted, fontWeight: 800 }}>{c.inventory_id || "N/A"}</div>
              <h3 style={{ margin: "6px 0" }}>{c.name}</h3>
              <div style={styles.muted}>{c.card_number || "N/A"}</div>
              <div style={{ marginTop: 8 }}><StatusBadgeComp status={c.status} /></div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div><div style={styles.muted}>Qty</div><b>{c.quantity || 0}</b></div>
            <div><div style={styles.muted}>Cost</div><b>{money(c.cost)}</b></div>
            <div><div style={styles.muted}>Price</div><b>{money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)}</b></div>
          </div>
          <div style={{ marginTop: 12 }}><ActionButtonsComp card={c} /></div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryView({
  stats,
  isMobile,
  styles,
  search,
  onSearchChange,
  canAdjust,
  bulkSelected,
  setBulkSelected,
  pagedCards,
  filteredLength,
  page,
  setPage,
  onView,
  onAddToCart,
  onQuickSell,
  bulkMoveLocation,
  bulkUpdatePrice,
  bulkUpdateStatus,
}) {
  const actionProps = {
    styles,
    onView,
    onAddToCart,
    onQuickSell,
  };

  const ActionButtonsComp = ({ card }) => <ActionButtons card={card} {...actionProps} />;

  return (
    <>
      <DashboardCards stats={stats} isMobile={isMobile} styles={styles} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <SearchInput
          placeholder="Search inventory ID, name, category, SKU / card #, location, status..."
          value={search}
          onChange={onSearchChange}
          styles={styles}
        />
      </div>
      {canAdjust && (
        <div style={{ ...styles.card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b>Bulk Actions</b>
          <span style={styles.muted}>{bulkSelected.length} selected</span>
          <button type="button" style={styles.button} onClick={() => setBulkSelected(pagedCards.map((card) => card.id))}>Select Page</button>
          <button type="button" style={styles.button} onClick={() => setBulkSelected([])}>Clear</button>
          <button type="button" style={styles.button} onClick={bulkMoveLocation}>Move Location</button>
          <button type="button" style={styles.button} onClick={bulkUpdatePrice}>Update Price</button>
          <button type="button" style={styles.button} onClick={bulkUpdateStatus}>Update Status</button>
        </div>
      )}
      {isMobile ? (
        <MobileInventoryCards
          pagedCards={pagedCards}
          filteredLength={filteredLength}
          canAdjust={canAdjust}
          bulkSelected={bulkSelected}
          setBulkSelected={setBulkSelected}
          styles={styles}
          StatusBadgeComp={StatusBadge}
          ActionButtonsComp={ActionButtonsComp}
        />
      ) : (
        <DesktopInventoryTable
          pagedCards={pagedCards}
          filteredLength={filteredLength}
          canAdjust={canAdjust}
          bulkSelected={bulkSelected}
          setBulkSelected={setBulkSelected}
          styles={styles}
          StatusBadgeComp={StatusBadge}
          ActionButtonsComp={ActionButtonsComp}
        />
      )}
      <PaginationControls filteredLength={filteredLength} page={page} setPage={setPage} styles={styles} />
    </>
  );
}

export { ActionButtons };
