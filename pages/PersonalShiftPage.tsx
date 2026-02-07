
import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { useAcademic } from '../contexts/AcademicContext';
import { supabase } from '../supabase';
import { Shift, MilitaryPreference } from '../types';
import { SHIFT_TYPE_COLORS } from '../constants';
import { safeParseISO } from '../utils/dateUtils';

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
  const { shifts: allShifts, preferences, addPreference, removePreference } = useShift();
  const { schedule, disciplines } = useAcademic();
  const { isModerator, session } = useAuth();
  const [selectedMilitaryId, setSelectedMilitaryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [extraHours, setExtraHours] = useState<ExtraHourRecord[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [personalStages, setPersonalStages] = useState<any[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Pref State
  const [prefDate, setPrefDate] = useState(new Date().toISOString().split('T')[0]);
  const [prefType, setPrefType] = useState<'restriction' | 'priority'>('restriction');
  const [isSavingPref, setIsSavingPref] = useState(false);

  // Filter State
  const allShiftTypes = useMemo(() =>
    Object.keys(SHIFT_TYPE_COLORS).filter(type => !['Escala Geral', 'Escala Diversa'].includes(type)),
    []);
  const [selectedShiftTypes, setSelectedShiftTypes] = useState<string[]>([]);
  const [selectedPastTypes, setSelectedPastTypes] = useState<string[]>([]);

  useEffect(() => {
    const defaultTypes = [...allShiftTypes, 'Escala Diversa'];
    setSelectedShiftTypes(defaultTypes);
    setSelectedPastTypes(defaultTypes);
  }, [allShiftTypes]);

  const toggleShiftType = (type: string) => {
    setSelectedShiftTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const togglePastType = (type: string) => {
    setSelectedPastTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Fetch user profile
  useEffect(() => {
    if (session?.user) {
      supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
        setUserProfile(data);
      });
    }
  }, [session]);

  // Initial selection
  useEffect(() => {
    if (userProfile && militaries.length > 0 && !selectedMilitaryId) {
      // Find military by smart name matching first (for everyone)
      const userNameParts = userProfile.name.toLowerCase().split(/\s+/).filter((part: string) => part.length >= 3);

      const matchedMilitary = militaries.find(m => {
        const milNameLower = m.name.toLowerCase();
        return userNameParts.some(part => milNameLower.includes(part));
      });

      if (matchedMilitary) {
        setSelectedMilitaryId(matchedMilitary.id);
      } else if (isModerator) {
        // Fallback to first military ONLY if no match found and user is moderator
        setSelectedMilitaryId(militaries[0].id);
      }
    }
  }, [userProfile, militaries, isModerator, selectedMilitaryId]);

  const selectedMilitary = useMemo(() =>
    militaries.find(m => m.id === selectedMilitaryId) || (isModerator ? militaries[0] : null)
    , [militaries, selectedMilitaryId, isModerator]);

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
    if (!error && data) setPersonalStages(data);
    setIsLoadingStages(false);
  };

  const fetchExtraHours = async () => {
    setIsLoadingExtra(true);
    const { data, error } = await supabase
      .from('extra_hours')
      .select('*')
      .eq('military_id', selectedMilitaryId)
      .order('date', { ascending: false });
    if (!error && data) setExtraHours(data);
    setIsLoadingExtra(false);
  };

  const filteredMilitary = useMemo(() =>
    militaries.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rank.toLowerCase().includes(searchTerm.toLowerCase())
    )
    , [militaries, searchTerm]);

  const personalShifts = useMemo(() =>
    allShifts.filter(s => s.militaryId === selectedMilitaryId)
    , [allShifts, selectedMilitaryId]);

  const calculateShiftHours = (shift: Shift) => {
    if (shift.duration) return shift.duration;
    const date = safeParseISO(shift.date);
    const dayOfWeek = date.getDay();
    if (shift.type === 'Comandante da Guarda') {
      return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 11 : 24;
    }
    if (shift.type === 'Estágio') {
      if (dayOfWeek === 6) return 24;
      if (dayOfWeek === 0) return 12;
      return 0;
    }
    return 0;
  };

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaysClasses = useMemo(() => {
    return schedule
      .filter(s => s.date === today && s.description !== 'Sem Aula')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule, today]);

  const groupByMonth = (shifts: any[]) => {
    const result: { month: string, items: any[] }[] = [];
    shifts.forEach(s => {
      const date = safeParseISO(s.date);
      const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const lastGroup = result[result.length - 1];
      if (lastGroup && lastGroup.month === monthYear) {
        lastGroup.items.push(s);
      } else {
        result.push({ month: monthYear, items: [s] });
      }
    });
    return result;
  };

  // Process shifts with new location rules
  const processedShifts = useMemo(() => {
    return personalShifts.map(s => {
      let location = s.location;
      if (['Comandante da Guarda', 'Sobreaviso', 'Faxina', 'Manutenção'].includes(s.type)) {
        location = 'ABM';
      } else if (s.type === 'Escala Diversa') {
        location = '';
      } else if (s.type === 'Estágio') {
        const stageMatch = personalStages.find(ps => ps.date === s.date);
        location = stageMatch ? stageMatch.location : s.location;
      }
      return { ...s, location };
    });
  }, [personalShifts, personalStages]);

  // Robust Duplication Filter
  const combinedUpcoming = useMemo(() => {
    const list = [
      ...processedShifts.map(s => ({ ...s, isStage: false })),
      ...personalStages
        .filter(ps => !processedShifts.some(s => s.date === ps.date && s.type === 'Estágio'))
        .map(s => ({
          id: s.id,
          date: s.date,
          type: 'Estágio',
          location: s.location,
          isStage: true,
          startTime: '08:00',
          endTime: '08:00',
          status: 'Confirmado'
        })),
      ...extraHours
        .filter(eh => {
          if (eh.category !== 'CFO II - Registro de Horas' || eh.date < today) return false;
          const ehDate = eh.date.split('T')[0];
          const hasExistingShift = processedShifts.some(s => {
            const shiftDate = s.date.split('T')[0];
            return shiftDate === ehDate && s.type === 'Escala Diversa';
          });
          return !hasExistingShift;
        })
        .map(eh => ({
          id: eh.id,
          date: eh.date,
          type: 'Escala Diversa',
          description: eh.description.replace('Escala Diversa: ', ''),
          location: '', // No location for Escala Diversa as per user request
          isStage: false,
          isExtra: true,
          startTime: '08:00',
          endTime: '12:00',
          status: 'Confirmado'
        }))
    ];
    return list
      .filter(s => s.date >= today)
      .filter(s => selectedShiftTypes.includes(s.type))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [processedShifts, personalStages, extraHours, today, selectedShiftTypes]);

  const combinedPast = useMemo(() => {
    const list = [
      ...processedShifts.map(s => ({ ...s, isStage: false })),
      ...personalStages
        .filter(ps => !processedShifts.some(s => s.date === ps.date && s.type === 'Estágio'))
        .map(s => ({
          id: s.id,
          date: s.date,
          type: 'Estágio',
          location: s.location,
          isStage: true,
          startTime: '08:00',
          endTime: '08:00',
          status: 'Confirmado'
        })),
      ...extraHours
        .filter(eh => {
          if (eh.category !== 'CFO II - Registro de Horas' || eh.date >= today) return false;
          // Normalização e deduplicação
          const ehDate = eh.date.split('T')[0];
          const hasExistingShift = processedShifts.some(s => {
            const shiftDate = s.date.split('T')[0];
            return shiftDate === ehDate && s.type === 'Escala Diversa';
          });
          return !hasExistingShift;
        })
        .map(eh => ({
          id: eh.id,
          date: eh.date,
          type: 'Escala Diversa',
          description: eh.description.replace('Escala Diversa: ', ''),
          location: '',
          isStage: false,
          isExtra: true,
          startTime: '08:00',
          endTime: '12:00',
          status: 'Confirmado'
        }))
    ];
    return list
      .filter(s => s.date < today)
      .filter(s => selectedPastTypes.includes(s.type))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [processedShifts, personalStages, extraHours, today, selectedPastTypes]);

  const todayShifts = useMemo(() => {
    const all = [
      ...processedShifts.map(s => ({ ...s, isStage: false })),
      ...personalStages
        .filter(ps => !processedShifts.some(s => s.date === ps.date && s.type === 'Estágio'))
        .map(s => ({
          id: s.id,
          date: s.date,
          type: 'Estágio',
          location: s.location,
          isStage: true,
          startTime: '08:00',
          endTime: '08:00',
          status: 'Confirmado'
        })),
      ...extraHours
        .filter(eh => {
          if (eh.category !== 'CFO II - Registro de Horas') return false;
          const ehDate = eh.date.split('T')[0];
          return ehDate === today;
        })
        .map(eh => ({
          id: eh.id,
          date: eh.date,
          type: 'Escala Diversa',
          description: eh.description.replace('Escala Diversa: ', ''),
          location: '',
          isStage: false,
          isExtra: true,
          startTime: '08:00',
          endTime: '12:00',
          status: 'Confirmado'
        }))
    ];
    return all.filter(s => s.date === today);
  }, [processedShifts, personalStages, extraHours, today]);

  const upcomingGrouped = useMemo(() => groupByMonth(combinedUpcoming), [combinedUpcoming]);
  const pastGrouped = useMemo(() => groupByMonth(combinedPast), [combinedPast]);

  const isExcludedActivity = (type: string) => {
    const excludedExact = ['CFO I - Faxina', 'CFO I - Manutenção', 'CFO I - Sobreaviso'];
    if (excludedExact.includes(type)) return true;
    return type.startsWith('CFO I - Estágio');
  };

  const totalShiftHours = useMemo(() =>
    personalShifts
      .filter(s => !isExcludedActivity(s.type))
      .reduce((acc, s) => acc + calculateShiftHours(s), 0)
    , [personalShifts]);

  const totalExtraHours = useMemo(() =>
    extraHours
      .filter(e => !isExcludedActivity(e.category))
      .reduce((acc, e) => acc + (e.hours + e.minutes / 60), 0)
    , [extraHours]);

  const totalWorkload = totalShiftHours + totalExtraHours;

  const totalOtherServices = useMemo(() =>
    personalShifts.filter(s =>
      ['Sobreaviso', 'Faxina', 'Manutenção'].includes(s.type) && !isExcludedActivity(s.type)
    ).length
    , [personalShifts]);

  const groupedSummary = useMemo(() => {
    const summary: Record<string, { totalHours: number, totalServices: number, type: string }> = {};
    personalShifts.forEach(s => {
      if (isExcludedActivity(s.type)) return;
      const hours = calculateShiftHours(s);
      if (!summary[s.type]) summary[s.type] = { totalHours: 0, totalServices: 0, type: s.type };
      if (hours > 0) summary[s.type].totalHours += hours;
      else summary[s.type].totalServices += 1;
    });
    extraHours.forEach(e => {
      const type = e.category || 'Registro de Horas';
      if (isExcludedActivity(type)) return;
      if (!summary[type]) summary[type] = { totalHours: 0, totalServices: 0, type };
      summary[type].totalHours += (e.hours + e.minutes / 60);
    });
    return Object.values(summary).sort((a, b) => b.totalHours - a.totalHours || b.totalServices - a.totalServices);
  }, [personalShifts, extraHours]);



  const handleAddPref = async () => {
    if (!selectedMilitaryId) return;
    setIsSavingPref(true);
    await addPreference({ militaryId: selectedMilitaryId, date: prefDate, type: prefType });
    setIsSavingPref(false);
  };

  const militaryPrefs = useMemo(() =>
    preferences.filter(p => p.militaryId === selectedMilitaryId)
    , [preferences, selectedMilitaryId]);

  return (
    <MainLayout activePage="personal">
      <MainLayout.Content>
        <div className="lg:hidden mb-6 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Localizar Militar</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person_search</span>
            <input
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-white"
              placeholder="Pesquisar militar..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <div className="mt-2 max-h-60 overflow-y-auto custom-scrollbar space-y-1">
              {filteredMilitary.length > 0 ? (
                filteredMilitary.map(m => (
                  <button
                    key={`${m.id}-mobile`}
                    onClick={() => { setSelectedMilitaryId(m.id); setSearchTerm(''); }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-[10px] shrink-0">
                      {m.antiguidade || '-'}
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

        {!selectedMilitary ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">person_search</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Consultar Escala Individual</h2>
            <p className="text-slate-500 mb-8">Utilize a barra de pesquisa ao lado ou abaixo para localizar o militar e visualizar sua escala de serviço e carga horária.</p>

            <div className="relative max-w-md mx-auto">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-white"
                placeholder="Digite o nome do militar..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredMilitary.length > 0 ? (
                    filteredMilitary.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedMilitaryId(m.id); setSearchTerm(''); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-sm shrink-0 border border-orange-200 dark:border-orange-800/50">
                          {m.antiguidade || '-'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.rank} {m.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-medium">{m.battalion}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500 font-medium">Nenhum militar encontrado.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-xl sm:text-2xl border-2 sm:border-4 border-orange-200 dark:border-orange-800/50 shadow-sm shrink-0">
                  {selectedMilitary.antiguidade || '-'}
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

            </div>

            {/* Escalas de Hoje */}
            <section className="mb-8">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1 mb-4">
                <span className="material-symbols-outlined text-primary text-xl">today</span>
                Escalas de Hoje
              </h2>
              {todayShifts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayShifts.map((s: any, idx: number) => {
                    const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                    return (
                      <div key={s.id || idx} className={`${colors.bg} rounded-2xl border-2 ${colors.border} p-5 relative overflow-hidden group hover:shadow-lg transition-all`}>
                        <div className="absolute top-0 right-0 p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${colors.text} ${colors.bg.replace('bg-', 'bg-').split(' ')[0]} border ${colors.border}`}>Hoje</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined ${colors.text} text-xl`}>schedule</span>
                            <span className={`text-xs font-bold ${colors.text} uppercase tracking-widest opacity-80`}>
                              {s.startTime} - {s.endTime}
                            </span>
                          </div>
                          <h3 className={`text-lg font-extrabold ${colors.text} mb-2`}>{s.type}</h3>
                          {s.type === 'Escala Diversa' && s.description && (
                            <p className={`text-xs font-bold ${colors.text} opacity-80 mb-3 -mt-1`}>{s.description}</p>
                          )}
                          {s.location && (
                            <div className={`flex items-center gap-2 pt-3 border-t ${colors.border} opacity-60`}>
                              <span className={`material-symbols-outlined ${colors.text} text-sm`}>location_on</span>
                              <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-tighter truncate`}>{s.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                  <p className="text-sm text-slate-500 font-medium italic">Você não possui escalas para hoje.</p>
                </div>
              )}
            </section>

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
                  <span className="material-symbols-outlined text-primary text-xl">event_upcoming</span>
                  Próximos Serviços
                </h2>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 px-1">
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

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {upcomingGrouped.map((group, gIdx) => (
                  <div key={group.month}>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{group.month}</span>
                    </div>
                    <div className="hidden sm:block">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.items.map((s: any, idx: number) => (
                            <tr key={s.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-6 py-4 w-40">
                                <div className="flex flex-col">
                                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {safeParseISO(s.date).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter text-left">
                                    {safeParseISO(s.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[10px] font-bold uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
                                  {s.type}
                                  {s.location && ` - ${s.location}`}
                                  {s.type === 'Escala Diversa' && ` (${s.startTime} às ${s.endTime})`}
                                  {s.type === 'Barra' && ` (${s.startTime})`}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((s: any, idx: number) => (
                        <div key={s.id || idx} className="p-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data</span>
                            <span className="text-sm font-black text-slate-800 dark:text-white">
                              {safeParseISO(s.date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">
                              {safeParseISO(s.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[9px] font-black uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
                            {s.type}
                            {s.location && ` - ${s.location}`}
                            {s.type === 'Escala Diversa' && ` (${s.startTime} às ${s.endTime})`}
                            {s.type === 'Barra' && ` (${s.startTime})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {combinedUpcoming.length === 0 && (
                  <div className="p-10 text-center text-slate-400 italic text-sm">Nenhum serviço ou estágio agendado.</div>
                )}
              </div>
            </section>

            {/* Mobile: Today's Classes */}
            {todaysClasses.length > 0 && (
              <div className="block sm:hidden mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
                    <span className="material-symbols-outlined text-primary text-xl">school</span>
                    Aulas de Hoje
                  </h2>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {todaysClasses.map((cls, idx) => {
                    const discipline = disciplines.find(d => d.id === cls.disciplineId);
                    const isExam = cls.description === 'PROVA';
                    return (
                      <div key={cls.id || idx} className="p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{cls.startTime.slice(0, 5)} - {cls.endTime.slice(0, 5)}</span>
                          <span className="text-sm font-black text-slate-800 dark:text-white">
                            {isExam && <span className="text-pink-600 dark:text-pink-400 mr-1">[PROVA]</span>}
                            {discipline?.name || cls.description}
                          </span>
                          {cls.location && cls.description !== 'Liberação' && (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {cls.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
                  <span className="material-symbols-outlined text-primary text-xl">history</span>
                  Carga Horária
                </h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.totalHours > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                              {item.totalHours > 0 ? `${item.totalHours.toFixed(1)}h` : `${item.totalServices} Serviço${item.totalServices !== 1 ? 's' : ''}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedSummary.map((item, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${SHIFT_TYPE_COLORS[item.type]?.dot || 'bg-primary'} shrink-0`}></div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{item.type}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-black ${item.totalHours > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        {item.totalHours > 0 ? `${item.totalHours.toFixed(1)}h` : `${item.totalServices} Un`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 px-1">
                  <span className="material-symbols-outlined text-primary text-xl">event_busy</span>
                  Restrições e Prioridades
                </h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Adicionar Preferência</h3>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data</label>
                        <input
                          type="date"
                          value={prefDate}
                          onChange={(e) => setPrefDate(e.target.value)}
                          className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo</label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => setPrefType('restriction')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${prefType === 'restriction' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500'}`}
                          >
                            <span className="material-symbols-outlined text-sm">block</span> Restrição
                          </button>
                          <button
                            onClick={() => setPrefType('priority')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${prefType === 'priority' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500'}`}
                          >
                            <span className="material-symbols-outlined text-sm">star</span> Prioridade
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleAddPref}
                        disabled={isSavingPref}
                        className="w-full h-11 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-xs sm:text-sm uppercase tracking-widest mt-2"
                      >
                        {isSavingPref ? 'Salvando...' : 'Registrar Preferência'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Meus Registros</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {militaryPrefs.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-xs text-slate-400 font-medium italic">Nenhuma restrição ou prioridade registrada.</p>
                        </div>
                      ) : (
                        militaryPrefs.sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50 group">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.type === 'restriction' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-500'}`}>
                                <span className="material-symbols-outlined text-lg">{p.type === 'restriction' ? 'block' : 'star'}</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{safeParseISO(p.date).toLocaleDateString('pt-BR')}</p>
                                <p className={`text-[9px] font-black uppercase tracking-tight ${p.type === 'restriction' ? 'text-red-500' : 'text-amber-500'}`}>
                                  {p.type === 'restriction' ? 'Restrição de Serviço' : 'Prioridade de Serviço'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removePreference(p.id)}
                              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8 opacity-75 grayscale-[0.5]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-bold text-slate-400 dark:text-slate-500 flex items-center gap-2 px-1">
                  <span className="material-symbols-outlined text-slate-400 text-xl">history</span>
                  Serviços Concluídos
                </h2>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 px-1">
                {[...allShiftTypes, 'Escala Diversa'].map(type => {
                  const isSelected = selectedPastTypes.includes(type);
                  const colors = SHIFT_TYPE_COLORS[type] || SHIFT_TYPE_COLORS['Escala Geral'];
                  return (
                    <button
                      key={type}
                      onClick={() => togglePastType(type)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                        ? `bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 ring-1 ring-offset-1 ring-slate-400/20 shadow-sm`
                        : 'bg-slate-50 dark:bg-slate-800/20 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 grayscale opacity-40'}`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              {combinedPast.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-sm text-slate-500 font-medium">Nenhum serviço anterior registrado.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {pastGrouped.map((group, gIdx) => (
                    <div key={group.month}>
                      <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{group.month}</span>
                      </div>
                      <div className="hidden sm:block">
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {group.items.map((s: any, idx: number) => (
                              <tr key={s.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 w-40">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-extrabold text-slate-400 dark:text-slate-500">
                                      {safeParseISO(s.date).toLocaleDateString('pt-BR')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter text-left">
                                      {safeParseISO(s.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[10px] font-bold uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
                                    {s.type}
                                    {s.location && ` - ${s.location}`}
                                    {s.type === 'Escala Diversa' && ` (${s.startTime} às ${s.endTime})`}
                                    {s.type === 'Barra' && ` (${s.startTime})`}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {group.items.map((s: any, idx: number) => (
                          <div key={s.id || idx} className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data</span>
                              <span className="text-sm font-black text-slate-400 dark:text-slate-500">
                                {safeParseISO(s.date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[9px] font-black uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
                              {s.type}
                              {s.location && ` - ${s.location}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="space-y-6">
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
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
                      onClick={() => { setSelectedMilitaryId(m.id); setSearchTerm(''); }}
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

          {/* Desktop: Today's Classes */}
          {todaysClasses.length > 0 && (
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">school</span>
                Cronograma de Hoje
              </h3>
              <div className="space-y-3">
                {todaysClasses.map((cls, idx) => {
                  const discipline = disciplines.find(d => d.id === cls.disciplineId);
                  const isExam = cls.description === 'PROVA';
                  const isLib = cls.description === 'Liberação';
                  return (
                    <div key={cls.id || idx} className={`p-3 rounded-lg border leading-tight ${isExam ? 'bg-pink-50 border-pink-100 dark:bg-pink-900/10 dark:border-pink-800' : isLib ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLib ? 'text-slate-400' : 'text-primary'}`}>{cls.startTime.slice(0, 5)} - {cls.endTime.slice(0, 5)}</span>
                      </div>
                      <p className={`text-xs font-bold ${isLib ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {isExam && <span className="text-pink-600 dark:text-pink-400 mr-1">[PROVA]</span>}
                        {discipline?.name || cls.description}
                      </p>
                      {cls.location && !isLib && (
                        <p className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {cls.location}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </MainLayout.Sidebar>
    </MainLayout>
  );
};

export default PersonalShiftPage;
