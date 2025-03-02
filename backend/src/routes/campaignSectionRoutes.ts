import express, { Request, Response, NextFunction } from 'express';
import { CampaignSection, Campaign } from '../models';
import authenticateJWT, { AuthRequest } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all sections for a campaign
router.get('/campaign/:campaignId', 
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

      // Check if the user has access to the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        // TODO: In the future, check if the user is a player in the campaign
        return res.status(403).json({ message: 'You do not have permission to access this campaign' });
      }

      // Get all sections for the campaign
      const sections = await CampaignSection.findAll({
        where: { campaignId },
        order: [['createdAt', 'ASC']]
      });

      return res.status(200).json(sections);
    } catch (error) {
      console.error('Error fetching campaign sections:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Create a new section for a campaign
router.post('/campaign/:campaignId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { campaignId } = req.params;
      const { name, type } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required' });
      }

      // Check if the type is valid
      const validTypes = ["Characters", "Locations", "Plot", "Items", "Events", "Notes"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          message: 'Invalid section type. Must be one of: ' + validTypes.join(', ') 
        });
      }

      // Check if the user has access to the campaign
      const campaign = await Campaign.findOne({
        where: { id: campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to modify this campaign' });
      }

      // Create the section
      const section = await CampaignSection.create({
        id: uuidv4(),
        campaignId,
        name,
        type
      });

      return res.status(201).json(section);
    } catch (error) {
      console.error('Error creating campaign section:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get a specific section by ID
router.get('/:sectionId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { sectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the section
      const section = await CampaignSection.findOne({
        where: { id: sectionId }
      });

      if (!section) {
        return res.status(404).json({ message: 'Section not found' });
      }

      // Check if the user has access to the campaign
      const campaign = await Campaign.findOne({
        where: { id: section.campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        // TODO: In the future, check if the user is a player in the campaign
        return res.status(403).json({ message: 'You do not have permission to access this section' });
      }

      return res.status(200).json(section);
    } catch (error) {
      console.error('Error fetching campaign section:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update a section
router.put('/:sectionId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { sectionId } = req.params;
      const { name, type } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the section
      const section = await CampaignSection.findOne({
        where: { id: sectionId }
      });

      if (!section) {
        return res.status(404).json({ message: 'Section not found' });
      }

      // Check if the user has access to the campaign
      const campaign = await Campaign.findOne({
        where: { id: section.campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to modify this section' });
      }

      // Validate type if provided
      if (type) {
        const validTypes = ["Characters", "Locations", "Plot", "Items", "Events", "Notes"];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ 
            message: 'Invalid section type. Must be one of: ' + validTypes.join(', ') 
          });
        }
      }

      // Update the section
      const updatedFields: any = {};
      if (name !== undefined) updatedFields.name = name;
      if (type !== undefined) updatedFields.type = type;

      await section.update(updatedFields);

      return res.status(200).json(section);
    } catch (error) {
      console.error('Error updating campaign section:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete a section
router.delete('/:sectionId', 
  (req: Request, res: Response, next: NextFunction) => {
    authenticateJWT(req as AuthRequest, res, next);
  },
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      const { sectionId } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find the section
      const section = await CampaignSection.findOne({
        where: { id: sectionId }
      });

      if (!section) {
        return res.status(404).json({ message: 'Section not found' });
      }

      // Check if the user has access to the campaign
      const campaign = await Campaign.findOne({
        where: { id: section.campaignId }
      });

      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if the user is the DM of the campaign
      if (campaign.dmId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to delete this section' });
      }

      // Delete the section
      await section.destroy();

      return res.status(200).json({ message: 'Section deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign section:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router; 