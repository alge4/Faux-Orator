import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NetworkView from './NetworkView';
import { Entity } from '../hooks/useCampaign';
import { supabase } from '../services/supabase';
import './CampaignNetworkContainer.css';

// Define a campaign type to avoid using 'any'
interface Campaign {
  id: string;
  name: string;
  description?: string;
  // Add other properties as needed
}

const CampaignNetworkContainer: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!campaignId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch campaign data
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
          
        if (campaignError) throw campaignError;
        
        setCurrentCampaign(campaignData as Campaign);
        
        // Helper function for type-safe entity conversion
        const convertToEntity = (
          item: any, 
          entityType: "npc" | "location" | "faction" | "item" | "event" | "quest"
        ): Entity => ({
          id: item.id,
          name: item.name,
          type: entityType,
          content: {
            description: item.description || ''
          },
          locked: false,
          campaign_id: item.campaign_id,
          created_at: item.created_at,
          updated_at: item.updated_at
        });
        
        // Fetch entities with proper typing
        const fetchEntities = async (
          table: 'npcs' | 'locations' | 'factions' | 'items', 
          entityType: "npc" | "location" | "faction" | "item"
        ) => {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('campaign_id', campaignId);
            
          if (error) throw error;
          
          return (data || []).map(item => convertToEntity(item, entityType));
        };
        
        // Fetch all entity types in parallel
        const [npcs, locations, factions, items] = await Promise.all([
          fetchEntities('npcs', 'npc'),
          fetchEntities('locations', 'location'),
          fetchEntities('factions', 'faction'),
          fetchEntities('items', 'item')
        ]);
        
        // Combine all entities
        setEntities([...npcs, ...locations, ...factions, ...items]);
      } catch (err: any) {
        console.error('Error fetching campaign data:', err);
        setError(err.message || 'Failed to load campaign data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCampaignData();
  }, [campaignId]);
  
  if (isLoading) {
    return (
      <div className="campaign-network-container loading">
        <div className="loading-spinner"></div>
        <p>Loading campaign network...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="campaign-network-container error">
        <div className="error-icon">❌</div>
        <h3>Error loading network</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="campaign-network-container">
      <NetworkView 
        currentCampaign={currentCampaign} 
        entities={entities} 
      />
    </div>
  );
};

export default CampaignNetworkContainer; 