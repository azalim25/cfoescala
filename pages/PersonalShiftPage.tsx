
import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { useAcademic } from '../contexts/AcademicContext';
import { supabase } from '../supabase';
import { Shift, MilitaryPreference } from '../types';
import { SHIFT_TYPE_COLORS, SHIFT_TYPE_PRIORITY } from '../constants';
import { safeParseISO } from '../utils/dateUtils';
import { stripGroupId } from '../utils/formatUtils';
import { fetchAllRows } from '../utils/supabaseUtils';

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

// --- Helpers ---
const isExcludedActivity = (type: string) => {
  const excludedExact = ['CFO I - Faxina', 'CFO I - Manutenção', 'CFO I - Sobreaviso'];
  if (excludedExact.includes(type)) return true;
  return type.startsWith('CFO I - Estágio');
};

const calculateShiftHours = (shift: any) => {
  if (shift.duration) return shift.duration;

  // Case where we have explicit start/end times
  const st = shift.start_time || shift.startTime;
  const et = shift.end_time || shift.endTime;

  if (st && et && (st !== '08:00' || et !== '08:00' || shift.type === 'Estágio' || shift.type === 'Comandante da Guarda')) {
    const [h1, m1] = st.split(':').map(Number);
    const [h2, m2] = et.split(':').map(Number);
    if (!isNaN(h1) && !isNaN(h2)) {
      let totalMinutes = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
      if (totalMinutes <= 0) totalMinutes += 24 * 60;
      return totalMinutes / 60;
    }
  }

  const date = safeParseISO(shift.date);
  const dayOfWeek = date.getDay();
  if (shift.type === 'Comandante da Guarda') {
    return (dayOfWeek >= 1 && dayOfWeek <= 5) ? 11 : 24;
  }
  if (shift.type === 'Estágio') {
    if (dayOfWeek === 6) return 24;
    if (dayOfWeek === 0) return 12;
    return 12; // Default for week-day stages
  }
  return 0;
};

