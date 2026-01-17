import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS, SHIFT_TYPE_COLORS } from '../constants';
import { useShift } from '../contexts/ShiftContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { Shift, Rank } from '../types';

const DashboardPage: React.FC = () => {
  const { shifts: allShifts, createShift, updateShift, removeShift } = useShift();
  const { militaries } = useMilitary();
  const [currentMonth, setCurrentMonth] = useState(0); // Janeiro
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(2); // Default

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<{ militaryId: string; type: Shift['type']; location: string }>({
    militaryId: '',
    type: 'Escala Geral',
    location: 'QCG'
  });

  // Set default day to today
  useEffect(() => {
    const today = new Date();
    setSelectedDay(today.getDate());
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }, []);

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

  const handleOpenAddModal = () => {
    setEditingShift(null);
    setFormData({
      militaryId: '',
      type: 'Escala Geral',
      location: 'QCG'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      militaryId: shift.militaryId,
      type: shift.type,
      location: shift.location || 'QCG'
    });
    setIsModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!formData.militaryId) {
      alert('Selecione um militar.');
      return;
    }

    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

    if (editingShift) {
      await updateShift(editingShift.id, {
        militaryId: formData.militaryId,
        type: formData.type,
        location: formData.location
      });
    } else {
      await createShift({
        militaryId: formData.militaryId,
        date: dateStr,
        type: formData.type,
        startTime: '08:00',
        endTime: '08:00',
        location: formData.location,
        status: 'Confirmado'
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteShift = async () => {
    if (editingShift && confirm('Tem certeza que deseja remover este serviço?')) {
      await removeShift(editingShift.id);
      setIsModalOpen(false);
    }
  };

  const selectedDateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
  const dayShifts = allShifts.filter(s => s.date === selectedDateStr);

  return (
    <MainLayout activePage="dashboard" className="pb-20">
      <MainLayout.Content>
        {/* Header Controls */}
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
              <span className="material-symbols-outlined text-sm">print</span> Imprimir
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
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
                    {shifts.map(s => {
                      const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                      return (
                        <div
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(day);
                            handleOpenEditModal(s);
                          }}
                          className={`text-[9px] font-bold p-1 rounded ${colors.bg} ${colors.text} truncate border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer`}
                        >
                          {militaries.find(m => m.id === s.militaryId)?.name.split(' ')[0]}
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Legenda de Escalas</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(SHIFT_TYPE_COLORS).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{type}</span>
              </div>
            ))}
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
            <button
              onClick={handleOpenAddModal}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Adicionar Serviço"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
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
                  <button
                    key={s.id}
                    onClick={() => handleOpenEditModal(s)}
                    className={`w-full text-left bg-white dark:bg-slate-800 rounded-xl border ${SHIFT_TYPE_COLORS[s.type]?.border || 'border-slate-200'} dark:border-slate-700 p-4 space-y-4 shadow-sm relative overflow-hidden hover:opacity-90 transition-opacity group`}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-none">{m?.rank} {m?.name}</h3>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${SHIFT_TYPE_COLORS[s.type]?.bg || 'bg-slate-100'} ${SHIFT_TYPE_COLORS[s.type]?.text || 'text-slate-600'} border ${SHIFT_TYPE_COLORS[s.type]?.border || 'border-slate-200'}`}>
                              {s.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 uppercase">BM: {m?.firefighterNumber}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
                    </div>
                    <div className={`absolute top-0 right-0 w-1 h-full ${SHIFT_TYPE_COLORS[s.type]?.dot || 'bg-slate-200'}`}></div>
                  </button>
                )
              })}
              {allShifts.filter(s => s.date === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-10">Nenhum serviço escalado para este dia.</p>
              )}
            </section>
          </div>
        </div>
      </MainLayout.Sidebar>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {editingShift ? 'edit_calendar' : 'add_circle'}
                </span>
                {editingShift ? 'Editar Serviço' : 'Adicionar Serviço'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Militar</label>
                <select
                  value={formData.militaryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, militaryId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary font-medium text-sm"
                >
                  <option value="">Selecione um militar...</option>
                  {militaries.map(m => (
                    <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Escala</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary font-medium text-sm"
                >
                  {Object.keys(SHIFT_TYPE_COLORS).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
              {editingShift && (
                <button
                  onClick={handleDeleteShift}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Excluir
                </button>
              )}
              <button
                onClick={handleSaveShift}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all ml-auto"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
};

export default DashboardPage;
