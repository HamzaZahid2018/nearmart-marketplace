/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  MapPin, Search, ShoppingBag, Heart, User, Store, ShieldCheck,
  ChevronDown, Bell, CheckCircle2, X, LogIn, LogOut, Moon, Sun
} from 'lucide-react';
import { AppState } from '../types';
import { PAKISTAN_LOCATIONS } from '../data/locationsData';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  state: AppState;
  onSearch: (query: string) => void;
  onSelectCategory: (category: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenProfile: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onSelectLocation: (loc: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export default function Header({
  state,
  onSearch,
  onSelectCategory,
  onOpenCart,
  onOpenWishlist,
  onOpenProfile,
  onOpenAuthModal,
  isAuthenticated,
  onLogout,
  onSelectLocation,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  theme = 'light',
  onToggleTheme,
}: HeaderProps) {
  if (!isAuthenticated) {
    return null;
  }

  const [showLocMenu, setShowLocMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(state.searchQuery);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Pakistan Location Filter State
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('All');
  const [locSearchQuery, setLocSearchQuery] = useState<string>('');

  const quickCityTabs = [
    { label: 'All', value: 'All' },
    { label: 'Lahore', value: 'Lahore' },
    { label: 'Karachi', value: 'Karachi' },
    { label: 'Islamabad', value: 'Islamabad' },
    { label: 'Rawalpindi', value: 'Rawalpindi' },
    { label: 'Multan', value: 'Multan' },
    { label: 'BWP', value: 'Bahawalpur (BWP)' },
    { label: 'RYK', value: 'Rahim Yar Khan (RYK)' },
    { label: 'Peshawar', value: 'Peshawar' },
    { label: 'Quetta', value: 'Quetta' },
    { label: 'Faisalabad', value: 'Faisalabad' },
    { label: 'Sukkur', value: 'Sukkur' },
  ];

  const filteredPakistanLocations = useMemo(() => {
    let list: { area: string; city: string; province: string }[] = [];

    PAKISTAN_LOCATIONS.forEach((c) => {
      if (
        selectedCityFilter !== 'All' &&
        c.cityName.toLowerCase() !== selectedCityFilter.toLowerCase() &&
        c.province.toLowerCase() !== selectedCityFilter.toLowerCase()
      ) {
        return;
      }
      c.areas.forEach((area) => {
        list.push({ area, city: c.cityName, province: c.province });
      });
    });

    if (locSearchQuery.trim()) {
      const q = locSearchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.area.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.province.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedCityFilter, locSearchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
    setShowMobileSearch(false);
  };

  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadNotifs = (state.notifications || []).filter(n => !n.isRead);

  const isDark = theme === 'dark';

  return (
    <header
      id="nm-sticky-header"
      className={`sticky top-0 z-50 w-full transition-all ${
        !isAuthenticated
          ? 'bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-white'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E5DFD5] dark:border-slate-800 shadow-xs'
      }`}
    >
      {/* Main Navigation Bar (Level 1) */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 sm:px-6">

        {/* Brand + Location */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="nm-logo-home"
            onClick={() => {
              onSelectCategory('All');
              onSearch('');
              setLocalSearch('');
            }}
            className="flex items-center space-x-2.5 text-left group cursor-pointer"
          >
            <span className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-serif font-black text-2xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              N
            </span>
            <div className="hidden sm:block">
              <span className={`font-serif text-2xl font-black tracking-tight leading-none block transition-colors ${
                !isAuthenticated ? 'text-white' : 'text-gray-900 dark:text-white group-hover:text-emerald-600'
              }`}>
                Near<span className="text-emerald-500">Mart</span>
              </span>
              <span className="block text-[9px] text-emerald-400 tracking-widest font-mono uppercase font-bold mt-0.5">Fresh Hyperlocal Express</span>
            </div>
          </button>

          {/* Location Selector (Only when logged in) */}
          {isAuthenticated && (
            <div className="relative">
              <button
                id="nm-location-selector"
                onClick={() => setShowLocMenu(!showLocMenu)}
                className="flex items-center space-x-1.5 text-xs text-gray-900 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xs cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="max-w-[100px] truncate hidden md:inline">{state.selectedLocation}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {showLocMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLocMenu(false)}></div>
                  <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl p-4 z-20 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <h4 className="font-serif font-bold text-sm text-gray-900 dark:text-white">Select Pakistan City & Area</h4>
                      </div>
                      <button onClick={() => setShowLocMenu(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search city, area, or province..."
                        value={locSearchQuery}
                        onChange={(e) => setLocSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-slate-200 pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filter By City / Region</span>
                      <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pb-1.5 pr-1 scrollbar-thin">
                        {quickCityTabs.map((ct) => (
                          <button
                            key={ct.value}
                            type="button"
                            onClick={() => {
                              setSelectedCityFilter(ct.value);
                              if (ct.value !== 'All') onSelectLocation(`${ct.label}`);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                              selectedCityFilter === ct.value
                                ? 'bg-emerald-500 text-white shadow-xs ring-2 ring-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1 border-t border-gray-100 dark:border-slate-700 pt-2 scrollbar-thin">
                      {selectedCityFilter !== 'All' && (
                        <button
                          type="button"
                          onClick={() => { onSelectLocation(`${selectedCityFilter}`); setShowLocMenu(false); }}
                          className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs mb-1.5"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <MapPin className="w-4 h-4 shrink-0 text-white" />
                            <span>Select Entire City: {selectedCityFilter}</span>
                          </div>
                          <span className="text-[9px] font-mono bg-white/20 px-2 py-0.5 rounded-md shrink-0 ml-2">1-Click</span>
                        </button>
                      )}

                      {filteredPakistanLocations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">No location matching "{locSearchQuery}"</div>
                      ) : (
                        filteredPakistanLocations.map((item, idx) => {
                          const fullLoc = `${item.area}, ${item.city}`;
                          const isSelected = state.selectedLocation === fullLoc || state.selectedLocation === item.city;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => { onSelectLocation(fullLoc); setShowLocMenu(false); }}
                              className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <span className="truncate">{item.area}</span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md shrink-0 ml-2">
                                {item.city}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Global Search (Desktop — Only when logged in) */}
        {isAuthenticated && (
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search local bakeries, organic growers, handcrafts..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 pl-11 pr-24 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-xs font-medium"
              />
              <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold transition shadow-sm shadow-emerald-500/20"
              >
                Search
              </button>
            </div>
          </form>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Mobile Search Toggle */}
          {isAuthenticated && (
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="md:hidden p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {isAuthenticated && (
            <>
              {/* Wishlist */}
              <button
                id="header-wishlist-btn"
                onClick={onOpenWishlist}
                className="p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-orange-500 transition relative border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                title="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {state.wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {state.wishlist.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                id="header-cart-btn"
                onClick={onOpenCart}
                className="p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition relative border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                title="Your Basket"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  id="header-notif-btn"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition relative border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                      {unreadNotifs.length}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotifMenu(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 mb-1 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Alerts Center</span>
                        {unreadNotifs.length > 0 && (
                          <button
                            onClick={() => onMarkAllNotificationsRead()}
                            className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark All Read</span>
                          </button>
                        )}
                      </div>

                      {(!state.notifications || state.notifications.length === 0) ? (
                        <div className="p-6 text-center text-gray-400">
                          <Bell className="w-6 h-6 mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-semibold text-gray-600 dark:text-slate-400">You're all caught up!</p>
                          <p className="text-[10px]">No new notifications.</p>
                        </div>
                      ) : (
                        state.notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${!notif.isRead ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : ''}`}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className={`text-xs font-bold ${!notif.isRead ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                {notif.title}
                              </h4>
                              <span className="text-[9px] font-mono text-gray-400 whitespace-nowrap ml-2">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                            {!notif.isRead && (
                              <button
                                onClick={() => onMarkNotificationRead(notif.id)}
                                className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 mt-2 underline uppercase tracking-wider"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* 🌙 Dark Mode Toggle */}
          <button
            id="nm-theme-toggle"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2.5 rounded-xl text-gray-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Auth / Profile */}
          {!isAuthenticated ? (
            onOpenAuthModal && (
              <button
                onClick={() => onOpenAuthModal('login')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl transition shadow-md shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer shrink-0"
                title="Sign In or Register Account"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="header-profile-btn"
                onClick={onOpenProfile}
                className="flex items-center space-x-2 pl-1.5 pr-2.5 py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-gray-200 dark:hover:border-slate-700 cursor-pointer"
              >
                <img
                  src={state.userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
                  alt={state.userProfile.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500/40 shadow-2xs shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden sm:block">
                  <span className="block text-xs font-bold text-gray-900 dark:text-white leading-none mb-1 max-w-[100px] truncate">
                    {state.userProfile.name || 'Patron'}
                  </span>
                  <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    state.role === 'customer'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : state.role === 'owner'
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  }`}>
                    {state.role === 'customer' ? '👤 Customer' : state.role === 'owner' ? '🏪 Shop Owner' : '🛡️ Admin'}
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold text-xs px-3 py-2 rounded-xl transition border border-rose-200 dark:border-rose-800/60 flex items-center space-x-1.5 cursor-pointer shrink-0"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Expandable Bar */}
      {isAuthenticated && showMobileSearch && (
        <div className="md:hidden px-4 pb-3 animate-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Search shops, products..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 pl-10 pr-20 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <button type="submit" className="absolute right-1.5 top-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold transition">
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
