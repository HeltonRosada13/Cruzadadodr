'use client';

import React from 'react';
import { ChurchProvider } from '@/lib/ChurchContext';
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

export default function HomePage() {
  return (
    <ChurchProvider>
      <div className="min-h-screen bg-[#FDFDFC] text-[#1A1A1A] flex flex-col selection:bg-[#C5A059]/20 selection:text-[#1A1A1A]">
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
    </ChurchProvider>
  );
}