// --- Sub-components ---
const StatCard = React.memo(({ title, value, unit, icon, colorClass, details }: any) => (
  <div className={`${colorClass} rounded-xl p-6 shadow-xl relative overflow-hidden group`}>
    <div className="relative z-10">
      <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-white tracking-tighter">{value}</span>
        <span className="text-sm font-bold text-white/80">{unit}</span>
      </div>
      {details && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          {details.map((d: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight">
              <span>{d.label}:</span>
              <span>{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-white/10 rotate-12 pointer-events-none">{icon}</span>
  </div>
));

const ShiftRow = React.memo(({ s, holidays }: { s: any, holidays: any[] }) => {
  const isHoliday = holidays.some(h => h.date === s.date);
  const day = safeParseISO(s.date);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const showTimes = s.type === 'Escala Diversa' || (s.type === 'Estágio' && (isHoliday || isWeekend || (s.start_time && s.end_time))) || s.type === 'Barra';

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-6 py-4 w-40">
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
            {day.toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter text-left">
            {day.toLocaleDateString('pt-BR', { weekday: 'long' })}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-0.5 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[10px] font-bold uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
          {s.type}
          {s.location && ` - ${s.location}`}
          {s.type === 'Escala Diversa' && s.description && `: ${s.description}`}
          {showTimes && ` (${s.startTime}${s.endTime ? ` às ${s.endTime}` : ''})`}
        </span>
      </td>
    </tr>
  );
});

const ShiftCard = React.memo(({ s, holidays }: { s: any, holidays: any[] }) => {
  const isHoliday = holidays.some(h => h.date === s.date);
  const day = safeParseISO(s.date);
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const showTimes = s.type === 'Escala Diversa' || (s.type === 'Estágio' && (isHoliday || isWeekend || (s.start_time && s.end_time))) || s.type === 'Barra';

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Data</span>
        <span className="text-sm font-black text-slate-800 dark:text-white">
          {day.toLocaleDateString('pt-BR')}
        </span>
        <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">
          {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
        </span>
      </div>
      <span className={`px-2 py-1 rounded-md ${SHIFT_TYPE_COLORS[s.type as any]?.bg || 'bg-blue-50'} ${SHIFT_TYPE_COLORS[s.type as any]?.text || 'text-blue-700'} text-[9px] font-black uppercase border ${SHIFT_TYPE_COLORS[s.type as any]?.border || 'border-blue-100'}`}>
        {s.type}
        {s.location && ` - ${s.location}`}
        {s.type === 'Escala Diversa' && s.description && `: ${s.description}`}
        {showTimes && ` (${s.startTime}${s.endTime ? ` às ${s.endTime}` : ''})`}
      </span>
    </div>
  );
});

const PersonalShiftPage: React.FC = () => {
  const { militaries } = useMilitary();
  const { shifts: allShifts, preferences, addPreference, removePreference, holidays } = useShift();
  const { schedule, disciplines } = useAcademic();
  const { isModerator, session } = useAuth();
  const [selectedMilitaryId, setSelectedMilitaryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [extraHours, setExtraHours] = useState<ExtraHourRecord[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [personalStages, setPersonalStages] = useState<any[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // New academic details states
  const [classRoles, setClassRoles] = useState<any[]>([]);
  const [emAssignments, setEmAssignments] = useState<any[]>([]);
  const [allEstadosMaiores, setAllEstadosMaiores] = useState<any[]>([]);
  const [isLoadingAcademicDetails, setIsLoadingAcademicDetails] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'funcoes' | 'estados-maiores' | 'hora-extra'>('funcoes');

  // Pref State
  const [prefDate, setPrefDate] = useState(new Date().toISOString().split('T')[0]);
  const [prefType, setPrefType] = useState<'restriction' | 'priority'>('restriction');
  const [isSavingPref, setIsSavingPref] = useState(false);

  // Month Filter State for Workload
  const [workloadSelectedMonths, setWorkloadSelectedMonths] = useState<number[]>([]);
  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const toggleWorkloadMonth = (monthIndex: number) => {
    setWorkloadSelectedMonths(prev =>
      prev.includes(monthIndex)
        ? prev.filter(m => m !== monthIndex)
        : [...prev, monthIndex].sort((a, b) => a - b)
    );
  };

  const clearWorkloadFilters = () => setWorkloadSelectedMonths([]);

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
        return userNameParts.some((part: string) => milNameLower.includes(part));
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

  const getCurrentPeriodSemesterName = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed (1 = Jan)
    const day = currentDate.getDate();

    if (year === 2025) {
      if (month >= 3 && month <= 7) {
        if (month === 7 && day >= 15) {
          return '2° 2025 - CFO I';
        }
        return '1° 2025 - CFO I';
      }
      if (month > 7) {
        return '2° 2025 - CFO I';
      }
    } else if (year === 2026) {
      if (month >= 1 && month <= 7) {
        return '1° 2026 - CFO II';
      }
      if (month >= 8 && month <= 12) {
        return '2° 2026 - CFO II';
      }
    }
    return '';
  };

  const fetchAcademicDetails = async (milId: string) => {
    setIsLoadingAcademicDetails(true);
    try {
      // 1. Fetch semesters
      const { data: semesters, error: semError } = await supabase
        .from('funcoes_turma_semestre')
        .select('*');
      if (semError) throw semError;

      // 2. Fetch assignments for this military member
      const { data: assignments, error: assignError } = await supabase
        .from('funcoes_turma_assignments')
        .select('*')
        .eq('military_id', milId);
      if (assignError) throw assignError;

      // Zip them
      const zippedRoles = (assignments || []).map(asg => {
        const semObj = (semesters || []).find(s => s.id === asg.semestre_id);
        return {
          id: asg.id,
          role: asg.role,
          semestreName: semObj ? semObj.name : 'Outro Período',
          semestreId: asg.semestre_id,
          createdAt: asg.created_at
        };
      });
      setClassRoles(zippedRoles);

      // 3. Fetch Estados Maiores and assignments
      const { data: ems, error: emError } = await supabase
        .from('estado_maior')
        .select('*');
      if (emError) throw emError;
      setAllEstadosMaiores(ems || []);

      const { data: emAsgs, error: emAsgError } = await supabase
        .from('estado_maior_assignments')
        .select('*')
        .eq('military_id', milId);
      if (emAsgError) throw emAsgError;

      const zippedEM = (emAsgs || []).map(asg => {
        const emObj = (ems || []).find(e => e.id === asg.estado_maior_id);
        return {
          id: asg.id,
          role: asg.role,
          emName: emObj ? emObj.name : 'Estado Maior Indefinido',
          emDescription: emObj ? emObj.description : '',
          emId: asg.estado_maior_id,
          createdAt: asg.created_at
        };
      });
      setEmAssignments(zippedEM);

    } catch (error) {
      console.error('Error fetching academic details:', error);
    } finally {
      setIsLoadingAcademicDetails(false);
    }
  };

  useEffect(() => {
    if (selectedMilitaryId) {
      fetchExtraHours();
      fetchPersonalStages();
      fetchAcademicDetails(selectedMilitaryId);
    }
  }, [selectedMilitaryId]);

  const fetchPersonalStages = async () => {
    setIsLoadingStages(true);
    try {
      const data = await fetchAllRows('stages', '*', q => q.eq('military_id', selectedMilitaryId).order('date', { ascending: false }));
      if (data) setPersonalStages(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingStages(false);
  };

  const fetchExtraHours = async () => {
    setIsLoadingExtra(true);
    try {
      const data = await fetchAllRows('extra_hours', '*', q => q.eq('military_id', selectedMilitaryId).order('date', { ascending: false }));
      if (data) setExtraHours(data);
    } catch (e) {
      console.error(e);
    }
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

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaysClasses = useMemo(() => {
    return schedule
      .filter(s => s.date === today && s.description !== 'Sem Aula')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [schedule, today]);

  // --- Unified Data Processing ---
  const data = useMemo(() => {
    if (!selectedMilitaryId) return null;

    // 1. Process Raw Shifts
    const rawPersonalShifts = allShifts
      .filter(s => s.militaryId === selectedMilitaryId)
      .map(s => {
        let location = s.location;
        let description = (s as any).description;

        if (['Comandante da Guarda', 'Sobreaviso', 'Faxina', 'Manutenção', 'Barra'].includes(s.type)) {
          location = 'ABM';
        } else if (['Escala Diversa'].includes(s.type)) {
          // Keep location for diverse shifts to ensure title/description shows
          location = stripGroupId(s.location || '');
          if (s.type === 'Escala Diversa' && !description) {
            const extraMatch = extraHours.find(eh =>
              eh.category === 'CFO II - Registro de Horas' &&
              eh.date.split('T')[0] === s.date.split('T')[0]
            );
            if (extraMatch) {
              description = stripGroupId(extraMatch.description.replace('Escala Diversa: ', ''));
            }
          }
        } else if (s.type === 'Estágio') {
          const stageMatch = personalStages.find(ps => ps.date === s.date);
          location = stageMatch?.location || s.location;
          return {
            ...s,
            location,
            description,
            start_time: stageMatch?.start_time || (s as any).start_time,
            end_time: stageMatch?.end_time || (s as any).end_time
          };
        }
        return { ...s, location, description };
      });

    // 2. Combine all items
    const allItems = [
      ...rawPersonalShifts.map(s => ({ ...s, isStage: false, start_time: (s as any).start_time, end_time: (s as any).end_time })),
      ...personalStages
        .filter(ps => !rawPersonalShifts.some(s => s.date === ps.date && s.type === 'Estágio'))
        .map(s => ({
          id: s.id,
          date: s.date,
          type: 'Estágio',
          location: s.location,
          isStage: true,
          startTime: s.start_time || '08:00',
          endTime: s.end_time || (s.date && new Date(s.date + 'T12:00:00').getDay() === 0 ? '20:00' : '08:00'),
          start_time: s.start_time,
          end_time: s.end_time,
          status: 'Confirmado'
        })),
      ...extraHours
        .filter(eh => {
          if (eh.category !== 'CFO II - Registro de Horas') return false;
          const ehDate = eh.date.split('T')[0];
          return !rawPersonalShifts.some(s => s.date.split('T')[0] === ehDate && s.type === 'Escala Diversa');
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
          start_time: undefined,
          end_time: undefined,
          status: 'Confirmado'
        }))
    ].map(item => {
      // Pre-calculate times for "Hoje" logic normalization
      let { startTime, endTime } = item;
      const date = safeParseISO(item.date);
      const dayOfWeek = date.getDay();
      const sTypeLower = (item.type || '').trim().toLowerCase();
      const itemDateOnly = item.date.split('T')[0];
      const isHoliday = holidays.some(h => h.date.split('T')[0] === itemDateOnly);

      if (sTypeLower === 'comandante da guarda') {
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday) {
          startTime = '20:00'; endTime = '06:30';
        } else {
          startTime = '06:30'; endTime = '06:30';
        }
      } else if (sTypeLower === 'estágio') {
        const st = item.start_time || item.startTime;
        const et = item.end_time || item.endTime;
        if (st && et) {
          startTime = st; endTime = et;
        } else if (dayOfWeek === 6) { startTime = '08:00'; endTime = '08:00'; }
        else if (dayOfWeek === 0) { startTime = '08:00'; endTime = '20:00'; }
        else { startTime = '08:00'; endTime = '20:00'; }
      } else if (sTypeLower === 'manutenção') {
        startTime = '06:00'; endTime = '07:30';
      } else if (sTypeLower === 'sobreaviso' || sTypeLower === 'faxina') {
        startTime = ''; endTime = '';
      }

      return { ...item, startTime, endTime, hours: calculateShiftHours(item) };
    });

    // 3. Split into Today, Upcoming, Past
    const todayItems = allItems.filter(s => s.date.split('T')[0] === today);
    const upcomingItems = allItems
      .filter(s => s.date.split('T')[0] >= today && selectedShiftTypes.includes(s.type))
      .sort((a, b) => a.date.localeCompare(b.date));
    const pastItems = allItems
      .filter(s => s.date.split('T')[0] < today && selectedPastTypes.includes(s.type))
      .sort((a, b) => b.date.localeCompare(a.date));

    // 4. Group by Month
    const groupByMonth = (list: any[]) => {
      const groups: { month: string, items: any[] }[] = [];
      list.forEach(s => {
        const monthYear = safeParseISO(s.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const last = groups[groups.length - 1];
        if (last && last.month === monthYear) last.items.push(s);
        else groups.push({ month: monthYear, items: [s] });
      });
      return groups;
    };

    // 5. Statistics & Summary
    const monthFilter = workloadSelectedMonths;
    const isFiltered = (d: string) => monthFilter.length === 0 || monthFilter.includes(safeParseISO(d).getMonth());

    const summaryMap: Record<string, { totalHours: number, totalServices: number, type: string }> = {};
    let totalShiftH = 0;
    let totalExtraH = 0;
    let totalOtherS = 0;
    let totalStageH = 0;

    // Calculate Summary and Stats in one pass
    allItems.forEach(item => {
      const type = item.type;
      const hours = item.hours || 0;
      const inFilter = isFiltered(item.date);

      if (inFilter) {
        if (!isExcludedActivity(type)) {
          if (type !== 'Barra') totalShiftH += hours;
        }
        if (['Sobreaviso', 'Faxina', 'Manutenção'].includes(type) && !isExcludedActivity(type)) {
          totalOtherS++;
        }
      }

      // Special case for stage hours (requirement progress)
      if (type === 'Estágio') totalStageH += hours;

      if (inFilter) {
        if (!summaryMap[type]) summaryMap[type] = { totalHours: 0, totalServices: 0, type };
        if (hours > 0) summaryMap[type].totalHours += hours;
        else summaryMap[type].totalServices += 1;
      }
    });

    // Extra hours specific logic (avoiding double counting Escala Diversa)
    extraHours.forEach(e => {
      if (isExcludedActivity(e.category)) return;
      const inFilter = isFiltered(e.date);
      if (inFilter) totalExtraH += (e.hours + e.minutes / 60);

      // Consolidate in summary
      const isExtra = e.category === 'CFO II - Registro de Horas';
      let type = isExtra ? 'Escala Diversa' : (e.category || 'Registro de Horas');
      let location = isExtra ? '' : e.category;
      let description = isExtra ? stripGroupId(e.description.replace('Escala Diversa: ', '')) : stripGroupId(e.description);
      if (type === 'Escala Diversa' && rawPersonalShifts.some(s => s.type === 'Escala Diversa' && s.date.split('T')[0] === e.date.split('T')[0])) return;

      if (inFilter) {
        if (!summaryMap[type]) summaryMap[type] = { totalHours: 0, totalServices: 0, type };
        summaryMap[type].totalHours += (e.hours + e.minutes / 60);
      }
    });

    const priorityOrder = (t: string) => t.startsWith('CFO I') ? 100 : (SHIFT_TYPE_PRIORITY[t] || 99);
    const sortedSummary = Object.values(summaryMap).sort((a, b) => {
      const pA = priorityOrder(a.type), pB = priorityOrder(b.type);
      return pA !== pB ? pA - pB : a.type.localeCompare(b.type);
    });

    return {
      todayItems,
      upcomingGroups: groupByMonth(upcomingItems),
      pastGroups: groupByMonth(pastItems),
      summary: sortedSummary,
      stats: {
        totalShiftHours: totalShiftH,
        totalExtraHours: totalExtraH,
        totalWorkload: totalShiftH + totalExtraH,
        activeOtherServices: totalOtherS,
        totalStageHours: totalStageH
      }
    };
  }, [selectedMilitaryId, allShifts, personalStages, extraHours, today, selectedShiftTypes, selectedPastTypes, workloadSelectedMonths, holidays]);

  // --- Extra Hours Data Computation ---
  const extraHoursData = useMemo(() => {
    if (!selectedMilitaryId) return { cfo1: [], cfo1Total: 0, cfo2: [], cfo2Total: 0, em: [], emTotal: 0 };

    // 1. CFO I - Horas Extras
    const cfo1 = extraHours.filter(e => (e.category || '').startsWith('CFO I'));
    const cfo1Total = cfo1.reduce((sum, e) => sum + Number(e.hours || 0) + (Number(e.minutes || 0) / 60), 0);

    // 2. CFO II - Horas Extras (Escala Diversa)
    const rawPersonalShifts = allShifts.filter(s => s.militaryId === selectedMilitaryId);

    const cfo2Shifts = rawPersonalShifts
      .filter(s => s.type === 'Escala Diversa')
      .map(s => {
        let description = (s as any).description;
        if (!description) {
          const extraMatch = extraHours.find(eh =>
            eh.category === 'CFO II - Registro de Horas' &&
            eh.date.split('T')[0] === s.date.split('T')[0]
          );
          if (extraMatch) {
            description = stripGroupId(extraMatch.description.replace('Escala Diversa: ', ''));
          }
        }
        return {
          id: s.id,
          date: s.date,
          type: 'Escala Diversa',
          location: stripGroupId(s.location || ''),
          description: stripGroupId(description || ''),
          startTime: s.startTime || (s as any).start_time || '08:00',
          endTime: s.endTime || (s as any).end_time || '12:00',
          hours: calculateShiftHours(s) || 4
        };
      });

    const cfo2ExtraHours = extraHours
      .filter(eh => {
        if (eh.category !== 'CFO II - Registro de Horas') return false;
        const ehDate = eh.date.split('T')[0];
        return !cfo2Shifts.some(s => s.date.split('T')[0] === ehDate);
      })
      .map(eh => ({
        id: eh.id,
        date: eh.date,
        type: 'Escala Diversa',
        location: '',
        description: stripGroupId(eh.description.replace('Escala Diversa: ', '')),
        startTime: '08:00',
        endTime: '12:00',
        hours: Number(eh.hours || 0) + (Number(eh.minutes || 0) / 60)
      }));

    const cfo2List = [...cfo2Shifts, ...cfo2ExtraHours].sort((a, b) => b.date.localeCompare(a.date));
    const cfo2Total = cfo2List.reduce((sum, item) => sum + (item.hours || 0), 0);

    // 3. CFO II - Estado Maior
    const emList = extraHours
      .filter(e => e.category === 'Estado Maior')
      .map(e => {
        let emName = 'Estado Maior Indefinido';
        try {
          const meta = JSON.parse(e.description);
          emName = meta.estadoMaiorName || emName;
        } catch {
          if (e.description) {
            const matchEm = allEstadosMaiores.find(m => m.id === e.description);
            if (matchEm) emName = matchEm.name;
          }
        }
        const hours = Number(e.hours || 0) + (Number(e.minutes || 0) / 60);
        return {
          id: e.id,
          date: e.date || e.created_at,
          emName,
          hours,
          minutes: e.minutes || 0,
          description: e.description
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const emTotal = emList.reduce((sum, item) => sum + item.hours, 0);

    return {
      cfo1,
      cfo1Total,
      cfo2: cfo2List,
      cfo2Total,
      em: emList,
      emTotal
    };
  }, [selectedMilitaryId, extraHours, allShifts, allEstadosMaiores]);



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
              {data && data.todayItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.todayItems.map((s: any, idx: number) => {
                    const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                    return (
                      <div key={s.id || idx} className={`${colors.bg} rounded-2xl border-2 ${colors.border} p-5 relative overflow-hidden group hover:shadow-lg transition-all`}>
                        <div className="absolute top-0 right-0 p-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${colors.text} ${colors.bg.replace('bg-', 'bg-').split(' ')[0]} border ${colors.border}`}>Hoje</span>
                        </div>
                        <div className="flex flex-col">
                          {s.startTime && s.endTime && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`material-symbols-outlined ${colors.text} text-xl`}>schedule</span>
                              <span className={`text-xs font-bold ${colors.text} uppercase tracking-widest opacity-80`}>
                                {s.startTime} - {s.endTime}
                              </span>
                            </div>
                          )}
                          <h3 className={`text-lg font-extrabold ${colors.text} mb-2`}>{s.type}</h3>
                          {s.type === 'Escala Diversa' && s.description && (
                            <p className={`text-xs font-bold ${colors.text} opacity-80 mb-3 -mt-1`}>{stripGroupId(s.description)}</p>
                          )}
                          {s.location && (
                            <div className={`flex items-center gap-2 pt-3 border-t ${colors.border} opacity-60`}>
                              <span className={`material-symbols-outlined ${colors.text} text-sm`}>location_on</span>
                              <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-tighter truncate`}>{stripGroupId(s.location)}</span>
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
                {data && data.upcomingGroups.map((group, gIdx) => (
                  <div key={group.month}>
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{group.month}</span>
                    </div>
                    <div className="hidden sm:block">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.items.map((s, idx) => (
                            <ShiftRow key={s.id || idx} s={s} holidays={holidays} />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {group.items.map((s, idx) => (
                        <ShiftCard key={s.id || idx} s={s} holidays={holidays} />
                      ))}
                    </div>
                  </div>
                ))}

                {(!data || data.upcomingGroups.length === 0) && (
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
                            {discipline?.name || stripGroupId(cls.description)}
                          </span>
                          {cls.location && cls.description !== 'Liberação' && (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {stripGroupId(cls.location)}
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">history</span>
                  Carga Horária
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meses:</span>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {workloadSelectedMonths.length === 0 ? (
                        <span className="text-[10px] font-black text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">TODOS</span>
                      ) : (
                        workloadSelectedMonths.map(m => (
                          <span key={m} className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">
                            {months[m].label.substring(0, 3).toUpperCase()}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="relative group">
                    <button className="h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-slate-500 text-sm">filter_list</span>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Filtrar</span>
                    </button>

                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div className="grid grid-cols-2 gap-2">
                        {months.map((m, idx) => (
                          <button
                            key={m.value}
                            onClick={() => toggleWorkloadMonth(idx)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${workloadSelectedMonths.includes(idx)
                              ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-700'
                              }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {workloadSelectedMonths.length > 0 && (
                        <button
                          onClick={clearWorkloadFilters}
                          className="w-full mt-4 py-2 text-[10px] font-black text-rose-500 uppercase border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
                      {data && data.summary.map((item: any, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${SHIFT_TYPE_COLORS[item.type as any]?.dot || 'bg-primary'}`}></div>
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
                  {data && data.summary.map((item: any, index: number) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${SHIFT_TYPE_COLORS[item.type as any]?.dot || 'bg-primary'} shrink-0`}></div>
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
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-xl">progress_activity</span>
                  Progresso de Estágio
                </h2>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Cota: 140h</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Acumulado</p>
                      <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{data ? data.stats.totalStageHours.toFixed(1) : '0.0'}h <span className="text-sm text-slate-400">/ 140h</span></h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Porcentagem</p>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white">{data ? Math.min(100, (data.stats.totalStageHours / 140) * 100).toFixed(1) : '0.0'}%</h3>
                    </div>
                  </div>

                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-200 dark:border-slate-700">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      style={{ width: `${data ? Math.min(100, (data.stats.totalStageHours / 140) * 100) : 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                    <span className="material-symbols-outlined text-indigo-500 text-sm">info</span>
                    <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tight">
                      {data && data.stats.totalStageHours >= 140
                        ? "Parabéns! Requisito de estágio cumprido com sucesso."
                        : `Faltam ${data ? Math.max(0, 140 - data.stats.totalStageHours).toFixed(1) : '140.0'} horas para completar o requisito de 140h.`}
                    </p>
                  </div>
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

            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">military_tech</span>
                  Funções e Atribuições
                </h2>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <button
                    onClick={() => setActiveDetailsTab('funcoes')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                      activeDetailsTab === 'funcoes'
                        ? 'border-primary text-primary bg-white dark:bg-slate-900 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">school</span>
                    Função de Turma
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab('estados-maiores')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                      activeDetailsTab === 'estados-maiores'
                        ? 'border-primary text-primary bg-white dark:bg-slate-900 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">workspace_premium</span>
                    Estados Maiores
                  </button>
                  <button
                    onClick={() => setActiveDetailsTab('hora-extra')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                      activeDetailsTab === 'hora-extra'
                        ? 'border-primary text-primary bg-white dark:bg-slate-900 font-extrabold'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">more_time</span>
                    Hora Extra
                  </button>
                </div>

                <div className="p-4 sm:p-6">
                  {isLoadingAcademicDetails ? (
                    <div className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-slate-400 text-xs mt-2">Carregando detalhes...</p>
                    </div>
                  ) : activeDetailsTab === 'funcoes' ? (
                    <div className="space-y-6">
                      {/* Current active period class role assignment */}
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                          Período Atual ({getCurrentPeriodSemesterName() || 'Não Identificado'})
                        </h3>
                        {(() => {
                          const currentPeriod = getCurrentPeriodSemesterName();
                          const currentAssign = classRoles.find(r => r.semestreName === currentPeriod);
                          if (currentAssign) {
                            return (
                              <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20">
                                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                                  <span className="material-symbols-outlined text-xl">star</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-0.5">Função exercida</p>
                                  <p className="text-sm font-extrabold text-slate-800 dark:text-white uppercase leading-none">{currentAssign.role}</p>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-2 px-3 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 text-xs italic">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Nenhuma função de turma exercida no período atual.
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* History of class roles ("funções já exercidas") */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                          Funções já exercidas (Histórico)
                        </h3>
                        {classRoles.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                            Nenhum histórico de funções de turma registrado.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {classRoles.map(item => (
                              <div key={item.id} className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.semestreName}</p>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase">{item.role}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-350 dark:text-slate-650 text-lg">check_circle</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : activeDetailsTab === 'estados-maiores' ? (
                    /* General Staff / Estado Maior assigned */
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                        Estados Maiores Ativos
                      </h3>
                      {emAssignments.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="material-symbols-outlined text-4xl opacity-50 mb-2">folder_open</span>
                          <p>O militar não integra nenhum Estado Maior atualmente.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {emAssignments.map(item => (
                            <div key={item.id} className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-900/50 shrink-0">
                                <span className="material-symbols-outlined text-lg">groups</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">{item.emName}</h4>
                                  <span className="shrink-0 bg-indigo-50 dark:bg-indigo-955/35 text-indigo-600 dark:text-indigo-400 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                                    {item.role}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{item.emDescription || 'Sem descrição cadastrada.'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Hora Extra Tab */
                    <div className="space-y-8">
                      {/* Section 1: CFO I - Horas Extras */}
                      <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                              <span className="material-symbols-outlined text-amber-500 text-lg">star</span>
                              CFO I - Horas Extras
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium mt-0.5">Horas acumuladas provenientes do CFO I (Ranking)</p>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Somatório:</span>
                            <span className="text-base font-black font-mono">{extraHoursData.cfo1Total.toFixed(1)}h</span>
                          </div>
                        </div>

                        {extraHoursData.cfo1.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            Nenhum registro de horas extras do CFO I encontrado.
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Categoria</th>
                                    <th className="px-4 py-3">Observação / Detalhes</th>
                                    <th className="px-4 py-3 text-right">Horas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                  {extraHoursData.cfo1.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                        {safeParseISO(r.date || r.created_at).toLocaleDateString('pt-BR')}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-extrabold border border-amber-200 dark:border-amber-800">
                                          {r.category}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {stripGroupId(r.description) || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black font-mono text-slate-800 dark:text-slate-200">
                                        {r.hours}h {r.minutes > 0 ? `${r.minutes}m` : ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                              {extraHoursData.cfo1.map(r => (
                                <div key={r.id} className="p-3.5 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-extrabold border border-amber-200 dark:border-amber-800">
                                      {r.category}
                                    </span>
                                    <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">
                                      {r.hours}h {r.minutes > 0 ? `${r.minutes}m` : ''}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Data: {safeParseISO(r.date || r.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                  {r.description && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                      {stripGroupId(r.description)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 2: CFO II - Horas Extras */}
                      <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-lg">event_repeat</span>
                              CFO II - Horas Extras
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium mt-0.5">Empenhos extras registrados como Escala Diversa (Calendário e Registro de Horas)</p>
                          </div>
                          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Somatório:</span>
                            <span className="text-base font-black font-mono">{extraHoursData.cfo2Total.toFixed(1)}h</span>
                          </div>
                        </div>

                        {extraHoursData.cfo2.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            Nenhum empenho extra de Escala Diversa encontrado.
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Tipo / Descrição</th>
                                    <th className="px-4 py-3">Horário</th>
                                    <th className="px-4 py-3 text-right">Carga Horária</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                  {extraHoursData.cfo2.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                        {safeParseISO(item.date).toLocaleDateString('pt-BR')}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">Escala Diversa</span>
                                          {(item.location || item.description) && (
                                            <span className="text-[10px] text-slate-500 font-medium">{item.location || item.description}</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 font-medium">
                                        {item.startTime} - {item.endTime}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black font-mono text-slate-800 dark:text-slate-200">
                                        {item.hours.toFixed(1)}h
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                              {extraHoursData.cfo2.map(item => (
                                <div key={item.id} className="p-3.5 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-black text-xs text-slate-800 dark:text-white uppercase">Escala Diversa</span>
                                    <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">{item.hours.toFixed(1)}h</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Data: {safeParseISO(item.date).toLocaleDateString('pt-BR')} ({item.startTime} - {item.endTime})
                                  </p>
                                  {(item.location || item.description) && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                      {item.location || item.description}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 3: CFO II - Estado Maior */}
                      <div className="bg-slate-50/50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                          <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                              <span className="material-symbols-outlined text-indigo-500 text-lg">workspace_premium</span>
                              CFO II - Estado Maior
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium mt-0.5">Horas extras provenientes de participações em Estado Maior (Estado Maior - Horas)</p>
                          </div>
                          <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Somatório:</span>
                            <span className="text-base font-black font-mono">{extraHoursData.emTotal.toFixed(1)}h</span>
                          </div>
                        </div>

                        {extraHoursData.em.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                            Nenhuma participação em Estado Maior registrada.
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                  <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Estado Maior</th>
                                    <th className="px-4 py-3 text-right">Horas Lançadas</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                  {extraHoursData.em.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                        {safeParseISO(item.date).toLocaleDateString('pt-BR')}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                                        {item.emName}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black font-mono text-slate-800 dark:text-slate-200">
                                        {item.hours.toFixed(1)}h
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                              {extraHoursData.em.map(item => (
                                <div key={item.id} className="p-3.5 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{item.emName}</span>
                                    <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">{item.hours.toFixed(1)}h</span>
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                                    Data: {safeParseISO(item.date).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

              {(!data || data.pastGroups.length === 0) ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-sm text-slate-500 font-medium">Nenhum serviço anterior registrado.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {data.pastGroups.map((group, gIdx) => (
                    <div key={group.month}>
                      <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2 border-y border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{group.month}</span>
                      </div>
                      <div className="hidden sm:block">
                        <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {group.items.map((s, idx) => (
                              <ShiftRow key={s.id || idx} s={s} holidays={holidays} />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {group.items.map((s, idx) => (
                          <ShiftCard key={s.id || idx} s={s} holidays={holidays} />
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
                <span className="text-4xl font-extrabold text-white tracking-tighter">{data ? data.stats.totalWorkload.toFixed(1) : '0.0'}</span>
                <span className="text-sm font-bold text-white/80">HRS</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight">
                  <span>Serviços:</span>
                  <span>{data ? data.stats.totalShiftHours.toFixed(1) : '0.0'}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight">
                  <span>Reg. Horas:</span>
                  <span>{data ? data.stats.totalExtraHours.toFixed(1) : '0.0'}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-white/70 font-bold uppercase tracking-tight pt-2 border-t border-white/10">
                  <span>Outros Serviços:</span>
                  <span>{data ? data.stats.activeOtherServices : '0'} Un</span>
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
