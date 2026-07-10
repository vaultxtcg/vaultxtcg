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
  const matchingCards = q ? cards.filter((card) => [card.name, card.inventory_id, card.card_number, card.storage_location, card.status].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingSales = q ? sales.filter((sale) => [sale.sale_number, sale.customer_name, sale.customer_tel, sale.payment_method].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingTrades = q ? tradeDeals.filter((deal) => [deal.trade_number, deal.customer_name, deal.customer_tel, deal.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
  const matchingCustomers = q ? customers.filter((customer) => [customer.name, customer.tel, customer.email, customer.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];

  return (
    <div>
      <DashboardCards stats={stats} isMobile={isMobile} styles={styles} />
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Global Search</h3>
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Sales</h3>
          {sales.slice(0, 5).map((sale) => <div key={sale.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{sale.sale_number} · {money(sale.total)} · {sale.customer_name || "Walk-in"}</div>)}
          {!sales.length && <div style={styles.muted}>No sales yet.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Trades</h3>
          {tradeDeals.slice(0, 5).map((deal) => <div key={deal.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{deal.trade_number} · {deal.customer_name || "N/A"} · Cash {money(deal.cash_difference)}</div>)}
          {!tradeDeals.length && <div style={styles.muted}>No trades yet.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
          {activityLogs.slice(0, 5).map((log) => <div key={log.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{log.action} · {log.inventory_id || "N/A"} · {accountLabel(log.user_email)}</div>)}
          {!activityLogs.length && <div style={styles.muted}>No activity yet.</div>}
        </div>
      </div>
    </div>
  );
}
