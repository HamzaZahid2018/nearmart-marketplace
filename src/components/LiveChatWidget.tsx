/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Phone, Store, ShieldCheck, CheckCheck, Sparkles, ChevronDown, Move, GripVertical } from 'lucide-react';
import { Shop, ChatSession, ViewRole } from '../types';

interface LiveChatWidgetProps {
  shops: Shop[];
  chatSessions: Record<string, ChatSession>;
  activeRole: ViewRole;
  userName: string;
  onSendMessage: (shopId: string, text: string, senderRole: 'customer' | 'owner') => void;
  onMarkRead: (shopId: string, role: 'customer' | 'owner') => void;
}

export default function LiveChatWidget({
  shops,
  chatSessions,
  activeRole,
  userName,
  onSendMessage,
  onMarkRead,
}: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0]?.id || 'shop-1');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Position state for dragging
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initialX = Math.max(16, window.innerWidth - 240);
    const initialY = Math.max(16, window.innerHeight - 80);
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const hasDraggedRef = useRef(false);

  // Handle Drag Start
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: position.x,
      startY: position.y,
    };
    hasDraggedRef.current = false;
    setIsDragging(true);
  };

  // Drag Motion Effect Listener
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        hasDraggedRef.current = true;
      }

      const widgetWidth = isOpen ? 380 : 210;
      const widgetHeight = isOpen ? 530 : 60;

      const newX = Math.min(Math.max(10, dragStartRef.current.startX + deltaX), window.innerWidth - widgetWidth);
      const newY = Math.min(Math.max(10, dragStartRef.current.startY + deltaY), window.innerHeight - widgetHeight);

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isOpen]);

  // Auto-clamp and adjust position on open or resize so chat panel is 100% visible on screen
  useEffect(() => {
    const handleAdjust = () => {
      const panelWidth = isOpen ? 384 : 220;
      const panelHeight = isOpen ? 540 : 70;

      setPosition((prev) => {
        const maxX = Math.max(10, window.innerWidth - panelWidth - 16);
        const maxY = Math.max(10, window.innerHeight - panelHeight - 16);

        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };

    handleAdjust();
    window.addEventListener('resize', handleAdjust);
    return () => window.removeEventListener('resize', handleAdjust);
  }, [isOpen]);

  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];
  const activeSession = chatSessions[selectedShopId] || {
    shopId: selectedShopId,
    shopName: activeShop?.name || 'Local Merchant',
    unreadCountCustomer: 0,
    unreadCountMerchant: 0,
    messages: [],
  };

  // Total unread messages count
  const totalUnread = Object.values(chatSessions).reduce((acc, sess) => {
    return acc + (activeRole === 'customer' ? sess.unreadCountCustomer : sess.unreadCountMerchant);
  }, 0);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      onMarkRead(selectedShopId, activeRole === 'owner' ? 'owner' : 'customer');
    }
  }, [isOpen, activeSession.messages.length, selectedShopId, activeRole, onMarkRead]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeShop) return;

    const senderRole = activeRole === 'owner' ? 'owner' : 'customer';
    onSendMessage(activeShop.id, inputText.trim(), senderRole);
    setInputText('');
  };

  const quickPrompts = [
    'Ask about stock availability',
    'Delivery time to my area',
    'Store opening hours',
    'Custom bulk order inquiry',
    'Accepted payment options',
  ];

  const handlePromptClick = (promptText: string) => {
    if (!activeShop) return;
    onSendMessage(activeShop.id, promptText, 'customer');
  };

  return (
    <>
      {/* Floating Action Button (FAB) Launcher — Closed State */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-14 h-14 bg-emerald-800 hover:bg-emerald-900 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center border-2 border-white/20 cursor-pointer group"
          title="Open Merchant Live Chat"
          aria-label="Open Merchant Live Chat"
        >
          <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />

          {/* Unread Counter Badge */}
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
              {totalUnread}
            </span>
          )}
        </button>
      )}      {/* Open Floating Live Chat Panel */}
      {isOpen && (
        <div
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          className={`fixed z-50 font-sans select-none w-88 sm:w-96 h-[540px] bg-[#FAF8F5] dark:bg-slate-900 border border-[#E5DFD5] dark:border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDragging ? 'ring-4 ring-emerald-800/30' : ''
          }`}
        >
          {/* Header Bar (Dark Stone Background, No Overlaps, Clean Hierarchy) */}
          <div
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            className={`bg-stone-900 text-white p-3.5 px-4 flex items-center justify-between gap-2 shadow-xs shrink-0 z-20 ${
              isDragging ? 'cursor-grabbing bg-stone-950' : 'cursor-grab'
            }`}
            title={isDragging ? "Repositioning chat panel..." : undefined}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <GripVertical className="w-4 h-4 text-stone-400 shrink-0 opacity-80" />

              {/* Store Avatar Logo */}
              <div className="relative shrink-0">
                <img
                  src={activeShop?.logo}
                  alt={activeShop?.name}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-500/40"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-stone-900 rounded-full"></span>
              </div>

              <div className="min-w-0">
                {/* Shop Selector Dropdown */}
                <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="bg-transparent text-white text-xs font-serif font-bold focus:outline-none cursor-pointer pr-5 appearance-none truncate max-w-[170px]"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id} className="text-stone-900 font-sans">
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 absolute right-0 pointer-events-none" />
                </div>

                {/* Single Clean Line: Status & Verification */}
                <div className="text-[10px] text-stone-400 flex items-center space-x-2 mt-0.5 font-medium">
                  <span className="text-emerald-400 font-semibold">• Online</span>
                  <span className="text-stone-600">•</span>
                  <span className="text-stone-300 font-mono truncate">{activeShop?.category}</span>
                  {activeShop?.verified && (
                    <span className="flex items-center space-x-0.5 text-emerald-400 font-medium shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestion Pills (Equal Height & Clean Spacing) */}
          {activeRole === 'customer' && (
            <div className="bg-white dark:bg-slate-900 border-b border-[#E5DFD5] dark:border-slate-800 px-3 py-2 flex items-center space-x-1.5 overflow-x-auto scrollbar-none shrink-0 z-10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0 animate-pulse" />
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="bg-[#FAF8F5] dark:bg-slate-800 hover:bg-stone-200/70 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 border border-[#E5DFD5] dark:border-slate-700 hover:border-emerald-800 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FAF8F5] dark:bg-slate-950 scrollbar-thin select-text">
            {activeSession.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-stone-400">
                <div className="w-12 h-12 rounded-full bg-emerald-800/10 text-emerald-800 flex items-center justify-center mb-1">
                  <Store className="w-6 h-6 text-emerald-800" />
                </div>
                <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-white">Merchant Live Messaging</h5>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs font-normal">
                  Ask {activeShop?.ownerName || 'the store owner'} about stock availability, custom orders, or delivery times.
                </p>
              </div>
            ) : (
              activeSession.messages.map((msg) => {
                const isMe =
                  (activeRole === 'customer' && msg.senderRole === 'customer') ||
                  (activeRole === 'owner' && msg.senderRole === 'owner');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-stone-400 font-mono">
                      <span>{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-700 inline ml-0.5" />}
                    </div>

                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-emerald-800 text-white rounded-br-xs font-medium'
                          : 'bg-white dark:bg-slate-800 text-stone-900 dark:text-stone-100 border border-[#E5DFD5] dark:border-slate-700 rounded-bl-xs font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Bar */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-[#E5DFD5] dark:border-slate-800 flex items-center space-x-2 shrink-0">
            <input
              type="text"
              placeholder={`Message ${activeShop?.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-stone-100 dark:bg-slate-800 text-xs text-stone-900 dark:text-stone-100 px-4 py-2.5 rounded-full border border-[#E5DFD5] dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-800/15 focus:border-emerald-800 select-text"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
              aria-label="Send Message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
