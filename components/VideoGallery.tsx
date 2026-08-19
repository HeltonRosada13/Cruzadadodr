'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { VideoItem } from '@/lib/types';
import { getVideoFileBlobUrl, getAllStoredVideoBlobUrls } from '@/lib/videoStorage';
import { isYouTubeVideoUrl, formatYouTubeEmbedUrl } from '@/lib/utils';
import { 
  Play, 
  Pause,
  Video, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  ExternalLink, 
  Share2, 
  Check, 
  Volume2, 
  VolumeX, 
  Maximize2 
} from 'lucide-react';
import Image from 'next/image';

const FALLBACK_STREAM_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export { isYouTubeVideoUrl, formatYouTubeEmbedUrl };

export function VideoGallery() {
  const { data } = useChurch();
  const videos = data.videos;

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlayingCarousel, setIsAutoPlayingCarousel] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Start muted to comply with iOS Safari and Android Chrome autoplay restrictions
  const [isInlineMuted, setIsInlineMuted] = useState(true);
  const [isInlinePlaying, setIsInlinePlaying] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});
  
  // Persistent IndexedDB Blob URLs dictionary mapped by video ID
  const [persistentBlobMap, setPersistentBlobMap] = useState<Record<string, string>>({});
  
  const sectionRef = useRef<HTMLElement>(null);
  const isSectionVisibleRef = useRef<boolean>(false);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const featuredVideoRef = useRef<HTMLVideoElement>(null);
  const featuredSectionRef = useRef<HTMLDivElement>(null);

  // Auto unlock and enable audio on first user gesture if browser required interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (featuredVideoRef.current) {
        featuredVideoRef.current.muted = false;
        setIsInlineMuted(false);
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
  }, []);

  // Load persistent video blobs from IndexedDB on page load & refresh
  useEffect(() => {
    let isMounted = true;

    // Load all stored videos in IndexedDB
    getAllStoredVideoBlobUrls().then((blobMap) => {
      if (isMounted && blobMap && Object.keys(blobMap).length > 0) {
        setPersistentBlobMap((prev) => ({ ...prev, ...blobMap }));
      }
    });

    // Also individually resolve all non-YouTube videos in the list
    videos.forEach((v) => {
      if (!isYouTubeVideoUrl(v.videoUrl)) {
        getVideoFileBlobUrl(v.id).then((url) => {
          if (isMounted && url) {
            setPersistentBlobMap((prev) => ({ ...prev, [v.id]: url }));
          }
        });
      }
    });

    // Real-time listener for newly uploaded videos in admin panel
    const handleGalleryVideoUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; blobUrl: string }>;
      if (customEvent.detail && customEvent.detail.id) {
        setPersistentBlobMap((prev) => ({
          ...prev,
          [customEvent.detail.id]: customEvent.detail.blobUrl,
        }));
        setCurrentIndex(0);
        if (isSectionVisibleRef.current) {
          setIsInlinePlaying(true);
        }
      }
    };

    window.addEventListener('gallery-video-updated', handleGalleryVideoUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('gallery-video-updated', handleGalleryVideoUpdated);
    };
  }, [videos]);

  // Helper to resolve the active, live video URL for any video item
  const getResolvedVideoUrl = (video: VideoItem | undefined): string => {
    if (!video || !video.videoUrl) return FALLBACK_STREAM_VIDEO;

    // 1. YouTube video
    if (isYouTubeVideoUrl(video.videoUrl)) {
      return formatYouTubeEmbedUrl(video.videoUrl, false);
    }

    // 2. Persistent IndexedDB blob URL
    if (persistentBlobMap[video.id]) {
      return persistentBlobMap[video.id];
    }

    // 3. Direct URL (including live blob: URL or http/https)
    if (video.videoUrl) {
      return video.videoUrl;
    }

    return FALLBACK_STREAM_VIDEO;
  };

  const currentFeatured = videos[currentIndex] || videos[0];
  const isCurrentYouTube = currentFeatured ? isYouTubeVideoUrl(currentFeatured.videoUrl) : false;
  const currentVideoSrc = currentFeatured ? getResolvedVideoUrl(currentFeatured) : FALLBACK_STREAM_VIDEO;

  // Safe playback handlers
  const safePlayInline = useCallback(() => {
    const video = featuredVideoRef.current;
    if (!video || isCurrentYouTube || !isSectionVisibleRef.current) return;

    try {
      video.muted = isInlineMuted;
      const promise = video.play();
      if (promise !== undefined) {
        playPromiseRef.current = promise;
        promise
          .then(() => {
            playPromiseRef.current = null;
            setIsInlinePlaying(true);
          })
          .catch((err: unknown) => {
            playPromiseRef.current = null;
            if (err instanceof Error && err.name === 'NotAllowedError') {
              video.muted = true;
              setIsInlineMuted(true);
              video.play().then(() => setIsInlinePlaying(true)).catch(() => {});
            } else if (err instanceof Error && err.name === 'AbortError') {
              return;
            }
          });
      } else {
        setIsInlinePlaying(true);
      }
    } catch {
      // Ignored
    }
  }, [isCurrentYouTube, isInlineMuted]);

  const safePauseInline = useCallback(() => {
    const video = featuredVideoRef.current;
    if (!video) return;

    if (playPromiseRef.current) {
      playPromiseRef.current
        .then(() => {
          if (featuredVideoRef.current) {
            featuredVideoRef.current.pause();
            setIsInlinePlaying(false);
          }
        })
        .catch(() => {
          if (featuredVideoRef.current) {
            featuredVideoRef.current.pause();
            setIsInlinePlaying(false);
          }
        });
    } else {
      video.pause();
      setIsInlinePlaying(false);
    }
  }, []);

  // ONLY play when the user is scrolled into the #videos section.
  // While the user is outside this section (e.g. at Hero, Sobre, Horários), it stays paused.
  useEffect(() => {
    const target = sectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.15) {
            isSectionVisibleRef.current = true;
            safePlayInline();
          } else {
            isSectionVisibleRef.current = false;
            safePauseInline();
          }
        });
      },
      {
        threshold: [0, 0.15, 0.4, 0.7],
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(target);

    const handleScroll = () => {
      const rect = target.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
      if (inView) {
        if (!isSectionVisibleRef.current) {
          isSectionVisibleRef.current = true;
          safePlayInline();
        }
      } else {
        if (isSectionVisibleRef.current) {
          isSectionVisibleRef.current = false;
          safePauseInline();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        safePauseInline();
      } else if (isSectionVisibleRef.current) {
        safePlayInline();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [safePauseInline, safePlayInline]);

  // Auto carousel effect if enabled
  useEffect(() => {
    if (!isAutoPlayingCarousel || videos.length <= 1) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 8000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlayingCarousel, videos.length]);

  // Safe play handling for video changes
  useEffect(() => {
    const video = featuredVideoRef.current;
    if (!video || isCurrentYouTube) return;

    video.load();
    if (isSectionVisibleRef.current) {
      safePlayInline();
    } else {
      video.pause();
      setIsInlinePlaying(false);
    }
  }, [currentIndex, currentVideoSrc, isCurrentYouTube, safePlayInline]);

  const handlePrev = () => {
    setIsAutoPlayingCarousel(false);
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setIsAutoPlayingCarousel(false);
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  // Toggle Play / Pause on the featured spotlight
  const toggleInlinePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = featuredVideoRef.current;
    if (!video) return;

    if (video.paused) {
      isSectionVisibleRef.current = true;
      safePlayInline();
    } else {
      safePauseInline();
    }
  };

  // Toggle Mute / Unmute on the featured spotlight
  const toggleInlineSound = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = featuredVideoRef.current;
    if (!video) return;

    video.muted = !isInlineMuted;
    setIsInlineMuted(!isInlineMuted);
  };

  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedVideo]);

  const handleOpenVideoModal = async (video: VideoItem) => {
    let activeUrl = getResolvedVideoUrl(video);
    if (activeUrl.startsWith('blob:') && !persistentBlobMap[video.id]) {
      const freshBlobUrl = await getVideoFileBlobUrl(video.id);
      if (freshBlobUrl) {
        activeUrl = freshBlobUrl;
        setPersistentBlobMap((prev) => ({ ...prev, [video.id]: freshBlobUrl }));
      }
    }
    setSelectedVideo({ ...video, videoUrl: activeUrl });
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  const handleShareVideo = (video: VideoItem) => {
    const shareUrl = video.videoUrl.startsWith('blob:') ? window.location.href : video.videoUrl;
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `${video.title} — Igreja Catedral de Amor e Fé`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section
      id="videos"
      ref={sectionRef}
      className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative scroll-mt-20 bg-[#FDFDFC]"
    >
      {/* Header in Editorial Style */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
          Mídia & Transmissões
        </span>
        <h2
          id="section-title-videos"
          className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
        >
          Viva Novamente Estes Momentos
        </h2>
        <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
        <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
          Assista às mensagens inspiradoras, ministrações de louvor e transmissões que tocaram vidas na Catedral de Amor e Fé.
        </p>
      </div>

      {/* Main Spotlight Video Carousel */}
      <div className="relative mb-12" ref={featuredSectionRef}>
        {/* Navigation Arrows */}
        {videos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Vídeo anterior"
              className="absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white border border-neutral-300 text-neutral-800 flex items-center justify-center transition-all shadow-md cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              aria-label="Próximo vídeo"
              className="absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white hover:bg-[#1A1A1A] hover:text-white border border-neutral-300 text-neutral-800 flex items-center justify-center transition-all shadow-md cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Featured Video Card */}
        {currentFeatured && (
          <div
            id="featured-video-card"
            className="relative rounded-sm overflow-hidden border border-neutral-200/90 bg-white shadow-sm group grid grid-cols-1 lg:grid-cols-12 min-h-[380px] sm:min-h-[440px]"
          >
            {/* Left Media Area: Live Video Player / YouTube Embed / Persistent Video Preview */}
            <div className="lg:col-span-7 relative h-72 sm:h-80 lg:h-full min-h-[280px] overflow-hidden bg-black flex items-center justify-center">
              {isCurrentYouTube ? (
                /* YouTube Embed Responsive */
                <iframe
                  src={formatYouTubeEmbedUrl(currentFeatured.videoUrl, false)}
                  title={currentFeatured.title}
                  className="w-full h-full border-0 absolute inset-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                /* HTML5 / IndexedDB / MP4 Video Player - Controlled Playback only when viewing this section */
                <div className="relative w-full h-full group/player cursor-pointer" onClick={toggleInlinePlay}>
                  <video
                    ref={featuredVideoRef}
                    key={currentVideoSrc}
                    src={currentVideoSrc}
                    loop
                    muted={isInlineMuted}
                    playsInline
                    preload="auto"
                    poster={currentFeatured.thumbnailUrl}
                    onPlay={() => setIsInlinePlaying(true)}
                    onPause={() => setIsInlinePlaying(false)}
                    onError={() => {
                      setVideoErrorMap((prev) => ({ ...prev, [currentFeatured.id]: true }));
                      if (featuredVideoRef.current && featuredVideoRef.current.src !== FALLBACK_STREAM_VIDEO) {
                        featuredVideoRef.current.src = FALLBACK_STREAM_VIDEO;
                        featuredVideoRef.current.load();
                        featuredVideoRef.current.play().catch(() => {});
                      }
                    }}
                    className="w-full h-full object-cover object-center"
                  />

                  {/* Gentle Gradient for Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Floating Action Controls on Top of Video */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-sm bg-black/75 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Em Reprodução</span>
                    </span>
                  </div>

                  {/* Bottom Right Floating Controls */}
                  <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={toggleInlinePlay}
                      aria-label={isInlinePlaying ? 'Pausar' : 'Reproduzir'}
                      className="p-2 rounded-full bg-black/75 hover:bg-[#C5A059] text-white backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/15"
                      title={isInlinePlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isInlinePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>

                    {/* Mute/Unmute Button */}
                    <button
                      onClick={toggleInlineSound}
                      aria-label={isInlineMuted ? 'Ativar som' : 'Silenciar'}
                      className={`px-3 py-1.5 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer border flex items-center gap-1.5 text-[10px] font-bold ${
                        !isInlineMuted
                          ? 'bg-[#C5A059] text-white border-[#C5A059] ring-2 ring-[#C5A059]/40 shadow-lg'
                          : 'bg-black/75 hover:bg-[#C5A059] text-white border-white/20'
                      }`}
                      title={isInlineMuted ? 'Ativar Som' : 'Som Ativo (Clique para silenciar)'}
                    >
                      {isInlineMuted ? (
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

                    {/* Maximize to Modal Button */}
                    <button
                      onClick={() => handleOpenVideoModal(currentFeatured)}
                      aria-label="Abrir em ecrã completo"
                      className="p-2 rounded-full bg-black/75 hover:bg-[#C5A059] text-white backdrop-blur-md transition-all shadow-md cursor-pointer border border-white/15"
                      title="Assistir em Ecrã Inteiro / HD"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-sm bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                    <Clock className="w-3 h-3 text-[#C5A059]" />
                    <span>{currentFeatured.duration}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Info Details */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20">
                    {currentFeatured.category}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-light flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    {currentFeatured.date}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-editorial italic text-neutral-900 mb-3 group-hover:text-[#C5A059] transition-colors leading-snug">
                  {currentFeatured.title}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed mb-6">
                  {currentFeatured.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-neutral-100">
                <button
                  onClick={() => handleOpenVideoModal(currentFeatured)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-5 text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] rounded-sm shadow-sm transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Assistir em Ecrã Cheio</span>
                </button>

                <button
                  onClick={() => handleShareVideo(currentFeatured)}
                  className="p-2.5 rounded-sm bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer"
                  title="Partilhar vídeo"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Carousel Pagination Dots */}
        {videos.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {videos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsAutoPlayingCarousel(false);
                  setCurrentIndex(idx);
                }}
                aria-label={`Ir para o vídeo ${idx + 1}`}
                className={`h-1.5 transition-all cursor-pointer rounded-sm ${
                  currentIndex === idx
                    ? 'w-6 bg-[#C5A059]'
                    : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {videos.map((video, idx) => (
          <div
            key={video.id}
            id={`video-card-${video.id}`}
            onClick={() => {
              setCurrentIndex(idx);
              handleOpenVideoModal(video);
            }}
            className={`group rounded-sm overflow-hidden border bg-white p-3 transition-all duration-300 cursor-pointer ${
              currentIndex === idx
                ? 'border-[#C5A059] shadow-sm'
                : 'border-neutral-200/80 hover:border-neutral-900 shadow-sm'
            }`}
          >
            <div className="relative h-40 rounded-sm overflow-hidden mb-3 bg-neutral-900">
              <Image
                src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80'}
                alt={video.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-white/95 text-neutral-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-[#C5A059]" />
                </div>
              </div>

              <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[9px] font-bold bg-black/80 text-white rounded-sm">
                {video.duration}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-editorial italic text-neutral-900 line-clamp-1 group-hover:text-[#C5A059] transition-colors mb-1">
              {video.title}
            </h4>
            <p className="text-[11px] text-neutral-500 font-light line-clamp-2 leading-relaxed">
              {video.description}
            </p>
          </div>
        ))}
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          id="video-player-modal"
          onClick={handleCloseVideo}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div
            className="relative w-full max-w-4xl bg-neutral-950 rounded-sm overflow-hidden border border-white/20 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30">
                  {selectedVideo.category}
                </span>
                <h3 className="text-sm sm:text-base font-editorial italic text-white truncate max-w-md">
                  {selectedVideo.title}
                </h3>
              </div>
              <button
                onClick={handleCloseVideo}
                className="p-2 rounded-sm bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Responsive Container */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              {isYouTubeVideoUrl(selectedVideo.videoUrl) ? (
                <iframe
                  src={formatYouTubeEmbedUrl(selectedVideo.videoUrl, true)}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Bottom Details */}
            <div className="p-5 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-300 font-light leading-relaxed">
                  {selectedVideo.description}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-[#C5A059] mt-1">
                  Duração: {selectedVideo.duration} • Igreja Catedral de Amor e Fé
                </p>
              </div>

              <button
                onClick={() => handleShareVideo(selectedVideo)}
                className="flex items-center justify-center gap-2 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white bg-[#C5A059] hover:bg-[#B58E45] rounded-sm transition-colors whitespace-nowrap cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copiado' : 'Partilhar Vídeo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
