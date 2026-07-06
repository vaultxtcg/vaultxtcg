import { DEFAULT_TAB } from "../../../config/constants";
import { DEFAULT_CATEGORY } from "../../../config/categories";
import { emptyForm } from "../../../utils/helpers";
import { saveCard as saveCardService, validateSaveCard } from "../services/inventoryService";

export function useInventorySave({
  form,
  editingId,
  frontFile,
  backFile,
  companyId,
  user,
  cards,
  showToast,
  setSaving,
  setForm,
  setEditingId,
  setFrontFile,
  setBackFile,
  setPriceManuallyEdited,
  setTab,
  addActivityLog,
  addTransaction,
  refreshAll,
}) {
  const saveCard = async (e, options = {}) => {
    if (e?.preventDefault) e.preventDefault();
    const validation = validateSaveCard(form, companyId);
    if (!validation.success) {
      showToast(validation.error, "error");
      return;
    }
    setSaving(true);
    const result = await saveCardService({
      form,
      editingId,
      frontFile,
      backFile,
      companyId,
      userEmail: user?.email,
      cards,
      options,
      showToast,
      addActivityLog,
      addTransaction,
    });
    if (!result.success) {
      setSaving(false);
      showToast(result.error, "error");
      return;
    }
    setForm({ ...emptyForm, category: options.defaultCategory || DEFAULT_CATEGORY });
    setEditingId(null);
    setFrontFile(null);
    setBackFile(null);
    setPriceManuallyEdited(false);
    await refreshAll();
    setSaving(false);
    if (options.keepAdding) { setTab(options.returnTab || "quickAddCard"); showToast("Item saved. Ready for next item."); }
    else { setTab(DEFAULT_TAB); showToast(result.wasEditing ? "Item updated" : "Item saved"); }
  };

  return {
    saveCard,
  };
}
