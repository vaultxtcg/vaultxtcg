import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import * as XLSX from "xlsx";

const BUCKET_NAME = "TCG images";
const PAGE_SIZE = 50;

const ITEM_CATEGORIES = [
  "Raw Card",
  "Slab",
  "Sealed Product",
  "Merchandise",
  "Beverage",
  "Accessory",
  "Other",
];

const GAME_OR_LANGUAGE_OPTIONS = [
  "English",
  "Japanese",
  "简中",
  "Pokemon",
  "One Piece",
  "Yu-Gi-Oh",
  "Magic",
  "Sports",
  "Other",
];


const emptyForm = {
  name: "",
  category: "Raw Card",
  slab_company: "",
  slab_grade: "",
  quantity: 1,
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

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "🏠" },
  { key: "inventory", label: "Inventory", icon: "📦" },
  { key: "cart", label: "Cart / Checkout", icon: "🛒" },
  { key: "sales", label: "Sales History", icon: "💳" },
  { key: "quickAddCard", label: "Quick Add Card", icon: "⚡" },
  { key: "stockIn", label: "Stock In", icon: "📥" },
  { key: "transactions", label: "Transactions", icon: "🔁" },
  { key: "trades", label: "Trades", icon: "🤝" },
  { key: "customers", label: "Customers", icon: "👥" },
  { key: "count", label: "Inventory Count", icon: "✅" },
  { key: "activityLogs", label: "Activity Logs", icon: "📋" },
  { key: "reports", label: "Reports", icon: "📊" },
];

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtDate = (value) => (value ? new Date(value).toLocaleString() : "");
const toNumber = (value, fallback = 0) => Number(value || fallback);

function diffObjects(beforeObj = {}, afterObj = {}, keys = []) {
  const changes = [];
  keys.forEach((key) => {
    const beforeValue = beforeObj?.[key] ?? "";
    const afterValue = afterObj?.[key] ?? "";
    if (String(beforeValue) !== String(afterValue)) {
      changes.push(`${key}: ${beforeValue || "blank"} → ${afterValue || "blank"}`);
    }
  });
  return changes.length ? changes.join("; ") : "No field change detected";
}


