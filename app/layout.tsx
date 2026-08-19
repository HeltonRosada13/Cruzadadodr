import type {Metadata} from 'next';
import './globals.css'; // Global styles

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
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
