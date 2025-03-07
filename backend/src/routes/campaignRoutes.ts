import express, { Request, Response, NextFunction } from 'express';
import { Campaign } from '../models';
import authenticateJWT, { AuthRequest } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all campaigns for the logged-in user
router.get('/', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find campaigns where the user is the DM
      const campaigns = await Campaign.findAll({
        where: { dmId: userId },
        order: [['updatedAt', 'DESC']]
      });

      // TODO: In the future, also include campaigns where the user is a player
      // This will require implementing the CampaignUser model and relationship

      return res.status(200).json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Create a new campaign
router.post('/', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { name, description, imageUrl } = req.body;

      // Validate required fields
      if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
      }

      // Create the campaign
      const campaign = await Campaign.create({
        id: uuidv4(),
        name,
        description,
        imageUrl: imageUrl || null,
        dmId: userId,
        archived: false
      });

      return res.status(201).json({
        ...campaign.get({ plain: true }),
        role: 'DM' // The creator is always the DM
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get a specific campaign by ID
router.get('/:campaignId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        // TODO: In the future, check if the user is a player in the campaign
        // For now, only the DM can access the campaign
        return res.status(403).json({ message: 'You do not have permission to access this campaign' });
      }

      return res.status(200).json({
        ...campaign.get({ plain: true }),
        role: 'DM' // For now, only the DM can access the campaign
      });
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update an existing campaign
router.put('/:campaignId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;
      const { name, description, imageUrl, archived } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to update this campaign' });
      }

      // Update the campaign
      const updatedFields: any = {};
      if (name !== undefined) updatedFields.name = name;
      if (description !== undefined) updatedFields.description = description;
      if (imageUrl !== undefined) updatedFields.imageUrl = imageUrl;
      if (archived !== undefined) updatedFields.archived = archived;

      await campaign.update(updatedFields);

      return res.status(200).json({
        ...campaign.get({ plain: true }),
        role: 'DM'
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete a campaign
router.delete('/:campaignId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to delete this campaign' });
      }

      // Delete the campaign
      await campaign.destroy();

      return res.status(200).json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router; 