import { DashboardCards, SearchInput, StatusBadge, PaginationControls } from "./Common";
import { GAME_OPTIONS, ITEM_CATEGORIES, money } from "../utils/helpers";
import { CARD_STATUS_AVAILABLE, CARD_STATUS_SOLD } from "../config/constants";

function priceChartingUrl(card) {
  const query = [card.name, card.card_number].filter(Boolean).join(" ");
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
}

function ActionButtons({ card, styles, onView, onAddToCart, onQuickSell }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minWidth: 260 }}>
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080, fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#0b1220", color: "#9ca3af", textAlign: "left" }}>
              {(canAdjust ? ["Select", "Image", "Inventory ID", "Item", "Qty", "Cost", "Price", "Location", "Status", "Actions"] : ["Image", "Inventory ID", "Item", "Qty", "Cost", "Price", "Location", "Status", "Actions"]).map((h) => <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid #243044", fontSize: 12, textTransform: "uppercase" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredLength === 0 && <tr><td colSpan={canAdjust ? 10 : 9} style={{ padding: 20, color: "#9ca3af" }}>No items found.</td></tr>}
            {pagedCards.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #243044" }}>
                {canAdjust && <td style={{ padding: 10, width: 48 }}><input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={(e) => setBulkSelected((prev) => e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id))} /></td>}
                <td style={{ padding: 10, width: 64 }}>{c.front_image ? <img loading="lazy" src={c.front_image} alt="front" style={{ width: 42, height: 58, objectFit: "cover", borderRadius: 6 }} /> : <div style={{ width: 42, height: 58, borderRadius: 6, background: "#0b1220" }} />}</td>
                <td style={{ padding: 10, fontWeight: 800, whiteSpace: "nowrap" }}>{c.inventory_id || "N/A"}</td>
                <td style={{ padding: 10, minWidth: 230 }}>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div style={{ ...styles.muted, marginTop: 3 }}>{c.category || "N/A"} · {c.game || "N/A"} · {c.language || "N/A"} · {c.card_number || "N/A"}</div>
                </td>
                <td style={{ padding: 10, textAlign: "right", fontWeight: 800 }}>{c.quantity || 0}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{money(c.cost)}</td>
                <td style={{ padding: 10, textAlign: "right", fontWeight: 800 }}>{money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)}</td>
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
              <div style={styles.muted}>{c.game || "N/A"} · {c.card_number || "N/A"}</div>
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
  categoryFilter,
  setCategoryFilter,
  gameFilter,
  setGameFilter,
  statusFilter,
  setStatusFilter,
  locationFilter,
  setLocationFilter,
  locationOptions,
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
  const hasFilters = search || categoryFilter !== "ALL" || gameFilter !== "ALL" || statusFilter !== "ALL" || locationFilter !== "ALL";
  const clearFilters = () => {
    onSearchChange({ target: { value: "" } });
    setCategoryFilter("ALL");
    setGameFilter("ALL");
    setStatusFilter("ALL");
    setLocationFilter("ALL");
  };

  return (
    <>
      <DashboardCards stats={stats} isMobile={isMobile} styles={styles} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr repeat(4, 1fr) auto", gap: 10, alignItems: "end" }}>
          <label>
            <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>Search Inventory</div>
            <SearchInput
              placeholder="Inventory ID, name, game, SKU, location, status..."
              value={search}
              onChange={onSearchChange}
              styles={styles}
            />
          </label>
          <label>
            <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>Category</div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
              <option value="ALL">All Categories</option>
              {ITEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>Game</div>
            <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
              <option value="ALL">All Games</option>
              {GAME_OPTIONS.map((game) => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>Status</div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
              <option value="ALL">All Statuses</option>
              <option value={CARD_STATUS_AVAILABLE}>Available</option>
              <option value="Hold">Hold</option>
              <option value={CARD_STATUS_SOLD}>Sold</option>
              <option value="Others">Others</option>
            </select>
          </label>
          <label>
            <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>Location</div>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ ...styles.input, marginBottom: 0 }}>
              <option value="ALL">All Locations</option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!hasFilters} onClick={clearFilters} style={{ ...styles.button, opacity: hasFilters ? 1 : 0.45, cursor: hasFilters ? "pointer" : "not-allowed" }}>
            Clear
          </button>
        </div>
        <div style={{ ...styles.muted, marginTop: 10 }}>{filteredLength} item(s) shown</div>
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
