import { GoogleGenAI } from "@google/genai";

export async function callGemini(apiKey: string, model: string, prompt: string, systemInstruction?: string, isJson: boolean = false) {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: model || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: isJson ? "application/json" : "text/plain",
    },
  });

  return response.text;
}

export async function callGeminiChat(apiKey: string, model: string, systemInstruction: string, history: any[], message: string) {
  const ai = new GoogleGenAI({ apiKey });
  
  const chat = ai.chats.create({
    model: model || "gemini-3-flash-preview",
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  // Convert history to Gemini format
  // Note: Gemini history usually expects parts
  // But we can also just send the message with history context if needed
  // For simplicity, let's just use generateContent for now if history is complex, 
  // or properly map it.
  
  const response = await ai.models.generateContent({
    model: model || "gemini-3-flash-preview",
    contents: [
      ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    }
  });

  return response.text;
}
