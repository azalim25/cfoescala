
export enum Rank {
  CADETE = 'Cadete'
}

export interface Military {
  id: string;
  name: string;
  fullName?: string;
  rank: Rank;
  firefighterNumber: string;
  contact: string;
  battalion: string;
  antiguidade?: number;
}

export interface Shift {
  id: string;
  date: string;
  type: 'Comandante da Guarda' | 'Faxina' | 'Manutenção' | 'Estágio' | 'Sobreaviso' | 'Escala Geral' | 'Escala Diversa' | 'Barra';
  startTime: string;
  endTime: string;
  location?: string;
  militaryId: string;
  status: 'Confirmado' | 'Pendente' | 'Concluído';
  duration?: number;
}

export interface Impediment {
  id: string;
  militaryId: string;
  reason: string;
  date: string;
}

export interface MilitaryPreference {
  id: string;
  militaryId: string;
  date: string;
  type: 'restriction' | 'priority';
}

export interface Discipline {
  id: string;
  name: string;
  totalHours: number;
}

export interface AcademicSchedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  disciplineId: string | null;
  location?: string;
  description?: string;
  examType?: 'Teórica' | 'Prática';
}

export interface AcademicTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  description: string;
}
