import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  AppBar, 
  Avatar, 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Collapse, 
  Container, 
  Divider,
  Drawer, 
  Grid, 
  IconButton, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Menu, 
  MenuItem, 
  TextField, 
  Toolbar, 
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  ArrowDropDown as ChevronDownIcon, 
  Computer as CpuIcon, 
  Folder as FolderIcon, 
  Mic as MicIcon, 
  MicOff as MicOffIcon, 
  BubbleChart as NetworkIcon, 
  Add as PlusIcon, 
  Search as SearchIcon, 
  Storage as ServerIcon, 
  Settings as SettingsIcon, 
  Edit as EditIcon, 
  Delete as TrashIcon
} from '@mui/icons-material';
import CreateCampaign from '../components/CreateCampaign';

// Campaign interface (matching CampaignList.tsx)
interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  role: string;
}

// Person interface for the sidebar UI
interface Person {
  id: string;
  name: string;
  avatar: string;
  broadcasting: boolean;
}

// Server interface for the sidebar UI
interface Server {
  id: string;
  name: string;
  people: Person[];
}

// Mock data for servers (can be removed in production)
const servers: Server[] = [
  {
    id: "1",
    name: "General",
    people: [
      { id: "1-1", name: "Alice Johnson", avatar: "/placeholder.svg?height=32&width=32", broadcasting: true },
      { id: "1-2", name: "Bob Smith", avatar: "/placeholder.svg?height=32&width=32", broadcasting: false },
      { id: "1-3", name: "Carol Williams", avatar: "/placeholder.svg?height=32&width=32", broadcasting: true },
    ],
  },
  {
    id: "2",
    name: "Whisper",
    people: [],
  },
  {
    id: "3",
    name: "AFK",
    people: [],
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<string[]>(["1"]); // Default expand General
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [favoriteCampaigns, setFavoriteCampaigns] = useState<Campaign[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCampaignId, setMenuCampaignId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for delete confirmation dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  // Environment variable validation
  useEffect(() => {
    if (!process.env.REACT_APP_API_URL) {
      console.warn("REACT_APP_API_URL is not set. Using default: http://localhost:3000");
    }
  }, []);
  
  // Authentication check and initial data load
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchCampaigns();
  }, [navigate]);
  
  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await axios.get(`${backendUrl}/api/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setCampaigns(response.data);
      
      // For demo purposes, we'll use the same campaigns for favorites and recent
      // In a real app, you would have separate endpoints or filtering logic
      setFavoriteCampaigns(response.data.slice(0, 2));
      setRecentCampaigns(response.data.slice(0, 3));
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      setError(error.response?.data?.message || "Failed to load campaigns");
      setIsLoading(false);
    }
  };

  const toggleServer = (serverId: string) => {
    setExpandedServers((prev: string[]) => (prev.includes(serverId) ? prev.filter((id: string) => id !== serverId) : [...prev, serverId]));
  };

  // Improved campaign click handler with error handling
  const handleCampaignClick = (campaignId: string) => {
    if (isRenaming !== campaignId) {
      try {
        navigate(`/campaigns/${campaignId}`);
      } catch (error) {
        console.error("Navigation error:", error);
        setError("Failed to navigate to campaign");
      }
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, campaignId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuCampaignId(campaignId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuCampaignId(null);
  };

  const handleRenameClick = (campaign: Campaign) => {
    setIsRenaming(campaign.id);
    setNewName(campaign.name);
    handleCloseMenu();
  };

  const handleRenameSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isRenaming && newName.trim() && newName !== campaigns.find((c: Campaign) => c.id === isRenaming)?.name) {
      handleRenameCampaign(isRenaming, newName);
    }
    setIsRenaming(null);
  };

  // Updated delete handler to use Material UI dialog
  const handleDeleteClick = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setConfirmDeleteOpen(true);
    handleCloseMenu();
  };

  // New function to handle delete confirmation
  const confirmDelete = () => {
    if (campaignToDelete) {
      handleDeleteCampaign(campaignToDelete);
      setCampaignToDelete(null);
    }
    setConfirmDeleteOpen(false);
  };

  const handleCreateCampaign = async (name: string, description: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await axios.post(
        `${backendUrl}/api/campaigns`, 
        { name, description },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCampaigns(prev => [...prev, response.data]);
      
      // Also update favorites and recent lists if needed
      // For simplicity, we'll just add to recent
      setRecentCampaigns(prev => [response.data, ...prev].slice(0, 3));
      
      setIsLoading(false);
      setIsCreateModalOpen(false);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      setError(error.response?.data?.message || "Failed to create campaign");
      setIsLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.delete(`${backendUrl}/api/campaigns/${campaignId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      
      // Also remove from favorites and recent if present
      setFavoriteCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      setRecentCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      setError(error.response?.data?.message || "Failed to delete campaign");
      setIsLoading(false);
    }
  };

  const handleRenameCampaign = async (campaignId: string, newName: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await axios.put(
        `${backendUrl}/api/campaigns/${campaignId}`, 
        { name: newName },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Update campaign in all lists
      const updateCampaignInList = (list: Campaign[]) => 
        list.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, name: newName } 
            : campaign
        );
      
      setCampaigns(updateCampaignInList);
      setFavoriteCampaigns(updateCampaignInList);
      setRecentCampaigns(updateCampaignInList);
      
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error renaming campaign:", error);
      setError(error.response?.data?.message || "Failed to rename campaign");
      setIsLoading(false);
    }
  };

  // Updated renderCampaignItem to show role and conditionally show edit/delete buttons
  const renderCampaignItem = (campaign: Campaign) => (
    <ListItem 
      key={campaign.id}
      disablePadding
      sx={{ 
        position: 'relative',
        '&:hover .campaign-actions': { opacity: 1 }
      }}
    >
      {isRenaming === campaign.id ? (
        <Box component="form" onSubmit={handleRenameSubmit} sx={{ width: '100%', pl: 2, pr: 1 }}>
          <TextField
            inputRef={renameInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            fullWidth
            size="small"
            onBlur={() => setIsRenaming(null)}
            InputProps={{
              sx: { fontSize: '0.875rem' }
            }}
          />
        </Box>
      ) : (
        <ListItemButton
          onClick={() => handleCampaignClick(campaign.id)}
          selected={activeCampaign === campaign.id}
          sx={{ 
            borderRadius: 1,
            py: 0.5
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary={campaign.name} 
            secondary={campaign.role} // Show the user's role in this campaign
          />
          {/* Only show edit/delete buttons if user is DM or has appropriate role */}
          {(campaign.role === 'DM' || campaign.role === 'admin') && (
            <Box 
              className="campaign-actions" 
              sx={{ 
                opacity: 0, 
                transition: 'opacity 0.2s',
                display: 'flex'
              }}
            >
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameClick(campaign);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(campaign.id);
                }}
              >
                <TrashIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </ListItemButton>
      )}
    </ListItem>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar - Campaign List */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Toolbar sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Faux Orator
          </Typography>
          <IconButton size="small">
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Toolbar>
        <Box sx={{ px: 2, py: 1 }}>
          <TextField
            placeholder="Search campaigns..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              ),
            }}
          />
        </Box>
        <Divider />
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => setIsCreateModalOpen(true)}
              sx={{ 
                borderRadius: 1,
                py: 0.5
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PlusIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Create Campaign" />
            </ListItemButton>
          </ListItem>
        </List>
        <Divider />
        
        {/* Favorites Section */}
        <List
          subheader={
            <ListItem sx={{ py: 0 }}>
              <ListItemText 
                primary="Favorites" 
                primaryTypographyProps={{ 
                  variant: 'overline',
                  color: 'text.secondary'
                }} 
              />
            </ListItem>
          }
          sx={{ px: 1 }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Typography color="error" variant="body2" sx={{ px: 2 }}>
              {error}
            </Typography>
          ) : favoriteCampaigns.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              No favorite campaigns
            </Typography>
          ) : (
            favoriteCampaigns.map(renderCampaignItem)
          )}
        </List>
        
        {/* Recent Campaigns Section */}
        <List
          subheader={
            <ListItem sx={{ py: 0 }}>
              <ListItemText 
                primary="Recent" 
                primaryTypographyProps={{ 
                  variant: 'overline',
                  color: 'text.secondary'
                }} 
              />
            </ListItem>
          }
          sx={{ px: 1 }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Typography color="error" variant="body2" sx={{ px: 2 }}>
              {error}
            </Typography>
          ) : recentCampaigns.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              No recent campaigns
            </Typography>
          ) : (
            recentCampaigns.map(renderCampaignItem)
          )}
        </List>
        
        {/* All Campaigns Section */}
        <List
          subheader={
            <ListItem sx={{ py: 0 }}>
              <ListItemText 
                primary="All Campaigns" 
                primaryTypographyProps={{ 
                  variant: 'overline',
                  color: 'text.secondary'
                }} 
              />
            </ListItem>
          }
          sx={{ px: 1 }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Typography color="error" variant="body2" sx={{ px: 2 }}>
              {error}
            </Typography>
          ) : campaigns.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              No campaigns found
            </Typography>
          ) : (
            campaigns.map(renderCampaignItem)
          )}
        </List>
      </Drawer>

      {/* Main content area */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Typography variant="h4" gutterBottom>
          Welcome to Faux Orator
        </Typography>
        <Typography paragraph>
          Select a campaign from the sidebar or create a new one to get started.
        </Typography>
        
        {/* Campaign cards grid */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {campaigns.map((campaign) => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
                onClick={() => handleCampaignClick(campaign.id)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {campaign.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Role: {campaign.role}
                  </Typography>
                  <Typography variant="body2">
                    {campaign.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Right Sidebar - Voice Channels */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Toolbar sx={{ px: 2, py: 1, justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap component="div">
            Voice Channels
          </Typography>
          <IconButton size="small">
            <PlusIcon fontSize="small" />
          </IconButton>
        </Toolbar>
        <Divider />
        <List>
          {servers.map((server) => (
            <React.Fragment key={server.id}>
              <ListItem 
                button 
                onClick={() => toggleServer(server.id)}
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {expandedServers.includes(server.id) ? (
                    <ChevronDownIcon fontSize="small" />
                  ) : (
                    <ChevronDownIcon 
                      fontSize="small" 
                      sx={{ transform: 'rotate(-90deg)' }} 
                    />
                  )}
                </ListItemIcon>
                <ListItemText primary={server.name} />
              </ListItem>
              <Collapse in={expandedServers.includes(server.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {server.people.length > 0 ? (
                    server.people.map((person) => (
                      <ListItem key={person.id} sx={{ pl: 4, py: 0.5 }}>
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar 
                            src={person.avatar} 
                            alt={person.name} 
                            sx={{ width: 24, height: 24 }}
                          />
                        </ListItemAvatar>
                        <ListItemText 
                          primary={person.name} 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                        {person.broadcasting ? (
                          <MicIcon fontSize="small" color="success" />
                        ) : (
                          <MicOffIcon fontSize="small" color="disabled" />
                        )}
                      </ListItem>
                    ))
                  ) : (
                    <ListItem sx={{ pl: 4, py: 0.5 }}>
                      <ListItemText 
                        primary="No users in this channel" 
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          color: 'text.secondary',
                          fontSize: '0.75rem'
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </Drawer>

      {/* Context Menu for Campaign Actions */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => menuCampaignId && handleRenameClick(campaigns.find(c => c.id === menuCampaignId)!)}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          Rename
        </MenuItem>
        <MenuItem onClick={() => menuCampaignId && handleDeleteClick(menuCampaignId)}>
          <ListItemIcon><TrashIcon fontSize="small" /></ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Create Campaign Modal */}
      <CreateCampaign 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={handleCreateCampaign} 
      />
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this campaign? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 