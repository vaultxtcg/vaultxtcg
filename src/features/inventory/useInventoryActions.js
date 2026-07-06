import { supabase } from "../../lib/supabase";
import { CARD_STATUS_AVAILABLE, CARD_STATUS_HOLD, DEFAULT_TAB } from "../../config/constants";

export function useInventoryActions({
  canHold,
  canDelete,
  cards,
  user,
  askModal,
  showToast,
  setSaving,
  addActivityLog,
  addTransaction,
  refreshAll,
  setSelectedCard,
  setTab,
}) {
  const updateCardStatus = async (card, nextStatus) => {
    if (!canHold) return showToast("Only owner/admin can change hold status", "error");
    setSaving(true);
    const previousStatus = card.status || CARD_STATUS_AVAILABLE;
    const { error } = await supabase.from("cards").update({ status: nextStatus, updated_by: user?.email }).eq("id", card.id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: nextStatus === CARD_STATUS_HOLD ? "HOLD" : "RELEASE_HOLD", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Status changed: ${previousStatus} → ${nextStatus}.` });
    await refreshAll();
    setSelectedCard((prev) => prev ? { ...prev, status: nextStatus } : prev);
    setSaving(false);
    showToast(nextStatus === CARD_STATUS_HOLD ? "Card placed on hold" : "Card released from hold");
  };

  const deleteCard = async (id) => {
    if (!canDelete) return showToast("Only owner/admin can delete cards", "error");
    const card = cards.find((c) => c.id === id);
    const result = await askModal({ title: "Delete item", message: `Delete ${card?.name || "this card"}? This cannot be undone from this screen.`, confirmText: "Delete", danger: true, fields: [{ name: "reason", label: "Reason", placeholder: "Duplicate / wrong entry / other" }] });
    if (!result) return;
    setSaving(true);
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: "DELETE", inventory_id: card?.inventory_id, card_number: card?.card_number, notes: `Deleted card. Before: ${JSON.stringify({ name: card?.name, qty: card?.quantity, cost: card?.cost, price: card?.price, location: card?.storage_location })}. Reason: ${result.reason || "N/A"}` });
    await addTransaction({ inventory_id: card?.inventory_id, card_number: card?.card_number, transaction_type: "DELETE", quantity: -Number(card?.quantity || 0), cost: Number(card?.cost || 0) * Number(card?.quantity || 0), price: Number(card?.price || 0) * Number(card?.quantity || 0), notes: result.reason || "Item deleted from inventory" });
    await refreshAll();
    setSaving(false);
    setSelectedCard(null);
    setTab(DEFAULT_TAB);
    showToast("Item deleted");
  };

  return {
    updateCardStatus,
    deleteCard,
  };
}
