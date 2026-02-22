// Project images and descriptions for each named zone
// Data sourced from onegreendev.com

export interface ProjectInfo {
  image: string;
  description: string;
  status: string;
  link?: string;
}

const projectData: Record<string, ProjectInfo> = {
  'One Green Dev': {
    image: 'https://images.unsplash.com/photo-1756802156662-d0fa771ba255?w=400&h=250&fit=crop',
    description: 'Développement & ingénierie de projets durables. 500+ hectares valorisés, 3 projets structurants.',
    status: 'En développement',
    link: 'https://onegreendev.com',
  },
  'Songon East-Side': {
    image: 'https://images.unsplash.com/photo-1595652974625-f01356aa9316?w=400&h=250&fit=crop',
    description: 'Opportunité foncière stratégique à fort potentiel.',
    status: 'En cours',
    link: 'https://onegreendev.com/songon-east-side',
  },
  'Songon Extension': {
    image: 'https://images.unsplash.com/photo-1760715752598-eac7633b472d?w=400&h=250&fit=crop',
    description: 'Vision territoriale long terme, développement durable.',
    status: 'Planifié',
    link: 'https://songonextension.com',
  },
  'PROJET MARINA': {
    image: '/images/marina-songon.jpg',
    description: 'Marina de luxe avec accès direct à la lagune.',
    status: 'En développement',
  },
  'Terre de Songon': {
    image: 'https://images.unsplash.com/photo-1590172815327-22cbf36dd2be?w=400&h=250&fit=crop',
    description: 'Résidences premium dans un cadre paysager d\'exception.',
    status: 'En cours',
    link: 'https://lesterresdesongon.com',
  },
  'Le Golf de Songon': {
    image: '/images/golf-songon.png',
    description: 'Un parcours 18 trous au cœur de la nature ivoirienne.',
    status: 'En construction',
    link: 'https://legolfdesongon.com',
  },
};

// Named polygon mappings
const polygonAliases: Record<string, string> = {
  'Polygon 323': 'Songon Extension',
  'Polygon 1D4': 'Songon East-Side',
};

// Default info for polygon zones
const defaultInfo: ProjectInfo = {
  image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=400&h=250&fit=crop',
  description: 'Zone de développement du projet Songon — valorisation foncière et aménagement durable.',
  status: 'En étude',
};

export function getProjectInfo(name: string): ProjectInfo {
  const key = polygonAliases[name.trim()] || name.trim();
  return projectData[key] || defaultInfo;
}
