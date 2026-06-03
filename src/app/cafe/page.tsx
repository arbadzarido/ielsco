"use client";

import React, { useState, useEffect, useCallback } from "react";

// ============================================================
// TYPES & INTERFACES
// ============================================================
type Category = "Coffee" | "Dessert" | "Snack" | "Makanan Berat";

interface MenuItemType {
  id: string;
  name: string;
  price: number;
  category: Category;
  isCustomPrice?: boolean;
  note?: string;
}

interface CartItemType extends MenuItemType {
  cartId: string;
  qty: number;
  customPriceVal?: number;
}

interface OrderType {
  orderId: string;
  timestamp: string;
  date: string;
  time: string;
  customerName: string;
  tableNote: string;
  paymentMethod: "Cash" | "QRIS";
  items: { name: string; qty: number; price: number; subtotal: number }[];
  itemsSummary: string; // <--- TAMBAHKAN BARIS INI
  total: number;
  received: number;
  change: number;
  sheetsStatus?: "success" | "error" | "demo";
}

// ============================================================
// CONFIG & DATA
// ============================================================
// Ganti dengan URL dari Google Apps Script setelah deploy
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

const MENU_DATA: Record<Category, MenuItemType[]> = {
  "Coffee": [
    { id: "c1", name: "Americano (Ice/Hot)", price: 10000, category: "Coffee" },
    { id: "c2", name: "Long Black (Ice/Hot)", price: 10000, category: "Coffee" },
    { id: "c3", name: "Sanger", price: 10000, category: "Coffee" },
    { id: "c4", name: "Kopi Susu (Ice/Hot)", price: 15000, category: "Coffee" },
    { id: "c5", name: "Kopi Susu Gula Aren (Ice)", price: 17000, category: "Coffee" },
    { id: "c6", name: "Latte (Ice)", price: 15000, category: "Coffee" },
    { id: "c7", name: "Cappuccino (Ice)", price: 17000, category: "Coffee" },
    { id: "c8", name: "V60", price: 25000, category: "Coffee" },
    { id: "c9", name: "Japanese Coffee", price: 25000, category: "Coffee" },
    { id: "c10", name: "Tubruk Robusta/Arabika", price: 0, category: "Coffee", isCustomPrice: true, note: "Seikhlasnya" },
    { id: "c11", name: "Espresso", price: 0, category: "Coffee", isCustomPrice: true, note: "Seikhlasnya" },
  ],
  "Dessert": [
    { id: "d1", name: "Tape Bakar Coklat", price: 15000, category: "Dessert" },
    { id: "d2", name: "Tape Bakar Keju", price: 15000, category: "Dessert" },
    { id: "d3", name: "Tape Bakar Coklat Keju", price: 17000, category: "Dessert" },
    { id: "d4", name: "Pisang Original", price: 10000, category: "Dessert" },
    { id: "d5", name: "Pisang Coklat", price: 15000, category: "Dessert" },
    { id: "d6", name: "Pisang Keju", price: 15000, category: "Dessert" },
    { id: "d7", name: "Pisang Coklat Keju", price: 17000, category: "Dessert" },
    { id: "d8", name: "Roti Bakar Coklat", price: 15000, category: "Dessert" },
    { id: "d9", name: "Roti Bakar Keju", price: 15000, category: "Dessert" },
    { id: "d10", name: "Roti Bakar Coklat Keju", price: 17000, category: "Dessert" },
    { id: "d11", name: "Singkong Original", price: 10000, category: "Dessert" },
    { id: "d12", name: "Singkong Keju", price: 15000, category: "Dessert" },
  ],
  "Snack": [
    { id: "s1", name: "Otak-Otak", price: 10000, category: "Snack" },
    { id: "s2", name: "Kentang", price: 10000, category: "Snack" },
    { id: "s3", name: "Cireng", price: 10000, category: "Snack" },
  ],
  "Makanan Berat": [
    { id: "m1", name: "Kwetiaw Goreng", price: 18000, category: "Makanan Berat" },
    { id: "m2", name: "Nasi Goreng", price: 18000, category: "Makanan Berat" },
    { id: "m3", name: "Mie Goreng/Tek-Tek", price: 18000, category: "Makanan Berat" },
    { id: "m4", name: "Bihun Goreng", price: 18000, category: "Makanan Berat" },
    { id: "m5", name: "Indomie Goreng", price: 7000, category: "Makanan Berat" },
    { id: "m6", name: "Indomie Rebus", price: 7000, category: "Makanan Berat" },
    { id: "m7", name: "Indomie Goreng + Telor", price: 10000, category: "Makanan Berat" },
    { id: "m8", name: "Indomie Rebus + Telor", price: 10000, category: "Makanan Berat" },
  ],
};

