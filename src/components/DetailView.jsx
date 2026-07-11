import { useState } from "react";
import { DetailRow, StatusBadge, Barcode, MiniActivityList } from "./Common";
import { money, fmtDate } from "../utils/helpers";

const accountLabel = (email) => email || "Unknown account";

function priceChartingUrl(card) {
  const query = [card.name, card.card_number].filter(Boolean).join(" ");
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(query)}&type=prices`;
}

function DetailActions({
  card,
  styles,
  canHold,
  canAdjust,
  canEditSale,
  canDelete,
  addToCart,
  markAsSold,
  updateCardStatus,
  adjustQuantity,
  editSale,
  undoSale,
  deleteCard,
}) {
  const [showMore, setShowMore] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {card.status !== "Sold" && <button type="button" style={styles.primary} onClick={() => addToCart(card)}>Add to Cart</button>}
        {card.status !== "Sold" && <button type="button" style={styles.button} onClick={() => markAsSold(card)}>Quick Sell</button>}
        <button type="button" style={styles.button} onClick={() => setShowMore((v) => !v)}>More Actions {showMore ? "▲" : "▼"}</button>
      </div>
      {showMore && (
        <div style={{ ...styles.card, marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {card.status !== "Sold" && canHold && card.status !== "Hold" && <button type="button" style={styles.button} onClick={() => updateCardStatus(card, "Hold")}>Place Hold</button>}
          {card.status !== "Sold" && canHold && card.status === "Hold" && <button type="button" style={styles.button} onClick={() => updateCardStatus(card, "Available")}>Release Hold</button>}
          {card.status !== "Sold" && canAdjust && <button type="button" style={styles.button} onClick={() => adjustQuantity(card)}>Adjust Qty</button>}
          {card.status === "Sold" && canEditSale && <button type="button" style={styles.button} onClick={() => editSale(card)}>Edit Sale</button>}
          {card.status === "Sold" && canEditSale && <button type="button" style={styles.button} onClick={() => undoSale(card)}>Undo Sale</button>}
          <button type="button" style={styles.button} onClick={() => window.open(`https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(`${card.name} ${card.card_number}`)}`, "_blank")}>TCGplayer</button>
          <button type="button" style={styles.button} onClick={() => window.open(priceChartingUrl(card), "_blank", "noopener,noreferrer")}>PriceCharting</button>
          <button type="button" style={styles.button} onClick={() => window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${card.name} ${card.card_number}`)}`, "_blank")}>eBay</button>
          {canDelete && <button type="button" style={styles.danger} onClick={() => deleteCard(card.id)}>Delete</button>}
        </div>
      )}
    </div>
  );
}

export default function DetailView({
  card,
  isMobile,
  styles,
  canHold,
  canAdjust,
  canEditSale,
  canDelete,
  getItemActivity,
  setSelectedCard,
  setTab,
  startEdit,
  addToCart,
  markAsSold,
  updateCardStatus,
  adjustQuantity,
  editSale,
  undoSale,
  deleteCard,
}) {
  const { logMatches, transactionMatches, saleMatches, tradeMatches } = getItemActivity(card);
  const listPrice = Number(card.price || 0) > 0 ? card.price : Number(card.cost || 0) * 1.3;
  const detailGrid = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 };

  return (
    <div>
      <button type="button" onClick={() => { setSelectedCard(null); setTab("inventory"); }} style={{ ...styles.button, marginBottom: 14 }}>← Back</button>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "360px 1fr", gap: 16 }}>
        <div style={styles.card}>
          <div style={{ ...styles.muted, fontWeight: 800, marginBottom: 6 }}>{card.inventory_id || "N/A"}</div>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>{card.name}</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            {card.front_image ? <img loading="lazy" src={card.front_image} alt="front" style={{ width: "48%", borderRadius: 8, border: "1px solid #243044" }} /> : <div style={{ width: "48%", aspectRatio: "3 / 4", borderRadius: 8, border: "1px solid #243044", background: "#0b1220" }} />}
            {card.back_image ? <img loading="lazy" src={card.back_image} alt="back" style={{ width: "48%", borderRadius: 8, border: "1px solid #243044" }} /> : <div style={{ width: "48%", aspectRatio: "3 / 4", borderRadius: 8, border: "1px solid #243044", background: "#0b1220" }} />}
          </div>
          <button type="button" style={{ ...styles.button, marginTop: 12 }} onClick={() => startEdit(card)}>Edit Item</button>
        </div>
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Overview</h3>
            <StatusBadge status={card.status} />
          </div>
          <div style={detailGrid}>
            <div>
              <DetailRow label="Category" value={card.category} styles={styles} />
              <DetailRow label="Game" value={card.game} styles={styles} />
              <DetailRow label="Language" value={card.language} styles={styles} />
              <DetailRow label="SKU / Card #" value={card.card_number} styles={styles} />
              <DetailRow label="Quantity" value={card.quantity || 0} styles={styles} />
            </div>
            <div>
              <DetailRow label="Cost" value={money(card.cost)} styles={styles} />
              <DetailRow label="List Price" value={money(listPrice)} styles={styles} />
              <DetailRow label="Location" value={card.storage_location} styles={styles} />
              <DetailRow label="Barcode" value={<Barcode value={card.inventory_id || `VX-${String(card.id).padStart(6, "0")}`} />} styles={styles} />
            </div>
          </div>
          <DetailActions
            card={card}
            styles={styles}
            canHold={canHold}
            canAdjust={canAdjust}
            canEditSale={canEditSale}
            canDelete={canDelete}
            addToCart={addToCart}
            markAsSold={markAsSold}
            updateCardStatus={updateCardStatus}
            adjustQuantity={adjustQuantity}
            editSale={editSale}
            undoSale={undoSale}
            deleteCard={deleteCard}
          />
        </div>
      </div>
      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Purchase & Notes</h3>
        <div style={detailGrid}>
          <div>
            <DetailRow label="Purchase Date" value={card.purchase_date} styles={styles} />
            <DetailRow label="Payment" value={card.payment_method} styles={styles} />
            <DetailRow label="Seller" value={card.seller_name} styles={styles} />
            <DetailRow label="Seller Tel" value={card.seller_tel} styles={styles} />
          </div>
          <div>
            {card.status === "Sold" && <>
              <DetailRow label="Sold Price" value={money(card.sold_price)} styles={styles} />
              <DetailRow label="Sold Date" value={card.sold_date} styles={styles} />
              <DetailRow label="Receiving Method" value={card.receiving_method} styles={styles} />
              <DetailRow label="Profit" value={money(Number(card.sold_price || 0) - Number(card.cost || 0))} styles={styles} />
            </>}
            <DetailRow label="Notes" value={card.notes} styles={styles} />
          </div>
        </div>
      </div>
      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Item Activity</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <MiniActivityList title="Activity Logs" rows={logMatches} styles={styles} render={(log) => `${fmtDate(log.created_at)} · ${accountLabel(log.user_email)} · ${log.action} · ${log.notes || ""}`} />
          <MiniActivityList title="Inventory Transactions" rows={transactionMatches} styles={styles} render={(tx) => `${fmtDate(tx.created_at)} · ${accountLabel(tx.user_email)} · ${tx.transaction_type} · Qty ${tx.quantity} · ${money(tx.price)} · ${tx.notes || ""}`} />
          <MiniActivityList title="Sales" rows={saleMatches} styles={styles} render={(item) => `${item.sale?.sale_number || "Sale"} · ${fmtDate(item.sale?.created_at)} · Qty ${item.quantity} · ${money(item.total_price)}`} />
          <MiniActivityList title="Trades" rows={tradeMatches} styles={styles} render={(item) => `${item.deal?.trade_number || "Trade"} · ${item.direction} · Qty ${item.quantity} · ${money(item.trade_value)}`} />
        </div>
      </div>
    </div>
  );
}
