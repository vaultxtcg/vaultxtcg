import { FormSection, GameLanguageSelect } from "./Common";

export default function QuickAddCardView({
  form,
  setForm,
  isMobile,
  styles,
  saving,
  handleCostChange,
  setPriceManuallyEdited,
  setFrontFile,
  setBackFile,
  cancelEdit,
  setTab,
  saveCard,
}) {
  const quickCategory = ["Raw Card", "Slab"].includes(form.category) ? form.category : "Raw Card";

  const submitQuickAdd = (e, keepAdding = false) => {
    e.preventDefault();
    const safeCategory = ["Raw Card", "Slab"].includes(form.category) ? form.category : "Raw Card";
    const quickForm = {
      ...form,
      category: safeCategory,
      purchase_date: form.purchase_date || new Date().toISOString().slice(0, 10),
      payment_method: form.payment_method || "Cash",
      status: "Available",
    };
    setForm(quickForm);
    window.setTimeout(() => {
      saveCard(e, { keepAdding, returnTab: "quickAddCard", defaultCategory: safeCategory });
    }, 0);
  };

  return (
    <form onSubmit={(e) => submitQuickAdd(e, false)} style={{ maxWidth: 760 }}>
      <button type="button" onClick={() => { cancelEdit(); setTab("inventory"); }} style={{ ...styles.button, marginBottom: 14 }}>← Back</button>
      <FormSection title="Quick Add Card" styles={styles}>
        <div style={{ ...styles.muted, marginBottom: 12 }}>
          Use this when buying raw cards or slabs from customers at the counter. Keep it fast, then use View Detail later for full edits.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <select
            value={quickCategory}
            onChange={(e) => setForm({
              ...form,
              category: e.target.value,
              slab_company: e.target.value === "Slab" ? form.slab_company : "",
              slab_grade: e.target.value === "Slab" ? form.slab_grade : "",
            })}
            style={styles.input}
          >
            <option value="Raw Card">Raw Card</option>
            <option value="Slab">Slab</option>
          </select>
          <GameLanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} styles={styles} />
        </div>

        <input placeholder={quickCategory === "Slab" ? "Slab Card Name" : "Card Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, category: quickCategory })} style={styles.input} />
        <input placeholder="SKU / Card # e.g. OP13-108" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} style={styles.input} />

        {quickCategory === "Slab" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <select value={form.slab_company || "PSA"} onChange={(e) => setForm({ ...form, slab_company: e.target.value, category: "Slab" })} style={styles.input}>
              <option value="PSA">PSA</option>
              <option value="BGS">BGS</option>
              <option value="CGC">CGC</option>
              <option value="SGC">SGC</option>
              <option value="TAG">TAG</option>
              <option value="Other">Other</option>
            </select>
            <input placeholder="Grade e.g. 10 / 9.5 / 9" value={form.slab_grade || ""} onChange={(e) => setForm({ ...form, slab_grade: e.target.value, category: "Slab" })} style={styles.input} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input type="number" min="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={styles.input} />
          <input placeholder="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={styles.input} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input placeholder="Cost / Trade-in value" value={form.cost} onChange={(e) => handleCostChange(e.target.value)} style={styles.input} />
          <input placeholder="List Price (auto 130% of cost)" value={form.price} onChange={(e) => { setPriceManuallyEdited(true); setForm({ ...form, price: e.target.value }); }} style={styles.input} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input placeholder="Seller Name" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={styles.input} />
          <input placeholder="Seller Tel" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={styles.input} />
        </div>

        <textarea placeholder={quickCategory === "Slab" ? "Notes (grading info is saved automatically)" : "Notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: 80, resize: "vertical" }} />

        <div style={{ ...styles.card, marginTop: 10, background: "#020617" }}>
          <h4 style={{ marginTop: 0 }}>Photos</h4>
          <div style={{ ...styles.muted, marginBottom: 10 }}>Please make sure the picture is clear and in foucus </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <label>Front Image<br /><input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} /></label>
            <label>Back Image<br /><input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} /></label>
          </div>
        </div>
      </FormSection>
      <button disabled={saving} type="submit" style={styles.primary}>{saving ? "Saving..." : "Save"}</button>
      <button disabled={saving} type="button" onClick={(e) => submitQuickAdd(e, true)} style={{ ...styles.button, marginLeft: 10 }}>
        Save & Add Another
      </button>
    </form>
  );
}
