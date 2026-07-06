import { supabase } from "../lib/supabase";

export async function addTransaction(companyId, userEmail, { inventory_id, card_number, transaction_type, quantity, cost, price, notes }) {
  const { error } = await supabase.from("inventory_transactions").insert([
    {
      company_id: companyId,
      inventory_id,
      card_number,
      transaction_type,
      quantity: Number(quantity || 0),
      cost: Number(cost || 0),
      price: Number(price || 0),
      notes,
      user_email: userEmail,
    },
  ]);
  if (error) console.error("Transaction Error:", error);
}
