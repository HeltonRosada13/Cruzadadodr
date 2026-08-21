'use client';

import React, { useState, useRef } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { PhotoItem, ChurchEvent } from '@/lib/types';
import { saveHeroVideoBlob, clearHeroVideoBlob, saveVideoFileBlob, generateVideoThumbnailAndDuration } from '@/lib/videoStorage';
import { processAndOptimizeImage } from '@/lib/imageUtils';
import { AdminHighlightsTab } from '@/components/AdminHighlightsTab';
import { isYouTubeVideoUrl, formatYouTubeEmbedUrl } from '@/lib/utils';
import Image from 'next/image';
import { 
  Settings, 
  X, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Calendar, 
  Share2, 
  Phone, 
  Info,
  CheckCircle2,
  Sparkles,
  Star,
  Link2,
  FileText,
  FolderOpen,
  UploadCloud,
  Film,
  PlayCircle,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Eye,
  Cloud,
  Database,
  Camera,
  Upload,
  Check,
  Layers,
  Pencil,
  MapPin,
  Clock,
  User,
  MessageCircle,
  Globe,
  Copy,
  Download
} from 'lucide-react';

export function AdminManagerModal() {
  const { isAdminOpen } = useChurch();
  if (!isAdminOpen) return null;
  return <AdminManagerModalInner />;
}

