
export enum Rank {
  CADETE = 'Cadete'
}

export interface Military {
  id: string;
  name: string;
  rank: Rank;
  firefighterNumber: string;
  contact: string;
  battalion: string;
  antiguidade?: number;
}

export interface Shift {
  id: string;
  date: string;
  type: 'Comandante da Guarda' | 'Faxina' | 'Manutenção' | 'Estágio' | 'Sobreaviso' | 'Escala Geral';
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
