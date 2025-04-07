import React, { useState, useRef, useEffect, /* ChangeEvent, */ FormEvent } from 'react';
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
  // Container, // Unused import
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
  DialogActions,
  Fab,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import { 
  ArrowDropDown as ChevronDownIcon, 
  // Computer as CpuIcon, // Unused import
  Folder as FolderIcon, 
  Mic as MicIcon, 
  MicOff as MicOffIcon, 
  // BubbleChart as NetworkIcon, // Unused import
  Add as PlusIcon, 
  Search as SearchIcon, 
  // Storage as ServerIcon, // Unused import
  Settings as SettingsIcon, 
  Edit as EditIcon, 
  Delete as TrashIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import CreateCampaign from '../components/CreateCampaign';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocketContext } from '../context/WebSocketContext';

// Campaign interface (matching CampaignList.tsx)
interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  dmId: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite?: boolean;
  lastAccessed?: string;
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
  // Add eslint-disable-next-line for unused state variables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  
  // New state for delete confirmation
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  const { instance } = useMsal(); // For handling logout with MSAL
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchorEl);
  
  const { logout, user } = useAuth(); // Get the logout function and user information from auth context
  
  // Use context instead
  const { isConnected, messages, error: wsError, sendMessage } = useWebSocketContext();
  
  // Add sort state for campaigns
  const [sortMethod, setSortMethod] = useState<'name' | 'date'>('name');
  
  // Add state for search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Log WebSocket connection status
  useEffect(() => {
    if (isConnected) {
      console.log('WebSocket connected to server');
    } else {
      console.log('WebSocket disconnected from server');
    }
  }, [isConnected]);
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      // Process the latest message
      const latestMessage = messages[messages.length - 1];
      console.log('Received WebSocket message:', latestMessage);
      
      // Handle different message types
      switch (latestMessage.type) {
        case 'campaign_update':
          // Refresh campaign data
          fetchCampaigns();
          break;
        case 'notification':
          // Display notification to user
          // You could use a notification library here
          break;
        // Add more message types as needed
      }
    }
  }, [messages]);
  
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

  // Modify fetchCampaigns function to add debugging
  const fetchCampaigns = async () => {
    try {
      console.log("Fetching campaigns...");
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error("No auth token found");
        setError("No auth token found");
        setIsLoading(false);
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      console.log(`API URL: ${backendUrl}/api/campaigns`);
      
      const response = await axios.get(`${backendUrl}/api/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Campaigns response:", response.data);
      
      // Add role property if not already present
      const userId = user?.id;
      const campaignsWithRole = response.data.map((campaign: Campaign) => ({
        ...campaign,
        role: campaign.role || (campaign.dmId === userId ? 'DM' : 'Player')
      }));
      
      // Store all campaigns
      setCampaigns(campaignsWithRole);
      
      // Set favorite campaigns
      const favorites = campaignsWithRole.filter((campaign: Campaign) => campaign.isFavorite);
      setFavoriteCampaigns(favorites);
      
      // Set recent campaigns
      const recents = [...campaignsWithRole]
        .filter(campaign => campaign.lastAccessed)
        .sort((a, b) => {
          // Convert string dates to Date objects for comparison
          return new Date(b.lastAccessed || 0).getTime() - new Date(a.lastAccessed || 0).getTime();
        })
        .slice(0, 3);
        
      setRecentCampaigns(recents);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setError("Failed to load campaigns");
      setIsLoading(false);
    }
  };

  const toggleServer = (serverId: string) => {
    setExpandedServers((prev: string[]) => (prev.includes(serverId) ? prev.filter((id: string) => id !== serverId) : [...prev, serverId]));
  };

  // Modify handleCampaignClick to record access when a campaign is clicked
  const handleCampaignClick = (campaignId: string) => {
    // Don't navigate if we're in renaming mode for this campaign
    if (isRenaming === campaignId) {
      return;
    }
    
    // Record access
    recordCampaignAccess(campaignId);
    
    // Navigate to campaign detail page
    navigate(`/campaigns/${campaignId}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const handleSubmitRename = (e: React.FormEvent<HTMLFormElement>, campaignId: string) => {
    e.preventDefault();
    handleRenameCampaign(campaignId, newName);
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
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      const response = await axios.post(
        `${backendUrl}/api/campaigns`,
        { name, description },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      console.log("Campaign created:", response.data);
      
      // Close the create modal
      setIsCreateModalOpen(false);
      
      // Refresh campaigns list
      fetchCampaigns();
    } catch (error) {
      console.error("Error creating campaign:", error);
      setError("Failed to create campaign");
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
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.put(
        `${backendUrl}/api/campaigns/${campaignId}`, 
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Refresh the campaign list
      fetchCampaigns();
      // Reset renaming state
      setIsRenaming(null);
    } catch (error) {
      console.error("Error renaming campaign:", error);
      setError("Failed to rename campaign");
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
        <Box component="form" onSubmit={(e) => handleSubmitRename(e, campaign.id)} sx={{ width: '100%', pl: 2, pr: 1 }}>
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

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    // Use the logout function from AuthContext which will call the backend
    logout();
  };

  const handleProfileSettings = () => {
    // Navigate to profile settings page
    navigate('/profile');
    handleUserMenuClose();
  };

  // Add function to toggle favorite status
  const toggleFavorite = async (campaignId: string) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError("No auth token found");
        return;
      }
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.patch(
        `${backendUrl}/api/campaigns/${campaignId}/favorite`, 
        { isFavorite: !campaign.isFavorite },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update local state
      const updatedCampaigns = campaigns.map(c => {
        if (c.id === campaignId) {
          return { ...c, isFavorite: !c.isFavorite };
        }
        return c;
      });
      
      setCampaigns(updatedCampaigns);
      
      // Update favorites list
      const favorites = updatedCampaigns.filter(c => c.isFavorite);
      setFavoriteCampaigns(favorites);
      
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      setError("Failed to update favorite status");
    }
  };

  // Add function to record campaign access
  const recordCampaignAccess = async (campaignId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
      await axios.post(
        `${backendUrl}/api/campaigns/${campaignId}/access`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update local state
      const now = new Date().toISOString(); // Convert to ISO string to match type
      const updatedCampaigns = campaigns.map(c => {
        if (c.id === campaignId) {
          return { ...c, lastAccessed: now };
        }
        return c;
      });
      
      setCampaigns(updatedCampaigns);
      
      // Update recents
      const recents = [...updatedCampaigns]
        .filter(campaign => campaign.lastAccessed)
        .sort((a, b) => {
          return new Date(b.lastAccessed || 0).getTime() - new Date(a.lastAccessed || 0).getTime();
        })
        .slice(0, 3);
        
      setRecentCampaigns(recents);
      
    } catch (error) {
      console.error("Error recording campaign access:", error);
    }
  };

  // Add sorting function for campaigns
  const getSortedCampaigns = () => {
    return [...campaigns].sort((a, b) => {
      if (sortMethod === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by date (most recent first)
        const dateA = new Date(a.lastAccessed || 0);
        const dateB = new Date(b.lastAccessed || 0);
        return dateB.getTime() - dateA.getTime();
      }
    });
  };

  // Add function to handle sort change
  const handleSortChange = (method: 'name' | 'date') => {
    setSortMethod(method);
  };

  // Add function to handle campaign creation success (to be called from the CreateCampaign component)
  const handleCampaignCreated = () => {
    // Refresh campaigns list
    fetchCampaigns();
    // Close create modal if it's open
    setIsCreateModalOpen(false);
  };

  // Add useEffect to load campaigns on mount
  useEffect(() => {
    console.log("Dashboard mounted, fetching campaigns...");
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Add function to filter campaigns based on search query
  const getFilteredCampaigns = () => {
    if (!searchQuery.trim()) {
      return getSortedCampaigns();
    }
    
    const query = searchQuery.toLowerCase();
    return getSortedCampaigns().filter(campaign => 
      campaign.name.toLowerCase().includes(query) || 
      (campaign.description && campaign.description.toLowerCase().includes(query))
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* AppBar for top navigation */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Faux Orator
          </Typography>
          
          {/* User menu */}
          <IconButton
            onClick={handleUserMenuOpen}
            size="large"
            edge="end"
            color="inherit"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
          >
            <AccountIcon />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={userMenuAnchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={userMenuOpen}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleProfileSettings}>
              <ListItemIcon>
                <AccountIcon fontSize="small" />
              </ListItemIcon>
              Profile Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

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
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchChange}
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
        
        {/* Favorite Campaigns Section */}
        <Box sx={{ my: 3 }}>
          <Typography variant="h6" gutterBottom>
            Favorite Campaigns
          </Typography>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : favoriteCampaigns.length > 0 ? (
            <Grid container spacing={2}>
              {favoriteCampaigns.map((campaign) => (
                <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                  <Card 
                    sx={{ 
                      position: 'relative',
                      cursor: isRenaming === campaign.id ? 'default' : 'pointer' 
                    }}
                  >
                    <CardContent onClick={() => handleCampaignClick(campaign.id)}>
                      {isRenaming === campaign.id ? (
                        <form onSubmit={(e) => handleSubmitRename(e, campaign.id)}>
                          <TextField
                            fullWidth
                            autoFocus
                            inputRef={renameInputRef}
                            defaultValue={campaign.name}
                            variant="outlined"
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </form>
                      ) : (
                        <Typography variant="h6">{campaign.name}</Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {campaign.description}
                      </Typography>
                      
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          Role: {campaign.role}
                        </Typography>
                        
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(campaign.id);
                          }}
                        >
                          {campaign.isFavorite ? (
                            <StarIcon color="warning" />
                          ) : (
                            <StarBorderIcon />
                          )}
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No favorite campaigns yet. Click the star icon to add favorites.</Typography>
          )}
        </Box>
        
        {/* Recent Campaigns Section */}
        <Box sx={{ my: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Campaigns
          </Typography>
          {isLoading ? (
            <CircularProgress size={24} />
          ) : recentCampaigns.length > 0 ? (
            <Grid container spacing={2}>
              {recentCampaigns.map((campaign) => (
                <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                  <Card 
                    sx={{ 
                      position: 'relative',
                      cursor: isRenaming === campaign.id ? 'default' : 'pointer' 
                    }}
                  >
                    {/* Similar content as above */}
                    <CardContent onClick={() => handleCampaignClick(campaign.id)}>
                      {/* Similar content as above */}
                      <Typography variant="h6">{campaign.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {campaign.description}
                      </Typography>
                      
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {campaign.lastAccessed ? 
                            `Last accessed: ${new Date(campaign.lastAccessed).toLocaleDateString()}` : 
                            `Created: ${new Date(campaign.createdAt).toLocaleDateString()}`}
                        </Typography>
                        
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(campaign.id);
                          }}
                        >
                          {campaign.isFavorite ? (
                            <StarIcon color="warning" />
                          ) : (
                            <StarBorderIcon />
                          )}
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No recently accessed campaigns.</Typography>
          )}
        </Box>
        
        {/* All Campaigns Section */}
        <Box sx={{ my: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">All Campaigns</Typography>
            
            <Box>
              <Button
                size="small"
                onClick={() => handleSortChange('name')}
                variant={sortMethod === 'name' ? 'contained' : 'outlined'}
                sx={{ mr: 1 }}
              >
                Sort by Name
              </Button>
              <Button
                size="small"
                onClick={() => handleSortChange('date')}
                variant={sortMethod === 'date' ? 'contained' : 'outlined'}
              >
                Sort by Date
              </Button>
            </Box>
          </Box>
          
          {isLoading ? (
            <CircularProgress size={24} />
          ) : getFilteredCampaigns().length > 0 ? (
            <Grid container spacing={2}>
              {getFilteredCampaigns().map((campaign) => (
                <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                  <Card 
                    sx={{ 
                      position: 'relative',
                      cursor: isRenaming === campaign.id ? 'default' : 'pointer' 
                    }}
                  >
                    <CardContent onClick={() => handleCampaignClick(campaign.id)}>
                      {isRenaming === campaign.id ? (
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleRenameCampaign(campaign.id, newName);
                        }}>
                          <TextField
                            fullWidth
                            autoFocus
                            inputRef={renameInputRef}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            variant="outlined"
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </form>
                      ) : (
                        <Typography variant="h6">{campaign.name}</Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {campaign.description}
                      </Typography>
                      
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {campaign.lastAccessed ? 
                            `Last accessed: ${new Date(campaign.lastAccessed).toLocaleDateString()}` : 
                            `Created: ${new Date(campaign.createdAt).toLocaleDateString()}`}
                        </Typography>
                        
                        <Box>
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(campaign.id);
                            }}
                          >
                            {campaign.isFavorite ? (
                              <StarIcon color="warning" />
                            ) : (
                              <StarBorderIcon />
                            )}
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>No campaigns found. Create one to get started!</Typography>
              <Button 
                variant="contained" 
                startIcon={<PlusIcon />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Campaign
              </Button>
            </Box>
          )}
        </Box>
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
        
        {/* Campaign Table */}
        <Box sx={{ width: '100%', mt: 2, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Available Campaigns
          </Typography>
          <Card>
            <Box sx={{ overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Campaign Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Last Accessed</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={30} />
                      </TableCell>
                    </TableRow>
                  ) : getFilteredCampaigns().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No campaigns found. Create one to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredCampaigns().map((campaign) => (
                      <TableRow 
                        key={campaign.id} 
                        hover 
                        onClick={() => handleCampaignClick(campaign.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {campaign.isFavorite ? (
                              <StarIcon color="warning" fontSize="small" sx={{ mr: 1 }} />
                            ) : (
                              <StarBorderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            )}
                            <Typography variant="body1">{campaign.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{campaign.role || 'Player'}</TableCell>
                        <TableCell>
                          {campaign.lastAccessed 
                            ? new Date(campaign.lastAccessed).toLocaleDateString() 
                            : 'Never'}
                        </TableCell>
                        <TableCell align="center">
                          <Box>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(campaign.id);
                              }}
                            >
                              {campaign.isFavorite ? (
                                <StarIcon color="warning" />
                              ) : (
                                <StarBorderIcon />
                              )}
                            </IconButton>
                            {(campaign.role === 'DM' || campaign.role === 'admin') && (
                              <>
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
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Box>
        
        {/* Campaign cards grid */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {getFilteredCampaigns().map((campaign) => (
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
              <ListItemButton
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
              </ListItemButton>
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
      {isCreateModalOpen && (
        <CreateCampaign 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateCampaign}
        />
      )}
      
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

      {/* Floating Add Button */}
      <Box sx={{ position: 'fixed', bottom: '2rem', right: '2rem' }}>
        <Fab 
          color="primary" 
          aria-label="add campaign"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon />
        </Fab>
      </Box>
    </Box>
  );
} 