function AdminManagerModalInner() {
  const { 
    data, 
    isAdminOpen, 
    setIsAdminOpen, 
    updateCurrentActivity, 
    updateChurchInfo,
    addPhoto,
    addBatchPhotos,
    removePhoto,
    addVideo,
    removeVideo,
    setPrimaryFeaturedVideo,
    resetVideosToDefaults,
    clearAllOldVideos,
    addUpcomingEvent,
    updateUpcomingEvent,
    removeUpcomingEvent,
    updateSocialLink,
    resetToDefaults,
    addHighlight,
    updateHighlight,
    removeHighlight,
    resetHighlightsToDefaults,
    syncNowWithCloud,
    syncState,
    firebaseProjectId,
    isQuotaExceeded,
    firebaseConsoleUrl
  } = useChurch();

  const [activeTab, setActiveTab] = useState<'activity' | 'highlights' | 'photos' | 'videos' | 'social' | 'church' | 'events' | 'cloud'>('activity');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Video Upload States
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);
  const [uploadedVideoSize, setUploadedVideoSize] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const galleryVideoFileInputRef = useRef<HTMLInputElement>(null);
  const galleryBatchVideoFileInputRef = useRef<HTMLInputElement>(null);
  const [isGalleryVideoUploading, setIsGalleryVideoUploading] = useState(false);
  const [isBatchVideoUploading, setIsBatchVideoUploading] = useState(false);
  const [batchVideoUploadProgress, setBatchVideoUploadProgress] = useState<string | null>(null);
  const [uploadedGalleryVideoId, setUploadedGalleryVideoId] = useState<string | null>(null);
  const [uploadedGalleryVideoMeta, setUploadedGalleryVideoMeta] = useState<{ name: string; size: string } | null>(null);
  const [setAsFeaturedImmediately, setSetAsFeaturedImmediately] = useState(true);
  const [replaceOldVideosOnUpload, setReplaceOldVideosOnUpload] = useState(false);
  const [setAsHeroVideoOnUpload, setSetAsHeroVideoOnUpload] = useState(true);

  // Photo / Image Upload States & File Input Refs
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const photoBatchFileInputRef = useRef<HTMLInputElement>(null);
  const heroImageFileInputRef = useRef<HTMLInputElement>(null);
  const videoThumbFileInputRef = useRef<HTMLInputElement>(null);
  const eventImageFileInputRef = useRef<HTMLInputElement>(null);
  const editEventImageFileInputRef = useRef<HTMLInputElement>(null);

  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [isBatchPhotoUploading, setIsBatchPhotoUploading] = useState(false);
  const [isHeroImageUploading, setIsHeroImageUploading] = useState(false);
  const [isVideoThumbUploading, setIsVideoThumbUploading] = useState(false);
  const [isEventImageUploading, setIsEventImageUploading] = useState(false);
  const [isEditEventImageUploading, setIsEditEventImageUploading] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [uploadedPhotoMeta, setUploadedPhotoMeta] = useState<{ name: string; size: string } | null>(null);

  // Form states initialized directly from current church data
  const [activityForm, setActivityForm] = useState(data.currentActivity);
  const [churchForm, setChurchForm] = useState({
    churchName: data.churchName,
    churchMotto: data.churchMotto,
    phone: data.phone,
    whatsappNumber: data.whatsappNumber,
    whatsappMessage: data.whatsappMessage,
    email: data.email,
    address: data.address,
    cityCountry: data.cityCountry,
  });

  // New photo input states
  const [newPhoto, setNewPhoto] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'Louvor' as const,
    date: 'Atividade Recente',
    photographer: 'Comunicação Oficial',
  });

  // New video input states
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    videoUrl: '',
    duration: '05:00 min',
    category: 'Destaques',
    date: 'Atividade Oficial',
  });

  // New event input states
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'Geral',
    date: '',
    time: '19h00',
    location: 'Templo Central',
    description: '',
    fullDetails: '',
    imageUrl: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=800&q=80',
    speaker: 'Conselho Pastoral',
    featured: false,
  });

  // Edit event state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventForm, setEditingEventForm] = useState<ChurchEvent | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Handler for Single Gallery Photo File Selection
  const handleProcessGalleryPhotoFile = async (file: File) => {
    if (!file) return;
    try {
      setIsPhotoUploading(true);
      const result = await processAndOptimizeImage(file);
      
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      setNewPhoto((prev) => ({
        ...prev,
        imageUrl: result.dataUrl,
        title: prev.title.trim() ? prev.title : cleanName,
      }));

      setUploadedPhotoMeta({
        name: file.name,
        size: result.formattedSize,
      });

      showNotification(`Foto "${file.name}" carregada e otimizada! Clique em "Publicar Fotografia" para salvar.`);
    } catch (err) {
      console.error('Error uploading photo:', err);
      showNotification('Erro ao carregar imagem. Verifique se é um arquivo JPEG, PNG ou WebP válido.');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  // Handler for Multiple / Batch Gallery Photos Upload
  const handleProcessBatchGalleryPhotos = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    try {
      setIsBatchPhotoUploading(true);
      const batchList: Omit<PhotoItem, 'id'>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const result = await processAndOptimizeImage(file);
          const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

          batchList.push({
            title: cleanName || `Momento Catedral #${data.photos.length + batchList.length + 1}`,
            description: 'Fotografia oficial da igreja catedral de amor e fé',
            imageUrl: result.dataUrl,
            category: newPhoto.category || 'Louvor',
            date: 'Atividade Recente',
            photographer: 'Comunicação Oficial',
          });
        }
      }
      if (batchList.length > 0) {
        addBatchPhotos(batchList);
        showNotification(`${batchList.length} fotografias foram publicadas na galeria com sucesso e salvas!`);
      }
    } catch (err) {
      console.error('Error batch uploading photos:', err);
      showNotification('Erro ao carregar o lote de fotos.');
    } finally {
      setIsBatchPhotoUploading(false);
    }
  };

  // Handler for Hero / Activity Banner Cover Photo
  const handleProcessHeroImageFile = async (file: File) => {
    if (!file) return;
    try {
      setIsHeroImageUploading(true);
      const result = await processAndOptimizeImage(file, 1920, 1080, 0.88);
      const updated = {
        ...activityForm,
        heroImage: result.dataUrl,
      };
      setActivityForm(updated);
      updateCurrentActivity({ heroImage: result.dataUrl });
      showNotification(`Foto de capa do Hero atualizada com sucesso (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading hero image:', err);
      showNotification('Erro ao carregar imagem de capa.');
    } finally {
      setIsHeroImageUploading(false);
    }
  };

  // Handler for Video Thumbnail Image
  const handleProcessVideoThumbFile = async (file: File) => {
    if (!file) return;
    try {
      setIsVideoThumbUploading(true);
      const result = await processAndOptimizeImage(file, 1280, 720, 0.85);
      setNewVideo((prev) => ({
        ...prev,
        thumbnailUrl: result.dataUrl,
      }));
      showNotification(`Miniatura do vídeo carregada (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading video thumb:', err);
      showNotification('Erro ao carregar miniatura.');
    } finally {
      setIsVideoThumbUploading(false);
    }
  };

  // Handler for Event Cover Image
  const handleProcessEventImageFile = async (file: File) => {
    if (!file) return;
    try {
      setIsEventImageUploading(true);
      const result = await processAndOptimizeImage(file, 1280, 720, 0.85);
      setNewEvent((prev) => ({
        ...prev,
        imageUrl: result.dataUrl,
      }));
      showNotification(`Foto de divulgação do evento carregada (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading event image:', err);
      showNotification('Erro ao carregar foto do evento.');
    } finally {
      setIsEventImageUploading(false);
    }
  };

  // Handler for Edit Event Cover Image
  const handleProcessEditEventImageFile = async (file: File) => {
    if (!file) return;
    try {
      setIsEditEventImageUploading(true);
      const result = await processAndOptimizeImage(file, 1280, 720, 0.85);
      setEditingEventForm((prev) => prev ? ({
        ...prev,
        imageUrl: result.dataUrl,
      }) : null);
      showNotification(`Foto de divulgação do evento atualizada (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading edit event image:', err);
      showNotification('Erro ao atualizar foto do evento.');
    } finally {
      setIsEditEventImageUploading(false);
    }
  };

  const handleProcessVideoFile = async (file: File) => {
    if (!file) return;
    
    // Check if valid video file
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|ogg|m4v)$/i)) {
      showNotification('Por favor selecione um ficheiro de vídeo válido (MP4, WebM, MOV, etc.).');
      return;
    }

    try {
      setIsVideoProcessing(true);
      const objectUrl = await saveHeroVideoBlob(file);
      
      const newActivity = {
        ...activityForm,
        heroVideo: objectUrl,
      };

      setActivityForm(newActivity);
      updateCurrentActivity(newActivity);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: objectUrl } }));
      }

      setUploadedVideoName(file.name);
      setUploadedVideoSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
      showNotification(`Vídeo "${file.name}" carregado com sucesso! Já está a funcionar na página inicial.`);
    } catch (err) {
      console.error('Error processing video:', err);
      showNotification('Erro ao carregar o vídeo. Tente novamente.');
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleClearCustomVideo = async () => {
    await clearHeroVideoBlob();
    const defaultVideo = 'https://assets.mixkit.co/videos/preview/mixkit-hands-raised-in-a-church-service-41846-large.mp4';
    const newActivity = {
      ...activityForm,
      heroVideo: defaultVideo,
    };
    setActivityForm(newActivity);
    updateCurrentActivity(newActivity);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: null } }));
    }
    setUploadedVideoName(null);
    setUploadedVideoSize(null);
    showNotification('Vídeo restaurado para a versão padrão.');
  };

  const handleSelectPresetVideo = async (url: string, name: string) => {
    await clearHeroVideoBlob();
    const newActivity = {
      ...activityForm,
      heroVideo: url,
    };
    setActivityForm(newActivity);
    updateCurrentActivity(newActivity);
    syncNowWithCloud();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: null } }));
    }
    setUploadedVideoName(name);
    setUploadedVideoSize(null);
    showNotification(`Vídeo "${name}" selecionado e sincronizado com todos os telemóveis e computadores!`);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentActivity(activityForm);
    syncNowWithCloud();
    showNotification('Atividade principal salva com sucesso! Todas as alterações foram gravadas permanentemente.');
  };

  const handleSaveChurchInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateChurchInfo(churchForm);
    syncNowWithCloud();
    showNotification('Dados de contacto e da igreja salvos com sucesso!');
  };

  const handleAddPhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhoto.title || !newPhoto.imageUrl) return;
    addPhoto(newPhoto);
    setNewPhoto({
      title: '',
      description: '',
      imageUrl: '',
      category: 'Louvor',
      date: 'Atividade Recente',
      photographer: 'Comunicação Oficial',
    });
    showNotification('Fotografia adicionada à galeria!');
  };

  // Handler for Videos / Photos in the Videos Gallery Section
  const handleProcessGalleryVideoFile = async (file: File) => {
    if (!file) return;
    try {
      setIsGalleryVideoUploading(true);
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|ogg|m4v|avi)$/i)) {
        const { thumbnailDataUrl, durationFormatted } = await generateVideoThumbnailAndDuration(file);
        const videoId = 'v-' + Date.now().toString();
        setUploadedGalleryVideoId(videoId);
        const blobUrl = await saveVideoFileBlob(videoId, file);

        setNewVideo((prev) => ({
          ...prev,
          title: prev.title || cleanTitle,
          videoUrl: blobUrl,
          thumbnailUrl: thumbnailDataUrl,
          duration: durationFormatted,
        }));
        setUploadedGalleryVideoMeta({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        });
        showNotification(`Vídeo "${file.name}" carregado das suas pastas com sucesso!`);
      } else if (file.type.startsWith('image/')) {
        const imgRes = await processAndOptimizeImage(file, 1280, 720, 0.85);
        setUploadedGalleryVideoId(null);
        setNewVideo((prev) => ({
          ...prev,
          title: prev.title || cleanTitle,
          thumbnailUrl: imgRes.dataUrl,
          videoUrl: prev.videoUrl || imgRes.dataUrl,
          duration: prev.duration || '03:00 min',
        }));
        setUploadedGalleryVideoMeta({
          name: file.name,
          size: imgRes.formattedSize,
        });
        showNotification(`Foto "${file.name}" carregada das suas pastas para o vídeo!`);
      } else {
        showNotification('Por favor selecione um ficheiro de vídeo ou imagem.');
      }
    } catch (err) {
      console.error('Error processing gallery video:', err);
      showNotification('Erro ao processar ficheiro das suas pastas.');
    } finally {
      setIsGalleryVideoUploading(false);
    }
  };

  // Handler for Batch / Multiple Video Files Upload
  const handleProcessBatchGalleryVideoFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    try {
      setIsBatchVideoUploading(true);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBatchVideoUploadProgress(`A processar vídeo ${i + 1} de ${files.length}: ${file.name}...`);
        const cleanTitle = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase());

        if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|mkv|ogg|m4v|avi)$/i)) {
          const { thumbnailDataUrl, durationFormatted } = await generateVideoThumbnailAndDuration(file);
          const videoId = 'v-' + Date.now().toString() + '-' + i;
          const blobUrl = await saveVideoFileBlob(videoId, file);

          addVideo({
            id: videoId,
            title: cleanTitle || `Vídeo da Atividade #${data.videos.length + i + 1}`,
            description: 'Registo em vídeo da igreja catedral de amor e fé',
            videoUrl: blobUrl,
            thumbnailUrl: thumbnailDataUrl,
            duration: durationFormatted || '05:00 min',
            category: 'Destaques',
            date: 'Atividade Oficial',
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gallery-video-updated', { detail: { id: videoId, blobUrl } }));
          }
          successCount++;
        } else if (file.type.startsWith('image/')) {
          const imgRes = await processAndOptimizeImage(file, 1280, 720, 0.85);
          const videoId = 'v-' + Date.now().toString() + '-' + i;
          addVideo({
            id: videoId,
            title: cleanTitle || `Momento em Vídeo #${data.videos.length + i + 1}`,
            description: 'Registo em destaque',
            videoUrl: imgRes.dataUrl,
            thumbnailUrl: imgRes.dataUrl,
            duration: '03:00 min',
            category: 'Destaques',
            date: 'Atividade Oficial',
          });
          successCount++;
        }
      }
      if (successCount > 0) {
        syncNowWithCloud();
        showNotification(`${successCount} vídeos foram adicionados à galeria com sucesso e salvos!`);
      }
    } catch (err) {
      console.error('Error batch processing videos:', err);
      showNotification('Erro ao processar lote de vídeos.');
    } finally {
      setIsBatchVideoUploading(false);
      setBatchVideoUploadProgress(null);
    }
  };

  const handleAddVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If the user hasn't chosen or typed a video yet, immediately open the device's video & photo folders!
    if (!newVideo.videoUrl) {
      galleryVideoFileInputRef.current?.click();
      return;
    }

    let embedUrl = newVideo.videoUrl.trim();
    let thumbUrl = newVideo.thumbnailUrl ? newVideo.thumbnailUrl.trim() : '';

    const ytMatch = embedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const ytId = ytMatch[1];
      embedUrl = `https://www.youtube.com/embed/${ytId}`;
      if (!thumbUrl) {
        thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }

    if (!thumbUrl) {
      thumbUrl = 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=800&q=80';
    }

    const titleToUse = newVideo.title.trim() || 'Momento em Destaque';
    const finalVideoId = uploadedGalleryVideoId || ('v-' + Date.now().toString());

    if (replaceOldVideosOnUpload) {
      clearAllOldVideos();
    }

    addVideo({
      ...newVideo,
      id: finalVideoId,
      title: titleToUse,
      videoUrl: embedUrl,
      thumbnailUrl: thumbUrl,
    });

    if (setAsHeroVideoOnUpload) {
      clearHeroVideoBlob().catch(() => {});
      updateCurrentActivity({ heroVideo: embedUrl });
      syncNowWithCloud();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: embedUrl } }));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gallery-video-updated', { detail: { id: finalVideoId, blobUrl: embedUrl } }));
    }

    setUploadedGalleryVideoId(null);
    setNewVideo({
      title: '',
      description: '',
      thumbnailUrl: '',
      videoUrl: '',
      duration: '05:00 min',
      category: 'Destaques',
      date: 'Atividade Oficial',
    });
    setUploadedGalleryVideoMeta(null);
    showNotification(
      setAsHeroVideoOnUpload
        ? 'Vídeo publicado na Galeria e definido como Vídeo do Hero no Cabeçalho!'
        : 'Vídeo publicado com sucesso na Galeria do site!'
    );
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    addUpcomingEvent(newEvent);
    setNewEvent({
      title: '',
      category: 'Geral',
      date: '',
      time: '19h00',
      location: 'Templo Central',
      description: '',
      fullDetails: '',
      imageUrl: 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&w=800&q=80',
      speaker: 'Conselho Pastoral',
      featured: false,
    });
    showNotification('Nova atividade cadastrada com sucesso!');
  };

  const handleStartEditEvent = (event: ChurchEvent) => {
    setEditingEventId(event.id);
    setEditingEventForm({ ...event });
  };

  const handleCancelEditEvent = () => {
    setEditingEventId(null);
    setEditingEventForm(null);
  };

  const handleSaveEditedEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId || !editingEventForm) return;
    if (!editingEventForm.title.trim() || !editingEventForm.date.trim()) {
      showNotification('Por favor preencha o título e a data da atividade.');
      return;
    }

    updateUpcomingEvent(editingEventId, editingEventForm);
    showNotification(`Atividade "${editingEventForm.title}" atualizada com sucesso e salva permanentemente!`);
    setEditingEventId(null);
    setEditingEventForm(null);
  };

  return (
    <div
      id="admin-management-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl bg-[#FDFDFC] rounded-sm overflow-hidden border border-neutral-300 shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-neutral-200 bg-white gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#1A1A1A] flex items-center justify-center text-[#C5A059] shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-editorial italic text-neutral-900">
                  Painel de Gestão & Configuração do Portal
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#C5A059]/15 text-[#C5A059] uppercase font-bold tracking-widest border border-[#C5A059]/30">
                  Administrador
                </span>
                {isQuotaExceeded || syncState === 'quota_exceeded' ? (
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 font-semibold border border-amber-300">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                    <span>Modo Local Ativo (Cota Firebase Excedida)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    <Database className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Firebase: {firebaseProjectId}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 font-light mt-0.5">
                {isQuotaExceeded || syncState === 'quota_exceeded' ? (
                  <span>Todas as alterações são salvas localmente no seu navegador e não serão perdidas.</span>
                ) : (
                  <span>Os dados são sincronizados no Google Cloud Firestore do projeto <strong>{firebaseProjectId}</strong>.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={async () => {
                await syncNowWithCloud();
                if (!isQuotaExceeded) {
                  showNotification('Sincronização com Firebase Firestore concluída com sucesso!');
                } else {
                  showNotification('A cota diária gratuita do Firebase ainda está no limite. Alterações salvas localmente.');
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                isQuotaExceeded || syncState === 'quota_exceeded'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-neutral-100 hover:bg-[#C5A059]/15 hover:text-[#91712f] text-neutral-700 border-neutral-200'
              }`}
              title="Testar ou forçar sincronização com Firebase"
            >
              <RefreshCw className={`w-3 h-3 ${syncState === 'syncing' ? 'animate-spin text-[#C5A059]' : ''}`} />
              <span className="hidden sm:inline">
                {syncState === 'syncing' ? 'A Sincronizar...' : 'Sincronizar Cloud'}
              </span>
            </button>
            
            <button
              onClick={() => setIsAdminOpen(false)}
              className="p-2 rounded-sm bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quota Exceeded Warning Banner */}
        {(isQuotaExceeded || syncState === 'quota_exceeded') && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  Cota Diária Gratuita do Firestore Atingida (Free Tier - Spark)
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  O limite diário de 20.000 gravações gratuitas foi atingido. O site está a funcionar perfeitamente com <strong>salvamento local (localStorage)</strong> para não perder nenhum dado. A cota gratuita renova-se automaticamente a cada 24h (à meia-noite PST).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
              <a
                href={firebaseConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                <span>Console Firebase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-3 bg-neutral-50 border-b border-neutral-200 overflow-x-auto">
          {[
            { id: 'activity', label: 'Atividade Principal', icon: Sparkles },
            { id: 'highlights', label: `Destaques (${data.highlights.length})`, icon: Star },
            { id: 'photos', label: `Fotos (${data.photos.length})`, icon: ImageIcon },
            { id: 'videos', label: `Vídeos (${data.videos.length})`, icon: Video },
            { id: 'events', label: `Próximas Atividades (${data.upcomingEvents.length})`, icon: Calendar },
            { id: 'social', label: 'Redes Sociais & Links', icon: Share2 },
            { id: 'church', label: 'Igreja & Contactos', icon: Phone },
            { id: 'cloud', label: 'Nuvem & Vercel', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#1A1A1A] text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200/70 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {/* TAB 1: ATIVIDADE PRINCIPAL */}
          {activeTab === 'activity' && (
            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div className="p-3.5 rounded-sm bg-[#C5A059]/10 border border-[#C5A059]/20 text-xs text-neutral-800 mb-4 font-light">
                Edite os dados que aparecem no Hero e na seção &quot;Sobre a Atividade&quot;. As alterações afetam imediatamente a contagem regressiva e os destaques.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Nome da Atividade
                  </label>
                  <input
                    type="text"
                    value={activityForm.name}
                    onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Subtítulo do Hero
                  </label>
                  <input
                    type="text"
                    value={activityForm.subtitle}
                    onChange={(e) => setActivityForm({ ...activityForm, subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Data e Hora para a Contagem Regressiva (ISO Formato)
                  </label>
                  <input
                    type="datetime-local"
                    value={activityForm.date.slice(0, 16)}
                    onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Texto Exibido da Data (Ex: 25 a 28 de Setembro)
                  </label>
                  <input
                    type="text"
                    value={activityForm.formattedDate}
                    onChange={(e) => setActivityForm({ ...activityForm, formattedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Horário Detalhado
                  </label>
                  <input
                    type="text"
                    value={activityForm.time}
                    onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Local / Templo
                  </label>
                  <input
                    type="text"
                    value={activityForm.location}
                    onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Tema da Atividade
                  </label>
                  <input
                    type="text"
                    value={activityForm.theme}
                    onChange={(e) => setActivityForm({ ...activityForm, theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    required
                  />
                </div>

                {/* SEÇÃO DEDICADA: ESCOLHER VÍDEO DE FUNDO DO HERO */}
                <div className="md:col-span-2 p-4 rounded-sm bg-neutral-50 border-2 border-dashed border-neutral-300 hover:border-black transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#C5A059]" />
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                          Vídeo de Fundo da Atividade Principal
                        </label>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-light mt-0.5">
                        Clique em &quot;Escolher Vídeo&quot; para selecionar um ficheiro de vídeo do seu computador/celular. O vídeo é carregado e começa a funcionar imediatamente na página!
                      </p>
                    </div>

                    {activityForm.heroVideo && (
                      <button
                        type="button"
                        onClick={handleClearCustomVideo}
                        className="text-[10px] uppercase tracking-wider text-neutral-600 hover:text-red-600 flex items-center gap-1 font-semibold cursor-pointer whitespace-nowrap self-start sm:self-auto"
                        title="Restaurar vídeo padrão"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restaurar Padrão</span>
                      </button>
                    )}
                  </div>

                  {/* Hidden Native File Input */}
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/m4v,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleProcessVideoFile(file);
                      }
                    }}
                    className="hidden"
                  />

                  {/* Drag and Drop & Button Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingVideo(true);
                    }}
                    onDragLeave={() => setIsDraggingVideo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingVideo(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleProcessVideoFile(file);
                      }
                    }}
                    className={`p-5 rounded-sm flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                      isDraggingVideo 
                        ? 'bg-[#C5A059]/20 border-2 border-[#C5A059]' 
                        : 'bg-white border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50 shadow-sm'
                    }`}
                    onClick={() => videoFileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center mb-3 shadow-md">
                      {isVideoProcessing ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-[#C5A059]" />
                      ) : (
                        <FolderOpen className="w-5 h-5 text-[#C5A059]" />
                      )}
                    </div>

                    <button
                      type="button"
                      id="btn-escolher-video-pasta"
                      disabled={isVideoProcessing}
                      className="px-5 py-2.5 bg-[#1A1A1A] text-white hover:bg-black rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm mb-2 cursor-pointer transition-all"
                    >
                      <FolderOpen className="w-4 h-4 text-[#C5A059]" />
                      <span>{isVideoProcessing ? 'A carregar ficheiro...' : 'Escolher Vídeo (Abrir Pasta)'}</span>
                    </button>

                    <p className="text-[11px] text-neutral-600 font-medium">
                      ou arraste o ficheiro de vídeo diretamente para aqui
                    </p>
                    <span className="text-[10px] text-neutral-400 mt-1">
                      Formatos suportados: MP4, WebM, MOV, OGG (reprodução contínua otimizada)
                    </span>
                  </div>

                  {/* Active Video Status & Mini Player */}
                  {activityForm.heroVideo && (
                    <div className="p-3 bg-white rounded-sm border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-24 h-14 bg-black rounded-sm overflow-hidden flex-shrink-0 relative border border-neutral-300">
                          {isYouTubeVideoUrl(activityForm.heroVideo) ? (
                            <iframe
                              src={formatYouTubeEmbedUrl(activityForm.heroVideo, false)}
                              className="w-full h-full border-0 pointer-events-none scale-110"
                              title="Preview do Vídeo YouTube"
                            />
                          ) : (
                            <video
                              src={activityForm.heroVideo}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute top-1 right-1 bg-emerald-500 w-2 h-2 rounded-full animate-ping" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">
                              {isYouTubeVideoUrl(activityForm.heroVideo)
                                ? 'Vídeo do YouTube Ativo no Hero'
                                : (uploadedVideoName || 'Vídeo Ativo em Reprodução no Hero')}
                            </span>
                          </div>
                          {uploadedVideoSize && !isYouTubeVideoUrl(activityForm.heroVideo) && (
                            <span className="text-[10px] text-neutral-500 block">
                              Tamanho: {uploadedVideoSize} • Armazenado e sincronizado localmente
                            </span>
                          )}
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            ● Já a funcionar na página principal e sincronizado em todos os aparelhos
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminOpen(false);
                          const el = document.querySelector('#inicio');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-[#C5A059] text-white hover:bg-[#B58E45] rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver no Hero</span>
                      </button>
                    </div>
                  )}

                  {/* Presets and URL Fallback Option */}
                  <div className="pt-3 border-t border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                        Vídeos Oficiais em Nuvem (Sincronização Instantânea em Todos os Telemóveis):
                      </span>
                    </div>

                    <div className="p-2.5 bg-neutral-100/70 border border-neutral-200 rounded-sm">
                      <p className="text-[10px] text-neutral-600 font-light mb-2">
                        💡 <strong>Sincronização Global</strong>: Ao escolher qualquer vídeo abaixo ou inserir um link do YouTube / MP4, a alteração é aplicada <strong>imediatamente em todos os telemóveis e computadores</strong> sem necessidade de publicar em cada aparelho separadamente.
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectPresetVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'Louvor & Culto Congregacional')}
                          className="px-2 py-1.5 rounded-sm bg-white hover:bg-[#C5A059] hover:text-white border border-neutral-300 text-[10px] text-neutral-800 font-semibold transition-all cursor-pointer text-center"
                        >
                          🙏 Louvor & Adoração
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPresetVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', 'Velas & Vigília de Fé')}
                          className="px-2 py-1.5 rounded-sm bg-white hover:bg-[#C5A059] hover:text-white border border-neutral-300 text-[10px] text-neutral-800 font-semibold transition-all cursor-pointer text-center"
                        >
                          🕯️ Vigília & Oração
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPresetVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', 'Coral & Celebração')}
                          className="px-2 py-1.5 rounded-sm bg-white hover:bg-[#C5A059] hover:text-white border border-neutral-300 text-[10px] text-neutral-800 font-semibold transition-all cursor-pointer text-center"
                        >
                          🎶 Coral & Impacto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPresetVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', 'Cruzada & Evangelismo')}
                          className="px-2 py-1.5 rounded-sm bg-white hover:bg-[#C5A059] hover:text-white border border-neutral-300 text-[10px] text-neutral-800 font-semibold transition-all cursor-pointer text-center"
                        >
                          🔥 Cruzada & Fé
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="url"
                        value={activityForm.heroVideo || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          setActivityForm({ ...activityForm, heroVideo: url });
                          if (url) {
                            updateCurrentActivity({ heroVideo: url });
                          }
                        }}
                        placeholder="Cole a URL do YouTube (ex: https://youtu.be/... ou https://youtube.com/watch?v=...) ou .mp4"
                        className="flex-1 px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (activityForm.heroVideo) {
                            await clearHeroVideoBlob();
                            updateCurrentActivity({ heroVideo: activityForm.heroVideo });
                            syncNowWithCloud();
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: activityForm.heroVideo } }));
                            }
                            showNotification('Vídeo do Hero atualizado e sincronizado com sucesso!');
                          }
                        }}
                        className="px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#C5A059] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO DEDICADA: ESCOLHER IMAGEM DE CAPA DO HERO */}
                <div className="md:col-span-2 p-4 rounded-sm bg-neutral-50 border border-neutral-300 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#C5A059]" />
                        <label className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                          Imagem de Fundo / Poster de Capa da Atividade
                        </label>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-light mt-0.5">
                        Carregue uma fotografia da sua galeria ou do computador/celular. A imagem será comprimida em alta definição e exibida no Hero.
                      </p>
                    </div>

                    <input
                      type="file"
                      ref={heroImageFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessHeroImageFile(file);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => heroImageFileInputRef.current?.click()}
                      disabled={isHeroImageUploading}
                      className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#C5A059] text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{isHeroImageUploading ? 'A Carregar Imagem...' : 'Carregar Foto de Capa'}</span>
                    </button>
                  </div>

                  {/* Active Hero Image Preview */}
                  {activityForm.heroImage && (
                    <div className="p-3 bg-white rounded-sm border border-neutral-200 flex items-center gap-3">
                      <div className="w-20 h-14 bg-neutral-100 rounded-sm overflow-hidden flex-shrink-0 relative border border-neutral-300">
                        <Image
                          src={activityForm.heroImage}
                          alt="Poster da Atividade"
                          width={80}
                          height={56}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate">Foto de Capa Ativa</span>
                        </div>
                        <input
                          type="url"
                          value={activityForm.heroImage}
                          onChange={(e) => setActivityForm({ ...activityForm, heroImage: e.target.value })}
                          placeholder="Ou insira a URL direta da imagem"
                          className="mt-1 w-full px-2.5 py-1 rounded-sm bg-neutral-50 border border-neutral-300 text-[11px] text-neutral-700"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Organização Responsável
                  </label>
                  <input
                    type="text"
                    value={activityForm.organization}
                    onChange={(e) => setActivityForm({ ...activityForm, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Público-Alvo
                  </label>
                  <input
                    type="text"
                    value={activityForm.targetAudience}
                    onChange={(e) => setActivityForm({ ...activityForm, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Objetivo da Atividade
                  </label>
                  <textarea
                    rows={2}
                    value={activityForm.goal}
                    onChange={(e) => setActivityForm({ ...activityForm, goal: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Informações Importantes / Avisos
                  </label>
                  <textarea
                    rows={2}
                    value={activityForm.importantNotes}
                    onChange={(e) => setActivityForm({ ...activityForm, importantNotes: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-[10px] uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: GERENCIAR MOMENTOS EM DESTAQUE */}
          {activeTab === 'highlights' && (
            <AdminHighlightsTab
              highlights={data.highlights}
              addHighlight={addHighlight}
              updateHighlight={updateHighlight}
              removeHighlight={removeHighlight}
              resetHighlightsToDefaults={resetHighlightsToDefaults}
              syncNowWithCloud={syncNowWithCloud}
              showNotification={showNotification}
            />
          )}

          {/* TAB 3: GERENCIAR FOTOS */}
          {activeTab === 'photos' && (
            <div className="space-y-6">
              {/* HIDDEN FILE INPUTS */}
              <input
                type="file"
                ref={photoFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessGalleryPhotoFile(file);
                }}
              />
              <input
                type="file"
                ref={photoBatchFileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleProcessBatchGalleryPhotos(files);
                }}
              />

              {/* CARD DE CARREGAMENTO DIRETO DA GALERIA DO DISPOSITIVO */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(true);
                }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 1) {
                    handleProcessBatchGalleryPhotos(files);
                  } else if (files && files[0]) {
                    handleProcessGalleryPhotoFile(files[0]);
                  }
                }}
                className={`p-6 rounded-sm border-2 border-dashed transition-all text-center ${
                  isDraggingPhoto
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : 'border-neutral-300 bg-neutral-50/80 hover:border-black'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center mx-auto mb-3 text-[#C5A059]">
                  {isPhotoUploading || isBatchPhotoUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mb-1">
                  Carregar Fotografias para a Galeria
                </h3>
                <p className="text-xs text-neutral-600 max-w-md mx-auto mb-4 font-light">
                  Selecione fotos do seu telemóvel, computador ou arraste os ficheiros diretamente para esta área. As imagens são otimizadas e publicadas na cloud do Firebase.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    id="btn-escolher-foto-galeria"
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={isPhotoUploading || isBatchPhotoUploading}
                    className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#C5A059] text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <FolderOpen className="w-4 h-4 text-[#C5A059]" />
                    <span>{isPhotoUploading ? 'A Otimizar Foto...' : 'Escolher Foto (Abrir Galeria/Pastas)'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-lote-fotos-galeria"
                    onClick={() => photoBatchFileInputRef.current?.click()}
                    disabled={isPhotoUploading || isBatchPhotoUploading}
                    className="px-4 py-2.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <Layers className="w-4 h-4 text-neutral-600" />
                    <span>{isBatchPhotoUploading ? 'A Carregar Lote...' : 'Carregar Múltiplas Fotos (Lote)'}</span>
                  </button>
                </div>
              </div>

              {/* FORMULÁRIO DE PUBLICAÇÃO DE FOTO COM PRÉ-VISUALIZAÇÃO */}
              <form onSubmit={handleAddPhotoSubmit} className="p-5 rounded-sm bg-white border border-neutral-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-[#C5A059]" /> Detalhes da Fotografia a Publicar
                  </h4>
                  {newPhoto.imageUrl && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Imagem Carregada Pronta
                    </span>
                  )}
                </div>

                {/* Live Photo Preview if Image is Loaded */}
                {newPhoto.imageUrl && (
                  <div className="p-3 bg-neutral-50 rounded-sm border border-neutral-200 flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-200 rounded-sm overflow-hidden flex-shrink-0 relative border border-neutral-300">
                      <Image
                        src={newPhoto.imageUrl}
                        alt="Pré-visualização"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {newPhoto.title || 'Foto sem título'}
                      </p>
                      {uploadedPhotoMeta && (
                        <p className="text-[11px] text-neutral-500">
                          Arquivo: {uploadedPhotoMeta.name} • {uploadedPhotoMeta.size}
                        </p>
                      )}
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                        ● Pronta para publicação na Galeria Oficial
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Título da Foto</label>
                    <input
                      type="text"
                      placeholder="Ex: Coral Catedral em Adoração"
                      value={newPhoto.title}
                      onChange={(e) => setNewPhoto({ ...newPhoto, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Categoria</label>
                    <select
                      value={newPhoto.category}
                      onChange={(e) => setNewPhoto({ ...newPhoto, category: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    >
                      <option value="Louvor">Louvor</option>
                      <option value="Palavra">Palavra</option>
                      <option value="Juventude">Juventude</option>
                      <option value="Comunhão">Comunhão</option>
                      <option value="Famílias">Famílias</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        URL ou Origem da Imagem
                      </label>
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase cursor-pointer"
                      >
                        Carregar Ficheiro da Galeria
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Carregue pelo botão acima ou cole a URL direta da foto"
                      value={newPhoto.imageUrl}
                      onChange={(e) => setNewPhoto({ ...newPhoto, imageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Descrição</label>
                    <input
                      type="text"
                      placeholder="Breve relato sobre este momento da igreja..."
                      value={newPhoto.description}
                      onChange={(e) => setNewPhoto({ ...newPhoto, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" /> 
                    <span>Publicar Fotografia na Galeria</span>
                  </button>
                </div>
              </form>

              {/* Photo List */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                  Fotografias Ativas no Site ({data.photos.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-3 rounded-sm bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3 hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Image
                          src={photo.imageUrl}
                          alt={photo.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-sm object-cover flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-neutral-900 truncate">{photo.title}</p>
                          <span className="text-[9px] uppercase tracking-widest text-[#C5A059] font-medium">{photo.category}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          removePhoto(photo.id);
                          showNotification('Foto removida');
                        }}
                        className="p-2 rounded-sm text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GERENCIAR VÍDEOS */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              {/* HIDDEN GALLERY VIDEO & PHOTO INPUT (SINGLE / SMART MULTI) */}
              <input
                type="file"
                ref={galleryVideoFileInputRef}
                accept="video/*,image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 1) {
                    handleProcessBatchGalleryVideoFiles(files);
                  } else if (files && files[0]) {
                    handleProcessGalleryVideoFile(files[0]);
                  }
                }}
              />

              {/* HIDDEN DEDICATED BATCH VIDEOS INPUT */}
              <input
                type="file"
                ref={galleryBatchVideoFileInputRef}
                accept="video/*,image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleProcessBatchGalleryVideoFiles(files);
                  }
                }}
              />

              {/* Informative Multi-Video Support Banner */}
              <div className="p-4 rounded-sm bg-[#C5A059]/10 border border-[#C5A059]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Film className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Suporte Completo a Múltiplos Vídeos na Galeria
                    </h4>
                    <p className="text-xs text-neutral-600 font-light mt-0.5">
                      Pode publicar quantos vídeos desejar. Selecione múltiplos ficheiros de vídeo de uma só vez ou adicione links do YouTube. Todos ficam disponíveis na galeria interativa com player e miniaturas.
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-white/80 rounded-sm border border-[#C5A059]/30 text-[#C5A059] font-bold text-[10px] uppercase tracking-wider shrink-0">
                  {data.videos.length} {data.videos.length === 1 ? 'Vídeo Publicado' : 'Vídeos Publicados'}
                </div>
              </div>

              {/* UPLOAD HERO / FOLDER PICKER ZONE */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(true);
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingVideo(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 1) {
                    handleProcessBatchGalleryVideoFiles(files);
                  } else if (files && files[0]) {
                    handleProcessGalleryVideoFile(files[0]);
                  }
                }}
                className={`p-6 rounded-sm border-2 border-dashed transition-all text-center ${
                  isDraggingVideo
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : 'border-neutral-300 bg-neutral-50/90 hover:border-neutral-400'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-neutral-200 flex items-center justify-center mx-auto mb-3 text-[#C5A059]">
                  {isGalleryVideoUploading || isBatchVideoUploading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-[#C5A059]" />
                  ) : (
                    <FolderOpen className="w-6 h-6 text-[#C5A059]" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-widest mb-1">
                  Carregar Vídeos das Pastas ou Galeria do Dispositivo
                </h3>
                <p className="text-xs text-neutral-600 max-w-lg mx-auto mb-4 font-light leading-relaxed">
                  Abra as pastas do seu computador ou celular. Suporta carregar <strong>1 vídeo por vez</strong> ou <strong>vários vídeos em lote simultaneamente</strong> (MP4, WebM, MOV) com geração automática de miniaturas e duração.
                </p>

                {isBatchVideoUploading && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-sm text-center max-w-md mx-auto">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059] mx-auto mb-1" />
                    <p className="text-xs font-bold text-neutral-900">
                      {batchVideoUploadProgress || 'A processar e salvar múltiplos vídeos...'}
                    </p>
                    <span className="text-[10px] text-neutral-500">Por favor aguarde enquanto geramos as miniaturas</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    id="btn-abrir-pastas-videos-fotos"
                    onClick={() => galleryVideoFileInputRef.current?.click()}
                    disabled={isGalleryVideoUploading || isBatchVideoUploading}
                    className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#C5A059] text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <FolderOpen className="w-4 h-4 text-[#C5A059]" />
                    <span>{isGalleryVideoUploading ? 'A Carregar Ficheiro...' : 'Escolher 1 Vídeo'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-carregar-lote-videos"
                    onClick={() => galleryBatchVideoFileInputRef.current?.click()}
                    disabled={isGalleryVideoUploading || isBatchVideoUploading}
                    className="px-5 py-2.5 bg-[#C5A059] hover:bg-neutral-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer transition-all"
                  >
                    <Film className="w-4 h-4 text-white" />
                    <span>{isBatchVideoUploading ? 'A Processar Lote...' : 'Carregar Vários Vídeos (Lote)'}</span>
                  </button>
                </div>
              </div>

              {/* VIDEO DETAILS FORM */}
              <form onSubmit={handleAddVideoSubmit} className="p-5 rounded-sm bg-neutral-50 border border-neutral-200 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#C5A059]" /> Publicar Vídeo Individual ou Link YouTube
                  </h3>
                  <button
                    type="button"
                    onClick={() => galleryVideoFileInputRef.current?.click()}
                    className="text-[11px] text-[#C5A059] hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Escolher das Pastas</span>
                  </button>
                </div>

                {/* Uploaded Video File Preview Badge */}
                {uploadedGalleryVideoMeta && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-900 font-medium truncate">
                        Ficheiro Selecionado: <strong>{uploadedGalleryVideoMeta.name}</strong> ({uploadedGalleryVideoMeta.size})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => galleryVideoFileInputRef.current?.click()}
                      className="text-[10px] text-emerald-700 hover:underline font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Trocar Ficheiro
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">
                      Título do Vídeo
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Momento de Louvor e Adoração"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">
                      Duração (Ex: 05:20 min)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 08:30 min"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        Link do Vídeo ou Ficheiro Local
                      </label>
                      <button
                        type="button"
                        onClick={() => galleryVideoFileInputRef.current?.click()}
                        className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Abrir Pastas do Dispositivo</span>
                      </button>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=... ou selecione um ficheiro das pastas"
                        value={newVideo.videoUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                          const autoThumb = ytMatch && ytMatch[1] ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : newVideo.thumbnailUrl;
                          setNewVideo({ 
                            ...newVideo, 
                            videoUrl: url,
                            thumbnailUrl: autoThumb || newVideo.thumbnailUrl
                          });
                        }}
                        className="flex-1 px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                      <button
                        type="button"
                        onClick={() => galleryVideoFileInputRef.current?.click()}
                        className="px-3.5 py-2 bg-neutral-800 hover:bg-black text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="Abrir Pastas e Galeria"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Pastas</span>
                      </button>
                    </div>
                  </div>

                  {newVideo.thumbnailUrl && (
                    <div className="md:col-span-2 p-3 bg-white rounded-sm border border-neutral-200 flex items-center gap-3">
                      <Image
                        src={newVideo.thumbnailUrl}
                        alt="Pré-visualização do vídeo"
                        width={64}
                        height={40}
                        className="w-16 h-10 rounded-sm object-cover bg-neutral-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="truncate text-xs text-neutral-700">
                        <span className="font-bold text-neutral-900 block truncate">Miniatura Pronta</span>
                        <span className="text-[10px] text-neutral-500 font-light truncate">{newVideo.duration} • Pronto para publicação</span>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">
                      Descrição do Vídeo
                    </label>
                    <input
                      type="text"
                      placeholder="Resumo do conteúdo do vídeo..."
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 space-y-2 border-t border-neutral-200">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-neutral-800">
                      <input
                        type="checkbox"
                        checked={setAsHeroVideoOnUpload}
                        onChange={(e) => setSetAsHeroVideoOnUpload(e.target.checked)}
                        className="rounded text-[#C5A059] focus:ring-0 cursor-pointer"
                      />
                      <span>Exibir também no Hero (Vídeo Principal do Cabeçalho da Página)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-700">
                      <input
                        type="checkbox"
                        checked={replaceOldVideosOnUpload}
                        onChange={(e) => setReplaceOldVideosOnUpload(e.target.checked)}
                        className="rounded text-[#C5A059] focus:ring-0 cursor-pointer"
                      />
                      <span>Substituir galeria anterior (manter apenas este vídeo novo como destaque único)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    id="btn-publicar-video"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-sm text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-[#C5A059]" />
                    <span>Publicar Vídeo</span>
                  </button>
                </div>
              </form>

              {/* Video List */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                    Vídeos na Galeria do Site ({data.videos.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        clearAllOldVideos();
                        showNotification('Todos os vídeos foram removidos da galeria.');
                      }}
                      className="text-[10px] text-red-600 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Limpar Todos os Vídeos
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetVideosToDefaults();
                        showNotification('Galeria restaurada para os vídeos padrão.');
                      }}
                      className="text-[10px] text-neutral-600 hover:text-neutral-900 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Restaurar Padrão
                    </button>
                  </div>
                </div>

                {data.videos.length === 0 ? (
                  <div className="p-6 text-center bg-neutral-50 rounded-sm border border-neutral-200">
                    <p className="text-xs text-neutral-500 mb-3">Nenhum vídeo publicado no momento.</p>
                    <button
                      type="button"
                      onClick={() => galleryVideoFileInputRef.current?.click()}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#C5A059] transition-colors cursor-pointer"
                    >
                      Carregar Primeiro Vídeo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.videos.map((vid, index) => {
                      const isFeatured = index === 0;
                      return (
                        <div
                          key={vid.id}
                          className={`p-3 rounded-sm border flex flex-col justify-between gap-3 transition-all ${
                            isFeatured
                              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/50'
                              : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-3 overflow-hidden">
                            <div className="relative w-16 h-12 rounded-sm overflow-hidden flex-shrink-0 bg-neutral-200">
                              <Image
                                src={vid.thumbnailUrl}
                                alt={vid.title}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="truncate flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {isFeatured ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#C5A059] text-white rounded-xs">
                                    ★ Destaque Principal
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium text-neutral-500">
                                    Posição #{index + 1}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-neutral-900 truncate">{vid.title}</p>
                              <span className="text-[10px] text-[#C5A059] font-medium">{vid.duration}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-xs gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              {!isFeatured ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrimaryFeaturedVideo(vid.id);
                                    showNotification(`"${vid.title}" definido como vídeo de destaque principal!`);
                                  }}
                                  className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  ★ Destaque
                                </button>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                  ★ Topo
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={async () => {
                                  await clearHeroVideoBlob();
                                  updateCurrentActivity({ heroVideo: vid.videoUrl });
                                  syncNowWithCloud();
                                  if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: vid.videoUrl } }));
                                  }
                                  showNotification(`"${vid.title}" definido como Vídeo do Hero no Cabeçalho!`);
                                }}
                                className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                title="Definir este vídeo como fundo principal do Hero"
                              >
                                🎬 Usar no Hero
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                removeVideo(vid.id);
                                showNotification('Vídeo removido da galeria');
                              }}
                              className="p-1.5 rounded-sm text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-auto"
                              title="Remover vídeo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRÓXIMAS ATIVIDADES */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* HIDDEN EVENT IMAGE INPUTS */}
              <input
                type="file"
                ref={eventImageFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessEventImageFile(file);
                }}
              />
              <input
                type="file"
                ref={editEventImageFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessEditEventImageFile(file);
                }}
              />

              {/* EDIT FORM (WHEN EDITING AN EXISTING EVENT) */}
              {editingEventId && editingEventForm ? (
                <form
                  onSubmit={handleSaveEditedEvent}
                  className="p-5 rounded-sm bg-amber-50/50 border-2 border-[#C5A059]/60 shadow-md space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between border-b border-[#C5A059]/30 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#C5A059] text-white flex items-center justify-center">
                        <Pencil className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#9A7B38] block">
                          Modo de Edição Ativo
                        </span>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Editar Atividade: {editingEventForm.title || 'Sem título'}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelEditEvent}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:text-black bg-white hover:bg-neutral-100 rounded-sm border border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" /> Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Título da Atividade / Evento *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Noite de Avivamento e Louvor"
                        value={editingEventForm.title}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Categoria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Juventude, Famílias, Louvor, Cruzada, Doutrina"
                        value={editingEventForm.category}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Data (Ex: 15 de Outubro de 2026) *
                      </label>
                      <input
                        type="text"
                        value={editingEventForm.date}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Horário (Ex: 19h00)
                      </label>
                      <input
                        type="text"
                        value={editingEventForm.time}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Local do Evento
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Templo Central / Sala Multiuso"
                        value={editingEventForm.location}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Preletor / Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Bispo Manuel & Pastores Convidados"
                        value={editingEventForm.speaker || ''}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, speaker: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700">
                          Foto / Cartaz de Divulgação
                        </label>
                        <button
                          type="button"
                          onClick={() => editEventImageFileInputRef.current?.click()}
                          disabled={isEditEventImageUploading}
                          className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{isEditEventImageUploading ? 'A Carregar...' : 'Trocar Foto'}</span>
                        </button>
                      </div>

                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingEventForm.imageUrl}
                          onChange={(e) => setEditingEventForm({ ...editingEventForm, imageUrl: e.target.value })}
                          placeholder="Cole a URL ou carregue do seu computador"
                          className="flex-1 px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                        />
                        <button
                          type="button"
                          onClick={() => editEventImageFileInputRef.current?.click()}
                          className="px-3 py-2 bg-neutral-800 hover:bg-black text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Carregar Nova</span>
                        </button>
                      </div>

                      {editingEventForm.imageUrl && (
                        <div className="mt-2 flex items-center gap-3 p-2 bg-white rounded-sm border border-neutral-200">
                          <div className="relative w-16 h-10 rounded-sm overflow-hidden bg-neutral-100 flex-shrink-0">
                            <Image
                              src={editingEventForm.imageUrl}
                              alt="Pré-visualização"
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="text-[11px] text-neutral-700 truncate">
                            <span className="font-bold text-neutral-900">Foto atual do cartaz</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Pequena Descrição (Exibida no Card)
                      </label>
                      <input
                        type="text"
                        value={editingEventForm.description}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                        Detalhes Completos para o Modal &quot;Saber Mais&quot;
                      </label>
                      <textarea
                        rows={3}
                        value={editingEventForm.fullDetails}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, fullDetails: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-event-featured"
                        checked={!!editingEventForm.featured}
                        onChange={(e) => setEditingEventForm({ ...editingEventForm, featured: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-300 text-[#C5A059] focus:ring-[#C5A059] cursor-pointer"
                      />
                      <label htmlFor="edit-event-featured" className="text-xs font-bold text-neutral-800 cursor-pointer">
                        ★ Marcar como Atividade em Destaque Especial
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#C5A059]/30">
                    <button
                      type="button"
                      onClick={handleCancelEditEvent}
                      className="px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-colors cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5 text-[#C5A059]" /> Salvar Alterações da Atividade
                    </button>
                  </div>
                </form>
              ) : (
                /* CREATE NEW EVENT FORM */
                <form onSubmit={handleAddEventSubmit} className="p-5 rounded-sm bg-neutral-50 border border-neutral-200 space-y-4">
                  <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-[#C5A059]" /> Cadastrar Nova Atividade / Evento
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Título do Evento *</label>
                      <input
                        type="text"
                        placeholder="Ex: Noite de Avivamento e Louvor"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Juventude, Famílias, Louvor, Cruzada"
                        value={newEvent.category}
                        onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Data (Ex: 15 de Outubro de 2026) *</label>
                      <input
                        type="text"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Horário</label>
                      <input
                        type="text"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Local</label>
                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Preletor / Responsável</label>
                      <input
                        type="text"
                        placeholder="Ex: Conselho Pastoral"
                        value={newEvent.speaker}
                        onChange={(e) => setNewEvent({ ...newEvent, speaker: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                          Foto de Divulgação do Evento
                        </label>
                        <button
                          type="button"
                          onClick={() => eventImageFileInputRef.current?.click()}
                          disabled={isEventImageUploading}
                          className="text-[10px] text-[#C5A059] hover:underline font-bold uppercase cursor-pointer flex items-center gap-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{isEventImageUploading ? 'A Carregar...' : 'Carregar Foto'}</span>
                        </button>
                      </div>

                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newEvent.imageUrl}
                          onChange={(e) => setNewEvent({ ...newEvent, imageUrl: e.target.value })}
                          placeholder="Carregue uma foto ou cole a URL"
                          className="flex-1 px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                        />
                        <button
                          type="button"
                          onClick={() => eventImageFileInputRef.current?.click()}
                          className="px-3 py-2 bg-neutral-800 hover:bg-black text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Carregar</span>
                        </button>
                      </div>

                      {newEvent.imageUrl && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-white rounded-sm border border-neutral-200">
                          <Image
                            src={newEvent.imageUrl}
                            alt="Capa do Evento"
                            width={48}
                            height={32}
                            className="w-12 h-8 rounded-sm object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[11px] text-neutral-700 truncate">Foto do evento carregada</span>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Pequena Descrição</label>
                      <input
                        type="text"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Detalhes Completos para o Modal</label>
                      <textarea
                        rows={2}
                        value={newEvent.fullDetails}
                        onChange={(e) => setNewEvent({ ...newEvent, fullDetails: e.target.value })}
                        className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="new-event-featured"
                        checked={!!newEvent.featured}
                        onChange={(e) => setNewEvent({ ...newEvent, featured: e.target.checked })}
                        className="w-4 h-4 rounded border-neutral-300 text-[#C5A059] focus:ring-[#C5A059] cursor-pointer"
                      />
                      <label htmlFor="new-event-featured" className="text-xs font-medium text-neutral-700 cursor-pointer">
                        Marcar como Atividade em Destaque Especial
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Salvar Atividade
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF REGISTERED EVENTS WITH EDIT & DELETE BUTTONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Atividades Cadastradas ({data.upcomingEvents.length})</span>
                  </h4>
                  <span className="text-[10px] text-neutral-500">
                    Clique em &quot;Editar&quot; para alterar qualquer informação
                  </span>
                </div>

                {data.upcomingEvents.length === 0 ? (
                  <div className="p-8 text-center bg-neutral-50 border border-neutral-200 rounded-sm">
                    <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-neutral-600 font-medium">Nenhuma atividade cadastrada no momento.</p>
                    <p className="text-[10px] text-neutral-400 mt-1">Preencha o formulário acima para cadastrar a primeira atividade.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.upcomingEvents.map((ev) => {
                      const isCurrentlyEditing = editingEventId === ev.id;
                      return (
                        <div
                          key={ev.id}
                          className={`p-3.5 rounded-sm border transition-all flex flex-col justify-between gap-3 ${
                            isCurrentlyEditing
                              ? 'bg-amber-50/80 border-[#C5A059] ring-2 ring-[#C5A059]/40'
                              : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative w-20 h-16 rounded-sm overflow-hidden bg-neutral-200 flex-shrink-0">
                              <Image
                                src={ev.imageUrl}
                                alt={ev.title}
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {ev.featured && (
                                <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 bg-[#C5A059] text-white rounded-xs">
                                  ★ Destaque
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-neutral-200 text-neutral-800 rounded-xs">
                                  {ev.category || 'Geral'}
                                </span>
                                {isCurrentlyEditing && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-xs animate-pulse">
                                    Em Edição
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs font-bold text-neutral-900 truncate" title={ev.title}>
                                {ev.title}
                              </h5>
                              <p className="text-[10px] text-[#9A7B38] font-semibold mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#C5A059]" />
                                <span>{ev.date} {ev.time ? `• ${ev.time}` : ''}</span>
                              </p>
                              {ev.location && (
                                <p className="text-[10px] text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-neutral-400" />
                                  <span>{ev.location}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/70">
                            <button
                              type="button"
                              onClick={() => handleStartEditEvent(ev)}
                              className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-colors cursor-pointer ${
                                isCurrentlyEditing
                                  ? 'bg-[#C5A059] text-white'
                                  : 'text-neutral-700 bg-white border border-neutral-300 hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]'
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>{isCurrentlyEditing ? 'A Editar Agora' : 'Editar Atividade'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (editingEventId === ev.id) {
                                  handleCancelEditEvent();
                                }
                                removeUpcomingEvent(ev.id);
                                showNotification(`Atividade "${ev.title}" removida com sucesso`);
                              }}
                              className="p-1.5 rounded-sm text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remover Atividade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REDES SOCIAIS */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-sm bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 font-light">
                Configure os canais digitais e contactos da igreja. Os botões &quot;ACESSAR&quot; redirecionarão os visitantes diretamente para estes canais.
              </div>

              {data.socialLinks.map((social) => {
                const isWhatsApp = social.platform === 'WhatsApp' || social.id === 'soc-whatsapp';

                if (isWhatsApp) {
                  const rawNum = social.handle || data.whatsappNumber || '';
                  const cleanNum = rawNum.replace(/\D/g, '');
                  const directUrl = cleanNum 
                    ? `https://wa.me/${cleanNum}${data.whatsappMessage ? `?text=${encodeURIComponent(data.whatsappMessage)}` : ''}`
                    : '';

                  return (
                    <div
                      key={social.id}
                      className="p-4 rounded-sm bg-emerald-50/50 border border-emerald-300/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-950">
                            {social.name} ({social.platform})
                          </h4>
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider border border-emerald-200">
                          Direcionamento por Número
                        </span>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-sm border border-emerald-200 text-[11px] text-emerald-900 font-light leading-relaxed">
                        ✨ <strong>Não é necessário digitar link/URL.</strong> Apenas digite o número de telefone. Quando qualquer pessoa clicar em &quot;ACESSAR&quot; no site, será direcionada instantaneamente para a conta do WhatsApp do proprietário deste número.
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 block mb-1">
                            Número de Telefone do WhatsApp (com DDI e DDD) *
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: +244 923 847 110"
                            value={social.handle || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const digits = val.replace(/\D/g, '');
                              const newUrl = digits 
                                ? `https://wa.me/${digits}${data.whatsappMessage ? `?text=${encodeURIComponent(data.whatsappMessage)}` : ''}` 
                                : '';
                              updateSocialLink(social.id, { handle: val, url: newUrl });
                              updateChurchInfo({ whatsappNumber: val });
                              setChurchForm((prev) => ({ ...prev, whatsappNumber: val }));
                            }}
                            className="w-full px-3 py-2 rounded-sm bg-white border border-emerald-300 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                          />
                          <span className="text-[10px] text-neutral-500 mt-1 block">
                            Dígitos de direcionamento: <strong className="font-mono text-emerald-800">{cleanNum || 'Nenhum número'}</strong>
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-800 block mb-1">
                            Mensagem Inicial Padrão ao Iniciar Conversa (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Olá! Gostaria de falar com a Catedral de Amor e Fé"
                            value={data.whatsappMessage || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newUrl = cleanNum 
                                ? `https://wa.me/${cleanNum}${val ? `?text=${encodeURIComponent(val)}` : ''}` 
                                : '';
                              updateSocialLink(social.id, { url: newUrl });
                              updateChurchInfo({ whatsappMessage: val });
                              setChurchForm((prev) => ({ ...prev, whatsappMessage: val }));
                            }}
                            className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-emerald-600"
                          />
                          <span className="text-[10px] text-neutral-500 mt-1 block">
                            Texto pronto sugerido ao visitante ao abrir o WhatsApp
                          </span>
                        </div>
                      </div>

                      {/* Live Generated Direct URL Preview */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-emerald-200">
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-900 truncate">
                          <span className="font-bold text-[10px] uppercase tracking-wider">Destino Direto:</span>
                          <code className="bg-white px-2 py-0.5 rounded text-[11px] text-emerald-950 font-mono border border-emerald-200 truncate">
                            {directUrl || 'Aguardando número de telefone...'}
                          </code>
                        </div>

                        {directUrl && (
                          <a
                            href={directUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap self-start sm:self-auto shadow-xs"
                          >
                            <span>Testar Abertura Direta</span>
                            <ExternalLink className="w-3 h-3 text-white" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={social.id}
                    className="p-4 rounded-sm bg-neutral-50 border border-neutral-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                        {social.name} ({social.platform})
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono">{social.handle}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Link URL</label>
                        <input
                          type="url"
                          value={social.url}
                          onChange={(e) => updateSocialLink(social.id, { url: e.target.value })}
                          className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 block mb-1">Identificador / Handle</label>
                        <input
                          type="text"
                          value={social.handle}
                          onChange={(e) => updateSocialLink(social.id, { handle: e.target.value })}
                          className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 6: DADOS DA IGREJA & WHATSAPP */}
          {activeTab === 'church' && (
            <form onSubmit={handleSaveChurchInfo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Nome Oficial da Igreja
                  </label>
                  <input
                    type="text"
                    value={churchForm.churchName}
                    onChange={(e) => setChurchForm({ ...churchForm, churchName: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Lema / Frase de Missão
                  </label>
                  <input
                    type="text"
                    value={churchForm.churchMotto}
                    onChange={(e) => setChurchForm({ ...churchForm, churchMotto: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Número do WhatsApp (com DDI e DDD)
                  </label>
                  <input
                    type="text"
                    value={churchForm.whatsappNumber}
                    onChange={(e) => setChurchForm({ ...churchForm, whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    E-mail Oficial
                  </label>
                  <input
                    type="email"
                    value={churchForm.email}
                    onChange={(e) => setChurchForm({ ...churchForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Mensagem Padrão do WhatsApp
                  </label>
                  <input
                    type="text"
                    value={churchForm.whatsappMessage}
                    onChange={(e) => setChurchForm({ ...churchForm, whatsappMessage: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                    Endereço Completo & Localização
                  </label>
                  <input
                    type="text"
                    value={churchForm.address}
                    onChange={(e) => setChurchForm({ ...churchForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:border-black"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-sm font-bold text-[10px] uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Dados da Igreja</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 7: NUVEM, VERCEL & SINCRONIZAÇÃO GLOBAL */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {/* Status Header Box */}
              <div className="p-5 rounded-sm bg-neutral-900 text-white border border-neutral-800 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-sm bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center shrink-0 border border-[#C5A059]/30">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
                        <span>Sincronização em Tempo Real (Vercel, Celulares e Outros Navegadores)</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Ativo
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400 font-light mt-1 max-w-2xl leading-relaxed">
                        Todas as informações alteradas aqui são salvas no banco de dados na nuvem (Google Cloud Firestore). Qualquer visitante em <strong>cruzadadodr.vercel.app</strong>, no Chrome, Safari, Edge ou telemóvel recebe as atualizações instantaneamente.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      showNotification('A sincronizar com a Nuvem e Vercel...');
                      const ok = await syncNowWithCloud();
                      if (ok) {
                        showNotification('✓ Sucesso! Dados salvos na nuvem. Todos os navegadores e Vercel já estão sincronizados.');
                      } else {
                        showNotification('Dados gravados localmente e na fila da nuvem.');
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-sm font-bold text-xs uppercase tracking-wider text-black bg-[#C5A059] hover:bg-[#D4AF37] transition-all shadow-lg cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                    <span>Sincronizar Tudo com Vercel Agora</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Explanation for Vercel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-sm border border-neutral-200 bg-neutral-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#C5A059]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      1. Banco de Dados na Nuvem (Automático)
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 font-light leading-relaxed">
                    Sempre que você clica em <strong>Salvar</strong> em qualquer aba deste painel, o sistema transmite os textos, fotos e vídeos para o Firestore do projeto <strong>{firebaseProjectId}</strong>. O Vercel consulta esta mesma base e atualiza a tela sem você precisar mexer em código.
                  </p>
                </div>

                <div className="p-4 rounded-sm border border-neutral-200 bg-neutral-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-4 h-4 text-[#C5A059]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      2. Exportação para Deploy no GitHub / Vercel
                    </h4>
                  </div>
                  <p className="text-xs text-neutral-600 font-light leading-relaxed">
                    Se você deseja que o código fonte do repositório no GitHub já venha com todos os seus textos pré-configurados como padrão de fábrica, utilize o botão de exportação abaixo.
                  </p>
                </div>
              </div>

              {/* Quick JSON Export / Backup */}
              <div className="p-4 rounded-sm border border-neutral-200 bg-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Backup & Exportação dos Dados Atuais</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500 font-light mt-0.5">
                      Copie ou baixe o arquivo JSON com todo o conteúdo atual da catedral para guardar ou importar no código.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const jsonStr = JSON.stringify(data, null, 2);
                        navigator.clipboard?.writeText(jsonStr);
                        showNotification('✓ JSON copiado para a área de transferência!');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Copiar JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const jsonStr = JSON.stringify(data, null, 2);
                        const blob = new Blob([jsonStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `catedral_dados_${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showNotification('✓ Ficheiro de backup baixado com sucesso!');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-[#1A1A1A] hover:bg-[#C5A059] text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Ficheiro</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 font-light">
          <button
            onClick={() => {
              if (confirm('Deseja restaurar os dados de exemplo padrão?')) {
                resetToDefaults();
                showNotification('Dados restaurados para o padrão original.');
              }
            }}
            className="flex items-center gap-1.5 text-neutral-500 hover:text-black transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Demonstração Inicial</span>
          </button>

          <button
            onClick={() => setIsAdminOpen(false)}
            className="px-4 py-2 rounded-sm bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold text-xs transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}
