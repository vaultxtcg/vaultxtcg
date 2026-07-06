import { useState } from "react";
import { SearchInput } from "./Common";
import { money } from "../utils/helpers";

export default function CustomersView({
  customers,
  isMobile,
  styles,
  askModal,
  showToast,
  setSaving,
  supabase,
  companyId,
  user,
  addActivityLog,
  refreshCustomers,
}) {
  const [customerSearch, setCustomerSearch] = useState("");
  const shownCustomers = customers.filter((c) => {
    const kw = customerSearch.toLowerCase().trim();
    if (!kw) return true;
    return [c.name, c.tel, c.email, c.notes].some((v) => String(v || "").toLowerCase().includes(kw));
  });

  const addCustomer = async () => {
    const result = await askModal({
      title: "Add customer",
      confirmText: "Save Customer",
      fields: [
        { name: "name", label: "Name" },
        { name: "tel", label: "Tel" },
        { name: "email", label: "Email" },
        { name: "storeCredit", label: "Store Credit", type: "number", defaultValue: 0 },
        { name: "notes", label: "Notes" },
      ],
    });
    if (!result) return;
    setSaving(true);
    const { error } = await supabase.from("customers").insert([{
      company_id: companyId,
      name: result.name || "Unnamed Customer",
      tel: result.tel || "",
      email: result.email || "",
      store_credit: Number(result.storeCredit || 0),
      notes: result.notes || "",
      created_by: user?.email,
    }]);
    setSaving(false);
    if (error) return showToast(error.message, "error");
    await refreshCustomers();
    showToast("Customer saved");
  };

  const adjustCredit = async (customer) => {
    const result = await askModal({
      title: "Adjust store credit",
      message: `${customer.name} · Current credit: ${money(customer.store_credit)}`,
      confirmText: "Update Credit",
      fields: [
        { name: "change", label: "Credit Change (+ or -)", type: "number", defaultValue: 0 },
        { name: "reason", label: "Reason" },
      ],
    });
    if (!result) return;
    setSaving(true);
    const newCredit = Number(customer.store_credit || 0) + Number(result.change || 0);
    const { error } = await supabase.from("customers").update({ store_credit: newCredit, updated_at: new Date().toISOString() }).eq("id", customer.id);
    if (!error) {
      await addActivityLog({ action: "STORE_CREDIT", inventory_id: `C-${customer.id}`, card_number: "CUSTOMER", notes: `${customer.name}: ${money(customer.store_credit)} → ${money(newCredit)}. ${result.reason || ""}` });
    }
    setSaving(false);
    if (error) return showToast(error.message, "error");
    await refreshCustomers();
    showToast("Store credit updated");
  };

  return (
    <div>
      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <SearchInput placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} styles={styles} />
          </div>
          <button type="button" style={styles.primary} onClick={addCustomer}>+ Add Customer</button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {shownCustomers.length === 0 && <div style={styles.card}>No customers found.</div>}
        {shownCustomers.map((customer) => (
          <div key={customer.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>{customer.name}</h3>
                <div style={styles.muted}>{customer.tel || "No tel"} · {customer.email || "No email"}</div>
              </div>
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <div>Total Spend: <b>{money(customer.total_spend)}</b></div>
                <div>Store Credit: <b>{money(customer.store_credit)}</b></div>
              </div>
            </div>
            {customer.notes && <div style={{ ...styles.muted, marginTop: 8 }}>Notes: {customer.notes}</div>}
            <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => adjustCredit(customer)}>Adjust Store Credit</button>
          </div>
        ))}
      </div>
    </div>
  );
}
