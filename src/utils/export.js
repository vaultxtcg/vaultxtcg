import * as XLSX from "xlsx";
import {
  CARD_STATUS_AVAILABLE,
  CARD_STATUS_SOLD,
  INVENTORY_ID_PAD_LENGTH,
  INVENTORY_ID_PREFIX,
} from "../config/constants";
import { DEFAULT_GAME, DEFAULT_LANGUAGE } from "../config/languages";
import { DEFAULT_PAYMENT_METHOD } from "../config/paymentMethods";

export function downloadCSV(filename, headers, rows) {
  const csvRows = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(",")),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportInventoryCSV(cards) {
  downloadCSV(
    "vaultxtcg_inventory.csv",
    [
      "inventory_id", "name", "category", "game", "card_number", "language", "quantity", "cost", "price", "status",
      "purchase_date", "payment_method", "seller_name", "storage_location", "created_by", "updated_by",
    ],
    cards.filter((c) => c.status !== CARD_STATUS_SOLD)
  );
}

export function exportSalesCSV(cards) {
  downloadCSV(
    "vaultxtcg_sales.csv",
    [
      "inventory_id", "name", "category", "game", "card_number", "quantity", "cost", "sold_price", "sold_date", "receiving_method", "sold_by",
    ],
    cards.filter((c) => c.status === CARD_STATUS_SOLD)
  );
}

export function exportActivityLogCSV(activityLogs) {
  downloadCSV(
    "vaultxtcg_activity_log.csv",
    ["created_at", "user_email", "action", "inventory_id", "card_number", "notes"],
    activityLogs
  );
}

export function exportTransactionsCSV(transactions) {
  downloadCSV(
    "vaultxtcg_transactions.csv",
    ["created_at", "user_email", "transaction_type", "inventory_id", "card_number", "quantity", "cost", "price", "notes"],
    transactions
  );
}

export function downloadExcelTemplate() {
  const template = [{
    name: "Monkey D. Luffy",
    category: "Raw",
    game: "One Piece",
    quantity: 1,
    card_number: "OP13-108",
    language: DEFAULT_LANGUAGE,
    cost: 20,
    price: 35,
    purchase_date: "2026-06-12",
    payment_method: DEFAULT_PAYMENT_METHOD,
    seller_name: "Tom",
    seller_tel: "6261234567",
    storage_location: "Box A",
    status: CARD_STATUS_AVAILABLE,
    notes: "Example row",
  }];
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");
  XLSX.writeFile(workbook, "vaultxtcg_import_template.xlsx");
}

export async function importExcelFile(file, { companyId, userEmail, supabase, showToast, addActivityLog, addTransaction, onComplete }) {
  if (!file) return;
  if (!companyId) {
    showToast("Company ID not found. Please log in again.", "error");
    return;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        if (!rows.length) {
          showToast("Excel file is empty", "error");
          resolve();
          return;
        }

        const payload = rows
          .filter((row) => row.name || row.Name || row.card_number || row["SKU / Card #"])
          .map((row) => ({
            company_id: companyId,
            name: row.name || row.Name || "",
            category: row.category || row.Category || "Raw",
            game: row.game || row.Game || DEFAULT_GAME,
            card_number: row.card_number || row["SKU / Card #"] || row.cardNumber || row["SKU / Card # / ID"] || "",
            language: row.language || row.Language || DEFAULT_LANGUAGE,
            quantity: Number(row.quantity || row.Quantity || row.qty || row.Qty || 1),
            cost: Number(row.cost || row.Cost || 0),
            price: Number(row.price || row.Price || 0),
            purchase_date: row.purchase_date || row["Purchase Date"] || null,
            payment_method: row.payment_method || row["Payment Method"] || "",
            seller_name: row.seller_name || row["Seller Name"] || "",
            seller_tel: row.seller_tel || row["Seller Tel"] || "",
            storage_location: row.storage_location || row["Storage Location"] || "",
            status: row.status || row.Status || CARD_STATUS_AVAILABLE,
            notes: row.notes || row.Notes || "",
            created_by: userEmail,
          }));

        if (!payload.length) {
          showToast("No valid items found", "error");
          resolve();
          return;
        }

        const { data: insertedCards, error } = await supabase.from("cards").insert(payload).select();
        if (error) {
          showToast(error.message, "error");
          resolve();
          return;
        }

        for (const card of insertedCards) {
          const inventoryId = `${INVENTORY_ID_PREFIX}${String(card.id).padStart(INVENTORY_ID_PAD_LENGTH, "0")}`;
          await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", card.id);
          await addActivityLog({ action: "IMPORT", inventory_id: inventoryId, card_number: card.card_number, notes: `Imported from Excel. Qty: ${card.quantity}` });
          await addTransaction({
            inventory_id: inventoryId,
            card_number: card.card_number,
            transaction_type: "IMPORT",
            quantity: card.quantity,
            cost: Number(card.cost || 0) * Number(card.quantity || 0),
            price: Number(card.price || 0) * Number(card.quantity || 0),
            notes: "Imported from Excel",
          });
        }

        await onComplete();
        showToast(`${insertedCards.length} items imported`);
      } catch (err) {
        showToast(`Import failed: ${err.message}`, "error");
      }
      resolve();
    };
    reader.readAsArrayBuffer(file);
  });
}
