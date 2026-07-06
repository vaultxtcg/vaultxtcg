import { CARD_STATUS_AVAILABLE } from "../../config/constants";
import { DEFAULT_CATEGORY } from "../../config/categories";
import { DEFAULT_LANGUAGE } from "../../config/languages";
import { emptyForm } from "../../utils/helpers";

export function useInventoryEditor({
  editingId,
  priceManuallyEdited,
  setEditingId,
  setPriceManuallyEdited,
  setForm,
  setFrontFile,
  setBackFile,
  setSelectedCard,
  setTab,
}) {
  const handleCostChange = (value) => {
    const costNum = Number(value || 0);
    setForm((prev) => ({ ...prev, cost: value, price: !editingId && !priceManuallyEdited ? (costNum ? (costNum * 1.3).toFixed(2) : "") : prev.price }));
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setPriceManuallyEdited(true);
    setForm({ name: card.name || "", category: card.category || DEFAULT_CATEGORY, slab_company: "", slab_grade: "", quantity: card.quantity || 1, card_number: card.card_number || "", language: card.language || DEFAULT_LANGUAGE, cost: card.cost || "", price: card.price || "", purchase_date: card.purchase_date || "", payment_method: card.payment_method || "", seller_name: card.seller_name || "", seller_tel: card.seller_tel || "", storage_location: card.storage_location || "", status: card.status || CARD_STATUS_AVAILABLE, notes: card.notes || "" });
    setSelectedCard(null);
    setTab("stockIn");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setFrontFile(null); setBackFile(null); setPriceManuallyEdited(false); };

  return {
    startEdit,
    cancelEdit,
    handleCostChange,
  };
}
