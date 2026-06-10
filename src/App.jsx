import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const BUCKET_NAME = "TCG images";

const emptyForm = {
  name: "",
  category: "Pokemon",
  card_number: "",
  language: "English",
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
  const [activityLogs, setActivityLogs] = useState([]);
  const [tab, setTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
const [user, setUser] = useState(null);
const [authMode, setAuthMode] = useState("login");
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
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
  const loadActivityLogs = async () => {
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setActivityLogs(data || []);
  };

  useEffect(() => {
    loadActivityLogs();
    loadCards();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
  
    return () => subscription.unsubscribe();
  }, []);
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    alert("Account created");
  };
  
  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
  
    if (error) {
      alert(error.message);
    }
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
  };
    const addActivityLog = async ({
      action,
      inventory_id,
      card_number,
      notes,
    }) => {
      const { error } = await supabase.from("activity_log").insert([
        {
          user_email: user?.email,
          action,
          inventory_id,
          card_number,
          notes,
        },
      ]);
    
      if (error) {
        console.error("Activity Log Error:", error);
      }
    };
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

  const saveCard = async (e) => {
    e.preventDefault();
  
    if (!form.name) {
      alert("Character Name is required");
      return;
    }
  
    const { id, ...formWithoutId } = form;
  
    const payload = {
      ...formWithoutId,
      cost: Number(form.cost || 0),
      price: Number(form.price || 0),
    };
  
    let cardId = editingId;
  
    if (editingId) {
      payload.updated_by = user?.email;
  
      const currentCard = cards.find((c) => c.id === editingId);
  
      const { error } = await supabase
        .from("cards")
        .update(payload)
        .eq("id", editingId);
  
      if (error) {
        alert(error.message);
        return;
      }
  
      await addActivityLog({
        action: "EDIT",
        inventory_id: currentCard?.inventory_id,
        card_number: payload.card_number,
        notes: "Card information updated",
      });
    } else {
      payload.created_by = user?.email;
  
      const { data, error } = await supabase
        .from("cards")
        .insert([payload])
        .select()
        .single();
  
      if (error) {
        alert(error.message);
        return;
      }
  
      cardId = data.id;
  
      const inventoryId = `VX-${String(data.id).padStart(6, "0")}`;
  
      await supabase
        .from("cards")
        .update({ inventory_id: inventoryId })
        .eq("id", data.id);
  
      await addActivityLog({
        action: "ADD",
        inventory_id: inventoryId,
        card_number: payload.card_number,
        notes: "Added card to inventory",
      });
    }
  
    const frontUrl = await uploadFile(cardId, frontFile, "front");
    const backUrl = await uploadFile(cardId, backFile, "back");
  
    const updates = {};
    if (frontUrl) updates.front_image = frontUrl;
    if (backUrl) updates.back_image = backUrl;
  
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId);
  
      if (error) {
        alert(error.message);
        return;
      }
    }
  
    setSuccessMessage("Card saved successfully!");
  
    setForm(emptyForm);
    setEditingId(null);
    setFrontFile(null);
    setBackFile(null);
    loadCards();
    loadActivityLogs();
    setTab("inventory");
  };

  const startEdit = (card) => {
    setEditingId(card.id);

    setForm({
      name: card.name || "",
      category: card.category || "Pokemon",
      card_number: card.card_number || "",
      language: card.language || "English",
      cost: card.cost || "",
      price: card.price || "",
      purchase_date: card.purchase_date || "",
      payment_method: card.payment_method || "",
      seller_name: card.seller_name || "",
      seller_tel: card.seller_tel || "",
      storage_location: card.storage_location || "",
      status: card.status || "Available",
      notes: card.notes || "",
    });

    setTab("stockIn");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFrontFile(null);
    setBackFile(null);
  };

  const markAsSold = async (card) => {
    const sold_price = Number(prompt("Sold Price?") || 0);
    if (!sold_price) return;

    const sold_date = prompt(
      "Sold Date? YYYY-MM-DD",
      new Date().toISOString().slice(0, 10)
    );
    if (!sold_date) return;

    const receiving_method =
      prompt("Receiving Method? Cash / Zelle / Venmo / Card / Others") || "";

    const { error } = await supabase
      .from("cards")
      .update({
        status: "Sold",
        sold_price,
        sold_date,
        receiving_method,
        sold_by: user?.email,
      })
      .eq("id", card.id);

    if (error) {
      alert(error.message);
      return;
    }
    
    await addActivityLog({
      action: "SOLD",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Sold for $${sold_price} via ${receiving_method}`,
    });
    
    loadCards();
  };

  const deleteCard = async (id) => {
    const ok = confirm("Delete this card?");
    if (!ok) return;
    const card = cards.find((c) => c.id === id);

    const { error } = await supabase.from("cards").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }
    await addActivityLog({
      action: "DELETE",
      inventory_id: card?.inventory_id,
      card_number: card?.card_number,
      notes: "Card deleted from inventory",
    });
    
    loadActivityLogs();

    loadCards();
  };

  const filtered = cards.filter((c) => {
    const keyword = search.toLowerCase();

    const matchSearch =
      (c.name || "").toLowerCase().includes(keyword) ||
      (c.category || "").toLowerCase().includes(keyword) ||
      (c.card_number || "").toLowerCase().includes(keyword);

    if (tab === "inventory") {
      return matchSearch && c.status !== "Sold";
    }

    if (tab === "sold") {
      return matchSearch && c.status === "Sold";
    }

    return matchSearch;
  });

  const inventoryCards = cards.filter((c) => c.status !== "Sold");
  const soldCards = cards.filter((c) => c.status === "Sold");

  const totalCost = inventoryCards.reduce(
    (sum, c) => sum + Number(c.cost || 0),
    0
  );

  const totalValue = inventoryCards.reduce(
    (sum, c) => sum + Number(c.price || 0),
    0
  );

  const soldRevenue = soldCards.reduce(
    (sum, c) => sum + Number(c.sold_price || 0),
    0
  );

  const soldCost = soldCards.reduce(
    (sum, c) => sum + Number(c.cost || 0),
    0
  );

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Vault X TCG Login</h1>
  
        <input
          placeholder="Email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
        />
  
        <input
          placeholder="Password"
          type="password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          style={{ marginLeft: 10 }}
        />
  
        <div style={{ marginTop: 15 }}>
          {authMode === "login" ? (
            <button onClick={login}>Login</button>
          ) : (
            <button onClick={signUp}>Create Account</button>
          )}
  
          <button
            onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            style={{ marginLeft: 10 }}
          >
            {authMode === "login" ? "Need an account?" : "Already have an account?"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Vault X TCG Inventory</h1>
      {successMessage && (
  <div style={{ padding: 10, marginBottom: 15, background: "#d1fae5" }}>
    {successMessage}
  </div>
)}
      <div style={{ marginBottom: 20 }}>
        <b>Current Inventory:</b> {inventoryCards.length} |{" "}
        <b>Inventory Cost:</b> ${totalCost} |{" "}
        <b>Inventory Value:</b> ${totalValue} |{" "}
        <b>Sold Revenue:</b> ${soldRevenue} |{" "}
        <b>Realized Profit:</b> ${soldRevenue - soldCost}
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab("inventory")}>Inventory</button>

        <button
          onClick={() => setTab("stockIn")}
          style={{ marginLeft: 10 }}
        >
          Stock In
        </button>
        <button
  onClick={() => setTab("activityLogs")}
  style={{ marginLeft: 10 }}
>
  Activity Logs
</button>

        <button onClick={() => setTab("sold")} style={{ marginLeft: 10 }}>
          Sales History
        </button>
      </div>

      {tab === "stockIn" && (
        <>
          <h2>{editingId ? "Edit Card" : "Add Card"}</h2>

          <form onSubmit={saveCard} style={{ marginBottom: 30 }}>
            <input
              placeholder="Character Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value })
              }
            >
              <option value="Pokemon">Pokemon</option>
              <option value="One Piece">One Piece</option>
              <option value="Others">Others</option>
            </select>

            <input
              placeholder="Card Number / ID e.g. OP13-108"
              value={form.card_number}
              onChange={(e) =>
                setForm({ ...form, card_number: e.target.value })
              }
            />

            <select
              value={form.language}
              onChange={(e) =>
                setForm({ ...form, language: e.target.value })
              }
            >
              <option value="English">English</option>
              <option value="简中">简中</option>
              <option value="繁中">繁中</option>
              <option value="Others">Others</option>
            </select>

            <input
              placeholder="Cost"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />

            <input
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />

            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) =>
                setForm({ ...form, purchase_date: e.target.value })
              }
            />

            <input
              placeholder="Payment Method"
              value={form.payment_method}
              onChange={(e) =>
                setForm({ ...form, payment_method: e.target.value })
              }
            />

            <input
              placeholder="Seller Name"
              value={form.seller_name}
              onChange={(e) =>
                setForm({ ...form, seller_name: e.target.value })
              }
            />

            <input
              placeholder="Seller Tel"
              value={form.seller_tel}
              onChange={(e) =>
                setForm({ ...form, seller_tel: e.target.value })
              }
            />

            <input
              placeholder="Storage Location"
              value={form.storage_location}
              onChange={(e) =>
                setForm({ ...form, storage_location: e.target.value })
              }
            />

            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value })
              }
            >
              <option value="Available">Available</option>
              <option value="Hold">Hold</option>
              <option value="Others">Others</option>
            </select>

            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div>
              Front Image:{" "}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFrontFile(e.target.files[0])}
              />
            </div>

            <div>
              Back Image:{" "}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackFile(e.target.files[0])}
              />
            </div>

            <button type="submit">
              {editingId ? "Update Card" : "Save Card"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{ marginLeft: 10 }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </>
      )}
            {tab === "activityLogs" && (
        <div>
          <h2>Activity Logs</h2>

          {activityLogs.map((log) => (
            <div
              key={log.id}
              style={{
                border: "1px solid #ccc",
                padding: 15,
                marginBottom: 15,
              }}
            >
              <div>Time: {new Date(log.created_at).toLocaleString()}</div>
              <div>User: {log.user_email}</div>
              <div>Action: {log.action}</div>
              <div>Inventory ID: {log.inventory_id}</div>
              <div>Card Number: {log.card_number}</div>
              <div>Notes: {log.notes}</div>
            </div>
          ))}
        </div>
      )}
      {tab !== "activityLogs" && (
  <>
      <input
        placeholder="Search character, category, card number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: 8, marginBottom: 20, width: 360 }}
      />

      {filtered.map((c) => (
        <div
          key={c.id}
          style={{ border: "1px solid #ccc", padding: 15, marginBottom: 15 }}
        >
          {c.front_image && (
            <img
              src={c.front_image}
              alt="front"
              style={{ width: 140, marginRight: 10 }}
            />
          )}

          {c.back_image && (
            <img src={c.back_image} alt="back" style={{ width: 140 }} />
          )}

          <h3>{c.name}</h3>
          <div>Inventory ID: {c.inventory_id || "N/A"}</div>
          <div>Category: {c.category}</div>
          <div>Card Number / ID: {c.card_number}</div>
          <div>Language: {c.language}</div>
          <div>Cost: ${c.cost}</div>
          <div>Price: ${c.price}</div>
          <div>Purchase Date: {c.purchase_date}</div>
          <div>Payment: {c.payment_method}</div>
          <div>Seller: {c.seller_name}</div>
          <div>Seller Tel: {c.seller_tel}</div>
          <div>Location: {c.storage_location}</div>
          <div>Status: {c.status}</div>

          {c.status === "Sold" && (
            <>
              <div>Sold Price: ${c.sold_price}</div>
              <div>Sold Date: {c.sold_date}</div>
              <div>Receiving Method: {c.receiving_method}</div>
              <div>Profit: ${Number(c.sold_price || 0) - Number(c.cost || 0)}</div>
            </>
          )}

          <div>Notes: {c.notes}</div>

          {c.status !== "Sold" && (
            <>
              <button onClick={() => startEdit(c)}>Edit</button>
              <button onClick={() => markAsSold(c)} style={{ marginLeft: 10 }}>
                Mark Sold
              </button>
            </>
          )}

          <button onClick={() => deleteCard(c.id)} style={{ marginLeft: 10 }}>
            Delete
          </button>
        </div>
      ))}
          </>
  )}
    </div>
  );
}