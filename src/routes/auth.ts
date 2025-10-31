import { Router } from 'express';
import { signup, login, refresh, logout, me } from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';

export const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);


