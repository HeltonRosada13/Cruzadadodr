'use client';

import React from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { 
  Sparkles, 
  Music, 
  BookOpen, 
  HeartHandshake, 
  Flame, 
  Gift, 
  Star, 
  Quote,
  Users,
  Sun,
  Heart,
  Crown,
  MessageSquare,
  Calendar,
  Award,
  ShieldCheck
} from 'lucide-react';
import Image from 'next/image';

export function FeaturedMoments() {
  const { data } = useChurch();
  const highlights = data.highlights;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Music':
        return Music;
      case 'BookOpen':
        return BookOpen;
      case 'HeartHandshake':
        return HeartHandshake;
      case 'Flame':
        return Flame;
      case 'Gift':
        return Gift;
      case 'Users':
        return Users;
      case 'Sun':
        return Sun;
      case 'Heart':
        return Heart;
      case 'Crown':
        return Crown;
      case 'Sparkles':
        return Sparkles;
      case 'MessageSquare':
        return MessageSquare;
      case 'Calendar':
        return Calendar;
      case 'Award':
        return Award;
      case 'ShieldCheck':
        return ShieldCheck;
      default:
        return Star;
    }
  };

  return (
    <section
      id="destaques"
      className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative scroll-mt-20"
    >
      {/* Header in Editorial Style */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
          Pilares da Programação
        </span>
        <h2
          id="section-title-destaques"
          className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
        >
          Momentos em Destaque
        </h2>
        <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
        <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
          Cada detalhe desta atividade foi concebido com oração e excelência para proporcionar momentos inesquecíveis de comunhão com Deus e com o próximo.
        </p>
      </div>

      {/* Grid of Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {highlights.map((item) => {
          const Icon = getIcon(item.iconName);
          return (
            <div
              key={item.id}
              id={`highlight-card-${item.id}`}
              className="group bg-white rounded-sm overflow-hidden border border-neutral-200/80 hover:border-neutral-900 shadow-sm transition-all duration-300 flex flex-col justify-between"
            >
              {/* Card Top Image */}
              <div className="relative h-56 w-full overflow-hidden bg-neutral-100">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Floating Icon Pill */}
                <div className="absolute top-4 left-4 w-9 h-9 rounded-sm bg-white/95 backdrop-blur-md border border-neutral-200 flex items-center justify-center text-neutral-900 shadow-sm">
                  <Icon className="w-4 h-4 text-[#C5A059]" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] mb-1.5 block">
                    {item.subtitle}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-editorial italic text-neutral-900 mb-3 group-hover:text-[#C5A059] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                {/* Scripture/Quote Box */}
                {item.verse && (
                  <div className="p-3.5 rounded-sm bg-[#F8F8F6] border border-neutral-200/80 text-neutral-700 text-xs italic flex items-start gap-2.5">
                    <Quote className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                    <span className="font-editorial text-sm">{item.verse}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
