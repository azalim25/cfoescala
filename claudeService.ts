import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

const isPlaceholder = !apiKey || apiKey === 'PLACEHOLDER_API_KEY';

if (isPlaceholder) {
  console.error('ERRO CRÍTICO: Chave API da Anthropic (Claude) não configurada!');
}

// Chamada feita diretamente do navegador (app estático, sem backend próprio).
// A chave fica exposta no bundle do cliente, assim como ocorria com a
// VITE_GEMINI_API_KEY anteriormente. Para produção com dados sensíveis,
// o recomendado é mover essa chamada para uma função serverless.
const client = new Anthropic({ apiKey: apiKey || '', dangerouslyAllowBrowser: true });

const ShiftSchema = z.object({
  militaryId: z.string(),
  date: z.string(),
  type: z.enum([
    'Comandante da Guarda',
    'Faxina',
    'Manutenção',
    'Estágio',
    'Sobreaviso',
    'Escala Geral',
  ]),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string(),
  status: z.literal('Confirmado'),
});

const ScheduleSchema = z.object({
  shifts: z.array(ShiftSchema),
});

export async function generateAIScale(
  militaryData: any[],
  month: number,
  year: number,
  customPrompt: string,
  preferencesData: any[],
  existingShifts: any[] = [],
  historicalStats: any = {}
) {
  if (isPlaceholder) throw new Error('Chave API não configurada.');

  const militarySummary = militaryData.map(m =>
    `- ${m.rank} ${m.name} (ID: ${m.id}) [Antiguidade: ${m.antiguidade || 'N/A'}] (Histórico: ${historicalStats[m.id]?.totalHours?.toFixed(1) || 0}h acumuladas)`
  ).join('\n');

  const prefsSummary = preferencesData.map(p => {
    const mil = militaryData.find(m => m.id === p.militaryId);
    return mil ? `${mil.rank} ${mil.name} (ID: ${p.militaryId}): ${p.type === 'restriction' ? 'PROIBIDO trabalhar' : 'PREFERE trabalhar'} em ${p.date}` : '';
  }).filter(t => t !== '').join('\n    ');

  const existingSummary = existingShifts.map(s => {
    const mil = militaryData.find(m => m.id === s.militaryId);
    return mil ? `${mil.rank} ${mil.name} (ID: ${s.militaryId}) já está escalado em ${s.date} para ${s.type}` : '';
  }).filter(t => t !== '').join('\n    ');

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

    Retorne a escala COMPLETA do mês (tanto os nomes já escalados quanto os novos), usando o ID de cada militar fornecido acima.
  `;

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content: promptText }],
      output_config: {
        format: zodOutputFormat(ScheduleSchema),
      },
    });

    if (!response.parsed_output) {
      throw new Error('A IA retornou uma resposta que não pôde ser interpretada.');
    }

    return response.parsed_output.shifts;
  } catch (error: any) {
    console.error('Erro Final:', error);
    throw error;
  }
}
