import { supabase } from "../lib/supabase";

export async function addActivityLog(companyId, userEmail, { action, inventory_id, card_number, notes }) {
  const { error } = await supabase.from("activity_log").insert([
    { company_id: companyId, user_email: userEmail, action, inventory_id, card_number, notes },
  ]);
  if (error) console.error("Activity Log Error:", error);
}
