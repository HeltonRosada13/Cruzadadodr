'use client';

import React, { useState, useEffect } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { 
  Church, 
  Menu, 
  X, 
  Settings, 
  Calendar, 
  Image as ImageIcon, 
  Video, 
  Share2, 
  PhoneCall, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export function Navbar() {
  const { data, setIsAdminOpen } = useChurch();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Início', href: '#inicio' },
    { label: 'Sobre', href: '#sobre' },
    { label: 'Atividades', href: '#atividades' },
    { label: 'Galeria', href: '#fotos' },
    { label: 'Vídeos', href: '#videos' },
    { label: 'Redes', href: '#redes-sociais' },
    { label: 'Contacto', href: '#contacto' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-200/80 py-3.5 shadow-sm'
          : 'bg-[#FDFDFC]/90 backdrop-blur-sm border-b border-neutral-100 py-4.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo / Church Title in Editorial Hierarchy */}
        <a
          href="#inicio"
          id="navbar-logo-link"
          className="flex items-center gap-3 group text-left"
        >
          <div className="w-9 h-9 rounded-sm bg-[#1A1A1A] group-hover:bg-[#C5A059] flex items-center justify-center text-white transition-colors duration-300">
            <Church className="w-4 h-4 text-white stroke-[2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] tracking-[0.3em] font-light text-neutral-400 uppercase leading-tight">
              Catedral de
            </span>
            <span className="text-base sm:text-lg font-bold tracking-tighter leading-none text-neutral-900 group-hover:text-[#C5A059] transition-colors">
              Amor e Fé
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav id="desktop-nav-menu" className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navItems.map((item) => (
            <button
              key={item.label}
              id={`nav-link-${item.label.toLowerCase().replace(' ', '-')}`}
              onClick={() => handleNavClick(item.href)}
              className="text-[11px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer relative py-1 hover:after:w-full after:w-0 after:h-[1px] after:bg-neutral-900 after:absolute after:bottom-0 after:left-0 after:transition-all"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Action Controls & Admin button */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            id="navbar-admin-trigger"
            onClick={() => setIsAdminOpen(true)}
            title="Painel Administrativo para Gerenciar Atividades e Mídias"
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-widest font-bold text-neutral-600 hover:text-[#C5A059] border border-neutral-200 hover:border-[#C5A059]/40 bg-white rounded-sm transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Painel</span>
          </button>

          <a
            id="navbar-whatsapp-cta"
            href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold text-white bg-[#1A1A1A] hover:bg-[#C5A059] rounded-sm transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Falar Conosco</span>
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            id="mobile-admin-btn-header"
            onClick={() => setIsAdminOpen(true)}
            className="p-2 text-neutral-600 bg-white border border-neutral-200 rounded-sm"
            aria-label="Configurar"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-800 hover:text-black bg-white border border-neutral-200 rounded-sm transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-neutral-900" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden bg-white border-b border-neutral-200 px-4 pt-3 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className="flex items-center justify-between w-full px-4 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-neutral-100 flex flex-col gap-2">
            <a
              href={`https://wa.me/${data.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(data.whatsappMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 text-[11px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] rounded-sm"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Entrar em Contacto no WhatsApp</span>
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsAdminOpen(true);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-sm"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-600" />
              <span>Abrir Painel de Gestão da Atividade</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
