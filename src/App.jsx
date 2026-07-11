import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { emptyForm, money, diffObjects, getStyles, PAGE_SIZE } from "./utils/helpers";
import {
  ACTIVITY_FILTER_ALL,
  CARD_STATUS_AVAILABLE,
  CARD_STATUS_SOLD,
  DEFAULT_TAB,
  FORM_STATUS_PLACEHOLDER,
  MOBILE_BREAKPOINT,
} from "./config/constants";
import {
  RECEIVING_METHOD_PLACEHOLDER,
} from "./config/paymentMethods";
import { ADMIN_ROLES, OWNER_ROLE } from "./config/permissions";
import { importExcelFile } from "./utils/export";
import { addActivityLog as addActivityLogService } from "./services/activityService";
import { addTransaction as addTransactionService } from "./services/transactionService";
import { Toast, Modal, Skeleton, ReceiptModal } from "./components/Common";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import DashboardView from "./components/DashboardView";
import InventoryView from "./components/InventoryView";
import CartView from "./components/CartView";
import SalesView from "./components/SalesView";
import QuickAddCardView from "./components/QuickAddCardView";
import StockInView from "./components/StockInView";
import DetailView from "./components/DetailView";
import CustomersView from "./components/CustomersView";
import TradesView from "./components/TradesView";
import ActivityLogsView, { TransactionsView } from "./components/ActivityLogsView";
import ReportsView, { InventoryCountView } from "./components/ReportsView";
import { useInventoryEditor } from "./features/inventory/hooks/useInventoryEditor";
import { useInventoryActions } from "./features/inventory/hooks/useInventoryActions";
import { useInventorySave } from "./features/inventory/hooks/useInventorySave";
import { useCart } from "./features/cart/hooks/useCart";
import { useCheckout } from "./features/checkout/hooks/useCheckout";
import { useTrade } from "./features/trade/hooks/useTrade";