function compressImage(file, maxWidth = 1200, quality = 0.72) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^.]+$/, "");
            resolve(
              new File([blob], `${cleanName}.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tradeDeals, setTradeDeals] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [selectedCard, setSelectedCard] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("ALL");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [countedInventoryIds, setCountedInventoryIds] = useState("");
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 760);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const canAdmin = ["owner", "admin"].includes(userRole);
  const canDelete = canAdmin;
  const canAdjust = canAdmin;
  const canEditSale = canAdmin;
  const canTrade = canAdmin;
  const canHold = canAdmin;

  const mobilePrimaryNavKeys = ["dashboard", "inventory", "quickAddCard", "cart"];
  const mobilePrimaryNavItems = navItems.filter((item) => mobilePrimaryNavKeys.includes(item.key));
  const mobileMoreNavItems = navItems.filter((item) => !mobilePrimaryNavKeys.includes(item.key));
  const isMoreTabActive = isMobile && !mobilePrimaryNavKeys.includes(tab) && tab !== "detail";

  const cartSubtotal = cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const taxRate = 0.1025; // Los Angeles County example. Change this if needed.
  const cartTax = cartSubtotal * taxRate;
  const cartTotal = cartSubtotal + cartTax;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 760);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setPage(1);
    setBulkSelected([]);
  }, [search, tab]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  const askModal = ({ title, message, fields = [], confirmText = "Confirm", danger = false }) => {
    return new Promise((resolve) => {
      const initialValues = {};
      fields.forEach((field) => {
        initialValues[field.name] = field.defaultValue ?? "";
      });
      setModal({ title, message, fields, values: initialValues, confirmText, danger, resolve });
    });
  };

  const closeModal = (result) => {
    if (modal?.resolve) modal.resolve(result);
    setModal(null);
  };

  const loadCompany = async (currentUser) => {
    if (!currentUser) return null;
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      showToast("No company found for this user.", "error");
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
      showToast(error.message, "error");
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
      showToast(error.message, "error");
      return;
    }
    setActivityLogs(data || []);
  };

  const loadTransactions = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Transactions Load Error:", error);
      return;
    }
    setTransactions(data || []);
  };


  const loadTradeDeals = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    const { data, error } = await supabase
      .from("trade_deals")
      .select("*, trade_items(*)")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Trade Deals Load Error:", error);
      return;
    }
    setTradeDeals(data || []);
  };

  const loadSales = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    const { data, error } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Sales Load Error:", error);
      return;
    }
    setSales(data || []);
  };

  const loadCustomers = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Customers Load Error:", error);
      return;
    }
    setCustomers(data || []);
  };

  const refreshAll = async (targetCompanyId = companyId) => {
    await Promise.all([
      loadCards(targetCompanyId),
      loadActivityLogs(targetCompanyId),
      loadTransactions(targetCompanyId),
      loadTradeDeals(targetCompanyId),
      loadSales(targetCompanyId),
      loadCustomers(targetCompanyId),
    ]);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const currentCompanyId = await loadCompany(data.user);
        if (currentCompanyId) await refreshAll(currentCompanyId);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setLoading(true);
        const currentCompanyId = await loadCompany(session.user);
        if (currentCompanyId) await refreshAll(currentCompanyId);
        setLoading(false);
      } else {
        setCompanyId(null);
        setUserRole(null);
        setCards([]);
        setActivityLogs([]);
        setTransactions([]);
        setTradeDeals([]);
        setSales([]);
        setCustomers([]);
        setCart([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setSaving(false);
    if (error) showToast(error.message, "error");
  };

  const signUp = async () => {
    if (!companyName.trim()) {
      showToast("Please enter company name", "error");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (loginError) {
      setSaving(false);
      showToast(loginError.message, "error");
      return;
    }

    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      setSaving(false);
      showToast("Account created, but user session was not found.", "error");
      return;
    }

    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .insert([{ name: companyName }])
      .select()
      .single();

    if (companyError) {
      setSaving(false);
      showToast(companyError.message, "error");
      return;
    }

    const { error: memberError } = await supabase.from("company_members").insert([
      { company_id: companyData.id, user_id: currentUser.id, role: "owner" },
    ]);

    setSaving(false);
    if (memberError) {
      showToast(memberError.message, "error");
      return;
    }

    setCompanyId(companyData.id);
    setUserRole("owner");
    setUser(currentUser);
    showToast("Company created successfully");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const addActivityLog = async ({ action, inventory_id, card_number, notes }) => {
    const { error } = await supabase.from("activity_log").insert([
      { company_id: companyId, user_email: user?.email, action, inventory_id, card_number, notes },
    ]);
    if (error) console.error("Activity Log Error:", error);
  };

  const addTransaction = async ({ inventory_id, card_number, transaction_type, quantity, cost, price, notes }) => {
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
        user_email: user?.email,
      },
    ]);
    if (error) console.error("Transaction Error:", error);
  };

  const upsertCustomer = async ({ name, tel, totalSpendDelta = 0, storeCreditDelta = 0 }) => {
    const cleanName = (name || "").trim();
    const cleanTel = (tel || "").trim();
    if (!cleanName && !cleanTel) return null;

    const existing = customers.find((c) =>
      (cleanTel && c.tel === cleanTel) ||
      (cleanName && c.name?.toLowerCase() === cleanName.toLowerCase())
    );

    if (existing) {
      const updatePayload = {
        name: cleanName || existing.name,
        tel: cleanTel || existing.tel,
        total_spend: Number(existing.total_spend || 0) + Number(totalSpendDelta || 0),
        store_credit: Number(existing.store_credit || 0) + Number(storeCreditDelta || 0),
        updated_at: new Date().toISOString(),
      };
      await supabase.from("customers").update(updatePayload).eq("id", existing.id);
      return { ...existing, ...updatePayload };
    }

    const { data, error } = await supabase.from("customers").insert([{
      company_id: companyId,
      name: cleanName || "Walk-in Customer",
      tel: cleanTel,
      total_spend: Number(totalSpendDelta || 0),
      store_credit: Number(storeCreditDelta || 0),
      created_by: user?.email,
    }]).select().single();

    if (error) {
      console.error("Customer upsert error:", error);
      return null;
    }
    return data;
  };

  const addToCart = async (card) => {
    const availableQty = Number(card.quantity || 0);
    if (availableQty < 1) return showToast("No inventory available", "error");

    const result = await askModal({
      title: "Add to cart",
      message: `${card.inventory_id} · ${card.name} · Available: ${availableQty}`,
      confirmText: "Add to Cart",
      fields: [
        { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
        { name: "unitPrice", label: "Unit Price", type: "number", defaultValue: Number(card.price || 0) > 0 ? Number(card.price || 0) : Number(card.cost || 0) * 1.3 },
      ],
    });
    if (!result) return;

    const quantity = Number(result.quantity || 0);
    const unitPrice = Number(result.unitPrice || 0);
    if (quantity < 1) return showToast("Quantity must be at least 1", "error");
    if (quantity > availableQty) return showToast("Not enough inventory", "error");
    if (unitPrice < 0) return showToast("Unit price cannot be negative", "error");

    setCart((prev) => {
      const existing = prev.find((item) => item.cardId === card.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > availableQty) {
          showToast("Not enough inventory", "error");
          return prev;
        }
        return prev.map((item) => item.cardId === card.id ? { ...item, quantity: newQty, unitPrice } : item);
      }
      return [...prev, {
        cardId: card.id,
        inventoryId: card.inventory_id,
        name: card.name,
        cardNumber: card.card_number,
        quantity,
        unitPrice,
        cost: Number(card.cost || 0),
        availableQty,
      }];
    });
    showToast("Added to cart");
  };

  const updateCartQty = (cardId, quantity) => {
    setCart((prev) => prev.map((item) => item.cardId === cardId ? { ...item, quantity: Math.max(1, Number(quantity || 1)) } : item));
  };

  const removeFromCart = (cardId) => {
    setCart((prev) => prev.filter((item) => item.cardId !== cardId));
  };

  const completeCheckout = async () => {
    if (!cart.length) return showToast("Cart is empty", "error");

    for (const item of cart) {
      const currentCard = cards.find((c) => c.id === item.cardId);
      if (!currentCard) return showToast(`${item.name} not found`, "error");
      if (Number(item.quantity || 0) > Number(currentCard.quantity || 0)) {
        return showToast(`Not enough inventory for ${item.name}`, "error");
      }
    }

    const result = await askModal({
      title: "Checkout",
      message: `Subtotal ${money(cartSubtotal)} · Tax ${money(cartTax)} · Total ${money(cartTotal)}`,
      confirmText: "Complete Sale",
      fields: [
        { name: "customerName", label: "Customer Name", placeholder: "Walk-in Customer" },
        { name: "customerTel", label: "Customer Tel" },
        { name: "paymentMethod", label: "Payment Method", defaultValue: "Cash" },
        { name: "storeCreditUsed", label: "Store Credit Used", type: "number", defaultValue: 0 },
        { name: "notes", label: "Sale Notes" },
      ],
    });
    if (!result) return;

    const storeCreditUsed = Number(result.storeCreditUsed || 0);
    const finalTotal = Math.max(0, cartTotal - storeCreditUsed);

    setSaving(true);

    const customer = await upsertCustomer({
      name: result.customerName,
      tel: result.customerTel,
      totalSpendDelta: finalTotal,
      storeCreditDelta: -storeCreditUsed,
    });

    const { data: sale, error: saleError } = await supabase.from("sales").insert([{
      company_id: companyId,
      customer_id: customer?.id || null,
      customer_name: result.customerName || "Walk-in Customer",
      customer_tel: result.customerTel || "",
      subtotal: cartSubtotal,
      tax: cartTax,
      total: finalTotal,
      store_credit_used: storeCreditUsed,
      payment_method: result.paymentMethod || "Cash",
      notes: result.notes || "",
      created_by: user?.email,
    }]).select().single();

    if (saleError) {
      setSaving(false);
      showToast(saleError.message, "error");
      return;
    }

    const saleNumber = `S-${String(sale.id).padStart(6, "0")}`;
    await supabase.from("sales").update({ sale_number: saleNumber }).eq("id", sale.id);

    try {
      for (const item of cart) {
        const currentCard = cards.find((c) => c.id === item.cardId);
        const oldQty = Number(currentCard.quantity || 0);
        const newQty = oldQty - Number(item.quantity || 0);

        const { error: updateError } = await supabase.from("cards").update({
          quantity: newQty,
          status: newQty === 0 ? "Sold" : currentCard.status,
          sold_price: Number(currentCard.sold_price || 0) + Number(item.unitPrice || 0) * Number(item.quantity || 0),
          sold_date: new Date().toISOString().slice(0, 10),
          receiving_method: result.paymentMethod || "Cash",
          sold_by: user?.email,
          updated_by: user?.email,
        }).eq("id", currentCard.id);
        if (updateError) throw updateError;

        await supabase.from("sale_items").insert([{
          sale_id: sale.id,
          inventory_id: item.inventoryId,
          card_name: item.name,
          card_number: item.cardNumber || "",
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unitPrice || 0),
          total_price: Number(item.unitPrice || 0) * Number(item.quantity || 0),
          cost: Number(item.cost || 0) * Number(item.quantity || 0),
        }]);

        await addTransaction({
          inventory_id: item.inventoryId,
          card_number: item.cardNumber,
          transaction_type: "SELL",
          quantity: -Number(item.quantity || 0),
          cost: Number(item.cost || 0) * Number(item.quantity || 0),
          price: Number(item.unitPrice || 0) * Number(item.quantity || 0),
          notes: `${saleNumber} checkout via ${result.paymentMethod || "Cash"}`,
        });
      }

      await addActivityLog({
        action: "SOLD",
        inventory_id: saleNumber,
        card_number: "MULTI-ITEM",
        notes: `Checkout completed. Items: ${cart.length}. Subtotal: ${money(cartSubtotal)}. Tax: ${money(cartTax)}. Total: ${money(finalTotal)}. Payment: ${result.paymentMethod || "Cash"}`
      });

      setLastReceipt({
        sale_number: saleNumber,
        created_at: new Date().toISOString(),
        items: cart,
        subtotal: cartSubtotal,
        tax: cartTax,
        store_credit_used: storeCreditUsed,
        total: finalTotal,
        payment_method: result.paymentMethod || "Cash",
        customer_name: result.customerName || "Walk-in Customer",
      });

      setCart([]);
      await refreshAll();
      setSaving(false);
      setTab("sales");
      showToast(`${saleNumber} completed`);
    } catch (err) {
      setSaving(false);
      showToast(`Checkout failed: ${err.message}`, "error");
    }
  };

  const updateCardStatus = async (card, nextStatus, reason = "") => {
    if (!canHold) return showToast("Only owner/admin can change hold status", "error");
    setSaving(true);
    const previousStatus = card.status || "Available";
    const { error } = await supabase
      .from("cards")
      .update({ status: nextStatus, updated_by: user?.email })
      .eq("id", card.id);

    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: nextStatus === "Hold" ? "HOLD" : "RELEASE_HOLD",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Status changed: ${previousStatus} → ${nextStatus}. ${reason || ""}`,
    });

    await refreshAll();
    setSelectedCard((prev) => prev ? { ...prev, status: nextStatus } : prev);
    setSaving(false);
    showToast(nextStatus === "Hold" ? "Card placed on hold" : "Card released from hold");
  };

  const handleCostChange = (value) => {
    const costNum = Number(value || 0);
    setForm((prev) => ({
      ...prev,
      cost: value,
      price: !editingId && !priceManuallyEdited ? (costNum ? (costNum * 1.3).toFixed(2) : "") : prev.price,
    }));
  };

  const getItemActivity = (card) => {
    const inventoryId = card?.inventory_id || "";
    const cardNumber = card?.card_number || "";
    const logMatches = activityLogs.filter((log) =>
      (inventoryId && log.inventory_id === inventoryId) ||
      (cardNumber && log.card_number === cardNumber)
    );
    const transactionMatches = transactions.filter((tx) =>
      (inventoryId && tx.inventory_id === inventoryId) ||
      (cardNumber && tx.card_number === cardNumber)
    );
    const saleMatches = sales
      .flatMap((sale) => (sale.sale_items || []).map((item) => ({ ...item, sale })))
      .filter((item) => (inventoryId && item.inventory_id === inventoryId) || (cardNumber && item.card_number === cardNumber));
    const tradeMatches = tradeDeals
      .flatMap((deal) => (deal.trade_items || []).map((item) => ({ ...item, deal })))
      .filter((item) => (inventoryId && item.inventory_id === inventoryId) || (cardNumber && item.card_number === cardNumber));
    return { logMatches, transactionMatches, saleMatches, tradeMatches };
  };

  const bulkMoveLocation = async () => {
    if (!canAdjust) return showToast("Only owner/admin can bulk update inventory", "error");
    if (!bulkSelected.length) return showToast("Select at least one card", "error");
    const result = await askModal({
      title: "Bulk move location",
      message: `${bulkSelected.length} selected item(s)`,
      confirmText: "Move",
      fields: [{ name: "location", label: "New Location", placeholder: "Showcase A / Binder 3 / Shelf 2" }],
    });
    if (!result) return;
    setSaving(true);
    const selectedCards = cards.filter((card) => bulkSelected.includes(card.id));
    for (const card of selectedCards) {
      await supabase.from("cards").update({ storage_location: result.location || "", updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "BULK_EDIT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Location changed: ${card.storage_location || "blank"} → ${result.location || "blank"}` });
    }
    setBulkSelected([]);
    await refreshAll();
    setSaving(false);
    showToast("Location updated");
  };

  const bulkUpdatePrice = async () => {
    if (!canAdjust) return showToast("Only owner/admin can bulk update inventory", "error");
    if (!bulkSelected.length) return showToast("Select at least one card", "error");
    const result = await askModal({
      title: "Bulk update price",
      message: `${bulkSelected.length} selected item(s)`,
      confirmText: "Update Price",
      fields: [{ name: "price", label: "New List Price", type: "number", defaultValue: 0 }],
    });
    if (!result) return;
    setSaving(true);
    const selectedCards = cards.filter((card) => bulkSelected.includes(card.id));
    for (const card of selectedCards) {
      await supabase.from("cards").update({ price: Number(result.price || 0), updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "BULK_EDIT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Price changed: ${money(card.price)} → ${money(result.price)}` });
    }
    setBulkSelected([]);
    await refreshAll();
    setSaving(false);
    showToast("Price updated");
  };

  const bulkUpdateStatus = async () => {
    if (!canAdjust) return showToast("Only owner/admin can bulk update inventory", "error");
    if (!bulkSelected.length) return showToast("Select at least one card", "error");
    const result = await askModal({
      title: "Bulk update status",
      message: `${bulkSelected.length} selected item(s)`,
      confirmText: "Update Status",
      fields: [{ name: "status", label: "New Status", defaultValue: "Available", placeholder: "Available / Hold / Others" }],
    });
    if (!result) return;
    setSaving(true);
    const selectedCards = cards.filter((card) => bulkSelected.includes(card.id));
    for (const card of selectedCards) {
      await supabase.from("cards").update({ status: result.status || "Available", updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "BULK_EDIT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Status changed: ${card.status || "blank"} → ${result.status || "Available"}` });
    }
    setBulkSelected([]);
    await refreshAll();
    setSaving(false);
    showToast("Status updated");
  };

  const applyInventoryCountMissing = async () => {
    if (!canAdjust) return showToast("Only owner/admin can apply inventory count", "error");
    const scanned = countedInventoryIds
      .split(/\n|,|\s+/)
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
    const scannedSet = new Set(scanned);
    const missing = inventoryCards.filter((card) => !scannedSet.has(String(card.inventory_id || "").toUpperCase()));
    if (!missing.length) return showToast("No missing items found");

    const confirmResult = await askModal({
      title: "Apply count adjustment",
      message: `Set ${missing.length} missing item(s) quantity to 0?`,
      confirmText: "Set Missing to 0",
      danger: true,
      fields: [{ name: "reason", label: "Reason", defaultValue: "Inventory count missing" }],
    });
    if (!confirmResult) return;

    setSaving(true);
    for (const card of missing) {
      const oldQty = Number(card.quantity || 0);
      await supabase.from("cards").update({ quantity: 0, status: "Sold", updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "COUNT_ADJUSTMENT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Inventory count missing. Before qty: ${oldQty}; After qty: 0. Reason: ${confirmResult.reason || "Inventory count missing"}` });
      await addTransaction({ inventory_id: card.inventory_id, card_number: card.card_number, transaction_type: "COUNT_ADJUSTMENT", quantity: -oldQty, cost: Number(card.cost || 0) * oldQty, price: 0, notes: confirmResult.reason || "Inventory count missing" });
    }
    await refreshAll();
    setSaving(false);
    showToast("Inventory count adjustments applied");
  };

  const uploadFile = async (cardId, file, side) => {
    if (!file) return null;

    const compressedFile = await compressImage(file);
    const safeFileName = compressedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${cardId}-${side}-${Date.now()}-${safeFileName}`;

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, compressedFile, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (error) {
      showToast(error.message, "error");
      return null;
    }
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveCard = async (e, options = {}) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.name.trim()) {
      showToast("Item Name is required", "error");
      return;
    }
    if (!companyId) {
      showToast("Company ID not found. Please log in again.", "error");
      return;
    }

    setSaving(true);
    const { id, slab_company, slab_grade, ...formWithoutId } = form;
    const costNumber = Number(form.cost || 0);
    const priceNumber = form.price === "" || form.price === null || form.price === undefined
      ? Number((costNumber * 1.3).toFixed(2))
      : Number(form.price || 0);

    const slabInfo = form.category === "Slab" && (form.slab_company || form.slab_grade)
      ? `Grading: ${form.slab_company || "N/A"} ${form.slab_grade || ""}. ${form.notes || ""}`.trim()
      : form.notes;

    const payload = {
      ...formWithoutId,
      notes: slabInfo,
      category: options.forceCategory || formWithoutId.category,
      company_id: companyId,
      cost: costNumber,
      price: priceNumber,
      quantity: Number(form.quantity || 1),
    };

    let cardId = editingId;
    let inventoryId = null;

    if (editingId) {
      payload.updated_by = user?.email;
      const currentCard = cards.find((c) => c.id === editingId);
      inventoryId = currentCard?.inventory_id;
      const changes = diffObjects(currentCard, payload, [
        "name", "category", "quantity", "card_number", "language", "cost", "price", "purchase_date",
        "payment_method", "seller_name", "seller_tel", "storage_location", "status", "notes",
      ]);

      const { error } = await supabase.from("cards").update(payload).eq("id", editingId);
      if (error) {
        setSaving(false);
        showToast(error.message, "error");
        return;
      }

      await addActivityLog({
        action: "EDIT",
        inventory_id: inventoryId,
        card_number: payload.card_number,
        notes: `Item updated. Changes: ${changes}`,
      });
    } else {
      payload.created_by = user?.email;
      const { data, error } = await supabase.from("cards").insert([payload]).select().single();
      if (error) {
        setSaving(false);
        showToast(error.message, "error");
        return;
      }

      cardId = data.id;
      inventoryId = `VX-${String(data.id).padStart(6, "0")}`;
      await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", data.id);

      await addActivityLog({
        action: "ADD",
        inventory_id: inventoryId,
        card_number: payload.card_number,
        notes: `Added card. Qty: ${payload.quantity}; Cost: ${money(payload.cost)}; Location: ${payload.storage_location || "N/A"}`,
      });
      await addTransaction({
        inventory_id: inventoryId,
        card_number: payload.card_number,
        transaction_type: "ADD",
        quantity: payload.quantity,
        cost: payload.cost * payload.quantity,
        price: payload.price * payload.quantity,
        notes: "Card added to inventory",
      });
    }

    const frontUrl = await uploadFile(cardId, frontFile, "front");
    const backUrl = await uploadFile(cardId, backFile, "back");
    const updates = {};
    if (frontUrl) updates.front_image = frontUrl;
    if (backUrl) updates.back_image = backUrl;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("cards").update(updates).eq("id", cardId);
      if (error) {
        setSaving(false);
        showToast(error.message, "error");
        return;
      }
    }

    const nextEmptyForm = { ...emptyForm, category: options.defaultCategory || "Raw Card" };
    setForm(nextEmptyForm);
    setEditingId(null);
    setFrontFile(null);
    setBackFile(null);
    setPriceManuallyEdited(false);
    await refreshAll();
    setSaving(false);
    if (options.keepAdding) {
      setTab(options.returnTab || "quickAddCard");
      showToast("Item saved. Ready for next item.");
    } else {
      setTab("inventory");
      showToast(editingId ? "Item updated" : "Item saved");
    }
  };

  const startEdit = (card) => {
    setEditingId(card.id);
    setPriceManuallyEdited(true);
    setForm({
      name: card.name || "",
      category: card.category || "Raw Card",
      slab_company: "",
      slab_grade: "",
      quantity: card.quantity || 1,
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
    setSelectedCard(null);
    setTab("stockIn");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFrontFile(null);
    setBackFile(null);
    setPriceManuallyEdited(false);
  };

  const markAsSold = async (card) => {
    const availableQty = Number(card.quantity || 1);
    const result = await askModal({
      title: "Mark as sold",
      message: `${card.name} · Available: ${availableQty}`,
      confirmText: "Record Sale",
      fields: [
        { name: "soldQty", label: "Quantity Sold", type: "number", defaultValue: 1 },
        { name: "soldPrice", label: "Total Sold Price", type: "number", defaultValue: Number(card.price || 0) > 0 ? Number(card.price || 0) : Number(card.cost || 0) * 1.3 },
        { name: "soldDate", label: "Sold Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) },
        { name: "receivingMethod", label: "Receiving Method", placeholder: "Cash / Zelle / Venmo / Card / Others" },
      ],
    });
    if (!result) return;

    const soldQty = Number(result.soldQty || 0);
    const soldPrice = Number(result.soldPrice || 0);
    if (soldQty < 1) return showToast("Quantity sold must be at least 1", "error");
    if (soldQty > availableQty) return showToast("Not enough inventory", "error");
    if (soldPrice <= 0) return showToast("Sold price is required", "error");

    setSaving(true);
    const remainingQty = availableQty - soldQty;
    const previousSoldPrice = Number(card.sold_price || 0);
    const updatePayload = {
      quantity: remainingQty,
      sold_price: previousSoldPrice + soldPrice,
      sold_date: result.soldDate,
      receiving_method: result.receivingMethod || "",
      sold_by: user?.email,
    };
    if (remainingQty === 0) updatePayload.status = "Sold";

    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "SOLD",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Before qty: ${availableQty}; After qty: ${remainingQty}; Sold ${soldQty} pcs for ${money(soldPrice)} via ${result.receivingMethod || "N/A"}`,
    });
    await addTransaction({
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      transaction_type: "SELL",
      quantity: -soldQty,
      cost: Number(card.cost || 0) * soldQty,
      price: soldPrice,
      notes: `Sale via ${result.receivingMethod || "N/A"}`,
    });

    await refreshAll();
    setSaving(false);
    showToast("Sale recorded");
  };

  const adjustQuantity = async (card) => {
    if (!canAdjust) return showToast("Only owner/admin can adjust inventory", "error");
    const oldQty = Number(card.quantity || 0);
    const result = await askModal({
      title: "Adjust quantity",
      message: `${card.name} · Current qty: ${oldQty}`,
      confirmText: "Adjust",
      fields: [
        { name: "newQty", label: "New Quantity", type: "number", defaultValue: oldQty },
        { name: "reason", label: "Reason", placeholder: "Missing / Found / Damaged / Inventory Count / Other" },
      ],
    });
    if (!result) return;
    const newQty = Number(result.newQty);
    if (Number.isNaN(newQty) || newQty < 0) return showToast("New quantity must be 0 or higher", "error");

    setSaving(true);
    const diff = newQty - oldQty;
    const updatePayload = { quantity: newQty, status: newQty === 0 ? "Sold" : "Available", updated_by: user?.email };
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "ADJUSTMENT",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Before qty: ${oldQty}; After qty: ${newQty}; Difference: ${diff}; Reason: ${result.reason || "Inventory adjustment"}`,
    });
    await addTransaction({
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      transaction_type: "ADJUSTMENT",
      quantity: diff,
      cost: Number(card.cost || 0) * diff,
      price: Number(card.price || 0) * diff,
      notes: result.reason || "Inventory adjustment",
    });

    await refreshAll();
    setSaving(false);
    showToast("Quantity adjusted");
  };

  const editSale = async (card) => {
    if (!canEditSale) return showToast("Only owner/admin can edit sales", "error");
    const result = await askModal({
      title: "Edit sale information",
      message: `${card.name} · ${card.inventory_id}`,
      confirmText: "Save Sale Edit",
      fields: [
        { name: "soldPrice", label: "Sold Price", type: "number", defaultValue: card.sold_price || 0 },
        { name: "soldDate", label: "Sold Date", type: "date", defaultValue: card.sold_date || new Date().toISOString().slice(0, 10) },
        { name: "receivingMethod", label: "Receiving Method", defaultValue: card.receiving_method || "" },
      ],
    });
    if (!result) return;

    setSaving(true);
    const updatePayload = {
      sold_price: Number(result.soldPrice || 0),
      sold_date: result.soldDate,
      receiving_method: result.receivingMethod || "",
      updated_by: user?.email,
    };
    const changes = diffObjects(card, updatePayload, ["sold_price", "sold_date", "receiving_method"]);
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "EDIT_SALE",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Sale edited. Changes: ${changes}`,
    });
    await refreshAll();
    setSelectedCard((prev) => prev ? { ...prev, ...updatePayload } : prev);
    setSaving(false);
    showToast("Sale updated");
  };

  const undoSale = async (card) => {
    if (!canEditSale) return showToast("Only owner/admin can undo sales", "error");
    const result = await askModal({
      title: "Undo sale",
      message: "This will add quantity back to inventory and reset sale fields for this item.",
      confirmText: "Undo Sale",
      danger: true,
      fields: [
        { name: "restoreQty", label: "Quantity to restore", type: "number", defaultValue: 1 },
        { name: "reason", label: "Reason", placeholder: "Customer return / mistake / other" },
      ],
    });
    if (!result) return;
    const restoreQty = Number(result.restoreQty || 1);
    if (restoreQty < 1) return showToast("Restore quantity must be at least 1", "error");

    setSaving(true);
    const oldQty = Number(card.quantity || 0);
    const newQty = oldQty + restoreQty;
    const updatePayload = {
      quantity: newQty,
      status: "Available",
      sold_price: 0,
      sold_date: null,
      receiving_method: "",
      updated_by: user?.email,
    };
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "UNDO_SALE",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Before qty: ${oldQty}; After qty: ${newQty}; Restored qty: ${restoreQty}; Reason: ${result.reason || "Sale undone"}`,
    });
    await addTransaction({
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      transaction_type: "UNDO_SALE",
      quantity: restoreQty,
      cost: Number(card.cost || 0) * restoreQty,
      price: 0,
      notes: result.reason || "Sale undone and quantity restored",
    });

    await refreshAll();
    setSaving(false);
    setTab("inventory");
    setSelectedCard(null);
    showToast("Sale undone");
  };

  const tradeInCard = async () => {
    if (!canTrade) return showToast("Only owner/admin can create trades", "error");
    const result = await askModal({
      title: "Trade in card",
      message: "Record a card received from a customer through trade.",
      confirmText: "Create Trade In",
      fields: [
        { name: "name", label: "Card Name" },
        { name: "cardNumber", label: "SKU / Card # / ID" },
        { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
        { name: "cost", label: "Trade-in cost / value per card", type: "number", defaultValue: 0 },
        { name: "price", label: "List price per card", type: "number", defaultValue: 0 },
        { name: "location", label: "Storage Location" },
        { name: "note", label: "Trade note / cash difference" },
      ],
    });
    if (!result || !result.name) return;

    setSaving(true);
    const quantity = Number(result.quantity || 1);
    const cost = Number(result.cost || 0);
    const price = Number(result.price || 0);
    const payload = {
      company_id: companyId,
      name: result.name,
      category: "Others",
      quantity,
      card_number: result.cardNumber || "",
      language: "English",
      cost,
      price,
      purchase_date: new Date().toISOString().slice(0, 10),
      payment_method: "Trade",
      seller_name: "Trade Customer",
      storage_location: result.location || "",
      status: "Available",
      notes: result.note || "Trade In",
      created_by: user?.email,
    };

    const { data, error } = await supabase.from("cards").insert([payload]).select().single();
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }
    const inventoryId = `VX-${String(data.id).padStart(6, "0")}`;
    await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", data.id);

    await addActivityLog({
      action: "TRADE_IN",
      inventory_id: inventoryId,
      card_number: payload.card_number,
      notes: `Trade in ${quantity} pcs. Value: ${money(cost)} each. ${result.note || ""}`,
    });
    await addTransaction({
      inventory_id: inventoryId,
      card_number: payload.card_number,
      transaction_type: "TRADE_IN",
      quantity,
      cost: cost * quantity,
      price: price * quantity,
      notes: result.note || "Trade in card received",
    });

    await refreshAll();
    setSaving(false);
    showToast("Trade in recorded");
  };

  const tradeOutCard = async (card) => {
    if (!canTrade) return showToast("Only owner/admin can create trades", "error");
    const availableQty = Number(card.quantity || 0);
    const result = await askModal({
      title: "Trade out card",
      message: `${card.name} · Available: ${availableQty}`,
      confirmText: "Record Trade Out",
      fields: [
        { name: "quantity", label: "Trade out quantity", type: "number", defaultValue: 1 },
        { name: "value", label: "Total trade-out value", type: "number", defaultValue: Number(card.price || 0) },
        { name: "note", label: "Trade note", placeholder: "Example: traded for Moonbreon + customer added $50" },
      ],
    });
    if (!result) return;
    const tradeQty = Number(result.quantity || 0);
    if (tradeQty < 1) return showToast("Quantity must be at least 1", "error");
    if (tradeQty > availableQty) return showToast("Not enough inventory", "error");

    setSaving(true);
    const remainingQty = availableQty - tradeQty;
    const updatePayload = { quantity: remainingQty, status: remainingQty === 0 ? "Sold" : card.status, updated_by: user?.email };
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "TRADE_OUT",
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      notes: `Before qty: ${availableQty}; After qty: ${remainingQty}; Trade out ${tradeQty} pcs. Value: ${money(result.value)}. ${result.note || ""}`,
    });
    await addTransaction({
      inventory_id: card.inventory_id,
      card_number: card.card_number,
      transaction_type: "TRADE_OUT",
      quantity: -tradeQty,
      cost: Number(card.cost || 0) * tradeQty,
      price: Number(result.value || 0),
      notes: result.note || "Trade out card given to customer",
    });

    await refreshAll();
    setSaving(false);
    showToast("Trade out recorded");
  };


  const createTradeDeal = async ({ customerName, customerTel, cashDifference, notes, inItems, outItems }) => {
    if (!canTrade) return showToast("Only owner/admin can create trades", "error");
    if (!companyId) return showToast("Company ID not found. Please log in again.", "error");
    if (!inItems.length && !outItems.length) return showToast("Please add at least one trade item", "error");

    for (const item of inItems) {
      if (!item.name?.trim()) return showToast("Trade-in card name is required", "error");
      if (Number(item.quantity || 0) < 1) return showToast("Trade-in quantity must be at least 1", "error");
    }

    for (const item of outItems) {
      const currentCard = cards.find((c) => c.id === item.cardId);
      if (!currentCard) return showToast("A trade-out card was not found in inventory", "error");
      if (Number(item.quantity || 0) < 1) return showToast("Trade-out quantity must be at least 1", "error");
      if (Number(item.quantity || 0) > Number(currentCard.quantity || 0)) {
        return showToast(`Not enough inventory for ${currentCard.name}`, "error");
      }
    }

    setSaving(true);

    const { data: deal, error: dealError } = await supabase
      .from("trade_deals")
      .insert([{
        company_id: companyId,
        customer_name: customerName || "",
        customer_tel: customerTel || "",
        cash_difference: Number(cashDifference || 0),
        notes: notes || "",
        created_by: user?.email,
      }])
      .select()
      .single();

    if (dealError) {
      setSaving(false);
      showToast(dealError.message, "error");
      return;
    }

    const tradeNumber = `T-${String(deal.id).padStart(6, "0")}`;
    await supabase.from("trade_deals").update({ trade_number: tradeNumber }).eq("id", deal.id);

    try {
      for (const item of inItems) {
        const quantity = Number(item.quantity || 1);
        const tradeValue = Number(item.tradeValue || 0);
        const listPrice = Number(item.listPrice || tradeValue || 0);
        const cardPayload = {
          company_id: companyId,
          name: item.name,
          category: item.category || "Others",
          quantity,
          card_number: item.cardNumber || "",
          language: item.language || "English",
          cost: quantity ? tradeValue / quantity : tradeValue,
          price: listPrice,
          purchase_date: new Date().toISOString().slice(0, 10),
          payment_method: "Trade",
          seller_name: customerName || "Trade Customer",
          seller_tel: customerTel || "",
          storage_location: item.location || "",
          status: "Available",
          notes: `${tradeNumber} trade in. ${item.notes || ""}`,
          created_by: user?.email,
        };

        const { data: newCard, error: cardError } = await supabase.from("cards").insert([cardPayload]).select().single();
        if (cardError) throw cardError;

        const inventoryId = `VX-${String(newCard.id).padStart(6, "0")}`;
        await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", newCard.id);

        await supabase.from("trade_items").insert([{
          trade_id: deal.id,
          inventory_id: inventoryId,
          card_name: item.name,
          card_number: item.cardNumber || "",
          quantity,
          trade_value: tradeValue,
          direction: "IN",
        }]);

        await addTransaction({
          inventory_id: inventoryId,
          card_number: item.cardNumber || "",
          transaction_type: "TRADE_IN",
          quantity,
          cost: tradeValue,
          price: listPrice * quantity,
          notes: `${tradeNumber} trade in from ${customerName || "customer"}`,
        });
      }

      for (const item of outItems) {
        const currentCard = cards.find((c) => c.id === item.cardId);
        const quantity = Number(item.quantity || 1);
        const tradeValue = Number(item.tradeValue || 0);
        const oldQty = Number(currentCard.quantity || 0);
        const newQty = oldQty - quantity;

        const { error: updateError } = await supabase
          .from("cards")
          .update({ quantity: newQty, status: newQty === 0 ? "Sold" : currentCard.status, updated_by: user?.email })
          .eq("id", currentCard.id);
        if (updateError) throw updateError;

        await supabase.from("trade_items").insert([{
          trade_id: deal.id,
          inventory_id: currentCard.inventory_id,
          card_name: currentCard.name,
          card_number: currentCard.card_number || "",
          quantity,
          trade_value: tradeValue,
          direction: "OUT",
        }]);

        await addTransaction({
          inventory_id: currentCard.inventory_id,
          card_number: currentCard.card_number,
          transaction_type: "TRADE_OUT",
          quantity: -quantity,
          cost: Number(currentCard.cost || 0) * quantity,
          price: tradeValue,
          notes: `${tradeNumber} trade out to ${customerName || "customer"}`,
        });
      }

      const inTotal = inItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
      const outTotal = outItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
      await addActivityLog({
        action: "TRADE",
        inventory_id: tradeNumber,
        card_number: "MULTI-ITEM",
        notes: `Trade deal created. In: ${inItems.length} item types / ${money(inTotal)}. Out: ${outItems.length} item types / ${money(outTotal)}. Cash difference: ${money(cashDifference)}. Customer: ${customerName || "N/A"}`,
      });

      await refreshAll();
      setSaving(false);
      showToast(`Trade ${tradeNumber} created`);
      setTab("trades");
    } catch (err) {
      setSaving(false);
      showToast(`Trade failed: ${err.message}`, "error");
    }
  };

  const deleteCard = async (id) => {
    if (!canDelete) return showToast("Only owner/admin can delete cards", "error");
    const card = cards.find((c) => c.id === id);
    const result = await askModal({
      title: "Delete item",
      message: `Delete ${card?.name || "this card"}? This cannot be undone from this screen.`,
      confirmText: "Delete",
      danger: true,
      fields: [{ name: "reason", label: "Reason", placeholder: "Duplicate / wrong entry / other" }],
    });
    if (!result) return;

    setSaving(true);
    const { error } = await supabase.from("cards").delete().eq("id", id);
    if (error) {
      setSaving(false);
      showToast(error.message, "error");
      return;
    }

    await addActivityLog({
      action: "DELETE",
      inventory_id: card?.inventory_id,
      card_number: card?.card_number,
      notes: `Deleted card. Before: ${JSON.stringify({ name: card?.name, qty: card?.quantity, cost: card?.cost, price: card?.price, location: card?.storage_location })}. Reason: ${result.reason || "N/A"}`,
    });
    await addTransaction({
      inventory_id: card?.inventory_id,
      card_number: card?.card_number,
      transaction_type: "DELETE",
      quantity: -Number(card?.quantity || 0),
      cost: Number(card?.cost || 0) * Number(card?.quantity || 0),
      price: Number(card?.price || 0) * Number(card?.quantity || 0),
      notes: result.reason || "Item deleted from inventory",
    });

    await refreshAll();
    setSaving(false);
    setSelectedCard(null);
    setTab("inventory");
    showToast("Item deleted");
  };

  const downloadCSV = (filename, headers, rows) => {
    const csvRows = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportInventoryCSV = () => downloadCSV("vaultxtcg_inventory.csv", [
    "inventory_id", "name", "category", "card_number", "language", "quantity", "cost", "price", "status",
    "purchase_date", "payment_method", "seller_name", "storage_location", "created_by", "updated_by",
  ], cards.filter((c) => c.status !== "Sold"));

  const exportSalesCSV = () => downloadCSV("vaultxtcg_sales.csv", [
    "inventory_id", "name", "category", "card_number", "quantity", "cost", "sold_price", "sold_date", "receiving_method", "sold_by",
  ], cards.filter((c) => c.status === "Sold"));

  const exportActivityLogCSV = () => downloadCSV("vaultxtcg_activity_log.csv", [
    "created_at", "user_email", "action", "inventory_id", "card_number", "notes",
  ], activityLogs);

  const exportTransactionsCSV = () => downloadCSV("vaultxtcg_transactions.csv", [
    "created_at", "user_email", "transaction_type", "inventory_id", "card_number", "quantity", "cost", "price", "notes",
  ], transactions);

  const downloadExcelTemplate = () => {
    const template = [{
      name: "Monkey D. Luffy",
      category: "One Piece",
      quantity: 1,
      card_number: "OP13-108",
      language: "English",
      cost: 20,
      price: 35,
      purchase_date: "2026-06-12",
      payment_method: "Cash",
      seller_name: "Tom",
      seller_tel: "6261234567",
      storage_location: "Box A",
      status: "Available",
      notes: "Example row",
    }];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");
    XLSX.writeFile(workbook, "vaultxtcg_import_template.xlsx");
  };

  const importExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!companyId) return showToast("Company ID not found. Please log in again.", "error");

    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        if (!rows.length) {
          setSaving(false);
          return showToast("Excel file is empty", "error");
        }

        const payload = rows
          .filter((row) => row.name || row.Name || row.card_number || row["SKU / Card #"])
          .map((row) => ({
            company_id: companyId,
            name: row.name || row.Name || "",
            category: row.category || row.Category || "Pokemon",
            card_number: row.card_number || row["SKU / Card #"] || row.cardNumber || row["SKU / Card # / ID"] || "",
            language: row.language || row.Language || "English",
            quantity: Number(row.quantity || row.Quantity || row.qty || row.Qty || 1),
            cost: Number(row.cost || row.Cost || 0),
            price: Number(row.price || row.Price || 0),
            purchase_date: row.purchase_date || row["Purchase Date"] || null,
            payment_method: row.payment_method || row["Payment Method"] || "",
            seller_name: row.seller_name || row["Seller Name"] || "",
            seller_tel: row.seller_tel || row["Seller Tel"] || "",
            storage_location: row.storage_location || row["Storage Location"] || "",
            status: row.status || row.Status || "Available",
            notes: row.notes || row.Notes || "",
            created_by: user?.email,
          }));

        if (!payload.length) {
          setSaving(false);
          return showToast("No valid items found", "error");
        }

        const { data: insertedCards, error } = await supabase.from("cards").insert(payload).select();
        if (error) {
          setSaving(false);
          return showToast(error.message, "error");
        }

        for (const card of insertedCards) {
          const inventoryId = `VX-${String(card.id).padStart(6, "0")}`;
          await supabase.from("cards").update({ inventory_id: inventoryId }).eq("id", card.id);
          await addActivityLog({ action: "IMPORT", inventory_id: inventoryId, card_number: card.card_number, notes: `Imported from Excel. Qty: ${card.quantity}` });
          await addTransaction({
            inventory_id: inventoryId,
            card_number: card.card_number,
            transaction_type: "IMPORT",
            quantity: card.quantity,
            cost: Number(card.cost || 0) * Number(card.quantity || 0),
            price: Number(card.price || 0) * Number(card.quantity || 0),
            notes: "Imported from Excel",
          });
        }

        await refreshAll();
        e.target.value = "";
        setSaving(false);
        showToast(`${insertedCards.length} items imported`);
      } catch (err) {
        setSaving(false);
        showToast(`Import failed: ${err.message}`, "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return cards.filter((c) => {
      const matchSearch = !keyword || [
        c.name, c.category, c.card_number, c.inventory_id, c.storage_location, c.status, c.language,
      ].some((value) => String(value || "").toLowerCase().includes(keyword));
      if (tab === "inventory") return matchSearch && c.status !== "Sold";
      return matchSearch;
    });
  }, [cards, search, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedCards = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const inventoryCards = cards.filter((c) => c.status !== "Sold");
  const soldCards = cards.filter((c) => c.status === "Sold");
  const inventoryQty = inventoryCards.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
  const totalCost = inventoryCards.reduce((sum, c) => sum + Number(c.cost || 0) * Number(c.quantity || 0), 0);
  const totalValue = inventoryCards.reduce((sum, c) => sum + (Number(c.price || 0) > 0 ? Number(c.price || 0) : Number(c.cost || 0) * 1.3) * Number(c.quantity || 0), 0);
  const soldRevenue = cards.reduce((sum, c) => sum + Number(c.sold_price || 0), 0);
  const soldCost = soldCards.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = cards.filter((c) => c.sold_date === today).reduce((sum, c) => sum + Number(c.sold_price || 0), 0);

  const styles = {
    app: { minHeight: "100vh", background: "#0f172a", color: "#e5e7eb", fontFamily: "Inter, Arial, sans-serif" },
    shell: { display: isMobile ? "block" : "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" },
    sidebar: { background: "#020617", borderRight: "1px solid #1e293b", padding: 18, position: isMobile ? "static" : "sticky", top: 0, height: isMobile ? "auto" : "100vh" },
    main: { padding: isMobile ? 14 : 24, maxWidth: 1440, width: "100%", boxSizing: "border-box" },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" },
    card: { border: "1px solid #1e293b", background: "#111827", borderRadius: 16, padding: 16, boxShadow: "0 10px 25px rgba(0,0,0,0.18)" },
    input: { width: "100%", boxSizing: "border-box", padding: "11px 12px", marginBottom: 10, borderRadius: 10, border: "1px solid #334155", background: "#020617", color: "#e5e7eb" },
    button: { border: "1px solid #334155", background: "#1e293b", color: "#e5e7eb", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 600 },
    primary: { border: "1px solid #2563eb", background: "#2563eb", color: "white", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
    danger: { border: "1px solid #dc2626", background: "#7f1d1d", color: "white", padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
    muted: { color: "#94a3b8", fontSize: 13 },
  };

  const NavButton = ({ item }) => (
    <button
      type="button"
      onClick={() => {
        if (item.key === "stockIn" || item.key === "quickAddCard") cancelEdit();
        if (item.key === "quickAddCard") setForm({ ...emptyForm, category: "Raw Card" });
        if (item.key === "stockIn") setForm({ ...emptyForm, category: "Sealed Product" });
        setSelectedCard(null);
        setTab(item.key);
        if (isMobile && !mobilePrimaryNavKeys.includes(item.key)) setShowMoreMenu(false);
      }}
      style={{
        width: "100%", textAlign: "left", marginBottom: 8, padding: "11px 12px", borderRadius: 12,
        border: tab === item.key ? "1px solid #3b82f6" : "1px solid transparent",
        background: tab === item.key ? "#1d4ed8" : "transparent", color: "#e5e7eb", cursor: "pointer", fontWeight: 700,
      }}
    >
      <span style={{ marginRight: 8 }}>{item.icon}</span>{item.label}
    </button>
  );

  const StatusBadge = ({ status }) => (
    <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: status === "Sold" ? "#7f1d1d" : status === "Hold" ? "#713f12" : "#064e3b" }}>
      {status || "Available"}
    </span>
  );

  const ActionButtons = ({ card }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={styles.button} onClick={() => { setSelectedCard(card); setTab("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>View</button>
      {card.status !== "Sold" && <button style={styles.primary} onClick={() => addToCart(card)}>Add to Cart</button>}
      {card.status !== "Sold" && <button style={styles.button} onClick={() => markAsSold(card)}>Quick Sell</button>}
    </div>
  );

  const getPageTitle = () => {
    const titles = {
      dashboard: "Dashboard",
      inventory: "Inventory",
      quickAddCard: "Quick Add Card",
      stockIn: editingId ? "Edit Item" : "Stock In",
      cart: "Cart / Checkout",
      sales: "Sales History",
      customers: "Customers",
      count: "Inventory Count",
      activityLogs: "Activity Logs",
      transactions: "Transactions",
      trades: "Trades",
      reports: "Reports",
      detail: "Item Details",
    };
    return titles[tab] || "Inventory";
  };

  if (!user) {
    return (
      <div style={styles.app}>
        {toast && <Toast toast={toast} />}
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "80px 18px" }}>
          <div style={styles.card}>
            <h1 style={{ marginTop: 0 }}>Vault X TCG</h1>
            <div style={{ ...styles.muted, marginBottom: 18 }}>Professional inventory and sales system</div>
            {authMode === "signup" && <input placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />}
            <input placeholder="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={styles.input} />
            <input placeholder="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={styles.input} />
            {authMode === "login" ? (
              <button disabled={saving} onClick={signIn} style={{ ...styles.primary, width: "100%" }}>{saving ? "Logging in..." : "Login"}</button>
            ) : (
              <button disabled={saving} onClick={signUp} style={{ ...styles.primary, width: "100%" }}>{saving ? "Creating..." : "Create Account"}</button>
            )}
            <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} style={{ ...styles.button, width: "100%", marginTop: 10 }}>
              {authMode === "login" ? "Need an account?" : "Already have an account?"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {toast && <Toast toast={toast} />}
      {modal && <Modal modal={modal} setModal={setModal} closeModal={closeModal} styles={styles} />}
      {lastReceipt && <ReceiptModal receipt={lastReceipt} close={() => setLastReceipt(null)} styles={styles} />}
      {saving && <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 30, display: "grid", placeItems: "center", pointerEvents: "none" }}><div style={styles.card}>Saving...</div></div>}

      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Vault X TCG</div>
          <div style={{ ...styles.muted, marginBottom: 18 }}>{userRole || "user"} · {user?.email}</div>
          {isMobile ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {mobilePrimaryNavItems.map((item) => (
                  <NavButton key={item.key} item={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 8,
                  padding: "11px 12px",
                  borderRadius: 12,
                  border: isMoreTabActive || showMoreMenu ? "1px solid #3b82f6" : "1px solid #334155",
                  background: isMoreTabActive || showMoreMenu ? "#1d4ed8" : "#1e293b",
                  color: "#e5e7eb",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ☰ More {showMoreMenu ? "▲" : "▼"}
              </button>

              {showMoreMenu && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  {mobileMoreNavItems.map((item) => (
                    <NavButton key={item.key} item={item} />
                  ))}
                </div>
              )}
            </>
          ) : (
            navItems.map((item) => <NavButton key={item.key} item={item} />)
          )}
          {cartCount > 0 && <button onClick={() => setTab("cart")} style={{ ...styles.primary, width: "100%", marginTop: 8 }}>🛒 Checkout ({cartCount})</button>}
          <button onClick={logout} style={{ ...styles.button, width: "100%", marginTop: 14 }}>Logout</button>
        </aside>

        <main style={styles.main}>
          <div style={styles.topbar}>
            <div>
              <h1 style={{ margin: 0 }}>{getPageTitle()}</h1>
              <div style={styles.muted}>Reliable inventory, sales, trade, and audit tracking.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={styles.button} onClick={() => refreshAll()}>Refresh</button>
              <button style={styles.button} onClick={() => setTab("cart")}>Cart ({cartCount})</button>
              <button style={styles.button} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Raw Card" }); setTab("quickAddCard"); }}>Quick Add Card</button>
              <button style={styles.primary} onClick={() => { cancelEdit(); setForm({ ...emptyForm, category: "Sealed Product" }); setTab("stockIn"); }}>Stock In</button>
            </div>
          </div>

          {loading ? <Skeleton styles={styles} /> : (
            <>
              {tab === "dashboard" && <DashboardView />}
              {tab === "inventory" && <InventoryView />}
              {tab === "quickAddCard" && <QuickAddCardView />}
              {tab === "stockIn" && <StockInView />}
              {tab === "cart" && <CartView />}
              {tab === "sales" && <SalesView />}
              {tab === "customers" && <CustomersView />}
              {tab === "count" && <InventoryCountView />}
              {tab === "detail" && selectedCard && <DetailView />}
              {tab === "transactions" && <TransactionsView />}
              {tab === "trades" && <TradesView />}
              {tab === "activityLogs" && <ActivityLogsView />}
              {tab === "reports" && <ReportsView />}
            </>
          )}
        </main>
      </div>
    </div>
  );

  function PaginationControls() {
    if (filtered.length <= PAGE_SIZE) return null;

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <div style={styles.muted}>
          Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ ...styles.button, opacity: page === 1 ? 0.45 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={styles.muted}>Page {page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ ...styles.button, opacity: page >= totalPages ? 0.45 : 1, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  function DashboardCards() {
    const items = [
      { label: "Inventory Qty", value: inventoryQty },
      { label: "Inventory Cost", value: money(totalCost) },
      { label: "Inventory Value", value: money(totalValue) },
      { label: "Today Sales", value: money(todaySales) },
      { label: "Sold Revenue", value: money(soldRevenue) },
      { label: "Realized Profit", value: money(soldRevenue - soldCost) },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(6, 1fr)", gap: 12, marginBottom: 16 }}>
        {items.map((item) => (
          <div key={item.label} style={styles.card}>
            <div style={styles.muted}>{item.label}</div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, marginTop: 6 }}>{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  function DashboardView() {
    const q = globalSearch.toLowerCase().trim();
    const matchingCards = q ? cards.filter((card) => [card.name, card.inventory_id, card.card_number, card.storage_location, card.status].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
    const matchingSales = q ? sales.filter((sale) => [sale.sale_number, sale.customer_name, sale.customer_tel, sale.payment_method].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
    const matchingTrades = q ? tradeDeals.filter((deal) => [deal.trade_number, deal.customer_name, deal.customer_tel, deal.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];
    const matchingCustomers = q ? customers.filter((customer) => [customer.name, customer.tel, customer.email, customer.notes].some((v) => String(v || "").toLowerCase().includes(q))).slice(0, 8) : [];

    return (
      <div>
        <DashboardCards />
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Global Search</h3>
          <input
            placeholder="Search card, inventory ID, sale #, trade #, customer..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            style={{ ...styles.input, marginBottom: 0 }}
          />
        </div>

        {q && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <SearchResultCard title="Cards" rows={matchingCards} render={(card) => (
              <button key={card.id} style={{ ...styles.button, textAlign: "left", width: "100%", marginBottom: 8 }} onClick={() => { setSelectedCard(card); setTab("detail"); }}>
                {card.inventory_id || "N/A"} · {card.name} · Qty {card.quantity || 0}
              </button>
            )} />
            <SearchResultCard title="Sales" rows={matchingSales} render={(sale) => (
              <div key={sale.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{sale.sale_number} · {sale.customer_name || "Walk-in"} · {money(sale.total)}</div>
            )} />
            <SearchResultCard title="Trades" rows={matchingTrades} render={(deal) => (
              <div key={deal.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{deal.trade_number} · {deal.customer_name || "N/A"} · Cash {money(deal.cash_difference)}</div>
            )} />
            <SearchResultCard title="Customers" rows={matchingCustomers} render={(customer) => (
              <div key={customer.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{customer.name} · {customer.tel || "No tel"} · Credit {money(customer.store_credit)}</div>
            )} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 16 }}>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Recent Sales</h3>
            {sales.slice(0, 5).map((sale) => <div key={sale.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{sale.sale_number} · {money(sale.total)} · {sale.customer_name || "Walk-in"}</div>)}
            {!sales.length && <div style={styles.muted}>No sales yet.</div>}
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Recent Trades</h3>
            {tradeDeals.slice(0, 5).map((deal) => <div key={deal.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{deal.trade_number} · {deal.customer_name || "N/A"} · Cash {money(deal.cash_difference)}</div>)}
            {!tradeDeals.length && <div style={styles.muted}>No trades yet.</div>}
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Recent Activity</h3>
            {activityLogs.slice(0, 5).map((log) => <div key={log.id} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>{log.action} · {log.inventory_id || "N/A"}</div>)}
            {!activityLogs.length && <div style={styles.muted}>No activity yet.</div>}
          </div>
        </div>
      </div>
    );
  }

  function SearchResultCard({ title, rows, render }) {
    return (
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {rows.length ? rows.map(render) : <div style={styles.muted}>No matches.</div>}
      </div>
    );
  }

  function InventoryView() {
    return (
      <>
        <DashboardCards />
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <input placeholder="Search inventory ID, name, category, SKU / card #, location, status..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
        </div>
        {canAdjust && (
          <div style={{ ...styles.card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <b>Bulk Actions</b>
            <span style={styles.muted}>{bulkSelected.length} selected</span>
            <button style={styles.button} onClick={() => setBulkSelected(pagedCards.map((card) => card.id))}>Select Page</button>
            <button style={styles.button} onClick={() => setBulkSelected([])}>Clear</button>
            <button style={styles.button} onClick={bulkMoveLocation}>Move Location</button>
            <button style={styles.button} onClick={bulkUpdatePrice}>Update Price</button>
            <button style={styles.button} onClick={bulkUpdateStatus}>Update Status</button>
          </div>
        )}
        {isMobile ? <MobileInventoryCards /> : <DesktopInventoryTable />}
      </>
    );
  }

  function DesktopInventoryTable() {
    return (
      <>
        <div style={{ ...styles.card, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#020617", color: "#94a3b8", textAlign: "left" }}>
              {(canAdjust ? ["Select", "Image", "Inventory ID", "Name", "Card #", "Qty", "Cost", "Price", "Location", "Status", "Actions"] : ["Image", "Inventory ID", "Name", "Card #", "Qty", "Cost", "Price", "Location", "Status", "Actions"]).map((h) => <th key={h} style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canAdjust ? 11 : 10} style={{ padding: 20, color: "#94a3b8" }}>No items found.</td></tr>}
            {pagedCards.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                {canAdjust && <td style={{ padding: 10 }}><input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={(e) => setBulkSelected((prev) => e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id))} /></td>}
                <td style={{ padding: 10 }}>{c.front_image ? <img loading="lazy" src={c.front_image} alt="front" style={{ width: 46, height: 64, objectFit: "cover", borderRadius: 8 }} /> : <div style={{ width: 46, height: 64, borderRadius: 8, background: "#020617" }} />}</td>
                <td style={{ padding: 10, fontWeight: 800 }}>{c.inventory_id || "N/A"}</td>
                <td style={{ padding: 10 }}>{c.name}</td>
                <td style={{ padding: 10, color: "#94a3b8" }}>{c.card_number || "N/A"}</td>
                <td style={{ padding: 10 }}>{c.quantity || 0}</td>
                <td style={{ padding: 10 }}>{money(c.cost)}</td>
                <td style={{ padding: 10 }}>{money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)}</td>
                <td style={{ padding: 10 }}>{c.storage_location || "N/A"}</td>
                <td style={{ padding: 10 }}><StatusBadge status={c.status} /></td>
                <td style={{ padding: 10 }}><ActionButtons card={c} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <PaginationControls />
      </>
    );
  }

  function MobileInventoryCards() {
    return (
      <>
        <div style={{ display: "grid", gap: 12 }}>
        {filtered.length === 0 && <div style={styles.card}>No items found.</div>}
        {pagedCards.map((c) => (
          <div key={c.id} style={styles.card}>
            {canAdjust && <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><input type="checkbox" checked={bulkSelected.includes(c.id)} onChange={(e) => setBulkSelected((prev) => e.target.checked ? [...new Set([...prev, c.id])] : prev.filter((id) => id !== c.id))} /> Select</label>}
            <div style={{ display: "flex", gap: 12 }}>
              {c.front_image && <img loading="lazy" src={c.front_image} alt="front" style={{ width: 84, height: 116, objectFit: "cover", borderRadius: 10 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ ...styles.muted, fontWeight: 800 }}>{c.inventory_id || "N/A"}</div>
                <h3 style={{ margin: "6px 0" }}>{c.name}</h3>
                <div style={styles.muted}>{c.card_number || "N/A"}</div>
                <div style={{ marginTop: 8 }}><StatusBadge status={c.status} /></div>
              </div>
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div><div style={styles.muted}>Qty</div><b>{c.quantity || 0}</b></div>
              <div><div style={styles.muted}>Cost</div><b>{money(c.cost)}</b></div>
              <div><div style={styles.muted}>Price</div><b>{money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)}</b></div>
            </div>
            <div style={{ marginTop: 12 }}><ActionButtons card={c} /></div>
          </div>
        ))}
        </div>
        <PaginationControls />
      </>
    );
  }

  function CategorySelect({ value, onChange }) {
    return (
      <select value={value} onChange={onChange} style={styles.input}>
        {ITEM_CATEGORIES.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
    );
  }

  function GameLanguageSelect({ value, onChange }) {
    return (
      <select value={value} onChange={onChange} style={styles.input}>
        {GAME_OR_LANGUAGE_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  function QuickAddCardView() {
    const quickCategory = ["Raw Card", "Slab"].includes(form.category) ? form.category : "Raw Card";

    const submitQuickAdd = (e, keepAdding = false) => {
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
        <FormSection title="Quick Add Card">
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
            <GameLanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
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

  function StockInView() {
    return (
      <form onSubmit={saveCard} style={{ maxWidth: 900 }}>
        <button type="button" onClick={() => { cancelEdit(); setTab("inventory"); }} style={{ ...styles.button, marginBottom: 14 }}>← Back</button>
        <FormSection title={editingId ? "Edit Item" : "Stock In"}>
          <div style={{ ...styles.muted, marginBottom: 12 }}>
            Use Stock In for sealed product, slabs, merchandise, beverages, accessories, and full inventory receiving.
          </div>
          <input placeholder="Item Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={styles.input} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <CategorySelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <GameLanguageSelect value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <input type="number" min="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={styles.input} />
          <input placeholder="SKU / Card # / Product Code" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} style={styles.input} />
        </FormSection>
        <FormSection title="Pricing & Purchase">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <input placeholder="Unit Cost" value={form.cost} onChange={(e) => handleCostChange(e.target.value)} style={styles.input} />
            <input placeholder="Unit Price (defaults to 130% of cost)" value={form.price} onChange={(e) => { setPriceManuallyEdited(true); setForm({ ...form, price: e.target.value }); }} style={styles.input} />
          </div>
          <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={styles.input} />
          <input placeholder="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} style={styles.input} />
        </FormSection>
        <FormSection title="Vendor / Seller Info">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <input placeholder="Vendor / Seller Name" value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} style={styles.input} />
            <input placeholder="Vendor / Seller Tel" value={form.seller_tel} onChange={(e) => setForm({ ...form, seller_tel: e.target.value })} style={styles.input} />
          </div>
        </FormSection>
        <FormSection title="Storage & Status">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <input placeholder="Storage Location" value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} style={styles.input} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>
              <option value="Available">Available</option><option value="Hold">Hold</option><option value="Others">Others</option>
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: 90, resize: "vertical" }} />
        </FormSection>
        <FormSection title="Images">
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

  function FormSection({ title, children }) {
    return <div style={{ ...styles.card, marginBottom: 14 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>;
  }

  function DetailView() {
    const c = selectedCard;
    return (
      <div>
        <button onClick={() => { setSelectedCard(null); setTab("inventory"); }} style={{ ...styles.button, marginBottom: 14 }}>← Back</button>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "360px 1fr", gap: 16 }}>
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>{c.name}</h2>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              {c.front_image && <img loading="lazy" src={c.front_image} alt="front" style={{ width: "48%", borderRadius: 12 }} />}
              {c.back_image && <img loading="lazy" src={c.back_image} alt="back" style={{ width: "48%", borderRadius: 12 }} />}
            </div>
          </div>
          <div style={styles.card}>
            <DetailRow label="Inventory ID" value={c.inventory_id || "N/A"} />
            <DetailRow label="Barcode" value={<Barcode value={c.inventory_id || `VX-${String(c.id).padStart(6, "0")}`} />} />
            <DetailRow label="Category" value={c.category} />
            <DetailRow label="SKU / Card #" value={c.card_number} />
            <DetailRow label="Language" value={c.language} />
            <DetailRow label="Quantity" value={c.quantity || 0} />
            <DetailRow label="Cost" value={money(c.cost)} />
            <DetailRow label="List Price" value={money(Number(c.price || 0) > 0 ? c.price : Number(c.cost || 0) * 1.3)} />
            <DetailRow label="Purchase Date" value={c.purchase_date} />
            <DetailRow label="Payment" value={c.payment_method} />
            <DetailRow label="Seller" value={c.seller_name} />
            <DetailRow label="Seller Tel" value={c.seller_tel} />
            <DetailRow label="Location" value={c.storage_location} />
            <DetailRow label="Status" value={<StatusBadge status={c.status} />} />
            {c.status === "Sold" && <>
              <DetailRow label="Sold Price" value={money(c.sold_price)} />
              <DetailRow label="Sold Date" value={c.sold_date} />
              <DetailRow label="Receiving Method" value={c.receiving_method} />
              <DetailRow label="Profit" value={money(Number(c.sold_price || 0) - Number(c.cost || 0))} />
            </>}
            <DetailRow label="Notes" value={c.notes} />
            <DetailActions card={c} />
          </div>
        </div>
        <ItemActivityView card={c} />
      </div>
    );
  }

  function DetailRow({ label, value }) {
    return <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b" }}><div style={styles.muted}>{label}</div><div>{value || "N/A"}</div></div>;
  }

  function DetailActions({ card }) {
    const [showMore, setShowMore] = useState(false);
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {card.status !== "Sold" && <button style={styles.primary} onClick={() => addToCart(card)}>Add to Cart</button>}
          {card.status !== "Sold" && <button style={styles.button} onClick={() => markAsSold(card)}>Quick Sell</button>}
              <button style={styles.button} onClick={() => setShowMore((v) => !v)}>More Actions {showMore ? "▲" : "▼"}</button>
        </div>
        {showMore && (
          <div style={{ ...styles.card, marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {card.status !== "Sold" && canHold && card.status !== "Hold" && <button style={styles.button} onClick={() => updateCardStatus(card, "Hold")}>Place Hold</button>}
            {card.status !== "Sold" && canHold && card.status === "Hold" && <button style={styles.button} onClick={() => updateCardStatus(card, "Available")}>Release Hold</button>}
            {card.status !== "Sold" && canAdjust && <button style={styles.button} onClick={() => adjustQuantity(card)}>Adjust Qty</button>}
            {card.status === "Sold" && canEditSale && <button style={styles.button} onClick={() => editSale(card)}>Edit Sale</button>}
            {card.status === "Sold" && canEditSale && <button style={styles.button} onClick={() => undoSale(card)}>Undo Sale</button>}
            <button style={styles.button} onClick={() => window.open(`https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(`${card.name} ${card.card_number}`)}`, "_blank")}>TCGplayer</button>
            <button style={styles.button} onClick={() => window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${card.name} ${card.card_number}`)}`, "_blank")}>eBay</button>
            {canDelete && <button style={styles.danger} onClick={() => deleteCard(card.id)}>Delete</button>}
          </div>
        )}
      </div>
    );
  }

  function ItemActivityView({ card }) {
    const { logMatches, transactionMatches, saleMatches, tradeMatches } = getItemActivity(card);
    return (
      <div style={{ ...styles.card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Item Activity</h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <MiniActivityList title="Activity Logs" rows={logMatches} render={(log) => `${fmtDate(log.created_at)} · ${log.action} · ${log.notes || ""}`} />
          <MiniActivityList title="Inventory Transactions" rows={transactionMatches} render={(tx) => `${fmtDate(tx.created_at)} · ${tx.transaction_type} · Qty ${tx.quantity} · ${money(tx.price)} · ${tx.notes || ""}`} />
          <MiniActivityList title="Sales" rows={saleMatches} render={(item) => `${item.sale?.sale_number || "Sale"} · ${fmtDate(item.sale?.created_at)} · Qty ${item.quantity} · ${money(item.total_price)}`} />
          <MiniActivityList title="Trades" rows={tradeMatches} render={(item) => `${item.deal?.trade_number || "Trade"} · ${item.direction} · Qty ${item.quantity} · ${money(item.trade_value)}`} />
        </div>
      </div>
    );
  }

  function MiniActivityList({ title, rows, render }) {
    return (
      <div>
        <h4 style={{ marginTop: 0 }}>{title}</h4>
        {rows.length ? rows.map((row, index) => <div key={`${title}-${row.id || index}`} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b", color: "#cbd5e1" }}>{render(row)}</div>) : <div style={styles.muted}>No records.</div>}
      </div>
    );
  }


  function TradesView() {
    const [mode, setMode] = useState("history");
    const [customerName, setCustomerName] = useState("");
    const [customerTel, setCustomerTel] = useState("");
    const [cashDifference, setCashDifference] = useState(0);
    const [tradeNotes, setTradeNotes] = useState("");
    const [inItems, setInItems] = useState([]);
    const [outItems, setOutItems] = useState([]);
    const [inventorySearch, setInventorySearch] = useState("");

    const availableCards = cards.filter((c) => c.status !== "Sold" && Number(c.quantity || 0) > 0);
    const tradeOutSearchResults = availableCards.filter((c) => {
      const keyword = inventorySearch.toLowerCase().trim();
      if (!keyword) return true;
      return [c.inventory_id, c.name, c.card_number, c.storage_location, c.category]
        .some((value) => String(value || "").toLowerCase().includes(keyword));
    }).slice(0, 20);

    const inTotal = inItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
    const outTotal = outItems.reduce((sum, item) => sum + Number(item.tradeValue || 0), 0);
    const expectedCash = outTotal - inTotal;

    const addTradeInItem = async () => {
      const result = await askModal({
        title: "Add trade-in item",
        message: "Card received from customer. Trade value is the total value for this line.",
        confirmText: "Add Item",
        fields: [
          { name: "name", label: "Card Name / Product Name" },
          { name: "cardNumber", label: "SKU / Card # / ID" },
          { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
          { name: "tradeValue", label: "Total Trade-In Value", type: "number", defaultValue: 0 },
          { name: "listPrice", label: "List Price Per Card", type: "number", defaultValue: 0 },
          { name: "category", label: "Category", defaultValue: "Others" },
          { name: "language", label: "Language", defaultValue: "English" },
          { name: "location", label: "Storage Location" },
          { name: "notes", label: "Notes" },
        ],
      });
      if (!result) return;
      if (!result.name?.trim()) return showToast("Card name is required", "error");
      const qty = Number(result.quantity || 1);
      const tradeValue = Number(result.tradeValue || 0);
      const defaultListPrice = qty ? Number(((tradeValue / qty) * 1.3).toFixed(2)) : 0;
      setInItems((prev) => [...prev, { ...result, quantity: qty, tradeValue, listPrice: result.listPrice === "" || result.listPrice === undefined ? defaultListPrice : Number(result.listPrice || defaultListPrice) }]);
    };

    const addTradeOutItem = async (card) => {
      const result = await askModal({
        title: "Add inventory item to trade out",
        message: `${card.inventory_id} · ${card.name} · Available: ${card.quantity}`,
        confirmText: "Add Trade Out",
        fields: [
          { name: "quantity", label: "Quantity", type: "number", defaultValue: 1 },
          { name: "tradeValue", label: "Total Trade-Out Value", type: "number", defaultValue: Number(card.price || 0) },
        ],
      });
      if (!result) return;
      const quantity = Number(result.quantity || 0);
      if (quantity < 1) return showToast("Quantity must be at least 1", "error");
      if (quantity > Number(card.quantity || 0)) return showToast("Not enough inventory", "error");
      setOutItems((prev) => [...prev, { cardId: card.id, inventoryId: card.inventory_id, name: card.name, cardNumber: card.card_number, availableQty: card.quantity, quantity, tradeValue: Number(result.tradeValue || 0) }]);
    };

    const removeInItem = (index) => setInItems((prev) => prev.filter((_, i) => i !== index));
    const removeOutItem = (index) => setOutItems((prev) => prev.filter((_, i) => i !== index));

    const resetTradeForm = () => {
      setCustomerName("");
      setCustomerTel("");
      setCashDifference(0);
      setTradeNotes("");
      setInItems([]);
      setOutItems([]);
      setInventorySearch("");
    };

    const confirmTrade = async () => {
      await createTradeDeal({
        customerName,
        customerTel,
        cashDifference: Number(cashDifference || 0),
        notes: tradeNotes,
        inItems,
        outItems,
      });
      resetTradeForm();
      setMode("history");
    };

    if (mode === "new") {
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <button type="button" style={styles.button} onClick={() => setMode("history")}>← Trade History</button>
            <button type="button" style={styles.primary} onClick={confirmTrade}>Confirm Trade Deal</button>
          </div>

          <div style={{ ...styles.card, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Trade Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10 }}>
              <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={styles.input} />
              <input placeholder="Customer Tel" value={customerTel} onChange={(e) => setCustomerTel(e.target.value)} style={styles.input} />
              <input type="number" placeholder="Cash Difference" value={cashDifference} onChange={(e) => setCashDifference(e.target.value)} style={styles.input} />
            </div>
            <textarea placeholder="Trade notes" value={tradeNotes} onChange={(e) => setTradeNotes(e.target.value)} style={{ ...styles.input, minHeight: 74, resize: "vertical" }} />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 10 }}>
              <div><div style={styles.muted}>Customer gives us</div><b>{money(inTotal)}</b></div>
              <div><div style={styles.muted}>We give customer</div><b>{money(outTotal)}</b></div>
              <div><div style={styles.muted}>Expected cash</div><b>{money(expectedCash)}</b></div>
              <div><div style={styles.muted}>Cash recorded</div><b>{money(cashDifference)}</b></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <h3 style={{ marginTop: 0 }}>Customer Gives Us</h3>
                <button type="button" style={styles.primary} onClick={addTradeInItem}>+ Add Item</button>
              </div>
              {inItems.length === 0 && <div style={styles.muted}>No trade-in items yet.</div>}
              {inItems.map((item, index) => (
                <div key={`${item.name}-${index}`} style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 10 }}>
                  <b>{item.name}</b>
                  <div style={styles.muted}>{item.cardNumber || "N/A"} · Qty {item.quantity} · Value {money(item.tradeValue)}</div>
                  <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={() => removeInItem(index)}>Remove</button>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <h3 style={{ marginTop: 0 }}>We Give Customer</h3>
              <input placeholder="Search inventory to trade out..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} style={styles.input} />
              <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #1e293b", borderRadius: 12 }}>
                {tradeOutSearchResults.map((card) => (
                  <div key={card.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, padding: 10, borderBottom: "1px solid #1e293b", alignItems: "center" }}>
                    <div>
                      <b>{card.inventory_id}</b> · {card.name}
                      <div style={styles.muted}>{card.card_number || "N/A"} · Qty {card.quantity || 0} · Price {money(card.price)} · {card.storage_location || "No location"}</div>
                    </div>
                    <button type="button" style={styles.button} onClick={() => addTradeOutItem(card)}>Add</button>
                  </div>
                ))}
              </div>
              <h4>Selected Trade-Out Items</h4>
              {outItems.length === 0 && <div style={styles.muted}>No inventory items selected.</div>}
              {outItems.map((item, index) => (
                <div key={`${item.inventoryId}-${index}`} style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 10 }}>
                  <b>{item.inventoryId}</b> · {item.name}
                  <div style={styles.muted}>{item.cardNumber || "N/A"} · Qty {item.quantity} · Value {money(item.tradeValue)}</div>
                  <button type="button" style={{ ...styles.button, marginTop: 8 }} onClick={() => removeOutItem(index)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div style={styles.muted}>Multi-item trade deals. Trade-out items are selected from inventory.</div>
          {canTrade && <button type="button" style={styles.primary} onClick={() => setMode("new")}>+ New Trade Deal</button>}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {tradeDeals.length === 0 && <div style={styles.card}>No trade deals yet.</div>}
          {tradeDeals.map((deal) => {
            const items = deal.trade_items || [];
            const ins = items.filter((item) => item.direction === "IN");
            const outs = items.filter((item) => item.direction === "OUT");
            const inTotal = ins.reduce((sum, item) => sum + Number(item.trade_value || 0), 0);
            const outTotal = outs.reduce((sum, item) => sum + Number(item.trade_value || 0), 0);
            return (
              <div key={deal.id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{deal.trade_number || `T-${String(deal.id).padStart(6, "0")}`}</h3>
                    <div style={styles.muted}>{fmtDate(deal.created_at)} · {deal.customer_name || "No customer"} {deal.customer_tel ? `· ${deal.customer_tel}` : ""}</div>
                  </div>
                  <div style={{ textAlign: isMobile ? "left" : "right" }}>
                    <div>Cash Difference: <b>{money(deal.cash_difference)}</b></div>
                    <div style={styles.muted}>In {money(inTotal)} · Out {money(outTotal)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 12 }}>
                  <div>
                    <b>Customer Gives Us</b>
                    {ins.length === 0 && <div style={styles.muted}>None</div>}
                    {ins.map((item) => <div key={item.id} style={styles.muted}>+ {item.card_name} · Qty {item.quantity} · {money(item.trade_value)} · {item.inventory_id}</div>)}
                  </div>
                  <div>
                    <b>We Give Customer</b>
                    {outs.length === 0 && <div style={styles.muted}>None</div>}
                    {outs.map((item) => <div key={item.id} style={styles.muted}>- {item.card_name} · Qty {item.quantity} · {money(item.trade_value)} · {item.inventory_id}</div>)}
                  </div>
                </div>
                {deal.notes && <div style={{ ...styles.muted, marginTop: 10 }}>Notes: {deal.notes}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function CartView() {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 16 }}>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Cart Items</h3>
            {cart.length === 0 && <div style={styles.muted}>Cart is empty. Go to Inventory and click Add to Cart.</div>}
            {cart.map((item) => (
              <div key={item.cardId} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 110px 120px 90px", gap: 10, alignItems: "center", borderTop: "1px solid #1e293b", paddingTop: 12, marginTop: 12 }}>
                <div>
                  <b>{item.name}</b>
                  <div style={styles.muted}>{item.inventoryId} · {item.cardNumber || "N/A"} · Available {item.availableQty}</div>
                </div>
                <input type="number" min="1" max={item.availableQty} value={item.quantity} onChange={(e) => updateCartQty(item.cardId, e.target.value)} style={{ ...styles.input, marginBottom: 0 }} />
                <input type="number" min="0" value={item.unitPrice} onChange={(e) => setCart((prev) => prev.map((x) => x.cardId === item.cardId ? { ...x, unitPrice: Number(e.target.value || 0) } : x))} style={{ ...styles.input, marginBottom: 0 }} />
                <button style={styles.button} onClick={() => removeFromCart(item.cardId)}>Remove</button>
              </div>
            ))}
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Checkout</h3>
            <DetailRow label="Items" value={cartCount} />
            <DetailRow label="Subtotal" value={money(cartSubtotal)} />
            <DetailRow label="Tax" value={money(cartTax)} />
            <DetailRow label="Total" value={money(cartTotal)} />
            <button disabled={!cart.length || saving} style={{ ...styles.primary, width: "100%", marginTop: 12 }} onClick={completeCheckout}>Complete Sale</button>
            <button disabled={!cart.length} style={{ ...styles.button, width: "100%", marginTop: 10 }} onClick={() => setCart([])}>Clear Cart</button>
          </div>
        </div>
      </div>
    );
  }

  function SalesView() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {lastReceipt && <button style={styles.button} onClick={() => setLastReceipt(lastReceipt)}>View Last Receipt</button>}
        {sales.length === 0 && <div style={styles.card}>No sales yet.</div>}
        {sales.map((sale) => (
          <div key={sale.id} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>{sale.sale_number || `S-${String(sale.id).padStart(6, "0")}`}</h3>
                <div style={styles.muted}>{fmtDate(sale.created_at)} · {sale.customer_name || "Walk-in Customer"}</div>
              </div>
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <b>{money(sale.total)}</b>
                <div style={styles.muted}>{sale.payment_method || "N/A"}</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              {(sale.sale_items || []).map((item) => (
                <div key={item.id} style={styles.muted}>{item.card_name} · Qty {item.quantity} · {money(item.total_price)} · {item.inventory_id}</div>
              ))}
            </div>
            <button style={{ ...styles.button, marginTop: 10 }} onClick={() => setLastReceipt({
              sale_number: sale.sale_number || `S-${String(sale.id).padStart(6, "0")}`,
              created_at: sale.created_at,
              customer_name: sale.customer_name,
              subtotal: sale.subtotal,
              tax: sale.tax,
              store_credit_used: sale.store_credit_used,
              total: sale.total,
              payment_method: sale.payment_method,
              items: (sale.sale_items || []).map((i) => ({ name: i.card_name, inventoryId: i.inventory_id, quantity: i.quantity, unitPrice: i.unit_price }))
            })}>Receipt</button>
          </div>
        ))}
      </div>
    );
  }

  function CustomersView() {
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
      await refreshAll();
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
      await refreshAll();
      showToast("Store credit updated");
    };

    return (
      <div>
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 240 }} />
            <button style={styles.primary} onClick={addCustomer}>+ Add Customer</button>
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
              <button style={{ ...styles.button, marginTop: 10 }} onClick={() => adjustCredit(customer)}>Adjust Store Credit</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function InventoryCountView() {
    const scanned = countedInventoryIds
      .split(/\n|,|\s+/)
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean);
    const scannedSet = new Set(scanned);
    const missing = inventoryCards.filter((card) => !scannedSet.has(String(card.inventory_id || "").toUpperCase()));
    const extra = scanned.filter((id) => !inventoryCards.some((card) => String(card.inventory_id || "").toUpperCase() === id));

    return (
      <div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Inventory Count Mode</h3>
          <div style={styles.muted}>Scan or paste inventory IDs. One ID per line is best.</div>
          <textarea
            value={countedInventoryIds}
            onChange={(e) => setCountedInventoryIds(e.target.value)}
            placeholder="VX-000001
VX-000002
VX-000003"
            style={{ ...styles.input, minHeight: 180, marginTop: 12 }}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={styles.card}>Scanned: <b>{scanned.length}</b></div>
            <div style={styles.card}>Missing: <b>{missing.length}</b></div>
            <div style={styles.card}>Unknown IDs: <b>{extra.length}</b></div>
          </div>
          {canAdjust && <button style={{ ...styles.danger, marginTop: 12 }} onClick={applyInventoryCountMissing}>Set Missing Items to 0</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Missing From Count</h3>
            {missing.slice(0, 100).map((card) => <div key={card.id} style={{ padding: "7px 0", borderBottom: "1px solid #1e293b" }}>{card.inventory_id} · {card.name} · Qty {card.quantity}</div>)}
            {!missing.length && <div style={styles.muted}>No missing items.</div>}
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Unknown Scanned IDs</h3>
            {extra.slice(0, 100).map((id) => <div key={id} style={{ padding: "7px 0", borderBottom: "1px solid #1e293b" }}>{id}</div>)}
            {!extra.length && <div style={styles.muted}>No unknown IDs.</div>}
          </div>
        </div>
      </div>
    );
  }

  function TransactionsView() {
    return <LogTable rows={transactions} headers={["created_at", "user_email", "transaction_type", "inventory_id", "card_number", "quantity", "cost", "price", "notes"]} />;
  }

  function ActivityLogsView() {
    const actions = ["ALL", ...Array.from(new Set(activityLogs.map((log) => String(log.action || "").toUpperCase()).filter(Boolean)))];
    const filteredLogs = activityFilter === "ALL"
      ? activityLogs
      : activityLogs.filter((log) => String(log.action || "").toUpperCase() === activityFilter);
    return (
      <div>
        <div style={{ ...styles.card, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b>Filter</b>
          {actions.map((action) => (
            <button
              key={action}
              style={activityFilter === action ? styles.primary : styles.button}
              onClick={() => setActivityFilter(action)}
            >
              {action}
            </button>
          ))}
        </div>
        <LogTable rows={filteredLogs} headers={["created_at", "user_email", "action", "inventory_id", "card_number", "notes"]} />
      </div>
    );
  }

  function LogTable({ rows, headers }) {
    const getActionRowStyle = (row) => {
      const action = String(row.action || row.transaction_type || "").toUpperCase();
      if (["ADD", "IMPORT", "TRADE_IN"].includes(action)) return { background: "rgba(22, 101, 52, 0.18)" };
      if (["SOLD", "SELL", "TRADE_OUT"].includes(action)) return { background: "rgba(127, 29, 29, 0.22)" };
      if (["EDIT", "EDIT_SALE", "ADJUSTMENT", "BULK_EDIT", "COUNT_ADJUSTMENT"].includes(action)) return { background: "rgba(113, 63, 18, 0.22)" };
      if (["HOLD", "RELEASE_HOLD", "TRADE"].includes(action)) return { background: "rgba(30, 64, 175, 0.20)" };
      if (["DELETE", "UNDO_SALE"].includes(action)) return { background: "rgba(88, 28, 135, 0.20)" };
      return {};
    };
    return (
      <div style={{ ...styles.card, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead><tr style={{ background: "#020617", color: "#94a3b8", textAlign: "left" }}>{headers.map((h) => <th key={h} style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 18, color: "#94a3b8" }}>No records found.</td></tr>}
            {rows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #1e293b", ...getActionRowStyle(row) }}>{headers.map((h) => <td key={h} style={{ padding: 12, verticalAlign: "top" }}>{h === "created_at" ? fmtDate(row[h]) : h === "cost" || h === "price" ? money(row[h]) : String(row[h] ?? "")}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    );
  }

  function ReportsView() {
    return (
      <div>
        <DashboardCards />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Export Tools</h3>
            <button onClick={exportInventoryCSV} style={styles.button}>Export Inventory CSV</button>{" "}
            <button onClick={exportSalesCSV} style={styles.button}>Export Sales CSV</button>{" "}
            <button onClick={exportActivityLogCSV} style={styles.button}>Export Activity Log CSV</button>{" "}
            <button onClick={exportTransactionsCSV} style={styles.button}>Export Transactions CSV</button>
          </div>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Import Tools</h3>
            <button type="button" onClick={downloadExcelTemplate} style={styles.button}>Download Excel Template</button>
            <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display: "block", marginTop: 12 }} />
          </div>
        </div>
      </div>
    );
  }
}

function Barcode({ value }) {
  const bars = String(value || "VX").split("").map((ch) => (ch.charCodeAt(0) % 4) + 2);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "end", gap: 2, height: 42, background: "white", padding: 6, borderRadius: 6, width: "fit-content" }}>
        {bars.map((w, i) => <div key={i} style={{ width: w, height: 30 + (i % 3) * 4, background: "black" }} />)}
      </div>
      <div style={{ fontFamily: "monospace", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ReceiptModal({ receipt, close, styles }) {
  const printReceipt = () => window.print();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", zIndex: 90, display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>Vault X TCG Receipt</h2>
        <div style={{ color: "#94a3b8", marginBottom: 12 }}>{receipt.sale_number} · {new Date(receipt.created_at).toLocaleString()}</div>
        <div style={{ marginBottom: 12 }}>Customer: {receipt.customer_name || "Walk-in Customer"}</div>
        {(receipt.items || []).map((item, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", padding: "7px 0", gap: 10 }}>
            <div>{item.name}<div style={{ color: "#94a3b8", fontSize: 12 }}>{item.inventoryId} · Qty {item.quantity}</div></div>
            <div>{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><b>{money(receipt.subtotal)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax</span><b>{money(receipt.tax)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Store Credit Used</span><b>{money(receipt.store_credit_used)}</b></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, marginTop: 8 }}><span>Total</span><b>{money(receipt.total)}</b></div>
          <div style={{ color: "#94a3b8", marginTop: 8 }}>Payment: {receipt.payment_method}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <button style={styles.button} onClick={printReceipt}>Print</button>
          <button style={styles.primary} onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100, padding: "12px 14px", borderRadius: 12, background: toast.type === "error" ? "#7f1d1d" : "#064e3b", color: "white", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", maxWidth: 360 }}>
      {toast.message}
    </div>
  );
}

function Modal({ modal, setModal, closeModal, styles }) {
  const updateValue = (name, value) => {
    setModal((prev) => ({ ...prev, values: { ...prev.values, [name]: value } }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", zIndex: 80, display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>{modal.title}</h2>
        {modal.message && <div style={{ color: "#94a3b8", marginBottom: 14 }}>{modal.message}</div>}
        {modal.fields.map((field) => (
          <label key={field.name} style={{ display: "block", marginBottom: 10 }}>
            <div style={{ marginBottom: 5, fontWeight: 700 }}>{field.label}</div>
            <input
              type={field.type || "text"}
              placeholder={field.placeholder || ""}
              value={modal.values[field.name] ?? ""}
              onChange={(e) => updateValue(field.name, e.target.value)}
              style={styles.input}
            />
          </label>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <button style={styles.button} onClick={() => closeModal(null)}>Cancel</button>
          <button style={modal.danger ? styles.danger : styles.primary} onClick={() => closeModal(modal.values)}>{modal.confirmText || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ styles }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={styles.card}>Loading data...</div>
      <div style={styles.card}>Preparing inventory dashboard...</div>
    </div>
  );
}
