// Mock data for entities when Supabase is unavailable
export const mockNpcs = [
  {
    id: '1',
    name: 'Galadriel',
    description: 'Elven ruler of Lothlórien, wise and powerful.',
    personality: 'Wise, calm, and determined',
    status: 'Alive',
    current_location: 'Caras Galadhon',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:30:00.000Z',
    updated_at: '2025-03-10T14:30:00.000Z'
  },
  {
    id: '2',
    name: 'Aragorn',
    description: 'Heir to the throne of Gondor and skilled ranger.',
    personality: 'Noble, brave, and humble',
    status: 'Alive',
    current_location: 'Rivendell',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:35:00.000Z',
    updated_at: '2025-03-10T14:35:00.000Z'
  },
  {
    id: '3',
    name: 'Saruman',
    description: 'Corrupted wizard and former leader of the White Council.',
    personality: 'Ambitious, manipulative, and power-hungry',
    status: 'Alive',
    current_location: 'Orthanc',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:40:00.000Z',
    updated_at: '2025-03-10T14:40:00.000Z'
  }
];

export const mockLocations = [
  {
    id: '1',
    name: 'Rivendell',
    description: 'Hidden elven valley founded by Elrond.',
    type: 'Elven Settlement',
    parent_location: null,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:45:00.000Z',
    updated_at: '2025-03-10T14:45:00.000Z'
  },
  {
    id: '2',
    name: 'Minas Tirith',
    description: 'Fortified city and capital of Gondor.',
    type: 'City',
    parent_location: null,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:50:00.000Z',
    updated_at: '2025-03-10T14:50:00.000Z'
  },
  {
    id: '3',
    name: 'The Shire',
    description: 'Peaceful homeland of the hobbits.',
    type: 'Region',
    parent_location: null,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T14:55:00.000Z',
    updated_at: '2025-03-10T14:55:00.000Z'
  }
];

export const mockFactions = [
  {
    id: '1',
    name: 'Fellowship of the Ring',
    description: 'Group formed to destroy the One Ring.',
    type: 'Alliance',
    current_status: 'Active',
    goals: 'Destroy the One Ring and defeat Sauron',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:00:00.000Z',
    updated_at: '2025-03-10T15:00:00.000Z'
  },
  {
    id: '2',
    name: 'Kingdom of Gondor',
    description: 'Human kingdom in the south of Middle-earth.',
    type: 'Kingdom',
    current_status: 'Weakened',
    goals: 'Defend against Mordor and restore the line of kings',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:05:00.000Z',
    updated_at: '2025-03-10T15:05:00.000Z'
  },
  {
    id: '3',
    name: 'Forces of Mordor',
    description: 'Armies of Sauron seeking to conquer Middle-earth.',
    type: 'Military',
    current_status: 'Expanding',
    goals: 'Find the One Ring and conquer Middle-earth',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:10:00.000Z',
    updated_at: '2025-03-10T15:10:00.000Z'
  }
];

export const mockItems = [
  {
    id: '1',
    name: 'The One Ring',
    description: 'A ring of power forged by Sauron to control all other rings of power.',
    type: 'Artifact',
    is_magical: true,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:15:00.000Z',
    updated_at: '2025-03-10T15:15:00.000Z'
  },
  {
    id: '2',
    name: 'Andúril',
    description: 'The reforged sword of Elendil, wielded by Aragorn.',
    type: 'Weapon',
    is_magical: true,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:20:00.000Z',
    updated_at: '2025-03-10T15:20:00.000Z'
  },
  {
    id: '3',
    name: 'Mithril Shirt',
    description: 'Lightweight armor made of mithril given to Frodo by Bilbo.',
    type: 'Armor',
    is_magical: true,
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:25:00.000Z',
    updated_at: '2025-03-10T15:25:00.000Z'
  }
];

export const mockQuests = [
  {
    id: '1',
    title: 'Destroy the One Ring',
    description: 'Journey to Mount Doom to destroy the One Ring and defeat Sauron.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:30:00.000Z',
    updated_at: '2025-03-10T15:30:00.000Z'
  },
  {
    id: '2',
    title: 'Defend Helm\'s Deep',
    description: 'Help defend the fortress of Helm\'s Deep against Saruman\'s forces.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:35:00.000Z',
    updated_at: '2025-03-10T15:35:00.000Z'
  },
  {
    id: '3',
    title: 'Reclaim Moria',
    description: 'Aid the dwarves in reclaiming the ancient halls of Moria.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:40:00.000Z',
    updated_at: '2025-03-10T15:40:00.000Z'
  }
];

export const mockEvents = [
  {
    id: '1',
    title: 'Council of Elrond',
    description: 'Meeting in Rivendell to decide the fate of the One Ring.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:45:00.000Z',
    updated_at: '2025-03-10T15:45:00.000Z'
  },
  {
    id: '2',
    title: 'Battle of the Pelennor Fields',
    description: 'Major battle outside the walls of Minas Tirith.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:50:00.000Z',
    updated_at: '2025-03-10T15:50:00.000Z'
  },
  {
    id: '3',
    title: 'Coronation of Aragorn',
    description: 'Aragorn is crowned King of Gondor after the defeat of Sauron.',
    campaign_id: 'c77d2955-ded6-4869-8bf7-8c32bd04a13e',
    created_at: '2025-03-10T15:55:00.000Z',
    updated_at: '2025-03-10T15:55:00.000Z'
  }
];

export const getMockEntities = (entityType: string) => {
  switch (entityType) {
    case 'npc':
      return mockNpcs;
    case 'location':
      return mockLocations;
    case 'faction':
      return mockFactions;
    case 'item':
      return mockItems;
    case 'quest':
      return mockQuests;
    case 'event':
      return mockEvents;
    default:
      return [];
  }
};

export const findMockEntity = (entityType: string, id: string) => {
  const entities = getMockEntities(entityType);
  return entities.find(entity => entity.id === id) || null;
};

export const createMockEntity = (entityType: string, data: any) => {
  const entities = getMockEntities(entityType);
  const newEntity = {
    id: Date.now().toString(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return newEntity;
};

export const updateMockEntity = (entityType: string, id: string, data: any) => {
  const entity = findMockEntity(entityType, id);
  if (!entity) return null;
  
  return {
    ...entity,
    ...data,
    updated_at: new Date().toISOString()
  };
};

export const deleteMockEntity = (entityType: string, id: string) => {
  return true; // Simulates successful deletion
}; 