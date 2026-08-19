'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Caught Error:', error);
  }, [error]);

  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FDFDFC] text-[#1A1A1A]">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-200">
          <h2 className="text-2xl font-serif mb-2 text-[#141414]">Erro de Aplicação</h2>
          <p className="text-sm text-[#666666] mb-6 leading-relaxed">
            Ocorreu um erro inesperado no carregamento da aplicação.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 bg-[#C5A059] text-white font-medium rounded-xl hover:bg-[#A9833D] transition-colors cursor-pointer"
          >
            Recarregar Aplicação
          </button>
        </div>
      </body>
    </html>
  );
}
