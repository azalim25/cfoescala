// Ordem oficial das 31 disciplinas do CFO II, conforme QDCH.
const DISCIPLINE_ORDER = [
  'Direito Administrativo',
  'Direito Civil Aplicado',
  'Direito Ambiental',
  'Processos Administrativos',
  'Liderança Militar',
  'Didática',
  'Sistemas Informatizados Aplicados',
  'Metodologia Científica',
  'Comunicação Organizacional',
  'Teoria Sociológicas',
  'Gestão de Pessoas',
  'Teoria Geral da Administração',
  'Geometria Analítica de Vetores',
  'Mecânica Vetorial',
  'Hidráulica Aplicada',
  'Teoria das Estruturas',
  'Termodinâmica Aplicada',
  'Urbanismo - Uso e Ocupação do Solo',
  'Mecânica dos Solos',
  'Combate a Incêndio Urbano',
  'Salvamento em Altura',
  'Salvamento Terrestre',
  'Proteção e Defesa Civil',
  'Ordem Unida',
  'Atividade de Inteligência',
  'Materiais de Construção e Estruturas Construtiv',
  'Administração e Logística do Armamento',
  'Intervenção em Emergência com Produtos Perig',
  'Salvamento Aquático',
  'Treinamento Físico Militar',
  'Segurança Contra Incêndio e Pânico',
];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function matchesOrderEntry(disciplineName: string, orderEntry: string): boolean {
  const a = normalize(disciplineName);
  const b = normalize(orderEntry);
  return a.startsWith(b) || b.startsWith(a);
}

export function disciplineOrderIndex(name: string): number {
  const idx = DISCIPLINE_ORDER.findIndex(entry => matchesOrderEntry(name, entry));
  return idx === -1 ? DISCIPLINE_ORDER.length : idx;
}

export function sortDisciplinesByOrder<T extends { name: string }>(disciplines: T[]): T[] {
  return [...disciplines].sort((a, b) => {
    const ia = disciplineOrderIndex(a.name);
    const ib = disciplineOrderIndex(b.name);
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
