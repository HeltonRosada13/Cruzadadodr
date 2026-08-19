export interface ChurchActivity {
  id: string;
  name: string;
  subtitle: string;
  theme: string;
  date: string; // ISO date string e.g. "2026-08-25T18:00:00"
  formattedDate: string; // e.g. "25 a 28 de Agosto de 2026"
  time: string;
  location: string;
  address: string;
  organization: string;
  targetAudience: string;
  goal: string;
  importantNotes: string;
  heroImage: string;
  heroVideo?: string;
  videoPromoUrl?: string;
  badge?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface PhotoItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: 'Todos' | 'Louvor' | 'Palavra' | 'Juventude' | 'Comunhão' | 'Famílias';
  date: string;
  photographer?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string; // YouTube embed or MP4 url
  duration: string;
  category: string;
  date: string;
}

export interface HighlightMoment {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  iconName: string;
  verse?: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  description: string;
  fullDetails: string;
  imageUrl: string;
  speaker?: string;
  featured?: boolean;
}

export interface SocialLink {
  id: string;
  platform: 'Instagram' | 'Facebook' | 'WhatsApp' | 'YouTube' | 'TikTok' | 'Spotify';
  name: string;
  description: string;
  handle: string;
  url: string;
  followers?: string;
  badgeText?: string;
}

export interface Testimony {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  content: string;
  activityName: string;
  date: string;
}

export interface ChurchSettings {
  churchName: string;
  churchMotto: string;
  churchAbout: string;
  phone: string;
  whatsappNumber: string;
  whatsappMessage: string;
  email: string;
  address: string;
  cityCountry: string;
  worshipSchedule: Array<{ day: string; time: string; name: string }>;
  socialLinks: SocialLink[];
  currentActivity: ChurchActivity;
  highlights: HighlightMoment[];
  photos: PhotoItem[];
  videos: VideoItem[];
  upcomingEvents: ChurchEvent[];
  testimonies: Testimony[];
  developedBy: {
    name: string;
    description: string;
    url: string;
  };
}
