import { DashboardCards, SearchInput, SearchResultCard } from "./Common";
import { money } from "../utils/helpers";

export default function DashboardView({
  stats,
  isMobile,
  styles,
  cards,
  sales,
  tradeDeals,
  customers,
  activityLogs,
  globalSearch,
  setGlobalSearch,
  onViewCard,
}) {
  const q = globalSearch.toLowerCase().trim();
  const accountLabel = (email) => email || "Unknown account";
  const availableCards = cards.filter((card) => card.status !== "Sold");
  const holdCards = availableCards.filter((card) => card.status === "Hold");
  const lowStockCards = availableCards.filter((card) => Number(card.quantity || 0) <= 1).slice(0, 6);
  const recentAdds = activityLogs.filter((log) => ["ADD", "IMPORT", "TRADE"].includes(String(log.action || "").toUpperCase())).slice(0, 5);
  const matchingCards = q ? cards.filter((card) => [card.name, card.inventory_id, card.card_number, card.storage_location, card.status, card.game, card.category].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingSales = q ? sales.filter((sale) => [sale.sale_number, sale.customer_name, sale.customer_tel, sale.payment_method].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingTrades = q ? tradeDeals.filter((deal) => [deal.trade_number, deal.customer_name, deal.customer_tel, deal.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingCustomers = q ? customers.filter((customer) => [customer.name, customer.tel, customer.email, customer.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const lineStyle = { padding: "9px 0", borderBottom: "1px solid #243044" };

  return (
    <div>
      <DashboardCards stats={stats} isMobile={isMobile} styles={styles} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Global Search</h3>
          <div style={styles.muted}>Cards, sales, trades, and customers</div>
        </div>
        <SearchInput
          placeholder="Search card, inventory ID, sale #, trade #, customer..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          styles={styles}
        />
      </div>

      {q && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <SearchResultCard title="Cards" rows={matchingCards} styles={styles} render={(card) => (
            <button key={card.id} type="button" style={{ ...styles.button, textAlign: "left", width: "100%", marginBottom: 8 }} onClick={() => onViewCard(card)}>
              {card.inventory_id || "N/A"} · {card.name} · Qty {card.quantity || 0}
            </button>
          )} />
          <SearchResultCard title="Sales" rows={matchingSales} styles={styles} render={(sale) => (
            <div key={sale.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{sale.sale_number} · {sale.customer_name || "Walk-in"} · {money(sale.total)}</div>
          )} />
          <SearchResultCard title="Trades" rows={matchingTrades} styles={styles} render={(deal) => (
            <div key={deal.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{deal.trade_number} · {deal.customer_name || "N/A"} · Cash {money(deal.cash_difference)}</div>
          )} />
          <SearchResultCard title="Customers" rows={matchingCustomers} styles={styles} render={(customer) => (
            <div key={customer.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{customer.name} · {customer.tel || "No tel"} · Credit {money(customer.store_credit)}</div>
          )} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Low Stock</h3>
          {lowStockCards.map((card) => <button key={card.id} type="button" onClick={() => onViewCard(card)} style={{ ...styles.button, ...lineStyle, width: "100%", textAlign: "left", borderTop: 0, borderLeft: 0, borderRight: 0, borderRadius: 0, background: "transparent" }}>{card.inventory_id || "N/A"} · {card.name}<div style={styles.muted}>Qty {card.quantity || 0} · {card.storage_location || "No location"}</div></button>)}
          {!lowStockCards.length && <div style={styles.muted}>No low-stock items.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>On Hold</h3>
          {holdCards.slice(0, 6).map((card) => <button key={card.id} type="button" onClick={() => onViewCard(card)} style={{ ...styles.button, ...lineStyle, width: "100%", textAlign: "left", borderTop: 0, borderLeft: 0, borderRight: 0, borderRadius: 0, background: "transparent" }}>{card.inventory_id || "N/A"} · {card.name}<div style={styles.muted}>{card.storage_location || "No location"}</div></button>)}
          {!holdCards.length && <div style={styles.muted}>No held items.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Stock In</h3>
          {recentAdds.map((log) => <div key={log.id} style={lineStyle}>{log.action} · {log.inventory_id || "N/A"}<div style={styles.muted}>{accountLabel(log.user_email)} · {log.notes || ""}</div></div>)}
          {!recentAdds.length && <div style={styles.muted}>No recent stock activity.</div>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Sales</h3>
          {sales.slice(0, 5).map((sale) => <div key={sale.id} style={lineStyle}>{sale.sale_number} · {money(sale.total)}<div style={styles.muted}>{sale.customer_name || "Walk-in"}</div></div>)}
          {!sales.length && <div style={styles.muted}>No sales yet.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Trades</h3>
          {tradeDeals.slice(0, 5).map((deal) => <div key={deal.id} style={lineStyle}>{deal.trade_number} · Cash {money(deal.cash_difference)}<div style={styles.muted}>{deal.customer_name || "N/A"}</div></div>)}
          {!tradeDeals.length && <div style={styles.muted}>No trades yet.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
          {activityLogs.slice(0, 5).map((log) => <div key={log.id} style={lineStyle}>{log.action} · {log.inventory_id || "N/A"}<div style={styles.muted}>{accountLabel(log.user_email)}</div></div>)}
          {!activityLogs.length && <div style={styles.muted}>No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}
