const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Diagnóstico de Chave
const isPlaceholder = !apiKey || apiKey === "PLACEHOLDER_API_KEY";
const keyPrefix = apiKey ? apiKey.substring(0, 4) : "NULA";

if (isPlaceholder) {
  console.error("ERRO CRÍTICO: Chave API do Gemini não configurada!");
} else {
  console.log(`Gemini Service iniciado com chave iniciando em: ${keyPrefix}...`);
}

/**
 * Tenta gerar o conteúdo usando uma lista de modelos em ordem de preferência.
 * Isso resolve os erros 404 quando um modelo específico não está disponível para a chave.
 */
async function fetchWithFallback(payload: any, models: string[]) {
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Tentando gerar com o modelo: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return await response.json();
      }

      const errorData = await response.json();
      lastError = errorData.error?.message || `Erro HTTP ${response.status}`;
      console.warn(`Modelo ${model} falhou: ${lastError}`);

      // Se não for um erro de "Modelo não encontrado" (404), não adianta tentar outros modelos
      if (response.status !== 404 && response.status !== 400) {
        break;
      }
    } catch (e: any) {
      lastError = e.message;
      console.error(`Erro na requisição para ${model}:`, e);
    }
  }

  throw new Error(`Nenhum modelo disponível conseguiu processar a solicitação. Último erro: ${lastError}`);
}

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  if (isPlaceholder) {
    throw new Error("Chave API não configurada. Configure o VITE_GEMINI_API_KEY no ambiente do Vercel ou no arquivo .env.local.");
  }

  const promptText = `
    Ação: Como especialista em escalas militares, monte a escala para ${month + 1}/${year}.
    
    Militares: ${JSON.stringify(militaryData.map(m => ({ id: m.id, rank: m.rank, name: m.name })))}
    
    Regras:
    1. Descanso: Mínimo 48h.
    2. Serviços: Comandante da Guarda, Sobreaviso, Faxina, Manutenção, Estágio, Escala Geral.
    3. Instruções: "${customPrompt || 'Nenhuma.'}"

    Saída: Retorne APENAS o JSON (array de objetos) com: militaryId, date (YYYY-MM-DD), type, startTime, endTime, location, status.
  `;

  const payload = {
    contents: [{
      parts: [{ text: promptText }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  };

  // Lista de modelos para fallback em ordem de prioridade
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp'
  ];

  try {
    const data = await fetchWithFallback(payload, modelsToTry);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("A IA retornou uma resposta sem conteúdo.");

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (e) {
      console.error("Falha ao processar JSON. Texto recebido:", text);
      throw new Error("A resposta da IA não está em um formato JSON válido.");
    }
  } catch (error: any) {
    console.error("Erro final na geração da escala:", error);
    throw error;
  }
}
