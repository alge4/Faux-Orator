import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { create } from 'zustand';

// Types
interface Campaign {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  setting: string;
  theme: string;
  is_active: boolean;
}

interface CampaignContextType {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  loading: boolean;
  error: string | null;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  createCampaign: (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
}

// Default context values
const defaultContext: CampaignContextType = {
  campaigns: [],
  currentCampaign: null,
  loading: true,
  error: null,
  setCurrentCampaign: () => {},
  createCampaign: async () => null,
  updateCampaign: async () => {},
  deleteCampaign: async () => {},
  refreshCampaigns: async () => {},
};

// Create the context
const CampaignContext = createContext<CampaignContextType>(defaultContext);

// Provider component
export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch campaigns with deduplication
  const fetchCampaigns = async () => {
    if (!user) {
      setCampaigns([]);
      setCurrentCampaign(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use a static local cache for this hook specifically
      const CAMPAIGNS_CACHE_KEY = `campaigns_${user.id}`;
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
      
      // Check localStorage for cached campaigns
      const cachedData = localStorage.getItem(CAMPAIGNS_CACHE_KEY);
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          
          // If cache is still valid, use it
          if (now - timestamp < CACHE_TTL) {
            console.log('Using cached campaigns data');
            setCampaigns(data || []);
            
            // Handle current campaign selection from cached data
            if (data && data.length > 0 && !currentCampaign) {
              const activeCampaign = data.find(c => c.is_active) || data[0];
              setCurrentCampaign(activeCampaign);
            } else if (currentCampaign) {
              // Update the current campaign if it exists in the cached data
              const updatedCurrent = data?.find(c => c.id === currentCampaign.id);
              if (updatedCurrent) {
                setCurrentCampaign(updatedCurrent);
              } else if (data && data.length > 0) {
                setCurrentCampaign(data[0]);
              } else {
                setCurrentCampaign(null);
              }
            }
            
            setLoading(false);
            return;
          }
        } catch (e) {
          // If parsing fails, just continue to fetch fresh data
          console.error('Error parsing cached campaigns:', e);
        }
      }

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        // Cache the result in localStorage
        localStorage.setItem(CAMPAIGNS_CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        setCampaigns(data || []);
        
        // If we have campaigns but no current campaign, set the first one
        if (data && data.length > 0 && !currentCampaign) {
          const activeCampaign = data.find(c => c.is_active) || data[0];
          setCurrentCampaign(activeCampaign);
        } else if (currentCampaign) {
          // Update the current campaign if it exists in the new data
          const updatedCurrent = data?.find(c => c.id === currentCampaign.id);
          if (updatedCurrent) {
            setCurrentCampaign(updatedCurrent);
          } else if (data && data.length > 0) {
            // If current campaign was deleted, set to the first one
            setCurrentCampaign(data[0]);
          } else {
            setCurrentCampaign(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
      
      // Don't try to automatically retry - this could lead to runaway requests
      // The user can manually refresh or navigate to trigger a new fetch
    } finally {
      setLoading(false);
    }
  };

  // Create a new campaign
  const createCampaign = async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user) {
      console.log('No user found, cannot create campaign');
      return null;
    }

    try {
      console.log('Creating campaign in Supabase:', {
        ...campaign,
        created_by: user.id
      });
      
      setError(null);
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: campaign.name,
          description: campaign.description || '',
          setting: campaign.setting || '',
          theme: campaign.theme || '',
          is_active: !!campaign.is_active,
          created_by: user.id,
        })
        .select()
        .single();

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error creating campaign:', error);
        setError(error.message);
        return null;
      }

      // Update local state
      setCampaigns(prev => [data, ...prev]);
      
      // If this is the first campaign or should be active, set it as current
      if (campaigns.length === 0 || campaign.is_active) {
        // If setting this campaign as active, update all others to inactive
        if (campaign.is_active) {
          console.log('Setting campaign as active, updating other campaigns');
          await supabase
            .from('campaigns')
            .update({ is_active: false })
            .neq('id', data.id)
            .eq('created_by', user.id);
        }
        setCurrentCampaign(data);
      }

