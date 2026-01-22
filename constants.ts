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
    location: 'QCG',
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
  'Sobreaviso': {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-800',
    dot: 'bg-amber-500'
  },
  'Faxina': {
    bg: 'bg-cyan-50 dark:bg-cyan-900/30',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-100 dark:border-cyan-800',
    dot: 'bg-cyan-500'
  },
  'Manutenção': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-800',
    dot: 'bg-emerald-500'
  },
  'Estágio': {
    bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-100 dark:border-indigo-800',
    dot: 'bg-indigo-500'
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
  }
};