const CATEGORIES = Object.keys(MENU_DATA) as Category[];
const CATEGORY_ICONS: Record<Category, string> = {
  "Coffee": "☕",
  "Dessert": "🍮",
  "Snack": "🍟",
  "Makanan Berat": "🍛",
};

// ============================================================
// HELPERS
// ============================================================
const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const generateOrderId = () => "ORD-" + Date.now().toString().slice(-6);

// ============================================================
// SUB-COMPONENTS
// ============================================================
function Badge({ children, color = "amber" }: { children: React.ReactNode; color?: "amber" | "brown" | "green" | "red" }) {
  const colors = {
    amber: "bg-[#C49A45] text-white",
    brown: "bg-[#4A3022] text-[#F5ECE3]",
    green: "bg-[#3B6D11] text-white",
    red: "bg-red-600 text-white",
  };
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${colors[color]}`}>
      {children}
    </span>
  );
}

function MenuItem({ item, onAdd }: { item: MenuItemType; onAdd: (item: MenuItemType) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8D9C8] p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-all group">
      <div className="flex-1">
        <p className="font-bold text-[#4A3022] text-sm leading-tight">{item.name}</p>
        {item.note && <p className="text-xs text-[#8B6E52] mt-1">{item.note}</p>}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F5ECE3]">
        {item.isCustomPrice ? (
          <Badge color="brown">Seikhlasnya</Badge>
        ) : (
          <span className="text-sm font-black text-[#C49A45]">{formatRupiah(item.price)}</span>
        )}
        <button
          onClick={() => onAdd(item)}
          className="w-8 h-8 rounded-full bg-[#C49A45] text-white flex items-center justify-center text-lg font-black hover:bg-[#A07D30] active:scale-95 transition-all shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

function CartItem({
  item,
  onInc,
  onDec,
  onRemove,
  onPriceChange,
}: {
  item: CartItemType;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
}) {
  return (
    <div className="py-3 border-b border-[#E8D9C8] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#4A3022] leading-tight truncate">{item.name}</p>
          {item.isCustomPrice ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#8B6E52]">Rp</span>
              <input
                type="number"
                value={item.customPriceVal || ""}
                onChange={(e) => onPriceChange(item.cartId, parseInt(e.target.value) || 0)}
                placeholder="Nominal"
                className="text-xs font-bold border border-[#C49A45] rounded-md px-2 py-1 w-24 text-[#4A3022] focus:outline-none focus:ring-1 focus:ring-[#C49A45]"
              />
            </div>
          ) : (
            <p className="text-xs text-[#C49A45] font-black mt-1">{formatRupiah(item.price)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 bg-[#F5ECE3] rounded-full p-1 border border-[#E8D9C8]">
          <button
            onClick={() => onDec(item.cartId)}
            className="w-6 h-6 rounded-full bg-white text-[#4A3022] flex items-center justify-center text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            −
          </button>
          <span className="w-4 text-center text-xs font-bold text-[#4A3022]">{item.qty}</span>
          <button
            onClick={() => onInc(item.cartId)}
            className="w-6 h-6 rounded-full bg-[#C49A45] text-white flex items-center justify-center text-sm font-bold shadow-sm active:scale-95 transition-all"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <button onClick={() => onRemove(item.cartId)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider">
          Hapus
        </button>
        {!item.isCustomPrice && <span className="text-xs font-black text-[#4A3022]">{formatRupiah(item.price * item.qty)}</span>}
        {item.isCustomPrice && (item.customPriceVal ?? 0) > 0 && (
          <span className="text-xs font-black text-[#4A3022]">{formatRupiah((item.customPriceVal || 0) * item.qty)}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function KopiNusantaraPOS() {
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<"order" | "dashboard">("order");
  const [activeCategory, setActiveCategory] = useState<Category>("Coffee");
  const [cart, setCart] = useState<CartItemType[]>([]);
  const [orders, setOrders] = useState<OrderType[]>([]);
  
  // Modals state
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout Form State
  const [custName, setCustName] = useState("");
  const [tableNote, setTableNote] = useState("");
  const [payMethod, setPayMethod] = useState<"Cash" | "QRIS">("Cash");
  const [receivedAmount, setReceivedAmount] = useState("");

  // Hydration fix & LocalStorage Load
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem("kopi_nusantara_orders");
      if (saved) setOrders(JSON.parse(saved));
    } catch {}
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem("kopi_nusantara_orders", JSON.stringify(orders));
      } catch {}
    }
  }, [orders, isClient]);

  // Derived state
  const cartTotal = cart.reduce((sum, item) => sum + (item.isCustomPrice ? (item.customPriceVal || 0) : item.price) * item.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Actions
  const addToCart = useCallback((item: MenuItemType) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && !item.isCustomPrice);
      if (existing && !item.isCustomPrice) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, cartId: `${item.id}-${Date.now()}`, qty: 1, customPriceVal: 0 }];
    });
  }, []);

  const updateQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) => prev.map((c) => (c.cartId === cartId ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0));
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  }, []);

  const updateCustomPrice = useCallback((cartId: string, price: number) => {
    setCart((prev) => prev.map((c) => (c.cartId === cartId ? { ...c, customPriceVal: price } : c)));
  }, []);

  // Checkout Logic
  const canConfirm = custName.trim() && (payMethod !== "Cash" || parseInt(receivedAmount) >= cartTotal);
  const change = payMethod === "Cash" ? (parseInt(receivedAmount) || 0) - cartTotal : 0;

  const handleCheckoutConfirm = async () => {
    if (!canConfirm) return;
    setIsLoading(true);

    const orderId = generateOrderId();
    const now = new Date();
    
    const orderData = {
      orderId,
      timestamp: now.toISOString(),
      date: now.toLocaleDateString("id-ID"),
      time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      customerName: custName.trim(),
      tableNote: tableNote.trim(),
      paymentMethod: payMethod,
      items: cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.isCustomPrice ? (i.customPriceVal || 0) : i.price,
        subtotal: (i.isCustomPrice ? (i.customPriceVal || 0) : i.price) * i.qty,
      })),
      itemsSummary: cart.map((i) => `${i.qty}x ${i.name}`).join(", "),
      total: cartTotal,
      received: payMethod === "Cash" ? parseInt(receivedAmount) : cartTotal,
      change: change,
    };

    let sheetsStatus: "success" | "error" | "demo" = "demo";
    if (GOOGLE_SCRIPT_URL && !GOOGLE_SCRIPT_URL.includes("YOUR_SCRIPT_ID")) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        sheetsStatus = "success";
      } catch (err) {
        console.error("Gagal kirim ke Google Sheets:", err);
        sheetsStatus = "error";
      }
    }

    const fullOrder: OrderType = { ...orderData, sheetsStatus };
    setOrders((prev) => [...prev, fullOrder]);
    setLastOrder(fullOrder);
    
    // Reset Cart & Form
    setCart([]);
    setCustName("");
    setTableNote("");
    setPayMethod("Cash");
    setReceivedAmount("");
    setShowCheckout(false);
    setShowSuccess(true);
    setIsLoading(false);
  };

  // Dashboard calculations
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.timestamp).toDateString() === todayStr);
  const totalToday = todayOrders.reduce((s, o) => s + o.total, 0);

  if (!isClient) return null; // Prevent hydration mismatch flash

  return (
    <div className="min-h-screen bg-[#F5ECE3] font-sans selection:bg-[#C49A45] selection:text-white">
      {/* HEADER */}
      <header className="bg-[#4A3022] px-6 py-4 flex items-center justify-between shadow-xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C49A45] flex items-center justify-center text-white text-lg">☕</div>
          <div>
            <h1 className="text-white font-black text-lg leading-tight tracking-wide">KOPI NUSANTARA</h1>
            <p className="text-[#C49A45] text-xs font-bold uppercase tracking-widest">POS & Roastery</p>
          </div>
        </div>
        <div className="flex bg-[#3A2418] rounded-xl p-1.5 gap-1 shadow-inner">
          <button onClick={() => setActiveTab("order")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "order" ? "bg-[#C49A45] text-white shadow" : "text-[#C49A45]/60 hover:text-[#C49A45]"}`}>🛍 Order</button>
          <button onClick={() => setActiveTab("dashboard")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "dashboard" ? "bg-[#C49A45] text-white shadow" : "text-[#C49A45]/60 hover:text-[#C49A45]"}`}>📊 Dashboard</button>
        </div>
      </header>

      {/* ORDER TAB */}
      {activeTab === "order" && (
        <div className="flex h-[calc(100vh-72px)]">
          {/* LEFT: Menu Area */}
          <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
            <div className="sticky top-0 bg-[#F5ECE3]/90 backdrop-blur-md pt-5 pb-4 px-6 z-20 border-b border-[#E8D9C8]">
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${activeCategory === cat ? "bg-[#4A3022] text-white border-[#4A3022] shadow-md" : "bg-white text-[#4A3022] border-[#E8D9C8] hover:border-[#C49A45]"}`}>
                    <span>{CATEGORY_ICONS[cat]}</span> {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {MENU_DATA[activeCategory].map((item) => (
                  <MenuItem key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Desktop Cart */}
          <div className="hidden md:flex w-80 xl:w-96 flex-col bg-white border-l border-[#E8D9C8] h-full shadow-2xl relative z-10">
            <div className="px-6 py-5 border-b border-[#E8D9C8] bg-[#F5ECE3]">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-[#4A3022] text-lg">Keranjang</h3>
                {cartCount > 0 && <span className="bg-[#C49A45] text-white text-xs font-black px-2.5 py-1 rounded-md">{cartCount} Item</span>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-[#C49A45]/40">
                  <div className="text-6xl mb-4">🛒</div>
                  <p className="text-sm font-bold text-[#8B6E52]">Keranjang masih kosong</p>
                </div>
              ) : (
                cart.map((item) => (
                  <CartItem 
  key={item.cartId} 
  item={item} 
  onInc={(id) => updateQty(id, 1)} 
  onDec={(id) => updateQty(id, -1)} 
  onRemove={removeItem} 
  onPriceChange={updateCustomPrice} 
/>   ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-6 border-t border-[#E8D9C8] bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-[#8B6E52] uppercase tracking-wider">Total Pembayaran</span>
                  <span className="text-2xl font-black text-[#4A3022]">{formatRupiah(cartTotal)}</span>
                </div>
                <button onClick={() => setShowCheckout(true)} className="w-full py-4 bg-[#C49A45] text-white rounded-xl font-black text-base hover:bg-[#A07D30] active:scale-95 transition-all shadow-lg">
                  Proses Pembayaran →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-72px)] overflow-y-auto pb-24">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#4A3022]">Dashboard & Riwayat</h2>
            <p className="text-sm font-bold text-[#8B6E52] mt-1">{new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-[#4A3022] rounded-2xl p-6 text-white shadow-xl">
              <p className="text-xs font-bold text-[#C49A45] uppercase tracking-widest mb-2">Total Pemasukan Hari Ini</p>
              <p className="text-3xl font-black">{formatRupiah(totalToday)}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-[#E8D9C8] shadow-sm">
              <p className="text-xs font-bold text-[#8B6E52] uppercase tracking-widest mb-2">Total Transaksi</p>
              <p className="text-3xl font-black text-[#4A3022]">{todayOrders.length} <span className="text-sm font-bold text-[#8B6E52]">Order</span></p>
            </div>
          </div>
          <h3 className="text-sm font-black text-[#4A3022] uppercase tracking-widest mb-4">Riwayat Terbaru</h3>
          <div className="space-y-4">
            {[...todayOrders].reverse().map((order) => (
              <div key={order.orderId} className="bg-white rounded-2xl border border-[#E8D9C8] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-black text-[#4A3022] text-lg">{order.customerName}</p>
                    <Badge color={order.paymentMethod === "Cash" ? "brown" : "amber"}>{order.paymentMethod}</Badge>
                  </div>
                  <p className="text-xs font-bold text-[#8B6E52]">{order.time} {order.tableNote && `· ${order.tableNote}`}</p>
                  <p className="text-sm text-[#4A3022] mt-2">{order.itemsSummary}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-black text-[#C49A45] text-xl">{formatRupiah(order.total)}</p>
                  {order.sheetsStatus === "success" && <p className="text-[10px] font-bold text-green-600 mt-1 uppercase tracking-widest">✓ Tersimpan di Sheets</p>}
                </div>
              </div>
            ))}
            {todayOrders.length === 0 && <p className="text-[#8B6E52] text-sm font-bold">Belum ada transaksi hari ini.</p>}
          </div>
        </div>
      )}

      {/* MOBILE CART FAB */}
      {activeTab === "order" && (
        <div className="md:hidden fixed bottom-6 right-6 z-40">
          <button onClick={() => setCartOpen(true)} className="bg-[#4A3022] text-white w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center font-bold active:scale-95 transition-all relative border-4 border-[#F5ECE3]">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#C49A45] text-white text-xs flex items-center justify-center font-black shadow-lg">{cartCount}</span>}
          </button>
        </div>
      )}

      {/* MOBILE CART SHEET */}
      {cartOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="bg-[#4A3022]/60 backdrop-blur-sm absolute inset-0" onClick={() => setCartOpen(false)} />
          <div className="bg-white rounded-t-3xl h-[85vh] flex flex-col shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8D9C8] bg-[#F5ECE3] rounded-t-3xl">
              <h3 className="font-black text-[#4A3022] text-lg">Keranjang ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#4A3022] font-black shadow-sm">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {cart.map((item) => <CartItem 
  key={item.cartId} 
  item={item} 
  onInc={(id) => updateQty(id, 1)} 
  onDec={(id) => updateQty(id, -1)} 
  onRemove={removeItem} 
  onPriceChange={updateCustomPrice} 
/>)}
            </div>
            {cart.length > 0 && (
              <div className="p-6 border-t border-[#E8D9C8] bg-white">
                <div className="flex justify-between mb-4 items-center">
                  <span className="font-bold text-[#8B6E52] text-sm uppercase tracking-wider">Total</span>
                  <span className="font-black text-2xl text-[#4A3022]">{formatRupiah(cartTotal)}</span>
                </div>
                <button onClick={() => { setCartOpen(false); setShowCheckout(true); }} className="w-full py-4 bg-[#C49A45] text-white rounded-xl font-black text-base active:scale-95 transition-all shadow-lg">Checkout →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="bg-[#4A3022]/60 backdrop-blur-sm absolute inset-0" onClick={() => !isLoading && setShowCheckout(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#4A3022] px-6 py-5 shrink-0">
              <h2 className="text-white font-black text-xl">Konfirmasi Pesanan</h2>
              <p className="text-[#C49A45] text-sm font-bold mt-1">{cartCount} Item · Total: {formatRupiah(cartTotal)}</p>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#8B6E52] uppercase tracking-wider mb-2">Nama Pelanggan *</label>
                <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Masukkan nama..." className="w-full border-2 border-[#E8D9C8] rounded-xl px-4 py-3 text-sm font-bold text-[#4A3022] focus:outline-none focus:border-[#C49A45] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#8B6E52] uppercase tracking-wider mb-2">Catatan / No. Meja</label>
                <input value={tableNote} onChange={(e) => setTableNote(e.target.value)} placeholder="Contoh: Meja 3, Takeaway..." className="w-full border-2 border-[#E8D9C8] rounded-xl px-4 py-3 text-sm font-bold text-[#4A3022] focus:outline-none focus:border-[#C49A45] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#8B6E52] uppercase tracking-wider mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Cash", "QRIS"] as const).map((m) => (
                    <button key={m} onClick={() => setPayMethod(m)} className={`py-3 rounded-xl text-sm font-black border-2 transition-all ${payMethod === m ? "bg-[#4A3022] text-white border-[#4A3022] shadow-md" : "bg-white text-[#4A3022] border-[#E8D9C8] hover:border-[#C49A45]"}`}>
                      {m === "Cash" ? "💵 Tunai" : "📱 QRIS"}
                    </button>
                  ))}
                </div>
              </div>
              {payMethod === "Cash" && (
                <div className="bg-[#F5ECE3] p-4 rounded-2xl border border-[#E8D9C8]">
                  <label className="block text-xs font-bold text-[#8B6E52] uppercase tracking-wider mb-2">Uang Diterima</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#4A3022] font-black">Rp</span>
                    <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="0" className="w-full border-2 border-[#C49A45] rounded-xl pl-11 pr-4 py-3 text-base font-black text-[#4A3022] focus:outline-none focus:ring-2 focus:ring-[#C49A45]/30 bg-white" />
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[20000, 50000, 100000].map((v) => (
                      <button key={v} onClick={() => setReceivedAmount(String(v))} className="text-xs bg-white text-[#4A3022] px-3 py-1.5 rounded-lg border border-[#E8D9C8] hover:border-[#C49A45] transition-colors font-bold shadow-sm">
                        {formatRupiah(v)}
                      </button>
                    ))}
                  </div>
                  {parseInt(receivedAmount) >= cartTotal && (
                    <div className="mt-4 bg-green-100 border border-green-300 rounded-xl px-4 py-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-green-800 uppercase tracking-wider">Kembalian</span>
                      <span className="text-lg font-black text-green-800">{formatRupiah(change)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 bg-[#F5ECE3] shrink-0 flex gap-3">
              <button onClick={() => setShowCheckout(false)} disabled={isLoading} className="flex-1 py-3.5 rounded-xl border-2 border-[#4A3022] text-[#4A3022] font-black hover:bg-[#4A3022] hover:text-white transition-colors disabled:opacity-50">Batal</button>
              <button onClick={handleCheckoutConfirm} disabled={!canConfirm || isLoading} className={`flex-1 py-3.5 rounded-xl font-black transition-all shadow-md ${canConfirm && !isLoading ? "bg-[#C49A45] text-white hover:bg-[#A07D30]" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}>
                {isLoading ? "Memproses..." : "Bayar Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccess && lastOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="bg-[#4A3022]/80 backdrop-blur-sm absolute inset-0" />
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl text-center overflow-hidden relative z-10 animate-in zoom-in duration-300">
            <div className="bg-[#C49A45] px-6 py-8 relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg relative z-10 text-[#C49A45]">✓</div>
              <h2 className="text-white font-black text-2xl relative z-10">Transaksi Sukses!</h2>
              <p className="text-[#4A3022] text-xs font-bold uppercase tracking-widest mt-2 relative z-10">{lastOrder.orderId}</p>
            </div>
            <div className="p-6 space-y-1 bg-[#F5ECE3]">
              <div className="flex justify-between text-sm py-1.5 border-b border-[#E8D9C8]"><span className="text-[#8B6E52] font-bold">Pelanggan</span><span className="font-black text-[#4A3022]">{lastOrder.customerName}</span></div>
              <div className="flex justify-between text-sm py-1.5 border-b border-[#E8D9C8]"><span className="text-[#8B6E52] font-bold">Total</span><span className="font-black text-[#4A3022]">{formatRupiah(lastOrder.total)}</span></div>
              <div className="flex justify-between text-sm py-1.5"><span className="text-[#8B6E52] font-bold">Metode</span><span className="font-black text-[#4A3022]">{lastOrder.paymentMethod}</span></div>
            </div>
            <div className="p-6 bg-white">
              <button onClick={() => { setShowSuccess(false); setLastOrder(null); }} className="w-full py-4 bg-[#4A3022] text-white rounded-xl font-black text-base hover:bg-[#3A2418] transition-colors shadow-lg">Tutup & Pesanan Baru</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}