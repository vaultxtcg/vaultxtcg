import { supabase } from "../../../lib/supabase";
import {
  CARD_STATUS_AVAILABLE,
  CARD_STATUS_SOLD,
  DOCUMENT_NUMBER_PAD_LENGTH,
  INVENTORY_ID_PAD_LENGTH,
  INVENTORY_ID_PREFIX,
  TRADE_NUMBER_PREFIX,
} from "../../../config/constants";
import { DEFAULT_LANGUAGE } from "../../../config/languages";
import { DEFAULT_TRADE_CUSTOMER, TRADE_PAYMENT_METHOD } from "../../../config/paymentMethods";
import { money } from "../../../utils/helpers";
import { addActivityLog } from "../../../services/activityService";
import { addTransaction } from "../../../services/transactionService";

export function validateTradeDeal({ inItems, outItems, cards }) {
  if (!inItems.length && !outItems.length) return { success: false, error: "Please add at least one trade item" };
  for (const item of inItems) {
    if (!item.name?.trim()) return { success: false, error: "Trade-in card name is required" };
    if (Number(item.quantity || 0) < 1) return { success: false, error: "Trade-in quantity must be at least 1" };
  }
  for (const item of outItems) {
    const currentCard = cards.find((c) => c.id === item.cardId);
    if (!currentCard) return { success: false, error: "A trade-out card was not found in inventory" };
    if (Number(item.quantity || 0) < 1) return { success: false, error: "Trade-out quantity must be at least 1" };
    if (Number(item.quantity || 0) > Number(currentCard.quantity || 0)) return { success: false, error: `Not enough inventory for ${currentCard.name}` };
  }
  return { success: true };
}

export async function executeTradeDeal({
  companyId,
  userEmail,
  cards,
  customerName,
  customerTel,
  cashDifference,
  notes,
  inItems,
  outItems,
}) {
  const { data: deal, error: dealError } = await supabase.from("trade_deals").insert([{ company_id: companyId, customer_name: customerName || "", customer_tel: customerTel || "", cash_difference: Number(cashDifference || 0), notes: notes || "", created_by: userEmail }]).select().single();
  if (dealError) return { success: false, error: dealError.message };
  const tradeNumber = `${TRADE_NUMBER_PREFIX}${String(deal.id).padStart(DOCUMENT_NUMBER_PAD_LENGTH, "0")}`;
  await supabase.from("trade_deals").update({ trade_number: tradeNumber }).eq("id", deal.id);
  try {
    for (const item of inItems) {
      const quantity = Number(item.quantity || 1);
      const tradeValue = Number(item.tradeValue || 0);
      const listPrice = Number(item.listPrice || tradeValue || 0);
      const cardPayload = { company_id: companyId, name: item.name, category: item.category || "Others", quantity, card_number: item.cardNumber || "", language: item.language || DEFAULT_LANGUAGE, cost: quantity ? tradeValue / quantity : tradeValue, price: listPrice, purchase_date: new Date().toISOString().slice(0, 10), payment_method: TRADE_PAYMENT_METHOD, seller_name: customerName || DEFAULT_TRADE_CUSTOMER, seller_tel: customerTel || "", storage_location: item.location || "", status: CARD_STATUS_AVAILABLE, notes: `${tradeNumber} trade in. ${item.notes || ""}`, created_by: userEmail };
      const { data: newCard, error: cardError } = await supabase.from("cards").insert([cardPayload]).select().single();
      if (cardError) throw cardError;
      const inventoryId = `${INVENTORY_ID_PREFIX}${String(newCard.id).padStart(INVENTORY_ID_PAD_LENGTH, "0")}`;
      await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", newCard.id);
      await supabase.from("trade_items").insert([{ trade_id: deal.id, inventory_id: inventoryId, card_name: item.name, card_number: item.cardNumber || "", quantity, trade_value: tradeValue, direction: "IN" }]);
      await addTransaction(companyId, userEmail, { inventory_id: inventoryId, card_number: item.cardNumber || "", transaction_type: "TRADE_IN", quantity, cost: tradeValue, price: listPrice * quantity, notes: `${tradeNumber} trade in from ${customerName || "customer"}` });
    }
    for (const item of outItems) {
      const currentCard = cards.find((c) => c.id === item.cardId);
      const quantity = Number(item.quantity || 1);
      const tradeValue = Number(item.tradeValue || 0);
      const oldQty = Number(currentCard.quantity || 0);
      const newQty = oldQty - quantity;
      const { error: updateError } = await supabase.from("cards").update({ quantity: newQty, status: newQty === 0 ? CARD_STATUS_SOLD : currentCard.status, updated_by: userEmail }).eq("id", currentCard.id);
      if (updateError) throw updateError;
      await supabase.from("trade_items").insert([{ trade_id: deal.id, inventory_id: currentCard.inventory_id, card_name: currentCard.name, card_number: currentCard.card_number || "", quantity, trade_value: tradeValue, direction: "OUT" }]);
      await addTransaction(companyId, userEmail, { inventory_id: currentCard.inventory_id, card_number: currentCard.card_number, transaction_type: "TRADE_OUT", quantity: -quantity, cost: Number(currentCard.cost || 0) * quantity, price: tradeValue, notes: `${tradeNumber} trade out to ${customerName || "customer"}` });
    }
    const inTotal = inItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
    const outTotal = outItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
    await addActivityLog(companyId, userEmail, { action: "TRADE", inventory_id: tradeNumber, card_number: "MULTI-ITEM", notes: `Trade deal created. In: ${inItems.length} item types / ${money(inTotal)}. Out: ${outItems.length} item types / ${money(outTotal)}. Cash difference: ${money(cashDifference)}. Customer: ${customerName || "N/A"}` });
    return { success: true, tradeNumber };
  } catch (err) {
    return { success: false, error: `Trade failed: ${err.message}` };
  }
}
