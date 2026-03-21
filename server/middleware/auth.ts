import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

export const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!req.user) throw new Error('User not found');
    next();
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
