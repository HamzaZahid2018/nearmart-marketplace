import apiClient from './client';
import { Shop, Product, Order, Coupon, CartItem, Review, User, Notification } from '../types';

// ============================================================================
// RESPONSE MAPPERS (Django model schema -> Frontend expected types)
// ============================================================================

export const mapShop = (djangoShop: any): Shop => ({
  id: String(djangoShop.id),
  name: djangoShop.name || '',
  description: djangoShop.description || '',
  rating: parseFloat(djangoShop.rating) || 5.0,
  reviewCount: djangoShop.review_count || 0,
  logo: djangoShop.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=150',
  banner: djangoShop.image || 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&q=80&w=1200',
  category: djangoShop.category || 'General',
  distance: `${djangoShop.delivery_range_km || '0.5'} miles`,
  deliveryTime: '20-30 min',
  minimumOrder: 10,
  address: 'Hyperlocal Local Delivery',
  verified: djangoShop.verified || false,
  approved: djangoShop.approved || false,
  ownerName: djangoShop.owner_username || 'Merchant Partner',
  ownerEmail: 'owner@nearmart.com',
  phone: '(555) 321-4820',
  revenue: parseFloat(djangoShop.revenue) || 0.0,
  joinedDate: djangoShop.created_at ? djangoShop.created_at.split('T')[0] : '2026-01-01',
});

export const mapUser = (djangoUser: any): User => ({
  id: String(djangoUser.id),
  username: djangoUser.username || '',
  email: djangoUser.email || '',
  firstName: djangoUser.first_name || '',
  lastName: djangoUser.last_name || '',
  role: djangoUser.role || 'customer',
  phoneNumber: djangoUser.phone_number || '',
  isActive: djangoUser.is_active !== undefined ? djangoUser.is_active : true,
  dateJoined: djangoUser.date_joined || new Date().toISOString(),
});

export const mapNotification = (djangoNotif: any): Notification => ({
  id: String(djangoNotif.id),
  title: djangoNotif.title,
  message: djangoNotif.message,
  isRead: djangoNotif.is_read,
  type: djangoNotif.notification_type,
  createdAt: djangoNotif.created_at,
});

export const mapProduct = (djangoProd: any): Product => {
  const images = djangoProd.images || [];
  const primaryImage = images.find((img: any) => img.is_primary)?.image_url || 
                       (images.length > 0 ? images[0].image_url : null) || 
                       djangoProd.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600';

  return {
    id: String(djangoProd.id),
    shopId: String(djangoProd.shop),
    shopName: djangoProd.shop_name || '',
    name: djangoProd.name || '',
    description: djangoProd.description || '',
    price: parseFloat(djangoProd.price) || 0.0,
    originalPrice: djangoProd.price ? parseFloat(djangoProd.price) * 1.1 : undefined,
    rating: parseFloat(djangoProd.rating) || 5.0,
    reviewCount: djangoProd.review_count || 0,
    image: primaryImage,
    category: djangoProd.category_name || 'Grocery',
    inventory: djangoProd.inventory ? djangoProd.inventory.quantity : 0,
    salesCount: djangoProd.sales_count || 0,
    tags: [djangoProd.category_name || 'Grocery', djangoProd.unit || 'units'],
    isTrending: (djangoProd.sales_count || 0) > 5,
    isFeatured: (djangoProd.rating || 0) >= 4.8,
    deliveryTime: '20-30 min',
  };
};

