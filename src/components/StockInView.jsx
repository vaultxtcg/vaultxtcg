import { FormSection, GameLanguageSelect, CategorySelect } from "./Common";

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
          Use Stock In for sealed product, slabs, merchandise, beverages, accessories, and full inventory receiving.
        </div>
        <input placeholder="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <CategorySelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} styles={styles} />
          <GameLanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} styles={styles} />
        </div>
        <input type="number" min="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={styles.input} />
        <input placeholder="SKU / Card # / Product Code" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} style={styles.input} />
      </FormSection>
      <FormSection title="Pricing & Purchase" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input placeholder="Unit Cost" value={form.cost} onChange={(e) => handleCostChange(e.target.value)} style={styles.input} />
          <input placeholder="Unit Price (defaults to 130% of cost)" value={form.price} onChange={(e) => { setPriceManuallyEdited(true); setForm({ ...form, price: e.target.value }); }} style={styles.input} />
        </div>
        <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={styles.input} />
        <input placeholder="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={styles.input} />
      </FormSection>
      <FormSection title="Vendor / Seller Info" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input placeholder="Vendor / Seller Name" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={styles.input} />
          <input placeholder="Vendor / Seller Tel" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={styles.input} />
        </div>
      </FormSection>
      <FormSection title="Storage & Status" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input placeholder="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={styles.input} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>
            <option value="Available">Available</option><option value="Hold">Hold</option><option value="Others">Others</option>
          </select>
        </div>
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
      </FormSection>
      <FormSection title="Images" styles={styles}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <label>Front Image<br /><input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} /></label>
          <label>Back Image<br /><input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} /></label>
        </div>
      </FormSection>
      <button disabled={saving} type="submit" style={styles.primary}>{saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}</button>
      {editingId && <button type="button" onClick={cancelEdit} style={{ ...styles.button, marginLeft: 10 }}>Cancel Edit</button>}
    </form>
  );
}
