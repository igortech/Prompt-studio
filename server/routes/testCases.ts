import express from 'express';
import prisma from '../services/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getDecryptedKey } from '../services/crypto.js';
import { GoogleGenAI, Type } from '@google/genai';
import { getEvalPrompt, getTestingPrompt } from '../prompts/systemPrompts.js';

const router = express.Router();

router.post('/prompt/:promptId/generate-scenarios', requireAuth, async (req: any, res) => {
  try {
    const { scenarioCount = 5 } = req.body;
    const promptId = req.params.promptId;
    
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Prompt not found' });

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured');
    const ai = new GoogleGenAI({ apiKey });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const model = user?.analysisModel || 'gemini-3-flash-preview';

    const systemInstruction = getTestingPrompt(prompt.content, scenarioCount);

    const response = await ai.models.generateContent({
      model,
      contents: 'Сгенерируй тестовые сценарии.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              description: { type: Type.STRING },
              input: { type: Type.STRING },
              expected_aspects: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['type', 'description', 'input', 'expected_aspects']
          }
        }
      }
    });

    const text = response.text || '[]';
    const scenarios = JSON.parse(text);

    const createdTestCases = [];
    for (const scenario of scenarios) {
      const tc = await prisma.testCase.create({
        data: {
          promptId,
          input: scenario.input,
          expectedOutput: scenario.expected_aspects.join(', ')
        }
      });
      createdTestCases.push(tc);
    }

    res.json(createdTestCases);
  } catch (error: any) {
    console.error('Generate scenarios error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/prompt/:promptId', requireAuth, async (req: any, res) => {
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.promptId } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  const testCases = await prisma.testCase.findMany({
    where: { promptId: req.params.promptId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(testCases);
});

router.post('/prompt/:promptId', requireAuth, async (req: any, res) => {
  const { input, expectedOutput } = req.body;
  const prompt = await prisma.prompt.findUnique({ where: { id: req.params.promptId } });
  if (!prompt || prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

  const testCase = await prisma.testCase.create({
    data: {
      promptId: req.params.promptId,
      input,
      expectedOutput,
    }
  });
  res.json(testCase);
});

router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const { input, expectedOutput } = req.body;
    const testCase = await prisma.testCase.findUnique({ 
      where: { id: req.params.id },
      include: { prompt: true }
    });
    if (!testCase || testCase.prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.testCase.update({
      where: { id: req.params.id },
      data: { input, expectedOutput }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const testCase = await prisma.testCase.findUnique({ 
      where: { id: req.params.id },
      include: { prompt: true }
    });
    if (!testCase || testCase.prompt.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    await prisma.testCase.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run Single Test
router.post('/:id/run', requireAuth, async (req: any, res) => {
  try {
    const testCaseId = req.params.id;
    const { versionId } = req.body || {};
    
    const testCase = await prisma.testCase.findUnique({ 
      where: { id: testCaseId },
      include: { prompt: true }
    });
    
    if (!testCase || testCase.prompt.userId !== req.user.id) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    let promptContent = testCase.prompt.content;
    if (versionId) {
      const version = await prisma.promptVersion.findUnique({
        where: { id: versionId }
      });
      if (version && version.promptId === testCase.promptId) {
        promptContent = version.content;
      }
    }

    const userKey = await getDecryptedKey(req.user.id, 'google');
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');
    const ai = new GoogleGenAI({ apiKey });

    // 1. Generate actual output
    let actualOutput = '';
    try {
      const genResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: testCase.input,
        config: {
          systemInstruction: promptContent,
        }
      });
      actualOutput = genResponse.text || '';
    } catch (e: any) {
      actualOutput = `Error generating output: ${e.message}`;
    }

    // 2. Evaluate output
    const evalPrompt = getEvalPrompt(promptContent, testCase.input, testCase.expectedOutput, actualOutput);
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

    res.json({
      testCaseId: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput,
      score: evaluation.score || 0,
      reasoning: evaluation.reasoning || '',
      passed: evaluation.passed || false,
      metrics: evaluation.metrics || {}
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
