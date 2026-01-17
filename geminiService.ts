
import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
  console.warn("AVISO: VITE_GEMINI_API_KEY não configurada ou é um placeholder.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function optimizeScale(militaryData: any, existingShifts: any) {
  const prompt = `
    Como especialista em escalas militares, sua tarefa é criar a escala de serviço para o mês de JANEIRO de 2024.
    
    REGRAS CRÍTICAS:
    1. RESPEITE OS IMPEDIMENTOS: Cada militar possui uma lista de datas (ex: "2024-01-05") em que NÃO pode ser escalado sob hipótese alguma.
    2. DESCANSO: Mínimo de 48h entre o término de um plantão e o início do próximo.
    3. EQUIDADE: Distribua os serviços de forma justa entre os militares disponíveis.
    
    DADOS:
    Militares e seus Impedimentos: ${JSON.stringify(militaryData)}
    
    FORMATE SUA RESPOSTA:
    Apresente a escala dia a dia para o mês inteiro, indicando o militar escalado (Nome e Posto) para cada dia.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um especialista em logística militar focado em escalas de serviço (plantões). Sua resposta deve ser em Português do Brasil.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Erro na otimização com Gemini:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação de otimização.";
  }
}


