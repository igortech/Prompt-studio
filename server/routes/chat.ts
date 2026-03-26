import express from 'express';
import prisma from '../services/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getDecryptedKey } from '../services/crypto.js';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

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

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const finalProvider = provider || user?.testProvider || 'google';
    const finalModel = model || user?.testModel || 'gemini-3.1-flash-lite-preview';

    // Save user message
    const userMsg = await prisma.message.create({
      data: { promptId, role: 'user', content }
    });

    let assistantContent = '';
    let debugInfo: any = {};
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let latencyMs = 0;
    const startTime = Date.now();
    console.log(`[Chat] Starting request for prompt ${promptId} with model ${finalModel}`);

    if (finalProvider === 'google') {
      const keyStartTime = Date.now();
      const userKey = await getDecryptedKey(req.user.id, 'google');
      console.log(`[Chat] Key retrieval took ${Date.now() - keyStartTime}ms`);
      
      const apiKey = userKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
      const ai = new GoogleGenAI({ apiKey });

      // Get chat history for context (last 20 messages)
      const historyStartTime = Date.now();
      const history = await prisma.message.findMany({
        where: { promptId },
        orderBy: { createdAt: 'desc' },
        take: 21 // Take 21 to get 20 previous + current
      });
      console.log(`[Chat] History retrieval took ${Date.now() - historyStartTime}ms`);

      const reversedHistory = history.reverse();
      const systemInstruction = prompt.content;

      const formattedHistory = reversedHistory.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = ai.chats.create({
        model: finalModel,
        config: {
          systemInstruction,
        },
        history: formattedHistory
      });

      const aiStartTime = Date.now();
      const response = await chat.sendMessage({ message: content });
      console.log(`[Chat] AI response took ${Date.now() - aiStartTime}ms`);
      assistantContent = response.text || '';
      latencyMs = Date.now() - startTime;

      // Extract metadata
      if (response.usageMetadata) {
        promptTokens = response.usageMetadata.promptTokenCount || 0;
        completionTokens = response.usageMetadata.candidatesTokenCount || 0;
        totalTokens = response.usageMetadata.totalTokenCount || 0;
      }

      debugInfo = {
        model: finalModel,
        provider: 'google',
        usage: response.usageMetadata,
        finishReason: response.candidates?.[0]?.finishReason,
        safetyRatings: response.candidates?.[0]?.safetyRatings,
        latencyMs
      };
    } else if (finalProvider === 'ollama') {
      // Basic Ollama implementation via fetch
      const userKey = await getDecryptedKey(req.user.id, 'ollama');
      if (!userKey) throw new Error('Ollama API key is not configured in settings');
      
      // Assuming Ollama Cloud API endpoint or local
      const endpoint = process.env.OLLAMA_ENDPOINT;
      if (!endpoint) throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
      
      const history = await prisma.message.findMany({
        where: { promptId },
        orderBy: { createdAt: 'desc' },
        take: 11
      });
      
      const reversedHistory = history.reverse();
      const messages = [
        { role: 'system', content: prompt.content },
        ...reversedHistory.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content }
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: finalModel,
          messages,
          stream: false
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Ollama error: ${err}`);
      }

      const data = await response.json();
      assistantContent = data.message?.content || '';
      latencyMs = Date.now() - startTime;

      promptTokens = data.prompt_eval_count || 0;
      completionTokens = data.eval_count || 0;
      totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);

      debugInfo = {
        model: finalModel,
        provider: 'ollama',
        total_duration: data.total_duration,
        load_duration: data.load_duration,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count,
        latencyMs
      };
    }
    
    // Save assistant message
    const assistantMsg = await prisma.message.create({
      data: { 
        promptId, 
        role: 'assistant', 
        content: assistantContent,
        model: finalModel,
        provider: finalProvider,
        promptTokens,
        completionTokens,
        totalTokens,
        latencyMs,
        debugInfo: JSON.stringify(debugInfo)
      }
    });

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/prompt/:promptId/replay', requireAuth, async (req: any, res) => {
  try {
    const promptId = req.params.promptId;
    const { versionId } = req.body;
    
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Prompt not found' });

    let promptContent = prompt.content;
    if (versionId) {
      const version = await prisma.promptVersion.findUnique({ where: { id: versionId } });
      if (version && version.promptId === promptId) {
        promptContent = version.content;
      }
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const finalProvider = user?.testProvider || 'google';
    const finalModel = user?.testModel || 'gemini-3.1-flash-lite-preview';

    // Get all user messages
    const history = await prisma.message.findMany({
      where: { promptId, role: 'user' },
      orderBy: { createdAt: 'asc' }
    });

    if (history.length === 0) {
      return res.status(400).json({ error: 'No history to replay' });
    }

    // Delete all existing messages for this prompt
    await prisma.message.deleteMany({ where: { promptId } });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured');
    const ai = new GoogleGenAI({ apiKey });

    const results = [];
    const chat = ai.chats.create({
      model: finalModel,
      config: { systemInstruction: promptContent }
    });

    for (const msg of history) {
      // Recreate user message
      await prisma.message.create({
        data: {
          promptId,
          role: 'user',
          content: msg.content
        }
      });

      const startTime = Date.now();
      const response = await chat.sendMessage({ message: msg.content });
      const latencyMs = Date.now() - startTime;
      const assistantContent = response.text || '';
      
      // Create assistant message
      await prisma.message.create({
        data: {
          promptId,
          role: 'assistant',
          content: assistantContent,
          model: finalModel,
          provider: finalProvider,
          latencyMs
        }
      });

      results.push({
        originalMessage: msg.content,
        newResponse: assistantContent,
        latencyMs
      });
    }

    res.json({ success: true, results });
  } catch (error: any) {
    console.error('Replay error:', error);
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
