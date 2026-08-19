'use client';

import React, { useSyncExternalStore } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  targetDateString: string;
  activityName?: string;
}

function getTimeDifference(targetDateString: string, nowMs: number) {
  if (nowMs === 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: false,
    };
  }

  const targetTime = new Date(targetDateString).getTime();
  const difference = targetTime - nowMs;

  if (isNaN(targetTime) || difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isPast: false,
  };
}

let cachedClientTime = typeof window !== 'undefined' ? Date.now() : 0;
const timeListeners = new Set<() => void>();
let timeIntervalId: ReturnType<typeof setInterval> | null = null;

function subscribeTime(onStoreChange: () => void) {
  timeListeners.add(onStoreChange);
  if (!timeIntervalId && typeof window !== 'undefined') {
    cachedClientTime = Date.now();
    timeIntervalId = setInterval(() => {
      cachedClientTime = Date.now();
      timeListeners.forEach((listener) => listener());
    }, 1000);
  }
  return () => {
    timeListeners.delete(onStoreChange);
    if (timeListeners.size === 0 && timeIntervalId) {
      clearInterval(timeIntervalId);
      timeIntervalId = null;
    }
  };
}

function getClientSnapshot(): number {
  return cachedClientTime;
}

function getServerSnapshot(): number {
  return 0;
}

export function CountdownTimer({ targetDateString }: CountdownTimerProps) {
  const currentTime = useSyncExternalStore(subscribeTime, getClientSnapshot, getServerSnapshot);
  const mounted = currentTime > 0;
  const timeLeft = getTimeDifference(targetDateString, currentTime);

  if (mounted && timeLeft.isPast) {
    return (
      <div
        id="countdown-completed-banner"
        className="inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-3.5 rounded-sm bg-black/70 border border-white/20 text-white shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
            ATIVIDADE REALIZADA
          </span>
        </div>
        <span className="text-xs text-neutral-400 hidden sm:inline">•</span>
        <span className="text-xs text-neutral-300 font-light">
          Acompanhe as fotografias, vídeos e momentos marcantes abaixo.
        </span>
      </div>
    );
  }

  const format2Digits = (num: number) => String(num).padStart(2, '0');

  return (
    <div
      id="live-countdown-container"
      className="w-full max-w-xl mx-auto backdrop-blur-md bg-black/60 border border-white/20 rounded-sm p-4 sm:p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse"></span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-[#C5A059]">
            Contagem Regressiva Oficial
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-widest text-neutral-400 font-medium hidden sm:inline">
          Início em Breve
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
        {/* Days */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-sm bg-white/5 border border-white/10">
          <span
            suppressHydrationWarning
            className="text-2xl sm:text-3xl font-editorial italic text-white leading-none"
          >
            {mounted ? format2Digits(timeLeft.days) : '00'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-1">
            Dias
          </span>
        </div>

        {/* Hours */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-sm bg-white/5 border border-white/10">
          <span
            suppressHydrationWarning
            className="text-2xl sm:text-3xl font-editorial italic text-white leading-none"
          >
            {mounted ? format2Digits(timeLeft.hours) : '00'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-1">
            Horas
          </span>
        </div>

        {/* Minutes */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-sm bg-white/5 border border-white/10">
          <span
            suppressHydrationWarning
            className="text-2xl sm:text-3xl font-editorial italic text-white leading-none"
          >
            {mounted ? format2Digits(timeLeft.minutes) : '00'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-1">
            Min
          </span>
        </div>

        {/* Seconds */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-sm bg-[#C5A059]/15 border border-[#C5A059]/30">
          <span
            suppressHydrationWarning
            className="text-2xl sm:text-3xl font-editorial italic text-[#C5A059] leading-none"
          >
            {mounted ? format2Digits(timeLeft.seconds) : '00'}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#C5A059] mt-1">
            Seg
          </span>
        </div>
      </div>
    </div>
  );
}
