/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ArrowRight, Star, Clock, MapPin, CheckCircle2, ChevronRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { INITIAL_SHOPS, INITIAL_PRODUCTS } from '../data';

interface LandingViewProps {
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
}

const CATEGORY_SHOWCASE = [
  {
    name: 'Artisan Bakery',
    count: '42 Items',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Organic Produce',
    count: '65 Items',
    image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Specialty Coffee',
    count: '28 Items',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Handcrafted Goods',
    count: '34 Items',
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Pantry Provisions',
    count: '50 Items',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
  },
  {
    name: 'Fresh Dairy & Eggs',
    count: '38 Items',
    image: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&q=80&w=800',
  },
];

const VALUE_PROPOSITIONS = [
  {
    title: 'Direct Store Connections',
    desc: 'Order directly from neighborhood bakeries, regional farms, and local coffee roasters without middleman distribution centers.',
  },
  {
    title: '30-Minute Local Express',
    desc: 'Nearby couriers handle delivery straight from store to door, ensuring fragile baked goods and produce arrive fresh.',
  },
  {
    title: 'Fair Merchant Economy',
    desc: 'Low commission structure designed to keep over 95% of every transaction dollar directly within your local community.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Fatima Khan',
    role: 'Customer · Greenpoint',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    text: 'NearMart makes it simple to order naturally fermented sourdough and fresh milk from independent stores down the block.',
  },
  {
    name: 'Marcus Solis',
    role: 'Merchant · East River Organics',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    text: 'Listing our daily harvest on NearMart opened a direct channel to neighborhood families. Order management is simple and transparent.',
  },
  {
    name: 'Zara Malik',
    role: 'Customer · Cobble Hill',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    text: 'The quality of single-origin coffee and hand-poured candles from local artisans is fantastic. Clean design and effortless checkout.',
  },
];

