

import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS } from '../constants';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';

const PersonalShiftPage: React.FC = () => {
  const { militaries } = useMilitary();
  const { shifts: allShifts } = useShift();
  const [selectedMilitaryId, setSelectedMilitaryId] = useState<string>(militaries[0]?.id || '4');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  const selectedMilitary = militaries.find(m => m.id === selectedMilitaryId) || militaries[0];

  const filteredMilitary = militaries.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const personalShifts = allShifts.filter(s => s.militaryId === selectedMilitaryId);
  const filteredShifts = personalShifts.filter(s =>
    s.date.includes(serviceFilter) ||
    s.type.toLowerCase().includes(serviceFilter.toLowerCase())
  );

  const totalHours = personalShifts.length * 24; // Assuming each shift is 24h

  const handleExport = () => {
    const headers = ['Data', 'Tipo', 'Início', 'Fim', 'Status'].join(',');
    const rows = filteredShifts.map(s => [s.date, s.type, s.startTime, s.endTime, s.status].join(','));
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
        {/* Header Section inside Content */}
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

        {/* Shifts Table Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">event_upcoming</span>
              Serviços Escalados
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Tipo de Serviço</th>
                  <th className="px-6 py-4">Horário</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredShifts.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{s.date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase border border-blue-100 dark:border-blue-800">
                        {s.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-primary">{s.startTime} - {s.endTime}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase border border-green-200 dark:border-green-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400 italic text-sm">Nenhum registro encontrado para este militar.</td>
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
            {!searchTerm && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-[10px] text-blue-600 dark:text-blue-300 leading-tight">
                  <span className="font-bold">Dica:</span> Digite acima para buscar escalas de outros militares da unidade.
                </p>
              </div>
            )}
          </div>

          {/* Hours Widget */}
          <div className="bg-primary rounded-xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Carga Horária Total</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white tracking-tighter">{totalHours.toLocaleString('pt-BR')}</span>
                <span className="text-sm font-bold text-white/80">HRS</span>
              </div>
            </div>
            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-white/10 rotate-12 pointer-events-none">history</span>
          </div>

          {/* Filter Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filtrar Serviços</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm md:text-xs font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-white"
                placeholder="Buscar por mês ou tipo..."
                type="text"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Legenda</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400">Serviço Escala Geral</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 italic text-[10px] mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                Escala baseada no calendário 2026.
              </div>
            </div>
          </div>
        </div>
      </MainLayout.Sidebar>
    </MainLayout>
  );
};

export default PersonalShiftPage;