export default function App() {
  const [cards, setCards] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tradeDeals, setTradeDeals] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);

  const [tab, setTab] = useState(DEFAULT_TAB);
  const [selectedCard, setSelectedCard] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [gameFilter, setGameFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState(ACTIVITY_FILTER_ALL);
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const dataLoadedRef = useRef({
    activityLogs: false,
    transactions: false,
    tradeDeals: false,
    sales: false,
    customers: false,
  });

  const canAdmin = ADMIN_ROLES.includes(userRole);
  const canDelete = canAdmin;
  const canAdjust = canAdmin;
  const canEditSale = canAdmin;
  const canTrade = canAdmin;
  const canHold = canAdmin;

  const { startEdit, cancelEdit, handleCostChange } = useInventoryEditor({
    editingId,
    priceManuallyEdited,
    setEditingId,
    setPriceManuallyEdited,
    setForm,
    setFrontFile,
    setBackFile,
    setSelectedCard,
    setTab,
  });

  const styles = useMemo(() => getStyles(isMobile), [isMobile]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
    setBulkSelected([]);
  }, [search, categoryFilter, gameFilter, statusFilter, locationFilter, tab]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const askModal = useCallback(({ title, message, fields = [], confirmText = "Confirm", danger = false }) => {
    return new Promise((resolve) => {
      const initialValues = {};
      fields.forEach((field) => {
        initialValues[field.name] = field.defaultValue ?? "";
      });
      setModal({ title, message, fields, values: initialValues, confirmText, danger, resolve });
    });
  }, []);

  const closeModal = useCallback((result) => {
    setModal((current) => {
      if (current?.resolve) current.resolve(result);
      return null;
    });
  }, []);

  const {
    cart,
    setCart,
    cartTaxEnabled,
    setCartTaxEnabled,
    cartTaxRate,
    setCartTaxRate,
    cartDiscountType,
    setCartDiscountType,
    cartDiscountValue,
    setCartDiscountValue,
    cartSubtotal,
    cartCount,
    cartDiscountAmount,
    cartTaxableSubtotal,
    cartTax,
    cartTotal,
    addToCart,
    updateCartQty,
    updateCartUnitPrice,
    removeFromCart,
    clearCart,
  } = useCart({ askModal, showToast });

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
    dataLoadedRef.current.activityLogs = true;
  };

  const loadTransactions = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });
    if (error) {
      if (error.code !== "PGRST205") console.error("Transactions Load Error:", error);
      setTransactions([]);
      dataLoadedRef.current.transactions = true;
      return;
    }
    setTransactions(data || []);
    dataLoadedRef.current.transactions = true;
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
    dataLoadedRef.current.tradeDeals = true;
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
    dataLoadedRef.current.sales = true;
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
    dataLoadedRef.current.customers = true;
  };

  const refreshAll = async (targetCompanyId = companyId) => {
    if (!targetCompanyId) return;
    await loadCards(targetCompanyId);
    const loaded = dataLoadedRef.current;
    if (loaded.activityLogs) await loadActivityLogs(targetCompanyId);
    if (loaded.transactions) await loadTransactions(targetCompanyId);
    if (loaded.tradeDeals) await loadTradeDeals(targetCompanyId);
    if (loaded.sales) await loadSales(targetCompanyId);
    if (loaded.customers) await loadCustomers(targetCompanyId);
  };

  const refreshCustomers = useCallback(async () => {
    await loadCustomers(companyId);
  }, [companyId]);

  const ensureTabData = useCallback(async (currentTab, targetCompanyId) => {
    if (!targetCompanyId) return;
    const needs = {
      dashboard: ["sales", "tradeDeals", "customers", "activityLogs"],
      sales: ["sales"],
      cart: ["sales"],
      customers: ["customers"],
      trades: ["tradeDeals"],
      activityLogs: ["activityLogs"],
      transactions: ["transactions"],
      detail: ["activityLogs", "transactions", "sales", "tradeDeals"],
      reports: ["activityLogs", "transactions"],
    };
    const keys = needs[currentTab] || [];
    const loaders = {
      sales: loadSales,
      customers: loadCustomers,
      tradeDeals: loadTradeDeals,
      activityLogs: loadActivityLogs,
      transactions: loadTransactions,
    };
    await Promise.all(keys.map((key) => {
      if (!dataLoadedRef.current[key]) return loaders[key](targetCompanyId);
      return Promise.resolve();
    }));
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const currentCompanyId = await loadCompany(data.user);
        if (currentCompanyId) {
          await loadCards(currentCompanyId);
          window.setTimeout(() => {
            loadSales(currentCompanyId);
            loadCustomers(currentCompanyId);
            loadActivityLogs(currentCompanyId);
            loadTransactions(currentCompanyId);
            loadTradeDeals(currentCompanyId);
          }, 2000);
        }
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setLoading(true);
        dataLoadedRef.current = { activityLogs: false, transactions: false, tradeDeals: false, sales: false, customers: false };
        const currentCompanyId = await loadCompany(session.user);
        if (currentCompanyId) {
          await loadCards(currentCompanyId);
        }
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
        dataLoadedRef.current = { activityLogs: false, transactions: false, tradeDeals: false, sales: false, customers: false };
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (companyId && !loading) ensureTabData(tab, companyId);
  }, [tab, companyId, loading, ensureTabData]);

  const addActivityLog = useCallback(async ({ action, inventory_id, card_number, notes }) => {
    await addActivityLogService(companyId, user?.email, { action, inventory_id, card_number, notes });
  }, [companyId, user?.email]);

  const addTransaction = useCallback(async ({ inventory_id, card_number, transaction_type, quantity, cost, price, notes }) => {
    await addTransactionService(companyId, user?.email, { inventory_id, card_number, transaction_type, quantity, cost, price, notes });
  }, [companyId, user?.email]);

  const { updateCardStatus, deleteCard } = useInventoryActions({
    canHold,
    canDelete,
    cards,
    user,
    askModal,
    showToast,
    setSaving,
    addActivityLog,
    addTransaction,
    refreshAll,
    setSelectedCard,
    setTab,
  });

  const { saveCard } = useInventorySave({
    form,
    editingId,
    frontFile,
    backFile,
    companyId,
    user,
    cards,
    showToast,
    setSaving,
    setForm,
    setEditingId,
    setFrontFile,
    setBackFile,
    setPriceManuallyEdited,
    setTab,
    addActivityLog,
    addTransaction,
    refreshAll,
  });

  const { completeCheckout } = useCheckout({
    cart,
    setCart,
    cartSubtotal,
    cartDiscountAmount,
    cartTax,
    cartTotal,
    cartTaxEnabled,
    cartTaxRate,
    cartDiscountType,
    cartDiscountValue,
    cards,
    customers,
    companyId,
    user,
    askModal,
    showToast,
    setSaving,
    setLastReceipt,
    setTab,
    refreshAll,
  });

  const { createTradeDeal } = useTrade({
    cards,
    companyId,
    user,
    canTrade,
    showToast,
    setSaving,
    setTab,
    refreshAll,
  });

  const signIn = async () => {
    setSaving(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    setSaving(false);
    if (error) showToast(error.message, "error");
  };

  const signUp = async () => {
    if (!companyName.trim()) return showToast("Please enter company name", "error");
    setSaving(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (loginError) { setSaving(false); showToast(loginError.message, "error"); return; }
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) { setSaving(false); showToast("Account created, but user session was not found.", "error"); return; }
    const { data: companyData, error: companyError } = await supabase.from("companies").insert([{ name: companyName }]).select().single();
    if (companyError) { setSaving(false); showToast(companyError.message, "error"); return; }
    const { error: memberError } = await supabase.from("company_members").insert([{ company_id: companyData.id, user_id: currentUser.id, role: OWNER_ROLE }]);
    setSaving(false);
    if (memberError) { showToast(memberError.message, "error"); return; }
    setCompanyId(companyData.id);
    setUserRole(OWNER_ROLE);
    setUser(currentUser);
    showToast("Company created successfully");
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const getItemActivity = (card) => {
    const inventoryId = card?.inventory_id || "";
    const cardNumber = card?.card_number || "";
    const logMatches = activityLogs.filter((log) => (inventoryId && log.inventory_id === inventoryId) || (cardNumber && log.card_number === cardNumber));
    const transactionMatches = transactions.filter((tx) => (inventoryId && tx.inventory_id === inventoryId) || (cardNumber && tx.card_number === cardNumber));
    const saleMatches = sales.flatMap((sale) => (sale.sale_items || []).map((item) => ({ ...item, sale }))).filter((item) => (inventoryId && item.inventory_id === inventoryId) || (cardNumber && item.card_number === cardNumber));
    const tradeMatches = tradeDeals.flatMap((deal) => (deal.trade_items || []).map((item) => ({ ...item, deal }))).filter((item) => (inventoryId && item.inventory_id === inventoryId) || (cardNumber && item.card_number === cardNumber));
    return { logMatches, transactionMatches, saleMatches, tradeMatches };
  };

  const bulkMoveLocation = async () => {
    if (!canAdjust) return showToast("Only owner/admin can bulk update inventory", "error");
    if (!bulkSelected.length) return showToast("Select at least one card", "error");
    const result = await askModal({ title: "Bulk move location", message: `${bulkSelected.length} selected item(s)`, confirmText: "Move", fields: [{ name: "location", label: "New Location", placeholder: "Showcase A / Binder 3 / Shelf 2" }] });
    if (!result) return;
    setSaving(true);
    for (const card of cards.filter((c) => bulkSelected.includes(c.id))) {
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
    const result = await askModal({ title: "Bulk update price", message: `${bulkSelected.length} selected item(s)`, confirmText: "Update Price", fields: [{ name: "price", label: "New List Price", type: "number", defaultValue: 0 }] });
    if (!result) return;
    setSaving(true);
    for (const card of cards.filter((c) => bulkSelected.includes(c.id))) {
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
    const result = await askModal({ title: "Bulk update status", message: `${bulkSelected.length} selected item(s)`, confirmText: "Update Status", fields: [{ name: "status", label: "New Status", defaultValue: CARD_STATUS_AVAILABLE, placeholder: FORM_STATUS_PLACEHOLDER }] });
    if (!result) return;
    setSaving(true);
    for (const card of cards.filter((c) => bulkSelected.includes(c.id))) {
      await supabase.from("cards").update({ status: result.status || CARD_STATUS_AVAILABLE, updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "BULK_EDIT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Status changed: ${card.status || "blank"} → ${result.status || CARD_STATUS_AVAILABLE}` });
    }
    setBulkSelected([]);
    await refreshAll();
    setSaving(false);
    showToast("Status updated");
  };

  const inventoryCards = useMemo(() => cards.filter((c) => c.status !== CARD_STATUS_SOLD), [cards]);

  const applyInventoryCountMissing = async () => {
    if (!canAdjust) return showToast("Only owner/admin can apply inventory count", "error");
    const scanned = countedInventoryIds.split(/\n|,|\s+/).map((v) => v.trim().toUpperCase()).filter(Boolean);
    const scannedSet = new Set(scanned);
    const missing = inventoryCards.filter((card) => !scannedSet.has(String(card.inventory_id || "").toUpperCase()));
    if (!missing.length) return showToast("No missing items found");
    const confirmResult = await askModal({ title: "Apply count adjustment", message: `Set ${missing.length} missing item(s) quantity to 0?`, confirmText: "Set Missing to 0", danger: true, fields: [{ name: "reason", label: "Reason", defaultValue: "Inventory count missing" }] });
    if (!confirmResult) return;
    setSaving(true);
    for (const card of missing) {
      const oldQty = Number(card.quantity || 0);
      await supabase.from("cards").update({ quantity: 0, status: CARD_STATUS_SOLD, updated_by: user?.email }).eq("id", card.id);
      await addActivityLog({ action: "COUNT_ADJUSTMENT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Inventory count missing. Before qty: ${oldQty}; After qty: 0. Reason: ${confirmResult.reason || "Inventory count missing"}` });
      await addTransaction({ inventory_id: card.inventory_id, card_number: card.card_number, transaction_type: "COUNT_ADJUSTMENT", quantity: -oldQty, cost: Number(card.cost || 0) * oldQty, price: 0, notes: confirmResult.reason || "Inventory count missing" });
    }
    await refreshAll();
    setSaving(false);
    showToast("Inventory count adjustments applied");
  };

  const markAsSold = async (card) => {
    const availableQty = Number(card.quantity || 1);
    const result = await askModal({ title: "Mark as sold", message: `${card.name} · Available: ${availableQty}`, confirmText: "Record Sale", fields: [{ name: "soldQty", label: "Quantity Sold", type: "number", defaultValue: 1 }, { name: "soldPrice", label: "Total Sold Price", type: "number", defaultValue: Number(card.price || 0) > 0 ? Number(card.price || 0) : Number(card.cost || 0) * 1.3 }, { name: "soldDate", label: "Sold Date", type: "date", defaultValue: new Date().toISOString().slice(0, 10) }, { name: "receivingMethod", label: "Receiving Method", placeholder: RECEIVING_METHOD_PLACEHOLDER }] });
    if (!result) return;
    const soldQty = Number(result.soldQty || 0);
    const soldPrice = Number(result.soldPrice || 0);
    if (soldQty < 1) return showToast("Quantity sold must be at least 1", "error");
    if (soldQty > availableQty) return showToast("Not enough inventory", "error");
    if (soldPrice <= 0) return showToast("Sold price is required", "error");
    setSaving(true);
    const remainingQty = availableQty - soldQty;
    const updatePayload = { quantity: remainingQty, sold_price: Number(card.sold_price || 0) + soldPrice, sold_date: result.soldDate, receiving_method: result.receivingMethod || "", sold_by: user?.email };
    if (remainingQty === 0) updatePayload.status = CARD_STATUS_SOLD;
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: "SOLD", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Before qty: ${availableQty}; After qty: ${remainingQty}; Sold ${soldQty} pcs for ${money(soldPrice)} via ${result.receivingMethod || "N/A"}` });
    await addTransaction({ inventory_id: card.inventory_id, card_number: card.card_number, transaction_type: "SELL", quantity: -soldQty, cost: Number(card.cost || 0) * soldQty, price: soldPrice, notes: `Sale via ${result.receivingMethod || "N/A"}` });
    await refreshAll();
    setSaving(false);
    showToast("Sale recorded");
  };

  const adjustQuantity = async (card) => {
    if (!canAdjust) return showToast("Only owner/admin can adjust inventory", "error");
    const oldQty = Number(card.quantity || 0);
    const result = await askModal({ title: "Adjust quantity", message: `${card.name} · Current qty: ${oldQty}`, confirmText: "Adjust", fields: [{ name: "newQty", label: "New Quantity", type: "number", defaultValue: oldQty }, { name: "reason", label: "Reason", placeholder: "Missing / Found / Damaged / Inventory Count / Other" }] });
    if (!result) return;
    const newQty = Number(result.newQty);
    if (Number.isNaN(newQty) || newQty < 0) return showToast("New quantity must be 0 or higher", "error");
    setSaving(true);
    const diff = newQty - oldQty;
    const { error } = await supabase.from("cards").update({ quantity: newQty, status: newQty === 0 ? CARD_STATUS_SOLD : CARD_STATUS_AVAILABLE, updated_by: user?.email }).eq("id", card.id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: "ADJUSTMENT", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Before qty: ${oldQty}; After qty: ${newQty}; Difference: ${diff}; Reason: ${result.reason || "Inventory adjustment"}` });
    await addTransaction({ inventory_id: card.inventory_id, card_number: card.card_number, transaction_type: "ADJUSTMENT", quantity: diff, cost: Number(card.cost || 0) * diff, price: Number(card.price || 0) * diff, notes: result.reason || "Inventory adjustment" });
    await refreshAll();
    setSaving(false);
    showToast("Quantity adjusted");
  };

  const editSale = async (card) => {
    if (!canEditSale) return showToast("Only owner/admin can edit sales", "error");
    const result = await askModal({ title: "Edit sale information", message: `${card.name} · ${card.inventory_id}`, confirmText: "Save Sale Edit", fields: [{ name: "soldPrice", label: "Sold Price", type: "number", defaultValue: card.sold_price || 0 }, { name: "soldDate", label: "Sold Date", type: "date", defaultValue: card.sold_date || new Date().toISOString().slice(0, 10) }, { name: "receivingMethod", label: "Receiving Method", defaultValue: card.receiving_method || "" }] });
    if (!result) return;
    setSaving(true);
    const updatePayload = { sold_price: Number(result.soldPrice || 0), sold_date: result.soldDate, receiving_method: result.receivingMethod || "", updated_by: user?.email };
    const changes = diffObjects(card, updatePayload, ["sold_price", "sold_date", "receiving_method"]);
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: "EDIT_SALE", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Sale edited. Changes: ${changes}` });
    await refreshAll();
    setSelectedCard((prev) => prev ? { ...prev, ...updatePayload } : prev);
    setSaving(false);
    showToast("Sale updated");
  };

  const undoSale = async (card) => {
    if (!canEditSale) return showToast("Only owner/admin can undo sales", "error");
    const result = await askModal({ title: "Undo sale", message: "This will add quantity back to inventory and reset sale fields for this item.", confirmText: "Undo Sale", danger: true, fields: [{ name: "restoreQty", label: "Quantity to restore", type: "number", defaultValue: 1 }, { name: "reason", label: "Reason", placeholder: "Customer return / mistake / other" }] });
    if (!result) return;
    const restoreQty = Number(result.restoreQty || 1);
    if (restoreQty < 1) return showToast("Restore quantity must be at least 1", "error");
    setSaving(true);
    const oldQty = Number(card.quantity || 0);
    const newQty = oldQty + restoreQty;
    const updatePayload = { quantity: newQty, status: CARD_STATUS_AVAILABLE, sold_price: 0, sold_date: null, receiving_method: "", updated_by: user?.email };
    const { error } = await supabase.from("cards").update(updatePayload).eq("id", card.id);
    if (error) { setSaving(false); showToast(error.message, "error"); return; }
    await addActivityLog({ action: "UNDO_SALE", inventory_id: card.inventory_id, card_number: card.card_number, notes: `Before qty: ${oldQty}; After qty: ${newQty}; Restored qty: ${restoreQty}; Reason: ${result.reason || "Sale undone"}` });
    await addTransaction({ inventory_id: card.inventory_id, card_number: card.card_number, transaction_type: "UNDO_SALE", quantity: restoreQty, cost: Number(card.cost || 0) * restoreQty, price: 0, notes: result.reason || "Sale undone and quantity restored" });
    await refreshAll();
    setSaving(false);
    setTab(DEFAULT_TAB);
    setSelectedCard(null);
    showToast("Sale undone");
  };

  const handleImportExcel = async (e) => {
    setSaving(true);
    await importExcelFile(e.target.files[0], {
      companyId, userEmail: user?.email, supabase, showToast, addActivityLog, addTransaction,
      onComplete: async () => { await refreshAll(); e.target.value = ""; },
    });
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return cards.filter((c) => {
      const matchSearch = !keyword || [c.name, c.category, c.game, c.card_number, c.inventory_id, c.storage_location, c.status, c.language].some((value) => String(value || "").toLowerCase().includes(keyword));
      const matchCategory = categoryFilter === "ALL" || c.category === categoryFilter;
      const matchGame = gameFilter === "ALL" || c.game === gameFilter;
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchLocation = locationFilter === "ALL" || (c.storage_location || "No Location") === locationFilter;
      if (tab === DEFAULT_TAB) return matchSearch && matchCategory && matchGame && matchStatus && matchLocation && c.status !== CARD_STATUS_SOLD;
      return matchSearch && matchCategory && matchGame && matchStatus && matchLocation;
    });
  }, [cards, categoryFilter, gameFilter, locationFilter, search, statusFilter, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedCards = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const soldCards = useMemo(() => cards.filter((c) => c.status === CARD_STATUS_SOLD), [cards]);
  const stats = useMemo(() => {
    const inventoryQty = inventoryCards.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
    const totalCost = inventoryCards.reduce((sum, c) => sum + Number(c.cost || 0) * Number(c.quantity || 0), 0);
    const totalValue = inventoryCards.reduce((sum, c) => sum + (Number(c.price || 0) > 0 ? Number(c.price || 0) : Number(c.cost || 0) * 1.3) * Number(c.quantity || 0), 0);
    const soldRevenue = cards.reduce((sum, c) => sum + Number(c.sold_price || 0), 0);
    const soldCost = soldCards.reduce((sum, c) => sum + Number(c.cost || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todaySales = cards.filter((c) => c.sold_date === today).reduce((sum, c) => sum + Number(c.sold_price || 0), 0);
    return { inventoryQty, totalCost, totalValue, soldRevenue, soldCost, todaySales };
  }, [cards, inventoryCards, soldCards]);

  const handleViewCard = useCallback((card) => {
    setSelectedCard(card);
    setTab("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);
  const locationOptions = useMemo(() => Array.from(new Set(cards.map((c) => c.storage_location || "No Location"))).sort(), [cards]);

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
              <button type="button" disabled={saving} onClick={signIn} style={{ ...styles.primary, width: "100%" }}>{saving ? "Logging in..." : "Login"}</button>
            ) : (
              <button type="button" disabled={saving} onClick={signUp} style={{ ...styles.primary, width: "100%" }}>{saving ? "Creating..." : "Create Account"}</button>
            )}
            <button type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} style={{ ...styles.button, width: "100%", marginTop: 10 }}>
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
        <Sidebar
          tab={tab}
          setTab={setTab}
          setSelectedCard={setSelectedCard}
          user={user}
          userRole={userRole}
          isMobile={isMobile}
          showMoreMenu={showMoreMenu}
          setShowMoreMenu={setShowMoreMenu}
          cartCount={cartCount}
          cancelEdit={cancelEdit}
          setForm={setForm}
          emptyForm={emptyForm}
          logout={logout}
          styles={styles}
        />

        <main style={styles.main}>
          <TopBar tab={tab} editingId={editingId} cartCount={cartCount} refreshAll={refreshAll} setTab={setTab} cancelEdit={cancelEdit} setForm={setForm} emptyForm={emptyForm} styles={styles} />

          {loading ? <Skeleton styles={styles} /> : (
            <>
              {tab === "dashboard" && (
                <DashboardView stats={stats} isMobile={isMobile} styles={styles} cards={cards} sales={sales} tradeDeals={tradeDeals} customers={customers} activityLogs={activityLogs} globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} onViewCard={handleViewCard} />
              )}
              {tab === "inventory" && (
                <InventoryView stats={stats} isMobile={isMobile} styles={styles} search={search} onSearchChange={handleSearchChange} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} gameFilter={gameFilter} setGameFilter={setGameFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} locationFilter={locationFilter} setLocationFilter={setLocationFilter} locationOptions={locationOptions} canAdjust={canAdjust} bulkSelected={bulkSelected} setBulkSelected={setBulkSelected} pagedCards={pagedCards} filteredLength={filtered.length} page={safePage} setPage={setPage} onView={handleViewCard} onAddToCart={addToCart} onQuickSell={markAsSold} bulkMoveLocation={bulkMoveLocation} bulkUpdatePrice={bulkUpdatePrice} bulkUpdateStatus={bulkUpdateStatus} />
              )}
              {tab === "quickAddCard" && (
                <QuickAddCardView form={form} setForm={setForm} isMobile={isMobile} styles={styles} saving={saving} handleCostChange={handleCostChange} setPriceManuallyEdited={setPriceManuallyEdited} setFrontFile={setFrontFile} setBackFile={setBackFile} cancelEdit={cancelEdit} setTab={setTab} saveCard={saveCard} />
              )}
              {tab === "stockIn" && (
                <StockInView form={form} setForm={setForm} editingId={editingId} isMobile={isMobile} styles={styles} saving={saving} handleCostChange={handleCostChange} setPriceManuallyEdited={setPriceManuallyEdited} setFrontFile={setFrontFile} setBackFile={setBackFile} cancelEdit={cancelEdit} setTab={setTab} saveCard={saveCard} />
              )}
              {tab === "cart" && (
                <CartView cart={cart} cartCount={cartCount} cartSubtotal={cartSubtotal} cartDiscountType={cartDiscountType} setCartDiscountType={setCartDiscountType} cartDiscountValue={cartDiscountValue} setCartDiscountValue={setCartDiscountValue} cartDiscountAmount={cartDiscountAmount} cartTaxEnabled={cartTaxEnabled} setCartTaxEnabled={setCartTaxEnabled} cartTaxRate={cartTaxRate} setCartTaxRate={setCartTaxRate} cartTaxableSubtotal={cartTaxableSubtotal} cartTax={cartTax} cartTotal={cartTotal} isMobile={isMobile} styles={styles} updateCartQty={updateCartQty} updateCartUnitPrice={updateCartUnitPrice} removeFromCart={removeFromCart} completeCheckout={completeCheckout} clearCart={clearCart} saving={saving} />
              )}
              {tab === "sales" && (
                <SalesView sales={sales} lastReceipt={lastReceipt} setLastReceipt={setLastReceipt} cartTaxRate={cartTaxRate} styles={styles} isMobile={isMobile} />
              )}
              {tab === "customers" && (
                <CustomersView customers={customers} isMobile={isMobile} styles={styles} askModal={askModal} showToast={showToast} setSaving={setSaving} supabase={supabase} companyId={companyId} user={user} addActivityLog={addActivityLog} refreshCustomers={refreshCustomers} />
              )}
              {tab === "count" && (
                <InventoryCountView countedInventoryIds={countedInventoryIds} setCountedInventoryIds={setCountedInventoryIds} inventoryCards={inventoryCards} canAdjust={canAdjust} styles={styles} isMobile={isMobile} applyInventoryCountMissing={applyInventoryCountMissing} />
              )}
              {tab === "detail" && selectedCard && (
                <DetailView card={selectedCard} isMobile={isMobile} styles={styles} canHold={canHold} canAdjust={canAdjust} canEditSale={canEditSale} canDelete={canDelete} getItemActivity={getItemActivity} setSelectedCard={setSelectedCard} setTab={setTab} startEdit={startEdit} addToCart={addToCart} markAsSold={markAsSold} updateCardStatus={updateCardStatus} adjustQuantity={adjustQuantity} editSale={editSale} undoSale={undoSale} deleteCard={deleteCard} />
              )}
              {tab === "transactions" && <TransactionsView transactions={transactions} styles={styles} />}
              {tab === "trades" && (
                <TradesView cards={cards} tradeDeals={tradeDeals} isMobile={isMobile} styles={styles} canTrade={canTrade} askModal={askModal} showToast={showToast} createTradeDeal={createTradeDeal} />
              )}
              {tab === "activityLogs" && (
                <ActivityLogsView activityLogs={activityLogs} activityFilter={activityFilter} setActivityFilter={setActivityFilter} styles={styles} />
              )}
              {tab === "reports" && (
                <ReportsView stats={stats} isMobile={isMobile} styles={styles} cards={cards} activityLogs={activityLogs} transactions={transactions} onImportExcel={handleImportExcel} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
