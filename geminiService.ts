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
      // Retornar o nome completo: 'models/gemini-1.5-flash'
      const names = data.models.map((m: any) => m.name);
      console.log("Modelos detectados na sua conta:", names);
      return names;
    }
    console.error("Não foi possível listar modelos:", data);
  } catch (e) {
    console.error("Erro ao listar modelos:", e);
  }
  return [];
}

/**
 * Tenta gerar o conteúdo usando uma lista de modelos e versões de API.
 */
async function fetchWithFallback(payload: any, configs: { model: string, version: string }[]) {
  let lastError = "";

  // 1. Tentar os modelos padrão (flash e pro)
  for (const config of configs) {
    try {
      const url = `https://generativelanguage.googleapis.com/${config.version}/${config.model}:generateContent?key=${apiKey}`;
      console.log(`Solicitando escala para: ${config.model}...`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) return data;

      lastError = data.error?.message || `Status ${response.status}`;
      console.warn(`${config.model} recusou: ${lastError}`);
    } catch (e: any) {
      lastError = e.message;
    }
  }

  // 2. Fallback Dinâmico: usa a lista de 50 modelos que sua chave possui
  console.log("Iniciando busca automática nos 50 modelos disponíveis...");
  const discoveredModels = await listAvailableModels();

  // Filtra apenas modelos que suportam geração de conteúdo
  const candidates = discoveredModels.filter(name =>
    name.includes('flash') || name.includes('pro') || name.includes('1.5')
  );

  for (const fullModelName of candidates.slice(0, 5)) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${apiKey}`;
      console.log(`Tentativa automática com: ${fullModelName}`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) return data;

      const errorMsg = data.error?.message || `Status ${response.status}`;
      lastError = errorMsg;
    } catch (err: any) {
      lastError = err.message;
    }
  }

  throw new Error(`Falha na conexão. Detalhe: ${lastError}\n\nSugestão: Verifique se sua internet não está bloqueando o domínio googleapis.com.`);
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

  // Modelos com o prefixo 'models/' exigido pela API REST direta
  const configsToTry = [
    { model: 'models/gemini-1.5-flash', version: 'v1beta' },
    { model: 'models/gemini-1.5-pro', version: 'v1beta' },
    { model: 'models/gemini-pro', version: 'v1' },
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
