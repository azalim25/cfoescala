

import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS, MOCK_MILITARY } from '../constants';
import { optimizeScale } from '../geminiService';

const DashboardPage: React.FC = () => {
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiOptimize = async () => {
    setIsAiLoading(true);
    const result = await optimizeScale(MOCK_MILITARY, MOCK_SHIFTS);
    setAiResponse(result);
    setIsAiLoading(false);
  };

  return (
    <MainLayout activePage="dashboard" className="pb-20">
      <MainLayout.Content>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <div className="px-4 py-1.5 font-bold text-sm bg-white dark:bg-slate-900">JANEIRO 2024</div>
              <button className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">Escala Geral</button>
              <button className="px-3 py-1.5 bg-green-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">Oficiais</button>
              <button className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">Sargentos</button>
              <button onClick={handleAiOptimize} className="px-3 py-1.5 bg-primary text-white rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                {isAiLoading ? 'Processando...' : <><span className="material-symbols-outlined text-[12px]">auto_awesome</span> Sugestão IA</>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">filter_alt</span> Filtrar
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
            </button>
          </div>
        </div>

        {aiResponse && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl relative">
            <button onClick={() => setAiResponse(null)} className="absolute top-2 right-2 text-green-400">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-bold text-green-800 dark:text-green-300 text-sm mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_awesome</span> Sugestão da Inteligência Artificial:
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {[...Array(31)].map((_, i) => {
              const day = i + 1;
              const dateStr = `2024-01-${day.toString().padStart(2, '0')}`;
              const dayShifts = MOCK_SHIFTS.filter(s => s.date === dateStr);
              const isToday = day === 2;

              return (
                <div key={i} className={`min-h-[160px] border-r border-b border-slate-100 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                  <div className="flex justify-between mb-2">
                    <span className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-slate-400'}`}>{day.toString().padStart(2, '0')}</span>
                    {isToday && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                  </div>
                  <div className="space-y-1">
                    {dayShifts.map(s => {
                      const m = MOCK_MILITARY.find(mil => mil.id === s.militaryId);
                      return (
                        <div key={s.id} className="text-[9px] py-1 px-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 rounded-sm font-bold uppercase truncate shadow-sm border border-blue-200 dark:border-blue-800">
                          {m?.rank.split(' ')[0]} {m?.name.split(' ')[1] || m?.name}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-120px)] sticky top-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">FICHA DO DIA</h2>
              <p className="text-[11px] text-primary font-bold">02 JANEIRO (TERÇA-FEIRA)</p>
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined text-sm">settings</span></button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><span className="material-symbols-outlined text-sm">close</span></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">groups</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total Efetivo</span>
              </div>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">12/12</span>
            </div>
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">military_tech</span> OFICIAL DE DIA (1)
              </div>
              {MOCK_SHIFTS.filter(s => s.date === '2024-01-02').map(s => {
                const m = MOCK_MILITARY.find(mil => mil.id === s.militaryId);
                return (
                  <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-none">{m?.rank} {m?.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-1 uppercase">ID: {m?.id} / Nº BM: {m?.firefighterNumber}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 text-[10px] font-bold rounded">TITULAR</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">CONTATO</button>
                      <button className="flex-1 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:opacity-90 transition-colors">TROCAR</button>
                    </div>
                  </div>
                )
              })}
            </section>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">EXPORTAR PDF</button>
            <button className="flex-1 bg-primary text-white font-bold text-xs py-2.5 rounded-lg shadow-md hover:bg-primary/90 transition-all">GERENCIAR POSTOS</button>
          </div>
        </div>
      </MainLayout.Sidebar>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-2xl flex items-center gap-8 text-white z-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">warning</span>
          <p className="text-[11px] font-medium leading-tight">Existem <span className="font-bold underline">4 impedimentos</span><br />pendentes de revisão.</p>
        </div>
        <div className="h-6 w-px bg-slate-700"></div>
        <div className="flex items-center gap-4">
          <button className="text-[11px] font-bold uppercase tracking-wider hover:text-primary transition-colors">Relatórios</button>
          <button className="px-4 py-1.5 bg-primary text-white rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg hover:scale-105 transition-transform">Revisar Agora</button>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;