export const mapOrder = (djangoOrder: any): Order => {
  const timelineSteps = [
    { status: 'pending', title: 'Order Placed', desc: 'Received by ' + (djangoOrder.shop_name || 'store'), date: 'Just now', completed: true },
    { status: 'preparing', title: 'Preparing Order', desc: 'Sourcing ingredients and items', date: 'Pending', completed: false },
    { status: 'dispatched', title: 'Dispatched', desc: 'Courier heading your way', date: 'Pending', completed: false },
    { status: 'delivered', title: 'Delivered', desc: 'Arrived safely', date: 'Pending', completed: false },
  ];

  const logs = djangoOrder.timeline_logs || {};
  const statusValues = ['pending', 'preparing', 'dispatched', 'delivered', 'cancelled'];
  const currentStatusIndex = statusValues.indexOf(djangoOrder.status || 'pending');

  const updatedTimeline = timelineSteps.map((step, idx) => {
    const logTime = logs[step.status];
    const completed = currentStatusIndex >= idx && djangoOrder.status !== 'cancelled';
    let dateStr = 'Pending';
    if (logTime) {
      dateStr = new Date(logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (completed) {
      dateStr = 'Just now';
    }
    return {
      ...step,
      completed,
      date: dateStr,
    };
  });

  return {
    id: String(djangoOrder.id),
    shopId: String(djangoOrder.shop),
    shopName: djangoOrder.shop_name || '',
    customerName: djangoOrder.customer_username || 'Valued Patron',
    customerEmail: 'customer@nearmart.com',
    items: (djangoOrder.items || []).map((item: any) => ({
      productId: String(item.product),
      name: item.name || '',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0.0,
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    })),
    subtotal: parseFloat(djangoOrder.subtotal) || 0.0,
    deliveryFee: parseFloat(djangoOrder.delivery_fee) || 0.0,
    discount: parseFloat(djangoOrder.discount) || 0.0,
    total: parseFloat(djangoOrder.total) || 0.0,
    status: djangoOrder.status || 'pending',
    date: djangoOrder.created_at || new Date().toISOString(),
    deliveryAddress: djangoOrder.frozen_address_text || 'Standard Hand Delivery',
    paymentMethod: djangoOrder.payment_method || 'cod',
    paymentStatus: djangoOrder.payment?.status || 'pending',
    paymentProvider: djangoOrder.payment?.provider || 'COD',
    paymentTransactionId: djangoOrder.payment?.transaction_id || '',
    gatewayRedirectUrl: djangoOrder.payment?.gateway_response?.redirect_url || '',
    timeline: updatedTimeline,
  };
};

export const mapCoupon = (djangoCoupon: any): Coupon => ({
  id: String(djangoCoupon.id),
  code: djangoCoupon.code || '',
  discountPercent: djangoCoupon.discount_percent || 0,
  description: djangoCoupon.description || '',
  minSpend: parseFloat(djangoCoupon.min_spend) || 0.0,
  active: djangoCoupon.active || false,
  expiryDate: djangoCoupon.end_date || '',
});

// ============================================================================
// API SERVICES
// ============================================================================

export const authService = {
  register: async (data: any) => {
    const res = await apiClient.post('/users/auth/register/', data);
    return res.data;
  },
  login: async (credentials: any) => {
    const res = await apiClient.post('/users/auth/login/', credentials);
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/users/auth/profile/');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await apiClient.put('/users/auth/profile/', data);
    return res.data;
  },
  addresses: {
    list: async () => {
      const res = await apiClient.get('/users/addresses/');
      return res.data.results || res.data;
    },
    create: async (data: any) => {
      const res = await apiClient.post('/users/addresses/', data);
      return res.data;
    },
    delete: async (id: string) => {
      const res = await apiClient.delete(`/users/addresses/${id}/`);
      return res.data;
    },
  },
};

export const adminService = {
  listUsers: async () => {
    const res = await apiClient.get('/users/users/');
    const list = res.data.results || res.data;
    return list.map(mapUser);
  },
  toggleUserBlock: async (id: string) => {
    const res = await apiClient.post(`/users/users/${id}/toggle_block/`);
    return mapUser(res.data);
  },
};

export const notificationService = {
  list: async () => {
    const res = await apiClient.get('/interactions/notifications/');
    const list = res.data.results || res.data;
    return list.map(mapNotification);
  },
  markRead: async (id: string) => {
    const res = await apiClient.post(`/interactions/notifications/${id}/mark_read/`);
    return mapNotification(res.data);
  },
  markAllRead: async () => {
    const res = await apiClient.post('/interactions/notifications/mark_all_read/');
    return res.data;
  },
};

export const shopService = {
  list: async () => {
    const res = await apiClient.get('/shops/');
    // Handle both paginated results and plain lists
    const list = res.data.results || res.data;
    return list.map(mapShop);
  },
  create: async (data: any) => {
    const res = await apiClient.post('/shops/', data);
    return mapShop(res.data);
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.put(`/shops/${id}/`, data);
    return mapShop(res.data);
  },
  approve: async (id: string) => {
    const res = await apiClient.post(`/shops/${id}/approve/`);
    return res.data;
  },
};

export const productService = {
  list: async (params?: any) => {
    const res = await apiClient.get('/products/', { params });
    const list = res.data.results || res.data;
    return list.map(mapProduct);
  },
  create: async (data: any) => {
    const res = await apiClient.post('/products/', data);
    return mapProduct(res.data);
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.put(`/products/${id}/`, data);
    return mapProduct(res.data);
  },
  updateInventory: async (id: string, qty: number) => {
    const res = await apiClient.put(`/products/${id}/inventory/`, { quantity: qty });
    return mapProduct(res.data);
  },
};

export const promotionService = {
  coupons: {
    list: async () => {
      const res = await apiClient.get('/promotions/coupons/');
      const list = res.data.results || res.data;
      return list.map(mapCoupon);
    },
    create: async (data: any) => {
      const res = await apiClient.post('/promotions/coupons/', data);
      return mapCoupon(res.data);
    },
    validate: async (code: string, amount: number) => {
      const res = await apiClient.post('/promotions/coupons/validate_code/', { code, amount });
      return res.data;
    },
  },
};

export const cartService = {
  getActive: async () => {
    const res = await apiClient.get('/orders/cart/active/');
    return res.data;
  },
  addItem: async (productId: string, quantity: number) => {
    const res = await apiClient.post('/orders/cart/add_item/', { product: productId, quantity });
    return res.data;
  },
  removeItem: async (productId: string, quantity?: number) => {
    const res = await apiClient.post('/orders/cart/remove_item/', { product: productId, quantity });
    return res.data;
  },
  applyCoupon: async (code: string | null) => {
    const res = await apiClient.post('/orders/cart/apply_coupon/', { code });
    return res.data;
  },
  checkout: async (addressId: string, paymentMethod: string, items?: any[]) => {
    const res = await apiClient.post('/orders/cart/checkout/', { address: addressId, payment_method: paymentMethod, items });
    return mapOrder(res.data);
  },
};

export const orderService = {
  list: async () => {
    const res = await apiClient.get('/orders/orders/');
    const list = res.data.results || res.data;
    return list.map(mapOrder);
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.post(`/orders/orders/${id}/update_status/`, { status });
    return mapOrder(res.data);
  },
  cancel: async (id: string) => {
    const res = await apiClient.post(`/orders/orders/${id}/cancel/`);
    return mapOrder(res.data);
  },
  verifyPayment: async (id: string) => {
    const res = await apiClient.post(`/orders/orders/${id}/verify_payment/`);
    return mapOrder(res.data);
  },
  refundPayment: async (id: string) => {
    const res = await apiClient.post(`/orders/orders/${id}/refund_payment/`);
    return mapOrder(res.data);
  },
};

export const interactionService = {
  reviews: {
    list: async (params?: any) => {
      const res = await apiClient.get('/interactions/reviews/', { params });
      return res.data.results || res.data;
    },
    create: async (data: any) => {
      const res = await apiClient.post('/interactions/reviews/', data);
      return res.data;
    },
  },
  wishlist: {
    list: async () => {
      const res = await apiClient.get('/interactions/wishlist/');
      return res.data.results || res.data;
    },
    add: async (productId: string) => {
      const res = await apiClient.post('/interactions/wishlist/', { product: productId });
      return res.data;
    },
    remove: async (productId: string) => {
      await apiClient.post('/interactions/wishlist/remove_product/', { product: productId });
    },
  },
  notifications: {
    list: async () => {
      const res = await apiClient.get('/interactions/notifications/');
      return res.data.results || res.data;
    },
    markAllRead: async () => {
      const res = await apiClient.post('/interactions/notifications/mark_all_read/');
      return res.data;
    },
  },
};
