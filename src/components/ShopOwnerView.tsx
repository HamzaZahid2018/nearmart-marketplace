/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Store, Plus, Package, TrendingUp, DollarSign, Clock, 
  CheckCircle, AlertCircle, ShoppingBag, Edit, Trash2, Star, 
  ChevronRight, ArrowUpRight, ArrowDownRight, RefreshCw, XCircle, ShieldCheck,
  Download, Printer, FileText, BarChart3, PieChart, Zap, AlertTriangle, Sparkles
} from 'lucide-react';
import { AppState, Product, Order, Shop, Coupon } from '../types';
import jsPDF from 'jspdf';

import { generateMerchantProductContent } from '../api/geminiService';

interface ShopOwnerViewProps {
  state: AppState;
  onAddProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount' | 'salesCount'>) => void;
  onUpdateInventory: (productId: string, qty: number) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onRefundPayment: (orderId: string) => void;
  onUpdateShopProfile: (shopId: string, updates: Partial<Shop>) => void;
  onAddCoupon?: (coupon: Omit<Coupon, 'id' | 'active'>) => void;
  addToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function ShopOwnerView({
  state,
  onAddProduct,
  onUpdateInventory,
  onUpdateOrderStatus,
  onRefundPayment,
  onUpdateShopProfile,
  onAddCoupon,
  addToast,
}: ShopOwnerViewProps) {
  // Resolve the correct shop for this merchant:
  // Priority: (1) ownerStoreId from state (set after login), (2) shop by ownerName, (3) first shop
  const resolvedShopId = useMemo(() => {
    if (state.ownerStoreId && state.shops.some(s => s.id === state.ownerStoreId)) {
      return state.ownerStoreId;
    }
    // Try to match by ownerName === userProfile.name or partial match
    const byOwner = state.shops.find(s =>
      s.ownerName && state.userProfile.name &&
      state.userProfile.name.toLowerCase().includes(s.ownerName.toLowerCase())
    );
    if (byOwner) return byOwner.id;
    return state.shops[0]?.id || '';
  }, [state.ownerStoreId, state.shops, state.userProfile.name]);

  // Store selection state — initialized from resolved shop ID
  const [selectedShopId, setSelectedShopId] = useState<string>(resolvedShopId);

  // Keep selectedShopId in sync when resolvedShopId changes (e.g. after login sync)
  React.useEffect(() => {
    if (resolvedShopId && resolvedShopId !== selectedShopId) {
      setSelectedShopId(resolvedShopId);
    }
  }, [resolvedShopId]);

  const myShop = useMemo(() => {
    return state.shops.find(s => s.id === selectedShopId) ||
           state.shops.find(s =>
             s.ownerName && state.userProfile.name &&
             state.userProfile.name.toLowerCase().includes(s.ownerName.toLowerCase())
           ) ||
           state.shops[0];
  }, [state.shops, selectedShopId, state.userProfile.name]);

  const myProducts = useMemo(() => {
    if (!myShop) return state.products;
    return state.products.filter(p => p.shopId === myShop.id);
  }, [state.products, myShop]);

  const myOrders = useMemo(() => {
    if (!myShop) return state.orders;
    return state.orders.filter(o =>
      (o.shopId && o.shopId === myShop.id) ||
      (o.shopName && o.shopName.toLowerCase().trim() === myShop.name.toLowerCase().trim())
    );
  }, [state.orders, myShop]);

  // Modal & Analytics State
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'products' | 'hours'>('revenue');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'instock'>('all');
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);

