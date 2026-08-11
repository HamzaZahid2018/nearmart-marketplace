/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Shop {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  logo: string;
  banner: string;
  category: string;
  distance: string; // e.g., "0.4 miles"
  deliveryTime: string; // e.g., "15-25 min"
  minimumOrder: number;
  address: string;
  verified: boolean;
  approved: boolean; // For Admin dashboard to approve new vendors
  ownerName: string;
  ownerEmail: string;
  phone: string;
  revenue: number;
  joinedDate: string;
}

export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // For discount display
  rating: number;
  reviewCount: number;
  image: string;
  category: string;
  inventory: number;
  salesCount: number;
  tags: string[];
  isTrending?: boolean;
  isFeatured?: boolean;
  deliveryTime?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface OrderTimelineStep {
  status: string;
  title: string;
  desc: string;
  date: string;
  completed: boolean;
}

export interface Order {
  id: string;
  shopId: string;
  shopName: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: 'pending' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled';
  date: string;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus?: 'pending' | 'success' | 'failed' | 'refunded';
  paymentProvider?: string;
  paymentTransactionId?: string;
  gatewayRedirectUrl?: string;
  timeline: OrderTimelineStep[];
}

export interface Review {
  id: string;
  shopId: string;
  productId?: string;
  productName?: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  description: string;
  minSpend: number;
  active: boolean;
  expiryDate: string;
}

export type ViewRole = 'customer' | 'owner' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  isActive: boolean;
  dateJoined: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface ChatMessage {
  id: string;
  senderRole: 'customer' | 'owner';
  senderName: string;
  text: string;
  timestamp: string;
  orderId?: string;
  shopId: string;
}

export interface ChatSession {
  shopId: string;
  shopName: string;
  unreadCountCustomer: number;
  unreadCountMerchant: number;
  messages: ChatMessage[];
}

export interface AppState {
  role: ViewRole;
  shops: Shop[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  coupons: Coupon[];
  users: User[];
  notifications: Notification[];
  cart: CartItem[];
  wishlist: string[]; // Product IDs
  activeCouponCode: string | null;
  selectedLocation: string;
  selectedCategory: string;
  searchQuery: string;
  activeOrderTrackId: string | null; // For tracking a specific order
  userProfile: {
    name: string;
    email: string;
    phone: string;
    address: string;
    avatar: string;
  };
  ownerStoreId: string; // The store ID owned by the simulated shop owner
  chatSessions: Record<string, ChatSession>; // Keyed by shopId
}
