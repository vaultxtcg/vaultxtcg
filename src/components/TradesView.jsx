import { useState } from "react";
import { money, fmtDate } from "../utils/helpers";

export default function TradesView({
  cards,
  tradeDeals,
  isMobile,
  styles,
  canTrade,
  askModal,
  showToast,
  createTradeDeal,
}) {
  const [mode, setMode] = useState("history");
  const [customerName, setCustomerName] = useState("");
  const [customerTel, setCustomerTel] = useState("");
  const [cashDifference, setCashDifference] = useState(0);
  const [tradeNotes, setTradeNotes] = useState("");
  const [inItems, setInItems] = useState([]);
  const [outItems, setOutItems] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");

  const availableCards = cards.filter((c) => c.status !== "Sold" && Number(c.quantity || 0) > 0);
  const tradeOutSearchResults = availableCards.filter((c) => {
    const keyword = inventorySearch.toLowerCase().trim();
    if (!keyword) return true;
    return [c.inventory_id, c.name, c.card_number, c.storage_location, c.category]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
  }).slice(0, 20);

  const inTotal = inItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
  const outTotal = outItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
  const expectedCash = outTotal - inTotal;

  const addTradeInItem = async () => {
    const result = await askModal({
      title: "Add trade-in item",
      message: "Card received from customer. Trade value is the total value for this line.",
      confirmText: "Add Item",
      fields: [
        { name: "name", label: "Card Name / Product Name" },
        { name: "cardNumber", label: "SKU / Card # / ID" },
        { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
        { name: "tradeValue", label: "Total Trade-In Value", type: "number", defaultValue: 0 },
        { name: "listPrice", label: "List Price Per Card", type: "number", defaultValue: 0 },
        { name: "category", label: "Category", defaultValue: "Others" },
        { name: "language", label: "Language", defaultValue: "English" },
        { name: "location", label: "Storage Location" },
        { name: "notes", label: "Notes" },
      ],
    });
    if (!result) return;
    if (!result.name?.trim()) return showToast("Card name is required", "error");
    const qty = Number(result.quantity || 1);
    const tradeValue = Number(result.tradeValue || 0);
    const defaultListPrice = qty ? Number(((tradeValue / qty) * 1.3).toFixed(2)) : 0;
    setInItems((prev) => [...prev, { ...result, quantity: qty, tradeValue, listPrice: result.listPrice === "" || result.listPrice === undefined ? defaultListPrice : Number(result.listPrice || defaultListPrice) }]);
  };

  const addTradeOutItem = async (card) => {
    const result = await askModal({
      title: "Add inventory item to trade out",
      message: `${card.inventory_id} · ${card.name} · Available: ${card.quantity}`,
      confirmText: "Add Trade Out",
      fields: [
        { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
        { name: "tradeValue", label: "Total Trade-Out Value", type: "number", defaultValue: Number(card.price || 0) },
      ],
    });
    if (!result) return;
    const quantity = Number(result.quantity || 0);
    if (quantity < 1) return showToast("Quantity must be at least 1", "error");
    if (quantity > Number(card.quantity || 0)) return showToast("Not enough inventory", "error");
    setOutItems((prev) => [...prev, { cardId: card.id, inventoryId: card.inventory_id, name: card.name, cardNumber: card.card_number, availableQty: card.quantity, quantity, tradeValue: Number(result.tradeValue || 0) }]);
  };

  const removeInItem = (index) => setInItems((prev) => prev.filter((_, i) => i !== index));
  const removeOutItem = (index) => setOutItems((prev) => prev.filter((_, i) => i !== index));

  const resetTradeForm = () => {
    setCustomerName("");
    setCustomerTel("");
    setCashDifference(0);
    setTradeNotes("");
    setInItems([]);
    setOutItems([]);
    setInventorySearch("");
  };

  const confirmTrade = async () => {
    await createTradeDeal({
      customerName,
      customerTel,
      cashDifference: Number(cashDifference || 0),
      notes: tradeNotes,
      inItems,
      outItems,
    });
    resetTradeForm();
    setMode("history");
  };

  if (mode === "new") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button type="button" style={styles.button} onClick={() => setMode("history")}>← Trade History</button>
          <button type="button" style={styles.primary} onClick={confirmTrade}>Confirm Trade Deal</button>
        </div>

        <div style={{ ...styles.card, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Trade Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
            <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} />
            <input placeholder="Customer Tel" value={customerTel} onChange={(e) => setCustomerTel(e.target.value)} style={styles.input} />
            <input type="number" placeholder="Cash Difference" value={cashDifference} onChange={(e) => setCashDifference(e.target.value)} style={styles.input} />
          </div>
          <textarea placeholder="Trade notes" value={tradeNotes} onChange={(e) => setTradeNotes(e.target.value)} style={{ ...styles.input, minHeight: 74, resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 10 }}>
            <div><div style={styles.muted}>Customer gives us</div><b>{money(inTotal)}</b></div>
            <div><div style={styles.muted}>We give customer</div><b>{money(outTotal)}</b></div>
            <div><div style={styles.muted}>Expected cash</div><b>{money(expectedCash)}</b></div>
            <div><div style={styles.muted}>Cash recorded</div><b>{money(cashDifference)}</b></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h3 style={{ marginTop: 0 }}>Customer Gives Us</h3>
              <button type="button" style={styles.primary} onClick={addTradeInItem}>+ Add Item</button>
            </div>
            {inItems.length === 0 && <div style={styles.muted}>No trade-in items yet.</div>}
            {inItems.map((item, index) => (
              <div key={`${item.name}-${index}`} style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 10 }}>
                <b>{item.name}</b>
                <div style={styles.muted}>{item.cardNumber || "N/A"} · Qty {item.quantity} · Value {money(item.tradeValue)}</div>
                <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={() => removeInItem(index)}>Remove</button>
              </div>
            ))}
          </div>

          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>We Give Customer</h3>
            <input placeholder="Search inventory to trade out..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} style={styles.input} />
            <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #1e293b", borderRadius: 12 }}>
              {tradeOutSearchResults.map((card) => (
                <div key={card.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: 10, borderBottom: "1px solid #1e293b", alignItems: "center" }}>
                  <div>
                    <b>{card.inventory_id}</b> · {card.name}
                    <div style={styles.muted}>{card.card_number || "N/A"} · Qty {card.quantity || 0} · Price {money(card.price)} · {card.storage_location || "No location"}</div>
                  </div>
                  <button type="button" style={styles.button} onClick={() => addTradeOutItem(card)}>Add</button>
                </div>
              ))}
            </div>
            <h4>Selected Trade-Out Items</h4>
            {outItems.length === 0 && <div style={styles.muted}>No inventory items selected.</div>}
            {outItems.map((item, index) => (
              <div key={`${item.inventoryId}-${index}`} style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 10 }}>
                <b>{item.inventoryId}</b> · {item.name}
                <div style={styles.muted}>{item.cardNumber || "N/A"} · Qty {item.quantity} · Value {money(item.tradeValue)}</div>
                <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={() => removeOutItem(index)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <div style={styles.muted}>Multi-item trade deals. Trade-out items are selected from inventory.</div>
        {canTrade && <button type="button" style={styles.primary} onClick={() => setMode("new")}>+ New Trade Deal</button>}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {tradeDeals.length === 0 && <div style={styles.card}>No trade deals yet.</div>}
        {tradeDeals.map((deal) => {
          const items = deal.trade_items || [];
          const ins = items.filter((item) => item.direction === "IN");
          const outs = items.filter((item) => item.direction === "OUT");
          const dealInTotal = ins.reduce((sum, item) => sum + Number(item.trade_value || 0), 0);
          const dealOutTotal = outs.reduce((sum, item) => sum + Number(item.trade_value || 0), 0);
          return (
            <div key={deal.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{deal.trade_number || `T-${String(deal.id).padStart(6, "0")}`}</h3>
                  <div style={styles.muted}>{fmtDate(deal.created_at)} · {deal.customer_name || "No customer"} {deal.customer_tel ? `· ${deal.customer_tel}` : ""}</div>
                </div>
                <div style={{ textAlign: isMobile ? "left" : "right" }}>
                  <div>Cash Difference: <b>{money(deal.cash_difference)}</b></div>
                  <div style={styles.muted}>In {money(dealInTotal)} · Out {money(dealOutTotal)}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 12 }}>
                <div>
                  <b>Customer Gives Us</b>
                  {ins.length === 0 && <div style={styles.muted}>None</div>}
                  {ins.map((item) => <div key={item.id} style={styles.muted}>+ {item.card_name} · Qty {item.quantity} · {money(item.trade_value)} · {item.inventory_id}</div>)}
                </div>
                <div>
                  <b>We Give Customer</b>
                  {outs.length === 0 && <div style={styles.muted}>None</div>}
                  {outs.map((item) => <div key={item.id} style={styles.muted}>- {item.card_name} · Qty {item.quantity} · {money(item.trade_value)} · {item.inventory_id}</div>)}
                </div>
              </div>
              {deal.notes && <div style={{ ...styles.muted, marginTop: 10 }}>Notes: {deal.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