  // Form State for Add Product
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Bakery');
  const [newProdImage, setNewProdImage] = useState('https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400');
  const [newProdInventory, setNewProdInventory] = useState('15');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Gemini AI Content Auto-Generator
  const handleAIGenerateContent = async () => {
    if (!newProdName.trim()) {
      addToast('Please enter a product title first.', 'error');
      return;
    }
    setIsGeneratingAI(true);
    try {
      addToast('✨ Gemini AI is generating product details...', 'info');
      const result = await generateMerchantProductContent(newProdName, newProdCategory);
      setNewProdDesc(result.description);
      setNewProdPrice(result.suggestedPrice.toFixed(2));
      addToast('✨ Gemini AI generated product description & pricing!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to generate AI content.', 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Stats Calculations
  const metrics = useMemo(() => {
    const totalSales = myOrders.reduce((sum, o) => sum + o.total, 0);
    const activeOrders = myOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const lowStockItems = myProducts.filter(p => p.inventory < 5);
    return { totalSales, activeOrders, lowStockCount: lowStockItems.length, lowStockItems };
  }, [myOrders, myProducts]);

  // Filtered Products for Inventory Table
  const filteredProducts = useMemo(() => {
    if (inventoryFilter === 'low') return myProducts.filter(p => p.inventory < 5);
    if (inventoryFilter === 'instock') return myProducts.filter(p => p.inventory >= 5);
    return myProducts;
  }, [myProducts, inventoryFilter]);

  // Top Selling Products Calculation for Analytics
  const topProductsAnalytics = useMemo(() => {
    return myProducts
      .map(p => ({
        id: p.id,
        name: p.name,
        salesCount: p.salesCount || Math.floor(Math.random() * 40) + 12,
        revenue: (p.salesCount || 15) * p.price,
        image: p.image,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);
  }, [myProducts]);

  // Peak Ordering Hours Analytics
  const peakHoursData = [
    { hour: '8 AM', orders: 12, label: 'Breakfast Rush' },
    { hour: '10 AM', orders: 8, label: 'Mid-Morning' },
    { hour: '12 PM', orders: 24, label: 'Lunch Peak' },
    { hour: '2 PM', orders: 15, label: 'Afternoon' },
    { hour: '5 PM', orders: 28, label: 'Evening Peak' },
    { hour: '8 PM', orders: 10, label: 'Late Orders' },
  ];

  // Batch Restock All Low Stock Items
  const handleBatchRestockLowStock = () => {
    if (metrics.lowStockItems.length === 0) {
      addToast('All inventory items are currently well stocked!', 'info');
      return;
    }
    metrics.lowStockItems.forEach(item => {
      onUpdateInventory(item.id, item.inventory + 10);
    });
    addToast(`Restocked +10 units across ${metrics.lowStockItems.length} low-stock items!`, 'success');
  };

  // CSV Invoice Generator & Downloader
  const handleDownloadCSVInvoice = (order: Order) => {
    const headers = "Order ID,Customer Name,Delivery Address,Payment Method,Payment Status,Order Status,Order Date,Item Name,Quantity,Unit Price ($),Line Total ($),Grand Total ($)\n";
    const rows = order.items.map(item => {
      return `"${order.id}","${order.customerName}","${order.deliveryAddress.replace(/"/g, '""')}","${order.paymentMethod}","${order.paymentStatus || 'Paid'}","${order.status}","${order.date}","${item.name}",${item.quantity},${item.price.toFixed(2)},${(item.price * item.quantity).toFixed(2)},${order.total.toFixed(2)}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NearMart_Invoice_${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Downloaded CSV Invoice for Order #${order.id}`, 'success');
  };

  // Bulletproof PDF Invoice Generator & Downloader
  const handleDownloadPDFInvoice = (order: Order) => {
    try {
      addToast('Generating PDF Invoice...', 'info');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      // Top Dark Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 595.28, 60, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('NearMart Express Marketplace', 30, 36);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Tax Invoice', 465, 36);

      // Store Details Header
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(myShop.name, 30, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(myShop.address, 30, 110);
      doc.text(`Merchant ID: ${myShop.id}`, 30, 122);

      // Invoice Meta (Right Aligned)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129); // Emerald 500
      doc.text(`INVOICE #${order.id}`, 430, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 430, 110);
      doc.text(`Status: ${order.paymentStatus || 'Verified Paid'}`, 430, 122);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(30, 135, 565, 135);

      // Customer Info Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 145, 535, 50, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('CUSTOMER DETAILS', 45, 163);
      doc.text('PAYMENT METHOD', 360, 163);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${order.customerName} (${order.deliveryAddress})`, 45, 178);
      doc.text(`${order.paymentProvider || order.paymentMethod}`, 360, 178);

      // Itemized Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(30, 210, 535, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Item Description', 40, 226);
      doc.text('Qty', 320, 226);
      doc.text('Unit Price', 400, 226);
      doc.text('Line Total', 500, 226);

      // Table Rows
      let yPos = 250;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      order.items.forEach((item) => {
        doc.setTextColor(15, 23, 42);
        doc.text(item.name, 40, yPos);
        doc.text(item.quantity.toString(), 325, yPos);
        doc.text(`$${item.price.toFixed(2)}`, 400, yPos);
        doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 500, yPos);

        doc.setDrawColor(241, 245, 249);
        doc.line(30, yPos + 6, 565, yPos + 6);
        yPos += 22;
      });

      // Financial Totals Summary
      yPos += 15;
      const subtotal = order.total * 0.9;
      const deliveryFee = 2.50;
      const tax = order.total * 0.05;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Subtotal:', 380, yPos);
      doc.text(`$${subtotal.toFixed(2)}`, 500, yPos);

      yPos += 16;
      doc.text('Hyperlocal Delivery Fee:', 380, yPos);
      doc.text(`$${deliveryFee.toFixed(2)}`, 500, yPos);

      yPos += 16;
      doc.text('Sales Tax (5%):', 380, yPos);
      doc.text(`$${tax.toFixed(2)}`, 500, yPos);

      yPos += 20;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(1.5);
      doc.line(360, yPos - 12, 565, yPos - 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text('Grand Total:', 380, yPos);
      doc.text(`$${order.total.toFixed(2)}`, 500, yPos);

      // Footer Stamp
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Thank you for supporting your local neighborhood merchant on NearMart!', 150, 780);

      // Save PDF File
      doc.save(`NearMart_Invoice_${order.id}.pdf`);
      addToast(`Downloaded PDF Invoice: NearMart_Invoice_${order.id}.pdf`, 'success');
    } catch (err: any) {
      console.error('PDF export failed:', err);
      addToast('Failed to generate PDF file.', 'error');
    }
  };

  // Handle Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      addToast('Please enter a valid product title and price.', 'error');
      return;
    }
    onAddProduct({
      shopId: myShop.id,
      shopName: myShop.name,
      category: newProdCategory,
      name: newProdName,
      description: newProdDesc || 'Freshly prepared item.',
      price: parseFloat(newProdPrice) || 5.00,
      image: newProdImage,
      inventory: parseInt(newProdInventory) || 10,
      tags: ['Fresh', newProdCategory],
    });
    addToast(`Successfully added '${newProdName}' to inventory!`, 'success');
    setShowAddModal(false);
    setNewProdName('');
    setNewProdDesc('');
    setNewProdPrice('');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-gray-900">
      {/* Merchant Header Banner */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <img
              src={myShop.logo}
              alt={myShop.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-serif text-2xl font-black text-gray-900">{myShop.name}</h1>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase font-mono">
                  Merchant ID: {myShop.id}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {myShop.address} • Certified Local Neighborhood Store
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Store Switcher Dropdown */}
            {state.shops.length > 1 && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={myShop.id}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {state.shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => addToast('Store profile settings saved.', 'info')}
              className="bg-slate-50 border border-gray-200 hover:bg-slate-100 text-gray-800 px-4 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Configure Store
            </button>
            <button
              id="add-product-modal-trigger"
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-8">
        
        {/* AUTOMATED LOW STOCK ALERT NOTIFICATION BANNER */}
        {metrics.lowStockCount > 0 && (
          <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white p-5 rounded-3xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded-md text-xs">
                    Automated Inventory Alert
                  </span>
                  <span className="text-xs font-bold text-rose-100">
                    {metrics.lowStockCount} {metrics.lowStockCount === 1 ? 'item needs' : 'items need'} immediate replenishment
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-1">
                  Low stock levels detected for: <strong className="text-white">{metrics.lowStockItems.map(p => p.name).join(', ')}</strong>. Restock to prevent lost customer orders.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <button
                onClick={() => setInventoryFilter('low')}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl transition border border-white/20"
              >
                View Low Stock Table
              </button>
              <button
                onClick={handleBatchRestockLowStock}
                className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-black px-4 py-2 rounded-xl transition shadow-md flex items-center space-x-1.5"
              >
                <Zap className="w-4 h-4 fill-rose-700" />
                <span>Restock All (+10 units)</span>
              </button>
            </div>
          </div>
        )}

        {/* KPI OVERVIEW METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Store Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <span className="font-serif text-2xl font-black text-gray-900 mt-2 block">
              ${(metrics.totalSales + myShop.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold mt-3">
              <ArrowUpRight className="w-4 h-4" />
              <span>+14.5% vs last week</span>
            </div>
          </div>

          {/* Active Orders */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pending Orders</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <span className="font-serif text-2xl font-black text-gray-900 mt-2 block">
              {metrics.activeOrders} Orders
            </span>
            <p className="text-xs text-orange-600 font-semibold mt-3">Requires kitchen preparation</p>
          </div>

          {/* Rating */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patron Store Rating</span>
              <div className="p-2 rounded-xl bg-orange-50 text-orange-500">
                <Star className="w-5 h-5 fill-orange-500" />
              </div>
            </div>
            <span className="font-serif text-2xl font-black text-gray-900 mt-2 block">
              {myShop.rating} / 5.0
            </span>
            <p className="text-xs text-gray-500 mt-3 font-medium">Based on {myShop.reviewCount} customer reviews</p>
          </div>

          {/* Low Stock Alert */}
          <div className={`bg-white border p-6 rounded-2xl shadow-2xs hover:shadow-md transition ${metrics.lowStockCount > 0 ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Inventory Alert</span>
              <div className={`p-2 rounded-xl ${metrics.lowStockCount > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-gray-500'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <span className="font-serif text-2xl font-black text-gray-900 mt-2 block">
              {metrics.lowStockCount} Items Low
            </span>
            {metrics.lowStockCount > 0 ? (
              <button
                onClick={handleBatchRestockLowStock}
                className="text-xs text-rose-600 font-bold hover:underline mt-3 flex items-center space-x-1"
              >
                <span>Restock all low items now →</span>
              </button>
            ) : (
              <p className="text-xs text-emerald-600 font-semibold mt-3">All items healthy</p>
            )}
          </div>
        </div>

        {/* INTERACTIVE SALES & REVENUE ANALYTICS CHARTS */}
        <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-3xl shadow-2xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-serif text-xl font-black text-gray-900">Merchant Store Analytics</h2>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Interactive sales, product demand, and peak ordering trends for {myShop.name}</p>
            </div>

            {/* Analytics Tab Selector Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-gray-200 space-x-1 self-start md:self-auto">
              <button
                onClick={() => setActiveChartTab('revenue')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeChartTab === 'revenue' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Weekly Revenue</span>
              </button>
              <button
                onClick={() => setActiveChartTab('products')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeChartTab === 'products' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Top Products</span>
              </button>
              <button
                onClick={() => setActiveChartTab('hours')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeChartTab === 'hours' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Peak Ordering Hours</span>
              </button>
            </div>
          </div>

          {/* TAB 1: WEEKLY REVENUE CHART */}
          {activeChartTab === 'revenue' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Daily Sales Flow (Mon - Sun)</span>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  Average Daily Revenue: $294.00
                </span>
              </div>
              <div className="h-52 flex items-end justify-between gap-3 pt-8 px-4 border-b border-gray-100 pb-3">
                {[
                  { day: 'Mon', amount: 145, orders: 8 },
                  { day: 'Tue', amount: 210, orders: 12 },
                  { day: 'Wed', amount: 185, orders: 10 },
                  { day: 'Thu', amount: 320, orders: 18 },
                  { day: 'Fri', amount: 290, orders: 15 },
                  { day: 'Sat', amount: 450, orders: 28, isPeak: true },
                  { day: 'Sun', amount: 380, orders: 22 },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl transition-all duration-200 pointer-events-none z-10 w-24 text-center">
                      <p className="font-black text-emerald-400">${bar.amount}</p>
                      <p className="text-[9px] text-gray-300">{bar.orders} orders</p>
                    </div>
                    <div
                      className={`w-full rounded-t-xl transition-all duration-300 shadow-2xs ${
                        bar.isPeak ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 group-hover:from-emerald-600 group-hover:to-emerald-500 ring-2 ring-emerald-400/30' : 'bg-emerald-500/85 group-hover:bg-emerald-600'
                      }`}
                      style={{ height: `${(bar.amount / 450) * 100}%` }}
                    ></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TOP SELLING PRODUCTS DEMAND */}
          {activeChartTab === 'products' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Highest Volume Items Sold</span>
                <span className="text-[10px] font-mono font-bold text-gray-500">SORTED BY SALES VOLUME</span>
              </div>
              <div className="space-y-3">
                {topProductsAnalytics.map((item, idx) => {
                  const maxSales = topProductsAnalytics[0].salesCount;
                  const percentage = Math.round((item.salesCount / maxSales) * 100);
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-gray-900 font-bold">{item.name}</span>
                        </div>
                        <span className="font-mono text-gray-600 text-xs">
                          <strong>{item.salesCount} sold</strong> (${item.revenue.toFixed(2)})
                        </span>
                      </div>
                      <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PEAK ORDERING HOURS DISTRIBUTION */}
          {activeChartTab === 'hours' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Customer Order Traffic by Time Slot</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  PEAK HOURS: 12 PM - 2 PM & 5 PM - 7 PM
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                {peakHoursData.map((slot, idx) => (
                  <div key={idx} className="bg-slate-50 border border-gray-200 p-3 rounded-2xl text-center space-y-1 hover:border-emerald-300 transition">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">{slot.hour}</span>
                    <span className="font-serif text-xl font-black text-gray-900 block">{slot.orders}</span>
                    <span className="block text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                      {slot.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LIVE CUSTOMER CHAT & MESSAGES INBOX */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900 flex items-center gap-2">
                <span>Live Customer Inquiries & Messages</span>
                {state.chatSessions[myShop.id]?.unreadCountMerchant > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                    {state.chatSessions[myShop.id]?.unreadCountMerchant} NEW
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">Respond to customer stock inquiries and order customization requests</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xs space-y-4">
            {(!state.chatSessions[myShop.id] || state.chatSessions[myShop.id].messages.length === 0) ? (
              <p className="text-xs text-gray-400 italic">No customer chat messages received yet for {myShop.name}.</p>
            ) : (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                  {state.chatSessions[myShop.id].messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl text-xs ${
                        m.senderRole === 'customer'
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-slate-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 mb-1">
                        <span>{m.senderName}</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <p className="font-medium">{m.text}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => {
                      const chatBtn = document.querySelector('button[title="Open Live Merchant Chat"]') as HTMLButtonElement;
                      if (chatBtn) chatBtn.click();
                      else addToast('Use floating chat widget at bottom-right to send replies', 'info');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs"
                  >
                    Open Live Reply Widget 💬
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROMOTIONAL DEALS & COUPONS MANAGER */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900">Active Promotional Vouchers & Deals</h2>
              <p className="text-xs text-gray-500">Live discount vouchers available to patrons in your district</p>
            </div>
            <button
              onClick={() => {
                const code = prompt('Enter New Store Promo Code (e.g. BAKE15):', 'BAKE15');
                if (code && onAddCoupon) {
                  onAddCoupon({
                    code: code.trim().toUpperCase(),
                    description: `Special ${myShop.name} patron promotion discount!`,
                    discountPercent: 15,
                    minSpend: 20,
                    expiryDate: '2026-12-31',
                  });
                }
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Store Voucher</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {state.coupons.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 p-4 rounded-2xl shadow-2xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 uppercase">
                    {c.code}
                  </span>
                  <span className="text-[10px] font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    {c.discountPercent}% OFF
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2">{c.description}</p>
                <div className="text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-100 flex justify-between">
                  <span>Min spend: ${c.minSpend}</span>
                  <span>Expires: {c.expiryDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INVENTORY CONTROL MANAGEMENT TABLE WITH AUTOMATED LOW STOCK FILTERS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900">Live Inventory Management</h2>
              <p className="text-xs text-gray-500">Adjust active quantities and item pricing across NearMart</p>
            </div>

            {/* Inventory Filter Pills & Restock Actions */}
            <div className="flex items-center space-x-2">
              <div className="bg-slate-100 p-1 rounded-xl border border-gray-200 flex text-xs font-bold space-x-1">
                <button
                  onClick={() => setInventoryFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${inventoryFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                >
                  All ({myProducts.length})
                </button>
                <button
                  onClick={() => setInventoryFilter('low')}
                  className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 ${inventoryFilter === 'low' ? 'bg-rose-500 text-white shadow-2xs' : 'text-rose-600 font-semibold'}`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Low Stock (&lt;5) ({metrics.lowStockCount})</span>
                </button>
                <button
                  onClick={() => setInventoryFilter('instock')}
                  className={`px-3 py-1 rounded-lg transition ${inventoryFilter === 'instock' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'}`}
                >
                  In Stock ({myProducts.length - metrics.lowStockCount})
                </button>
              </div>

              {metrics.lowStockCount > 0 && (
                <button
                  onClick={handleBatchRestockLowStock}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-2xs flex items-center space-x-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Restock All</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    <th className="p-4">Product Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Unit Price</th>
                    <th className="p-4">Stock Level</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 text-xs italic">
                        No products match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => (
                      <tr key={prod.id} className={`border-b border-gray-100 hover:bg-slate-50/80 text-xs text-gray-900 ${prod.inventory < 5 ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{prod.name}</span>
                                {prod.inventory < 5 && (
                                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                                    LOW
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 font-mono">ID: {prod.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-emerald-600 font-bold">{prod.category}</td>
                        <td className="p-4 font-serif text-sm font-black text-gray-900">${prod.price.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onUpdateInventory(prod.id, Math.max(0, prod.inventory - 1))}
                              className="w-6 h-6 bg-slate-100 border border-gray-200 hover:bg-slate-200 rounded-md flex items-center justify-center font-bold text-gray-700"
                            >
                              -
                            </button>
                            <span className={`font-mono font-bold px-2.5 py-0.5 rounded ${
                              prod.inventory < 5 ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black animate-pulse' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {prod.inventory} units
                            </span>
                            <button
                              onClick={() => onUpdateInventory(prod.id, prod.inventory + 1)}
                              className="w-6 h-6 bg-slate-100 border border-gray-200 hover:bg-slate-200 rounded-md flex items-center justify-center font-bold text-gray-700"
                            >
                              +
                            </button>
                            {prod.inventory < 5 && (
                              <button
                                onClick={() => {
                                  onUpdateInventory(prod.id, prod.inventory + 10);
                                  addToast(`Restocked +10 units for ${prod.name}!`, 'success');
                                }}
                                className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md ml-1"
                              >
                                +10 Quick
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => addToast(`Updated listing for '${prod.name}'`, 'info')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ACTIVE ORDER FULFILLMENT QUEUE WITH CSV & PRINTABLE PDF INVOICES */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900">Order Fulfillment Queue</h2>
              <p className="text-xs text-gray-500">Update fulfillment status and download tax receipts/invoices</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Items Summary</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Invoice / Receipt</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 text-xs">
                        No customer orders received yet for this store.
                      </td>
                    </tr>
                  ) : (
                    myOrders.map((ord) => (
                      <tr key={ord.id} className="border-b border-gray-100 hover:bg-slate-50/80 text-xs text-gray-900">
                        <td className="p-4 font-mono font-bold text-gray-900">{ord.id}</td>
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{ord.customerName}</p>
                          <p className="text-[10px] text-gray-400">{ord.deliveryAddress}</p>
                        </td>
                        <td className="p-4 text-gray-600 font-medium max-w-xs">
                          {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </td>
                        <td className="p-4 font-serif text-sm font-black text-gray-900">${ord.total.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase rounded-full border px-2.5 py-0.5 ${
                            ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            ord.status === 'dispatched' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            ord.status === 'preparing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-slate-100 text-gray-600 border-gray-200'
                          }`}>
                            {ord.status}
                          </span>
                        </td>

                        {/* Invoice Downloads */}
                        <td className="p-4">
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleDownloadCSVInvoice(ord)}
                              title="Export CSV Invoice"
                              className="bg-slate-100 hover:bg-slate-200 text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-gray-200 transition flex items-center space-x-1"
                            >
                              <Download className="w-3 h-3 text-emerald-600" />
                              <span>CSV</span>
                            </button>
                            <button
                              onClick={() => setInvoiceModalOrder(ord)}
                              title="Printable PDF Invoice"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-200 transition flex items-center space-x-1"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {ord.status === 'pending' && (
                              <button
                                onClick={() => {
                                  onUpdateOrderStatus(ord.id, 'preparing');
                                  addToast(`Order ${ord.id} status updated to Preparing!`, 'success');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-2xs transition"
                              >
                                Accept & Prepare
                              </button>
                            )}
                            {ord.status === 'preparing' && (
                              <button
                                onClick={() => {
                                  onUpdateOrderStatus(ord.id, 'dispatched');
                                  addToast(`Order ${ord.id} status updated to Dispatched!`, 'success');
                                }}
                                className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-2xs transition"
                              >
                                Assign & Dispatch
                              </button>
                            )}
                            {ord.status === 'dispatched' && (
                              <button
                                onClick={() => {
                                  onUpdateOrderStatus(ord.id, 'delivered');
                                  addToast(`Order ${ord.id} marked as Delivered!`, 'success');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-2xs transition"
                              >
                                Mark as Delivered
                              </button>
                            )}
                            {ord.status === 'delivered' && (
                              <span className="text-[10px] text-emerald-600 font-bold">Fulfillment Complete</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* BRANDED PRINTABLE INVOICE / RECEIPT MODAL */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span className="font-serif text-lg font-black tracking-wide">NearMart Official Tax Invoice</span>
              </div>
              <button onClick={() => setInvoiceModalOrder(null)} className="p-1 hover:bg-slate-800 rounded-full transition text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Container */}
            <div id="printable-invoice-content" className="p-8 space-y-6 overflow-y-auto font-sans bg-white text-gray-900">
              {/* Store & Invoice Meta Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <img src={myShop.logo} alt={myShop.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                    <div>
                      <h2 className="font-serif text-xl font-black text-gray-900">{myShop.name}</h2>
                      <p className="text-xs text-gray-500">{myShop.address}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    TAX INVOICE
                  </span>
                  <p className="font-mono text-sm font-black text-gray-900 mt-2">#{invoiceModalOrder.id}</p>
                  <p className="text-xs text-gray-500 font-mono">Date: {new Date(invoiceModalOrder.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Billed To / Payment Details Grid */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="block font-bold text-gray-400 uppercase tracking-wider text-[10px]">Customer Details</span>
                  <p className="font-bold text-gray-900 mt-1">{invoiceModalOrder.customerName}</p>
                  <p className="text-gray-500 mt-0.5">{invoiceModalOrder.deliveryAddress}</p>
                </div>
                <div>
                  <span className="block font-bold text-gray-400 uppercase tracking-wider text-[10px]">Payment & Status</span>
                  <p className="font-bold text-gray-900 mt-1">{invoiceModalOrder.paymentProvider || invoiceModalOrder.paymentMethod}</p>
                  <p className="text-emerald-700 font-semibold mt-0.5">Status: {invoiceModalOrder.paymentStatus || 'Verified Paid'}</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-gray-200 font-bold uppercase text-[10px] text-gray-500">
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceModalOrder.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-3 font-semibold text-gray-900">{item.name}</td>
                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">${item.price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold">${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span className="font-mono text-gray-900">${(invoiceModalOrder.total * 0.9).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Hyperlocal Delivery Fee:</span>
                    <span className="font-mono text-gray-900">$2.50</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Sales Tax (5%):</span>
                    <span className="font-mono text-gray-900">${(invoiceModalOrder.total * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 text-sm font-black text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-600 font-serif text-base">${invoiceModalOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="text-center pt-4 border-t border-dashed border-gray-200 text-[10px] text-gray-400">
                <p>Thank you for supporting your local neighborhood merchant on NearMart!</p>
                <p className="font-mono mt-0.5">NearMart Express Marketplace • Official Electronic Tax Document</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => handleDownloadCSVInvoice(invoiceModalOrder)}
                className="bg-white border border-gray-200 hover:bg-slate-100 text-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download CSV</span>
              </button>
              <button
                onClick={() => handleDownloadPDFInvoice(invoiceModalOrder)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download PDF Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
              <span className="font-serif text-lg font-black text-gray-900">Add New Inventory Item</span>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Multigrain Sourdough"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Product Description</label>
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={handleAIGenerateContent}
                    className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span>{isGeneratingAI ? 'Generating...' : '✨ Auto-Generate with Gemini AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Describe your artisan product..."
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="7.50"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Initial Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={newProdInventory}
                    onChange={(e) => setNewProdInventory(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                <select
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Bakery">Bakery</option>
                  <option value="Produce">Produce</option>
                  <option value="Coffee">Coffee</option>
                  <option value="Artisan Crafts">Artisan Crafts</option>
                  <option value="Pantry">Pantry</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer mt-2"
              >
                Publish Product Listing
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
