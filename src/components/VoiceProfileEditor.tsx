import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { VoiceProfile } from '../types/voice';
import './VoiceProfileEditor.css';

interface VoiceProfileEditorProps {
  npcId?: string;
  campaignId: string;
  onSave: (npcId: string, profile: VoiceProfile) => void;
  onCancel: () => void;
}

const VoiceProfileEditor: React.FC<VoiceProfileEditorProps> = ({
  npcId,
  campaignId,
  onSave,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<{ id: string, name: string }[]>([]);
  const [npcName, setNpcName] = useState('');
  const [profile, setProfile] = useState<VoiceProfile>({
    voice_id: null,
    pitch: 1.0,
    speed: 1.0,
    tone: 'neutral'
  });
  const [previewText, setPreviewText] = useState('Hello adventurers, my name is');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  // Available tone options
  const toneOptions = [
    'neutral', 'friendly', 'confident', 'angry', 'sad', 
    'fearful', 'joyful', 'surprised', 'mysterious', 'royal'
  ];

  // Fetch NPC details and voice profile when npcId changes
  useEffect(() => {
    if (!npcId) return;

    const fetchNpcDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch NPC data including voice profile
        const { data: npc, error } = await supabase
          .from('npcs')
          .select('name, voice_profile')
          .eq('id', npcId)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (npc) {
          setNpcName(npc.name);
          setPreviewText(`Hello adventurers, my name is ${npc.name}.`);
          
          // Set voice profile if it exists, otherwise use defaults
          if (npc.voice_profile) {
            setProfile(npc.voice_profile as VoiceProfile);
          }
        }
      } catch (error) {
        console.error('Error fetching NPC details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNpcDetails();
  }, [npcId]);

  // Fetch available voices when component mounts
  useEffect(() => {
    const fetchAvailableVoices = async () => {
      try {
        setLoadingVoices(true);
        
        // Fetch voice profiles
        const { data, error } = await supabase
          .from('voice_profiles')
          .select('id, name, openai_voice_id');
          
        if (error) {
          throw error;
        }
        
        if (data) {
          // Format for dropdown
          const voices = data.map(voice => ({
            id: voice.openai_voice_id,
            name: voice.name
          }));
          
          setAvailableVoices(voices);
          
          // Set default voice if none is selected
          if (!profile.voice_id && voices.length > 0) {
            setProfile(prev => ({ ...prev, voice_id: voices[0].id }));
          }
        }
      } catch (error) {
        console.error('Error fetching available voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchAvailableVoices();
    
    // Create audio player instance
    const player = new Audio();
    setAudioPlayer(player);
    
    // Cleanup
    return () => {
      if (player) {
        player.pause();
        player.src = '';
      }
    };
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'pitch' || name === 'speed') {
      setProfile(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!npcId) return;
    
    onSave(npcId, profile);
  };

  // Generate preview audio
  const handlePreview = async () => {
    if (!profile.voice_id || !npcId) return;
    
    try {
      setPreviewLoading(true);
      
      // This would call your TTS service in a real implementation
      // For now, we'll simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock URL for demo purposes - in real implementation, this would be the returned audio URL
      const mockAudioUrl = 'https://example.com/audio-preview.mp3';
      setPreviewUrl(mockAudioUrl);
      
      // In a real implementation, you would:
      // 1. Call your TTS service API
      // 2. Set the resulting audio URL to the audio player
      // 3. Play the audio
      
      // Mocked for demo purposes only - would use real audio URL in production
      if (audioPlayer) {
        // audioPlayer.src = mockAudioUrl;
        // audioPlayer.play();
        console.log('Would play audio with these settings:', {
          voice_id: profile.voice_id,
          text: previewText,
          pitch: profile.pitch,
          speed: profile.speed,
          tone: profile.tone
        });
      }
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="voice-profile-editor">
      <div className="editor-header">
        <h2>{npcId ? `Edit Voice: ${npcName}` : 'Create Voice Profile'}</h2>
      </div>
      
      {loading ? (
        <div className="editor-loading">
          <span>Loading voice profile...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group">
            <label htmlFor="voice-select">Voice</label>
            <select 
              id="voice-select"
              name="voice_id"
              value={profile.voice_id || ''}
              onChange={handleChange}
              required
              disabled={loadingVoices}
              aria-label="Select voice"
            >
              {loadingVoices ? (
                <option value="">Loading voices...</option>
              ) : (
                <>
                  <option value="">Select a voice</option>
                  {availableVoices.map(voice => (
                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                  ))}
                </>
              )}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="pitch-slider">Pitch: {profile.pitch.toFixed(1)}</label>
            <div className="slider-container">
              <span className="slider-label">Low</span>
              <input
                id="pitch-slider"
                type="range"
                name="pitch"
                min="0.5"
                max="1.5"
                step="0.1"
                value={profile.pitch}
                onChange={handleChange}
                className="slider"
                aria-label="Pitch adjustment"
              />
              <span className="slider-label">High</span>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="speed-slider">Speed: {profile.speed.toFixed(1)}x</label>
            <div className="slider-container">
              <span className="slider-label">Slow</span>
              <input
                id="speed-slider"
                type="range"
                name="speed"
                min="0.5"
                max="1.5"
                step="0.1"
                value={profile.speed}
                onChange={handleChange}
                className="slider"
                aria-label="Speed adjustment"
              />
              <span className="slider-label">Fast</span>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="tone-select">Tone</label>
            <select 
              id="tone-select"
              name="tone"
              value={profile.tone}
              onChange={handleChange}
              aria-label="Select voice tone"
            >
              {toneOptions.map(tone => (
                <option key={tone} value={tone}>
                  {tone.charAt(0).toUpperCase() + tone.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="preview-section">
            <div className="preview-input">
              <label htmlFor="preview-text">Preview Text</label>
              <input
                id="preview-text"
                type="text"
                value={previewText}
                onChange={e => setPreviewText(e.target.value)}
                placeholder="Enter text to preview"
                aria-label="Preview text"
              />
            </div>
            
            <button 
              type="button" 
              className="preview-button"
              onClick={handlePreview}
              disabled={!profile.voice_id || previewLoading}
              aria-label="Generate voice preview"
            >
              {previewLoading ? 'Generating...' : 'Preview Voice'}
            </button>
          </div>
          
          <div className="action-buttons">
            <button 
              type="button" 
              className="cancel-button"
              onClick={onCancel}
              aria-label="Cancel voice editing"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="save-button"
              disabled={!profile.voice_id}
              aria-label="Save voice profile"
            >
              Save Voice Profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default VoiceProfileEditor; 