'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { PhotoItem } from '@/lib/types';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Share2, 
  Camera, 
  Check, 
  Layers,
  Pause,
  Play
} from 'lucide-react';
import Image from 'next/image';

export function PhotoGallery() {
  const { data } = useChurch();
  const photos = data.photos;

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isAutoTickerPaused, setIsAutoTickerPaused] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  const categories = ['Todos', 'Louvor', 'Palavra', 'Juventude', 'Comunhão', 'Famílias'];

  const filteredPhotos = activeCategory === 'Todos'
    ? photos
    : photos.filter((p) => p.category === activeCategory || p.category === 'Todos');

  // Lightbox handlers
  useEffect(() => {
    if (selectedPhotoIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPhotoIndex]);

  const handleOpenLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) =>
      prev === 0 ? filteredPhotos.length - 1 : (prev ?? 0) - 1
    );
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((prev) =>
      prev === filteredPhotos.length - 1 ? 0 : (prev ?? 0) + 1
    );
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      if (e.key === 'ArrowLeft') {
        setSelectedPhotoIndex((prev) =>
          prev === 0 ? filteredPhotos.length - 1 : (prev ?? 0) - 1
        );
      }
      if (e.key === 'ArrowRight') {
        setSelectedPhotoIndex((prev) =>
          prev === filteredPhotos.length - 1 ? 0 : (prev ?? 0) + 1
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex, filteredPhotos.length]);

  const handleSharePhoto = (photo: PhotoItem) => {
    if (navigator.share) {
      navigator.share({
        title: photo.title,
        text: `${photo.title} — Igreja Catedral de Amor e Fé`,
        url: photo.imageUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(photo.imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  return (
    <section
      id="fotos"
      className="py-20 bg-[#F5F5F3] border-y border-neutral-200/80 relative scroll-mt-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        {/* Section Header in Editorial Style */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
            Acervo Fotográfico
          </span>
          <h2
            id="section-title-fotos"
            className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
          >
            Registros e Memórias da Atividade
          </h2>
          <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
          <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
            Recorde a presença de Deus, a alegria da congregação e os instantes que marcaram a nossa caminhada em comunidade.
          </p>
        </div>

        {/* Category Filter Pills in Editorial Style */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#1A1A1A] text-white shadow-sm'
                  : 'bg-white text-neutral-600 hover:text-black border border-neutral-200 hover:border-neutral-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CONTINUOUS STREAMING PHOTO MARQUEE */}
      <div className="relative mb-14 overflow-hidden py-3">
        {/* Gradient edge faders */}
        <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#F5F5F3] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#F5F5F3] to-transparent z-10 pointer-events-none" />

        <div className="flex items-center justify-between max-w-7xl mx-auto px-4 mb-3 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5 font-medium text-neutral-700">
            <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
            Fluxo Contínuo de Fotografias
          </span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">
            Clique na foto para ampliar
          </span>
        </div>

        {/* Marquee Track */}
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex gap-4 pr-4">
            {[...photos, ...photos].map((photo, i) => (
              <div
                key={`marquee-${photo.id}-${i}`}
                onClick={() => handleOpenLightbox(i % photos.length)}
                className="relative w-64 sm:w-80 h-44 sm:h-52 rounded-sm overflow-hidden flex-shrink-0 cursor-pointer group border border-neutral-300/80 hover:border-black shadow-sm transition-all duration-300"
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 768px) 256px, 320px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-white/90 text-neutral-900 mb-1">
                    {photo.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-editorial italic text-white line-clamp-1">
                    {photo.title}
                  </h4>
                </div>
                <div className="absolute top-3 right-3 p-1.5 rounded-sm bg-black/60 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Maximize2 className="w-3.5 h-3.5 text-[#C5A059]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. RESPONSIVE GRID VIEW */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              id={`photo-grid-item-${photo.id}`}
              onClick={() => handleOpenLightbox(idx)}
              className="group relative h-72 rounded-sm overflow-hidden border border-neutral-200/90 bg-white cursor-pointer hover:border-neutral-900 shadow-sm transition-all duration-300 flex flex-col justify-between"
            >
              <Image
                src={photo.imageUrl}
                alt={photo.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-75 group-hover:opacity-90 transition-opacity duration-300" />
              
              {/* Category Tag */}
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-white/95 text-neutral-900 border border-neutral-200">
                  {photo.category}
                </span>
              </div>

              {/* Zoom icon hint */}
              <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-sm bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Maximize2 className="w-3.5 h-3.5 text-[#C5A059]" />
              </div>

              {/* Bottom Content Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <p className="text-[10px] text-[#C5A059] font-medium mb-1">
                  {photo.date}
                </p>
                <h3 className="text-sm font-editorial italic text-white leading-snug group-hover:text-[#F6EEDF] transition-colors mb-1">
                  {photo.title}
                </h3>
                <p className="text-xs text-neutral-300 font-light line-clamp-2 leading-relaxed opacity-90">
                  {photo.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. FULLSCREEN LIGHTBOX MODAL */}
      {selectedPhotoIndex !== null && currentPhoto && (
        <div
          id="photo-lightbox-modal"
          onClick={handleCloseLightbox}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between text-white z-20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-sm bg-[#C5A059]/20 text-[#C5A059] text-[10px] font-bold uppercase tracking-widest border border-[#C5A059]/40">
                {currentPhoto.category}
              </span>
              <span className="text-xs text-neutral-400 font-light">
                {selectedPhotoIndex + 1} / {filteredPhotos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSharePhoto(currentPhoto)}
                className="p-2.5 rounded-sm bg-white/10 hover:bg-white/20 border border-white/20 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                title="Partilhar imagem"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleCloseLightbox}
                className="p-2.5 rounded-sm bg-white/10 hover:bg-red-500/20 border border-white/20 hover:border-red-500/40 text-neutral-200 hover:text-red-300 transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central Image with Prev & Next Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 sm:left-6 z-30 p-3 rounded-full bg-black/70 hover:bg-[#C5A059] hover:text-black border border-white/20 text-white transition-all transform hover:scale-105 cursor-pointer shadow-2xl"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNextPhoto}
              className="absolute right-2 sm:right-6 z-30 p-3 rounded-full bg-black/70 hover:bg-[#C5A059] hover:text-black border border-white/20 text-white transition-all transform hover:scale-105 cursor-pointer shadow-2xl"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Enlarged Image */}
            <div
              className="relative w-full max-w-5xl h-full max-h-[72vh] rounded-sm overflow-hidden shadow-2xl border border-white/10 bg-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={currentPhoto.imageUrl}
                alt={currentPhoto.title}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
                priority
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Bottom Caption & Credit */}
          <div
            className="max-w-2xl mx-auto w-full text-center bg-black/80 border border-white/15 rounded-sm p-4 backdrop-blur-md z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-editorial italic text-white mb-1">
              {currentPhoto.title}
            </h3>
            <p className="text-xs text-neutral-300 font-light leading-relaxed">
              {currentPhoto.description}
            </p>
            {currentPhoto.photographer && (
              <p className="text-[10px] uppercase tracking-widest text-[#C5A059] mt-2">
                Fotografia: {currentPhoto.photographer} • {currentPhoto.date}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
