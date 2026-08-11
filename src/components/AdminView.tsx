/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Users, Store, Tag, ShoppingCart, 
  Settings, CheckCircle, XCircle, Percent, Plus, ClipboardList, 
  HelpCircle, DollarSign, Calendar, Sliders, AlertCircle, Activity, ExternalLink, Filter, Search
} from 'lucide-react';
import { AppState, Shop, Coupon, Order } from '../types';

interface AdminViewProps {
  state: AppState;
  onApproveVendor: (shopId: string) => void;
  onAddCoupon: (coupon: Omit<Coupon, 'id' | 'active'>) => void;
  onUpdatePlatformSettings: (settings: any) => void;
  onToggleUserBlock: (userId: string) => void;
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
  addToast: (message: string, type: 'success' | 'info' | 'error') => void;
}

export default function AdminView({
  state,
  onApproveVendor,
  onAddCoupon,
  onUpdatePlatformSettings,
  onToggleUserBlock,
  onUpdateOrderStatus,
  addToast,
}: AdminViewProps) {
  const [adminTab, setAdminTab] = useState<'kpis' | 'users' | 'approvals' | 'products' | 'coupons' | 'transactions' | 'settings'>('approvals');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // New Coupon Form State
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCoupCode, setNewCoupCode] = useState('');
  const [newCoupDesc, setNewCoupDesc] = useState('');
  const [newCoupDiscount, setNewCoupDiscount] = useState('');
  const [newCoupMinSpend, setNewCoupMinSpend] = useState('15');
  const [newCoupExpiry, setNewCoupExpiry] = useState('2026-12-31');

  // Filter vendor approvals
  const pendingVendors = useMemo(() => {
    return state.shops.filter(s => !s.approved);
  }, [state.shops]);

  const activeVendors = useMemo(() => {
    return state.shops.filter(s => s.approved);
  }, [state.shops]);

  // Calculations
  const metrics = useMemo(() => {
    const platformGMV = state.orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0);
    const activeOrders = state.orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const totalVendors = state.shops.length;

    return {
      platformGMV,
      activeOrders,
      totalVendors,
      pendingApprovalsCount: pendingVendors.length,
    };
  }, [state.orders, state.shops, pendingVendors]);

  // Handlers
  const handleApprove = (shopId: string, name: string) => {
    onApproveVendor(shopId);
  };

  const handleCreateCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupCode || !newCoupDiscount) {
      addToast('Please provide a coupon code and discount percentage.', 'error');
      return;
    }
    onAddCoupon({
      code: newCoupCode.trim().toUpperCase(),
      description: newCoupDesc,
      discountPercent: parseInt(newCoupDiscount) || 10,
      minSpend: parseInt(newCoupMinSpend) || 15,
      expiryDate: newCoupExpiry,
    });
    setShowAddCoupon(false);
    // Reset Form
    setNewCoupCode('');
    setNewCoupDesc('');
    setNewCoupDiscount('');
    setNewCoupMinSpend('15');
    setNewCoupExpiry('2026-12-31');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 text-gray-900 dark:text-slate-100">
      {/* Executive Hero Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white border-b border-gray-800 py-8 px-4 sm:px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="font-serif text-2xl md:text-3xl font-black tracking-tight">Platform Control Console</h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Hyperlocal Operations Command Center • <strong>Brooklyn District Hub</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono font-bold text-emerald-300 flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Core Engine v2.6.4: <strong>ONLINE</strong></span>
            </div>

            <button
              onClick={() => setShowAddCoupon(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Admin Panels */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Navigation Admin subtabs */}
        <div className="flex flex-wrap border-b border-gray-200 dark:border-slate-700 mb-8 gap-x-3 gap-y-2 pb-2">
          <button
            onClick={() => setAdminTab('approvals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'approvals' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Merchant Onboarding</span>
            {metrics.pendingApprovalsCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {metrics.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('kpis')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'kpis' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Platform KPIs</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'users' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory</span>
            <span className="bg-slate-200 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {state.users?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'products' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Platform Products</span>
          </button>

          <button
            onClick={() => setAdminTab('coupons')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'coupons' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-4 h-4 text-orange-500" />
            <span>Promotion Deals</span>
          </button>

          <button
            onClick={() => setAdminTab('transactions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'transactions' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Order Management</span>
            <span className="bg-slate-200 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {state.orders.length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              adminTab === 'settings' 
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Configs</span>
          </button>
        </div>

        {/* TAB: VENDOR ONBOARDING APPROVALS */}
        {adminTab === 'approvals' && (
          <div className="space-y-8">
            <div className="flex justify-between items-end border-b border-gray-200 dark:border-slate-700 pb-3">
              <div>
                <h2 className="font-serif text-2xl font-black text-gray-900 dark:text-white tracking-tight">Independent Vendor Registry</h2>
                <p className="text-xs text-gray-500 mt-1">Approve local small-businesses and grant them immediate marketplace listing access</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                {pendingVendors.length} Applications Awaiting Review
              </span>
            </div>

            {pendingVendors.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-10 rounded-3xl text-center shadow-xs">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-base font-bold text-gray-900 dark:text-white">Onboarding pipeline clear!</p>
                <p className="text-xs text-gray-500 mt-1">All registered small-businesses are currently approved and active on NearMart.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVendors.map((shop) => (
                  <div
                    key={shop.id}
                    id={`onboard-card-${shop.id}`}
                    className="bg-white dark:bg-slate-900 border-l-4 border-l-orange-500 border border-gray-200 dark:border-slate-700 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-4">
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-gray-200 bg-slate-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2.5">
                          <h3 className="font-serif text-lg font-black text-gray-900">{shop.name}</h3>
                          <span className="text-[10px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Awaiting Approval
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 max-w-xl font-normal leading-relaxed">
                          {shop.description}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 font-medium pt-1">
                          <span>Owner: <strong className="text-gray-700">{shop.ownerName}</strong> ({shop.ownerEmail})</span>
                          <span>•</span>
                          <span>Category: <strong className="text-emerald-600">{shop.category}</strong></span>
                          <span>•</span>
                          <span>Joined: {shop.joinedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto border-t border-gray-100 md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-end">
                      <button
                        onClick={() => addToast('Merchant application documents downloaded.', 'info')}
                        className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-all"
                      >
                        Review Docs
                      </button>
                      <button
                        id={`approve-vendor-btn-${shop.id}`}
                        onClick={() => handleApprove(shop.id, shop.name)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        Approve Store
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List of active verified vendors */}
            <div className="space-y-4 pt-6">
              <h3 className="font-serif text-lg font-black text-gray-900 dark:text-white">Active Certified Merchants ({activeVendors.length})</h3>
              
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                        <th className="p-4">Store Details</th>
                        <th className="p-4">Owner Name</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Platform Verified</th>
                        <th className="p-4 text-right">Status</th>
                      </tr>
                    </thead>
                  <tbody>
                    {activeVendors.map((shop) => (
                      <tr key={shop.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 text-xs text-gray-900 dark:text-slate-200">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={shop.logo}
                              alt={shop.name}
                              className="w-9 h-9 rounded-xl object-cover border border-gray-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-bold text-gray-900">{shop.name}</p>
                              <span className="text-[10px] text-gray-400 font-mono">{shop.address}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-gray-600">{shop.ownerName}</td>
                        <td className="p-4 text-emerald-600 font-bold">{shop.category}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>NearMart Verified</span>
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* TAB: KPI DASHBOARD */}
        {adminTab === 'kpis' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform Volume (GMV)</span>
                <span className="font-serif text-2xl font-black text-gray-900 mt-1.5 block">
                  ${(metrics.platformGMV + 18500.50).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-xs text-emerald-600 font-semibold mt-4">▲ +18.2% platform growth this month</p>
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Courier In-Transit Orders</span>
                <span className="font-serif text-2xl font-black text-gray-900 mt-1.5 block">
                  {metrics.activeOrders} active
                </span>
                <p className="text-xs text-gray-500 mt-4 font-medium">Active dispatch times under 28 min</p>
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Partner Shops</span>
                <span className="font-serif text-2xl font-black text-gray-900 mt-1.5 block">
                  {activeVendors.length} registered
                </span>
                <p className="text-xs text-emerald-600 font-semibold mt-4">100% small-businesses approved</p>
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xs">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor Registration Requests</span>
                <span className="font-serif text-2xl font-black text-gray-900 mt-1.5 block">
                  {metrics.pendingApprovalsCount} pending
                </span>
                {metrics.pendingApprovalsCount > 0 ? (
                  <p className="text-xs text-rose-600 font-bold mt-4 animate-pulse">Action required: onboarding pending</p>
                ) : (
                  <p className="text-xs text-emerald-600 font-semibold mt-4">Onboarding queue completely cleared</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-2xs space-y-3 text-gray-900">
              <h3 className="font-serif text-lg font-black text-gray-900">District Operations Command</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-normal">
                NearMart operates on a decentralized localized marketplace loop. You are seeing real-time updates from <strong>Brooklyn Hub</strong>, including small-business owners updating inventory, independent delivery couriers checking off statuses, and end-consumers checking out with promotional voucher codes.
              </p>
            </div>
          </div>
        )}

        {/* TAB: USER DIRECTORY */}
        {adminTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900">User Directory</h2>
              <p className="text-xs text-gray-500">Manage all platform users, their roles, and access.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="p-4">User Details</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state.users || []).map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-slate-50/80 text-xs text-gray-900">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{user.username}</p>
                          <p className="text-[10px] text-gray-400">{user.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center text-[10px] font-bold uppercase rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-emerald-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-gray-500 font-medium">{new Date(user.dateJoined).toLocaleDateString()}</td>
                        <td className="p-4">
                          {user.isActive ? (
                            <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              Blocked
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {user.username !== 'admin' && (
                            <button
                              onClick={() => onToggleUserBlock(user.id)}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                                user.isActive
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {user.isActive ? 'Block User' : 'Unblock User'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLATFORM PRODUCTS */}
        {adminTab === 'products' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-black text-gray-900">Platform Products</h2>
              <p className="text-xs text-gray-500">View all active product listings across the hyperlocal marketplace.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="p-4">Product Info</th>
                      <th className="p-4">Merchant</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Inventory</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.products.map((prod) => (
                      <tr key={prod.id} className="border-b border-gray-100 hover:bg-slate-50/80 text-xs text-gray-900">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                            <div>
                              <p className="font-bold text-gray-900">{prod.name}</p>
                              <p className="text-[10px] text-gray-400">{prod.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-gray-600">{prod.shopName}</td>
                        <td className="p-4 font-serif text-sm font-black text-gray-900">${prod.price.toFixed(2)}</td>
                        <td className="p-4 font-mono font-bold text-gray-900">{prod.inventory}</td>
                        <td className="p-4 text-right">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: COUPON MANAGEMENT */}
        {adminTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl font-black text-gray-900">Platform Coupon Directory</h2>
                <p className="text-xs text-gray-500">Configure and issue marketing vouchers to drive local consumer activity</p>
              </div>
              <button
                onClick={() => setShowAddCoupon(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Issue New Code</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {state.coupons.map((coup) => (
                <div
                  key={coup.id}
                  className="bg-white border border-gray-200 p-5 rounded-3xl flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-base font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        {coup.code}
                      </span>
                      <span className="text-xs font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                        {coup.discountPercent}% OFF
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      {coup.description}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-[10px] text-gray-400 font-semibold">
                    <span>Min spend: ${coup.minSpend}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      <span>Expires: {coup.expiryDate}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SYSTEM-WIDE ORDER MANAGEMENT */}
        {adminTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-black text-gray-900">Platform Order Management</h2>
                <p className="text-xs text-gray-500 font-medium">Global order ledger across all sellers and customers</p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-gray-200 text-xs font-bold space-x-1">
                {['all', 'pending', 'preparing', 'dispatched', 'delivered', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg uppercase text-[10px] transition ${
                      orderStatusFilter === st ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                      <th className="p-4">Order ID</th>
                      <th className="p-4">Fulfilling Store</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.orders
                      .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                      .map((ord) => (
                        <tr key={ord.id} className="border-b border-gray-100 hover:bg-slate-50/80 text-xs text-gray-900">
                          <td className="p-4 font-mono font-bold text-gray-900">{ord.id}</td>
                          <td className="p-4 font-bold text-emerald-600">{ord.shopName}</td>
                          <td className="p-4 font-medium text-gray-600">
                            {ord.customerName}
                            <span className="block text-[10px] text-gray-400">{ord.customerEmail}</span>
                          </td>
                          <td className="p-4 font-serif text-sm font-black text-gray-900">${ord.total.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase rounded-full border px-2.5 py-0.5 ${
                              ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              ord.status === 'dispatched' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              ord.status === 'preparing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              ord.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-100 text-gray-600 border-gray-200'
                            }`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {onUpdateOrderStatus && (
                              <select
                                value={ord.status}
                                onChange={(e) => onUpdateOrderStatus(ord.id, e.target.value as Order['status'])}
                                className="bg-slate-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 px-2 py-1 focus:outline-none cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="preparing">Preparing</option>
                                <option value="dispatched">Dispatched</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PLATFORM CONFIGURATION SETTINGS */}
        {adminTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 p-8 rounded-3xl shadow-sm text-gray-900">
            <h2 className="font-serif text-xl font-black text-gray-900 text-center mb-6">Operations Panel</h2>

            <form onSubmit={(e) => { e.preventDefault(); addToast('Settings updated successfully.', 'success'); }} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Marketplace Name</label>
                  <input
                    type="text"
                    required
                    defaultValue="NearMart Hyperlocal"
                    className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Platform Fee %</label>
                  <input
                    type="number"
                    required
                    defaultValue="5"
                    className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fulfillment Radius limit (miles)</label>
                <input
                  type="number"
                  required
                  defaultValue="3"
                  className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                Apply Platform Configurations
              </button>
            </form>
          </div>
        )}
      </main>

      {/* NEW COUPON DIALOG */}
      {showAddCoupon && (
        <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
              <span className="font-serif text-lg font-black text-gray-900">Issue Platform Promotion Code</span>
              <button onClick={() => setShowAddCoupon(false)} className="p-1 hover:bg-slate-200 rounded-full transition">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Coupon Promo Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SAVENEIGHBOR"
                  value={newCoupCode}
                  onChange={(e) => setNewCoupCode(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deal Summary Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Get 12% off fresh local crafts."
                  value={newCoupDesc}
                  onChange={(e) => setNewCoupDesc(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Discount %</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    placeholder="10"
                    value={newCoupDiscount}
                    onChange={(e) => setNewCoupDiscount(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min Spend ($)</label>
                  <input
                    type="number"
                    required
                    value={newCoupMinSpend}
                    onChange={(e) => setNewCoupMinSpend(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={newCoupExpiry}
                  onChange={(e) => setNewCoupExpiry(e.target.value)}
                  className="w-full bg-slate-50 text-xs text-gray-900 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer mt-2"
              >
                Publish Coupon Code
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
