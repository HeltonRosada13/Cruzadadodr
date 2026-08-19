'use client';

import React, { useState, useEffect } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { MessageCircle, X, Send, Sparkles, CheckCheck } from 'lucide-react';

export function WhatsAppFloating() {
  const { data } = useChurch();
  const [isOpen, setIsOpen] = useState(false);
  const [userMsg, setUserMsg] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Show gentle teaser tooltip after 4 seconds
    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const whatsappCleanNumber = data.whatsappNumber.replace(/\D/g, '');

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const finalMsg = userMsg.trim() || data.whatsappMessage;
    const url = `https://wa.me/${whatsappCleanNumber}?text=${encodeURIComponent(finalMsg)}`;
    window.open(url, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Quick Interactive Chat Dialog Bubble */}
      {isOpen && (
        <div
          id="whatsapp-chat-popup"
          className="w-80 sm:w-96 mb-4 bg-white rounded-sm border border-neutral-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-[#1A1A1A] p-4 text-white flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                <MessageCircle className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider leading-tight">Atendimento Catedral</h4>
                <p className="text-[10px] text-[#C5A059] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online • Canal Oficial
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-sm hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-neutral-50 space-y-3 max-h-60 overflow-y-auto">
            <div className="bg-white border border-neutral-200 rounded-sm p-3.5 text-xs text-neutral-700 shadow-sm font-light">
              <p className="font-semibold text-neutral-900 mb-1">
                Paz seja convosco! 🙏
              </p>
              <p className="leading-relaxed">
                Bem-vindo ao canal de atendimento da <strong>Igreja Catedral de Amor e Fé</strong>.
                Como podemos ajudar hoje? Você pode tirar dúvidas sobre a atividade, pedir oração ou saber como participar!
              </p>
              <span className="text-[9px] text-neutral-400 block text-right mt-1.5 flex items-center justify-end gap-1">
                Hoje <CheckCheck className="w-3 h-3 text-emerald-600 inline" />
              </span>
            </div>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2">
            <input
              type="text"
              value={userMsg}
              onChange={(e) => setUserMsg(e.target.value)}
              placeholder="Escreva sua mensagem aqui..."
              className="flex-1 px-3.5 py-2.5 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#C5A059]"
            />
            <button
              type="submit"
              className="p-2.5 rounded-sm bg-[#1A1A1A] hover:bg-[#C5A059] text-white font-bold transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Prompt Pill (shown if popup is closed) */}
      {!isOpen && showTooltip && (
        <div
          onClick={() => {
            setShowTooltip(false);
            setIsOpen(true);
          }}
          className="hidden sm:flex items-center gap-2 mb-3 px-3.5 py-2 rounded-sm bg-white border border-neutral-200 text-xs text-neutral-800 shadow-lg cursor-pointer hover:border-[#C5A059] transition-all"
        >
          <Sparkles className="w-3 h-3 text-[#C5A059]" />
          <span className="text-[11px] font-light">Fale com a nossa equipe no WhatsApp</span>
          <X
            className="w-3 h-3 text-neutral-400 hover:text-neutral-800 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
          />
        </div>
      )}

      {/* Main Floating Button */}
      <button
        id="btn-floating-whatsapp"
        onClick={() => {
          setShowTooltip(false);
          setIsOpen(!isOpen);
        }}
        aria-label="Falar Conosco no WhatsApp"
        className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#1A1A1A] hover:bg-[#C5A059] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-neutral-700 cursor-pointer"
      >
        <div className="relative">
          <MessageCircle className="w-4 h-4 fill-current text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold">
          Falar Conosco
        </span>
      </button>
    </div>
  );
}
