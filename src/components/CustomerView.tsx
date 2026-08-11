/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass, Apple, Coffee, Sparkles, Soup, CookingPot,
  MapPin, Clock, Star, Heart, ShoppingBag, ArrowRight,
  ShieldCheck, Check, Info, Trash2, Tag, Gift,
  X, CreditCard, ChevronRight, Truck, CheckCircle, Package, ArrowLeft, RefreshCw, User,
  Camera, ZoomIn, ZoomOut, RotateCw, Move, Upload, Save, LayoutGrid, Map as MapIcon, Download, FileText, Bot, ChefHat, Send, Zap, LogOut
} from 'lucide-react';
import { AppState, Product, Shop, Order, CartItem } from '../types';
import InteractiveMap from './InteractiveMap';
import { generateRecipeFromCart, answerShoppingAssistant, filterProductsByNaturalLanguage } from '../api/geminiService';
import apiClient from '../api/client';

interface CustomerViewProps {
  state: AppState;
  onAddToCart: (productId: string) => void;
  onRemoveFromCart: (productId: string) => void;
  onUpdateCartQty: (productId: string, qty: number) => void;
  onToggleWishlist: (productId: string) => void;
  onApplyCoupon: (code: string) => void;
  onPlaceOrder: (details: { address: string; payment: string }) => Promise<Order | any>;
  onVerifyPayment: (orderId: string) => Promise<void>;
  onSetSelectedCategory: (category: string) => void;
  onSetTrackId: (id: string | null) => void;
  onUpdateProfile: (profile: any) => void;
  onAddReview?: (review: { shopId: string; productId?: string; productName?: string; rating: number; comment: string }) => void;
  addToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onSearch: (query: string) => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
}