export default function LandingView({ onOpenAuthModal }: LandingViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const featuredShops = INITIAL_SHOPS.filter(s => s.approved);
  const featuredProducts = INITIAL_PRODUCTS.slice(0, 4);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenAuthModal('login');
  };

  return (
    <div className="landing-page-root min-h-screen bg-[#FAF8F5] text-stone-900 selection:bg-emerald-100 selection:text-emerald-900">

      {/* ===== STICKY NAVIGATION ===== */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E5DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onOpenAuthModal('login')}>
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-serif font-black flex items-center justify-center text-lg shadow-sm">
              N
            </div>
            <div>
              <span className="font-serif font-black text-stone-900 text-2xl tracking-tight">
                Near<span className="text-emerald-800">Mart</span>
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-stone-700">
            <a href="#stores" className="hover:text-emerald-800 transition-colors">Browse Stores</a>
            <a href="#categories" className="hover:text-emerald-800 transition-colors">Categories</a>
            <a href="#about" className="hover:text-emerald-800 transition-colors">Why NearMart</a>
            <a href="#merchants" className="hover:text-emerald-800 transition-colors">Sell With Us</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuthModal('login')}
              className="text-stone-700 hover:text-emerald-800 font-medium text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuthModal('register')}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION (Balanced 2-Column Editorial Layout) ===== */}
      <section className="pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[#E5DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Copy, Search, CTAs */}
            <div className="lg:col-span-7 space-y-7">
              <div className="space-y-4">
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black text-stone-900 leading-[1.1] tracking-tight">
                  Every local store in your city.{' '}
                  <span className="text-emerald-800">Delivered to your door.</span>
                </h1>
                <p className="text-base sm:text-lg text-stone-600 max-w-xl font-normal leading-relaxed">
                  Discover fresh sourdough, organic fruits and vegetables, single-origin coffee, and handmade products directly from independent merchants near you.
                </p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="max-w-xl bg-white p-2 rounded-2xl border border-[#E5DFD5] shadow-sm flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center space-x-3 px-3 py-2 flex-1 w-full">
                  <Search className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sourdough, organic eggs, roasted coffee..."
                    className="w-full bg-transparent text-stone-900 placeholder:text-stone-400 text-sm font-normal focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm px-6 py-3 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Find Stores</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm px-7 py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Explore Local Marketplace</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-sm px-7 py-3.5 rounded-xl border border-[#E5DFD5] transition-colors cursor-pointer text-center"
                >
                  List Your Business
                </button>
              </div>

              <p className="text-xs text-stone-500 font-normal">
                Direct ordering from independent bakeries, farms, roasters, and local shops.
              </p>
            </div>

            {/* Right Column: Multi-Category Local Merchant Collage Visual */}
            <div className="lg:col-span-5 relative">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                
                {/* Image 1: Artisan Bakery & Café */}
                <div className="col-span-1 bg-white rounded-2xl border border-[#E5DFD5] shadow-xs overflow-hidden group flex flex-col">
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-stone-200">
                    <img
                      src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600"
                      alt="Artisan bakery and fresh sourdough"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  </div>
                  <div className="p-3 bg-white border-t border-[#E5DFD5] flex-1 flex flex-col justify-center">
                    <span className="text-xs font-bold text-stone-900 font-serif block truncate">Artisan Bakery</span>
                    <span className="text-[10px] text-emerald-800 font-medium mt-0.5">Fresh Daily</span>
                  </div>
                </div>

                {/* Image 2: Local Florist & Botanicals */}
                <div className="col-span-1 bg-white rounded-2xl border border-[#E5DFD5] shadow-xs overflow-hidden group flex flex-col">
                  <div className="relative h-44 sm:h-48 overflow-hidden bg-stone-200">
                    <img
                      src="https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&q=80&w=600"
                      alt="Local florist and fresh flower bouquet"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  </div>
                  <div className="p-3 bg-white border-t border-[#E5DFD5] flex-1 flex flex-col justify-center">
                    <span className="text-xs font-bold text-stone-900 font-serif block truncate">Local Florists</span>
                    <span className="text-[10px] text-stone-500 font-normal mt-0.5">Handcrafted</span>
                  </div>
                </div>

                {/* Image 3: Organic Produce & Specialty Grocery */}
                <div className="col-span-2 bg-white rounded-2xl border border-[#E5DFD5] shadow-xs overflow-hidden group flex flex-col">
                  <div className="relative h-40 sm:h-44 overflow-hidden bg-stone-200">
                    <img
                      src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=800"
                      alt="Organic market produce and fresh vegetables"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                  </div>
                  <div className="p-3 bg-white border-t border-[#E5DFD5] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 font-serif block">Organic Produce & Grocery</span>
                      <span className="text-[10px] text-stone-500 font-normal">Sourced from regional farms & neighborhood markets</span>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">
                      Verified Stores
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== CATEGORIES (Image-Based Cards) ===== */}
      <section id="categories" className="py-20 border-b border-[#E5DFD5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-stone-900">Explore Categories</h2>
              <p className="text-sm text-stone-500 mt-1">Browse authentic items sourced directly from nearby store inventories.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {CATEGORY_SHOWCASE.map((cat) => (
              <div
                key={cat.name}
                onClick={() => onOpenAuthModal('login')}
                className="group relative rounded-2xl overflow-hidden border border-[#E5DFD5] bg-stone-100 cursor-pointer h-52 flex flex-col justify-end p-4 transition-all hover:shadow-md"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent pointer-events-none" />
                <div className="relative z-10 text-white">
                  <h3 className="font-serif font-bold text-base leading-snug">{cat.name}</h3>
                  <p className="text-xs text-stone-300 font-normal mt-0.5">{cat.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED STORES ===== */}
      <section id="stores" className="py-20 border-b border-[#E5DFD5] bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-stone-900">Featured Neighborhood Merchants</h2>
              <p className="text-sm text-stone-500 mt-1">Verified local storefronts delivering in your area.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredShops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => onOpenAuthModal('login')}
                className="group bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-stone-200">
                    <img
                      src={shop.banner}
                      alt={shop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-stone-900 flex items-center space-x-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{shop.rating}</span>
                      <span className="text-stone-400 font-normal">({shop.reviewCount})</span>
                    </div>
                    {shop.verified && (
                      <div className="absolute top-3 left-3 bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-emerald-800">{shop.category}</span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{shop.distance}</span>
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-stone-900 group-hover:text-emerald-800 transition-colors">
                      {shop.name}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-normal">
                      {shop.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-[#E5DFD5] flex items-center justify-between text-xs text-stone-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>{shop.deliveryTime}</span>
                  </span>
                  <span className="font-medium text-stone-700">Min. ${shop.minimumOrder}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRENDING PRODUCTS ===== */}
      <section className="py-20 border-b border-[#E5DFD5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-black text-stone-900">Popular Local Products</h2>
              <p className="text-sm text-stone-500 mt-1">Freshly prepared and harvested items available today.</p>
            </div>
            <button
              onClick={() => onOpenAuthModal('login')}
              className="text-emerald-800 hover:text-emerald-900 font-medium text-sm flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => onOpenAuthModal('login')}
                className="group bg-[#FAF8F5] rounded-2xl border border-[#E5DFD5] overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-stone-200">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2.5 py-1 rounded-md">
                      {product.category}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-emerald-800">{product.shopName}</span>
                      <span className="flex items-center space-x-1 text-amber-600 font-semibold">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{product.rating}</span>
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {product.name}
                    </h4>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-normal">
                      {product.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-between">
                  <span className="font-serif text-lg font-bold text-stone-900">${product.price.toFixed(2)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAuthModal('login');
                    }}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EDITORIAL VALUE PROPOSITIONS ===== */}
      <section id="about" className="py-20 border-b border-[#E5DFD5] bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-stone-900">Why Shop via NearMart</h2>
            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
              We combine modern commerce software with local neighborhood business relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {VALUE_PROPOSITIONS.map((item) => (
              <div key={item.title} className="bg-white p-8 rounded-2xl border border-[#E5DFD5] space-y-3">
                <h3 className="font-serif font-bold text-lg text-stone-900">{item.title}</h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS (Real Human Photography) ===== */}
      <section className="py-20 border-b border-[#E5DFD5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-black text-stone-900">Customer & Merchant Experiences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-[#FAF8F5] p-7 rounded-2xl border border-[#E5DFD5] space-y-4 flex flex-col justify-between">
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal italic">
                  "{t.text}"
                </p>

                <div className="flex items-center space-x-3 pt-4 border-t border-[#E5DFD5]">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{t.name}</h4>
                    <p className="text-xs text-stone-500 font-normal">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== MERCHANT ONBOARDING SECTION ===== */}
      <section id="merchants" className="py-20 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <h2 className="font-serif text-3xl sm:text-4xl font-black text-white leading-tight">
                Bring your store online with NearMart.
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
                Get a digital storefront for your local shop, manage real-time inventory, receive instant order notifications, and connect directly with neighborhood buyers.
              </p>
              
              <ul className="space-y-3 pt-2">
                {[
                  'Simple online onboarding for local shops',
                  'Instant order notification queue for store staff',
                  'Direct neighborhood customer chat support'
                ].map(item => (
                  <li key={item} className="flex items-center space-x-3 text-sm text-stone-200 font-normal">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-3">
                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm px-8 py-3.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <span>List Your Store</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Real Merchant Photograph Visual */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-stone-700 bg-stone-800">
                <img
                  src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=800"
                  alt="Local store merchant managing bakery storefront"
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== FINAL CALL TO ACTION ===== */}
      <section className="py-20 bg-[#FAF8F5] text-center border-b border-[#E5DFD5]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-black text-stone-900 leading-tight">
            Discover the best local stores in your city.
          </h2>
          <p className="text-stone-600 text-sm sm:text-base max-w-xl mx-auto font-normal">
            Create your account today to start supporting independent neighborhood bakeries, organic growers, and local artisans.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuthModal('register')}
              className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm px-8 py-3.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Create Free Account
            </button>
            <button
              onClick={() => onOpenAuthModal('login')}
              className="w-full sm:w-auto bg-white hover:bg-stone-100 text-stone-800 font-medium text-sm px-8 py-3.5 rounded-xl border border-[#E5DFD5] transition-colors cursor-pointer"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

      {/* ===== MODERN FOOTER ===== */}
      <footer className="py-12 bg-stone-950 text-stone-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
            <div className="space-y-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-serif font-black flex items-center justify-center text-base">
                  N
                </div>
                <span className="font-serif font-black text-white text-xl">Near<span className="text-emerald-400">Mart</span></span>
              </div>
              <p className="text-stone-400 text-xs leading-relaxed font-normal">
                Connecting buyers directly with verified independent neighborhood storefronts.
              </p>
            </div>

            <div>
              <h4 className="font-serif font-bold text-white text-sm mb-3">Marketplace</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onOpenAuthModal('login')} className="hover:text-white transition-colors">Browse Stores</button></li>
                <li><button onClick={() => onOpenAuthModal('login')} className="hover:text-white transition-colors">Categories</button></li>
                <li><button onClick={() => onOpenAuthModal('login')} className="hover:text-white transition-colors">Fresh Produce</button></li>
                <li><button onClick={() => onOpenAuthModal('login')} className="hover:text-white transition-colors">Artisan Bakery</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-white text-sm mb-3">For Merchants</h4>
              <ul className="space-y-2">
                <li><button onClick={() => onOpenAuthModal('register')} className="hover:text-white transition-colors">List Your Store</button></li>
                <li><button onClick={() => onOpenAuthModal('login')} className="hover:text-white transition-colors">Merchant Sign In</button></li>
                <li><button onClick={() => onOpenAuthModal('register')} className="hover:text-white transition-colors">Store Requirements</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif font-bold text-white text-sm mb-3">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-white transition-colors">Why NearMart</a></li>
                <li><span className="text-stone-500">Privacy Policy</span></li>
                <li><span className="text-stone-500">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-stone-500 font-normal">
            <p>© 2026 NearMart Marketplace Inc. All rights reserved.</p>
            <p>Designed for independent neighborhood commerce.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
