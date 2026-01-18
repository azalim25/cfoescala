const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Diagnóstico de Chave
const isPlaceholder = !apiKey || apiKey === "PLACEHOLDER_API_KEY";
const keyPrefix = apiKey ? apiKey.substring(0, 4) : "NULA";
const keyLength = apiKey ? apiKey.length : 0;

if (isPlaceholder) {
  console.error("ERRO CRÍTICO: Chave API do Gemini não configurada!");
} else {
  console.log(`Gemini Service iniciado. Key: ${keyPrefix}... (Tam: ${keyLength})`);
}

/**
 * Tenta listar os modelos disponíveis para descobrir o nome correto suportado pela chave.
 */
async function listAvailableModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("Modelos disponíveis para sua chave:", data.models.map((m: any) => m.name));
      return data.models.map((m: any) => m.name.split('/').pop());
    }
    console.error("Não foi possível listar modelos:", data);
  } catch (e) {
    console.error("Erro ao tentar listar modelos:", e);
  }
  return [];
}

/**
 * Tenta gerar o conteúdo usando uma lista de modelos e versões de API.
 */
async function fetchWithFallback(payload: any, configs: { model: string, version: string }[]) {
  let lastError = "";

  for (const config of configs) {
    try {
      console.log(`Tentando: ${config.model} (${config.version})...`);
      const url = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        return data;
      }

      const errorMsg = data.error?.message || `Erro HTTP ${response.status}`;

      // Detecção de cota zero (API desativada)
      if (errorMsg.includes("limit: 0") || errorMsg.includes("Quota exceeded") || response.status === 429) {
        throw new Error("COTA_EXCEDIDA: Sua chave API atingiu o limite ou a cota está zerada no Google Cloud. Verifique o faturamento ou as restrições da chave.");
      }

      lastError = errorMsg;
      console.warn(`Tentativa com ${config.model} falhou: ${errorMsg}`);

      if (response.status === 404) {
        console.log("DICA: Modelo não encontrado. Tentando listar modelos disponíveis para diagnóstico...");
        await listAvailableModels();
      }
    } catch (e: any) {
      if (e.message.startsWith("COTA_EXCEDIDA")) throw e;
      lastError = e.message;
    }
  }

  throw new Error(`Falha na conexão com Gemini. Detalhe: ${lastError}\n\nSugestão: Verifique se a 'Generative Language API' está ativada no Google Cloud Console.`);
}

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  if (isPlaceholder) throw new Error("Chave API não configurada.");

  const militarySummary = militaryData.map(m => `${m.rank} ${m.name}`).join(', ');
  const promptText = `
    Aja como um especialista em escalas militares.
    Contexto: Mês ${month + 1}/${year}. CFO (Bombeiros).
    Militares: ${militarySummary}
    Regras: 48h de descanso. Tipos: Escala Geral, Comandante da Guarda, Sobreaviso.
    Instruções do Usuário: ${customPrompt || 'Nenhuma.'}
    Saída: Retorne um array JSON com objetos contendo militaryId, date (YYYY-MM-DD), type, startTime, endTime, location, status.
    Responda apenas o JSON.
  `;

  const payload = {
    contents: [{ parts: [{ text: promptText }] }]
  };

  const configsToTry = [
    { model: 'gemini-1.5-flash', version: 'v1beta' },
    { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
    { model: 'gemini-1.5-pro', version: 'v1beta' },
    { model: 'gemini-pro', version: 'v1beta' },
  ];

  try {
    const data = await fetchWithFallback(payload, configsToTry);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("A IA retornou uma resposta sem conteúdo.");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error: any) {
    console.error("Erro Final:", error);
    throw error;
  }
}
