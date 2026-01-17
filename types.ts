
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
}

export interface Shift {
  id: string;
  date: string;
  type: string;
  startTime: string;
  endTime: string;
  militaryId: string;
  status: 'Confirmado' | 'Pendente' | 'Concluído';
}

export interface Impediment {
  id: string;
  militaryId: string;
  reason: string;
  date: string;
}
