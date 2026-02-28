import { Shift } from './types';

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 's1',
    date: '2026-01-01',
    type: 'Comandante da Guarda',
    startTime: '08:00',
    endTime: '08:00',
    location: '1º Batalhão',
    militaryId: '1',
    status: 'Confirmado'
  },
  {
    id: 's2',
    date: '2026-01-02',
    type: 'Comandante da Guarda',
    startTime: '08:00',
    endTime: '08:00',
    location: 'Pel ABM',
    militaryId: '2',
    status: 'Confirmado'
  },
  {
    id: 's3',
    date: '2026-01-30',
    type: 'Manutenção',
    startTime: '08:00',
    endTime: '18:00',
    location: 'Esplanada',
    militaryId: '4',
    status: 'Confirmado'
  }
];

export const SHIFT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Comandante da Guarda': {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-100 dark:border-rose-800',
    dot: 'bg-rose-500'
  },
  'Manutenção': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-800',
    dot: 'bg-emerald-500'
  },
  'Faxina': {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-100 dark:border-cyan-800',
    dot: 'bg-cyan-500'
  },
  'Estágio': {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-100 dark:border-indigo-800',
    dot: 'bg-indigo-500'
  },
  'Sobreaviso': {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-800',
    dot: 'bg-amber-500'
  },
  'Escala Geral': {
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-100 dark:border-slate-800',
    dot: 'bg-slate-500'
  },
  'Escala Diversa': {
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400'
  },
  'Barra': {
    bg: 'bg-pink-50 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-100 dark:border-pink-800',
    dot: 'bg-pink-500'
  }
};

export const SHIFT_TYPE_PRIORITY: Record<string, number> = {
  'Comandante da Guarda': 1,
  'Manutenção': 2,
  'Faxina': 3,
  'Estágio': 4,
  'Sobreaviso': 5,
  'Escala Geral': 6,
  'Escala Diversa': 7,
  'Barra': 8
};

export type PageId = 'dashboard' | 'contacts' | 'personal' | 'generate' | 'extra-hours' | 'ranking' | 'estado-maior' | 'funcoes-turma' | 'stage' | 'comandante-guarda' | 'stage-quantity' | 'hours-control' | 'qtm' | 'provas' | 'qdch' | 'barra-fixa' | 'statistics' | 'relatorio';

export const STAGE_LOCATIONS = [
  'Pel ABM',
  '1° BBM - Batalhão Afonso Pena',
  '2° BBM - Batalhão Contagem',
  '3° BBM - Batalhão Antônio Carlos'
];

export const NAV_LINKS = [
  { to: '/qtm', label: 'QTM', icon: 'event_note', id: 'qtm' as PageId },
  { to: '/', label: 'Calendário', icon: 'calendar_month', id: 'dashboard' as PageId },
  { to: '/contacts', label: 'Contatos', icon: 'contact_page', id: 'contacts' as PageId },
  { to: '/personal', label: 'Minha Escala', icon: 'person_pin', id: 'personal' as PageId },
  { to: '/extra-hours', label: 'Registro de Horas', icon: 'more_time', id: 'extra-hours' as PageId },
  { to: '/ranking', label: 'Ranking', icon: 'leaderboard', id: 'ranking' as PageId },
  { to: '/estado-maior', label: 'Estado Maior', icon: 'military_tech', id: 'estado-maior' as PageId },
  { to: '/funcoes-turma', label: 'Funções de Turma', icon: 'school', id: 'funcoes-turma' as PageId },
  { to: '/stage', label: 'Estágio - Local', icon: 'location_city', id: 'stage' as PageId },
  { to: '/stage-quantity', label: 'Estágio - Qtde', icon: 'analytics', id: 'stage-quantity' as PageId },
  { to: '/comandante-guarda', label: 'Cmd. Guarda', icon: 'military_tech', id: 'comandante-guarda' as PageId },
  { to: '/hours-control', label: 'Controle de Serviços', icon: 'query_stats', id: 'hours-control' as PageId },
  { to: '/qdch', label: 'QDCH', icon: 'monitoring', id: 'qdch' as PageId },
  { to: '/provas', label: 'Provas', icon: 'assignment_turned_in', id: 'provas' as PageId },
  { to: '/barra-fixa', label: 'Barra Fixa', icon: 'fitness_center', id: 'barra-fixa' as PageId },
  { to: '/statistics', label: 'Estatísticas', icon: 'analytics', id: 'statistics' as PageId },
  { to: '/relatorio', label: 'Relatório', icon: 'description', id: 'relatorio' as PageId },
];
