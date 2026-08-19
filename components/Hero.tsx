'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { getHeroVideoBlobUrl } from '@/lib/videoStorage';
import { CountdownTimer } from './CountdownTimer';
import { isYouTubeVideoUrl, formatYouTubeEmbedUrl } from '@/lib/utils';
import { 
  ArrowDown, 
  Images, 
  Calendar, 
  MapPin, 
  Heart,
  ChevronDown,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';

const DEFAULT_FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export function Hero() {
  const { data } = useChurch();
  const activity = data.currentActivity;
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isHeroVisibleRef = useRef<boolean>(true);
  
  // Start muted to comply strictly with mobile browser autoplay policies
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customBlobUrl, setCustomBlobUrl] = useState<string | null>(null);

  // Hydrate local video blob on mount or when uploaded
  useEffect(() => {
    let isMounted = true;
    getHeroVideoBlobUrl().then((blobUrl) => {
      if (isMounted && blobUrl) {
        setCustomBlobUrl(blobUrl);
      }
    });

    const handleVideoUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ blobUrl: string | null }>;
      if (customEvent.detail !== undefined) {
        setCustomBlobUrl(customEvent.detail.blobUrl);
      }
    };

    window.addEventListener('hero-video-updated', handleVideoUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('hero-video-updated', handleVideoUpdated);
    };
  }, []);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = isMuted;
      video.defaultMuted = true;
      video.playsInline = true;
      
      const promise = video.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            playPromiseRef.current = null;
            setIsPlaying(true);
          })
          .catch((err: unknown) => {
            playPromiseRef.current = null;
            // If browser autoplay policy restricted play -> ensure muted and retry
            video.muted = true;
            setIsMuted(true);
            video.play().then(() => setIsPlaying(true)).catch(() => {});
          });
      } else {
        setIsPlaying(true);
      }
    } catch {
      // Ignored
    }
  }, [isMuted]);

  const safePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        })
        .catch(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const rawVideo = customBlobUrl || activity.heroVideo;
  const isYouTube = isYouTubeVideoUrl(rawVideo);
  const videoSrc = (rawVideo && !isYouTube ? rawVideo : null) || DEFAULT_FALLBACK_VIDEO;

  // Imperative video element setup for mobile iOS & Android & Desktop
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYouTube) return;

    video.muted = isMuted;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    const handleCanPlay = () => {
      if (isHeroVisibleRef.current) {
        safePlay();
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleCanPlay);

    // Initial play attempt
    if (isHeroVisibleRef.current) {
      safePlay();
    }

    // Force play on first touch/tap on mobile screen
    const unlockAndPlay = () => {
      if (videoRef.current && videoRef.current.paused) {
        safePlay();
      }
    };

    window.addEventListener('touchstart', unlockAndPlay, { passive: true, once: true });
    window.addEventListener('click', unlockAndPlay, { passive: true, once: true });
    window.addEventListener('scroll', unlockAndPlay, { passive: true, once: true });

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleCanPlay);
      window.removeEventListener('touchstart', unlockAndPlay);
      window.removeEventListener('click', unlockAndPlay);
      window.removeEventListener('scroll', unlockAndPlay);
    };
  }, [videoSrc, isMuted, isYouTube, safePlay]);

  // Pause when scrolled past Hero
  useEffect(() => {
    const currentSection = sectionRef.current;
    if (!currentSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            isHeroVisibleRef.current = true;
            safePlay();
          } else {
            isHeroVisibleRef.current = false;
            safePause();
          }
        });
      },
      {
        threshold: [0, 0.1, 0.3, 0.6],
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(currentSection);

    const handleScroll = () => {
      const heroHeight = currentSection.offsetHeight || 600;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      if (scrollY > heroHeight * 0.6) {
        if (isHeroVisibleRef.current) {
          isHeroVisibleRef.current = false;
          safePause();
        }
      } else if (scrollY < heroHeight * 0.35) {
        if (!isHeroVisibleRef.current) {
          isHeroVisibleRef.current = true;
          safePlay();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        safePause();
      } else if (isHeroVisibleRef.current) {
        safePlay();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [safePause, safePlay]);

  const toggleSound = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (videoRef.current.paused) {
        safePlay();
      }
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlaying) {
      safePause();
    } else {
      safePlay();
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="inicio"
      className="relative min-h-[90vh] lg:min-h-[95vh] flex flex-col justify-center items-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-neutral-900 border-b border-neutral-200"
    >
      {/* Background Video with Cinematic Editorial Dark Gradient Overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        {isYouTube ? (
          <iframe
            src={formatYouTubeEmbedUrl(activity.heroVideo, true) + '&mute=1&controls=0&loop=1&playsinline=1'}
            title={activity.name}
            className="w-full h-full border-0 absolute inset-0 pointer-events-none scale-125"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            key={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full h-full object-cover object-center scale-105 transition-all duration-700"
          >
            <source src={videoSrc} type="video/mp4" />
            <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
          </video>
        )}

        {/* Balanced Cinematic Overlays - Video is clearly visible and vivid */}
        <div className="absolute inset-0 bg-black/35 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-10 pointer-events-none" />
      </div>

      {/* Floating Audio/Play Controls - Visible on both Mobile & Desktop */}
      {!isYouTube && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold tracking-wider shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-0.5" />
          <span className="uppercase text-neutral-200 text-[9px] sm:text-[10px]">Vídeo Ao Vivo</span>
          <div className="w-[1px] h-3 bg-white/20 mx-1" />
          
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar vídeo de fundo' : 'Reproduzir vídeo de fundo'}
            className="p-1 hover:text-[#C5A059] transition-colors cursor-pointer"
            title={isPlaying ? 'Pausar Vídeo' : 'Reproduzir Vídeo'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-bold text-[9px] sm:text-[10px] ${
              !isMuted 
                ? 'bg-[#C5A059] text-white shadow-md ring-2 ring-[#C5A059]/40' 
                : 'bg-white/15 text-neutral-200 hover:text-white hover:bg-white/25 border border-white/20'
            }`}
            title={isMuted ? 'Ativar Som' : 'Som Ativo (Clique para silenciar)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">Ativar Som</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
                <span className="uppercase tracking-wider font-extrabold text-white">Som Ativo</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-20 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Eyebrow in Editorial Typography */}
        <span className="text-[#C5A059] text-xs sm:text-sm font-bold tracking-[0.4em] uppercase mb-4 drop-shadow-sm flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>{activity.badge || 'EVENTO PRINCIPAL'} — IGREJA CATEDRAL DE AMOR E FÉ</span>
        </span>

        {/* Activity Main Title in Editorial Serif */}
        <h1
          id="hero-activity-title"
          className="text-white text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-editorial italic font-normal tracking-tight leading-[0.92] mb-6 max-w-4xl drop-shadow-md"
        >
          {activity.name}
        </h1>

        {/* Subtitle */}
        <p
          id="hero-activity-subtitle"
          className="text-neutral-200 max-w-2xl text-sm sm:text-base md:text-lg font-light leading-relaxed mb-8 drop-shadow"
        >
          {activity.subtitle}
        </p>

        {/* Quick event meta badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-9 text-xs sm:text-sm text-neutral-200">
          <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-black/50 border border-white/15 backdrop-blur-md">
            <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="font-medium tracking-wide">{activity.formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-black/50 border border-white/15 backdrop-blur-md">
            <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="font-medium tracking-wide">{activity.location}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-sm bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#F6EEDF] backdrop-blur-md font-semibold">
            <Heart className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Entrada Livre</span>
          </div>
        </div>

        {/* Visitor Action Buttons: SABER MAIS & VER FOTOS E VÍDEOS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-10">
          <button
            id="hero-btn-saber-mais"
            onClick={() => scrollToSection('#sobre')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white bg-[#C5A059] hover:bg-[#B58E45] rounded-sm transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-md"
          >
            <span>Saber Mais</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            id="hero-btn-ver-fotos-videos"
            onClick={() => scrollToSection('#fotos')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white border border-white/35 hover:border-white hover:bg-white/10 rounded-sm backdrop-blur-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Ver Fotos e Vídeos</span>
          </button>
        </div>

        {/* Real-time Countdown Timer component */}
        <CountdownTimer
          targetDateString={activity.date}
          activityName={activity.name}
        />
      </div>

      {/* Down Scroll Indicator */}
      <div className="mt-8 z-20 flex flex-col items-center">
        <button
          onClick={() => scrollToSection('#sobre')}
          aria-label="Rolar para baixo"
          className="text-neutral-400 hover:text-white transition-colors flex flex-col items-center gap-1 cursor-pointer"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium">Explorar Programação</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce text-[#C5A059]" />
        </button>
      </div>
    </section>
  );
}
