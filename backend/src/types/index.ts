import { Request } from 'express';
import { User } from '../models/User';

export interface AuthRequest extends Request {
    user?: User;
} 