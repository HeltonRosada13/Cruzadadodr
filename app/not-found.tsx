import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-[#FDFDFC] text-[#1A1A1A]">
      <h2 className="text-3xl font-serif mb-2 text-[#141414]">Página Não Encontrada</h2>
      <p className="text-[#666666] mb-6 max-w-md">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#C5A059] text-white font-medium rounded-full shadow hover:bg-[#A9833D] transition-colors"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
