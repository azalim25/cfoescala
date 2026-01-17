import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS } from '../constants';
import { useShift } from '../contexts/ShiftContext';
import { useMilitary } from '../contexts/MilitaryContext';

const DashboardPage: React.FC = () => {
  const { shifts: allShifts } = useShift();
  const { militaries } = useMilitary();
  const [currentMonth, setCurrentMonth] = useState(0); // Janeiro
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(2); // Default to 2nd day

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 0) {
        setCurrentYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 11) {
        setCurrentYear(prevYear => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
    setSelectedDay(1);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentMonth(parseInt(e.target.value));
    setSelectedDay(1);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentYear(parseInt(e.target.value));
    setSelectedDay(1);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  return (
    <MainLayout activePage="dashboard" className="pb-20">
      <MainLayout.Content>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button onClick={handlePrevMonth} className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <div className="flex items-center bg-white dark:bg-slate-900 px-2 font-bold text-sm">
                <select
                  value={currentMonth}
                  onChange={handleMonthChange}
                  className="bg-transparent border-none focus:ring-0 cursor-pointer uppercase py-1.5 px-2"
                >
                  {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                  value={currentYear}
                  onChange={handleYearChange}
                  className="bg-transparent border-none focus:ring-0 cursor-pointer py-1.5 px-2"
                >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={handleNextMonth} className="px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
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

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {[...Array(getFirstDayOfMonth(currentYear, currentMonth))].map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[120px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"></div>
            ))}
            {[...Array(getDaysInMonth(currentYear, currentMonth))].map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const shifts = allShifts.filter(s => s.date === dateStr);
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all group relative text-left ${isToday ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} ${selectedDay === day ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400 dark:text-slate-500'}`}>
                      {day}
                    </span>
                    {shifts.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary font-black uppercase text-[8px] text-primary"></span>}
                  </div>
                  <div className="space-y-1">
                    {shifts.map(s => (
                      <div key={s.id} className="text-[9px] font-bold p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate border border-blue-200 dark:border-blue-800">
                        {militaries.find(m => m.id === s.militaryId)?.name.split(' ')[0]}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-120px)] sticky top-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm">FICHA DO DIA</h2>
              <p className="text-[11px] text-primary font-bold">{selectedDay.toString().padStart(2, '0')} {months[currentMonth].toUpperCase()} {currentYear}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">groups</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total Efetivo</span>
              </div>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{militaries.length}</span>
            </div>
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">military_tech</span> SERVIÇO ({allShifts.filter(s => s.date === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`).length})
              </div>
              {allShifts.filter(s => s.date === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`).map(s => {
                const m = militaries.find(mil => mil.id === s.militaryId);
                return (
                  <div key={s.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-none">{m?.rank} {m?.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-1 uppercase">BM: {m?.firefighterNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {allShifts.filter(s => s.date === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-10">Nenhum serviço escalado para este dia.</p>
              )}
            </section>
          </div>
        </div>
      </MainLayout.Sidebar>
    </MainLayout>
  );
};

export default DashboardPage;
