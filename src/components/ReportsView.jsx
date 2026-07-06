import { DashboardCards } from "./Common";
import {
  exportInventoryCSV,
  exportSalesCSV,
  exportActivityLogCSV,
  exportTransactionsCSV,
  downloadExcelTemplate,
} from "../utils/export";

export default function ReportsView({
  stats,
  isMobile,
  styles,
  cards,
  activityLogs,
  transactions,
  onImportExcel,
}) {
  return (
    <div>
      <DashboardCards stats={stats} isMobile={isMobile} styles={styles} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Export Tools</h3>
          <button type="button" onClick={() => exportInventoryCSV(cards)} style={styles.button}>Export Inventory CSV</button>{" "}
          <button type="button" onClick={() => exportSalesCSV(cards)} style={styles.button}>Export Sales CSV</button>{" "}
          <button type="button" onClick={() => exportActivityLogCSV(activityLogs)} style={styles.button}>Export Activity Log CSV</button>{" "}
          <button type="button" onClick={() => exportTransactionsCSV(transactions)} style={styles.button}>Export Transactions CSV</button>
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Import Tools</h3>
          <button type="button" onClick={downloadExcelTemplate} style={styles.button}>Download Excel Template</button>
          <input type="file" accept=".xlsx,.xls" onChange={onImportExcel} style={{ display: "block", marginTop: 12 }} />
        </div>
      </div>
    </div>
  );
}

export function InventoryCountView({
  countedInventoryIds,
  setCountedInventoryIds,
  inventoryCards,
  canAdjust,
  styles,
  isMobile,
  applyInventoryCountMissing,
}) {
  const scanned = countedInventoryIds
    .split(/\n|,|\s+/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  const scannedSet = new Set(scanned);
  const missing = inventoryCards.filter((card) => !scannedSet.has(String(card.inventory_id || "").toUpperCase()));
  const extra = scanned.filter((id) => !inventoryCards.some((card) => String(card.inventory_id || "").toUpperCase() === id));

  return (
    <div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Inventory Count Mode</h3>
        <div style={styles.muted}>Scan or paste inventory IDs. One ID per line is best.</div>
        <textarea
          value={countedInventoryIds}
          onChange={(e) => setCountedInventoryIds(e.target.value)}
          placeholder="VX-000001
VX-000002
VX-000003"
          style={{ ...styles.input, minHeight: 180, marginTop: 12 }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={styles.card}>Scanned: <b>{scanned.length}</b></div>
          <div style={styles.card}>Missing: <b>{missing.length}</b></div>
          <div style={styles.card}>Unknown IDs: <b>{extra.length}</b></div>
        </div>
        {canAdjust && <button type="button" style={{ ...styles.danger, marginTop: 12 }} onClick={applyInventoryCountMissing}>Set Missing Items to 0</button>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Missing From Count</h3>
          {missing.slice(0, 100).map((card) => <div key={card.id} style={{ padding: "7px 0", borderBottom: "1px solid #1e293b" }}>{card.inventory_id} · {card.name} · Qty {card.quantity}</div>)}
          {!missing.length && <div style={styles.muted}>No missing items.</div>}
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Unknown Scanned IDs</h3>
          {extra.slice(0, 100).map((id) => <div key={id} style={{ padding: "7px 0", borderBottom: "1px solid #1e293b" }}>{id}</div>)}
          {!extra.length && <div style={styles.muted}>No unknown IDs.</div>}
        </div>
      </div>
    </div>
  );
}
