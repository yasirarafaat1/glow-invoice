// src/routes/user.ts
import express from 'express';
import { 
  getAllUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  updateMe,
  getMe
} from '../controllers/userController';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

// User routes
router.get('/me', getMe);
router.patch('/updateMe', updateMe);

// Admin only routes
router.use(restrictTo('admin'));
router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;