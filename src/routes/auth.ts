import { Router } from 'express';
import { signup, login, refresh, logout } from '../controllers/authController';

export const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);


