

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
  const [personalStages, setPersonalStages] = useState<any[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  const selectedMilitary = militaries.find(m => m.id === selectedMilitaryId) || militaries[0];

  useEffect(() => {
    if (selectedMilitaryId) {
      fetchExtraHours();
      fetchPersonalStages();
    }
  }, [selectedMilitaryId]);

  const fetchPersonalStages = async () => {
    setIsLoadingStages(true);
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .eq('military_id', selectedMilitaryId)
      .order('date', { ascending: false });

    if (!error && data) {
      setPersonalStages(data);
    }
    setIsLoadingStages(false);
  };

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

  // Helper to parse YYYY-MM-DD as local date to avoid timezone shifts
  const parseLocalISO = (isoString: string) => {
    const [year, month, day] = isoString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to calculate hours from a shift based on specific rules
  const calculateShiftHours = (shift: Shift) => {
    const date = parseLocalISO(shift.date);
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

  // Combine shifts and stages for upcoming view
  const combinedUpcoming = [
    ...personalShifts.map(s => {
      // Se for escala de estágio, tenta pegar o batalhão específico da tabela de stages
      if (s.type === 'Estágio') {
        const stageMatch = personalStages.find(ps => ps.date === s.date);
        return {
          ...s,
          location: stageMatch ? stageMatch.location : s.location,
          isStage: false
        };
      }
      return { ...s, isStage: false };
    }),
    // Adiciona apenas os stages que não possuem uma escala de shift correspondente
    ...personalStages
      .filter(ps => !personalShifts.some(s => s.date === ps.date && s.type === 'Estágio'))
      .map(s => ({
        id: s.id,
        date: s.date,
        type: 'Estágio',
        location: s.location,
        isStage: true,
        startTime: '08:00',
        endTime: '08:00',
        status: 'Confirmado'
      }))
  ].filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  // Combined workloads
  const totalShiftHours = personalShifts.reduce((acc, s) => acc + calculateShiftHours(s), 0);
  const totalExtraHours = extraHours.reduce((acc, e) => acc + (e.hours + e.minutes / 60), 0);
  const totalWorkload = totalShiftHours + totalExtraHours;

  const totalOtherServices = personalShifts.filter(s =>
    ['Sobreaviso', 'Faxina', 'Manutenção'].includes(s.type)
  ).length;

  // Grouped Summary Data
  const getGroupedSummary = () => {
    const summary: Record<string, { totalHours: number, totalServices: number, type: string }> = {};

    // Process regular shifts
    personalShifts.forEach(s => {
      const hours = calculateShiftHours(s);
      if (!summary[s.type]) {
        summary[s.type] = { totalHours: 0, totalServices: 0, type: s.type };
      }
      if (hours > 0) {
        summary[s.type].totalHours += hours;
      } else {
        summary[s.type].totalServices += 1;
      }
    });

    // Process extra hours (Registry of Hours)
    extraHours.forEach(e => {
      const type = e.category || 'Registro de Horas';
      if (!summary[type]) {
        summary[type] = { totalHours: 0, totalServices: 0, type };
      }
      summary[type].totalHours += (e.hours + e.minutes / 60);
    });

    return Object.values(summary).sort((a, b) => b.totalHours - a.totalHours || b.totalServices - a.totalServices);
  };

  const groupedSummary = getGroupedSummary();

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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-2 sm:border-4 border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-2xl sm:text-3xl">person</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none truncate max-w-[180px] sm:max-w-none">
                  {selectedMilitary.rank} {selectedMilitary.name}
                </h1>
                <span className="material-symbols-outlined text-primary text-base sm:text-lg">verified</span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Escala Individual • 2026</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">{selectedMilitary.battalion}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleExport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-[10px] sm:text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span> Exportar
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg font-bold text-[10px] sm:text-xs hover:opacity-90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
            </button>
          </div>
        </div>

        {/* Section: Próximos Serviços */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary text-xl">event_upcoming</span>
              Próximos Serviços
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Desktop View */}
            <div className="hidden sm:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Tipo de Serviço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {combinedUpcoming.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {parseLocalISO(s.date).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-md ${s.isStage ? 'bg-amber-100 text-amber-700 border-amber-200' : (SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50')} ${s.isStage ? '' : (SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700')} text-[10px] font-bold uppercase border ${s.isStage ? '' : (SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100')}`}>
                          {s.type} {s.isStage && `- ${s.location.split(' - ')[0]}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {combinedUpcoming.map((s: any) => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data</span>
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {parseLocalISO(s.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-md ${s.isStage ? 'bg-amber-100 text-amber-700 border-amber-200' : (SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50')} ${s.isStage ? '' : (SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700')} text-[9px] font-black uppercase border ${s.isStage ? '' : (SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100')}`}>
                    {s.type}
                  </span>
                </div>
              ))}
            </div>

            {combinedUpcoming.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic text-sm">Nenhum serviço ou estágio agendado.</div>
            )}
          </div>
        </section>

        {/* Section: Carga Horária (Atividades) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary text-xl">history</span>
              Carga Horária
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Desktop View */}
            <div className="hidden sm:block">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Atividade</th>
                    <th className="px-6 py-4 text-right">Quantidade / Carga Horária</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedSummary.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${SHIFT_TYPE_COLORS[item.type]?.dot || 'bg-primary'}`}></div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.totalHours > 0
                          ? 'bg-primary/10 text-primary'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                          {item.totalHours > 0
                            ? `${item.totalHours.toFixed(1)}h`
                            : `${item.totalServices} Serviço${item.totalServices !== 1 ? 's' : ''}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {groupedSummary.map((item, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${SHIFT_TYPE_COLORS[item.type]?.dot || 'bg-primary'} shrink-0`}></div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{item.type}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-black ${item.totalHours > 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    {item.totalHours > 0
                      ? `${item.totalHours.toFixed(1)}h`
                      : `${item.totalServices} Un`}
                  </span>
                </div>
              ))}
            </div>

            {groupedSummary.length === 0 && (
              <div className="p-10 text-center text-slate-400 italic text-sm">Nenhuma atividade registrada.</div>
            )}
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

          {/* Grouped Summary Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">analytics</span> Resumo por Atividade
            </h3>
            <div className="space-y-2">
              {groupedSummary.map(item => (
                <div key={item.type} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${SHIFT_TYPE_COLORS[item.type]?.dot || 'bg-primary'}`}></div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{item.type}</span>
                  </div>
                  <span className="text-[10px] font-black text-primary">
                    {item.totalHours > 0 ? `${item.totalHours.toFixed(1)}h` : `${item.totalServices} Un`}
                  </span>
                </div>
              ))}
              {groupedSummary.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">Sem registros para resumir.</p>
              )}
            </div>
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
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Estágio</span>
              </div>
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


