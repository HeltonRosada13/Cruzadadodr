'use client';

import React, { useState } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Church, 
  Sparkles, 
  Users, 
  Target, 
  Info, 
  Share2, 
  Check, 
  ExternalLink,
  BookOpen,
  CalendarPlus,
  Navigation
} from 'lucide-react';

export function AboutActivity() {
  const { data } = useChurch();
  const activity = data.currentActivity;
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${activity.name} — Igreja Catedral de Amor e Fé`,
        text: `${activity.name}: ${activity.subtitle}\nData: ${activity.formattedDate} às ${activity.time}\nLocal: ${activity.location}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `${activity.name} — Igreja Catedral de Amor e Fé\nData: ${activity.formattedDate} às ${activity.time}\nLocal: ${activity.location}\n${window.location.href}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleAddToGoogleCalendar = () => {
    const title = encodeURIComponent(`${activity.name} - Igreja Catedral de Amor e Fé`);
    const details = encodeURIComponent(`${activity.subtitle}\nTema: ${activity.theme}\n${activity.importantNotes}`);
    const location = encodeURIComponent(`${activity.location}, ${activity.address}`);
    
    const eventDate = new Date(activity.date);
    const startIso = isNaN(eventDate.getTime()) 
      ? '20260918T180000Z' 
      : eventDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = isNaN(eventDate.getTime()) 
      ? '20260918T213000Z' 
      : new Date(eventDate.getTime() + 3.5 * 3600 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startIso}/${endIso}`;
    window.open(googleCalUrl, '_blank');
  };

  const infoItems = [
    {
      icon: Calendar,
      label: 'Data',
      value: activity.formattedDate,
    },
    {
      icon: Clock,
      label: 'Horário',
      value: activity.time,
    },
    {
      icon: MapPin,
      label: 'Local & Endereço',
      value: `${activity.location} — ${activity.address}`,
    },
    {
      icon: BookOpen,
      label: 'Tema da Atividade',
      value: activity.theme,
      highlight: true,
    },
    {
      icon: Church,
      label: 'Organização',
      value: activity.organization,
    },
    {
      icon: Users,
      label: 'Público-Alvo',
      value: activity.targetAudience,
    },
    {
      icon: Target,
      label: 'Objetivo',
      value: activity.goal,
    },
    {
      icon: Info,
      label: 'Informações Importantes',
      value: activity.importantNotes,
    },
  ];

  return (
    <section
      id="sobre"
      className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative scroll-mt-20 bg-[#FDFDFC]"
    >
      {/* Section Header in Editorial Style */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
          Sobre a Atividade
        </span>
        <h2
          id="section-title-sobre"
          className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
        >
          Propósito & Detalhes da Programação
        </h2>
        <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
        <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
          Tudo o que precisa de saber sobre este momento especial preparado com excelência e oração para edificar a sua vida e a sua família.
        </p>
      </div>

      {/* Main Info Grid in Editorial Minimalist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {infoItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              id={`info-card-${idx}`}
              className={`p-6 bg-white border rounded-sm transition-all duration-300 group ${
                item.highlight
                  ? 'md:col-span-2 lg:col-span-2 bg-[#C5A059]/5 border-[#C5A059]/30 shadow-sm'
                  : 'border-neutral-200/80 hover:border-neutral-900 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.highlight ? 'bg-[#C5A059]/15 text-[#C5A059]' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1 leading-none">
                    {item.label}
                  </p>
                  <p className={`text-sm leading-relaxed ${item.highlight ? 'text-neutral-900 font-semibold text-base sm:text-lg font-editorial italic' : 'text-neutral-800 font-medium'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Utilities Bar in Editorial Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white border border-neutral-200/80 rounded-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Participe e Convide a sua Família</h4>
            <p className="text-xs text-neutral-500 font-light">Ajude a espalhar esta mensagem de esperança e comunhão</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleAddToGoogleCalendar}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-800 hover:text-black bg-white hover:bg-neutral-50 border border-neutral-300 rounded-sm transition-all cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Adicionar à Agenda</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white bg-[#C5A059] hover:bg-[#B58E45] rounded-sm transition-all cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copiado!' : 'Partilhar Atividade'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
