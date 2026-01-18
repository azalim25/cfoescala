
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
  console.warn("AVISO: VITE_GEMINI_API_KEY não configurada ou é um placeholder.");
}

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string
) {
  const promptText = `
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      systemInstruction: {
        parts: [{ text: "Você é um especialista em escalas militares. Responda apenas com o JSON da escala, sem explicações ou markdown." }]
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Access the text content from the candidate
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    // Parse the JSON array
    try {
      // Find the JSON array in the response (robust parsing)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Erro ao processar JSON da IA:", e, "Texto:", text);
      throw new Error("A resposta da IA não continha um JSON válido.");
    }

  } catch (error: any) {
    console.error("Erro na geração da escala:", error);
    throw new Error(error.message || "Erro desconhecido na comunicação com o Gemini.");
  }
}
