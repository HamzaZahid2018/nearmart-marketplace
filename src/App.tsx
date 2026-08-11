/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_STATE } from './data';
import { AppState, ViewRole, Product, Shop, Order, Coupon, CartItem, ChatMessage, ChatSession, Review } from './types';
import Header from './components/Header';
import CustomerView from './components/CustomerView';
import ShopOwnerView from './components/ShopOwnerView';
import AdminView from './components/AdminView';
import LiveChatWidget from './components/LiveChatWidget';
import AuthModal from './components/AuthModal';
import LandingView from './components/LandingView';
import { ShieldAlert, Sparkles, X, Info, CheckCircle2 } from 'lucide-react';
import {
  authService,
  shopService,
  productService,
  promotionService,
  cartService,
  orderService,
  interactionService,
  adminService,
  notificationService
} from './api/services';
import apiClient from './api/client';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [state, setState] = useState<AppState>(() => {
    const savedRole = (localStorage.getItem('userRole') as ViewRole) || 'customer';
    return {
      ...INITIAL_STATE,
      role: savedRole,
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const handleOpenAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  // Helper to update state locally
  const setAndSyncState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.role) {
        localStorage.setItem('userRole', next.role);
      }
      return next;
    });
  }, []);

  // Toast notifications array state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  // Toast Helper
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Function to dynamically log in the appropriate user based on the selected role and sync status
  const ensureAuthAndSyncState = async (targetRole: ViewRole) => {
    let role = targetRole;

    const existingToken = getAuthToken();
    if (existingToken) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
      try {
        const userProf = await authService.getProfile();
        if (userProf && userProf.role) {
          let userRole: ViewRole = userProf.role as any;
          if (userRole === ('merchant' as any)) userRole = 'owner';
          role = userRole;
          localStorage.setItem('userRole', role);
        }
      } catch (e) {
        console.warn('Failed to validate stored auth token:', e);
        removeAuthToken();
      }
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }

    // 2. Fetch relevant user-specific data from Django backend
    try {
      const [shops, products, coupons] = await Promise.all([
        shopService.list(),
        productService.list(),
        promotionService.coupons.list()
      ]);

      let cart: CartItem[] = [];
      let orders: Order[] = [];
      let users: any[] = [];
      let notifications: any[] = [];
      let wishlist: string[] = [];
      let userProfile = state.userProfile;
      let ownerStoreId: string | undefined;

      // Only fetch protected user endpoints if user is currently authenticated
      const validToken = getAuthToken();
      if (validToken) {
        if (role === 'customer') {
          try {
            const [activeCart, wishlistItems, custOrders, profile, notifs] = await Promise.all([
              cartService.getActive().catch(() => null),
              interactionService.wishlist.list().catch(() => []),
              orderService.list().catch(() => []),
              authService.getProfile().catch(() => null),
              notificationService.list().catch(() => [])
            ]);

            if (notifs) notifications = notifs;
            if (custOrders) orders = custOrders;
            if (activeCart && activeCart.items) {
              cart = activeCart.items.map((item: any) => ({
                productId: String(item.product),
                quantity: item.quantity
              }));
            }
            if (wishlistItems) {
              const list = wishlistItems.results || wishlistItems || [];
              wishlist = list.map((w: any) => String(w.product));
            }
            if (profile) {
              userProfile = {
                name: `${profile.first_name || profile.username || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Valued Patron',
                email: profile.email || 'customer@nearmart.com',
                phone: profile.phone_number || '(555) 019-2831',
                address: 'Greenpoint, Brooklyn',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
              };
            }
          } catch (custErr) {
            console.warn('Failed to fetch customer data:', custErr);
          }
        } else if (role === 'owner') {
          try {
            const [merchantOrders, profile, notifs] = await Promise.all([
              orderService.list().catch(() => []),
              authService.getProfile().catch(() => null),
              notificationService.list().catch(() => [])
            ]);
            if (merchantOrders) orders = merchantOrders;
            if (notifs) notifications = notifs;

            if (profile) {
              const merchantUsername = profile.username || '';
              const ownedShop = shops.find((s: any) => s.ownerName === merchantUsername);
              if (ownedShop) ownerStoreId = ownedShop.id;

              userProfile = {
                name: `${profile.first_name || profile.username || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Shop Owner',
                email: profile.email || 'merchant@nearmart.com',
                phone: profile.phone_number || '(555) 321-4820',
                address: 'Williamsburg, Brooklyn',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
              };
            }
          } catch (profErr) {
            console.warn('Failed to fetch merchant profile:', profErr);
          }
        } else if (role === 'admin') {
          try {
            const [profile, adminUsers, adminOrders, notifs] = await Promise.all([
              authService.getProfile().catch(() => null),
              adminService.listUsers().catch(() => []),
              orderService.list().catch(() => []),
              notificationService.list().catch(() => [])
            ]);
            if (adminUsers) users = adminUsers;
            if (adminOrders) orders = adminOrders;
            if (notifs) notifications = notifs;
            if (profile) {
              userProfile = {
                name: `${profile.first_name || profile.username || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Platform Admin',
                email: profile.email || 'admin@nearmart.com',
                phone: profile.phone_number || '(555) 999-9999',
                address: 'HQ, Manhattan',
                avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
              };
            }
          } catch (profErr) {
            console.warn('Failed to fetch admin profile:', profErr);
          }
        }
      }

      // Check if user has a custom saved profile in localStorage
      try {
        const storedProfile = localStorage.getItem('nearmart_saved_user_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed && (parsed.avatar || parsed.name)) {
            userProfile = {
              ...userProfile,
              ...parsed,
            };
          }
        }
      } catch (e) { }

      setState((prev) => ({
        ...prev,
        shops,
        products,
        coupons,
        cart,
        orders,
        users,
        notifications,
        wishlist,
        userProfile,
        role,
        ...(ownerStoreId ? { ownerStoreId } : {})
      }));

    } catch (err) {
      console.error('Could not sync with backend:', err);
      setState((prev) => ({
        ...prev,
        role
      }));
    }
  };

  // Load state and authenticate from backend on mount, restoring saved local profile & chat sessions
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem('nearmart_saved_user_profile');
      const storedChats = localStorage.getItem('nearmart_chat_sessions');
      let restoredProfile = null;
      let restoredChats = null;

      if (storedProfile) restoredProfile = JSON.parse(storedProfile);
      if (storedChats) restoredChats = JSON.parse(storedChats);

      setAndSyncState((prev) => ({
        ...prev,
        userProfile: restoredProfile ? { ...prev.userProfile, ...restoredProfile } : prev.userProfile,
        chatSessions: restoredChats ? restoredChats : prev.chatSessions,
      }));
    } catch (e) { }

    const activeSavedRole = (localStorage.getItem('userRole') as ViewRole) || 'customer';
    ensureAuthAndSyncState(activeSavedRole);
  }, []);

  // Real-time Chat Handlers
  const handleSendChatMessage = (shopId: string, text: string, senderRole: 'customer' | 'owner') => {
    const shop = state.shops.find((s) => s.id === shopId);
    const shopName = shop?.name || 'Local Merchant';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      shopId,
      senderRole,
      senderName: senderRole === 'customer' ? state.userProfile.name : `${shop?.ownerName || 'Merchant'} (${shopName})`,
      text,
      timestamp: now,
    };

    setAndSyncState((prev) => {
      const existingSession = prev.chatSessions[shopId] || {
        shopId,
        shopName,
        unreadCountCustomer: 0,
        unreadCountMerchant: 0,
        messages: [],
      };

      const updatedSession: ChatSession = {
        ...existingSession,
        unreadCountCustomer: senderRole === 'owner' ? existingSession.unreadCountCustomer + 1 : existingSession.unreadCountCustomer,
        unreadCountMerchant: senderRole === 'customer' ? existingSession.unreadCountMerchant + 1 : existingSession.unreadCountMerchant,
        messages: [...existingSession.messages, newMessage],
      };

      const updatedSessions = {
        ...prev.chatSessions,
        [shopId]: updatedSession,
      };

      try {
        localStorage.setItem('nearmart_chat_sessions', JSON.stringify(updatedSessions));
      } catch (e) { }

      return {
        ...prev,
        chatSessions: updatedSessions,
      };
    });
  };

  const handleMarkChatRead = (shopId: string, role: 'customer' | 'owner') => {
    setAndSyncState((prev) => {
      const sess = prev.chatSessions[shopId];
      if (!sess) return prev;

      const updatedSession: ChatSession = {
        ...sess,
        unreadCountCustomer: role === 'customer' ? 0 : sess.unreadCountCustomer,
        unreadCountMerchant: role === 'owner' ? 0 : sess.unreadCountMerchant,
      };

      const updatedSessions = {
        ...prev.chatSessions,
        [shopId]: updatedSession,
      };

      try {
        localStorage.setItem('nearmart_chat_sessions', JSON.stringify(updatedSessions));
      } catch (e) { }

      return {
        ...prev,
        chatSessions: updatedSessions,
      };
    });
  };

  // Role is now set ONLY through authentication — no free switching allowed.
  // handleChangeRole has been removed to enforce role-based access control.

  const handleSearch = useCallback((searchQuery: string) => {
    setAndSyncState((prev) => ({ ...prev, searchQuery }));
  }, [setAndSyncState]);

  const handleSelectCategory = (selectedCategory: string) => {
    setAndSyncState((prev) => ({ ...prev, selectedCategory }));
  };

  const handleSelectLocation = (selectedLocation: string) => {
    setAndSyncState((prev) => ({ ...prev, selectedLocation }));
    addToast(`Location set to: ${selectedLocation}`, 'success');
  };

  const handleAddToCart = useCallback(async (productId: string) => {
    // Optimistic local state update
    setAndSyncState((prev) => {
      const existing = prev.cart.find((item) => item.productId === productId);
      let updatedCart;
      if (existing) {
        updatedCart = prev.cart.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedCart = [...prev.cart, { productId, quantity: 1 }];
      }
      return { ...prev, cart: updatedCart };
    });

    try {
      await cartService.addItem(productId, 1);
    } catch (err) {
      console.error('Failed to sync item add to cart on Django backend:', err);
    }
  }, [setAndSyncState]);

  const handleRemoveFromCart = async (productId: string) => {
    setAndSyncState((prev) => ({
      ...prev,
      cart: prev.cart.filter((item) => item.productId !== productId),
    }));

    try {
      await cartService.removeItem(productId);
    } catch (err) {
      console.error('Failed to sync item removal from cart on Django backend:', err);
    }
  };

  const handleUpdateCartQty = async (productId: string, quantity: number) => {
    setAndSyncState((prev) => {
      if (quantity <= 0) {
        return {
          ...prev,
          cart: prev.cart.filter((item) => item.productId !== productId),
        };
      }
      return {
        ...prev,
        cart: prev.cart.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        ),
      };
    });

    try {
      if (quantity <= 0) {
        await cartService.removeItem(productId);
      } else {
        await cartService.addItem(productId, quantity);
      }
    } catch (err) {
      console.error('Failed to update cart item quantity on Django backend:', err);
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    const exists = state.wishlist.includes(productId);
    setAndSyncState((prev) => {
      const updatedWishlist = exists
        ? prev.wishlist.filter((id) => id !== productId)
        : [...prev.wishlist, productId];
      return { ...prev, wishlist: updatedWishlist };
    });

    try {
      if (exists) {
        await interactionService.wishlist.remove(productId);
      } else {
        await interactionService.wishlist.add(productId);
      }
    } catch (err) {
      console.error('Failed to toggle item wishlist on Django backend:', err);
    }
  };

  const handleApplyCoupon = async (code: string | null) => {
    setAndSyncState((prev) => ({ ...prev, activeCouponCode: code }));
    try {
      await cartService.applyCoupon(code);
    } catch (err) {
      console.error('Failed to apply coupon on Django backend:', err);
    }
  };

  const handlePlaceOrder = async (details: { address: string; payment: string }) => {
    const itemsPayload = state.cart.map(i => ({ product: i.productId, quantity: i.quantity }));
    let order: Order;

    try {
      order = await cartService.checkout(details.address, details.payment, itemsPayload);
    } catch (err: any) {
      console.warn('Backend checkout fallback to local order placement:', err.message);

      const firstProdId = state.cart[0]?.productId;
      const firstProduct = state.products.find(p => p.id === firstProdId) || state.products[0];
      const shopName = firstProduct ? firstProduct.shopName : 'Neighborhood Market';
      const shopId = firstProduct ? firstProduct.shopId : 'shop-1';

      const cartItemsDetailed = state.cart.map(i => {
        const prod = state.products.find(p => p.id === i.productId);
        return {
          productId: i.productId,
          name: prod ? prod.name : 'Local Product',
          quantity: i.quantity,
          price: prod ? prod.price : 10.00,
          image: prod ? prod.image : '',
        };
      });

      const subtotal = cartItemsDetailed.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryFee = subtotal > 0 ? 3.50 : 0;
      let discount = 0;
      if (state.activeCouponCode) {
        const coup = state.coupons.find(c => c.code === state.activeCouponCode);
        if (coup && subtotal >= coup.minSpend) {
          discount = Math.round((subtotal * (coup.discountPercent / 100)) * 100) / 100;
        }
      }
      const total = Math.max(0, Math.round((subtotal + deliveryFee - discount) * 100) / 100);
      const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      order = {
        id: orderId,
        shopId: shopId,
        shopName: shopName,
        customerName: state.userProfile.name || 'Valued Patron',
        customerEmail: state.userProfile.email || 'customer@nearmart.com',
        items: cartItemsDetailed,
        subtotal,
        deliveryFee,
        discount,
        total,
        status: 'pending',
        date: new Date().toISOString(),
        deliveryAddress: details.address || state.userProfile.address || 'Standard Hand Delivery',
        paymentMethod: details.payment || 'card',
        paymentStatus: details.payment === 'cod' ? 'pending' : 'success',
        paymentProvider: details.payment === 'card' ? 'Stripe' : details.payment === 'jazzcash' ? 'JazzCash' : details.payment === 'easypaisa' ? 'Easypaisa' : 'COD',
        timeline: [
          { status: 'pending', title: 'Order Placed', desc: `Received by ${shopName}`, date: 'Just now', completed: true },
          { status: 'preparing', title: 'Preparing Order', desc: 'Sourcing ingredients and items', date: 'Pending', completed: false },
          { status: 'dispatched', title: 'Dispatched', desc: 'Courier heading your way', date: 'Pending', completed: false },
          { status: 'delivered', title: 'Delivered', desc: 'Arrived safely', date: 'Pending', completed: false },
        ]
      };
    }

    setAndSyncState((prev) => ({
      ...prev,
      orders: [order, ...prev.orders],
      cart: [],
      activeCouponCode: null,
      activeOrderTrackId: order.id
    }));
    addToast(`Order #${order.id} successfully placed!`, 'success');
    return order;
  };

  const handleVerifyPayment = async (orderId: string) => {
    try {
      const updatedOrder = await orderService.verifyPayment(orderId);
      setAndSyncState((prev) => ({
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? updatedOrder : o)
      }));
    } catch (err: any) {
      console.warn('Backend payment verify fallback:', err.message);
    }
  };

  const handleRefundPayment = async (orderId: string) => {
    try {
      const updatedOrder = await orderService.refundPayment(orderId);
      setAndSyncState((prev) => ({
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? updatedOrder : o)
      }));
    } catch (err: any) {
      console.warn('Backend refund fallback:', err.message);
    }
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'shopId' | 'shopName' | 'rating' | 'reviewCount' | 'salesCount'>) => {
    const defaultShop = state.shops.find(s => s.id === 'shop-1') || state.shops[0] || { id: 'shop-1', name: 'Sourdough & Co.' };
    const newId = `prod-local-${Date.now()}`;
    const newProduct: Product = {
      id: newId,
      shopId: defaultShop.id,
      shopName: defaultShop.name,
      category: productData.category,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      image: productData.image,
      inventory: productData.inventory,
      rating: 5.0,
      reviewCount: 0,
      salesCount: 0,
      tags: productData.tags || ['Fresh'],
      deliveryTime: '20-30 min',
    };

    setAndSyncState((prev) => ({ ...prev, products: [newProduct, ...prev.products] }));
    addToast(`Product '${productData.name}' added to inventory!`, 'success');

    try {
      await productService.create({
        name: productData.name,
        price: productData.price,
        description: productData.description,
        image_url: productData.image,
        category_name: productData.category,
        quantity: productData.inventory || 100
      });
    } catch (err: any) {
      console.warn('Backend product create fallback:', err.message);
    }
  };

  const handleAddReview = async (reviewData: { shopId: string; productId?: string; productName?: string; rating: number; comment: string }) => {
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      shopId: reviewData.shopId,
      productId: reviewData.productId,
      productName: reviewData.productName,
      author: state.userProfile.name || 'Valued Patron',
      avatar: state.userProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
      rating: reviewData.rating,
      comment: reviewData.comment,
      date: new Date().toISOString().split('T')[0],
    };

    setAndSyncState((prev) => {
      const updatedShops = prev.shops.map((s) => {
        if (s.id === reviewData.shopId) {
          const newReviewCount = s.reviewCount + 1;
          const newAvgRating = parseFloat(
            ((s.rating * s.reviewCount + reviewData.rating) / newReviewCount).toFixed(1)
          );
          return {
            ...s,
            rating: newAvgRating,
            reviewCount: newReviewCount,
          };
        }
        return s;
      });

      return {
        ...prev,
        shops: updatedShops,
        reviews: [newReview, ...prev.reviews],
      };
    });

    addToast('Thank you! Your verified patron review has been published.', 'success');

    try {
      await interactionService.reviews.create({
        shop: reviewData.shopId,
        product: reviewData.productId,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
    } catch (err: any) {
      console.warn('Backend review submission fallback:', err.message);
    }
  };

  const handleUpdateInventory = async (productId: string, qty: number) => {
    setAndSyncState((prev) => ({
      ...prev,
      products: prev.products.map(p => p.id === productId ? { ...p, inventory: qty } : p)
    }));
    addToast('Inventory count updated.', 'success');

    try {
      await productService.updateInventory(productId, qty);
    } catch (err: any) {
      console.warn('Backend inventory update fallback:', err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    // Status progression for timeline rebuild
    const statusValues = ['pending', 'preparing', 'dispatched', 'delivered', 'cancelled'];
    const currentStatusIndex = statusValues.indexOf(status);
    const timelineSteps = [
      { status: 'pending',    title: 'Order Placed',     desc: 'Received by store' },
      { status: 'preparing',  title: 'Preparing Order',  desc: 'Sourcing ingredients and items' },
      { status: 'dispatched', title: 'Dispatched',       desc: 'Courier heading your way' },
      { status: 'delivered',  title: 'Delivered',        desc: 'Arrived safely' },
    ];

    // Optimistic update: rebuild FULL timeline so customer sees correct steps immediately
    setAndSyncState((prev) => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id !== orderId) return o;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedTimeline = (o.timeline || timelineSteps).map((step: any, idx: number) => ({
          ...step,
          completed: status !== 'cancelled' && currentStatusIndex >= idx,
          date: status !== 'cancelled' && currentStatusIndex >= idx ? now : 'Pending',
        }));
        return { ...o, status, timeline: updatedTimeline };
      })
    }));
    addToast(`Order status advanced to ${status.toUpperCase()}`, 'success');

    // Sync to Django backend and replace local order with server truth (real timestamps)
    try {
      const updatedOrder = await orderService.updateStatus(orderId, status);
      if (updatedOrder) {
        setAndSyncState((prev) => ({
          ...prev,
          orders: prev.orders.map(o => o.id === orderId ? updatedOrder : o)
        }));
      }
    } catch (err: any) {
      console.warn('Backend order status fallback:', err.message);
    }
  };

  const handleUpdateShopProfile = async (shopId: string, profile: Partial<Shop>) => {
    setAndSyncState((prev) => ({
      ...prev,
      shops: prev.shops.map(s => s.id === shopId ? { ...s, ...profile } : s)
    }));
    addToast('Merchant profile updated.', 'success');

    try {
      await shopService.update(shopId, {
        name: profile.name,
        description: profile.description,
        category: profile.category,
        image: profile.logo
      });
    } catch (err: any) {
      console.warn('Backend shop update fallback:', err.message);
    }
  };

  const handleApproveVendor = async (shopId: string) => {
    // 1. Optimistic state update: INSTANTLY approve vendor in UI
    setAndSyncState((prev) => ({
      ...prev,
      shops: prev.shops.map(s => s.id === shopId ? { ...s, approved: true, verified: true } : s)
    }));
    addToast('Merchant approved and granted platform listing access!', 'success');

    // 2. Sync to backend asynchronously
    try {
      await shopService.approve(shopId);
    } catch (err: any) {
      console.warn('Backend approve vendor fallback:', err.message);
    }
  };

  const handleAddCoupon = async (couponData: Omit<Coupon, 'id' | 'active'>) => {
    const newCoupon: Coupon = {
      id: `coup-local-${Date.now()}`,
      code: couponData.code,
      discountPercent: couponData.discountPercent,
      minSpend: couponData.minSpend,
      description: couponData.description,
      active: true,
      expiryDate: couponData.expiryDate,
    };
    setAndSyncState((prev) => ({ ...prev, coupons: [newCoupon, ...prev.coupons] }));
    addToast(`Coupon '${couponData.code}' issued successfully!`, 'success');

    try {
      await promotionService.coupons.create({
        code: couponData.code,
        discount_percent: couponData.discountPercent,
        min_spend: couponData.minSpend,
        description: couponData.description,
        active: true
      });
    } catch (err: any) {
      console.warn('Backend add coupon fallback:', err.message);
    }
  };

  const handleUpdateProfile = async (profile: any) => {
    const updatedProfile = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      avatar: profile.avatar || state.userProfile.avatar,
    };

    setAndSyncState((prev) => ({
      ...prev,
      userProfile: updatedProfile,
    }));

    try {
      localStorage.setItem('nearmart_saved_user_profile', JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn('Could not save user profile to localStorage:', e);
    }

    addToast('Customer profile settings saved.', 'success');

    try {
      await authService.updateProfile({
        name: profile.name,
        email: profile.email,
        phone_number: profile.phone,
        address: profile.address
      });
    } catch (err: any) {
      console.warn('Backend profile update fallback:', err.message);
    }
  };

  const handleToggleUserBlock = async (userId: string) => {
    let newStatus = false;
    setAndSyncState((prev) => ({
      ...prev,
      users: prev.users.map(u => {
        if (u.id === userId) {
          newStatus = !u.isActive;
          return { ...u, isActive: newStatus };
        }
        return u;
      })
    }));
    addToast(`User account status updated successfully.`, 'success');

    try {
      await adminService.toggleUserBlock(userId);
    } catch (err: any) {
      console.warn('Backend user block fallback:', err.message);
    }
  };


  const handleMarkNotificationRead = async (id: string) => {
    try {
      const updated = await notificationService.markRead(id);
      setAndSyncState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? updated : n)),
      }));
    } catch (err: any) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationService.markAllRead();
      setAndSyncState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (err: any) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 selection:bg-emerald-500/20 font-sans text-gray-900">

      {/* Platform Level Global Header Switcher */}
      <Header
        state={state}
        onSearch={handleSearch}
        onSelectCategory={handleSelectCategory}
        onOpenCart={() => {
          if (state.role !== 'customer') return;
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('open-cart-drawer'));
          }, 50);
        }}
        onOpenWishlist={() => {
          if (state.role !== 'customer') return;
          const tabBtn = document.getElementById('cat-chip-all');
          if (tabBtn) tabBtn.click();
          addToast('Navigating to saved Wishlist catalog', 'info');
        }}
        onOpenProfile={() => {
          if (state.role !== 'customer') return;
          setTimeout(() => {
            document.dispatchEvent(new CustomEvent('open-profile-tab'));
          }, 50);
          addToast('Navigating to your customer profile', 'info');
        }}
        onOpenAuthModal={(mode = 'login') => handleOpenAuthModal(mode)}
        isAuthenticated={!!localStorage.getItem('authToken')}
        onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('nearmart_saved_user_profile');
          if (apiClient.defaults.headers.common['Authorization']) {
            delete apiClient.defaults.headers.common['Authorization'];
          }
          addToast('Logged out successfully. Browsing NearMart as Guest Patron.', 'info');
          setIsAuthModalOpen(false);
          setState(prev => ({ ...prev, role: 'customer' }));
        }}
        onSelectLocation={handleSelectLocation}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Core View Router */}
      <div className="flex-1">
        {!localStorage.getItem('authToken') ? (
          <LandingView onOpenAuthModal={(mode = 'login') => handleOpenAuthModal(mode)} />
        ) : (
          <>
            {state.role === 'customer' && (
              <CustomerView
                state={state}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onUpdateCartQty={handleUpdateCartQty}
                onToggleWishlist={handleToggleWishlist}
                onApplyCoupon={handleApplyCoupon}
                onPlaceOrder={handlePlaceOrder}
                onVerifyPayment={handleVerifyPayment}
                onSetSelectedCategory={handleSelectCategory}
                onSetTrackId={(id) => setState((prev) => ({ ...prev, activeOrderTrackId: id }))}
                onUpdateProfile={handleUpdateProfile}
                onAddReview={handleAddReview}
                addToast={addToast}
                onSearch={handleSearch}
                onLogout={() => {
                  handleOpenAuthModal('login');
                }}
                isAuthenticated={!!localStorage.getItem('authToken')}
                onOpenAuthModal={(mode = 'login') => handleOpenAuthModal(mode)}
              />
            )}

            {state.role === 'owner' && (
              <ShopOwnerView
                state={state}
                onAddProduct={handleAddProduct}
                onUpdateInventory={handleUpdateInventory}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onRefundPayment={handleRefundPayment}
                onUpdateShopProfile={handleUpdateShopProfile}
                onAddCoupon={handleAddCoupon}
                addToast={addToast}
              />
            )}

            {state.role === 'admin' && (
              <AdminView
                state={state}
                onApproveVendor={handleApproveVendor}
                onAddCoupon={handleAddCoupon}
                onUpdatePlatformSettings={() => { }}
                onToggleUserBlock={handleToggleUserBlock}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                addToast={addToast}
              />
            )}
          </>
        )}
      </div>

      {/* FOOTER (Only when authenticated) */}
      {localStorage.getItem('authToken') && (
        <footer className="bg-white border-t border-gray-200 py-10 text-xs text-gray-500 font-medium">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3 text-left">
              <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-serif font-black text-base flex items-center justify-center shadow-xs">N</span>
              <div>
                <p className="font-bold text-gray-900 font-serif text-sm">NearMart Marketplace</p>
                <p className="text-[11px] text-gray-500">Authentic sustainable neighborhood commerce.</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-gray-600 font-semibold">
              <button onClick={() => addToast('Hyperlocal delivery terms are restricted to a 3-mile radius.', 'info')} className="hover:underline hover:text-gray-900">Delivery Radius Limit</button>
              <button onClick={() => addToast('All vendors are inspected and vetted prior to approval.', 'info')} className="hover:underline hover:text-gray-900">Seller Integrity Code</button>
              <button onClick={() => addToast('Hyperlocal transactions are fully secure.', 'info')} className="hover:underline hover:text-gray-900">Patron Security Policy</button>
            </div>
          </div>
        </footer>
      )}

      {/* Floating Real-time Customer-Merchant Live Chat Widget (Only when logged in) */}
      {localStorage.getItem('authToken') && (
        <LiveChatWidget
          shops={state.shops}
          chatSessions={state.chatSessions}
          activeRole={state.role}
          userName={state.userProfile.name}
          onSendMessage={handleSendChatMessage}
          onMarkRead={handleMarkChatRead}
        />
      )}

      {/* DJANGO JWT/TOKEN AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user, token, role) => {
          setState(prev => ({
            ...prev,
            role,
            userProfile: {
              ...prev.userProfile,
              name: `${user.first_name || user.username || ''} ${user.last_name || ''}`.trim(),
              email: user.email || prev.userProfile.email,
              phone: user.phone_number || prev.userProfile.phone,
            }
          }));
          ensureAuthAndSyncState(role).catch(err => console.warn('Sync post auth:', err));
        }}
        addToast={addToast}
      />

      {/* DYNAMIC TOASTS PORTAL */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 pointer-events-auto max-w-sm backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200 ${t.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500/60 shadow-emerald-600/20'
                : t.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-500/60'
                  : 'bg-orange-500 text-white border-orange-400/60 shadow-orange-500/20'
              }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            ) : t.type === 'error' ? (
              <ShieldAlert className="w-5 h-5 text-white shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-white shrink-0" />
            )}
            <p className="text-xs font-semibold leading-tight flex-1">{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

