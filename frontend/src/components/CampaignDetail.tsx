import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Container,
  Breadcrumbs,
  Link,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface Campaign {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  dmId: string;
  createdAt: string;
  updatedAt: string;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setError("No auth token found");
          setLoading(false);
          return;
        }
        
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${backendUrl}/api/campaigns/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setCampaign(response.data);
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching campaign:", error);
        setError(error.response?.data?.message || "Failed to load campaign");
        setLoading(false);
      }
    };

    if (id) {
      fetchCampaign();
    }
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">
          Campaign not found
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          color="inherit" 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">{campaign.name}</Typography>
      </Breadcrumbs>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {campaign.name}
        </Typography>
        <Typography variant="body1" paragraph>
          {campaign.description}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Created: {new Date(campaign.createdAt).toLocaleDateString()}
        </Typography>
      </Paper>
      
      <Button 
        variant="outlined" 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </Container>
  );
};

export default CampaignDetail; 