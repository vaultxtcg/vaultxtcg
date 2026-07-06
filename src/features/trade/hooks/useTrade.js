import { validateTradeDeal, executeTradeDeal } from "../services/tradeService";

export function useTrade({
  cards,
  companyId,
  user,
  canTrade,
  showToast,
  setSaving,
  setTab,
  refreshAll,
}) {
  const createTradeDeal = async ({ customerName, customerTel, cashDifference, notes, inItems, outItems }) => {
    if (!canTrade) return showToast("Only owner/admin can create trades", "error");
    if (!companyId) return showToast("Company ID not found. Please log in again.", "error");
    const validation = validateTradeDeal({ inItems, outItems, cards });
    if (!validation.success) return showToast(validation.error, "error");
    setSaving(true);
    const tradeResult = await executeTradeDeal({
      companyId,
      userEmail: user?.email,
      cards,
      customerName,
      customerTel,
      cashDifference,
      notes,
      inItems,
      outItems,
    });
    if (!tradeResult.success) {
      setSaving(false);
      showToast(tradeResult.error, "error");
      return;
    }
    await refreshAll();
    setSaving(false);
    showToast(`Trade ${tradeResult.tradeNumber} created`);
    setTab("trades");
  };

  return {
    createTradeDeal,
  };
}
