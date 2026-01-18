
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
  console.warn("AVISO: VITE_GEMINI_API_KEY não configurada ou é um placeholder.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  apiVersion: 'v1' // Force stable API version to avoid v1beta 404s
});

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  const prompt = `
    Como especialista em escalas militares (CFO), sua tarefa é montar a escala de serviço para o mês ${month + 1} de ${year}.

    DADOS DOS MILITARES:
    ${JSON.stringify(militaryData.map(m => ({ id: m.id, rank: m.rank, name: m.name })))}

    REGRAS CRÍTICAS:
    1. Descanso: Mínimo de 48h entre plantões.
    2. Equidade: Distribua os serviços de forma justa.
    3. Serviços: Comandante da Guarda, Sobreaviso, Faxina, Manutenção, Estágio, Escala Geral.
    
    INSTRUÇÕES ESPECIAIS:
    "${customPrompt || 'Nenhuma.'}"

    SAÍDA:
    Retorne apenas um array JSON: [{"militaryId": "...", "date": "YYYY-MM-DD", "type": "...", "startTime": "08:00", "endTime": "08:00", "location": "QCG", "status": "Confirmado"}]
  `;

  try {
    const response = await (ai as any).models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Você é um especialista em escalas militares. Responda APENAS com um array JSON válido.\n\n${prompt}`
        }]
      }]
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
