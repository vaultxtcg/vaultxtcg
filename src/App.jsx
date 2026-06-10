import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const BUCKET_NAME = "TCG images";

const emptyForm = {
  name: "",
  card_number: "",
  card_set: "",
  language: "",
  cost: "",
  price: "",
  purchase_date: "",
  payment_method: "",
  seller_name: "",
  seller_tel: "",
  storage_location: "",
  status: "Available",
  notes: "",
};

export default function App() {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);

  const loadCards = async () => {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setCards(data || []);
  };

  useEffect(() => {
    loadCards();
  }, []);

  const uploadFile = async (cardId, file, side) => {
    if (!file) return null;

    const fileName = `${cardId}-${side}-${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return null;
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const addCard = async (e) => {
    e.preventDefault();

    if (!form.name) {
      alert("Card Name is required");
      return;
    }

    const { data, error } = await supabase
      .from("cards")
      .insert([
        {
          ...form,
          cost: Number(form.cost || 0),
          price: Number(form.price || 0),
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    const frontUrl = await uploadFile(data.id, frontFile, "front");
    const backUrl = await uploadFile(data.id, backFile, "back");

    const updates = {};
    if (frontUrl) updates.front_image = frontUrl;
    if (backUrl) updates.back_image = backUrl;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", data.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }
    }

    setForm(emptyForm);
    setFrontFile(null);
    setBackFile(null);
    loadCards();
  };

  const deleteCard = async (id) => {
    const ok = confirm("Delete this card?");
    if (!ok) return;

    const { error } = await supabase.from("cards").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadCards();
  };

  const filtered = cards.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = cards.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const totalValue = cards.reduce((sum, c) => sum + Number(c.price || 0), 0);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Vault X TCG Inventory</h1>

      <div style={{ marginBottom: 20 }}>
        <b>Total Cards:</b> {cards.length} | <b>Total Cost:</b> ${totalCost} |{" "}
        <b>Total Value:</b> ${totalValue} | <b>Profit:</b> $
        {totalValue - totalCost}
      </div>

      <form onSubmit={addCard} style={{ marginBottom: 30 }}>
        <input placeholder="Card Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Card Number" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} />
        <input placeholder="Set" value={form.card_set} onChange={(e) => setForm({ ...form, card_set: e.target.value })} />
        <input placeholder="Language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        <input placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <input placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
        <input placeholder="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} />
        <input placeholder="Seller Name" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} />
        <input placeholder="Seller Tel" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} />
        <input placeholder="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />

        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>Available</option>
          <option>Hold</option>
          <option>Sold</option>
        </select>

        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div>
          Front Image: <input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} />
        </div>

        <div>
          Back Image: <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} />
        </div>

        <button type="submit">Save Card</button>
      </form>

      <input
        placeholder="Search cards..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 8, marginBottom: 20 }}
      />

      {filtered.map((c) => (
        <div key={c.id} style={{ border: "1px solid #ccc", padding: 15, marginBottom: 15 }}>
          {c.front_image && <img src={c.front_image} alt="front" style={{ width: 140, marginRight: 10 }} />}
          {c.back_image && <img src={c.back_image} alt="back" style={{ width: 140 }} />}

          <h3>{c.name}</h3>
          <div>#{c.card_number}</div>
          <div>Set: {c.card_set}</div>
          <div>Language: {c.language}</div>
          <div>Cost: ${c.cost}</div>
          <div>Price: ${c.price}</div>
          <div>Purchase Date: {c.purchase_date}</div>
          <div>Payment: {c.payment_method}</div>
          <div>Seller: {c.seller_name}</div>
          <div>Seller Tel: {c.seller_tel}</div>
          <div>Location: {c.storage_location}</div>
          <div>Status: {c.status}</div>
          <div>Notes: {c.notes}</div>

          <button onClick={() => deleteCard(c.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}