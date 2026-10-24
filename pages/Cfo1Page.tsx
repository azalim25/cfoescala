import React, { useMemo, useRef, useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { useCfo1 } from '../contexts/Cfo1Context';
import { Cfo1ActivityTemplate, Cfo1Calendar, Cfo1ScheduleCard, Cfo1Uniform, CFO1_UNIFORMS } from '../types';
import { formatShortDate, getWeekday, safeParseISO } from '../utils/dateUtils';

// Semana Zero do CFO (Aspirantes 2029): 15 a 19/02/2027.
const SEMANA_ZERO_DATES = ['2027-02-15', '2027-02-16', '2027-02-17', '2027-02-18', '2027-02-19'];

const DAY_MINUTES = 24 * 60;
const SLOT_MINUTES = 30;
const PX_PER_MIN = 1.2; // 72px por hora

const CALENDAR_LABELS: Record<Cfo1Calendar, string> = {
  main: 'Calendário Principal',
  b4: 'B4 - Auxiliares'
};

const minutesToTime = (mins: number): string => {
  const clamped = Math.max(0, Math.min(DAY_MINUTES - 1, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const snapToSlot = (mins: number): number => {
  const snapped = Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES;
  return Math.max(0, Math.min(DAY_MINUTES - SLOT_MINUTES, snapped));
};

const cardEndMinutes = (card: Cfo1ScheduleCard) => timeToMinutes(card.startTime) + card.durationMinutes;

const formatHoursMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
};

const cardsOverlap = (a: Cfo1ScheduleCard, b: Cfo1ScheduleCard) => {
  const aStart = timeToMinutes(a.startTime);
  const bStart = timeToMinutes(b.startTime);
  return aStart < cardEndMinutes(b) && bStart < cardEndMinutes(a);
};

interface CardLayout { lane: number; totalLanes: number; }

// Cards que se sobrepõem no tempo ganham colunas lado a lado (como num
// calendário comum), em vez de ficarem empilhados escondendo um ao outro —
// é exatamente o que precisa aparecer na tela para o conflito ser corrigido.
const layoutDayCards = (cards: Cfo1ScheduleCard[]): Map<string, CardLayout> => {
  const result = new Map<string, CardLayout>();
  const sorted = [...cards].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  let clusterCards: Cfo1ScheduleCard[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (clusterCards.length === 0) return;
    const laneEndTimes: number[] = [];
    const laneOf = new Map<string, number>();
    clusterCards.forEach(card => {
      const start = timeToMinutes(card.startTime);
      const end = cardEndMinutes(card);
      let lane = laneEndTimes.findIndex(e => e <= start);
      if (lane === -1) {
        lane = laneEndTimes.length;
        laneEndTimes.push(end);
      } else {
        laneEndTimes[lane] = end;
      }
      laneOf.set(card.id, lane);
    });
    const totalLanes = laneEndTimes.length;
    clusterCards.forEach(card => {
      result.set(card.id, { lane: laneOf.get(card.id)!, totalLanes });
    });
    clusterCards = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach(card => {
    const start = timeToMinutes(card.startTime);
    if (clusterCards.length > 0 && start >= clusterEnd) {
      flushCluster();
    }
    clusterCards.push(card);
    clusterEnd = Math.max(clusterEnd, cardEndMinutes(card));
  });
  flushCluster();

  return result;
};

interface DragPayload {
  kind: 'new-activity' | 'new-military' | 'move-card';
  templateId?: string;
  militaryId?: string;
  cardId?: string;
}

const Cfo1Page: React.FC = () => {
  const { hasCfo1Access } = useAuth();
  const { militaries } = useMilitary();
  const {
    activityTemplates, scheduleCards, isLoading,
    addActivityTemplate, updateActivityTemplate, removeActivityTemplate,
    addScheduleCard, updateScheduleCard, removeScheduleCard
  } = useCfo1();

  const [activeCalendar, setActiveCalendar] = useState<Cfo1Calendar>('main');
  const [activeTab, setActiveTab] = useState<'activities' | 'militaries'>('activities');
  const [newActivity, setNewActivity] = useState({ name: '', duration: 30, description: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState({ name: '', duration: 30, description: '' });
  const [editingCard, setEditingCard] = useState<Cfo1ScheduleCard | null>(null);
  const [cardDraft, setCardDraft] = useState<{ title: string; duration: number; description: string; uniform: Cfo1Uniform | '' }>({ title: '', duration: 30, description: '', uniform: '' });
  const [dragHover, setDragHover] = useState<{ date: string; minutes: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6 * 60 * PX_PER_MIN;
  }, []);

  const sortedMilitaries = useMemo(() => {
    return [...militaries].sort((a, b) => {
      const aAnt = a.antiguidade ?? 999999;
      const bAnt = b.antiguidade ?? 999999;
      if (aAnt !== bAnt) return aAnt - bAnt;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [militaries]);

  const visibleTemplates = useMemo(
    () => activityTemplates.filter(t => t.calendar === activeCalendar),
    [activityTemplates, activeCalendar]
  );

  // Cards de todos os calendários juntos — usado só para detectar conflito
  // de militar (que precisa valer entre o Principal e o B4) e para listar
  // conflitos de atividade por calendário.
  const cardsByDateAll = useMemo(() => {
    const map: Record<string, Cfo1ScheduleCard[]> = {};
    SEMANA_ZERO_DATES.forEach(d => { map[d] = []; });
    scheduleCards.forEach(c => {
      if (map[c.date]) map[c.date].push(c);
    });
    return map;
  }, [scheduleCards]);

  // Cards só do calendário atualmente visível — é com base nisso que a
  // grade, o layout de colunas e o encaixe dentro de atividades funcionam.
  const cardsByDate = useMemo(() => {
    const map: Record<string, Cfo1ScheduleCard[]> = {};
    SEMANA_ZERO_DATES.forEach(d => {
      map[d] = (cardsByDateAll[d] || []).filter(c => c.calendar === activeCalendar);
    });
    return map;
  }, [cardsByDateAll, activeCalendar]);

  // Cards de militar encaixados dentro de uma atividade não ocupam coluna
  // própria na grade — só os cards "de primeiro nível" (atividades e
  // militares avulsos) entram no layout de colunas lado a lado.
  const topLevelCardsByDate = useMemo(() => {
    const map: Record<string, Cfo1ScheduleCard[]> = {};
    SEMANA_ZERO_DATES.forEach(d => {
      map[d] = (cardsByDate[d] || []).filter(c => !(c.cardType === 'military' && c.linkedActivityCardId));
    });
    return map;
  }, [cardsByDate]);

  const linkedCardsByActivityId = useMemo(() => {
    const map: Record<string, Cfo1ScheduleCard[]> = {};
    scheduleCards.forEach(c => {
      if (c.calendar === activeCalendar && c.cardType === 'military' && c.linkedActivityCardId) {
        if (!map[c.linkedActivityCardId]) map[c.linkedActivityCardId] = [];
        map[c.linkedActivityCardId].push(c);
      }
    });
    return map;
  }, [scheduleCards, activeCalendar]);

  const findActivityAt = (date: string, mins: number): Cfo1ScheduleCard | undefined => {
    return (cardsByDate[date] || []).find(c =>
      c.cardType === 'activity' &&
      timeToMinutes(c.startTime) <= mins &&
      mins < cardEndMinutes(c)
    );
  };

  const { conflictIds, conflictMessages } = useMemo(() => {
    const ids = new Set<string>();
    const messages: string[] = [];
    const calendars: Cfo1Calendar[] = ['main', 'b4'];

    SEMANA_ZERO_DATES.forEach(date => {
      const dayCards = cardsByDateAll[date] || [];

      // Conflito de atividade: só conta dentro do mesmo calendário — uma
      // sub-equipe pode estar na Logística (B4) enquanto o grupo principal
      // faz outra coisa ao mesmo tempo, isso não é conflito.
      calendars.forEach(cal => {
        const activities = dayCards.filter(c => c.calendar === cal && c.cardType === 'activity');
        for (let i = 0; i < activities.length; i++) {
          for (let j = i + 1; j < activities.length; j++) {
            if (cardsOverlap(activities[i], activities[j])) {
              ids.add(activities[i].id);
              ids.add(activities[j].id);
              messages.push(`${formatShortDate(date)} (${CALENDAR_LABELS[cal]}): as atividades "${activities[i].title || 'Sem título'}" (${activities[i].startTime}) e "${activities[j].title || 'Sem título'}" (${activities[j].startTime}) se sobrepõem.`);
            }
          }
        }
      });

      // Conflito de militar: verificado somando os dois calendários — um
      // militar não pode estar escalado em dois lugares ao mesmo tempo,
      // esteja a atividade no Principal ou no B4.
      const byMilitary: Record<string, Cfo1ScheduleCard[]> = {};
      dayCards.filter(c => c.cardType === 'military' && c.militaryId).forEach(c => {
        const key = c.militaryId as string;
        if (!byMilitary[key]) byMilitary[key] = [];
        byMilitary[key].push(c);
      });
      Object.entries(byMilitary).forEach(([milId, milCards]) => {
        for (let i = 0; i < milCards.length; i++) {
          for (let j = i + 1; j < milCards.length; j++) {
            if (cardsOverlap(milCards[i], milCards[j])) {
              ids.add(milCards[i].id);
              ids.add(milCards[j].id);
              const mil = militaries.find(m => m.id === milId);
              const crossCalendar = milCards[i].calendar !== milCards[j].calendar;
              const calendarNote = crossCalendar
                ? ` (${CALENDAR_LABELS[milCards[i].calendar]} e ${CALENDAR_LABELS[milCards[j].calendar]})`
                : '';
              messages.push(`${formatShortDate(date)}: ${mil ? `${mil.rank} ${mil.name}` : 'Militar'} está escalado em dois horários sobrepostos${calendarNote} (${milCards[i].startTime} e ${milCards[j].startTime}).`);
            }
          }
        }
      });
    });

    return { conflictIds: ids, conflictMessages: messages };
  }, [cardsByDateAll, militaries]);

  const cardLayoutsByDate = useMemo(() => {
    const map: Record<string, Map<string, CardLayout>> = {};
    SEMANA_ZERO_DATES.forEach(date => {
      map[date] = layoutDayCards(topLevelCardsByDate[date] || []);
    });
    return map;
  }, [topLevelCardsByDate]);

  const hoursWorkedByMilitary = useMemo(() => {
    const totals: Record<string, number> = {};
    scheduleCards.forEach(card => {
      if (card.cardType === 'military' && card.militaryId) {
        totals[card.militaryId] = (totals[card.militaryId] || 0) + card.durationMinutes;
      }
    });
    return totals;
  }, [scheduleCards]);

  // --- Drag & drop ---

  const handleTemplateDragStart = (e: React.DragEvent, template: Cfo1ActivityTemplate) => {
    const payload: DragPayload = { kind: 'new-activity', templateId: template.id };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMilitaryDragStart = (e: React.DragEvent, militaryId: string) => {
    const payload: DragPayload = { kind: 'new-military', militaryId };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCardDragStart = (e: React.DragEvent, card: Cfo1ScheduleCard) => {
    e.stopPropagation();
    const payload: DragPayload = { kind: 'move-card', cardId: card.id };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, date: string) => {
    if (!hasCfo1Access) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const mins = snapToSlot(offsetY / PX_PER_MIN);
    setDragHover({ date, minutes: mins });
  };

  const handleColumnDragLeave = () => setDragHover(null);

  const handleColumnDrop = async (e: React.DragEvent, date: string) => {
    if (!hasCfo1Access) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const mins = snapToSlot(offsetY / PX_PER_MIN);
    const startTime = minutesToTime(mins);
    setDragHover(null);
    if (!raw) return;

    let payload: DragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (payload.kind === 'new-activity' && payload.templateId) {
      const template = activityTemplates.find(t => t.id === payload.templateId);
      if (!template) return;
      await addScheduleCard({
        calendar: activeCalendar,
        cardType: 'activity',
        activityTemplateId: template.id,
        title: template.name,
        durationMinutes: template.defaultDurationMinutes,
        description: template.defaultDescription || '',
        date,
        startTime
      });
    } else if (payload.kind === 'new-military' && payload.militaryId) {
      // Soltar um militar em cima de uma atividade já encaixa-o dentro dela
      // (mesmo dia/horário), em vez de criar um card avulso na grade.
      const hostActivity = findActivityAt(date, mins);
      if (hostActivity) {
        await addScheduleCard({
          calendar: activeCalendar,
          cardType: 'military',
          militaryId: payload.militaryId,
          durationMinutes: hostActivity.durationMinutes,
          description: '',
          date: hostActivity.date,
          startTime: hostActivity.startTime,
          linkedActivityCardId: hostActivity.id
        });
      } else {
        await addScheduleCard({
          calendar: activeCalendar,
          cardType: 'military',
          militaryId: payload.militaryId,
          durationMinutes: SLOT_MINUTES,
          description: '',
          date,
          startTime,
          linkedActivityCardId: null
        });
      }
    } else if (payload.kind === 'move-card' && payload.cardId) {
      const movingCard = scheduleCards.find(c => c.id === payload.cardId);
      if (!movingCard) return;

      if (movingCard.cardType === 'activity') {
        await updateScheduleCard(movingCard.id, { date, startTime });
        // Os militares encaixados nessa atividade acompanham o novo horário.
        const children = linkedCardsByActivityId[movingCard.id] || [];
        for (const child of children) {
          await updateScheduleCard(child.id, { date, startTime });
        }
      } else {
        const hostActivity = findActivityAt(date, mins);
        if (hostActivity) {
          await updateScheduleCard(movingCard.id, {
            date: hostActivity.date,
            startTime: hostActivity.startTime,
            durationMinutes: movingCard.linkedActivityCardId === hostActivity.id ? movingCard.durationMinutes : hostActivity.durationMinutes,
            linkedActivityCardId: hostActivity.id
          });
        } else {
          await updateScheduleCard(movingCard.id, { date, startTime, linkedActivityCardId: null });
        }
      }
    }
  };

  // --- Template CRUD ---

  const handleCreateTemplate = async () => {
    if (!newActivity.name.trim()) return;
    await addActivityTemplate({
      calendar: activeCalendar,
      name: newActivity.name.trim(),
      defaultDurationMinutes: newActivity.duration || 30,
      defaultDescription: newActivity.description.trim()
    });
    setNewActivity({ name: '', duration: 30, description: '' });
  };

  const startEditTemplate = (template: Cfo1ActivityTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateDraft({ name: template.name, duration: template.defaultDurationMinutes, description: template.defaultDescription || '' });
  };

  const saveTemplateEdit = async () => {
    if (!editingTemplateId) return;
    await updateActivityTemplate(editingTemplateId, {
      name: templateDraft.name.trim() || 'Sem nome',
      defaultDurationMinutes: templateDraft.duration || 30,
      defaultDescription: templateDraft.description.trim()
    });
    setEditingTemplateId(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Remover esta atividade da lista? Cards já encaixados no calendário não serão afetados.')) {
      await removeActivityTemplate(id);
    }
  };

  // --- Placed card edit ---

  const openCardEditor = (card: Cfo1ScheduleCard) => {
    setEditingCard(card);
    setCardDraft({
      title: card.title || '',
      duration: card.durationMinutes,
      description: card.description || '',
      uniform: card.uniform || ''
    });
  };

  const saveCardEdit = async () => {
    if (!editingCard) return;
    const updates: Partial<Cfo1ScheduleCard> = {
      durationMinutes: cardDraft.duration || 30,
      description: cardDraft.description
    };
    if (editingCard.cardType === 'activity') {
      updates.title = cardDraft.title.trim() || 'Sem título';
    } else {
      updates.uniform = cardDraft.uniform || null;
    }
    await updateScheduleCard(editingCard.id, updates);
    setEditingCard(null);
  };

  const handleDeleteCard = async () => {
    if (!editingCard) return;
    await removeScheduleCard(editingCard.id);
    setEditingCard(null);
  };

  const hourMarks = Array.from({ length: 24 }, (_, h) => h);

  return (
    <MainLayout activePage="cfo1">
      <MainLayout.Content>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">CFO I — Semana Zero</h2>
              <p className="text-xs text-slate-500 font-medium">
                Turma Guarani (Aspirantes 2029) · 15 a 19/02/2027 · {CALENDAR_LABELS[activeCalendar]}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
            <span className="material-symbols-outlined text-sm">lock</span>
            Acesso restrito
          </span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {(['main', 'b4'] as Cfo1Calendar[]).map(cal => (
            <button
              key={cal}
              onClick={() => setActiveCalendar(cal)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${activeCalendar === cal
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-primary'
                }`}
            >
              {CALENDAR_LABELS[cal]}
            </button>
          ))}
        </div>

        {conflictMessages.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4 space-y-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg">warning</span>
              {conflictMessages.length} conflito(s) de horário encontrado(s)
            </div>
            <ul className="space-y-1">
              {conflictMessages.map((msg, i) => (
                <li key={i} className="text-xs text-red-600 dark:text-red-300 font-medium pl-1">• {msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div ref={scrollRef} className="overflow-auto max-h-[75vh]">
            <div className="flex" style={{ minWidth: 80 + SEMANA_ZERO_DATES.length * 220 }}>
              {/* Time ruler */}
              <div className="w-20 shrink-0 sticky left-0 bg-white dark:bg-slate-900 z-20 border-r border-slate-100 dark:border-slate-800">
                <div className="h-12 sticky top-0 bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-800"></div>
                {hourMarks.map(h => (
                  <div key={h} style={{ height: 60 * PX_PER_MIN }} className="relative border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 pl-2 pt-1">
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {SEMANA_ZERO_DATES.map(date => {
                const dayCards = topLevelCardsByDate[date] || [];
                return (
                  <div key={date} className="flex-1 min-w-[220px] border-r last:border-r-0 border-slate-100 dark:border-slate-800">
                    <div className="h-12 sticky top-0 bg-white dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getWeekday(date, 'short')}</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{formatShortDate(date)}</span>
                    </div>
                    <div
                      className="relative"
                      style={{ height: DAY_MINUTES * PX_PER_MIN }}
                      onDragOver={(e) => handleColumnDragOver(e, date)}
                      onDragLeave={handleColumnDragLeave}
                      onDrop={(e) => handleColumnDrop(e, date)}
                    >
                      {hourMarks.map(h => (
                        <div key={h} style={{ height: 60 * PX_PER_MIN }} className="border-t border-slate-100 dark:border-slate-800/70">
                          <div style={{ height: 30 * PX_PER_MIN }} className="border-b border-dashed border-slate-50 dark:border-slate-800/40"></div>
                        </div>
                      ))}

                      {dragHover && dragHover.date === date && (
                        <div
                          className="absolute left-0 right-0 border-t-2 border-primary pointer-events-none z-10"
                          style={{ top: dragHover.minutes * PX_PER_MIN }}
                        >
                          <span className="absolute -top-2.5 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            {minutesToTime(dragHover.minutes)}
                          </span>
                        </div>
                      )}

                      {dayCards.map(card => {
                        const isConflict = conflictIds.has(card.id);
                        const top = timeToMinutes(card.startTime) * PX_PER_MIN;
                        const military = card.cardType === 'military' ? militaries.find(m => m.id === card.militaryId) : null;
                        const isActivity = card.cardType === 'activity';
                        const layout = cardLayoutsByDate[date]?.get(card.id) || { lane: 0, totalLanes: 1 };
                        const widthPct = 100 / layout.totalLanes;
                        const leftPct = layout.lane * widthPct;
                        const linkedMilitaries = isActivity ? (linkedCardsByActivityId[card.id] || []) : [];
                        const chipRows = linkedMilitaries.length > 0 ? Math.ceil(linkedMilitaries.length / 6) : 0;
                        const contentHeight = 34 + chipRows * 18 + 6;
                        const height = Math.max(24, card.durationMinutes * PX_PER_MIN, isActivity ? contentHeight : 0);

                        return (
                          <div
                            key={card.id}
                            role="button"
                            tabIndex={hasCfo1Access ? 0 : -1}
                            draggable={hasCfo1Access}
                            onDragStart={(e) => handleCardDragStart(e, card)}
                            onClick={() => hasCfo1Access && openCardEditor(card)}
                            onKeyDown={(e) => { if (hasCfo1Access && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCardEditor(card); } }}
                            className={`absolute rounded-lg border px-2 py-1 text-left overflow-hidden shadow-sm transition-all ${hasCfo1Access ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'} ${isConflict
                              ? 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600 ring-2 ring-red-400/50'
                              : isActivity
                                ? 'bg-primary/10 border-primary/30'
                                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                              }`}
                            style={{ top, height, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)`, zIndex: isConflict ? 7 : 5 }}
                          >
                            <div className="flex items-start gap-1">
                              {isConflict && <span className="material-symbols-outlined text-red-500 text-sm leading-none">warning</span>}
                              {!isActivity && <Avatar seed={card.militaryId || ''} size={16} fallback="none" />}
                              <span className={`text-[10px] font-black truncate ${isConflict ? 'text-red-700 dark:text-red-300' : isActivity ? 'text-primary' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                {isActivity ? (card.title || 'Sem título') : (military ? `${military.rank} ${military.name}` : 'Militar')}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                              {card.startTime} – {minutesToTime(cardEndMinutes(card))}
                            </span>
                            {!isActivity && card.uniform && (
                              <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-300">
                                Fardamento: {card.uniform}
                              </p>
                            )}
                            {card.description && (isActivity ? height > 44 : true) && (
                              <p className={`text-[9px] truncate ${isActivity ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-600 dark:text-emerald-400 font-bold italic'}`}>
                                {isActivity ? card.description : `→ ${card.description}`}
                              </p>
                            )}
                            {isActivity && linkedMilitaries.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                                {linkedMilitaries.map(mc => {
                                  const mcMil = militaries.find(m => m.id === mc.militaryId);
                                  const mcConflict = conflictIds.has(mc.id);
                                  return (
                                    <button
                                      key={mc.id}
                                      type="button"
                                      draggable={false}
                                      onClick={(e) => { e.stopPropagation(); if (hasCfo1Access) openCardEditor(mc); }}
                                      title={mcMil ? `${mcMil.rank} ${mcMil.name}${mc.uniform ? ' — ' + mc.uniform : ''}${mc.description ? ' — ' + mc.description : ''}` : 'Militar'}
                                      className={`flex items-center justify-center rounded-full border transition-all ${mcConflict
                                        ? 'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600 ring-1 ring-red-400'
                                        : 'bg-white/80 dark:bg-slate-900/50 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500'
                                        }`}
                                      style={{ width: 18, height: 18 }}
                                    >
                                      <Avatar seed={mc.militaryId || ''} size={14} fallback="none" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-lg">schedule</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Horas Trabalhadas</h3>
              <p className="text-[10px] text-slate-500 font-medium">Total encaixado por militar na Semana Zero (Principal + B4)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Militar</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {sortedMilitaries.map(mil => {
                  const totalMinutes = hoursWorkedByMilitary[mil.id] || 0;
                  return (
                    <tr key={mil.id} className="border-t border-slate-50 dark:border-slate-800">
                      <td className="px-4 py-2 flex items-center gap-2">
                        <Avatar seed={mil.id} size={22} fallback="none" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{mil.rank} {mil.name}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-black ${totalMinutes > 0 ? 'text-primary' : 'text-slate-300 dark:text-slate-700'}`}>
                          {totalMinutes > 0 ? formatHoursMinutes(totalMinutes) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'activities' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Atividades
            </button>
            <button
              onClick={() => setActiveTab('militaries')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'militaries' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Militares
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
            {activeTab === 'activities' ? (
              <>
                <p className="text-[9px] font-bold text-primary uppercase tracking-widest pl-1">
                  {CALENDAR_LABELS[activeCalendar]}
                </p>

                {hasCfo1Access && (
                  <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Nome da atividade"
                      value={newActivity.name}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={newActivity.duration}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                        className="w-20 h-9 px-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs font-bold"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">minutos (padrão)</span>
                    </div>
                    <textarea
                      placeholder="Descrição (opcional)"
                      value={newActivity.description}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs resize-none"
                    />
                    <button
                      onClick={handleCreateTemplate}
                      className="w-full h-9 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Adicionar atividade
                    </button>
                  </div>
                )}

                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Arraste um card para o calendário
                </p>

                {visibleTemplates.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6">Nenhuma atividade cadastrada ainda.</p>
                )}

                {visibleTemplates.map(template => (
                  <div key={template.id}>
                    {editingTemplateId === template.id ? (
                      <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-primary/30">
                        <input
                          type="text"
                          value={templateDraft.name}
                          onChange={(e) => setTemplateDraft(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full h-8 px-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs font-bold"
                        />
                        <input
                          type="number"
                          min={5}
                          step={5}
                          value={templateDraft.duration}
                          onChange={(e) => setTemplateDraft(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                          className="w-20 h-8 px-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs font-bold"
                        />
                        <textarea
                          value={templateDraft.description}
                          onChange={(e) => setTemplateDraft(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-xs resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveTemplateEdit} className="flex-1 h-8 bg-primary text-white rounded-lg text-[10px] font-black uppercase">Salvar</button>
                          <button onClick={() => setEditingTemplateId(null)} className="flex-1 h-8 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        draggable={hasCfo1Access}
                        onDragStart={(e) => handleTemplateDragStart(e, template)}
                        className={`p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start justify-between gap-2 ${hasCfo1Access ? 'cursor-grab active:cursor-grabbing hover:bg-primary/10' : ''} transition-all`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-primary truncate">{template.name}</p>
                          <p className="text-[10px] font-bold text-slate-500">{template.defaultDurationMinutes} min</p>
                          {template.defaultDescription && (
                            <p className="text-[10px] text-slate-400 truncate">{template.defaultDescription}</p>
                          )}
                        </div>
                        {hasCfo1Access && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEditTemplate(template)} className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-primary flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              <span className="material-symbols-outlined text-xs">edit</span>
                            </button>
                            <button onClick={() => handleDeleteTemplate(template.id)} className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Arraste um militar para o calendário ({CALENDAR_LABELS[activeCalendar]}, pode repetir)
                </p>
                {sortedMilitaries.map(mil => (
                  <div
                    key={mil.id}
                    draggable={hasCfo1Access}
                    onDragStart={(e) => handleMilitaryDragStart(e, mil.id)}
                    className={`p-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 ${hasCfo1Access ? 'cursor-grab active:cursor-grabbing hover:bg-emerald-100 dark:hover:bg-emerald-900/20' : ''} transition-all`}
                  >
                    <Avatar seed={mil.id} size={28} fallback="none" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{mil.rank} {mil.name}</p>
                      <p className="text-[9px] text-slate-400">{mil.firefighterNumber}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </MainLayout.Sidebar>

      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingCard(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_calendar</span>
                {editingCard.cardType === 'activity' ? 'Editar Atividade' : 'Editar Militar'}
              </h3>
              <button onClick={() => setEditingCard(null)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {formatShortDate(editingCard.date)} · {editingCard.startTime} · {CALENDAR_LABELS[editingCard.calendar]}
              </p>

              {editingCard.cardType === 'activity' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Atividade</label>
                  <input
                    type="text"
                    value={cardDraft.title}
                    onChange={(e) => setCardDraft(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm font-bold"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <Avatar seed={editingCard.militaryId || ''} size={28} fallback="none" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const mil = militaries.find(m => m.id === editingCard.militaryId);
                      return mil ? `${mil.rank} ${mil.name}` : 'Militar';
                    })()}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Duração (minutos)</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={cardDraft.duration}
                  onChange={(e) => setCardDraft(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                  className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm font-bold"
                />
              </div>

              {editingCard.cardType === 'military' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fardamento</label>
                  <select
                    value={cardDraft.uniform}
                    onChange={(e) => setCardDraft(prev => ({ ...prev, uniform: e.target.value as Cfo1Uniform | '' }))}
                    className="w-full h-10 px-3 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm font-bold"
                  >
                    <option value="">— Não definido —</option>
                    {CFO1_UNIFORMS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  {editingCard.cardType === 'military' ? 'O que vai fazer' : 'Descrição'}
                </label>
                <textarea
                  value={cardDraft.description}
                  onChange={(e) => setCardDraft(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder={editingCard.cardType === 'military' ? 'Ex: Apoio na recepção dos calouros' : ''}
                  className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-primary text-sm resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={saveCardEdit} className="flex-1 h-10 bg-primary text-white rounded-lg font-bold text-sm">Salvar</button>
                <button onClick={handleDeleteCard} className="h-10 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold text-sm border border-red-200 dark:border-red-800">Remover</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Cfo1Page;
