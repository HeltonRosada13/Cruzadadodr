import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'Igreja Catedral de Amor e Fé | Atividades, Louvor e Comunhão',
  description:
    'Portal oficial da Igreja Catedral de Amor e Fé. Um lugar de fé, amor, comunhão e transformação. Confira nossas conferências, fotos, vídeos, horários e canais de atendimento.',
  openGraph: {
    title: 'Igreja Catedral de Amor e Fé | Atividades, Louvor e Comunhão',
    description:
      'Portal oficial da Igreja Catedral de Amor e Fé. Desenvolvido por Baobá Universe.',
    type: 'website',
    locale: 'pt_PT',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Igreja Catedral de Amor e Fé',
    description:
      'Portal oficial da Igreja Catedral de Amor e Fé. Um lugar de fé, amor e comunhão.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt" className="scroll-smooth">
      <body suppressHydrationWarning className="bg-neutral-900 text-neutral-100 antialiased min-h-screen selection:bg-[#C5A059] selection:text-white">
        {children}
      </body>
    </html>
  );
}
