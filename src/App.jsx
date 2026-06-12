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
  const [selectedCard, setSelectedCard] = useState(null);
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

  const [companyName, setCompanyName] = useState("");


  const [isMobile, setIsMobile] = useState(
    window.innerWidth <= 600
  );
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
  
    window.addEventListener("resize", handleResize);
  
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const [companyId, setCompanyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  const loadCompany = async (currentUser) => {
    if (!currentUser) return null;
  
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", currentUser.id)
      .single();
  
    if (error) {
      alert("No company found for this user.");
      return null;
    }
  
    setCompanyId(data.company_id);
    setUserRole(data.role);
  
    return data.company_id;
  };
  
  const loadCards = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
  
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("id", { ascending: false });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setCards(data || []);
  };
  
  const loadActivityLogs = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
  
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setActivityLogs(data || []);
  };
  
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
  
      if (data.user) {
        setUser(data.user);
  
        const currentCompanyId = await loadCompany(data.user);
  
        if (currentCompanyId) {
          loadCards(currentCompanyId);
          loadActivityLogs(currentCompanyId);
        }
      }
    };
  
    init();
  
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
  
      if (session?.user) {
        const currentCompanyId = await loadCompany(session.user);
  
        if (currentCompanyId) {
          loadCards(currentCompanyId);
          loadActivityLogs(currentCompanyId);
        }
      } else {
        setCompanyId(null);
        setUserRole(null);
        setCards([]);
        setActivityLogs([]);
      }
    });
  
    return () => subscription.unsubscribe();
  }, []);

  
  const signUp = async () => {
    if (!companyName.trim()) {
      alert("Please enter company name");
      return;
    }
  
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
  
    if (error) {
      alert(error.message);
      return;
    }
  
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
  
    if (loginError) {
      alert(loginError.message);
      return;
    }
  
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();
  
    if (userError || !currentUser) {
      alert("Account created, but user session was not found.");
      return;
    }
  
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert([{ name: companyName }])
      .select()
      .single();
  
    if (companyError) {
      alert(companyError.message);
      return;
    }
  
    const { error: memberError } = await supabase
      .from("company_members")
      .insert([
        {
          company_id: companyData.id,
          user_id: currentUser.id,
          role: "owner",
        },
      ]);
  
    if (memberError) {
      alert(memberError.message);
      return;
    }
  
    setCompanyId(companyData.id);
    setUserRole("owner");
    setUser(currentUser);
  
    alert("Company created successfully!");
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
          company_id: companyId,
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
      company_id: companyId,
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
  
    alert("Card saved successfully!");
  
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
    loadActivityLogs();
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

  const downloadCSV = (filename, headers, rows) => {
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
  
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  
    URL.revokeObjectURL(url);
  };
  
  const exportInventoryCSV = () => {
    const headers = [
      "inventory_id",
      "name",
      "category",
      "card_number",
      "language",
      "cost",
      "price",
      "status",
      "purchase_date",
      "payment_method",
      "seller_name",
      "storage_location",
      "created_by",
      "updated_by",
    ];
  
    downloadCSV(
      "vaultxtcg_inventory.csv",
      headers,
      cards.filter((c) => c.status !== "Sold")
    );
  };
  
  const exportSalesCSV = () => {
    const headers = [
      "inventory_id",
      "name",
      "category",
      "card_number",
      "cost",
      "sold_price",
      "sold_date",
      "receiving_method",
      "sold_by",
    ];
  
    downloadCSV(
      "vaultxtcg_sales.csv",
      headers,
      cards.filter((c) => c.status === "Sold")
    );
  };
  
  const exportActivityLogCSV = () => {
    const headers = [
      "created_at",
      "user_email",
      "action",
      "inventory_id",
      "card_number",
      "notes",
    ];
  
    downloadCSV("vaultxtcg_activity_log.csv", headers, activityLogs);
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
  const sectionStyle = {
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    background: "rgba(255,255,255,0.03)",
  };
  
  const sectionTitleStyle = {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 20,
  };
  
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    marginBottom: 10,
  };

  if (!user) {
    return (
      <div style={{ padding: isMobile ? 12 : 20, fontFamily: "Arial", maxWidth: "100%", boxSizing: "border-box" }}>
        <h1>Vault X TCG Login</h1>
        {authMode === "signup" && (
  <input
    placeholder="Company Name"
    value={companyName}
    onChange={(e) => setCompanyName(e.target.value)}
    style={inputStyle}
  />
)}

        <input
          placeholder="Email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Password"
          type="password"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          style={inputStyle}
        />

        <div style={{ marginTop: 10 }}>
          {authMode === "login" ? (
            <button onClick={signIn}>Login</button>          ) : (
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
    <div style={{ padding: isMobile ? 12 : 20, fontFamily: "Arial", maxWidth: "100%", boxSizing: "border-box" }}>
      <h1>Vault X TCG</h1>

      {successMessage && (
        <div style={{ padding: 10, marginBottom: 15, background: "#d1fae5", color: "#064e3b", borderRadius: 8 }}>
          {successMessage}
        </div>
      )}

      {tab === "inventory" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
            <div style={sectionStyle}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Inventory</div>
              <div style={{ fontSize: 22, fontWeight: "bold" }}>{inventoryCards.length}</div>
            </div>

            <div style={sectionStyle}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Cost</div>
              <div style={{ fontSize: 22, fontWeight: "bold" }}>${Number(totalCost || 0).toLocaleString()}</div>
            </div>

            <div style={sectionStyle}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Sold Revenue</div>
              <div style={{ fontSize: 22, fontWeight: "bold" }}>${Number(soldRevenue || 0).toLocaleString()}</div>
            </div>

            <div style={sectionStyle}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>Realized Profit</div>
              <div style={{ fontSize: 22, fontWeight: "bold" }}>${Number(soldRevenue - soldCost || 0).toLocaleString()}</div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <button onClick={() => setTab("stockIn")} style={{ fontSize: 16, padding: "10px 16px" }}>
              ➕ Add Card
            </button>

            <button onClick={() => setTab("reports")} style={{ marginLeft: 10 }}>
              📊 Reports
            </button>

            <button onClick={() => setTab("activityLogs")} style={{ marginLeft: 10 }}>
              📋 Activity Logs
            </button>
          </div>
        </>
      )}

      {tab === "stockIn" && (
        <>
          <button
            type="button"
            onClick={() => {
              cancelEdit();
              setTab("inventory");
            }}
            style={{ marginBottom: 15 }}
          >
            ← Back
          </button>

          <h2 style={{ marginTop: 0 }}>{editingId ? "Edit Card" : "Add Card"}</h2>

          <form onSubmit={saveCard} style={{ marginBottom: 60, maxWidth: 720, width: "100%", boxSizing: "border-box" }}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Basic Info</h3>

              <input
                placeholder="Character Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={inputStyle}
              />

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  <option value="Pokemon">Pokemon</option>
                  <option value="One Piece">One Piece</option>
                  <option value="Others">Others</option>
                </select>

                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} style={inputStyle}>
                  <option value="English">English</option>
                  <option value="简中">简中</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <input
                placeholder="Card Number / ID e.g. OP13-108"
                value={form.card_number}
                onChange={(e) => setForm({ ...form, card_number: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Purchase Info</h3>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <input placeholder="Cost" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} style={inputStyle} />
              </div>

              <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={inputStyle} />
              <input placeholder="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={inputStyle} />
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Seller Info</h3>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <input placeholder="Seller Name" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={inputStyle} />
                <input placeholder="Seller Tel" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Storage</h3>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <input placeholder="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={inputStyle} />

                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  <option value="Available">Available</option>
                  <option value="Hold">Hold</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Images</h3>

              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 6 }}>Front Image</div>
                <input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files[0])} />
              </div>

              <div>
                <div style={{ marginBottom: 6 }}>Back Image</div>
                <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files[0])} />
              </div>
            </div>

            <button type="submit">{editingId ? "Update Card" : "Save Card"}</button>

            {editingId && (
              <button type="button" onClick={cancelEdit} style={{ marginLeft: 10 }}>
                Cancel Edit
              </button>
            )}
          </form>
        </>
      )}

      {tab === "reports" && (
        <div style={{ marginBottom: 30 }}>
          <button type="button" onClick={() => setTab("inventory")} style={{ marginBottom: 15 }}>
            ← Back
          </button>

          <h2>Reports</h2>

          <div style={{ marginBottom: 15 }}>
            <button onClick={exportInventoryCSV}>Export Inventory CSV</button>
            <button onClick={exportSalesCSV} style={{ marginLeft: 10 }}>Export Sales CSV</button>
            <button onClick={exportActivityLogCSV} style={{ marginLeft: 10 }}>Export Activity Log CSV</button>
          </div>

          <div style={sectionStyle}>
            <div>Current Inventory Count: {inventoryCards.length}</div>
            <div>Inventory Cost: ${Number(totalCost || 0).toLocaleString()}</div>
            <div>Sold Count: {soldCards.length}</div>
            <div>Sold Revenue: ${Number(soldRevenue || 0).toLocaleString()}</div>
            <div>Realized Profit: ${Number(soldRevenue - soldCost || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {tab === "detail" && selectedCard && (
        <div>
          <button
            onClick={() => {
              setSelectedCard(null);
              setTab("inventory");
            }}
            style={{ marginBottom: 20 }}
          >
            ← Back
          </button>

          <h2>{selectedCard.name}</h2>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
            {selectedCard.front_image && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Front</div>
                <img src={selectedCard.front_image} alt="front" style={{ width: "100%", maxWidth: 260, height: "auto", display: "block" }} />
              </div>
            )}

            {selectedCard.back_image && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Back</div>
                <img src={selectedCard.back_image} alt="back" style={{ width: "100%", maxWidth: 260, height: "auto", display: "block" }} />
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <div>Inventory ID: {selectedCard.inventory_id || "N/A"}</div>
            <div>Category: {selectedCard.category}</div>
            <div>Card Number / ID: {selectedCard.card_number}</div>
            <div>Language: {selectedCard.language}</div>
            <div>Cost: ${selectedCard.cost}</div>
            <div>List Price: ${selectedCard.price}</div>
            <div>Purchase Date: {selectedCard.purchase_date}</div>
            <div>Payment: {selectedCard.payment_method}</div>
            <div>Seller: {selectedCard.seller_name}</div>
            <div>Seller Tel: {selectedCard.seller_tel}</div>
            <div>Location: {selectedCard.storage_location}</div>
            <div>Status: {selectedCard.status}</div>

            {selectedCard.status === "Sold" && (
              <>
                <div>Sold Price: ${selectedCard.sold_price}</div>
                <div>Sold Date: {selectedCard.sold_date}</div>
                <div>Receiving Method: {selectedCard.receiving_method}</div>
                <div>Profit: ${Number(selectedCard.sold_price || 0) - Number(selectedCard.cost || 0)}</div>
              </>
            )}

            <div>Notes: {selectedCard.notes}</div>
          </div>

          <div>
            {selectedCard.status !== "Sold" && (
              <>
                <button onClick={() => startEdit(selectedCard)}>Edit</button>
                <button onClick={() => markAsSold(selectedCard)} style={{ marginLeft: 10 }}>Mark Sold</button>
              </>
            )}

            <button onClick={() => deleteCard(selectedCard.id)} style={{ marginLeft: 10 }}>Delete</button>
          </div>
        </div>
      )}

      {tab === "activityLogs" && (
        <div>
          <button type="button" onClick={() => setTab("inventory")} style={{ marginBottom: 15 }}>
            ← Back
          </button>

          <h2>Activity Logs</h2>

          {activityLogs.map((log) => (
            <div key={log.id} style={{ border: "1px solid #334155", borderRadius: 12, padding: 15, marginBottom: 15, background: "rgba(255,255,255,0.03)" }}>
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

      {tab === "inventory" && (
        <>
          <input
            placeholder="Search character, category, card number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 18 }}
          />

          {filtered.map((c) => (
            <div key={c.id} style={{ border: "1px solid #334155", borderRadius: 12, padding: 14, marginBottom: 16, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 10, color: "#94a3b8" }}>
                {c.inventory_id || "N/A"}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                {c.front_image && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>Front</div>
                    <img src={c.front_image} alt="front" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }} />
                  </div>
                )}

                {c.back_image && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>Back</div>
                    <img src={c.back_image} alt="back" style={{ width: "100%", maxWidth: 220, height: "auto", display: "block" }} />
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: 8, marginBottom: 2 }}>{c.name}</h3>

              <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 14 }}>
                {c.card_number || "N/A"}
              </div>

              <div style={{ marginBottom: 8 }}><b>Status:</b> {c.status}</div>
              <div style={{ marginBottom: 8 }}><b>Cost:</b> ${Number(c.cost || 0).toLocaleString()}</div>
              <div style={{ marginBottom: 10 }}><b>List Price:</b> ${Number(c.price || 0).toLocaleString()}</div>

              {c.notes && (
                <div style={{ marginBottom: 10 }}><b>Notes:</b> {c.notes}</div>
              )}

              <button
                onClick={() => {
                  setSelectedCard(c);
                  setTab("detail");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                View Details
              </button>

              {c.status !== "Sold" && (
                <button onClick={() => markAsSold(c)} style={{ marginLeft: 10 }}>
                  Mark Sold
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
