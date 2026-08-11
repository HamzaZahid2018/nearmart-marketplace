/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Shop, Order } from '../types';
import { MapPin, Navigation, Compass, Store, Home, ShieldCheck, Clock, Star, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    L: any;
  }
}

import { getCityCoords } from '../data/locationsData';

interface InteractiveMapProps {
  mode: 'discovery' | 'tracker';
  shops?: Shop[];
  order?: Order | null;
  selectedLocation?: string;
  onSelectShop?: (shop: Shop) => void;
}

export default function InteractiveMap({ mode, shops = [], order, selectedLocation = 'Gulberg III, Lahore', onSelectShop }: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const courierMarkerRef = useRef<any>(null);
  const routeCoordsRef = useRef<[[number, number], [number, number]] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  // Check for Leaflet availability
  useEffect(() => {
    const checkLeaflet = () => {
      if (window.L) {
        setMapLoaded(true);
      } else {
        setTimeout(checkLeaflet, 200);
      }
    };
    checkLeaflet();
  }, []);

  // Live courier rider progress state calculation
  useEffect(() => {
    if (mode !== 'tracker' || !order) return;

    let targetProgress = 0.1;
    if (order.status === 'pending') targetProgress = 0.1;
    else if (order.status === 'preparing') targetProgress = 0.35;
    else if (order.status === 'dispatched') targetProgress = 0.75;
    else if (order.status === 'delivered') targetProgress = 1.0;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < targetProgress) return Math.min(targetProgress, prev + 0.02);
        if (prev > targetProgress) return Math.max(targetProgress, prev - 0.02);
        return prev;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [mode, order?.status]);

  // Smoothly move courier marker without destroying/re-rendering the map!
  useEffect(() => {
    if (courierMarkerRef.current && routeCoordsRef.current && mode === 'tracker') {
      const [storeCoords, customerCoords] = routeCoordsRef.current;
      const currentLat = storeCoords[0] + (customerCoords[0] - storeCoords[0]) * progress;
      const currentLng = storeCoords[1] + (customerCoords[1] - storeCoords[1]) * progress;
      courierMarkerRef.current.setLatLng([currentLat, currentLng]);
    }
  }, [progress, mode]);

  // Smoothly fly to city center when location changes
  useEffect(() => {
    if (mapInstanceRef.current && selectedLocation) {
      const coords = getCityCoords(selectedLocation);
      mapInstanceRef.current.flyTo(coords, 13, { duration: 1.5 });
    }
  }, [selectedLocation]);

  // Initialize and update Leaflet map instance ONCE when mode/location changes
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    // Clean up previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      courierMarkerRef.current = null;
    }

    const cityCenter = getCityCoords(selectedLocation);

    if (mode === 'discovery') {
      // ----------------------------------------------------
      // DISCOVERY MODE: All Stores in Pakistan Location
      // ----------------------------------------------------
      const map = L.map(mapContainerRef.current, {
        center: cityCenter,
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const bounds = L.latLngBounds([]);

      shops.forEach((shop, index) => {
        const offsetLat = (index % 2 === 0 ? 1 : -1) * (0.005 + (index * 0.003));
        const offsetLng = (index % 3 === 0 ? 1 : -1) * (0.004 + (index * 0.003));
        const coords: [number, number] = [cityCenter[0] + offsetLat, cityCenter[1] + offsetLng];
        bounds.extend(coords);

        const customIcon = L.divIcon({
          className: 'custom-shop-pin-wrapper',
          html: `
            <div class="shop-pin-bubble">
              <div class="pin-icon">🏬</div>
              <div class="pin-label">${shop.name}</div>
            </div>
          `,
          iconSize: [120, 44],
          iconAnchor: [60, 44],
        });

        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 max-w-xs space-y-2';
        popupContent.innerHTML = `
          <div class="h-24 rounded-xl overflow-hidden mb-2 relative">
            <img src="${shop.banner}" alt="${shop.name}" class="w-full h-full object-cover"/>
            <span class="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase">${shop.category}</span>
          </div>
          <h4 class="font-serif font-bold text-sm text-gray-900 leading-tight">${shop.name}</h4>
          <p class="text-[11px] text-gray-500 line-clamp-2">${shop.description}</p>
          <div class="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
            <span class="font-bold text-orange-500 flex items-center gap-1">★ ${shop.rating}</span>
            <span class="text-gray-400">${shop.deliveryTime}</span>
          </div>
          <button id="popup-shop-btn-${shop.id}" class="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 rounded-xl transition shadow-xs">
            Visit Shop
          </button>
        `;

        const marker = L.marker(coords, { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-shop-btn-${shop.id}`);
          if (btn && onSelectShop) {
            btn.onclick = () => onSelectShop(shop);
          }
        });
      });

      if (shops.length > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapInstanceRef.current = map;
    } else if (mode === 'tracker' && order) {
      // ----------------------------------------------------
      // TRACKER MODE: Live Route & Telemetry in Pakistan
      // ----------------------------------------------------
      const storeCoords: [number, number] = [cityCenter[0] + 0.005, cityCenter[1] - 0.004];
      const customerCoords: [number, number] = [cityCenter[0] - 0.008, cityCenter[1] + 0.006];
      routeCoordsRef.current = [storeCoords, customerCoords];

      const map = L.map(mapContainerRef.current, {
        center: storeCoords,
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Store Marker (Start)
      const storeIcon = L.divIcon({
        className: 'custom-tracker-pin',
        html: `<div class="tracker-bubble store"><span class="icon">🏬</span><span class="title">${order.shopName}</span></div>`,
        iconSize: [110, 40],
        iconAnchor: [55, 40],
      });
      L.marker(storeCoords, { icon: storeIcon }).addTo(map).bindPopup(`<b>Store:</b> ${order.shopName}`);

      // Customer Marker (End)
      const customerIcon = L.divIcon({
        className: 'custom-tracker-pin',
        html: `<div class="tracker-bubble home"><span class="icon">🏠</span><span class="title">Destination</span></div>`,
        iconSize: [110, 40],
        iconAnchor: [55, 40],
      });
      L.marker(customerCoords, { icon: customerIcon }).addTo(map).bindPopup(`<b>Delivery Address:</b> ${order.deliveryAddress}`);

      // Polyline Route Path
      const polylinePoints = [
        storeCoords,
        [storeCoords[0] - 0.005, storeCoords[1] - 0.004] as [number, number],
        [storeCoords[0] - 0.010, storeCoords[1] - 0.008] as [number, number],
        customerCoords,
      ];

      L.polyline(polylinePoints, {
        color: '#10b981',
        weight: 5,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(map);

      // Initial Courier Position
      const currentLat = storeCoords[0] + (customerCoords[0] - storeCoords[0]) * progress;
      const currentLng = storeCoords[1] + (customerCoords[1] - storeCoords[1]) * progress;
      const courierCoords: [number, number] = [currentLat, currentLng];

      const courierIcon = L.divIcon({
        className: 'custom-courier-pin',
        html: `<div class="courier-badge"><span class="pulse"></span>🛵 <span class="rider-text">Hyperlocal Courier</span></div>`,
        iconSize: [130, 42],
        iconAnchor: [65, 42],
      });

      courierMarkerRef.current = L.marker(courierCoords, { icon: courierIcon }).addTo(map);

      const routeBounds = L.latLngBounds([storeCoords, customerCoords]);
      map.fitBounds(routeBounds, { padding: [50, 50] });

      mapInstanceRef.current = map;
    }

    // Invalidate size on container resize or tab switch to prevent map shaking/flicker
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const timeout = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        courierMarkerRef.current = null;
      }
    };
  }, [mapLoaded, mode, selectedLocation, shops.length, order?.id]);

  return (
    <div className="relative w-full h-[450px] rounded-3xl overflow-hidden border border-gray-200 shadow-md bg-slate-100">
      {/* CSS Styles for Leaflet Custom Markers */}
      <style>{`
        .custom-shop-pin-wrapper {
          background: transparent;
          border: none;
        }
        .shop-pin-bubble {
          background: #059669;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
          border: 2px solid white;
          transition: transform 0.2s ease;
          font-family: inherit;
        }
        .shop-pin-bubble:hover {
          transform: scale(1.08);
          background: #047857;
        }
        .pin-label {
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pin-icon {
          font-size: 14px;
        }
        .custom-tracker-pin {
          background: transparent;
        }
        .tracker-bubble {
          padding: 4px 10px;
          border-radius: 16px;
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 2px solid white;
        }
        .tracker-bubble.store {
          background: #0f172a;
        }
        .tracker-bubble.home {
          background: #f97316;
        }
        .custom-courier-pin {
          background: transparent;
        }
        .courier-badge {
          background: #10b981;
          color: white;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
          border: 2px solid white;
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .courier-badge .pulse {
          width: 8px;
          height: 8px;
          background: #34d399;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7);
          animation: pulse-ring 1.5s infinite;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
          100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }
      `}</style>

      {/* Map Element Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Telemetry Bar Overlay for Tracker Mode */}
      {mode === 'tracker' && order && (
        <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/60 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">Live Telemetry Feed</span>
              <span className="text-xs font-bold text-emerald-400">
                Courier En Route ({(progress * 100).toFixed(0)}% Completed)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs">
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Distance Remaining</span>
              <span className="font-mono font-bold text-white">
                {((1 - progress) * 1.2).toFixed(1)} miles
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Avg Speed</span>
              <span className="font-mono font-bold text-white">18 mph</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block">Estimated Delivery</span>
              <span className="font-mono font-bold text-emerald-400">12 min</span>
            </div>
          </div>
        </div>
      )}

      {/* Fallback loading indicator if Leaflet script loading */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-900 text-white flex flex-col items-center justify-center space-y-3">
          <Compass className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs font-bold tracking-wider">Loading OpenStreetMap Engine...</span>
        </div>
      )}
    </div>
  );
}
