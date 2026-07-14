import { FormSection, GameSelect, LanguageSelect } from "./Common";

function Field({ label, children, styles }) {
  return (
    <label>
      <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

const imageAccept = "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif";

function ImageFilePicker({ label, file, onFile, styles }) {
  const handleFile = (event) => {
    const selectedFile = event.currentTarget.files?.[0];
    if (selectedFile) onFile(selectedFile);
    event.currentTarget.value = "";
  };

  return (
    <Field label={label} styles={styles}>
      <input type="file" accept={imageAccept} onChange={handleFile} onInput={handleFile} />
      <div style={{ ...styles.muted, marginTop: 6 }}>{file?.name || "No file selected"}</div>
    </Field>
  );
}

export default function QuickAddCardView({
  form,
  setForm,
  isMobile,
  styles,
  saving,
  handleCostChange,
  setPriceManuallyEdited,
  frontFile,
  backFile,
  setFrontFile,
  setBackFile,
  cancelEdit,
  setTab,
  saveCard,
}) {
  const quickCategory = ["Raw", "Slab"].includes(form.category) ? form.category : "Raw";

  const submitQuickAdd = (e, keepAdding = false) => {
    e.preventDefault();
    const safeCategory = ["Raw", "Slab"].includes(form.category) ? form.category : "Raw";
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

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Category" styles={styles}>
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
              <option value="Raw">Raw</option>
              <option value="Slab">Slab</option>
            </select>
          </Field>
          <Field label="Game" styles={styles}>
            <GameSelect value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} styles={styles} />
          </Field>
          <Field label="Language" styles={styles}>
            <LanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} styles={styles} />
          </Field>
        </div>

        <Field label="Item Name" styles={styles}>
          <input placeholder={quickCategory === "Slab" ? "Slab Card Name" : "Card Name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, category: quickCategory })} style={styles.input} />
        </Field>
        <Field label="SKU / Card #" styles={styles}>
          <input placeholder="OP13-108" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} style={styles.input} />
        </Field>

        {quickCategory === "Slab" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <Field label="Grading Company" styles={styles}>
              <select value={form.slab_company || "PSA"} onChange={(e) => setForm({ ...form, slab_company: e.target.value, category: "Slab" })} style={styles.input}>
                <option value="PSA">PSA</option>
                <option value="BGS">BGS</option>
                <option value="CGC">CGC</option>
                <option value="SGC">SGC</option>
                <option value="TAG">TAG</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Grade" styles={styles}>
              <input placeholder="10 / 9.5 / 9" value={form.slab_grade || ""} onChange={(e) => setForm({ ...form, slab_grade: e.target.value, category: "Slab" })} style={styles.input} />
            </Field>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Quantity" styles={styles}>
            <input type="number" min="1" placeholder="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={styles.input} />
          </Field>
          <Field label="Storage Location" styles={styles}>
            <input placeholder="Showcase A / Binder 3" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={styles.input} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Cost / Trade-In Value" styles={styles}>
            <input placeholder="0.00" value={form.cost} onChange={(e) => handleCostChange(e.target.value)} style={styles.input} />
          </Field>
          <Field label="List Price" styles={styles}>
            <input placeholder="Auto 130% of cost" value={form.price} onChange={(e) => { setPriceManuallyEdited(true); setForm({ ...form, price: e.target.value }); }} style={styles.input} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Seller Name" styles={styles}>
            <input placeholder="Customer / Vendor" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={styles.input} />
          </Field>
          <Field label="Seller Phone" styles={styles}>
            <input placeholder="Phone number" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={styles.input} />
          </Field>
        </div>

        <Field label="Notes" styles={styles}>
          <textarea placeholder={quickCategory === "Slab" ? "Grading info is saved automatically" : "Condition, source, or counter notes"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: 80, resize: "vertical" }} />
        </Field>

        <div style={{ ...styles.card, marginTop: 10, background: "#0b1220" }}>
          <h4 style={{ marginTop: 0 }}>Photos</h4>
          <div style={{ ...styles.muted, marginBottom: 10 }}>Use clear front and back photos for faster identification.</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <ImageFilePicker label="Front Image" file={frontFile} onFile={setFrontFile} styles={styles} />
            <ImageFilePicker label="Back Image" file={backFile} onFile={setBackFile} styles={styles} />
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
