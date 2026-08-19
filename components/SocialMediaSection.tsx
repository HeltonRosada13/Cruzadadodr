'use client';

import React from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { 
  Instagram, 
  Facebook, 
  Youtube, 
  MessageCircle, 
  Music2, 
  Share2, 
  ExternalLink, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export function SocialMediaSection() {
  const { data } = useChurch();
  const socialLinks = data.socialLinks;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'Instagram':
        return Instagram;
      case 'Facebook':
        return Facebook;
      case 'YouTube':
        return Youtube;
      case 'WhatsApp':
        return MessageCircle;
      case 'Spotify':
        return Music2;
      default:
        return Share2;
    }
  };

  return (
    <section
      id="redes-sociais"
      className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative scroll-mt-20 bg-[#FDFDFC]"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
          Canais Digitais Oficiais
        </span>
        <h2
          id="section-title-redes"
          className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
        >
          Acompanhe a Igreja
        </h2>
        <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
        <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
          Conecte-se aos nossos perfis e canais oficiais para receber transmissões ao vivo, reflexões bíblicas, fotos e notícias de todas as atividades.
        </p>
      </div>

      {/* Structured Clean List of Social Networks */}
      <div className="space-y-4">
        {socialLinks.map((item) => {
          const Icon = getPlatformIcon(item.platform);

          // For WhatsApp, ensure direct wa.me URL to the owner's phone number
          let targetUrl = item.url;
          if (item.platform === 'WhatsApp' || item.id === 'soc-whatsapp') {
            const rawNumber = item.handle || data.whatsappNumber || item.url || '';
            const cleanNumber = rawNumber.replace(/\D/g, '');
            if (cleanNumber) {
              const msg = data.whatsappMessage ? `?text=${encodeURIComponent(data.whatsappMessage)}` : '';
              targetUrl = `https://wa.me/${cleanNumber}${msg}`;
            }
          }

          return (
            <div
              key={item.id}
              id={`social-item-${item.platform.toLowerCase()}`}
              className="p-5 sm:p-6 rounded-sm bg-white border border-neutral-200/90 hover:border-neutral-900 shadow-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              {/* Left Details */}
              <div className="flex items-start sm:items-center gap-4">
                <div
                  className="w-11 h-11 rounded-sm flex items-center justify-center flex-shrink-0 border border-[#C5A059]/30 bg-[#C5A059]/10 text-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-white transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm sm:text-base font-editorial italic text-neutral-900 group-hover:text-[#C5A059] transition-colors">
                      {item.name}
                    </h3>
                    {item.badgeText && (
                      <span className="px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20">
                        {item.badgeText}
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 font-mono">
                      {item.handle}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 font-light leading-relaxed max-w-lg">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Action Button: ACESSAR */}
              <div className="flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 flex justify-end">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id={`btn-acessar-${item.platform.toLowerCase()}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] rounded-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>ACESSAR</span>
                  <ExternalLink className="w-3 h-3 text-white" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety / Official Note */}
      <div className="mt-8 p-4 rounded-sm bg-neutral-50 border border-neutral-200/80 flex items-center justify-center gap-2 text-center text-xs text-neutral-500 font-light">
        <ShieldCheck className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
        <span>Estes são os únicos canais digitais oficiais autorizados pela Igreja Catedral de Amor e Fé.</span>
      </div>
    </section>
  );
}
