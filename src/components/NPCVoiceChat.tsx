import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../contexts/SessionContext';
import { useCampaign } from '../contexts/CampaignContext';
import { supabase } from '../services/supabase';
import { NPCVoiceHandler } from '../handlers/NPCVoiceHandler';
import { speechToText, textToSpeech } from '../services/speechServices';
import { Button, Text, Box, Flex, Avatar, Select, Textarea, IconButton } from '@chakra-ui/react';
import { FaMicrophone, FaStop, FaPlay, FaPause, FaVolumeUp } from 'react-icons/fa';

interface NPCVoiceChatProps {
  selectedNpcId?: string;
  onNpcSelect?: (npcId: string) => void;
  contextNote?: string;
}

/**
 * NPCVoiceChat - A component for voice interactions with NPCs
 * Allows users to speak to NPCs and hear their responses
 */
const NPCVoiceChat: React.FC<NPCVoiceChatProps> = ({
  selectedNpcId,
  onNpcSelect,
  contextNote
}) => {
  // State management
  const [npcs, setNpcs] = useState<any[]>([]);
  const [currentNpcId, setCurrentNpcId] = useState<string>(selectedNpcId || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerMessage, setPlayerMessage] = useState('');
  const [npcResponse, setNpcResponse] = useState('');
  const [interactions, setInteractions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const npcVoiceHandlerRef = useRef<NPCVoiceHandler | null>(null);
  
  // Context hooks
  const { session } = useSession();
  const { campaign } = useCampaign();
  
  // Initialize on component mount
  useEffect(() => {
    // Initialize audio context
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Initialize NPCVoiceHandler
    if (session && campaign) {
      const context = {
        sessionId: session.id,
        campaignId: campaign.id,
        userId: session.userId,
        timestamp: new Date().toISOString()
      };
      
      npcVoiceHandlerRef.current = new NPCVoiceHandler(
        context,
        speechToText,
        textToSpeech
      );
      
      // Load NPCs for this campaign
      loadNpcs();
    }
    
    return () => {
      // Cleanup
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (npcVoiceHandlerRef.current) {
        npcVoiceHandlerRef.current.releaseAllNPCAgents();
      }
    };
  }, [session, campaign]);
  
  // Update currentNpcId when selectedNpcId prop changes
  useEffect(() => {
    if (selectedNpcId && selectedNpcId !== currentNpcId) {
      setCurrentNpcId(selectedNpcId);
      loadInteractions(selectedNpcId);
    }
  }, [selectedNpcId]);
  
  // Load NPCs from the database
  const loadNpcs = async () => {
    if (!campaign) return;
    
    try {
      const { data, error } = await supabase
        .from('npcs')
        .select(`
          id,
          name,
          description,
          voice_profile_id,
          voice_characteristics,
          status
        `)
        .eq('campaign_id', campaign.id);
        
      if (error) {
        console.error('Error loading NPCs:', error);
        return;
      }
      
      setNpcs(data || []);
      
      // If we have NPCs but no current selection, select the first one
      if (data && data.length > 0 && !currentNpcId) {
        setCurrentNpcId(data[0].id);
        if (onNpcSelect) {
          onNpcSelect(data[0].id);
        }
        loadInteractions(data[0].id);
      }
    } catch (error) {
      console.error('Error in loadNpcs:', error);
    }
  };
  
  // Load interaction history for the selected NPC
  const loadInteractions = async (npcId: string) => {
    if (!npcId || !session) return;
    
    try {
      const { data, error } = await supabase
        .from('npc_interactions')
        .select('*')
        .eq('npc_id', npcId)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) {
        console.error('Error loading interactions:', error);
        return;
      }
      
      // Reverse to display in chronological order
      setInteractions((data || []).reverse());
    } catch (error) {
      console.error('Error in loadInteractions:', error);
    }
  };
  
  // Handle NPC selection
  const handleNpcChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const npcId = e.target.value;
    setCurrentNpcId(npcId);
    loadInteractions(npcId);
    
    if (onNpcSelect) {
      onNpcSelect(npcId);
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = processRecording;
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  // Stop recording and process audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Process the recorded audio
  const processRecording = async () => {
    try {
      setIsLoading(true);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Process with our NPC voice handler
      if (npcVoiceHandlerRef.current && currentNpcId) {
        const result = await npcVoiceHandlerRef.current.handleVoiceInput(
          arrayBuffer,
          currentNpcId,
          contextNote
        );
        
        // Update state with response
        setNpcResponse(result.textResponse);
        
        // Play audio response
        playAudioBuffer(result.audioResponse);
        
        // Refresh interactions
        loadInteractions(currentNpcId);
      }
    } catch (error) {
      console.error('Error processing recording:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Submit text input (alternative to voice)
  const handleSubmitText = async () => {
    if (!playerMessage.trim() || !currentNpcId || !npcVoiceHandlerRef.current) return;
    
    try {
      setIsLoading(true);
      
      // Process with our NPC voice handler
      const result = await npcVoiceHandlerRef.current.handleTextInput(
        playerMessage,
        currentNpcId,
        contextNote
      );
      
      // Update state with response
      setNpcResponse(result.textResponse);
      
      // Clear input
      setPlayerMessage('');
      
      // Refresh interactions
      loadInteractions(currentNpcId);
    } catch (error) {
      console.error('Error submitting text:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Play an audio buffer
  const playAudioBuffer = async (buffer: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    
    try {
      setIsPlaying(true);
      
      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(buffer);
      
      // Create source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      // Play audio
      source.start();
      
      // Handle completion
      source.onended = () => {
        setIsPlaying(false);
      };
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };
  
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} width="100%">
      <Flex direction="column" height="100%">
        {/* NPC Selection */}
        <Flex mb={4} alignItems="center">
          <Text fontWeight="bold" mr={2}>Speaking with:</Text>
          <Select
            value={currentNpcId}
            onChange={handleNpcChange}
            placeholder="Select an NPC"
            maxWidth="300px"
            aria-label="Select NPC to chat with"
          >
            {npcs.map(npc => (
              <option key={npc.id} value={npc.id}>
                {npc.name} {npc.status ? `(${npc.status})` : ''}
              </option>
            ))}
          </Select>
        </Flex>
        
        {/* Conversation Display */}
        <Box
          borderWidth="1px"
          borderRadius="md"
          p={3}
          mb={4}
          height="300px"
          overflowY="auto"
          bgColor="gray.50"
        >
          {interactions.map((interaction, index) => (
            <Flex 
              key={index} 
              mb={2} 
              direction={interaction.speaker_type === 'player' ? 'row' : 'row-reverse'}
            >
              <Avatar 
                size="sm" 
                name={interaction.speaker_type === 'player' ? session?.username : npcs.find(n => n.id === currentNpcId)?.name}
                src={interaction.speaker_type === 'player' ? undefined : '/npc-avatar.png'}
                bg={interaction.speaker_type === 'player' ? "blue.500" : "green.500"}
                mr={interaction.speaker_type === 'player' ? 2 : 0}
                ml={interaction.speaker_type === 'player' ? 0 : 2}
              />
              <Box
                maxWidth="80%"
                p={2}
                borderRadius="md"
                bg={interaction.speaker_type === 'player' ? "blue.100" : "green.100"}
              >
                <Text>{interaction.content}</Text>
              </Box>
            </Flex>
          ))}
          
          {npcResponse && interactions.length === 0 && (
            <Flex direction="row-reverse" mb={2}>
              <Avatar 
                size="sm" 
                name={npcs.find(n => n.id === currentNpcId)?.name}
                src={'/npc-avatar.png'}
                bg="green.500"
                ml={2}
              />
              <Box
                maxWidth="80%"
                p={2}
                borderRadius="md"
                bg="green.100"
              >
                <Text>{npcResponse}</Text>
              </Box>
            </Flex>
          )}
        </Box>
        
        {/* Voice Input Controls */}
        <Flex mb={4} justifyContent="center">
          <IconButton
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            icon={isRecording ? <FaStop /> : <FaMicrophone />}
            colorScheme={isRecording ? "red" : "blue"}
            size="lg"
            isRound
            onClick={isRecording ? stopRecording : startRecording}
            mr={4}
            isDisabled={!currentNpcId || isLoading}
          />
          
          <IconButton
            aria-label="Play last response"
            icon={isPlaying ? <FaPause /> : <FaPlay />}
            colorScheme="green"
            size="lg"
            isRound
            isDisabled={!npcResponse || isLoading || isRecording || isPlaying}
            onClick={() => {
              // Implementation would depend on how audio is stored
              // This is a placeholder
              console.log("Play functionality would be implemented here");
            }}
          />
        </Flex>
        
        {/* Text Input Alternative */}
        <Flex>
          <Textarea
            placeholder="Or type your message here..."
            value={playerMessage}
            onChange={(e) => setPlayerMessage(e.target.value)}
            mr={2}
            disabled={!currentNpcId || isLoading || isRecording}
          />
          <Button
            colorScheme="blue"
            onClick={handleSubmitText}
            isDisabled={!playerMessage.trim() || !currentNpcId || isLoading || isRecording}
            isLoading={isLoading}
          >
            Send
          </Button>
        </Flex>
        
        {/* Status Indicator */}
        {isLoading && (
          <Text textAlign="center" mt={2} fontSize="sm" color="gray.500">
            Processing...
          </Text>
        )}
      </Flex>
    </Box>
  );
};

export default NPCVoiceChat; 