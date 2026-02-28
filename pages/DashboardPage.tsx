import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { MOCK_SHIFTS, SHIFT_TYPE_COLORS, SHIFT_TYPE_PRIORITY, STAGE_LOCATIONS } from '../constants';
import { useShift } from '../contexts/ShiftContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { Shift, Rank } from '../types';
import { supabase } from '../supabase';
import { safeParseISO } from '../utils/dateUtils';

const formatLocation = (type: string, location: string | null | undefined) => {
  if (!location) return '';
  const normLoc = location.trim().toUpperCase();
  if (normLoc === 'QCG' || normLoc === 'PEL ABM') return 'ABM';
  return location;
};

const DashboardPage: React.FC = () => {
  const { shifts: allShifts, createShift, updateShift, removeShift, preferences, holidays, addHoliday, removeHoliday } = useShift();
  const { militaries } = useMilitary();
  const { isModerator } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [stages, setStages] = useState<any[]>([]);
  const [extraHours, setExtraHours] = useState<any[]>([]);
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
    manualHours?: number;
    manualMinutes?: number;
  }>({
    militaryId: '',
    type: 'Escala Geral',
    location: 'QCG',
    duration: undefined,
    description: '',
    startTime: '08:00',
    endTime: '12:00',
    manualHours: 0,
    manualMinutes: 0
  });

  // Filter State
  const allShiftTypes = useMemo(() =>
    Object.keys(SHIFT_TYPE_COLORS)
      .filter(type => !['Escala Geral', 'Escala Diversa'].includes(type))
      .sort((a, b) => (SHIFT_TYPE_PRIORITY[a] || 99) - (SHIFT_TYPE_PRIORITY[b] || 99)),
    []);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);

  useEffect(() => {
    setSelectedShiftTypes([...allShiftTypes, 'Escala Diversa']);
  }, [allShiftTypes]);

  const toggleShiftType = (type: string) => {
    setSelectedShiftTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  useEffect(() => {
    fetchStages();
    fetchExtraHours();
  }, []);

  const fetchExtraHours = async () => {
    const { data, error } = await supabase
      .from('extra_hours')
      .select('*')
      .eq('category', 'CFO II - Registro de Horas');
    if (!error && data) setExtraHours(data);
  };

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

  const handlePrevDay = () => {
    if (selectedDay > 1) {
      setSelectedDay(prev => prev - 1);
    } else {
      const prevDate = new Date(currentYear, currentMonth, 0);
      setCurrentYear(prevDate.getFullYear());
      setCurrentMonth(prevDate.getMonth());
      setSelectedDay(prevDate.getDate());
    }
  };

  const handleNextDay = () => {
    const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
    if (selectedDay < daysInCurrentMonth) {
      setSelectedDay(prev => prev + 1);
    } else {
      const nextDate = new Date(currentYear, currentMonth + 1, 1);
      setCurrentYear(nextDate.getFullYear());
      setCurrentMonth(nextDate.getMonth());
      setSelectedDay(1);
    }
  };

  useEffect(() => {
    // Auto-scroll to details on mobile when a day is selected
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedDay, currentMonth, currentYear]);

  const handleOpenAddModal = () => {
    setEditingShift(null);
    setFormData({
      militaryId: '',
      type: 'Escala Geral',
      location: 'ABM',
      duration: undefined,
      description: '',
      startTime: '08:00',
      endTime: '08:00',
      manualHours: 0,
      manualMinutes: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      militaryId: shift.militaryId,
      type: shift.type,
      location: (shift.type === 'Escala Diversa' || shift.type === 'Barra' || shift.type === 'Estágio') ? shift.location || '' : (shift.location === 'QCG' ? 'ABM' : shift.location || 'ABM'),
      duration: shift.duration,
      description: shift.type === 'Escala Diversa' ? shift.location : '',
      startTime: shift.startTime,
      endTime: shift.endTime,
      manualHours: shift.duration ? Math.floor(shift.duration) : 0,
      manualMinutes: shift.duration ? Math.round((shift.duration % 1) * 60) : 0
    });
    setIsModalOpen(true);
  };

  const handleSaveShift = async () => {
    if (!formData.militaryId) {
      alert('Selecione um militar.');
      return;
    }

    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    const selectedDate = new Date(currentYear, currentMonth, selectedDay);
    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    const isHoliday = holidays.some(h => h.date === dateStr);
    const dayOfWeek = selectedDate.getDay();

    let finalStartTime = formData.startTime || '08:00';
    let finalEndTime = formData.endTime || '08:00';
    let finalDuration = formData.duration;

    if (!editingShift) {
      if (formData.type === 'Comandante da Guarda') {
        if (isWeekend || isHoliday) {
          finalStartTime = '06:30';
          finalEndTime = '06:30';
          finalDuration = 24;
        } else {
          finalStartTime = '20:00';
          finalEndTime = '06:30';
          finalDuration = 11;
        }
      } else if (formData.type === 'Estágio') {
        const isManualTimeProvided = formData.startTime !== '08:00' || (dayOfWeek === 0 ? formData.endTime !== '20:00' : formData.endTime !== '08:00');

        if (dayOfWeek === 6) { // Saturday
          finalStartTime = formData.startTime || '08:00';
          finalEndTime = formData.endTime || '08:00';
          finalDuration = finalDuration || 24;
        } else if (dayOfWeek === 0) { // Sunday
          finalStartTime = formData.startTime || '08:00';
          finalEndTime = formData.endTime || '20:00';
          finalDuration = finalDuration || 12;
        } else {
          finalStartTime = formData.startTime || '08:00';
          finalEndTime = formData.endTime || '20:00';
          finalDuration = finalDuration || 12;
        }

        if (isHoliday || isManualTimeProvided) {
          const [h1, m1] = finalStartTime.split(':').map(Number);
          const [h2, m2] = finalEndTime.split(':').map(Number);
          let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (totalMinutes <= 0) totalMinutes += 24 * 60;
          finalDuration = totalMinutes / 60;
        }
      }
    } else {
      if (isHoliday && formData.type === 'Estágio') {
        const [h1, m1] = (formData.startTime || '08:00').split(':').map(Number);
        const [h2, m2] = (formData.endTime || '08:00').split(':').map(Number);
        let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutes <= 0) totalMinutes += 24 * 60;
        finalDuration = totalMinutes / 60;
      }
    }

    try {
      if (editingShift) {
        if ((editingShift as any).isStage) {
          if (formData.type === 'Estágio') {
            await supabase.from('stages').update({
              military_id: formData.militaryId,
              location: formData.location,
              start_time: formData.startTime,
              end_time: formData.endTime
            }).eq('id', editingShift.id);
          } else {
            await supabase.from('stages').delete().eq('id', editingShift.id);
            await createShift({
              militaryId: formData.militaryId,
              date: dateStr,
              type: formData.type,
              startTime: finalStartTime,
              endTime: finalEndTime,
              location: formData.type === 'Escala Diversa' ? formData.description : formData.location,
              status: 'Confirmado',
              duration: Math.round(finalDuration || 0)
            });
          }
        } else {
          await updateShift(editingShift.id, {
            militaryId: formData.militaryId,
            type: formData.type,
            location: formData.type === 'Escala Diversa' ? formData.description : formData.location,
            duration: Math.round(finalDuration || 0),
            startTime: (formData.type === 'Escala Diversa' || formData.type === 'Barra' || formData.type === 'Estágio' || formData.type === 'Comandante da Guarda') ? (formData.startTime || finalStartTime) : finalStartTime,
            endTime: (formData.type === 'Escala Diversa' || formData.type === 'Barra' || formData.type === 'Estágio' || formData.type === 'Comandante da Guarda') ? (formData.endTime || finalEndTime) : finalEndTime,
          });
        }
      } else {
        await createShift({
          militaryId: formData.militaryId,
          date: dateStr,
          type: formData.type,
          startTime: finalStartTime,
          endTime: finalEndTime,
          location: formData.type === 'Escala Diversa' ? formData.description : formData.location,
          status: 'Confirmado',
          duration: Math.round(finalDuration || 0)
        });
      }

      if (formData.type === 'Escala Diversa') {
        const start = formData.startTime || '08:00';
        const end = formData.endTime || '12:00';
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        let totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const extraData = {
          military_id: formData.militaryId,
          category: 'CFO II - Registro de Horas',
          hours: hours,
          minutes: minutes,
          description: `Escala Diversa: ${formData.description || 'Sem descrição'}`,
          date: dateStr
        };

        if (editingShift) {
          const { data: existingEH } = await supabase
            .from('extra_hours')
            .select('id')
            .eq('military_id', formData.militaryId)
            .eq('date', dateStr)
            .ilike('description', 'Escala Diversa:%')
            .limit(1)
            .single();

          if (existingEH) {
            await supabase.from('extra_hours').update(extraData).eq('id', existingEH.id);
          } else {
            await supabase.from('extra_hours').insert(extraData);
          }
        } else {
          await supabase.from('extra_hours').insert(extraData);
        }
      }

      if (formData.type === 'Estágio' && !((editingShift as any)?.isStage)) {
        const stageData = {
          military_id: formData.militaryId,
          location: formData.location,
          date: dateStr,
          start_time: formData.startTime,
          end_time: formData.endTime
        };

        const { data: existingStage } = await supabase
          .from('stages')
          .select('id')
          .eq('military_id', formData.militaryId)
          .eq('date', dateStr)
          .limit(1)
          .single();

        if (existingStage) {
          await supabase.from('stages').update(stageData).eq('id', existingStage.id);
        } else {
          await supabase.from('stages').insert(stageData);
        }
        const { data: updatedStages } = await supabase.from('stages').select('*');
        if (updatedStages) setStages(updatedStages);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving shift/extra hours:', error);
      alert('Erro ao salvar os dados.');
    }
  };

  const handleDeleteShift = async () => {
    if (editingShift && confirm('Tem certeza que deseja remover este serviço?')) {
      const dateStr = editingShift.date;
      const militaryId = editingShift.militaryId;
      const shiftType = editingShift.type;

      if ((editingShift as any).isStage) {
        try {
          await supabase.from('stages').delete().eq('id', editingShift.id);
        } catch (error) {
          console.error('Error deleting stage:', error);
        }
      } else {
        await removeShift(editingShift.id);
      }

      if (shiftType === 'Escala Diversa') {
        try {
          await supabase
            .from('extra_hours')
            .delete()
            .eq('military_id', militaryId)
            .eq('date', dateStr)
            .ilike('description', 'Escala Diversa:%');
        } catch (error) {
          console.error('Error syncing deletion with extra_hours:', error);
        }
      }

      if (shiftType === 'Estágio') {
        try {
          await supabase
            .from('stages')
            .delete()
            .eq('military_id', militaryId)
            .eq('date', dateStr);
          const { data: updatedStages } = await supabase.from('stages').select('*');
          if (updatedStages) setStages(updatedStages);
        } catch (error) {
          console.error('Error syncing deletion with stages:', error);
        }
      }

      setIsModalOpen(false);
    }
  };

  const selectedDateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;

  const isShiftVisible = (type: string) => selectedShiftTypes.includes(type);

  // Optimizations
  const groupedData = useMemo(() => {
    const data: Record<string, { shifts: Shift[], stages: any[], extraHours: any[] }> = {};

    allShifts.forEach(s => {
      if (!data[s.date]) data[s.date] = { shifts: [], stages: [], extraHours: [] };
      data[s.date].shifts.push(s);
    });

    stages.forEach(s => {
      if (!data[s.date]) data[s.date] = { shifts: [], stages: [], extraHours: [] };
      data[s.date].stages.push(s);
    });

    extraHours.forEach(eh => {
      if (!data[eh.date]) data[eh.date] = { shifts: [], stages: [], extraHours: [] };
      data[eh.date].extraHours.push(eh);
    });

    return data;
  }, [allShifts, stages, extraHours]);

  const CalendarDay = React.memo(({
    day,
    dateStr,
    isSelected,
    isToday,
    dayData,
    holiday,
    onClick,
    onEditShift,
    isModerator,
    militaries,
    visibleTypes
  }: {
    day: number,
    dateStr: string,
    isSelected: boolean,
    isToday: boolean,
    dayData?: { shifts: Shift[], stages: any[], extraHours: any[] },
    holiday?: any,
    onClick: () => void,
    onEditShift: (s: Shift) => void,
    isModerator: boolean,
    militaries: any[],
    visibleTypes: string[]
  }) => {
    const isShiftVisibleLocal = (type: string) => visibleTypes.includes(type);

    const combined = useMemo(() => {
      if (!dayData) return [];

      const dayShifts = dayData.shifts;
      const dayStages = dayData.stages;
      const dayExtraHours = dayData.extraHours;

      return [
        ...dayStages
          .filter(st => isShiftVisibleLocal('Estágio'))
          .map(s => ({ ...s, isStage: true, type: 'Estágio' as const, militaryId: s.military_id })),
        ...dayShifts
          .filter(s => isShiftVisibleLocal(s.type) && !(s.type === 'Estágio' && dayStages.some(st => st.military_id === s.militaryId)))
          .map(s => ({ ...s, isStage: s.type === 'Estágio' })),
        ...dayExtraHours
          .filter(eh => isShiftVisibleLocal('Escala Diversa'))
          .map(eh => ({
            id: eh.id,
            militaryId: eh.military_id,
            type: 'Escala Diversa' as const,
            location: eh.description.replace('Escala Diversa: ', ''),
            startTime: '08:00',
            endTime: '12:00',
            isStage: false,
            isExtra: true,
            date: eh.date
          }))
      ].sort((a, b) => {
        const prioA = SHIFT_TYPE_PRIORITY[a.type] || 99;
        const prioB = SHIFT_TYPE_PRIORITY[b.type] || 99;
        if (prioA !== prioB) return prioA - prioB;

        const milA = militaries.find(m => m.id === a.militaryId);
        const milB = militaries.find(m => m.id === b.militaryId);

        const antA = milA?.antiguidade ?? 999;
        const antB = milB?.antiguidade ?? 999;
        if (antA !== antB) return antA - antB;

        return (milA?.name || '').localeCompare(milB?.name || '');
      });
    }, [dayData, visibleTypes, militaries]);

    return (
      <button
        onClick={onClick}
        className={`min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all group relative text-left ${isToday ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'} ${isSelected ? 'ring-2 ring-primary ring-inset z-10' : ''}`}
      >
        <div className="flex justify-between items-start mb-0.5 sm:mb-1">
          <div className="flex flex-col items-start gap-1">
            <span className={`text-[10px] sm:text-xs font-bold ${isToday ? 'bg-primary text-white w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center' : 'text-slate-400 dark:text-slate-500'}`}>
              {day}
            </span>
            {holiday && (
              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded ring-1 ring-red-100 dark:ring-red-900/30">
                <span className="material-symbols-outlined text-[8px] sm:text-[10px] font-black">event_busy</span>
                <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-tighter">Feriado</span>
              </div>
            )}
          </div>
          {combined.length > 0 && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary"></span>}
        </div>
        <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
          {combined.map(s => {
            if ((s as any).isStage) {
              return (
                <div
                  key={s.id}
                  className="text-[8px] sm:text-[9px] font-bold p-0.5 sm:p-1 rounded bg-indigo-50 text-indigo-700 truncate border border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                >
                  📌 {militaries.find(m => m.id === s.militaryId)?.name}
                  <span className="block text-[6px] sm:text-[7px] opacity-70 uppercase leading-none mt-0.5">{formatLocation(s.type, s.location)}</span>
                </div>
              );
            }
            const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
            return (
              <div
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isModerator) {
                    onEditShift(s as Shift);
                  }
                }}
                className={`text-[8px] sm:text-[9px] font-bold p-0.5 sm:p-1 rounded ${colors.bg} ${colors.text} truncate border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                {militaries.find(m => m.id === s.militaryId)?.name}
                {(s.type === 'Escala Diversa' || s.type === 'Estágio') && <span className="block text-[6px] sm:text-[7px] opacity-70 uppercase leading-none mt-0.5">{formatLocation(s.type, s.location)}</span>}
              </div>
            );
          })}
        </div>
      </button>
    );
  });

  return (
    <MainLayout activePage="dashboard" reverseMobile className="pb-20">
      <MainLayout.Content>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-xl">keyboard_arrow_left</span>
                </button>

                <div className="flex items-center px-4 py-1.5 gap-2 group cursor-pointer relative min-w-[140px] justify-center">
                  <select value={currentMonth} onChange={handleMonthChange} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full">
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1 group-hover:text-primary transition-colors">
                    {months[currentMonth]}
                    <span className="material-symbols-outlined text-base opacity-40 group-hover:opacity-100 transition-opacity">expand_more</span>
                  </span>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-2"></div>

                  <div className="relative flex items-center group/year">
                    <select value={currentYear} onChange={handleYearChange} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                      {currentYear}
                    </span>
                  </div>
                </div>

                <button onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-xl">keyboard_arrow_right</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now.getMonth());
                  setCurrentYear(now.getFullYear());
                  setSelectedDay(now.getDate());
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Voltar para Hoje
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-1">
            {[...allShiftTypes, 'Escala Diversa'].map(type => {
              const isSelected = selectedShiftTypes.includes(type);
              const colors = SHIFT_TYPE_COLORS[type] || SHIFT_TYPE_COLORS['Escala Geral'];
              return (
                <button
                  key={type}
                  onClick={() => toggleShiftType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                    ? `${colors.bg} ${colors.text} ${colors.border} ring-1 ring-offset-1 ring-primary/20 shadow-sm`
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 grayscale opacity-60'}`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

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
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              return (
                <CalendarDay
                  key={day}
                  day={day}
                  dateStr={dateStr}
                  isSelected={selectedDay === day}
                  isToday={isToday}
                  dayData={groupedData[dateStr]}
                  holiday={holidays.find(h => h.date === dateStr)}
                  onClick={() => setSelectedDay(day)}
                  onEditShift={handleOpenEditModal}
                  isModerator={isModerator || false}
                  militaries={militaries}
                  visibleTypes={selectedShiftTypes}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Legenda de Escalas</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(SHIFT_TYPE_COLORS)
              .filter(([type]) => type !== 'Escala Geral')
              .sort(([a], [b]) => (SHIFT_TYPE_PRIORITY[a] || 99) - (SHIFT_TYPE_PRIORITY[b] || 99))
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
        <div id="fiche-do-dia" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-auto lg:h-[calc(100vh-120px)] lg:sticky lg:top-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <button onClick={handlePrevDay} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-base">keyboard_arrow_left</span>
                </button>
                <button onClick={handleNextDay} className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-all">
                  <span className="material-symbols-outlined text-base">keyboard_arrow_right</span>
                </button>
              </div>
              <div className="flex flex-col">
                <h2 className="font-bold text-slate-800 dark:text-100 uppercase text-xs sm:text-sm leading-none mb-1">FICHA DO DIA</h2>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-[11px] text-primary font-bold leading-tight">
                    {safeParseISO(selectedDateStr).toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-tight text-right">
                    {selectedDay.toString().padStart(2, '0')} {months[currentMonth].toUpperCase()} {currentYear}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isModerator && (
                <button
                  onClick={() => {
                    const existing = holidays.find(h => h.date === selectedDateStr);
                    if (existing) {
                      removeHoliday(existing.id);
                    } else {
                      const desc = prompt("Descrição do Feriado (opcional):") || "Feriado";
                      addHoliday({ date: selectedDateStr, description: desc });
                    }
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${holidays.some(h => h.date === selectedDateStr)
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 border border-red-200 dark:border-red-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                >
                  <span className="material-symbols-outlined text-lg">event_busy</span>
                </button>
              )}
              {isModerator && (
                <button
                  onClick={handleOpenAddModal}
                  className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 sm:space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm">military_tech</span> SERVIÇO ({(groupedData[selectedDateStr]?.shifts.length || 0) + (groupedData[selectedDateStr]?.extraHours.length || 0)})
              </div>

              {(() => {
                const dayData = groupedData[selectedDateStr];
                if (!dayData || (dayData.shifts.length === 0 && dayData.extraHours.length === 0 && dayData.stages.length === 0)) {
                  return <p className="text-xs text-slate-400 italic text-center py-6">Nenhum serviço escalado para este dia.</p>;
                }

                const dayShifts = dayData.shifts.filter(s => isShiftVisible(s.type));
                const dayStages = dayData.stages.filter(st => isShiftVisible('Estágio'));
                const dayExtraHours = dayData.extraHours.filter(eh => isShiftVisible('Escala Diversa'));

                const unifiedList = [
                  ...dayShifts
                    .filter(s => !(s.type === 'Estágio' && dayStages.some(st => st.military_id === s.militaryId)))
                    .map(s => ({ ...s, isStage: s.type === 'Estágio' })),
                  ...dayStages.map(s => ({ ...s, isStage: true, type: 'Estágio' as const, militaryId: s.military_id, location: s.location })),
                  ...dayExtraHours.map(eh => ({
                    id: eh.id,
                    militaryId: eh.military_id,
                    type: 'Escala Diversa' as const,
                    location: eh.description.replace('Escala Diversa: ', ''),
                    startTime: '08:00',
                    endTime: '12:00',
                    isStage: false,
                    isExtra: true,
                    date: eh.date
                  }))
                ].sort((a, b) => (SHIFT_TYPE_PRIORITY[a.type] || 99) - (SHIFT_TYPE_PRIORITY[b.type] || 99));

                return unifiedList.map((s: any) => {
                  const m = militaries.find(mil => mil.id === s.militaryId);
                  const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];

                  return (
                    <button
                      key={s.id}
                      onClick={() => isModerator && handleOpenEditModal(s)}
                      className={`w-full text-left bg-white dark:bg-slate-800 rounded-xl border ${colors.border} dark:border-slate-700 p-3 sm:p-4 space-y-3 shadow-sm relative overflow-hidden transition-all group ${isModerator ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex gap-2 sm:gap-3">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colors.bg} flex items-center justify-center ${colors.text} border ${colors.border} shrink-0`}>
                            <span className="material-symbols-outlined text-lg sm:text-xl">person</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-none truncate">{m?.rank} {m?.name}</h3>
                              <span className={`text-[7px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {s.type}
                              </span>
                            </div>
                            <p className="text-[9px] sm:text-[11px] text-slate-500 mt-1 uppercase font-bold">
                              {formatLocation(s.type, s.location) || 'Local não definido'}
                              {s.startTime && ` • ${s.startTime} - ${s.endTime}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={`absolute top-0 right-0 w-1 h-full ${colors.dot}`}></div>
                    </button>
                  );
                });
              })()}
            </section>
          </div>
        </div>
      </MainLayout.Sidebar>

      {/* Modal logic omitted for brevity in summary, but fully implemented in code */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{editingShift ? 'edit_calendar' : 'add_circle'}</span>
                {editingShift ? 'Editar Serviço' : 'Adicionar Serviço'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Militar</label>
                <select
                  value={formData.militaryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, militaryId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm"
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
                  className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm"
                >
                  {Object.keys(SHIFT_TYPE_COLORS).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {formData.type === 'Estágio' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Local</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Início</label>
                      <input type="time" value={formData.startTime} onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Fim</label>
                      <input type="time" value={formData.endTime} onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))} className="w-full h-10 px-3 rounded-lg border text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'Escala Diversa' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Descrição</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border text-sm"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              {editingShift && (
                <button onClick={handleDeleteShift} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">delete</span> Excluir
                </button>
              )}
              <button onClick={handleSaveShift} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default DashboardPage;
