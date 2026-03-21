import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { getDecryptedKey } from '../services/crypto.js';
import { GoogleGenAI } from '@google/genai';
import { getAnalysisPrompt, getImprovePrompt, getEvalPrompt, getChatSystemInstruction } from '../prompts/systemPrompts.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req: any, res) => {
  const prompts = await prisma.prompt.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(prompts);
});

router.post('/', requireAuth, async (req: any, res) => {
  const { name, description, content } = req.body;
  const prompt = await prisma.prompt.create({
    data: {
      userId: req.user.id,
      name,
      description,
      content,
    }
  });
  res.json(prompt);
});

router.get('/:id', requireAuth, async (req: any, res) => {
  const prompt = await prisma.prompt.findUnique({
    where: { id: req.params.id },
    include: { versions: { orderBy: { version: 'desc' } } },
  });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
  res.json(prompt);
});

router.put('/:id', requireAuth, async (req: any, res) => {
  const { name, description, content, saveVersion, changeNote } = req.body;
  
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  if (saveVersion && content !== prompt.content) {
    const versions = await prisma.promptVersion.findMany({
      where: { promptId: prompt.id },
      orderBy: { version: 'desc' },
      take: 1
    });
    const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
    
    await prisma.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: nextVersion,
        content: prompt.content,
        changeNote: changeNote || 'Auto-saved before update'
      }
    });
  }

  const updated = await prisma.prompt.update({
    where: { id: req.params.id },
    data: { name, description, content }
  });
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  await prisma.prompt.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Analyze Prompt
router.post('/:id/analyze', requireAuth, async (req: any, res) => {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const history = await prisma.message.findMany({
      where: { promptId: prompt.id },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    const analysisPrompt = getAnalysisPrompt(prompt.content, history);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: analysisPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const analysisResult = JSON.parse(response.text || '{}');
    res.json(analysisResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Improve Prompt
router.post('/:id/improve', requireAuth, async (req: any, res) => {
  try {
    const { analysisResult } = req.body;
    const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    const improvePrompt = getImprovePrompt(prompt.content, analysisResult);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: improvePrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const improveResult = JSON.parse(response.text || '{}');
    res.json(improveResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Improvement Chat
router.post('/:id/improvement-chat', requireAuth, async (req: any, res) => {
  try {
    const { message, history } = req.body;
    const prompt = await prisma.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    // Get recent test cases for context
    const testHistory = await prisma.testCase.findMany({
      where: { promptId: prompt.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const systemInstruction = getChatSystemInstruction(prompt.content, testHistory);

    const formattedHistory = history.slice(0, -1).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message });
    const result = JSON.parse(response.text || '{}');

    res.json({
      text: result.message,
      has_changes: result.action === 'suggest' || result.action === 'apply',
      improved_prompt: result.full_prompt_preview,
      diff_summary: result.suggested_changes?.reasoning || 'AI suggestions'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Tests (Batch Evaluation)
router.post('/:id/run-tests', requireAuth, async (req: any, res) => {
  try {
    const promptId = req.params.id;
    const { versionId } = req.body || {};
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Prompt not found' });

    let promptContent = prompt.content;
    if (versionId) {
      const version = await prisma.promptVersion.findUnique({ where: { id: versionId } });
      if (version && version.promptId === promptId) {
        promptContent = version.content;
      }
    }

    const testCases = await prisma.testCase.findMany({
      where: { promptId },
      orderBy: { createdAt: 'asc' }
    });

    if (testCases.length === 0) {
      return res.status(400).json({ error: 'No test cases found for this prompt.' });
    }

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    const results = [];
    let totalScore = 0;

    // Run tests sequentially to avoid rate limits
    for (const tc of testCases) {
      // 1. Generate actual output
      let actualOutput = '';
      try {
        const genResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: tc.input,
          config: {
            systemInstruction: promptContent,
          }
        });
        actualOutput = genResponse.text || '';
      } catch (e: any) {
        actualOutput = `Error generating output: ${e.message}`;
      }

      // 2. Evaluate output
      const evalPrompt = getEvalPrompt(promptContent, tc.input, tc.expectedOutput, actualOutput);
      let evaluation = { score: 0, reasoning: 'Failed to evaluate', passed: false, metrics: {} };
      try {
        const evalResponse = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: evalPrompt,
          config: { responseMimeType: 'application/json' }
        });
        evaluation = JSON.parse(evalResponse.text || '{}');
      } catch (e) {
        console.error('Eval error:', e);
      }

      totalScore += evaluation.score || 0;
      results.push({
        testCaseId: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        score: evaluation.score || 0,
        reasoning: evaluation.reasoning || '',
        passed: evaluation.passed || false,
        metrics: evaluation.metrics || {}
      });
    }

    const overallScore = results.length > 0 ? (totalScore / results.length).toFixed(1) : 0;
    const passedCount = results.filter(r => r.passed).length;

    res.json({
      overallScore: Number(overallScore),
      passedCount,
      totalCount: results.length,
      results
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