export default function CustomerView({
  state,
  onAddToCart,
  onRemoveFromCart,
  onUpdateCartQty,
  onToggleWishlist,
  onApplyCoupon,
  onPlaceOrder,
  onVerifyPayment,
  onSetSelectedCategory,
  onSetTrackId,
  onUpdateProfile,
  onAddReview,
  addToast,
  onSearch,
  onLogout,
  isAuthenticated,
  onOpenAuthModal,
}: CustomerViewProps) {
  // Tabs and views inside Customer journey
  const [activeTab, setActiveTab] = useState<'browse' | 'wishlist' | 'profile' | 'orders' | 'ai_assistant'>('browse');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<number | null>(null); // null = browse, 1 = details/payment
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [discoveryDisplayMode, setDiscoveryDisplayMode] = useState<'grid' | 'map'>('grid');

  // Gemini AI Assistant & Recipe Concierge State
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: '👋 Hello! I am your NearMart Gemini AI Concierge. Ask me for custom recipes based on your cart, find gluten-free bakeries, or discover local deals under $15!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<{ title: string; recipeText: string; cookingTime: string; difficulty: string } | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);

  // Checkout Form State
  const [checkoutAddress, setCheckoutAddress] = useState(state.userProfile.address);
  const [checkoutPayment, setCheckoutPayment] = useState('card');
  const [couponInput, setCouponInput] = useState('');

  // Payment Verification State
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);

  // Review Modal State
  const [reviewModalOrder, setReviewModalOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');

  // Global Event Listeners (Cart Drawer & Header Profile Navigation)
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    const handleOpenProfile = () => {
      setActiveTab('profile');
      setSelectedShop(null);
    };
    document.addEventListener('open-cart-drawer', handleOpenCart);
    document.addEventListener('open-profile-tab', handleOpenProfile);
    return () => {
      document.removeEventListener('open-cart-drawer', handleOpenCart);
      document.removeEventListener('open-profile-tab', handleOpenProfile);
    };
  }, []);

  // Local Profile Form State
  const [profileName, setProfileName] = useState(state.userProfile.name);
  const [profileEmail, setProfileEmail] = useState(state.userProfile.email);
  const [profilePhone, setProfilePhone] = useState(state.userProfile.phone);
  const [profileAddress, setProfileAddress] = useState(state.userProfile.address);
  const [profileAvatar, setProfileAvatar] = useState(state.userProfile.avatar);

  // Keep local profile form synced with global state
  useEffect(() => {
    setProfileName(state.userProfile.name);
    setProfileEmail(state.userProfile.email);
    setProfilePhone(state.userProfile.phone);
    setProfileAddress(state.userProfile.address);
    setProfileAvatar(state.userProfile.avatar);
  }, [state.userProfile]);

  // Image Adjustment & Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setRawImage(ev.target.result as string);
          setZoomScale(1.0);
          setRotationDeg(0);
          setPanOffset({ x: 0, y: 0 });
          setCropModalOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveCroppedImage = () => {
    if (!rawImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = rawImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(panOffset.x, panOffset.y);

      const drawWidth = size;
      const drawHeight = (img.height / img.width) * size;
      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/png', 0.9);
      setProfileAvatar(croppedDataUrl);

      // Save directly to global profile so top header updates immediately!
      onUpdateProfile({
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        address: profileAddress,
        avatar: croppedDataUrl,
      });

      setCropModalOpen(false);
      setRawImage(null);
      addToast('Profile picture updated and saved to header!', 'success');
    };
  };

  // Categories lists
  const categories = [
    { name: 'All', icon: Compass },
    { name: 'Bakery', icon: CookingPot },
    { name: 'Produce', icon: Apple },
    { name: 'Coffee', icon: Coffee },
    { name: 'Artisan Crafts', icon: Sparkles },
    { name: 'Pantry', icon: Soup },
  ];

  // Filtering shops & products
  const approvedShops = useMemo(() => {
    return state.shops.filter(s => s.approved);
  }, [state.shops]);

  const filteredProducts = useMemo(() => {
    let prods = state.products.filter(p => {
      // Must belong to an approved shop
      const shop = state.shops.find(s => s.id === p.shopId);
      return shop && shop.approved;
    });

    if (state.selectedCategory !== 'All') {
      prods = prods.filter(p => p.category.toLowerCase() === state.selectedCategory.toLowerCase());
    }

    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase();
      prods = prods.filter(
        p => p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.shopName.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return prods;
  }, [state.products, state.shops, state.selectedCategory, state.searchQuery]);

  // Cart Calculations
  const cartWithDetails = useMemo(() => {
    return state.cart.map(cItem => {
      const product = state.products.find(p => p.id === cItem.productId);
      return {
        ...cItem,
        product,
      };
    }).filter(item => item.product !== undefined);
  }, [state.cart, state.products]);

  // Natural language smart filtering explanation
  const { filtered: smartFilteredProducts, explanation: aiSearchExplanation } = useMemo(() => {
    return filterProductsByNaturalLanguage(state.searchQuery, state.products);
  }, [state.searchQuery, state.products]);

  // Handle Recipe Generation from Basket
  const handleGenerateCartRecipe = async () => {
    if (cartWithDetails.length === 0) {
      addToast('Add items to your basket first to generate a recipe!', 'info');
      return;
    }
    setIsGeneratingRecipe(true);
    try {
      addToast('✨ Gemini AI is crafting a chef recipe from your basket items...', 'info');
      const cartFormatted = cartWithDetails.map(item => ({
        name: item.product?.name || 'Item',
        quantity: item.quantity,
      }));
      const recipe = await generateRecipeFromCart(cartFormatted);
      setGeneratedRecipe(recipe);
      setActiveTab('ai_assistant');
      addToast('✨ Chef Recipe generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to generate recipe.', 'error');
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Handle Sending Chat to AI Assistant
  const handleSendAiMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiInputText.trim() || isAiThinking) return;

    const userText = aiInputText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAiChatMessages(prev => [...prev, { sender: 'user', text: userText, time: nowTime }]);
    setAiInputText('');
    setIsAiThinking(true);

    try {
      const cartFormatted = cartWithDetails.map(item => ({
        name: item.product?.name || 'Item',
        quantity: item.quantity,
      }));
      const aiReply = await answerShoppingAssistant(userText, cartFormatted, state.shops, state.products);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: aiReply, time: replyTime }]);
    } catch (err) {
      console.error(err);
      setAiChatMessages(prev => [...prev, { sender: 'ai', text: 'I am here to help you discover local neighborhood products!', time: nowTime }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const totals = useMemo(() => {
    const subtotal = cartWithDetails.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
    const deliveryFee = subtotal > 0 ? 3.50 : 0;

    let discount = 0;
    if (state.activeCouponCode) {
      const coup = state.coupons.find(c => c.code === state.activeCouponCode);
      if (coup && subtotal >= coup.minSpend) {
        discount = Math.round((subtotal * (coup.discountPercent / 100)) * 100) / 100;
      }
    }

    const total = Math.max(0, Math.round((subtotal + deliveryFee - discount) * 100) / 100);
    return { subtotal, deliveryFee, discount, total };
  }, [cartWithDetails, state.activeCouponCode, state.coupons]);

  // Retrieve active order if tracking
  const activeTrackedOrder = useMemo(() => {
    if (!state.activeOrderTrackId) return null;
    return state.orders.find(o => o.id === state.activeOrderTrackId) || null;
  }, [state.orders, state.activeOrderTrackId]);

  // Handlers
  const handleApplyCouponCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    const coup = state.coupons.find(c => c.code === code);
    if (coup) {
      if (!coup.active) {
        addToast('This coupon has expired.', 'error');
        return;
      }
      const subtotal = cartWithDetails.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
      if (subtotal < coup.minSpend) {
        addToast(`Minimum spend of $${coup.minSpend} required for this coupon.`, 'info');
        return;
      }
      onApplyCoupon(code);
      addToast(`Coupon '${code}' applied successfully!`, 'success');
    } else {
      addToast('Invalid coupon code.', 'error');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.cart.length === 0) {
      addToast('Your basket is empty.', 'error');
      return;
    }
    try {
      const order = await onPlaceOrder({
        address: checkoutAddress,
        payment: checkoutPayment,
      });
      setCheckoutStep(null);
      setIsCartOpen(false);
      setActiveTab('orders');

      if (order?.gatewayRedirectUrl) {
        setVerifyingOrder(order);
      }
    } catch (err) {
      // Error handled by parent
    }
  };

  const handleVerifyPayment = async () => {
    if (verifyingOrder) {
      addToast('Verifying payment status...', 'info');
      try {
        await onVerifyPayment(verifyingOrder.id);
        addToast(`Payment for Order ${verifyingOrder.id} verified successfully!`, 'success');
        setVerifyingOrder(null);
      } catch (err) {
        addToast('Verification failed.', 'error');
      }
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      address: profileAddress,
      avatar: profileAvatar,
    });
    addToast('Profile updated successfully!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 pb-24 text-stone-900 dark:text-stone-100">
      
      {/* Secondary Unified Sub-Navigation Bar (Level 2) */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#E5DFD5] dark:border-slate-800 sticky top-[57px] z-40 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          
          {/* Left: Category Pills */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = state.selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  id={`cat-chip-${cat.name.toLowerCase().replace(' ', '-')}`}
                  onClick={() => {
                    onSetSelectedCategory(cat.name);
                    if (activeTab !== 'browse') {
                      setActiveTab('browse');
                      setSelectedShop(null);
                    }
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs font-bold'
                      : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-700'}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Vertical Separator Divider */}
          <div className="h-4 w-px bg-[#E5DFD5] dark:bg-slate-700 shrink-0 hidden md:block"></div>

          {/* Right: Customer Navigation Tabs */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => { setActiveTab('browse'); setSelectedShop(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Marketplace Discovery
            </button>

            <button
              onClick={() => setActiveTab('wishlist')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <span>Saved Wishlist</span>
              {state.wishlist.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {state.wishlist.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <span>My Orders</span>
              {state.orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled') && (
                <span className="bg-emerald-800 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                  Active
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai_assistant')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                activeTab === 'ai_assistant'
                  ? 'bg-emerald-800 text-white font-extrabold'
                  : 'text-emerald-800 dark:text-emerald-400 font-semibold hover:text-emerald-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
              <span>AI Concierge</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">

        {/* BROWSE / DISCOVERY VIEW */}
        {activeTab === 'browse' && !selectedShop && (
          <div className="space-y-12">
            
            {/* HERO SECTION — Clean Editorial 2-Column Design */}
            <div className="bg-white dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Copy, Location Indicator & CTAs */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-stone-100 dark:bg-slate-800 border border-[#E5DFD5] dark:border-slate-700 rounded-full text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Hyperlocal Express in Rahim Yar Khan</span>
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 dark:text-white leading-tight tracking-tight">
                  Fresh local stores in<br />
                  <span className="text-emerald-800 dark:text-emerald-400">Rahim Yar Khan, delivered today.</span>
                </h1>

                <p className="text-stone-600 dark:text-stone-300 text-sm max-w-lg leading-relaxed font-normal">
                  Discover authentic artisan bakeries, organic produce markets, specialty coffee shops, and daily groceries living blocks away in Rahim Yar Khan.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    onClick={() => onSetSelectedCategory('Produce')}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Explore Fresh Produce</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const code = 'NEIGHBOR10';
                      onApplyCoupon(code);
                      addToast('NEIGHBOR10 Applied! 10% off activated.', 'success');
                    }}
                    className="bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-800 dark:text-stone-200 border border-[#E5DFD5] dark:border-slate-700 px-5 py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Gift className="w-4 h-4 text-emerald-700" />
                    <span>Claim RYK Voucher</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Balanced Marketplace Photo Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                <div className="relative h-44 rounded-2xl overflow-hidden border border-[#E5DFD5] dark:border-slate-800 shadow-xs group">
                  <img
                    src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400"
                    alt="Artisan Bakery"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent flex items-end p-3 text-white">
                    <div>
                      <p className="font-serif text-xs font-bold">Artisan Bakery</p>
                      <p className="text-[10px] text-stone-300">Sourdough & Pastries</p>
                    </div>
                  </div>
                </div>

                <div className="relative h-44 rounded-2xl overflow-hidden border border-[#E5DFD5] dark:border-slate-800 shadow-xs group">
                  <img
                    src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=400"
                    alt="Organic Market"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent flex items-end p-3 text-white">
                    <div>
                      <p className="font-serif text-xs font-bold">Organic Harvest</p>
                      <p className="text-[10px] text-stone-300">Farm Fresh Produce</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 relative h-36 rounded-2xl overflow-hidden border border-[#E5DFD5] dark:border-slate-800 shadow-xs group">
                  <img
                    src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&q=80&w=600"
                    alt="Local Florist & Specialty Market"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 via-transparent to-transparent flex items-end p-3 text-white">
                    <div>
                      <p className="font-serif text-xs font-bold">Specialty Merchants</p>
                      <p className="text-[10px] text-stone-300">Florists, Roasteries & Artisan Goods</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Natural Language Search Explanation Badge */}
            {aiSearchExplanation && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center space-x-2.5 text-xs font-bold shadow-2xs">
                <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse shrink-0" />
                <span>{aiSearchExplanation}</span>
              </div>
            )}

            {/* RAHIM YAR KHAN NEIGHBORHOOD STORES SECTION */}
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5DFD5] dark:border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="font-serif text-2xl font-black text-stone-900 dark:text-white tracking-tight">Local Stores in Rahim Yar Khan</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Verified independent shops delivering across Rahim Yar Khan</p>
                </div>

                {/* View Display Switcher Toggle */}
                <div className="bg-stone-100 dark:bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-[#E5DFD5] dark:border-slate-700 self-start sm:self-auto shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setDiscoveryDisplayMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      discoveryDisplayMode === 'grid'
                        ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs border border-[#E5DFD5] dark:border-slate-700'
                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Grid View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscoveryDisplayMode('map')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      discoveryDisplayMode === 'map'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Interactive Map</span>
                  </button>
                </div>
              </div>

              {discoveryDisplayMode === 'map' ? (
                <div className="space-y-3">
                  <div className="bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>Click any store marker in Rahim Yar Khan to view details and shop!</span>
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-extrabold">
                      {approvedShops.length} STORES PINNED
                    </span>
                  </div>
                  <InteractiveMap
                    mode="discovery"
                    shops={approvedShops}
                    selectedLocation={state.selectedLocation}
                    onSelectShop={(shop) => setSelectedShop(shop)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {approvedShops.map((shop) => {
                    return (
                      <div
                        key={shop.id}
                        id={`shop-card-${shop.id}`}
                        onClick={() => setSelectedShop(shop)}
                        className="bg-white dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col h-full justify-between group"
                      >
                        <div>
                          {/* Shop Cover Banner */}
                          <div className="h-36 w-full overflow-hidden relative bg-stone-100 dark:bg-slate-800">
                            <img
                              src={shop.banner}
                              alt={shop.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-stone-800 dark:text-stone-200 rounded-xl font-bold text-[10px] px-2.5 py-1 flex items-center space-x-1 border border-[#E5DFD5] dark:border-slate-700 shadow-2xs">
                              <Clock className="w-3 h-3 text-emerald-700" />
                              <span>{shop.deliveryTime}</span>
                            </div>
                          </div>

                          {/* Shop Details */}
                          <div className="p-5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">{shop.category}</span>
                              <span className="text-[11px] font-medium text-stone-400">{shop.distance}</span>
                            </div>
                            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white leading-tight group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                              {shop.name}
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                              {shop.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-5 pt-0 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-bold text-stone-900 dark:text-white">{shop.rating}</span>
                            <span className="text-[10px] text-stone-400">({shop.reviewCount})</span>
                          </div>
                          {shop.verified && (
                            <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-slate-700">
                              <ShieldCheck className="w-3 h-3 text-emerald-700" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PRODUCT GRID SECTION */}
            <div className="space-y-6 pt-2">
              <div className="flex justify-between items-end border-b border-[#E5DFD5] dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-serif text-2xl font-black text-stone-900 dark:text-white tracking-tight">Trending in Rahim Yar Khan</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Freshly prepared, harvested, and curated products across Rahim Yar Khan</p>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 p-12 rounded-3xl text-center max-w-lg mx-auto shadow-xs">
                  <Compass className="w-12 h-12 text-stone-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">No matches found</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Try clearing your filters or testing other search keywords.</p>
                  <button
                    onClick={() => {
                      onSetSelectedCategory('All');
                      onSearch('');
                    }}
                    className="mt-4 bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Smart Natural Language AI Search Active Filter Banner */}
                  {state.searchQuery && (
                    <div className="bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-800/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                            Smart Natural Language Search Active
                          </h4>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                            {aiSearchExplanation || `Filtered products matching "${state.searchQuery}"`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onSearch('')}
                        className="bg-white dark:bg-slate-900 hover:bg-rose-50 text-stone-700 dark:text-stone-300 hover:text-rose-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-[#E5DFD5] dark:border-slate-700 transition shrink-0 flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-stone-500" />
                        <span>Clear Filter</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((prod) => {
                      const isWishlisted = state.wishlist.includes(prod.id);
                      const discountPercent = prod.originalPrice
                        ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
                        : 0;

                      return (
                        <div
                          key={prod.id}
                          id={`product-card-${prod.id}`}
                          className="bg-white dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col h-full justify-between group relative"
                        >
                          {/* Wishlist toggle absolute button */}
                          <button
                            onClick={() => {
                              onToggleWishlist(prod.id);
                              addToast(isWishlisted ? 'Removed from Wishlist.' : 'Saved to Wishlist!', 'success');
                            }}
                            className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-[#E5DFD5] dark:border-slate-700 shadow-xs text-stone-500 hover:text-amber-600 transition cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${isWishlisted ? 'text-amber-600 fill-amber-600' : ''}`} />
                          </button>

                          <div>
                            {/* Product Image */}
                            <div className="h-48 w-full bg-stone-100 dark:bg-slate-800 overflow-hidden relative">
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                              {prod.inventory < 5 && prod.inventory > 0 && (
                                <span className="absolute top-3 left-3 bg-rose-700 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-lg shadow-2xs flex items-center space-x-1 z-10">
                                  <span>⚠️ Only {prod.inventory} Left!</span>
                                </span>
                              )}
                              {discountPercent > 0 && (
                                <span className="absolute bottom-3 left-3 bg-amber-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-lg shadow-2xs">
                                  Save {discountPercent}%
                                </span>
                              )}
                              {prod.isTrending && (
                                <span className="absolute top-3 left-3 bg-emerald-800 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-2xs">
                                  Trending in RYK
                                </span>
                              )}
                            </div>

                            {/* Product Content */}
                            <div className="p-5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">{prod.category}</span>
                                <button
                                  onClick={() => {
                                    const s = state.shops.find(sh => sh.id === prod.shopId);
                                    if (s) setSelectedShop(s);
                                  }}
                                  className="text-[11px] font-semibold text-stone-500 hover:text-emerald-800 dark:hover:text-emerald-400 underline transition cursor-pointer"
                                >
                                  {prod.shopName}
                                </button>
                              </div>
                              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white leading-snug group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                                {prod.name}
                              </h3>
                              <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                                {prod.description}
                              </p>
                            </div>
                          </div>

                          {/* Action area */}
                          <div className="p-5 pt-0 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between mt-4">
                            <div>
                              <div className="flex items-baseline space-x-1.5">
                                <span className="font-serif text-lg font-black text-stone-900 dark:text-white">${prod.price.toFixed(2)}</span>
                                {prod.originalPrice && (
                                  <span className="text-xs text-stone-400 line-through">${prod.originalPrice.toFixed(2)}</span>
                                )}
                              </div>
                            </div>

                            <button
                              id={`add-cart-${prod.id}`}
                              onClick={() => {
                                onAddToCart(prod.id);
                                addToast(`Added '${prod.name}' to basket!`, 'success');
                              }}
                              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Add to Basket</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOM SHOP PAGE DETAIL */}
        {activeTab === 'browse' && selectedShop && (
          <div className="space-y-8">
            {/* Back to Marketplace */}
            <button
              onClick={() => setSelectedShop(null)}
              className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Marketplace</span>
            </button>

            {/* Shop Header card */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="h-48 w-full bg-slate-200 relative">
                <img
                  src={selectedShop.banner}
                  alt={selectedShop.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-950/30"></div>
                {/* Shop logo absolute container */}
                <div className="absolute -bottom-10 left-8 bg-white p-1.5 rounded-2xl shadow-lg border border-gray-200">
                  <img
                    src={selectedShop.logo}
                    alt={selectedShop.name}
                    className="w-16 h-16 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="pt-12 pb-6 px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2.5">
                    <h1 className="font-serif text-3xl font-black text-gray-900">{selectedShop.name}</h1>
                    {selectedShop.verified && (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>NearMart Verified</span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 max-w-2xl font-normal leading-relaxed">
                    {selectedShop.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 pt-1.5">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{selectedShop.address}</span>
                    </span>
                    <span>•</span>
                    <span>{selectedShop.distance} away</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Delivery in {selectedShop.deliveryTime}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-gray-200 p-4 rounded-2xl flex items-center space-x-6 min-w-[200px]">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rating</span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                      <span className="text-base font-black text-gray-900">{selectedShop.rating}</span>
                      <span className="text-xs text-gray-400">({selectedShop.reviewCount} reviews)</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Min Order</span>
                    <span className="block text-base font-black text-gray-900 mt-0.5">${selectedShop.minimumOrder}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Products Listing */}
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-black text-gray-900">Fresh Offerings from {selectedShop.name}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.products
                  .filter(p => p.shopId === selectedShop.id)
                  .map(prod => {
                    const isWishlisted = state.wishlist.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col h-full justify-between group relative"
                      >
                        <button
                          onClick={() => {
                            onToggleWishlist(prod.id);
                            addToast(isWishlisted ? 'Removed from Wishlist.' : 'Saved to Wishlist!', 'success');
                          }}
                          className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xs hover:bg-white text-gray-500 hover:text-orange-500 transition"
                        >
                          <Heart className={`w-4 h-4 ${isWishlisted ? 'text-orange-500 fill-orange-500' : ''}`} />
                        </button>

                        <div>
                          <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          <div className="p-5 space-y-2">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{prod.category}</span>
                            <h3 className="font-serif text-base font-bold text-gray-900 leading-snug group-hover:text-emerald-600 transition">
                              {prod.name}
                            </h3>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                              {prod.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-5 pt-0 border-t border-gray-100 flex items-center justify-between mt-4">
                          <div>
                            <span className="font-serif text-lg font-black text-gray-900">${prod.price.toFixed(2)}</span>
                            <span className="block text-[10px] text-gray-400 font-mono">Stock: {prod.inventory} left</span>
                          </div>

                          <button
                            onClick={() => {
                              onAddToCart(prod.id);
                              addToast(`Added '${prod.name}' to Basket.`, 'success');
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-emerald-500/20"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Basket</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Verified Customer Reviews Section */}
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-black text-gray-900 flex items-center gap-2">
                    <span>Verified Patron Reviews & Ratings</span>
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      ★ {selectedShop.rating} / 5.0
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Real feedback from local neighborhood patrons after completed delivery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.reviews.filter(r => r.shopId === selectedShop.id).length === 0 ? (
                  <div className="col-span-2 p-6 bg-slate-50 border border-gray-200 rounded-2xl text-center text-xs text-gray-400">
                    No verified reviews yet for {selectedShop.name}. Be the first patron to leave feedback after order delivery!
                  </div>
                ) : (
                  state.reviews
                    .filter(r => r.shopId === selectedShop.id)
                    .map(rev => (
                      <div key={rev.id} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <img src={rev.avatar} alt={rev.author} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            <div>
                              <p className="text-xs font-bold text-gray-900">{rev.author}</p>
                              <p className="text-[10px] text-gray-400">{rev.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-orange-500 text-xs font-bold bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-200">
                            <span>★</span>
                            <span>{rev.rating}.0</span>
                          </div>
                        </div>
                        {rev.productName && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                            Item: {rev.productName}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 leading-relaxed font-normal">"{rev.comment}"</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* WISHLIST VIEW */}
        {activeTab === 'wishlist' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-black text-gray-900 tracking-tight">Your Saved Wishlist</h2>
              <p className="text-xs text-gray-500 mt-1">Review items you would like to order from independent neighborhood stores</p>
            </div>

            {state.wishlist.length === 0 ? (
              <div className="bg-white border border-gray-200 p-12 rounded-3xl text-center max-w-lg mx-auto shadow-sm">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-bold text-gray-900">Your wishlist is currently empty</h3>
                <p className="text-xs text-gray-500 mt-1">Browse our trending neighborhood products and click the heart icon to save items.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                >
                  Explore Trending Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.wishlist.map(wId => {
                  const prod = state.products.find(p => p.id === wId);
                  if (!prod) return null;
                  return (
                    <div
                      key={prod.id}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition duration-200 flex flex-col h-full justify-between group relative"
                    >
                      <button
                        onClick={() => {
                          onToggleWishlist(prod.id);
                          addToast('Removed from Wishlist.', 'success');
                        }}
                        className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div>
                        <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="p-5 space-y-2">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{prod.category}</span>
                          <span className="block text-[10px] font-semibold text-gray-400">{prod.shopName}</span>
                          <h3 className="font-serif text-base font-bold text-gray-900 leading-snug">
                            {prod.name}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t border-gray-100 flex items-center justify-between mt-4">
                        <span className="font-serif text-lg font-black text-gray-900">${prod.price.toFixed(2)}</span>

                        <button
                          onClick={() => {
                            onAddToCart(prod.id);
                            addToast(`Added '${prod.name}' to Basket.`, 'success');
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-emerald-500/20"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Basket</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ORDER LIST & ACTIVE TRACKING VIEW */}
        {activeTab === 'orders' && (
          <div className="space-y-12">

            {/* Verification Screen */}
            {verifyingOrder && (
              <div className="bg-white border-2 border-emerald-500 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500 animate-pulse"></div>
                <CreditCard className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-black text-gray-900 mb-2">Complete Your Payment</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                  You selected <strong>{verifyingOrder.paymentProvider}</strong>. Please complete the transaction using your mobile app or redirect link.
                </p>
                <div className="flex justify-center gap-4">
                  <a href={verifyingOrder.gatewayRedirectUrl} target="_blank" rel="noreferrer" className="bg-slate-100 text-gray-800 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition">
                    Open Payment Link
                  </a>
                  <button onClick={handleVerifyPayment} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-600 transition shadow-sm">
                    Confirm & Verify Payment
                  </button>
                </div>
              </div>
            )}

            {/* Live Order tracking timeline section if available */}
            {activeTrackedOrder && (
              <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-5 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Live Delivery Tracker
                    </span>
                    <h3 className="font-serif text-xl font-black text-gray-900 mt-2">
                      Order: {activeTrackedOrder.id}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      From: <strong className="text-emerald-700">{activeTrackedOrder.shopName}</strong> • Placed on {new Date(activeTrackedOrder.date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${activeTrackedOrder.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        activeTrackedOrder.status === 'dispatched' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          activeTrackedOrder.status === 'preparing' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            'bg-slate-100 text-gray-600'
                      } uppercase tracking-wider font-mono`}>
                      Status: {activeTrackedOrder.status}
                    </span>
                    <button
                      onClick={() => addToast('Connecting live GPS telemetry...', 'info')}
                      className="bg-slate-50 border border-gray-200 hover:bg-slate-100 text-gray-700 p-2 rounded-full shadow-2xs"
                      title="Refresh status"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-500" />
                    </button>
                  </div>
                </div>

                {/* Interactive OpenStreetMap Live Courier Telemetry Map */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapIcon className="w-4 h-4 text-emerald-500" />
                      <span>Live Courier Delivery Route Map</span>
                    </span>
                    <span className="text-[10px] font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      LIVE GPS SATELLITE FEED
                    </span>
                  </div>
                  <InteractiveMap mode="tracker" order={activeTrackedOrder} selectedLocation={state.selectedLocation} />
                </div>

                {/* Timeline Graph */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative pt-4">
                  <div className="hidden md:block absolute top-[18px] left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-gray-200 z-0"></div>

                  {activeTrackedOrder.timeline.map((step, idx) => {
                    const isStepCompleted = step.completed;
                    const isActive = activeTrackedOrder.status === step.status ||
                      (step.status === 'pending' && activeTrackedOrder.status === 'preparing') ||
                      (step.status === 'preparing' && activeTrackedOrder.status === 'dispatched') ||
                      (step.status === 'dispatched' && activeTrackedOrder.status === 'delivered');

                    return (
                      <div key={idx} className="flex md:flex-col items-start md:items-center text-left md:text-center space-x-4 md:space-x-0 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${isStepCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' :
                            isActive ? 'bg-orange-50 border-orange-500 text-orange-600 animate-pulse' :
                              'bg-slate-50 border-gray-200 text-gray-400'
                          }`}>
                          {isStepCompleted ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <span className="text-xs font-bold font-mono">{idx + 1}</span>
                          )}
                        </div>

                        <div className="space-y-1 pt-1 md:pt-4">
                          <p className={`text-sm font-bold ${isActive ? 'text-orange-600' : isStepCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {step.title}
                          </p>
                          <p className="text-[11px] text-gray-500 max-w-[150px] mx-auto leading-relaxed">
                            {step.desc}
                          </p>
                          <span className="block text-[9px] font-mono font-bold text-orange-600">{step.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Order Summary on tracking card */}
                <div className="border-t border-gray-100 pt-6 flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Address</h4>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{activeTrackedOrder.deliveryAddress}</p>
                    <span className="block text-xs text-gray-500 mt-0.5">Method: {activeTrackedOrder.paymentMethod}</span>
                  </div>

                  <div className="w-full lg:w-80 bg-slate-50 border border-gray-200 p-4 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-2">Items Bought</h4>
                    {activeTrackedOrder.items.map((item, id) => (
                      <div key={id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 font-medium">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs font-bold text-gray-900">
                      <span>Grand Total</span>
                      <span className="text-emerald-600 text-sm font-black">${activeTrackedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Past orders list */}
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-black text-gray-900 tracking-tight">Your Purchase History</h2>
                <p className="text-xs text-gray-500 mt-1">Review your neighborhood support and fast delivery logs on NearMart</p>
              </div>

              {state.orders.length === 0 ? (
                <div className="bg-white border border-gray-200 p-8 rounded-3xl text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-900">No purchase logs</p>
                  <p className="text-xs text-gray-500">You have not submitted any hyperlocal marketplace orders yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-300 shadow-2xs transition duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                          <Package className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-serif text-base font-black text-gray-900">{ord.id}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                ord.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-orange-50 text-orange-700 border border-orange-200'
                              } uppercase font-mono`}>
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Store: <strong className="text-emerald-700">{ord.shopName}</strong> • Date: {new Date(ord.date).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Payment: {ord.paymentProvider || ord.paymentMethod} ({ord.paymentStatus || 'unknown'})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-mono">Total Paid</span>
                          <span className="font-serif text-base font-black text-gray-900">${ord.total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2">
                          {ord.status === 'delivered' && (
                            <button
                              onClick={() => {
                                setReviewModalOrder(ord);
                                setReviewRating(5);
                                setReviewComment('');
                              }}
                              className="bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              <span>Leave Review & Rating ⭐</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const headers = "Order ID,Shop Name,Delivery Address,Payment Method,Status,Date,Item Name,Quantity,Unit Price ($),Line Total ($),Grand Total ($)\n";
                              const rows = ord.items.map(item => {
                                return `"${ord.id}","${ord.shopName}","${ord.deliveryAddress.replace(/"/g, '""')}","${ord.paymentMethod}","${ord.status}","${ord.date}","${item.name}",${item.quantity},${item.price.toFixed(2)},${(item.price * item.quantity).toFixed(2)},${ord.total.toFixed(2)}`;
                              }).join("\n");
                              const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.setAttribute('href', url);
                              link.setAttribute('download', `NearMart_Receipt_${ord.id}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              addToast(`Downloaded CSV Receipt for Order #${ord.id}`, 'success');
                            }}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center space-x-1"
                            title="Download CSV Receipt"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>CSV Receipt</span>
                          </button>
                          <button
                            onClick={() => {
                              onSetTrackId(ord.id);
                              addToast(`Now tracking order: ${ord.id}`, 'info');
                            }}
                            className="bg-slate-50 border border-gray-200 hover:bg-slate-100 text-gray-800 text-xs font-bold px-4 py-2 rounded-xl transition"
                          >
                            Track Live
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* POST-DELIVERY REVIEW & RATING MODAL */}
        {reviewModalOrder && (
          <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="px-6 py-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-serif text-lg font-black text-gray-900">Leave Verified Patron Review</span>
                </div>
                <button onClick={() => setReviewModalOrder(null)} className="p-1 hover:bg-slate-200 rounded-full transition text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!reviewComment.trim()) {
                    addToast('Please write a short review before publishing.', 'error');
                    return;
                  }
                  if (onAddReview) {
                    onAddReview({
                      shopId: reviewModalOrder.shopId,
                      productId: reviewModalOrder.items[0]?.productId,
                      productName: reviewModalOrder.items[0]?.name,
                      rating: reviewRating,
                      comment: reviewComment.trim(),
                    });
                  }
                  setReviewModalOrder(null);
                }}
                className="p-6 space-y-5"
              >
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Store / Order</span>
                  <p className="text-xs font-bold text-gray-900">{reviewModalOrder.shopName} (Order #{reviewModalOrder.id})</p>
                </div>

                {/* 5 Star Rating Picker */}
                <div className="space-y-2 text-center bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl">
                  <span className="block text-xs font-bold text-amber-900 uppercase tracking-wider">Tap Stars to Rate</span>
                  <div className="flex justify-center items-center space-x-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setReviewHoverRating(star)}
                        onMouseLeave={() => setReviewHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${(reviewHoverRating || reviewRating) >= star
                              ? 'text-amber-500 fill-amber-500 drop-shadow-xs'
                              : 'text-gray-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-700 block">
                    {(reviewHoverRating || reviewRating) === 5 ? '5 ★ - Exceptional Product & Service!' :
                      (reviewHoverRating || reviewRating) === 4 ? '4 ★ - Very Good Quality!' :
                        (reviewHoverRating || reviewRating) === 3 ? '3 ★ - Good' :
                          (reviewHoverRating || reviewRating) === 2 ? '2 ★ - Fair' : '1 ★ - Poor'}
                  </span>
                </div>

                {/* Written Review */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Your Written Feedback</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Tell local neighbors about product freshness, packaging, and delivery experience..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-slate-50 text-xs text-gray-900 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  Publish Verified Review ⭐
                </button>
              </form>
            </div>
          </div>
        )}

        {/* PROFILE EDITOR VIEW */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 p-8 rounded-3xl shadow-sm">
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <label className="cursor-pointer block group">
                  <img
                    src={profileAvatar}
                    alt={state.userProfile.name}
                    className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-emerald-500/20 shadow-md group-hover:opacity-80 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              <h2 className="font-serif text-xl font-black text-gray-900 mt-4">{profileName}</h2>
              <p className="text-xs text-gray-500 mt-1">Founding Hyperlocal Patron</p>
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.querySelector('input[type="file"]') as HTMLInputElement;
                  if (inputEl) inputEl.click();
                }}
                className="mt-2.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-flex items-center space-x-1.5 transition shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload & Adjust Profile Picture</span>
              </button>
            </div>

            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Default Delivery Address</label>
                <textarea
                  rows={2}
                  required
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full bg-slate-50 text-sm text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-sm font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  Save Profile Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('nearmart_saved_user_profile');
                    if (apiClient.defaults.headers.common['Authorization']) {
                      delete apiClient.defaults.headers.common['Authorization'];
                    }
                    addToast('Logged out successfully. Browsing NearMart as Guest Patron.', 'info');
                    setActiveTab('browse');
                    if (onLogout) {
                      onLogout();
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-3 px-5 rounded-2xl text-sm font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Log Out of Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* GEMINI AI ASSISTANT & RECIPE FINDER VIEW */}
        {activeTab === 'ai_assistant' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-500/20">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center space-x-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Google Gemini AI Concierge</span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-black text-white">
                  Smart AI Shopping & Recipe Assistant
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Generate gourmet recipes from items in your basket, ask for dietary shop recommendations, or discover best budget deals in your neighborhood.
                </p>
              </div>

              {/* Cook with Cart Button */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl space-y-2 w-full md:w-auto text-center md:text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300">Basket Ingredient Fusion</span>
                <button
                  disabled={isGeneratingRecipe}
                  onClick={handleGenerateCartRecipe}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>{isGeneratingRecipe ? 'Crafting Recipe...' : '✨ Cook with Basket Items'}</span>
                </button>
              </div>
            </div>

            {/* GENERATED CHEF RECIPE DISPLAY CARD */}
            {generatedRecipe && (
              <div className="bg-white border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-md space-y-4 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                      <ChefHat className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-black text-gray-900">{generatedRecipe.title}</h3>
                      <p className="text-xs text-gray-500">Custom Recipe generated by Gemini AI</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      ⏱️ {generatedRecipe.cookingTime}
                    </span>
                    <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-xl border border-orange-200">
                      🔥 {generatedRecipe.difficulty}
                    </span>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 p-5 rounded-2xl border border-gray-200">
                  {generatedRecipe.recipeText}
                </div>
              </div>
            )}

            {/* AI CHATBOT INTERACTIVE STREAM */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-white">NearMart AI Concierge Chat</h4>
                    <p className="text-[10px] text-slate-300">Ask about recipes, gluten-free bakeries, or store items</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                  GEMINI 2.5 FLASH
                </span>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 scrollbar-thin">
                {aiChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 text-[9px] text-gray-400 mb-1 px-1 font-mono">
                      <span>{msg.sender === 'user' ? 'You' : 'Gemini AI'}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${msg.sender === 'user'
                          ? 'bg-emerald-500 text-white rounded-br-xs font-medium'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex items-center space-x-2 text-xs text-gray-400 italic bg-white border border-gray-200 p-3 rounded-2xl w-fit">
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span>Gemini AI is analyzing neighborhood products...</span>
                  </div>
                )}
              </div>

              {/* Preset Prompts Chips */}
              <div className="p-2.5 bg-emerald-50/60 border-t border-emerald-100 flex items-center space-x-2 overflow-x-auto scrollbar-none">
                {[
                  '🥖 Find gluten-free bakeries near me',
                  '🍳 What can I cook with items in my basket?',
                  '🏷️ Show top deals under $10',
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiInputText(promptText.replace(/^[^\s]+\s/, ''));
                    }}
                    className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-semibold px-3 py-1 rounded-full whitespace-nowrap transition shadow-2xs shrink-0 cursor-pointer"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendAiMessage} className="p-4 bg-white border-t border-gray-200 flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Ask Gemini AI (e.g. 'Gluten-free bakeries near me' or 'Recipe ideas')..."
                  value={aiInputText}
                  onChange={(e) => setAiInputText(e.target.value)}
                  className="flex-1 bg-slate-100 text-xs text-gray-900 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!aiInputText.trim() || isAiThinking}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-bold text-xs transition shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* SHOPPING CART FLOATING DRAWER */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/40 z-50 backdrop-blur-xs transition" onClick={() => setIsCartOpen(false)}></div>
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                <span className="font-serif text-lg font-black text-gray-900">Your Basket</span>
                <span className="bg-emerald-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {state.cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-gray-500 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content - Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cartWithDetails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 pb-12">
                  <ShoppingBag className="w-12 h-12 text-gray-300" />
                  <p className="text-sm font-bold text-gray-900">Your basket is empty</p>
                  <p className="text-xs text-gray-500 max-w-[240px]">Support our independent neighborhood growers by adding fresh products to your bag.</p>
                  <button
                    onClick={() => { setIsCartOpen(false); setActiveTab('browse'); }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartWithDetails.map((item) => {
                    const prod = item.product!;
                    return (
                      <div key={item.productId} className="flex space-x-4 bg-slate-50 border border-gray-200 p-3.5 rounded-2xl">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-bold uppercase text-emerald-600">{prod.shopName}</span>
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{prod.name}</h4>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => onUpdateCartQty(prod.id, Math.max(0, item.quantity - 1))}
                                className="w-6 h-6 bg-white border border-gray-200 hover:bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-700"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateCartQty(prod.id, item.quantity + 1)}
                                className="w-6 h-6 bg-white border border-gray-200 hover:bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-700"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs font-bold text-gray-900">${(prod.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onRemoveFromCart(prod.id);
                            addToast('Removed item.', 'info');
                          }}
                          className="text-gray-400 hover:text-rose-600 self-start p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer - Totals & Checkout Trigger */}
            {cartWithDetails.length > 0 && (
              <div className="p-5 border-t border-gray-200 bg-slate-50 space-y-4">
                {/* AI Basket Recipe Generator Button */}
                <button
                  type="button"
                  disabled={isGeneratingRecipe}
                  onClick={() => {
                    setIsCartOpen(false);
                    handleGenerateCartRecipe();
                  }}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <ChefHat className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span>✨ Generate AI Recipe from Basket</span>
                </button>

                {/* Available Coupons Quick-Apply Chips */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Available Promo Vouchers</span>
                  <div className="flex flex-wrap gap-1.5">
                    {state.coupons.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCouponInput(c.code);
                          onApplyCoupon(c.code);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${state.activeCouponCode === c.code
                            ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                            : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                          }`}
                      >
                        <Tag className="w-3 h-3" />
                        <span>{c.code} ({c.discountPercent}%)</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coupon Input Form */}
                <form onSubmit={handleApplyCouponCode} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full bg-white text-xs text-gray-900 font-bold uppercase pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <Tag className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Apply
                  </button>
                </form>

                {state.activeCouponCode && (
                  <div className="flex items-center justify-between text-xs text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl font-bold border border-orange-200">
                    <div className="flex items-center space-x-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      <span>Code ACTIVE: {state.activeCouponCode}</span>
                    </div>
                    <span>-${totals.discount.toFixed(2)}</span>
                  </div>
                )}

                {/* Pricing Summary */}
                <div className="space-y-1.5 border-b border-gray-200 pb-3">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Local Courier Delivery</span>
                    <span>${totals.deliveryFee.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-xs text-orange-600 font-bold">
                      <span>Marketplace Coupon</span>
                      <span>-${totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-sm font-black text-gray-900">
                  <span className="font-serif text-base">Grand Total</span>
                  <span className="text-lg font-serif text-emerald-600">${totals.total.toFixed(2)}</span>
                </div>

                {checkoutStep === null ? (
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-sm font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
                  >
                    <span>Proceed to Neighborhood Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-700">Hyperlocal Checkout Details</span>
                      <button onClick={() => setCheckoutStep(null)} className="text-[10px] text-gray-500 hover:text-gray-800 underline">Change Cart</button>
                    </div>

                    <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-gray-400">Delivery Street Address</label>
                        <input
                          type="text"
                          required
                          value={checkoutAddress}
                          onChange={(e) => setCheckoutAddress(e.target.value)}
                          className="w-full bg-slate-50 text-xs text-gray-900 px-3 py-2 rounded-xl border border-gray-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase text-gray-400">Secure Payment Method</label>
                        <select
                          value={checkoutPayment}
                          onChange={(e) => setCheckoutPayment(e.target.value)}
                          className="w-full bg-slate-50 text-xs text-gray-900 px-3 py-2 rounded-xl border border-gray-200"
                        >
                          <option value="card">Stripe Credit Card</option>
                          <option value="jazzcash">JazzCash Mobile Wallet</option>
                          <option value="easypaisa">Easypaisa Mobile Wallet</option>
                          <option value="cod">Cash on Delivery</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        Place Order (${totals.total.toFixed(2)})
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {/* IMAGE ADJUSTER & CROPPER MODAL */}
      {cropModalOpen && rawImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-emerald-500" />
                <h3 className="font-serif text-lg font-black text-gray-900">Adjust & Crop Profile Picture</h3>
              </div>
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setRawImage(null); }}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Crop Workspace Canvas / Preview */}
            <div
              className="relative w-64 h-64 mx-auto rounded-full border-4 border-emerald-500/50 overflow-hidden bg-slate-900 shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center group"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={rawImage}
                alt="Crop preview"
                className="absolute max-w-none transition-transform duration-75 pointer-events-none"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationDeg}deg)`,
                  width: '100%',
                }}
                draggable={false}
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"></div>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-full pointer-events-none shadow-xs">
                Drag to Reposition
              </div>
            </div>

            {/* Adjust Controls (Zoom & Rotate) */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-gray-200">
              {/* Zoom Slider */}
              <div className="flex items-center space-x-3">
                <ZoomOut className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <ZoomIn className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-mono font-bold text-gray-700 w-10 text-right">{zoomScale.toFixed(2)}x</span>
              </div>

              {/* Action buttons bar (Rotate, Reset) */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-slate-100 transition shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Rotate 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoomScale(1.0);
                    setRotationDeg(0);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="flex items-center space-x-1 text-gray-500 hover:text-gray-900 font-semibold underline text-[11px]"
                >
                  <span>Reset Adjustments</span>
                </button>
              </div>
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setCropModalOpen(false); setRawImage(null); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-gray-800 py-3 rounded-2xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedImage}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Save & Apply Picture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
