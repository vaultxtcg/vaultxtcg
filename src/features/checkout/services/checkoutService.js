import { supabase } from "../../../lib/supabase";
import {
  CARD_STATUS_SOLD,
  DEFAULT_WALK_IN_CUSTOMER,
  DOCUMENT_NUMBER_PAD_LENGTH,
  SALE_NUMBER_PREFIX,
} from "../../../config/constants";
import { DEFAULT_PAYMENT_METHOD } from "../../../config/paymentMethods";
import { money } from "../../../utils/helpers";
import { addActivityLog } from "../../../services/activityService";
import { addTransaction } from "../../../services/transactionService";

async function upsertCustomer({ companyId, userEmail, customers, name, tel, totalSpendDelta = 0, storeCreditDelta = 0 }) {
  const cleanName = (name || "").trim();
  const cleanTel = (tel || "").trim();
  if (!cleanName && !cleanTel) return null;
  const existing = customers.find((c) => (cleanTel && c.tel === cleanTel) || (cleanName && c.name?.toLowerCase() === cleanName.toLowerCase()));
  if (existing) {
    const updatePayload = {
      name: cleanName || existing.name,
      tel: cleanTel || existing.tel,
      total_spend: Number(existing.total_spend || 0) + Number(totalSpendDelta || 0),
      store_credit: Number(existing.store_credit || 0) + Number(storeCreditDelta || 0),
      updated_at: new Date().toISOString(),
    };
    await supabase.from("customers").update(updatePayload).eq("id", existing.id);
    return { ...existing, ...updatePayload };
  }
  const { data, error } = await supabase.from("customers").insert([{
    company_id: companyId, name: cleanName || DEFAULT_WALK_IN_CUSTOMER, tel: cleanTel,
    total_spend: Number(totalSpendDelta || 0), store_credit: Number(storeCreditDelta || 0), created_by: userEmail,
  }]).select().single();
  if (error) { console.error("Customer upsert error:", error); return null; }
  return data;
}

export function validateCheckout({ cart, cards }) {
  if (!cart.length) return { success: false, error: "Cart is empty" };
  for (const item of cart) {
    const currentCard = cards.find((c) => c.id === item.cardId);
    if (!currentCard) return { success: false, error: `${item.name} not found` };
    if (Number(item.quantity || 0) > Number(currentCard.quantity || 0)) return { success: false, error: `Not enough inventory for ${item.name}` };
  }
  return { success: true };
}

export async function executeCheckout({
  companyId,
  userEmail,
  customers,
  cards,
  cart,
  cartSubtotal,
  cartDiscountAmount,
  cartTax,
  cartTotal,
  cartTaxEnabled,
  cartTaxRate,
  cartDiscountType,
  cartDiscountValue,
  modalResult,
}) {
  const result = modalResult;
  const storeCreditUsed = Number(result.storeCreditUsed || 0);
  const finalTotal = Math.max(0, cartTotal - storeCreditUsed);
  const customer = await upsertCustomer({ companyId, userEmail, customers, name: result.customerName, tel: result.customerTel, totalSpendDelta: finalTotal, storeCreditDelta: -storeCreditUsed });
  const { data: sale, error: saleError } = await supabase.from("sales").insert([{
    company_id: companyId, customer_id: customer?.id || null,
    customer_name: result.customerName || DEFAULT_WALK_IN_CUSTOMER, customer_tel: result.customerTel || "",
    subtotal: cartSubtotal, tax: cartTax, total: finalTotal, store_credit_used: storeCreditUsed,
    payment_method: result.paymentMethod || DEFAULT_PAYMENT_METHOD,
    notes: `${result.notes || ""}${result.notes ? " | " : ""}Discount: ${money(cartDiscountAmount)} (${cartDiscountType}${cartDiscountValue || 0}); Tax ${cartTaxEnabled ? "ON" : "OFF"} @ ${cartTaxRate}%`,
    created_by: userEmail,
  }]).select().single();
  if (saleError) return { success: false, error: saleError.message };
  const saleNumber = `${SALE_NUMBER_PREFIX}${String(sale.id).padStart(DOCUMENT_NUMBER_PAD_LENGTH, "0")}`;
  await supabase.from("sales").update({ sale_number: saleNumber }).eq("id", sale.id);
  try {
    for (const item of cart) {
      const currentCard = cards.find((c) => c.id === item.cardId);
      const oldQty = Number(currentCard.quantity || 0);
      const newQty = oldQty - Number(item.quantity || 0);
      const { error: updateError } = await supabase.from("cards").update({
        quantity: newQty, status: newQty === 0 ? CARD_STATUS_SOLD : currentCard.status,
        sold_price: Number(currentCard.sold_price || 0) + Number(item.unitPrice || 0) * Number(item.quantity || 0),
        sold_date: new Date().toISOString().slice(0, 10), receiving_method: result.paymentMethod || DEFAULT_PAYMENT_METHOD,
        sold_by: userEmail, updated_by: userEmail,
      }).eq("id", currentCard.id);
      if (updateError) throw updateError;
      await supabase.from("sale_items").insert([{
        sale_id: sale.id, inventory_id: item.inventoryId, card_name: item.name, card_number: item.cardNumber || "",
        quantity: Number(item.quantity || 0), unit_price: Number(item.unitPrice || 0),
        total_price: Number(item.unitPrice || 0) * Number(item.quantity || 0), cost: Number(item.cost || 0) * Number(item.quantity || 0),
      }]);
      await addTransaction(companyId, userEmail, { inventory_id: item.inventoryId, card_number: item.cardNumber, transaction_type: "SELL", quantity: -Number(item.quantity || 0), cost: Number(item.cost || 0) * Number(item.quantity || 0), price: Number(item.unitPrice || 0) * Number(item.quantity || 0), notes: `${saleNumber} checkout via ${result.paymentMethod || DEFAULT_PAYMENT_METHOD}` });
    }
    await addActivityLog(companyId, userEmail, { action: "SOLD", inventory_id: saleNumber, card_number: "MULTI-ITEM", notes: `Checkout completed. Items: ${cart.length}. Subtotal: ${money(cartSubtotal)}. Discount: ${money(cartDiscountAmount)}. Tax: ${money(cartTax)}. Total: ${money(finalTotal)}. Payment: ${result.paymentMethod || DEFAULT_PAYMENT_METHOD}` });
    const receipt = { sale_number: saleNumber, created_at: new Date().toISOString(), items: cart, subtotal: cartSubtotal, discount: cartDiscountAmount, tax_enabled: cartTaxEnabled, tax_rate: cartTaxRate, tax: cartTax, store_credit_used: storeCreditUsed, total: finalTotal, payment_method: result.paymentMethod || DEFAULT_PAYMENT_METHOD, customer_name: result.customerName || DEFAULT_WALK_IN_CUSTOMER };
    return { success: true, saleNumber, receipt };
  } catch (err) {
    return { success: false, error: `Checkout failed: ${err.message}` };
  }
}
