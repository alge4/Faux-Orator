import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Typography 
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
import ReactDOM from 'react-dom';

// Campaign interface (from previous CampaignItem.tsx)
interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  role: string;
}

// Person interface for server members
interface Person {
  id: string;
  name: string;
  avatar: string;
  broadcasting: boolean;
}

// Server interface for the server list
interface Server {
  id: string;
  name: string;
  people: Person[];
}

// Sample data for campaigns
const sampleCampaigns: Campaign[] = [
  { id: "1", name: "Sirione", description: "A heroic fantasy campaign", role: "DM" },
  { id: "2", name: "Barovia", description: "Horror-themed campaign", role: "Player" },
  { id: "3", name: "Lost Mines of Phandelver", description: "Starter campaign", role: "DM" },
  { id: "4", name: "Test", description: "Test campaign", role: "DM" },
];

const sampleFavoriteCampaigns: Campaign[] = [
  { id: "1", name: "Sirione", description: "A heroic fantasy campaign", role: "DM" },
  { id: "2", name: "Barovia", description: "Horror-themed campaign", role: "Player" },
];

const sampleRecentCampaigns: Campaign[] = [
  { id: "1", name: "Sirione", description: "A heroic fantasy campaign", role: "DM" },
  { id: "2", name: "Barovia", description: "Horror-themed campaign", role: "Player" },
  { id: "4", name: "Test", description: "Test campaign", role: "DM" },
];

// Sample data for servers and people
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

export default function NodalGraphDashboard() {
  const navigate = useNavigate();
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(sampleCampaigns);
  const [favoriteCampaigns, setFavoriteCampaigns] = useState<Campaign[]>(sampleFavoriteCampaigns);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>(sampleRecentCampaigns);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCampaignId, setMenuCampaignId] = useState<string | null>(null);
  
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  // Focus rename input when renaming starts
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const toggleServer = (serverId: string) => {
    setExpandedServers((prev: string[]) => (prev.includes(serverId) ? prev.filter((id: string) => id !== serverId) : [...prev, serverId]));
  };

  const handleCampaignClick = (campaignId: string) => {
    if (isRenaming !== campaignId) {
      navigate(`/campaigns/${campaignId}`);
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
      onRename(isRenaming, newName);
    }
    setIsRenaming(null);
  };

  const handleDeleteClick = (campaignId: string) => {
    if (window.confirm(`Are you sure you want to delete this campaign?`)) {
      onDelete(campaignId);
    }
    handleCloseMenu();
  };

  const onDelete = (id: string) => {
    setCampaigns(campaigns.filter((campaign: Campaign) => campaign.id !== id));
    setFavoriteCampaigns(favoriteCampaigns.filter((campaign: Campaign) => campaign.id !== id));
    setRecentCampaigns(recentCampaigns.filter((campaign: Campaign) => campaign.id !== id));
  };

  const onRename = (id: string, newName: string) => {
    setCampaigns(campaigns.map((campaign: Campaign) => 
      campaign.id === id ? { ...campaign, name: newName } : campaign
    ));
    setFavoriteCampaigns(favoriteCampaigns.map((campaign: Campaign) => 
      campaign.id === id ? { ...campaign, name: newName } : campaign
    ));
    setRecentCampaigns(recentCampaigns.map((campaign: Campaign) => 
      campaign.id === id ? { ...campaign, name: newName } : campaign
    ));
  };

  const renderCampaignItem = (campaign: Campaign) => (
    <ListItem
      key={campaign.id}
      disablePadding
      secondaryAction={
        <IconButton edge="end" onClick={(e: React.MouseEvent<HTMLElement>) => handleOpenMenu(e, campaign.id)}>
          <ChevronDownIcon />
        </IconButton>
      }
    >
      {isRenaming === campaign.id ? (
        <Box component="form" onSubmit={handleRenameSubmit} sx={{ width: '100%', pl: 2, pr: 2 }}>
          <TextField
            inputRef={renameInputRef}
            value={newName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onClick={(e: React.MouseEvent<HTMLElement>) => e.stopPropagation()}
            size="small"
            fullWidth
            autoFocus
          />
        </Box>
      ) : (
        <ListItemButton onClick={() => handleCampaignClick(campaign.id)}>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText 
            primary={campaign.name} 
            secondary={campaign.role}
          />
        </ListItemButton>
      )}
    </ListItem>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar - Categories */}
      <Drawer
        variant="permanent"
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NetworkIcon />
          <Typography variant="h6">Nodal Graph</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <TextField 
            placeholder="Search campaigns..." 
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
        <Divider />
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          <List>
            <ListItem>
              <Typography variant="subtitle2">Favorite Campaigns</Typography>
            </ListItem>
            {favoriteCampaigns.map((campaign: Campaign) => renderCampaignItem(campaign))}
            
            <Divider sx={{ my: 2 }} />
            <ListItem>
              <Typography variant="subtitle2">Recent</Typography>
            </ListItem>
            {recentCampaigns.map((campaign: Campaign) => renderCampaignItem(campaign))}
            
            <Divider sx={{ my: 2 }} />
            <ListItem
              secondaryAction={
                <IconButton edge="end" size="small">
                  <PlusIcon fontSize="small" />
                </IconButton>
              }
            >
              <Typography variant="subtitle2">Campaigns</Typography>
            </ListItem>
            {campaigns.map((campaign: Campaign) => renderCampaignItem(campaign))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Nodal Graph Dashboard
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<CpuIcon />}
              size="small"
              sx={{ mr: 1 }}
            >
              New Node
            </Button>
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container sx={{ flexGrow: 1, p: 3 }}>
          <Card 
            variant="outlined" 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              p: 4
            }}
          >
            <NetworkIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Nodal Graph Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Select categories from the left sidebar and view server details in the right sidebar.
            </Typography>
          </Card>
        </Container>
      </Box>

      {/* Right Sidebar - Servers and People */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Servers</Typography>
          <IconButton>
            <PlusIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
          {servers.map((server) => (
            <React.Fragment key={server.id}>
              <ListItem
                button
                onClick={() => toggleServer(server.id)}
                secondaryAction={
                  server.people.length > 0 && (
                    <IconButton edge="end" size="small">
                      <ChevronDownIcon 
                        sx={{
                          transform: expandedServers.includes(server.id) ? 'rotate(180deg)' : 'rotate(0)',
                          transition: 'transform 0.3s',
                        }}
                      />
                    </IconButton>
                  )
                }
              >
                <ListItemIcon>
                  <ServerIcon />
                </ListItemIcon>
                <ListItemText primary={server.name} />
              </ListItem>
              <Collapse in={expandedServers.includes(server.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {server.people.map((person) => (
                    <ListItem key={person.id} sx={{ pl: 4 }}>
                      <ListItemAvatar>
                        <Avatar src={person.avatar} alt={person.name} />
                      </ListItemAvatar>
                      <ListItemText 
                        primary={person.name} 
                        secondary={
                          person.broadcasting 
                            ? <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                                <MicIcon fontSize="small" sx={{ mr: 0.5 }} /> Live
                              </Box>
                            : <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                                <MicOffIcon fontSize="small" sx={{ mr: 0.5 }} /> Muted
                              </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Drawer>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => menuCampaignId && handleRenameClick(campaigns.find(c => c.id === menuCampaignId)!)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuCampaignId && handleDeleteClick(menuCampaignId)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <TrashIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

