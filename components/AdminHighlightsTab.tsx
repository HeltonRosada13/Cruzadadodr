'use client';

import React, { useState, useRef } from 'react';
import { HighlightMoment } from '@/lib/types';
import { processAndOptimizeImage } from '@/lib/imageUtils';
import Image from 'next/image';
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
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Camera,
  FolderOpen,
  Check,
  X,
  Upload,
  RefreshCw,
  Eye,
  CheckCircle2,
  Info
} from 'lucide-react';

interface AdminHighlightsTabProps {
  highlights: HighlightMoment[];
  addHighlight: (item: Omit<HighlightMoment, 'id'>) => void;
  updateHighlight: (id: string, updated: Partial<HighlightMoment>) => void;
  removeHighlight: (id: string) => void;
  resetHighlightsToDefaults: () => void;
  syncNowWithCloud: () => Promise<boolean | void>;
  showNotification: (msg: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Flame', label: 'Oração & Fogo', icon: Flame },
  { name: 'Music', label: 'Louvor & Adoração', icon: Music },
  { name: 'BookOpen', label: 'Palavra & Ensino', icon: BookOpen },
  { name: 'HeartHandshake', label: 'Comunhão & Amor', icon: HeartHandshake },
  { name: 'Gift', label: 'Ação Social & Donativos', icon: Gift },
  { name: 'Star', label: 'Destaque Geral', icon: Star },
  { name: 'Sparkles', label: 'Impacto & Milagres', icon: Sparkles },
  { name: 'Users', label: 'Famílias & Juventude', icon: Users },
  { name: 'Sun', label: 'Avivamento & Luz', icon: Sun },
  { name: 'Heart', label: 'Amor Fraternal', icon: Heart },
  { name: 'Crown', label: 'Realeza & Exaltação', icon: Crown },
  { name: 'MessageSquare', label: 'Testemunhos', icon: MessageSquare },
  { name: 'Calendar', label: 'Programação Especial', icon: Calendar },
  { name: 'Award', label: 'Celebração & Honra', icon: Award },
  { name: 'ShieldCheck', label: 'Proteção & Fé', icon: ShieldCheck },
];

function DynamicHighlightIcon({ iconName, className }: { iconName: string; className?: string }) {
  const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
  const IconComponent = found ? found.icon : Star;
  return <IconComponent className={className} />;
}

const PRESET_HIGHLIGHT_PHOTOS = [
  {
    name: 'Louvor & Adoração',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Bíblia & Palavra',
    url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Comunhão & Abraço',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Oração & Altar',
    url: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Solidariedade & Ação Social',
    url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Juventude & Coral',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80',
  },
];

export function AdminHighlightsTab({
  highlights,
  addHighlight,
  updateHighlight,
  removeHighlight,
  resetHighlightsToDefaults,
  syncNowWithCloud,
  showNotification,
}: AdminHighlightsTabProps) {
  // New highlight form state
  const [newHighlight, setNewHighlight] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    iconName: 'Flame',
    verse: '',
  });

  // Edit highlight state
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HighlightMoment | null>(null);

  // Upload states & refs
  const [isNewImageUploading, setIsNewImageUploading] = useState(false);
  const [isEditImageUploading, setIsEditImageUploading] = useState(false);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Upload Handler for New Highlight Cover Image
  const handleProcessNewImage = async (file: File) => {
    if (!file) return;
    try {
      setIsNewImageUploading(true);
      const result = await processAndOptimizeImage(file, 1280, 800, 0.88);
      setNewHighlight((prev) => ({
        ...prev,
        imageUrl: result.dataUrl,
      }));
      showNotification(`Foto de capa do destaque carregada (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading highlight image:', err);
      showNotification('Erro ao processar imagem do destaque.');
    } finally {
      setIsNewImageUploading(false);
    }
  };

  // Upload Handler for Editing Highlight Cover Image
  const handleProcessEditImage = async (file: File) => {
    if (!file) return;
    try {
      setIsEditImageUploading(true);
      const result = await processAndOptimizeImage(file, 1280, 800, 0.88);
      setEditForm((prev) => (prev ? { ...prev, imageUrl: result.dataUrl } : null));
      showNotification(`Nova foto de capa carregada (${result.formattedSize})!`);
    } catch (err) {
      console.error('Error uploading edit highlight image:', err);
      showNotification('Erro ao processar imagem do destaque.');
    } finally {
      setIsEditImageUploading(false);
    }
  };

  // Submit Handler for Adding a New Highlight
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlight.title.trim()) {
      showNotification('Por favor, informe o título do momento em destaque.');
      return;
    }

    const defaultImg =
      'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=900&q=80';

    addHighlight({
      title: newHighlight.title.trim(),
      subtitle: newHighlight.subtitle.trim() || 'Pilar da Programação',
      description: newHighlight.description.trim() || 'Momento especial de celebração, fé e adoração a Deus.',
      imageUrl: newHighlight.imageUrl.trim() || defaultImg,
      iconName: newHighlight.iconName || 'Flame',
      verse: newHighlight.verse.trim() || undefined,
    });

    syncNowWithCloud();

    setNewHighlight({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      iconName: 'Flame',
      verse: '',
    });

    showNotification('Novo Momento em Destaque publicado com sucesso na página inicial!');
  };

  // Start Editing a Highlight
  const handleStartEdit = (item: HighlightMoment) => {
    setEditingHighlightId(item.id);
    setEditForm({ ...item });
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingHighlightId(null);
    setEditForm(null);
  };

  // Save Edited Highlight
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    updateHighlight(editForm.id, {
      title: editForm.title.trim(),
      subtitle: editForm.subtitle.trim(),
      description: editForm.description.trim(),
      imageUrl: editForm.imageUrl.trim(),
      iconName: editForm.iconName,
      verse: editForm.verse?.trim() || undefined,
    });

    syncNowWithCloud();
    setEditingHighlightId(null);
    setEditForm(null);
    showNotification('Momento em destaque atualizado e salvo permanentemente!');
  };

  // Delete Highlight
  const handleDelete = (id: string, title: string) => {
    removeHighlight(id);
    syncNowWithCloud();
    showNotification(`Momento em destaque "${title}" eliminado com sucesso!`);
  };

  // Reset Highlights to default
  const handleResetDefaults = () => {
    resetHighlightsToDefaults();
    syncNowWithCloud();
    showNotification('Momentos em destaque restaurados para o padrão original!');
  };

  return (
    <div className="space-y-8">
      {/* Informative Header */}
      <div className="p-4 rounded-sm bg-[#C5A059]/10 border border-[#C5A059]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#C5A059]" />
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Gestão de Momentos em Destaque (Pilares da Atividade)
            </h3>
          </div>
          <p className="text-xs text-neutral-600 font-light mt-1 max-w-2xl">
            Adicione, edite ou remova os cards de &quot;Momentos em Destaque&quot; exibidos na página inicial. Você pode personalizar títulos, textos, versículos bíblicos, ícones e fotos de capa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            id="btn-reset-highlights-defaults"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: PUBLICAR NOVO MOMENTO EM DESTAQUE */}
      <div className="p-5 bg-neutral-50 rounded-sm border border-neutral-300">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-[#1A1A1A] flex items-center justify-center text-[#C5A059]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
                Publicar Novo Momento em Destaque
              </h4>
              <span className="text-[10px] text-neutral-500 font-light">
                Preencha os campos abaixo para criar um novo card na página
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={newFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessNewImage(file);
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                Título do Momento *
              </label>
              <input
                type="text"
                value={newHighlight.title}
                onChange={(e) => setNewHighlight({ ...newHighlight, title: e.target.value })}
                placeholder="Ex: Momento de Oração & Intercessão"
                className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                Subtítulo / Categoria
              </label>
              <input
                type="text"
                value={newHighlight.subtitle}
                onChange={(e) => setNewHighlight({ ...newHighlight, subtitle: e.target.value })}
                placeholder="Ex: Clamor de fé e cura espiritual"
                className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
              />
            </div>

            {/* Icon Selector */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1.5">
                Escolha o Ícone do Momento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {AVAILABLE_ICONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = newHighlight.iconName === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setNewHighlight({ ...newHighlight, iconName: item.name })}
                      className={`flex items-center gap-2 p-2 rounded-sm text-left text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm font-semibold'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-neutral-500'}`} />
                      <span className="text-[10px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                Descrição Detalhada do Momento
              </label>
              <textarea
                rows={3}
                value={newHighlight.description}
                onChange={(e) => setNewHighlight({ ...newHighlight, description: e.target.value })}
                placeholder="Descreva a dinâmica espiritual, o que os irmãos e visitantes vivenciarão neste momento..."
                className="w-full px-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black leading-relaxed"
              />
            </div>

            {/* Scripture / Verse */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                Versículo Bíblico ou Citação Inspiradora (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newHighlight.verse}
                  onChange={(e) => setNewHighlight({ ...newHighlight, verse: e.target.value })}
                  placeholder="«A oração feita por um justo pode muito em seus efeitos.» — Tg 5:16"
                  className="w-full pl-8 pr-3 py-2 rounded-sm bg-white border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black italic"
                />
                <Quote className="w-3.5 h-3.5 text-[#C5A059] absolute left-2.5 top-3" />
              </div>
            </div>

            {/* Cover Image Selection & Upload Area */}
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block">
                Foto de Capa do Destaque
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Drag and Drop / Choose File Button */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingNew(true);
                  }}
                  onDragLeave={() => setIsDraggingNew(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingNew(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessNewImage(file);
                  }}
                  onClick={() => newFileInputRef.current?.click()}
                  className={`md:col-span-2 border-2 border-dashed rounded-sm p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    isDraggingNew
                      ? 'border-[#C5A059] bg-[#C5A059]/10'
                      : 'border-neutral-300 hover:border-black bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                    {isNewImageUploading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-[#C5A059]" />
                    ) : (
                      <Camera className="w-5 h-5 text-[#C5A059]" />
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isNewImageUploading}
                    className="px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5 shadow-sm"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{isNewImageUploading ? 'A processar foto...' : 'Escolher Foto do Dispositivo'}</span>
                  </button>

                  <span className="text-[10px] text-neutral-500">
                    ou arraste e solte uma imagem (JPG, PNG, WebP)
                  </span>
                </div>

                {/* Preview Box */}
                <div className="relative h-36 rounded-sm overflow-hidden bg-neutral-200 border border-neutral-300 flex items-center justify-center">
                  {newHighlight.imageUrl ? (
                    <>
                      <Image
                        src={newHighlight.imageUrl}
                        alt="Prévia"
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-sm bg-white/90 backdrop-blur-sm flex items-center justify-center text-neutral-900 shadow-sm">
                        <DynamicHighlightIcon iconName={newHighlight.iconName} className="w-3.5 h-3.5 text-[#C5A059]" />
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-sm bg-black/70 text-white text-[9px] font-bold">
                        Prévia
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2 text-neutral-400">
                      <Camera className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block">Sem imagem</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Presets & URL Fallback */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Ou selecione uma foto sugerida:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_HIGHLIGHT_PHOTOS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewHighlight({ ...newHighlight, imageUrl: preset.url })}
                      className="px-2.5 py-1 rounded-sm bg-white hover:bg-neutral-200 text-[10px] text-neutral-800 border border-neutral-300 font-medium transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  value={newHighlight.imageUrl}
                  onChange={(e) => setNewHighlight({ ...newHighlight, imageUrl: e.target.value })}
                  placeholder="Ou cole a URL direta de uma imagem na web (https://...)"
                  className="w-full px-3 py-1.5 rounded-sm bg-white border border-neutral-300 text-[11px] text-neutral-900 focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-sm font-bold text-xs uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar Momento em Destaque</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: LISTA DE MOMENTOS EM DESTAQUE EXISTENTES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-900">
              Momentos Atualmente Publicados ({highlights.length})
            </h4>
            <span className="text-[10px] text-neutral-500 font-light">
              Clique em &quot;Editar&quot; em qualquer momento para alterar textos, fotos e versículos
            </span>
          </div>
        </div>

        {highlights.length === 0 ? (
          <div className="p-8 text-center bg-neutral-50 border border-neutral-200 rounded-sm">
            <Star className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-neutral-600 font-medium">
              Nenhum momento em destaque cadastrado no momento.
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Use o formulário acima ou clique em &quot;Restaurar Padrões&quot; para carregar os destaques da igreja.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlights.map((item) => {
              const isEditing = editingHighlightId === item.id;

              if (isEditing && editForm) {
                return (
                  <div
                    key={item.id}
                    className="p-5 bg-white rounded-sm border-2 border-[#C5A059] shadow-md space-y-4 md:col-span-2"
                  >
                    {/* Hidden edit file input */}
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessEditImage(file);
                      }}
                    />

                    <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-[#C5A059]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                          Editando Destaque: {item.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-neutral-500 hover:text-black p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEdit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                            Título
                          </label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                            Subtítulo
                          </label>
                          <input
                            type="text"
                            value={editForm.subtitle}
                            onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                            className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                          />
                        </div>

                        {/* Icon Selector */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1.5">
                            Ícone Representativo
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {AVAILABLE_ICONS.map((iconItem) => {
                              const ItemIcon = iconItem.icon;
                              const isIconSelected = editForm.iconName === iconItem.name;
                              return (
                                <button
                                  key={iconItem.name}
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, iconName: iconItem.name })}
                                  className={`flex items-center gap-2 p-2 rounded-sm text-left text-xs transition-all border cursor-pointer ${
                                    isIconSelected
                                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm font-semibold'
                                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                                  }`}
                                >
                                  <ItemIcon
                                    className={`w-4 h-4 shrink-0 ${
                                      isIconSelected ? 'text-[#C5A059]' : 'text-neutral-500'
                                    }`}
                                  />
                                  <span className="text-[10px] truncate">{iconItem.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                            Descrição
                          </label>
                          <textarea
                            rows={3}
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black leading-relaxed"
                          />
                        </div>

                        {/* Verse */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block mb-1">
                            Versículo Bíblico
                          </label>
                          <input
                            type="text"
                            value={editForm.verse || ''}
                            onChange={(e) => setEditForm({ ...editForm, verse: e.target.value })}
                            placeholder="«A tua palavra é lâmpada para os meus pés...» — Sl 119:105"
                            className="w-full px-3 py-2 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black italic"
                          />
                        </div>

                        {/* Image Change */}
                        <div className="md:col-span-2 space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-700 block">
                            Foto de Capa do Destaque
                          </label>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative w-36 h-24 rounded-sm overflow-hidden bg-neutral-200 border border-neutral-300 shrink-0">
                              <Image
                                src={editForm.imageUrl}
                                alt="Capa"
                                fill
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <div className="flex-1 w-full space-y-2">
                              <button
                                type="button"
                                onClick={() => editFileInputRef.current?.click()}
                                disabled={isEditImageUploading}
                                className="px-4 py-2 bg-neutral-900 text-white hover:bg-black rounded-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm"
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                                <span>
                                  {isEditImageUploading ? 'A carregar...' : 'Trocar Foto (Abrir Pasta do Dispositivo)'}
                                </span>
                              </button>

                              <input
                                type="url"
                                value={editForm.imageUrl}
                                onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                                placeholder="Ou cole a URL da imagem (https://...)"
                                className="w-full px-3 py-1.5 rounded-sm bg-neutral-50 border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-black"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between gap-2 border-t border-neutral-200">
                        <button
                          type="button"
                          id={`btn-edit-delete-highlight-${item.id}`}
                          onClick={() => {
                            handleDelete(item.id, editForm.title);
                            handleCancelEdit();
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Destaque</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2 rounded-sm bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 px-5 py-2 rounded-sm bg-[#1A1A1A] hover:bg-[#C5A059] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  id={`admin-highlight-card-${item.id}`}
                  className="bg-white rounded-sm border border-neutral-200 overflow-hidden shadow-sm hover:border-neutral-900 transition-all flex flex-col justify-between"
                >
                  {/* Top Image & Icon */}
                  <div className="relative h-44 w-full bg-neutral-100 overflow-hidden">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    <div className="absolute top-3 left-3 w-8 h-8 rounded-sm bg-white/95 backdrop-blur-md border border-neutral-200 flex items-center justify-center text-neutral-900 shadow-sm">
                      <DynamicHighlightIcon iconName={item.iconName} className="w-4 h-4 text-[#C5A059]" />
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        id={`btn-edit-highlight-${item.id}`}
                        onClick={() => handleStartEdit(item)}
                        className="px-2.5 py-1.5 rounded-sm bg-white/95 backdrop-blur-sm text-neutral-900 hover:bg-[#1A1A1A] hover:text-white text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer transition-all border border-neutral-200"
                      >
                        <Edit3 className="w-3 h-3 text-[#C5A059]" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        id={`btn-delete-highlight-${item.id}`}
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-sm bg-white/95 backdrop-blur-sm text-red-600 hover:bg-red-600 hover:text-white text-[10px] shadow-sm cursor-pointer transition-all border border-red-200 flex items-center justify-center"
                        title="Excluir Destaque Permanentemente"
                        aria-label="Excluir Destaque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C5A059] block mb-1">
                        {item.subtitle}
                      </span>
                      <h4 className="text-base font-editorial italic text-neutral-900 mb-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-600 font-light leading-relaxed mb-3 line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {item.verse && (
                      <div className="p-2.5 rounded-sm bg-[#F8F8F6] border border-neutral-200 text-neutral-700 text-[11px] italic flex items-start gap-2 mt-2">
                        <Quote className="w-3 h-3 text-[#C5A059] shrink-0 mt-0.5" />
                        <span className="font-editorial">{item.verse}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
