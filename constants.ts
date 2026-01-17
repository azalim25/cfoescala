import { Shift } from './types';

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 's1',
    date: '2026-01-01',
    type: 'Oficial de Dia',
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
    type: 'Patrulha Perímetro',
    startTime: '06:00',
    endTime: '18:00',
    location: 'Esplanada',
    militaryId: '4',
    status: 'Confirmado'
  }
];
