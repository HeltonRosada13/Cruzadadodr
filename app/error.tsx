'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Caught Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FDFDFC] text-[#1A1A1A]">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
        <h2 className="text-2xl font-serif mb-2 text-[#141414]">Algo correu mal</h2>
        <p className="text-sm text-[#666666] mb-6 leading-relaxed">
          Ocorreu uma falha temporária ao carregar esta secção. Pode tentar recarregar novamente.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-[#C5A059] text-white font-medium rounded-xl hover:bg-[#A9833D] transition-colors cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
