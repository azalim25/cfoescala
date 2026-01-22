import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS, SHIFT_TYPE_COLORS } from '../constants';
import { useShift } from '../contexts/ShiftContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { Shift, Rank } from '../types';
import { supabase } from '../supabase';

const DashboardPage: React.FC = () => {
  const { shifts: allShifts, createShift, updateShift, removeShift, preferences } = useShift();
  const { militaries } = useMilitary();
  const { isModerator } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(0); // Janeiro
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(2); // Default
  const [stages, setStages] = useState<any[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState<{
    militaryId: string;
    type: Shift['type'];
    location: string;
    duration?: number;
    description?: string;
    startTime?: string;
    endTime?: string;
  }>({
    militaryId: '',
    type: 'Escala Geral',
    location: 'QCG',
    duration: undefined,
    description: '',
    startTime: '08:00',
    endTime: '12:00'
  });

  // Set default day to today
  useEffect(() => {
    const today = new Date();
    setSelectedDay(today.getDate());
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    fetchStages();
  }, []);

  const fetchStages = async () => {
    setIsLoadingStages(true);
    const { data, error } = await supabase.from('stages').select('*');
    if (!error && data) setStages(data);
    setIsLoadingStages(false);
  };

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
      location: 'QCG',
      duration: undefined
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      militaryId: shift.militaryId,
      type: shift.type,
      location: shift.location || 'QCG',
      duration: shift.duration,
      description: shift.type === 'Escala Diversa' ? shift.location : '',
      startTime: shift.type === 'Escala Diversa' ? shift.startTime : '08:00',
      endTime: shift.type === 'Escala Diversa' ? shift.endTime : '12:00'
    });
    setIsModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!formData.militaryId) {
      alert('Selecione um militar.');
      return;
    }

    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

    try {
      if (editingShift) {
        await updateShift(editingShift.id, {
          militaryId: formData.militaryId,
          type: formData.type,
          location: formData.location || (formData.type === 'Escala Diversa' ? formData.description : undefined),
          duration: formData.duration,
          startTime: formData.type === 'Escala Diversa' ? formData.startTime : '08:00',
          endTime: formData.type === 'Escala Diversa' ? formData.endTime : '08:00',
        });
      } else {
        await createShift({
          militaryId: formData.militaryId,
          date: dateStr,
          type: formData.type,
          startTime: formData.type === 'Escala Diversa' ? (formData.startTime || '08:00') : '08:00',
          endTime: formData.type === 'Escala Diversa' ? (formData.endTime || '12:00') : '08:00',
          location: formData.type === 'Escala Diversa' ? formData.description : formData.location,
          status: 'Confirmado',
          duration: formData.duration
        });
      }

      // Sync with extra_hours if it's Escala Diversa
      if (formData.type === 'Escala Diversa') {
        const start = formData.startTime || '08:00';
        const end = formData.endTime || '12:00';

        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);

        let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        await supabase.from('extra_hours').insert({
          military_id: formData.militaryId,
          category: 'CFO II - Registro de Horas',
          hours: hours,
          minutes: minutes,
          description: `Escala Diversa: ${formData.description || 'Sem descrição'}`,
          date: dateStr
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving shift/extra hours:', error);
      alert('Erro ao salvar os dados.');
    }
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
              <div key={day} className="p-2 sm:p-3 text-center text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {[...Array(getFirstDayOfMonth(currentYear, currentMonth))].map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[120px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"></div>
            ))}
            {[...Array(getDaysInMonth(currentYear, currentMonth))].map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const shifts = allShifts.filter(s => s.date === dateStr);
              const dayStages = stages.filter(s => s.date === dateStr);
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all group relative text-left ${isToday ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} ${selectedDay === day ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
                >
                  <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                    <span className={`text-[10px] sm:text-xs font-bold ${isToday ? 'bg-primary text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center' : 'text-slate-400 dark:text-slate-500'}`}>
                      {day}
                    </span>
                    {(shifts.length > 0 || dayStages.length > 0) && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary font-black uppercase text-[8px] text-primary"></span>}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {(() => {
                      const priority: Record<string, number> = {
                        'Comandante da Guarda': 1,
                        'Manutenção': 2,
                        'Faxina': 3,
                        'Estágio': 4,
                        'Sobreaviso': 5,
                        'Escala Diversa': 6
                      };

                      const combined = [
                        ...dayStages
                          .filter(st => !shifts.some(sh => sh.militaryId === st.military_id && sh.type === 'Estágio'))
                          .map(s => ({ ...s, isStage: true, type: 'Estágio', militaryId: s.military_id })),
                        ...shifts.map(s => ({ ...s, isStage: false }))
                      ].sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99));

                      return combined.map(s => {
                        if (s.isStage) {
                          return (
                            <div
                              key={s.id}
                              className="text-[7px] sm:text-[9px] font-bold p-0.5 sm:p-1 rounded bg-amber-100 text-amber-700 truncate border border-amber-200"
                            >
                              📌 {militaries.find(m => m.id === s.militaryId)?.name}
                            </div>
                          );
                        }
                        const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                        return (
                          <div
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                              if (isModerator) {
                                handleOpenEditModal(s as Shift);
                              }
                            }}
                            className={`text-[7px] sm:text-[9px] font-bold p-0.5 sm:p-1 rounded ${colors.bg} ${colors.text} truncate border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer`}
                          >
                            {militaries.find(m => m.id === s.militaryId)?.name}
                            {s.type === 'Escala Diversa' && s.location && (
                              <span className="ml-1 opacity-80 font-normal italic">({s.location})</span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Legenda de Escalas</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(SHIFT_TYPE_COLORS)
              .filter(([type]) => type !== 'Escala Geral')
              .map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400">{type}</span>
                </div>
              ))}
          </div>
        </div>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-auto lg:h-[calc(100vh-120px)] lg:sticky lg:top-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-100 uppercase text-xs sm:text-sm">FICHA DO DIA</h2>
              <p className="text-[10px] sm:text-[11px] text-primary font-bold">{selectedDay.toString().padStart(2, '0')} {months[currentMonth].toUpperCase()} {currentYear}</p>
            </div>
            {isModerator && (
              <button
                onClick={handleOpenAddModal}
                className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Adicionar Serviço"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 sm:space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex justify-between items-center border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">groups</span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total Efetivo</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">{militaries.length}</span>
            </div>
            <section className="space-y-3 pb-4 lg:pb-0">
              <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">military_tech</span> SERVIÇO ({allShifts.filter(s => s.date === selectedDateStr).length})
              </div>

              {stages.filter(st => st.date === selectedDateStr && !allShifts.some(sh => sh.date === st.date && sh.militaryId === st.military_id && sh.type === 'Estágio')).map(s => {
                const m = militaries.find(mil => mil.id === s.military_id);
                return (
                  <div
                    key={s.id}
                    className="w-full text-left bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 p-3 sm:p-4 space-y-3 sm:space-y-4 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-500 border border-amber-200 dark:border-amber-700 shrink-0">
                          <span className="material-symbols-outlined text-lg sm:text-xl">location_city</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-100 leading-none truncate">{m?.rank} {m?.name}</h3>
                            <span className="text-[7px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white border border-amber-600">
                              ESTÁGIO
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[11px] text-amber-600 mt-1 uppercase font-bold">{s.location.split(' - ')[0]}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {allShifts.filter(s => s.date === selectedDateStr).map(s => {
                const m = militaries.find(mil => mil.id === s.militaryId);
                return (
                  <button
                    key={s.id}
                    onClick={() => isModerator && handleOpenEditModal(s)}
                    className={`w-full text-left bg-white dark:bg-slate-800 rounded-xl border ${SHIFT_TYPE_COLORS[s.type]?.border || 'border-slate-200'} dark:border-slate-700 p-3 sm:p-4 space-y-3 sm:space-y-4 shadow-sm relative overflow-hidden ${isModerator ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'} transition-opacity group`}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                          <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-none truncate">{m?.rank} {m?.name}</h3>
                            <span className={`text-[7px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${SHIFT_TYPE_COLORS[s.type]?.bg || 'bg-slate-100'} ${SHIFT_TYPE_COLORS[s.type]?.text || 'text-slate-600'} border ${SHIFT_TYPE_COLORS[s.type]?.border || 'border-slate-200'}`}>
                              {s.type}
                            </span>
                          </div>
                          <p className="text-[9px] sm:text-[11px] text-slate-500 mt-1 uppercase">
                            {s.type === 'Estágio'
                              ? (stages.find(st => st.date === s.date && st.military_id === s.militaryId)?.location.split(' - ')[0] || s.location)
                              : `BM: ${m?.firefighterNumber}`}
                          </p>
                        </div>
                      </div>
                      {isModerator && <span className="material-symbols-outlined text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">edit</span>}
                    </div>
                    <div className={`absolute top-0 right-0 w-1 h-full ${SHIFT_TYPE_COLORS[s.type]?.dot || 'bg-slate-200'}`}></div>
                  </button>
                )
              })}
              {allShifts.filter(s => s.date === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6 sm:py-10">Nenhum serviço escalado para este dia.</p>
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
                  {militaries
                    .filter(m => {
                      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                      const hasRestriction = preferences.some(p => p.militaryId === m.id && p.date === dateStr && p.type === 'restriction');
                      return !hasRestriction;
                    })
                    .map(m => {
                      const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                      const hasPriority = preferences.some(p => p.militaryId === m.id && p.date === dateStr && p.type === 'priority');
                      return (
                        <option
                          key={m.id}
                          value={m.id}
                          className={hasPriority ? "bg-amber-100 font-bold" : ""}
                        >
                          {m.rank} {m.name} {hasPriority ? '★' : ''}
                        </option>
                      );
                    })}
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

              {formData.type === 'Comandante da Guarda' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Duração (Horas)</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {[11, 24].map(h => (
                      <button
                        key={h}
                        onClick={() => setFormData(prev => ({ ...prev, duration: h }))}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${formData.duration === h
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                          : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {h} Horas
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.type === 'Estágio' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Duração (Horas)</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {[12, 24].map(h => (
                      <button
                        key={h}
                        onClick={() => setFormData(prev => ({ ...prev, duration: h }))}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${formData.duration === h
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                          : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {h} Horas
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.type === 'Escala Diversa' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição da Atividade</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Reunião, Patrulhamento, etc."
                      className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary font-medium text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Início</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Término</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
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
