import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { ActivityLog } from '../types/versioning';
import { EntityType } from '../types/locking';
import './DMChangelogPanel.css';

// Define icons for each entity type and change type
const EntityTypeIcon = ({ type }: { type: EntityType }) => {
  const iconMap = {
    npc: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="entity-icon">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
    location: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="entity-icon">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    ),
    item: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="entity-icon">
        <polyline points="9 11 12 14 22 4"></polyline>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
    ),
    faction: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="entity-icon">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    story_arc: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="entity-icon">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ),
  };

  return iconMap[type] || null;
};

interface DMChangelogPanelProps {
  campaignId: string;
  onApprove?: (logId: string) => void;
  onRevert?: (logId: string, entityId: string, entityType: EntityType, oldValue: any) => void;
  onFreeze?: (entityId: string, entityType: EntityType) => void;
}

const DMChangelogPanel: React.FC<DMChangelogPanelProps> = ({
  campaignId,
  onApprove,
  onRevert,
  onFreeze
}) => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    agent?: string;
    entityType?: EntityType;
    reviewed?: boolean;
  }>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Fetch activity logs for this campaign
  useEffect(() => {
    if (!campaignId) return;

    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('agent_activity_logs')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('timestamp', { ascending: false })
          .limit(50);
        
        // Apply filters
        if (filter.agent) {
          query = query.eq('agent_name', filter.agent);
        }
        
        if (filter.entityType) {
          query = query.eq('entity_type', filter.entityType);
        }
        
        if (filter.reviewed !== undefined) {
          query = query.eq('reviewed_by_dm', filter.reviewed);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        setActivityLogs(data || []);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityLogs();
  }, [campaignId, filter]);

  // Mark a log as reviewed
  const handleReview = async (logId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('agent_activity_logs')
        .update({ 
          reviewed_by_dm: true,
          dm_approved: approved,
          dm_reviewed_at: new Date().toISOString()
        })
        .eq('id', logId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setActivityLogs(prev => 
        prev.map(log => 
          log.id === logId 
            ? { ...log, reviewed_by_dm: true, dm_approved: approved, dm_reviewed_at: new Date().toISOString() } 
            : log
        )
      );
      
      if (approved && onApprove) {
        onApprove(logId);
      }
    } catch (error) {
      console.error('Error reviewing log:', error);
    }
  };

  // Revert a change
  const handleRevert = async (log: ActivityLog) => {
    if (log.old_value && onRevert) {
      onRevert(log.id, log.entity_id, log.entity_type as EntityType, log.old_value);
    }
  };

  // Freeze an entity
  const handleFreeze = async (log: ActivityLog) => {
    if (onFreeze) {
      onFreeze(log.entity_id, log.entity_type as EntityType);
    }
  };

  // Toggle expanded state for a log
  const toggleExpand = (logId: string) => {
    setExpanded(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  // Extract unique agent names and entity types for filtering
  const agentNames = [...new Set(activityLogs.map(log => log.agent_name))];
  const entityTypes = [...new Set(activityLogs.map(log => log.entity_type))];

  return (
    <div className="dm-changelog-panel">
      <div className="changelog-header">
        <h2>Agent Activity Log</h2>
        
        <div className="filter-controls">
          <select 
            value={filter.agent || ''} 
            onChange={e => setFilter(prev => ({ ...prev, agent: e.target.value || undefined }))}
            title="Filter by agent"
          >
            <option value="">All Agents</option>
            {agentNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          
          <select 
            value={filter.entityType || ''} 
            onChange={e => setFilter(prev => ({ ...prev, entityType: e.target.value as EntityType || undefined }))}
            title="Filter by entity type"
          >
            <option value="">All Entity Types</option>
            {entityTypes.map(type => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
          
          <select 
            value={filter.reviewed !== undefined ? String(filter.reviewed) : ''} 
            onChange={e => {
              const value = e.target.value;
              setFilter(prev => ({ 
                ...prev, 
                reviewed: value === '' ? undefined : value === 'true'
              }));
            }}
            title="Filter by review status"
          >
            <option value="">All Changes</option>
            <option value="false">Pending Review</option>
            <option value="true">Reviewed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <span>Loading activity logs...</span>
        </div>
      ) : activityLogs.length === 0 ? (
        <div className="empty-state">
          <p>No agent activity logs found for the selected filters.</p>
        </div>
      ) : (
        <div className="changelog-list">
          {activityLogs.map(log => (
            <div 
              key={log.id} 
              className={`changelog-item ${log.reviewed_by_dm ? 'reviewed' : 'pending'} ${expanded[log.id] ? 'expanded' : ''}`}
            >
              <div className="changelog-item-header" onClick={() => toggleExpand(log.id)}>
                <div className="entity-info">
                  <EntityTypeIcon type={log.entity_type as EntityType} />
                  <span className="field-name">{log.field_modified}</span>
                </div>
                
                <div className="agent-info">
                  <span className="agent-name">{log.agent_name}</span>
                  <span className="timestamp">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                
                <div className="mode-badge">
                  {log.mode}
                </div>
                
                <button className="expand-button">
                  {expanded[log.id] ? '▼' : '▶'}
                </button>
              </div>
              
              {expanded[log.id] && (
                <div className="changelog-item-details">
                  <div className="value-comparison">
                    <div className="old-value">
                      <h4>Previous Value</h4>
                      <pre>{JSON.stringify(log.old_value, null, 2)}</pre>
                    </div>
                    <div className="new-value">
                      <h4>New Value</h4>
                      <pre>{JSON.stringify(log.new_value, null, 2)}</pre>
                    </div>
                  </div>
                  
                  {!log.reviewed_by_dm && log.can_rollback && (
                    <div className="action-buttons">
                      <button 
                        className="approve-button"
                        onClick={() => handleReview(log.id, true)}
                      >
                        Approve
                      </button>
                      <button 
                        className="revert-button"
                        onClick={() => handleRevert(log)}
                      >
                        Revert
                      </button>
                      <button 
                        className="freeze-button"
                        onClick={() => handleFreeze(log)}
                      >
                        Freeze Entity
                      </button>
                    </div>
                  )}
                  
                  {log.reviewed_by_dm && (
                    <div className="review-info">
                      <span>
                        {log.dm_approved ? 'Approved' : 'Rejected'} by DM on {new Date(log.dm_reviewed_at || '').toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DMChangelogPanel; 