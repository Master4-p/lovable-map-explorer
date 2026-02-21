// Project images and descriptions for each named zone
// You can customize these URLs and descriptions

export interface ProjectInfo {
  image: string;
  description: string;
  status: string;
}

const projectData: Record<string, ProjectInfo> = {
  'Songon East-Side': {
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=250&fit=crop',
    description: 'Résidence haut standing avec vue panoramique sur le parc naturel.',
    status: 'En cours',
  },
  'Songon Extension': {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=250&fit=crop',
    description: 'Extension du quartier résidentiel avec nouveaux espaces verts.',
    status: 'Planifié',
  },
  'PROJET MARINA': {
    image: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&h=250&fit=crop',
    description: 'Marina de luxe avec accès direct à la lagune.',
    status: 'En développement',
  },
  'Terre de Songon': {
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&h=250&fit=crop',
    description: 'Terrain aménagé pour un développement résidentiel premium.',
    status: 'Disponible',
  },
  'One Green Dev': {
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop',
    description: 'Développement durable avec espaces verts intégrés.',
    status: 'En développement',
  },
  'Le Golf de Songon': {
    image: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=400&h=250&fit=crop',
    description: 'Golf 18 trous avec clubhouse et installations de classe mondiale.',
    status: 'En construction',
  },
};

// Default info for polygon zones
const defaultInfo: ProjectInfo = {
  image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=400&h=250&fit=crop',
  description: 'Zone de développement du projet Songon.',
  status: 'En étude',
};

export function getProjectInfo(name: string): ProjectInfo {
  return projectData[name.trim()] || defaultInfo;
}
