'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { getHeroVideoBlobUrl } from '@/lib/videoStorage';
import { CountdownTimer } from './CountdownTimer';
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

const DEFAULT_FALLBACK_VIDEO = 'https://assets.mixkit.co/videos/preview/mixkit-hands-raised-in-a-church-service-41846-large.mp4';
const SECONDARY_FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export function Hero() {
  const { data } = useChurch();
  const activity = data.currentActivity;
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isHeroVisibleRef = useRef<boolean>(true);
  
  // Sound is enabled / unmuted by default
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [customBlobUrl, setCustomBlobUrl] = useState<string | null>(null);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = isMuted;
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
            if (err instanceof Error && err.name === 'NotAllowedError') {
              // Browser autoplay policy blocked unmuted play -> start muted and wait for interaction to unmute
              video.muted = true;
              setIsMuted(true);
              video.play().then(() => setIsPlaying(true)).catch(() => {});
            } else if (err instanceof Error && err.name === 'AbortError') {
              return;
            }
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

  // Auto unlock and enable sound on first user gesture if browser autoplay policy required initial mute
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }

    const unlockAudio = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        setIsMuted(false);
        if (isHeroVisibleRef.current && videoRef.current.paused) {
          safePlay();
        }
      }
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('scroll', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('scroll', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [isMuted, safePlay]);

  // Check stored IndexedDB video blob on mount and listen to real-time updates
  useEffect(() => {
    let isMounted = true;
    
    // Check persistent IndexedDB on reload
    getHeroVideoBlobUrl().then((blobUrl) => {
      if (isMounted && blobUrl) {
        setCustomBlobUrl(blobUrl);
        setVideoError(false);
      }
    });

    const handleVideoUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ blobUrl: string | null }>;
      if (customEvent.detail !== undefined) {
        setCustomBlobUrl(customEvent.detail.blobUrl);
        setVideoError(false);
      }
    };

    window.addEventListener('hero-video-updated', handleVideoUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('hero-video-updated', handleVideoUpdated);
    };
  }, []);

  const isWebUrl = 
    activity.heroVideo && 
    (activity.heroVideo.startsWith('http://') || 
     activity.heroVideo.startsWith('https://') || 
     activity.heroVideo.startsWith('/'));

  // The video source priority:
  // 1. Persistent IndexedDB custom blob URL (re-created freshly on reload)
  // 2. Direct HTTP/HTTPS or local path video URL
  // 3. Fallback church video (always ensuring a background video is active)
  const videoSrc = customBlobUrl || (isWebUrl ? activity.heroVideo : null) || DEFAULT_FALLBACK_VIDEO;

  // React to videoSrc changes and reload video smoothly if Hero is in view
  useEffect(() => {
    if (videoRef.current && videoSrc) {
      setVideoError(false);
      videoRef.current.load();
      if (isHeroVisibleRef.current) {
        safePlay();
      }
    }
  }, [videoSrc, safePlay]);

  // Pause Hero video when user scrolls down to "Pilares da Programação" / "Momentos em Destaque",
  // and resume only when scrolled back up to the Hero section.
  useEffect(() => {
    const currentSection = sectionRef.current;
    if (!currentSection) return;

    // IntersectionObserver to detect when Hero section leaves or enters the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If Hero is visible on screen (at top)
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            isHeroVisibleRef.current = true;
            safePlay();
          } else {
            // If scrolled down into Highlights / Pilares / Galeria
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

    // Continuous scroll listener for immediate response on scroll down/up
    const handleScroll = () => {
      const heroHeight = currentSection.offsetHeight || 600;
      const scrollY = window.scrollY || window.pageYOffset || 0;

      // Scrolled past 60% of Hero into Destaques/Pilares -> PAUSE
      if (scrollY > heroHeight * 0.6) {
        if (isHeroVisibleRef.current) {
          isHeroVisibleRef.current = false;
          safePause();
        }
      } else if (scrollY < heroHeight * 0.35) {
        // Scrolled back near top of Hero -> RESUME
        if (!isHeroVisibleRef.current) {
          isHeroVisibleRef.current = true;
          safePlay();
        }
      }
    };

    // Pause if document/tab is hidden
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
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
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
        {videoSrc && !videoError ? (
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            poster={activity.heroImage}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              if (videoSrc !== SECONDARY_FALLBACK_VIDEO) {
                if (videoRef.current) {
                  videoRef.current.src = SECONDARY_FALLBACK_VIDEO;
                  videoRef.current.load();
                  safePlay();
                }
              } else {
                setVideoError(true);
              }
            }}
            className="w-full h-full object-cover object-center scale-105 transition-opacity duration-1000 brightness-95"
          />
        ) : (
          <Image
            src={activity.heroImage}
            alt={activity.name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center grayscale-[15%]"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Balanced Editorial Overlays to keep video clearly visible while text is crisp */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/65 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-black/65 z-10 pointer-events-none" />
      </div>

      {/* Subtle Bottom-Right Floating Audio/Play Controls for Visitors */}
      {videoSrc && !videoError && (
        <div className="absolute bottom-6 right-6 z-30 hidden sm:flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-white text-[10px] font-semibold tracking-wider shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
          <span className="uppercase text-neutral-200">Vídeo Ao Vivo</span>
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
            className={`px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 font-bold text-[10px] ${
              !isMuted 
                ? 'bg-[#C5A059] text-white shadow-md ring-2 ring-[#C5A059]/40' 
                : 'bg-white/15 text-neutral-200 hover:text-white hover:bg-white/25 border border-white/20'
            }`}
            title={isMuted ? 'Ativar Som' : 'Som Ativo (Clique para silenciar)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase tracking-wider">Ativar Som</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-white" />
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-white">Som Ativo</span>
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
