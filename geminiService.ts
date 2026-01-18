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
      if (errorMsg.includes("limit: 0") || errorMsg.includes("Quota exceeded")) {
        throw new Error("COTA_ZERO: Sua chave API está com limite ZERO. Isso significa que você precisa ativar a 'Generative Language API' no Google AI Studio (aistudio.google.com) ou aceitar os Termos de Serviço.");
      }

      lastError = errorMsg;
      console.warn(`Tentativa com ${config.model} falhou: ${errorMsg}`);
    } catch (e: any) {
      if (e.message.startsWith("COTA_ZERO")) throw e;
      lastError = e.message;
    }
  }

  throw new Error(`Não foi possível conectar ao Gemini. Verifique se o modelo está habilitado na sua conta. Detalhe: ${lastError}`);
}

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  if (isPlaceholder) {
    throw new Error("Chave API não configurada no Vercel.");
  }

  const promptText = `Ação: Gere uma escala militar para ${month + 1}/${year}. 
    Militares: ${JSON.stringify(militaryData.map(m => ({ id: m.id, rank: m.rank, name: m.name })))}
    Regras: 48h de descanso, distribuição justa.
    Instruções: ${customPrompt || 'Nenhuma.'}
    Saída: APENAS o JSON do array de objetos.`;

  const payload = {
    contents: [{ parts: [{ text: promptText }] }]
  };

  // Matriz de tentativas: Modelos e Versões de API
  const configsToTry = [
    { model: 'gemini-1.5-flash', version: 'v1beta' },
    { model: 'gemini-1.5-pro', version: 'v1beta' },
    { model: 'gemini-pro', version: 'v1' }, // Fallback para versão estável
  ];

  try {
    const data = await fetchWithFallback(payload, configsToTry);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Resposta vazia da IA.");

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (error: any) {
    console.error("Erro final:", error);
    throw error;
  }
}
