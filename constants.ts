
import { Military, Rank, Shift } from './types';

export const MOCK_MILITARY: Military[] = [
  {
    id: '1',
    name: 'ALEXANDRE BRAIT',
    rank: Rank.CADETE,
    firefighterNumber: '123.456',
    contact: '+55 (11) 98765-4321',
    battalion: 'Guarani'
  },
  {
    id: '2',
    name: 'JOÃO VASCONCELOS',
    rank: Rank.CADETE,
    firefighterNumber: '234.567',
    contact: '+55 (11) 91234-5678',
    battalion: 'Guarani'
  },
  {
    id: '3',
    name: 'EDISON SANTOS',
    rank: Rank.CADETE,
    firefighterNumber: '345.678',
    contact: '+55 (11) 99887-7665',
    battalion: 'Guarani'
  },
  {
    id: '4',
    name: 'MARCUS HOLLOWAY',
    rank: Rank.CADETE,
    firefighterNumber: '456.789',
    contact: '+55 (11) 97777-8888',
    battalion: 'Guarani'
  }
];

export const MOCK_SHIFTS: Shift[] = [
  {
    id: 's1',
    date: '2024-01-01',
    type: 'Oficial de Dia',
    startTime: '08:00',
    endTime: '08:00',
    militaryId: '1',
    status: 'Confirmado'
  },
  {
    id: 's2',
    date: '2024-01-02',
    type: 'Comandante da Guarda',
    startTime: '08:00',
    endTime: '08:00',
    militaryId: '2',
    status: 'Confirmado'
  },
  {
    id: 's3',
    date: '2024-10-24',
    type: 'Patrulha Perímetro',
    startTime: '06:00',
    endTime: '18:00',
    militaryId: '4',
    status: 'Confirmado'
  }
];
