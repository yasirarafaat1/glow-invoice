// src/routes/auth.ts
import express from 'express';
import {
  signup,
  login,
  logout,
  protect,
  updateMe,
  getMe,
} from '../controllers/authController';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.use(protect);
router.get('/logout', logout);
router.get('/me', getMe);
router.patch('/updateMe', updateMe);

export default router;