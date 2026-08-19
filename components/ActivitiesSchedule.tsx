'use client';

import React, { useState } from 'react';
import { useChurch } from '@/lib/ChurchContext';
import { ChurchEvent } from '@/lib/types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  X, 
  Sparkles, 
  User, 
  CheckCircle2, 
  Share2,
  CalendarPlus,
  Heart
} from 'lucide-react';
import Image from 'next/image';

export function ActivitiesSchedule() {
  const { data } = useChurch();
  const events = data.upcomingEvents;
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [registered, setRegistered] = useState(false);

  React.useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedEvent]);

  const handleOpenEventModal = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setRegistered(false);
  };

  const handleCloseEventModal = () => {
    setSelectedEvent(null);
  };

  return (
    <section
      id="atividades"
      className="py-20 bg-[#FDFDFC] border-t border-neutral-200/80 relative scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-bold block mb-3">
            Calendário & Ministérios
          </span>
          <h2
            id="section-title-atividades"
            className="text-3xl sm:text-4xl md:text-5xl font-editorial italic text-neutral-900 tracking-tight font-normal"
          >
            Próximas Atividades
          </h2>
          <div className="w-12 h-[1px] bg-[#C5A059] mx-auto mt-4" />
          <p className="mt-4 text-sm sm:text-base text-neutral-600 font-light leading-relaxed">
            Fique por dentro das próximas reuniões, seminários, conferências de juventude e ações comunitárias da Catedral de Amor e Fé.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              id={`event-card-${event.id}`}
              className="group bg-white rounded-sm overflow-hidden border border-neutral-200 hover:border-neutral-900 shadow-sm transition-all duration-300 flex flex-col justify-between"
            >
              {/* Event Image */}
              <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-white/95 text-neutral-900 shadow-sm">
                  {event.category}
                </span>

                {event.featured && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-[#C5A059] text-white shadow-sm">
                    Destaque
                  </span>
                )}
              </div>

              {/* Event Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#C5A059] font-medium mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{event.date}</span>
                  </div>

                  <h3 className="text-base font-editorial italic text-neutral-900 mb-2 leading-snug group-hover:text-[#C5A059] transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-xs text-neutral-600 font-light leading-relaxed line-clamp-2 mb-4">
                    {event.description}
                  </p>

                  <div className="space-y-1 text-xs text-neutral-500 mb-5 font-light">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                </div>

                <button
                  id={`btn-saiba-mais-${event.id}`}
                  onClick={() => handleOpenEventModal(event)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-[10px] font-bold uppercase tracking-widest text-neutral-900 bg-neutral-100 hover:bg-[#1A1A1A] hover:text-white border border-neutral-200 hover:border-neutral-900 transition-all cursor-pointer"
                >
                  <span>SAIBA MAIS</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Event Details Modal */}
      {selectedEvent && (
        <div
          id="event-details-modal"
          onClick={handleCloseEventModal}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div
            className="relative w-full max-w-2xl bg-[#FDFDFC] rounded-sm overflow-hidden border border-neutral-300 shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image Banner */}
            <div className="relative h-56 sm:h-64 w-full bg-neutral-100">
              <Image
                src={selectedEvent.imageUrl}
                alt={selectedEvent.title}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <button
                onClick={handleCloseEventModal}
                className="absolute top-4 right-4 p-2 rounded-sm bg-black/60 hover:bg-black text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <span className="px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-[#C5A059] text-white mb-2 inline-block">
                  {selectedEvent.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-editorial italic text-white leading-tight">
                  {selectedEvent.title}
                </h3>
              </div>
            </div>

            {/* Modal Content Details */}
            <div className="p-6 overflow-y-auto space-y-5 bg-white">
              {/* Event Meta Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-sm bg-neutral-50 border border-neutral-200 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C5A059]" />
                  <div>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Data</p>
                    <p className="font-semibold text-neutral-900">{selectedEvent.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C5A059]" />
                  <div>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Horário</p>
                    <p className="font-semibold text-neutral-900">{selectedEvent.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C5A059]" />
                  <div>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold">Local</p>
                    <p className="font-semibold text-neutral-900 truncate">{selectedEvent.location}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-bold text-[#C5A059] uppercase tracking-[0.2em] mb-2">
                  Detalhes da Atividade
                </h4>
                <p className="text-sm text-neutral-700 font-light leading-relaxed">
                  {selectedEvent.fullDetails}
                </p>
              </div>

              {selectedEvent.speaker && (
                <div className="flex items-center gap-3 p-3.5 rounded-sm bg-[#C5A059]/10 border border-[#C5A059]/20">
                  <User className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-xs text-neutral-700 font-light">
                    <strong className="text-neutral-900 font-bold">Responsável / Preletor:</strong>{' '}
                    {selectedEvent.speaker}
                  </span>
                </div>
              )}

              {/* Quick Participation Action */}
              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-neutral-500 font-light">
                  Entrada livre. Não é obrigatório convite impresso.
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setRegistered(true);
                      setTimeout(() => setRegistered(false), 3000);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-[#C5A059] transition-all shadow-sm cursor-pointer"
                  >
                    {registered ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Heart className="w-3.5 h-3.5" />}
                    <span>{registered ? 'Confirmado!' : 'Vou Participar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