      return data;
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign');
      return null;
    }
  };

  // Update a campaign
  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    if (!user) return;

    try {
      setError(null);
      const { error, data } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      // If setting this campaign as active, update all others to inactive
      if (updates.is_active) {
        await supabase
          .from('campaigns')
          .update({ is_active: false })
          .neq('id', id)
          .eq('created_by', user.id);
      }

      // Update local state
      setCampaigns(prev => 
        prev.map(c => (c.id === id ? { ...c, ...updates } : updates.is_active ? { ...c, is_active: false } : c))
      );

      // Update current campaign if it's the one being edited
      if (currentCampaign?.id === id) {
        setCurrentCampaign(data);
      }
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Failed to update campaign');
    }
  };

  // Delete a campaign
  const deleteCampaign = async (id: string) => {
    if (!user) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id);

      if (error) {
        setError(error.message);
        return;
      }

      // Update local state
      setCampaigns(prev => prev.filter(c => c.id !== id));

      // If the deleted campaign was the current one, set a new current campaign
      if (currentCampaign?.id === id) {
        const newCurrent = campaigns.find(c => c.id !== id);
        setCurrentCampaign(newCurrent || null);
        
        // If we have a new current campaign, set it as active in the database
        if (newCurrent) {
          await supabase
            .from('campaigns')
            .update({ is_active: true })
            .eq('id', newCurrent.id);
        }
      }
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
    }
  };

  // Effect to load campaigns when user changes
  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const value = {
    campaigns,
    currentCampaign,
    loading,
    error,
    setCurrentCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refreshCampaigns: fetchCampaigns,
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

// Hook for components to use the campaign context
export const useCampaign = () => useContext(CampaignContext);

export enum CampaignMode {
  Planning = 'Planning',
  Running = 'Running',
  Review = 'Review'
}

export type Entity = {
  id: string;
  campaign_id: string;
  type: 'npc' | 'location' | 'faction' | 'item' | 'event' | 'quest' | 'player' | 'story-point' | 'rule' | 'monster' | 'encounter' | 'character' | 'lore';
  name: string;
  content: any;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

// Renamed Campaign type for Zustand store to avoid conflict
export type CampaignData = {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  created_at: string;
  is_favorite: boolean;
  last_accessed: string;
  image_url?: string;
  tags?: string[];
};

type CampaignStore = {
  campaigns: CampaignData[];
  currentCampaign: CampaignData | null;
  campaignMode: CampaignMode;
  isLoading: boolean;
  error: string | null;
  entities: Entity[];
  visibleEntities: Entity[];
  pinnedEntities: Entity[];
  lockedEntities: Entity[];
  activeTabIndex: number;
  
  // Actions
  fetchCampaigns: () => Promise<void>;
  setCurrentCampaign: (campaign: CampaignData) => void;
  setCampaignMode: (mode: CampaignMode) => void;
  fetchEntities: (campaignId: string) => Promise<void>;
  toggleFavorite: (campaignId: string) => Promise<void>;
  updateLastAccessed: (campaignId: string) => Promise<void>;
  pinEntity: (entityId: string) => void;
  unpinEntity: (entityId: string) => void;
  lockEntity: (entityId: string) => void;
  unlockEntity: (entityId: string) => void;
  setActiveTabIndex: (index: number) => void;
  filterEntities: (type?: string, searchTerm?: string) => void;
};

// Mock data for development
const mockCampaigns: CampaignData[] = [
  { 
    id: '18cc8060-aa5b-45a5-b462-5423c3959350', 
    title: 'The Frozen Citadel', 
    owner_id: 'user-1', 
    created_at: '2024-04-01T12:00:00Z', 
    is_favorite: true, 
    last_accessed: '2024-04-05T14:30:00Z',
    description: 'A campaign set in the frozen north where an ancient evil awakens',
    tags: ['Fantasy', 'Horror', 'Active']
  },
  { 
    id: '28dc9170-bb6b-56a6-c573-6534d4969451', 
    title: 'Shadows of New Eden', 
    owner_id: 'user-1', 
    created_at: '2024-03-15T10:00:00Z', 
    is_favorite: false, 
    last_accessed: '2024-04-03T09:15:00Z',
    description: 'Cyberpunk adventure in the sprawling metropolis of New Eden',
    tags: ['Cyberpunk', 'Sci-Fi', 'Active']
  },
  { 
    id: '39ed0280-cc7c-67b7-d684-7645e5070562', 
    title: 'Lost Kingdom of Zaria', 
    owner_id: 'user-1', 
    created_at: '2024-02-10T15:30:00Z', 
    is_favorite: true, 
    last_accessed: '2024-03-28T16:45:00Z',
    description: 'An adventure to uncover the mysteries of a lost desert kingdom',
    tags: ['Fantasy', 'Exploration', 'Archived']
  }
];

// Create the Zustand store
export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: mockCampaigns,
  currentCampaign: null,
  campaignMode: CampaignMode.Planning,
  isLoading: false,
  error: null,
  entities: [],
  visibleEntities: [],
  pinnedEntities: [],
  lockedEntities: [],
  activeTabIndex: 0,
  
  fetchCampaigns: async () => {
    set({ isLoading: true, error: null });
    try {
      // For development, we're using mock data
      // In production, this would be:
      // const { data, error } = await supabase
      //   .from('campaigns')
      //   .select('*')
      //   .order('is_favorite', { ascending: false })
      //   .order('last_accessed', { ascending: false });
      
      // if (error) throw error;
      
      set({ campaigns: mockCampaigns, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  setCurrentCampaign: (campaign) => {
    set({ currentCampaign: campaign });
    get().updateLastAccessed(campaign.id);
  },
  
  setCampaignMode: (mode) => {
    set({ campaignMode: mode });
  },
  
  fetchEntities: async (campaignId) => {
    set({ isLoading: true, error: null });
    try {
      // For development, use mock data
      // In production:
      // const { data, error } = await supabase
      //   .from('entities')
      //   .select('*')
      //   .eq('campaign_id', campaignId);
      
      // if (error) throw error;
      
      // Mock entities
      const mockEntities = [
        // NPCs
        { id: 'npc-1', campaign_id: campaignId, type: 'npc', name: 'Elric the Wise', content: { description: 'An elderly sage with vast knowledge of arcane lore.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-01' },
        { id: 'npc-2', campaign_id: campaignId, type: 'npc', name: 'Captain Vasmir', content: { description: 'A gruff ship captain who knows the northern waters better than anyone.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-02' },
        
        // Locations
        { id: 'loc-1', campaign_id: campaignId, type: 'location', name: 'Frosthold', content: { description: 'A fortified city nestled in the mountains, last bastion of civilization in the north.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-01' },
        { id: 'loc-2', campaign_id: campaignId, type: 'location', name: 'The Frozen Citadel', content: { description: 'An ancient structure of ice and stone, home to a slumbering evil.' }, locked: true, created_at: '2024-04-01', updated_at: '2024-04-03' },
        
        // Factions
        { id: 'fact-1', campaign_id: campaignId, type: 'faction', name: 'The Winter Guard', content: { description: 'Elite soldiers tasked with defending Frosthold and the northern reaches.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-02' },
        
        // Items
        { id: 'item-1', campaign_id: campaignId, type: 'item', name: 'Frostbane', content: { description: 'A legendary sword said to have been forged to combat the ancient evil.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-01' },
        
        // Quests
        { id: 'quest-1', campaign_id: campaignId, type: 'quest', name: 'The Awakening', content: { description: 'Investigate reports of strange occurrences near the Frozen Citadel.' }, locked: false, created_at: '2024-04-01', updated_at: '2024-04-02' },
      ] as Entity[];
      
      set({ 
        entities: mockEntities, 
        visibleEntities: mockEntities,
        lockedEntities: mockEntities.filter(e => e.locked),
        isLoading: false 
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  toggleFavorite: async (campaignId) => {
    const campaign = get().campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    const updatedCampaign = { ...campaign, is_favorite: !campaign.is_favorite };
    
    // Update local state immediately for responsiveness
    set({
      campaigns: get().campaigns.map(c => 
        c.id === campaignId ? updatedCampaign : c
      )
    });
    
    // In production, this would update the database:
    // await supabase
    //   .from('campaigns')
    //   .update({ is_favorite: updatedCampaign.is_favorite })
    //   .eq('id', campaignId);
  },
  
  updateLastAccessed: async (campaignId) => {
    const now = new Date().toISOString();
    
    // Update local state
    set({
      campaigns: get().campaigns.map(c => 
        c.id === campaignId ? { ...c, last_accessed: now } : c
      )
    });
    
    // In production:
    // await supabase
    //   .from('campaigns')
    //   .update({ last_accessed: now })
    //   .eq('id', campaignId);
  },
  
  pinEntity: (entityId) => {
    const entity = get().entities.find(e => e.id === entityId);
    if (!entity || get().pinnedEntities.some(e => e.id === entityId)) return;
    
    set({ pinnedEntities: [...get().pinnedEntities, entity] });
  },
  
  unpinEntity: (entityId) => {
    set({
      pinnedEntities: get().pinnedEntities.filter(e => e.id !== entityId)
    });
  },
  
  lockEntity: (entityId) => {
    const entity = get().entities.find(e => e.id === entityId);
    if (!entity) return;
    
    const updatedEntity = { ...entity, locked: true };
    
    // Update entities and lockedEntities
    set({
      entities: get().entities.map(e => e.id === entityId ? updatedEntity : e),
      visibleEntities: get().visibleEntities.map(e => e.id === entityId ? updatedEntity : e),
      lockedEntities: [...get().lockedEntities, updatedEntity]
    });
    
    // In production:
    // await supabase
    //   .from('entities')
    //   .update({ locked: true })
    //   .eq('id', entityId);
  },
  
  unlockEntity: (entityId) => {
    const entity = get().entities.find(e => e.id === entityId);
    if (!entity) return;
    
    const updatedEntity = { ...entity, locked: false };
    
    // Update entities and lockedEntities
    set({
      entities: get().entities.map(e => e.id === entityId ? updatedEntity : e),
      visibleEntities: get().visibleEntities.map(e => e.id === entityId ? updatedEntity : e),
      lockedEntities: get().lockedEntities.filter(e => e.id !== entityId)
    });
    
    // In production:
    // await supabase
    //   .from('entities')
    //   .update({ locked: false })
    //   .eq('id', entityId);
  },
  
  setActiveTabIndex: (index) => {
    set({ activeTabIndex: index });
  },
  
  filterEntities: (type, searchTerm) => {
    const { entities } = get();
    let filtered = [...entities];
    
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(term) || 
        (typeof e.content.description === 'string' && e.content.description.toLowerCase().includes(term))
      );
    }
    
    set({ visibleEntities: filtered });
  }
}));

// Hook for easier access to the store
export const useCampaignStore2 = () => {
  const {
    campaigns,
    currentCampaign,
    campaignMode,
    fetchCampaigns,
    setCurrentCampaign,
    setCampaignMode,
    fetchEntities,
    toggleFavorite,
    // Include other actions you want to expose
  } = useCampaignStore();
  
  return {
    campaigns,
    currentCampaign,
    campaignMode,
    fetchCampaigns,
    setCurrentCampaign,
    setCampaignMode,
    fetchEntities,
    toggleFavorite,
  };
}; 