import { FormSection, GameSelect, LanguageSelect, CategorySelect } from "./Common";

function Field({ label, children, styles }) {
  return (
    <label>
      <div style={{ ...styles.muted, marginBottom: 6, fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}

export default function StockInView({
  form,
  setForm,
  editingId,
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
  return (
    <form onSubmit={saveCard} style={{ maxWidth: 900 }}>
      <button type="button" onClick={() => { cancelEdit(); setTab("inventory"); }} style={{ ...styles.button, marginBottom: 14 }}>← Back</button>
      <FormSection title={editingId ? "Edit Item" : "Stock In"} styles={styles}>
        <div style={{ ...styles.muted, marginBottom: 12 }}>
          Use Stock In for sealed, slabs, merchandise, accessories, food & beverage, and full inventory receiving.
        </div>
        <Field label="Item Name" styles={styles}>
          <input placeholder="Product or card name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Category" styles={styles}>
            <CategorySelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} styles={styles} />
          </Field>
          <Field label="Game" styles={styles}>
            <GameSelect value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} styles={styles} />
          </Field>
          <Field label="Language" styles={styles}>
            <LanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} styles={styles} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr", gap: 10 }}>
          <Field label="Quantity" styles={styles}>
            <input type="number" min="1" placeholder="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={styles.input} />
          </Field>
          <Field label="SKU / Card # / Product Code" styles={styles}>
            <input placeholder="SKU / Card # / Product Code" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} style={styles.input} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Pricing & Purchase" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Unit Cost" styles={styles}>
            <input placeholder="0.00" value={form.cost} onChange={(e) => handleCostChange(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Unit Price" styles={styles}>
            <input placeholder="Defaults to 130% of cost" value={form.price} onChange={(e) => { setPriceManuallyEdited(true); setForm({ ...form, price: e.target.value }); }} style={styles.input} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Purchase Date" styles={styles}>
            <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={styles.input} />
          </Field>
          <Field label="Payment Method" styles={styles}>
            <input placeholder="Cash / Trade / Card / Other" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={styles.input} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Vendor / Seller Info" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Vendor / Seller Name" styles={styles}>
            <input placeholder="Customer or supplier" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={styles.input} />
          </Field>
          <Field label="Vendor / Seller Phone" styles={styles}>
            <input placeholder="Phone number" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={styles.input} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Storage & Status" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Storage Location" styles={styles}>
            <input placeholder="Showcase A / Shelf 2 / Binder 3" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={styles.input} />
          </Field>
          <Field label="Status" styles={styles}>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>
              <option value="Available">Available</option><option value="Hold">Hold</option><option value="Others">Others</option>
            </select>
          </Field>
        </div>
        <Field label="Notes" styles={styles}>
          <textarea placeholder="Condition, source, or internal notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
        </Field>
      </FormSection>
      <FormSection title="Images" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <Field label="Front Image" styles={styles}>
            <input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} />
          </Field>
          <Field label="Back Image" styles={styles}>
            <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} />
          </Field>
        </div>
      </FormSection>
      <button disabled={saving} type="submit" style={styles.primary}>{saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}</button>
      {editingId && <button type="button" onClick={cancelEdit} style={{ ...styles.button, marginLeft: 10 }}>Cancel Edit</button>}
    </form>
  );
}
