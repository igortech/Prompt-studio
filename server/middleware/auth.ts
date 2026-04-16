import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

export const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies.token;
  
  console.log('Auth check - Authorization header:', authHeader ? 'present' : 'missing');
  console.log('Auth check - Cookie token:', req.cookies.token ? 'present' : 'missing');
  console.log('Auth check - Using token from:', authHeader ? 'Authorization header' : 'cookies');
  
  if (!token) {
    console.log('Auth failed - No token found');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!req.user) throw new Error('User not found');
    console.log('Auth successful for user:', req.user.email);
    next();
  } catch (e) {
    console.log('Auth verification failed:', (e as any).message);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
