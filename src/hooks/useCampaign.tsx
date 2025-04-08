import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

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

  // Fetch campaigns
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

      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
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