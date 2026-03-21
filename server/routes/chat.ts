import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { getDecryptedKey } from '../services/crypto.js';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/prompt/:promptId', requireAuth, async (req: any, res) => {
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.promptId } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  const messages = await prisma.message.findMany({
    where: { promptId: req.params.promptId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/prompt/:promptId', requireAuth, async (req: any, res) => {
  try {
    const { content, parameters, provider, model } = req.body;
    const promptId = req.params.promptId;
    
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Prompt not found' });

    // Save user message
    const userMsg = await prisma.message.create({
      data: { promptId, role: 'user', content }
    });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    // Get chat history for context
    const history = await prisma.message.findMany({
      where: { promptId },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    const systemInstruction = prompt.content;

    const formattedHistory = history.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: model || 'gemini-3.1-flash-preview',
      config: {
        systemInstruction,
      },
      history: formattedHistory
    });

    // Send the actual new message
    const response = await chat.sendMessage({ message: content });
    
    // Save assistant message
    const assistantMsg = await prisma.message.create({
      data: { 
        promptId, 
        role: 'assistant', 
        content: response.text || '',
        model: model || 'gemini-3.1-flash-preview',
        provider: provider || 'google'
      }
    });

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/prompt/:promptId', requireAuth, async (req: any, res) => {
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.promptId } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  await prisma.message.deleteMany({ where: { promptId: req.params.promptId } });
  res.json({ success: true });
});

export default router;
