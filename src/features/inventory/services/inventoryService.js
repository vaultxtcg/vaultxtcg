/**
 * Inventory business logic.
 *
 * No UI.
 * No React.
 * No Components.
 *
 * This service will eventually own all Inventory operations.
 */

import { supabase } from "../../../lib/supabase";
import { INVENTORY_ID_PAD_LENGTH, INVENTORY_ID_PREFIX } from "../../../config/constants";
import { diffObjects, money } from "../../../utils/helpers";
import { uploadFile } from "../../../utils/image";

export function validateSaveCard(form, companyId) {
  if (!form.name.trim()) return { success: false, error: "Item Name is required" };
  if (!companyId) return { success: false, error: "Company ID not found. Please log in again." };
  return { success: true };
}

export async function saveCard({
  form,
  editingId,
  frontFile,
  backFile,
  companyId,
  userEmail,
  cards,
  options = {},
  showToast,
  addActivityLog,
  addTransaction,
}) {
  const formWithoutId = { ...form };
  delete formWithoutId.id;
  delete formWithoutId.slab_company;
  delete formWithoutId.slab_grade;
  const costNumber = Number(form.cost || 0);
  const priceNumber = form.price === "" || form.price === null || form.price === undefined ? Number((costNumber * 1.3).toFixed(2)) : Number(form.price || 0);
  const slabInfo = form.category === "Slab" && (form.slab_company || form.slab_grade) ? `Grading: ${form.slab_company || "N/A"} ${form.slab_grade || ""}. ${form.notes || ""}`.trim() : form.notes;
  const payload = { ...formWithoutId, notes: slabInfo, category: options.forceCategory || formWithoutId.category, company_id: companyId, cost: costNumber, price: priceNumber, quantity: Number(form.quantity || 1) };
  let cardId = editingId;
  const wasEditing = Boolean(editingId);
  if (editingId) {
    payload.updated_by = userEmail;
    const currentCard = cards.find((c) => c.id === editingId);
    const inventoryId = currentCard?.inventory_id;
    const changes = diffObjects(currentCard, payload, ["name", "category", "game", "language", "quantity", "card_number", "cost", "price", "purchase_date", "payment_method", "seller_name", "seller_tel", "storage_location", "status", "notes"]);
    const { error } = await supabase.from("cards").update(payload).eq("id", editingId);
    if (error) return { success: false, error: error.message };
    await addActivityLog({ action: "EDIT", inventory_id: inventoryId, card_number: payload.card_number, notes: `Item updated. Changes: ${changes}` });
  } else {
    payload.created_by = userEmail;
    const { data, error } = await supabase.from("cards").insert([payload]).select().single();
    if (error) return { success: false, error: error.message };
    cardId = data.id;
    const inventoryId = `${INVENTORY_ID_PREFIX}${String(data.id).padStart(INVENTORY_ID_PAD_LENGTH, "0")}`;
    await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", data.id);
    await addActivityLog({ action: "ADD", inventory_id: inventoryId, card_number: payload.card_number, notes: `Added card. Qty: ${payload.quantity}; Cost: ${money(payload.cost)}; Location: ${payload.storage_location || "N/A"}` });
    await addTransaction({ inventory_id: inventoryId, card_number: payload.card_number, transaction_type: "ADD", quantity: payload.quantity, cost: payload.cost * payload.quantity, price: payload.price * payload.quantity, notes: "Card added to inventory" });
  }
  const frontUrl = await uploadFile(cardId, frontFile, "front", showToast);
  const backUrl = await uploadFile(cardId, backFile, "back", showToast);
  const updates = {};
  if (frontUrl) updates.front_image = frontUrl;
  if (backUrl) updates.back_image = backUrl;
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("cards").update(updates).eq("id", cardId);
    if (error) return { success: false, error: error.message };
  }
  return { success: true, wasEditing };
}

export function deleteCard() {
  throw new Error("Not implemented yet.");
}

export function updateCardStatus() {
  throw new Error("Not implemented yet.");
}

export function startEdit() {
  throw new Error("Not implemented yet.");
}

export function cancelEdit() {
  throw new Error("Not implemented yet.");
}

export function handleCostChange() {
  throw new Error("Not implemented yet.");
}

export function uploadCardImages() {
  throw new Error("Not implemented yet.");
}

export function generateInventoryId() {
  throw new Error("Not implemented yet.");
}

export function refreshInventory() {
  throw new Error("Not implemented yet.");
}

export function bulkUpdateCards() {
  throw new Error("Not implemented yet.");
}
