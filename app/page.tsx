'use client';

import React from 'react';
import { ChurchProvider, useChurch } from '@/lib/ChurchContext';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { AboutActivity } from '@/components/AboutActivity';
import { FeaturedMoments } from '@/components/FeaturedMoments';
import { PhotoGallery } from '@/components/PhotoGallery';
import { VideoGallery } from '@/components/VideoGallery';
import { ActivitiesSchedule } from '@/components/ActivitiesSchedule';
import { Testimonials } from '@/components/Testimonials';
import { SocialMediaSection } from '@/components/SocialMediaSection';
import { WhatsAppFloating } from '@/components/WhatsAppFloating';
import { AdminManagerModal } from '@/components/AdminManagerModal';
import { Footer } from '@/components/Footer';
import { Church } from 'lucide-react';

function PageContent() {
  const { isReady } = useChurch();

  if (!isReady) {
    return (
      <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col items-center justify-center text-white px-4">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center mb-5 shadow-2xl animate-pulse">
            <Church className="w-8 h-8 text-[#C5A059]" />
          </div>
          <h1 className="text-xl font-editorial tracking-wide text-white mb-2">
            Igreja Catedral de Amor e Fé
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-[#C5A059] font-medium mb-6">
            Carregando Conteúdo...
          </p>
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#C5A059] rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#1A1A1A] flex flex-col selection:bg-[#C5A059]/20 selection:text-[#1A1A1A] animate-in fade-in duration-300">
      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <Hero />

        {/* About Section */}
        <AboutActivity />

        {/* Featured Moments */}
        <FeaturedMoments />

        {/* Photo Gallery with Continuous Marquee & Lightbox */}
        <PhotoGallery />

        {/* Video Gallery with Carousel & Modal Player */}
        <VideoGallery />

        {/* Other Activities and Schedule */}
        <ActivitiesSchedule />

        {/* Testimonies / Messages */}
        <Testimonials />

        {/* Organized Social Media Channels */}
        <SocialMediaSection />
      </main>

      {/* Comprehensive Footer with Baobá Universe Attribution */}
      <Footer />

      {/* Interactive Floating WhatsApp Button */}
      <WhatsAppFloating />

      {/* Real-time Content & Activity Admin Manager */}
      <AdminManagerModal />
    </div>
  );
}

export default function HomePage() {
  return (
    <ChurchProvider>
      <PageContent />
    </ChurchProvider>
  );
}

