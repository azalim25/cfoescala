
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
  console.warn("AVISO: VITE_GEMINI_API_KEY não configurada ou é um placeholder.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  const prompt = `
    Você é um especialista em logística militar do CFO (Corpo de Bombeiros).
    Sua tarefa é montar a escala de serviço para o mês ${month + 1} de ${year}.

    DADOS DOS MILITARES:
    ${JSON.stringify(militaryData.map(m => ({ id: m.id, rank: m.rank, name: m.name })))}

    REGRAS BASE:
    1. Respeite o descanso mínimo de 48h entre serviços.
    2. Garanta uma distribuição equitativa de plantões.
    3. Tipos de serviço: "Comandante da Guarda", "Sobreaviso", "Faxina", "Manutenção", "Estágio", "Escala Geral".
    
    INSTRUÇÕES ADICIONAIS:
    "${customPrompt || 'Nenhuma.'}"

    SAÍDA:
    Retorne APENAS um JSON (array de objetos) com: militaryId, date (YYYY-MM-DD), type, startTime, endTime, location, status.
  `;

  try {
    // Attempt to use gemini-2.0-flash which is more current and less likely to be blocked by v1beta constraints
    const response = await (ai as any).models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: { parts: [{ text: "Você é um especialista em escalas militares. Retorne APENAS o JSON solicitado." }] },
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text);
    if (!text) throw new Error("A IA não retornou nenhum texto.");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);

    // Fallback: try parsing the whole text if it's already a clean JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("JSON não encontrado na resposta da IA.");
    }
  } catch (error: any) {
    console.error("Erro na geração:", error);
    const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    throw new Error(`Erro na API Gemini: ${errorMsg}`);
  }
}
