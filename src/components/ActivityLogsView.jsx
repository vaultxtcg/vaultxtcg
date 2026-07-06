import { LogTable } from "./Common";

export default function ActivityLogsView({ activityLogs, activityFilter, setActivityFilter, styles }) {
  const actions = ["ALL", ...Array.from(new Set(activityLogs.map((log) => String(log.action || "").toUpperCase()).filter(Boolean)))];
  const filteredLogs = activityFilter === "ALL"
    ? activityLogs
    : activityLogs.filter((log) => String(log.action || "").toUpperCase() === activityFilter);

  return (
    <div>
      <div style={{ ...styles.card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <b>Filter</b>
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            style={activityFilter === action ? styles.primary : styles.button}
            onClick={() => setActivityFilter(action)}
          >
            {action}
          </button>
        ))}
      </div>
      <LogTable rows={filteredLogs} headers={["created_at", "user_email", "action", "inventory_id", "card_number", "notes"]} styles={styles} />
    </div>
  );
}

export function TransactionsView({ transactions, styles }) {
  return <LogTable rows={transactions} headers={["created_at", "user_email", "transaction_type", "inventory_id", "card_number", "quantity", "cost", "price", "notes"]} styles={styles} />;
}
