

import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { supabase } from '../supabase';
import { Shift } from '../types';
import { SHIFT_TYPE_COLORS } from '../constants';

interface ExtraHourRecord {
  id: string;
  military_id: string;
  hours: number;
  minutes: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

const PersonalShiftPage: React.FC = () => {
  const { militaries } = useMilitary();
  const { shifts: allShifts } = useShift();
  const [selectedMilitaryId, setSelectedMilitaryId] = useState<string>(militaries[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [extraHours, setExtraHours] = useState<ExtraHourRecord[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  const selectedMilitary = militaries.find(m => m.id === selectedMilitaryId) || militaries[0];

  useEffect(() => {
    if (selectedMilitaryId) {
      fetchExtraHours();
    }
  }, [selectedMilitaryId]);

  const fetchExtraHours = async () => {
    setIsLoadingExtra(true);
    const { data, error } = await supabase
      .from('extra_hours')
      .select('*')
      .eq('military_id', selectedMilitaryId)
      .order('date', { ascending: false });

    if (!error && data) {
      setExtraHours(data);
    }
    setIsLoadingExtra(false);
  };

  const filteredMilitary = militaries.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const personalShifts = allShifts.filter(s => s.militaryId === selectedMilitaryId);

  // Helper to calculate hours from a shift based on specific rules
  const calculateShiftHours = (shift: Shift) => {
    const date = new Date(shift.date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...

    if (shift.type === 'Comandante da Guarda') {
      // Comandante da guarda de segunda a sexta conta como 11 horas de serviço
      // Comandante da guarda sábado e domingo conta como 24 horas de serviço
      if (dayOfWeek >= 1 && dayOfWeek <= 5) return 11;
      return 24;
    }

    if (shift.type === 'Estágio') {
      // Estágio no sábado conta como 24 horas de serviço
      // Estágio no domingo conta como 12 horas de serviço
      if (dayOfWeek === 6) return 24;
      if (dayOfWeek === 0) return 12;
      return 0; // Estágio theoretically only happens on weekends per requirement
    }

    // Sobreaviso, faxina e manutenção quantifique a quantidade de serviços prestados e não em horas.
    return 0;
  };

  // Sections
  const today = new Date().toISOString().split('T')[0];
  const upcomingShifts = personalShifts.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  // Combined workloads
  const totalShiftHours = personalShifts.reduce((acc, s) => acc + calculateShiftHours(s), 0);
  const totalExtraHours = extraHours.reduce((acc, e) => acc + (e.hours + e.minutes / 60), 0);
  const totalWorkload = totalShiftHours + totalExtraHours;

  const totalOtherServices = personalShifts.filter(s =>
    ['Sobreaviso', 'Faxina', 'Manutenção'].includes(s.type)
  ).length;

  const handleExport = () => {
    const headers = ['Data', 'Tipo', 'Início', 'Fim', 'Local', 'Status'].join(',');
    const rows = personalShifts.map(s => [s.date, s.type, s.startTime, s.endTime, s.location || '-', s.status].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `escala_${selectedMilitary.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout activePage="personal">
      <MainLayout.Content>
        {/* Header Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-4 border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="material-symbols-outlined text-3xl">person</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {selectedMilitary.rank} {selectedMilitary.name}
                </h1>
                <span className="material-symbols-outlined text-primary text-lg">verified</span>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Escala Individual • Janeiro 2026</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{selectedMilitary.battalion} • ID: {selectedMilitary.id}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span> Exportar
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
            </button>
          </div>
        </div>

        {/* Section: Próximos Serviços */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">event_upcoming</span>
              Próximos Serviços
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Tipo de Serviço</th>
                  <th className="px-6 py-4">Horário</th>
                  <th className="px-6 py-4">Local</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingShifts.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {new Date(s.date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-md ${SHIFT_TYPE_COLORS[s.type]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type]?.text || 'text-blue-700'} text-[10px] font-bold uppercase border ${SHIFT_TYPE_COLORS[s.type]?.border || 'border-blue-100'}`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-primary">{s.startTime} - {s.endTime}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.location || '-'}</span>
                    </td>
                  </tr>
                ))}
                {upcomingShifts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400 italic text-sm">Nenhum serviço agendado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Carga Horária (Atividades) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Carga Horária (Atividades)
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Atividade</th>
                  <th className="px-6 py-4">Horário/Tempo</th>
                  <th className="px-6 py-4 text-right">Carga Horária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Regular Shifts */}
                {personalShifts.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.type}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Serviço Escala</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.startTime} - {s.endTime}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded">
                        {['Sobreaviso', 'Faxina', 'Manutenção'].includes(s.type) ? '1 Serviço' : `${calculateShiftHours(s)}h`}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Extra Hours */}
                {extraHours.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{e.category || 'Hora Extra'}</span>
                        <span className="text-[10px] text-primary uppercase font-bold">{e.description || 'Atividade Extra'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {e.hours}h {e.minutes}min
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
                        {(e.hours + e.minutes / 60).toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                ))}

                {personalShifts.length === 0 && extraHours.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-slate-400 italic text-sm">Nenhuma atividade registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="space-y-6">
          {/* Search Military Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Localizar Militar</h3>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person_search</span>
              <input
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm md:text-xs font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-white"
                placeholder="Nome ou graduação..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                {filteredMilitary.length > 0 ? (
                  filteredMilitary.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMilitaryId(m.id);
                        setSearchTerm('');
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
                        <span className="material-symbols-outlined text-sm">person</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.rank} {m.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{m.battalion}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">Nenhum militar encontrado.</p>
                )}
              </div>
            )}
          </div>

          {/* Hours Widget */}
          <div className="bg-primary rounded-xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Carga Horária Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tighter">{totalWorkload.toFixed(1)}</span>
                <span className="text-sm font-bold text-white/80">HRS</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight">
                  <span>Serviços:</span>
                  <span>{totalShiftHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight">
                  <span>Reg. Horas:</span>
                  <span>{totalExtraHours.toFixed(1)}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight pt-2 border-t border-white/10">
                  <span>Outros Serviços:</span>
                  <span>{totalOtherServices} Un</span>
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-white/10 rotate-12 pointer-events-none">history</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Legenda</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SHIFT_TYPE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate">{type}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Atividade Extra</span>
              </div>
            </div>
          </div>
        </div>
      </MainLayout.Sidebar>
    </MainLayout>
  );
};

export default PersonalShiftPage;


