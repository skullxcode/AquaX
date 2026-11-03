import { Router } from 'express';
import prisma from '../config/database.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AquaX API is running!',
  });
});

router.get('/db', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: 'Database connected successfully!',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
