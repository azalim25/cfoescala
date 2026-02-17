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
  customPrompt: string,
  preferencesData: any[],
  existingShifts: any[] = [],
  historicalStats: any = {}
) {
  if (isPlaceholder) throw new Error("Chave API não configurada.");

  // Summary with IDs and historical workload
  const militarySummary = militaryData.map(m =>
    `- ${m.rank} ${m.name} (ID: ${m.id}) [Antiguidade: ${m.antiguidade || 'N/A'}] (Histórico: ${historicalStats[m.id]?.totalHours?.toFixed(1) || 0}h acumuladas)`
  ).join('\n');

  // Summary of preferences (restrictions and priorities)
  const prefsSummary = preferencesData.map(p => {
    const mil = militaryData.find(m => m.id === p.militaryId);
    return mil ? `${mil.rank} ${mil.name} (ID: ${p.militaryId}): ${p.type === 'restriction' ? 'PROIBIDO trabalhar' : 'PREFERE trabalhar'} em ${p.date}` : '';
  }).filter(t => t !== '').join('\n    ');

  // Summary of existing shifts (mandatory fixed points)
  const existingSummary = existingShifts.map(s => {
    const mil = militaryData.find(m => m.id === s.militaryId);
    return mil ? `${mil.rank} ${mil.name} (ID: ${s.militaryId}) já está escalado em ${s.date} para ${s.type}` : '';
  }).filter(t => t !== '').join('\n    ');

  // Summary of last services for the 15-day rule
  const lastServicesSummary = militaryData.map(m => {
    const stats = historicalStats[m.id];
    if (!stats) return '';
    let text = `${m.rank} ${m.name} (ID: ${m.id}):`;
    if (stats.lastCmdGuarda) text += ` Último Cmd. Guarda em ${stats.lastCmdGuarda}.`;
    if (stats.lastEstagio) text += ` Último Estágio em ${stats.lastEstagio}.`;
    return text === `${m.rank} ${m.name} (ID: ${m.id}):` ? '' : text;
  }).filter(t => t !== '').join('\n    ');

  const promptText = `
    Aja como um especialista em escalas militares.
    Contexto: Mês ${month + 1}/${year}. CFO (Bombeiros).
    
    MILITARES DISPONÍVEIS (ID, Nome e Horas Acumuladas):
    ${militarySummary}
    
    RESTRIÇÕES E PREFERÊNCIAS (CRÍTICO):
    ${prefsSummary || 'Nenhuma restrição cadastrada.'}
    
    ESCALAS JÁ DEFINIDAS (OBRIGATÓRIO MANTER - NÃO ALTERAR ESTAS ESCALAS):
    ${existingSummary || 'Nenhuma escala prévia definida.'}

    DATAS DE ÚLTIMOS SERVIÇOS (Para regra de descanso de 15 dias):
    ${lastServicesSummary || 'Nenhum registro prévio relevante.'}
    
    REGRAS OBRIGATÓRIAS (Prio 1-3):
     5. HORÁRIOS PADRÃO (MUITO IMPORTANTE):
        - Comandante da Guarda:
          * Segunda a Sexta (dias úteis): 20:00 às 06:30
          * Sáb, Dom e Feriado: 06:30 às 06:30 (24h)
        - Estágio:
          * Sábado: 08:00 às 08:00 (24h)
          * Domingo e Dias Úteis: 08:00 às 20:00 (12h)
        - Outros: 08:00 às 08:00 por padrão, exceto se especificado.

    Tipos suportados: Comandante da Guarda, Faxina, Manutenção, Estágio, Sobreaviso, Escala Geral.

    Instruções do Usuário: ${customPrompt || 'Nenhuma.'}
    
    SAÍDA: 
    Retorne UM ARRAY JSON COMPLETO (contendo tanto os nomes já escalados quanto os novos) com objetos contendo:
    - militaryId: (O ID fornecido acima para o militar escolhido)
    - date: (YYYY-MM-DD)
    - type: (Um dos tipos suportados)
    - startTime: (08:00 por padrão)
    - endTime: (08:00 por padrão)
    - location: (String)
    - status: "Confirmado"
    
    IMPORTANTE: Responda APENAS o JSON, sem explicações. Retorne a escala COMPLETA do mês.
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
