import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Military, Shift } from '../types';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { safeParseISO } from '../utils/dateUtils';
import { SHIFT_TYPE_COLORS, SHIFT_TYPE_PRIORITY } from '../constants';
import { generateAIScale } from '../geminiService';

const GenerateScalePage: React.FC = () => {
    const navigate = useNavigate();
    const { militaries } = useMilitary();
    const { addShifts, preferences, shifts, holidays } = useShift();
    const { isModerator } = useAuth();

    // Time State
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Mode State
    const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Draft State (The proposed schedule)
    const [draftShifts, setDraftShifts] = useState<Shift[]>([]);

    // Edit Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDay, setEditingDay] = useState<number | null>(null);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null); // If editing specific shift
    const [formData, setFormData] = useState<Partial<Shift> & { manualHours?: number, manualMinutes?: number }>({
        type: 'Escala Geral',
        location: 'QCG',
        manualHours: 0,
        manualMinutes: 0,
        startTime: '08:00',
        endTime: '08:00'
    });
    const [extraHours, setExtraHours] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);

    // Confirm Modal State
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; onCancel?: () => void }>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => { },
        onCancel: undefined
    });

    useEffect(() => {
        // Automatically load existing shifts for the selected month/year into the draft
        const existingShifts = shifts.filter(s => {
            const shiftDate = new Date(s.date + 'T12:00:00');
            return shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear;
        });
        setDraftShifts(existingShifts);
    }, [currentMonth, currentYear, shifts]);

    useEffect(() => {
        const fetchData = async () => {
            const [{ data: extraData }, { data: stageData }] = await Promise.all([
                supabase.from('extra_hours').select('*'),
                supabase.from('stages').select('*')
            ]);
            if (extraData) setExtraHours(extraData);
            if (stageData) setStages(stageData);
        };
        fetchData();
    }, []);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    // --- Generation Logic ---

    const handleGenerate = async () => {
        const executeGeneration = async (keepExisting: boolean = false) => {
            setIsGenerating(true);
            const existingDraft = keepExisting ? draftShifts : [];

            if (!keepExisting) {
                setDraftShifts([]);
            }

            // Calculate historical stats for balance
            const historicalStats: Record<string, any> = {};
            militaries.forEach(mil => {
                let totalHours = 0;
                let lastCmdGuarda = '';
                let lastEstagio = '';

                // Calculate hours from existing shifts
                shifts.forEach(s => {
                    if (s.militaryId !== mil.id) return;

                    const date = safeParseISO(s.date);
                    const dayOfWeek = date.getDay();

                    if (s.duration) {
                        totalHours += s.duration;
                    } else if (s.type === 'Comandante da Guarda') {
                        if (dayOfWeek >= 1 && dayOfWeek <= 5) totalHours += 11;
                        else totalHours += 24;
                    } else if (s.type === 'Estágio') {
                        if (dayOfWeek === 6) totalHours += 24;
                        else if (dayOfWeek === 0) totalHours += 12;
                    }

                    // Track last service dates
                    if (s.type === 'Comandante da Guarda') {
                        if (!lastCmdGuarda || s.date > lastCmdGuarda) lastCmdGuarda = s.date;
                    } else if (s.type === 'Estágio') {
                        if (!lastEstagio || s.date > lastEstagio) lastEstagio = s.date;
                    }
                });

                // Add extra hours
                extraHours.filter(e => e.military_id === mil.id).forEach(e => {
                    totalHours += e.hours + (e.minutes / 60 || 0);
                });

                // Add standalone stages
                stages.filter(st =>
                    st.military_id === mil.id &&
                    !shifts.some(sh => sh.militaryId === st.military_id && sh.date === st.date && sh.type === 'Estágio')
                ).forEach(st => {
                    const date = safeParseISO(st.date);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek === 6) totalHours += 24;
                    else if (dayOfWeek === 0) totalHours += 12;
                    else totalHours += 12;
                });

                historicalStats[mil.id] = {
                    totalHours,
                    lastCmdGuarda,
                    lastEstagio
                };
            });

            try {
                const aiShifts = await generateAIScale(
                    militaries,
                    currentMonth,
                    currentYear,
                    aiPrompt,
                    preferences,
                    existingDraft,
                    historicalStats
                );

                // Add unique IDs to the generated shifts
                const processedShifts = aiShifts.map((s: any) => ({
                    ...s,
                    id: `draft-${Date.now()}-${Math.random()}`
                }));

                // If keeping existing, merge them (actually the AI should return full scale with them)
                // But the instructions say "keep names", usually AI returns the whole thing.
                setDraftShifts(processedShifts);
            } catch (error: any) {
                console.error(error);
                const errorMessage = error.message || 'Erro desconhecido ao gerar escala.';
                alert(`Erro ao gerar escala: ${errorMessage}\n\nVerifique sua conexão e a chave da API no painel do Vercel.`);
            } finally {
                setIsGenerating(false);
            }
        };

        if (draftShifts.length > 0) {
            setConfirmDialog({
                open: true,
                title: 'Confirmar Alteração',
                message: 'Deseja alterar os nomes que já estão incluídos nesta escala? Se SIM, geraremos uma nova do zero. Se NÃO, manteremos os atuais e a IA apenas completará/ajustará o restante.',
                onConfirm: () => executeGeneration(false), // SIM = Alterar nomes (gerar do zero)
                onCancel: () => executeGeneration(true)    // NÃO = Manter nomes
            });
            return;
        }

        if (generationMode === 'auto' && !aiPrompt.trim()) {
            setConfirmDialog({
                open: true,
                title: 'Instruções Padrão',
                message: 'Nenhuma instrução foi digitada para a IA. Deseja gerar usando as regras padrão?',
                onConfirm: () => executeGeneration(false)
            });
            return;
        }

        executeGeneration();
    };

    // --- CRUD Operations on Draft ---

    const handleDayClick = (day: number) => {
        setEditingDay(day);
        setEditingShiftId(null); // New shift by default
        setFormData({
            type: 'Escala Geral',
            location: 'QCG',
            militaryId: '',
            manualHours: 0,
            manualMinutes: 0,
            startTime: '08:00',
            endTime: '08:00'
        });
        setIsModalOpen(true);
    };

    const handleEditShiftClick = (e: React.MouseEvent, shift: Shift, day: number) => {
        e.stopPropagation();
        setEditingDay(day);
        setEditingShiftId(shift.id);
        setFormData({
            militaryId: shift.militaryId,
            type: shift.type,
            location: shift.location || 'QCG',
            duration: shift.duration,
            startTime: shift.startTime,
            endTime: shift.endTime,
            manualHours: 0, // Reset for existing shifts unless specifically stored
            manualMinutes: 0
        });
        setIsModalOpen(true);
    };

    const handleSaveDraftShift = () => {
        if (!editingDay || !formData.militaryId) return;

        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${editingDay.toString().padStart(2, '0')}`;
        const isHoliday = holidays.some(h => h.date === dateStr);

        let finalStartTime = formData.startTime || '08:00';
        let finalEndTime = formData.endTime || '08:00';
        let finalDuration = formData.duration;

        const date = new Date(currentYear, currentMonth, editingDay || 1);
        const dayOfWeek = date.getDay();

        if (formData.type === 'Comandante da Guarda') {
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                finalStartTime = '20:00';
                finalEndTime = '06:30';
            } else {
                finalStartTime = '06:30';
                finalEndTime = '06:30';
            }
        } else if (formData.type === 'Estágio') {
            if (dayOfWeek === 0) { // Sunday
                finalEndTime = '20:00';
            }
            // Apply manual hours for Estágio on holidays
            if (isHoliday && (formData.manualHours !== undefined || formData.manualMinutes !== undefined)) {
                const totalHours = (formData.manualHours || 0) + (formData.manualMinutes || 0) / 60;
                if (totalHours > 0) {
                    finalDuration = totalHours;
                }
            }
        }

        const newShift: Shift = {
            id: editingShiftId || `draft-${Date.now()}-${Math.random()}`, // Use existing ID if editing, otherwise generate new
            militaryId: formData.militaryId!,
            date: dateStr,
            type: formData.type!,
            startTime: finalStartTime,
            endTime: finalEndTime,
            location: formData.location || 'QCG',
            status: 'Confirmado',
            duration: finalDuration
        };

        if (editingShiftId) {
            // Update existing
            setDraftShifts(prev => prev.map(s =>
                s.id === editingShiftId
                    ? newShift // Replace with the updated newShift object
                    : s
            ));
        } else {
            // Create new
            setDraftShifts(prev => [...prev, newShift]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteDraftShift = () => {
        if (editingShiftId) {
            setDraftShifts(prev => prev.filter(s => s.id !== editingShiftId));
            setIsModalOpen(false);
        }
    };

    // --- Publish ---

    const [isPublishing, setIsPublishing] = useState(false);

    const handlePublish = async () => {
        if (draftShifts.length === 0) {
            alert('A escala está vazia. Gere ou adicione serviços.');
            return;
        }

        setConfirmDialog({
            open: true,
            title: 'Confirmar Publicação',
            message: `Confirma a publicação de ${draftShifts.length} serviços para ${months[currentMonth]}?`,
            onConfirm: async () => {
                try {
                    setIsPublishing(true);
                    await addShifts(draftShifts);
                    navigate('/');
                } catch (error) {
                    console.error("Erro ao publicar:", error);
                    alert("Erro ao publicar a escala. Tente novamente.");
                } finally {
                    setIsPublishing(false);
                }
            }
        });
    };

    return (
        <MainLayout activePage="generate">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group shrink-0">
                            <span className="material-symbols-outlined text-2xl sm:text-3xl">
                                {generationMode === 'auto' ? 'smart_toy' : 'edit_calendar'}
                            </span>
                        </div>
                        <div className="text-left">
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">Gerador de Escala</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {generationMode === 'auto' ? 'Inteligência Artificial' : 'Modo Manual'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        {isModerator && (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                                <button
                                    onClick={() => setGenerationMode('auto')}
                                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'auto'
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                        : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Auto (IA)
                                </button>
                                <button
                                    onClick={() => {
                                        setGenerationMode('manual');
                                        setDraftShifts([]);
                                    }}
                                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-[9px] sm:text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'manual'
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                        : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Manual
                                </button>
                            </div>
                        )}

                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-10 w-full sm:w-auto justify-between sm:justify-start">
                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer uppercase py-1.5 px-3 text-[10px] sm:text-xs font-bold dark:text-white outline-none flex-1 sm:flex-none"
                            >
                                {months.map((m, i) => <option key={m} value={i}>{m.substring(0, 3)}</option>)}
                            </select>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                            <select
                                value={currentYear}
                                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer py-1.5 px-3 text-[10px] sm:text-xs font-bold dark:text-white outline-none"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {isModerator && draftShifts.length > 0 && (
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-black uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300 disabled:opacity-50"
                            >
                                {isPublishing ? (
                                    <span className="material-symbols-outlined animate-spin text-base">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined text-base">publish</span>
                                )}
                                {isPublishing ? 'Publicando...' : 'Publicar Escala'}
                            </button>
                        )}
                    </div>
                </div>

                {/* AI Prompt Area */}
                {generationMode === 'auto' && isModerator && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                        <div className="relative">
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Regras específicas para a escala... Ex: 'Priorize Sgt Silva nos fins de semana e mantenha Cb Santos no Sobreaviso'"
                                className="w-full min-h-[100px] p-4 pr-24 sm:pr-32 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm border-none focus:ring-0 resize-none dark:text-white font-medium"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="px-4 sm:px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isGenerating ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                    )}
                                    <span>{isGenerating ? 'IA Processando...' : 'Gerar Escala'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Calendar View */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-12 relative">
                    {/* Overlay loading */}
                    {isGenerating && (
                        <div className="absolute inset-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                                <span className="material-symbols-outlined text-4xl text-primary absolute inset-0 flex items-center justify-center">smart_toy</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">O Gemini está montando a escala...</h3>
                            <p className="text-slate-500 text-sm mt-2 max-w-sm">Analisando militares, descansos e suas instruções especiais.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r last:border-r-0 border-slate-200 dark:border-slate-800">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {[...Array(getFirstDayOfMonth(currentYear, currentMonth))].map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] sm:min-h-[160px] border-r border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10"></div>
                        ))}
                        {[...Array(getDaysInMonth(currentYear, currentMonth))].map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const shifts = draftShifts.filter(s => s.date === dateStr);
                            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                            return (
                                <button
                                    key={day}
                                    onClick={() => isModerator && handleDayClick(day)}
                                    className={`min-h-[100px] sm:min-h-[160px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all group relative text-left flex flex-col ${isModerator ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'cursor-default'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] sm:text-xs font-black ${isToday ? 'bg-primary text-white w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {day}
                                        </span>
                                        {isModerator && <span className="material-symbols-outlined text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">add_circle</span>}
                                    </div>
                                    <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar pr-1">
                                        {shifts
                                            .sort((a, b) => {
                                                const prioA = SHIFT_TYPE_PRIORITY[a.type] || 99;
                                                const prioB = SHIFT_TYPE_PRIORITY[b.type] || 99;
                                                if (prioA !== prioB) return prioA - prioB;

                                                const milA = militaries.find(m => m.id === a.militaryId);
                                                const milB = militaries.find(m => m.id === b.militaryId);

                                                const antA = milA?.antiguidade ?? 999;
                                                const antB = milB?.antiguidade ?? 999;
                                                if (antA !== antB) return antA - antB;

                                                return (milA?.name || '').localeCompare(milB?.name || '');
                                            })
                                            .map(s => {
                                                const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                                                const military = militaries.find(m => m.id === s.militaryId) ||
                                                    militaries.find(m => m.name.toLowerCase().includes(s.militaryId.toLowerCase()));

                                                const displayName = military
                                                    ? military.name
                                                    : (s.militaryId.length > 15 ? '???' : s.militaryId); // Show ID if name not found

                                                return (
                                                    <div
                                                        key={s.id}
                                                        onClick={(e) => handleEditShiftClick(e, s, day)}
                                                        className={`text-[8px] sm:text-[9px] font-bold p-1 rounded-md ${colors.bg} ${colors.text} truncate border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer shadow-sm flex items-center justify-between min-h-[18px] sm:min-h-[22px]`}
                                                        title={`${military?.name || 'Não Encontrado'} - ${s.type}`}
                                                    >
                                                        <span className="truncate">
                                                            {military ? (
                                                                <>
                                                                    <span className="hidden sm:inline">{military.name.split(' ')[0]}</span>
                                                                    <span className="inline sm:hidden">{military.name.charAt(0)}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-red-500 italic">{displayName}</span>
                                                            )}
                                                        </span>
                                                        <span className="material-symbols-outlined text-[8px] sm:text-[10px] opacity-20 shrink-0 ml-1">edit</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                                    <span className="material-symbols-outlined text-primary">edit_calendar</span>
                                    {editingShiftId ? 'Editar Serviço' : 'Adicionar Serviço'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Militar</label>
                                    <select
                                        value={formData.militaryId}
                                        onChange={(e) => setFormData({ ...formData, militaryId: e.target.value })}
                                        className="w-full h-9 px-2 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none text-xs font-bold"
                                    >
                                        <option value="">Selecione...</option>
                                        {militaries.map(m => {
                                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${(editingDay || 1).toString().padStart(2, '0')}`;
                                            const hasRestriction = preferences.some(p => p.militaryId === m.id && p.date === dateStr && p.type === 'restriction');
                                            return (
                                                <option
                                                    key={m.id}
                                                    value={m.id}
                                                    className={hasRestriction ? "text-red-600 font-bold" : ""}
                                                    style={hasRestriction ? { color: '#dc2626' } : {}}
                                                >
                                                    {m.rank} {m.name} {hasRestriction ? '(RESTRIÇÃO)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => {
                                            const newType = e.target.value as Shift['type'];
                                            let newDuration = formData.duration;

                                            // Handle default durations when type changes
                                            if (newType === 'Comandante da Guarda') {
                                                const date = new Date(currentYear, currentMonth, editingDay || 1);
                                                const dayOfWeek = date.getDay();
                                                newDuration = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 11 : 24;
                                            } else if (newType === 'Estágio') {
                                                const date = new Date(currentYear, currentMonth, editingDay || 1);
                                                const dayOfWeek = date.getDay();
                                                newDuration = (dayOfWeek === 6) ? 24 : 12;
                                            } else {
                                                newDuration = undefined;
                                            }

                                            setFormData({ ...formData, type: newType, duration: newDuration });
                                        }}
                                        className="w-full h-9 px-2 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none text-xs font-bold"
                                    >
                                        {Object.keys(SHIFT_TYPE_COLORS)
                                            .sort((a, b) => (SHIFT_TYPE_PRIORITY[a] || 99) - (SHIFT_TYPE_PRIORITY[b] || 99))
                                            .map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                    </select>
                                </div>

                                {formData.type === 'Comandante da Guarda' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Duração (Horas)</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                            {[11, 24].map(h => (
                                                <button
                                                    key={h}
                                                    onClick={() => setFormData({ ...formData, duration: h })}
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
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Duração (Predefinida)</label>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                {[12, 24].map(h => (
                                                    <button
                                                        key={h}
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            duration: h,
                                                            manualHours: h,
                                                            manualMinutes: 0
                                                        })}
                                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${formData.duration === h
                                                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                                            : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        {h} Horas
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {(() => {
                                            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${(editingDay || 1).toString().padStart(2, '0')}`;
                                            const isHoliday = holidays.some(h => h.date === dateStr);

                                            if (isHoliday) {
                                                return (
                                                    <div className="space-y-1 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-2">
                                                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">event_busy</span>
                                                            Ajuste Manual (Feriado)
                                                        </label>
                                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase">Horas</label>
                                                                <input
                                                                    type="number"
                                                                    value={formData.manualHours}
                                                                    onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        manualHours: parseInt(e.target.value) || 0,
                                                                        duration: (parseInt(e.target.value) || 0) + (formData.manualMinutes || 0) / 60
                                                                    })}
                                                                    className="w-full h-8 px-2 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500 font-medium text-xs"
                                                                    min="0"
                                                                    max="24"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] font-bold text-slate-400 uppercase">Minutos</label>
                                                                <input
                                                                    type="number"
                                                                    value={formData.manualMinutes}
                                                                    onChange={(e) => setFormData({
                                                                        ...formData,
                                                                        manualMinutes: parseInt(e.target.value) || 0,
                                                                        duration: (formData.manualHours || 0) + (parseInt(e.target.value) || 0) / 60
                                                                    })}
                                                                    className="w-full h-8 px-2 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none focus:border-amber-500 font-medium text-xs"
                                                                    min="0"
                                                                    max="59"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}

                                {formData.type === 'Barra' && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Horário da Barra</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                            {['09:40', '11:40', '15:40', '17:40'].map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => setFormData({ ...formData, startTime: time, endTime: time })}
                                                    className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${formData.startTime === time
                                                        ? 'bg-white dark:bg-slate-700 text-pink-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                                        : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-2">
                                {editingShiftId && (
                                    <button
                                        onClick={handleDeleteDraftShift}
                                        className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 transition-colors text-xs flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Excluir
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveDraftShift}
                                    disabled={!formData.militaryId}
                                    className="flex-1 px-3 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">check</span>
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Modal (Sim/Não) */}
                {confirmDialog.open && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-3xl">help</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">{confirmDialog.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{confirmDialog.message}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                                <button
                                    onClick={() => {
                                        if (confirmDialog.onCancel) confirmDialog.onCancel();
                                        setConfirmDialog({ ...confirmDialog, open: false });
                                    }}
                                    className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                                >
                                    Não
                                </button>
                                <button
                                    onClick={() => {
                                        confirmDialog.onConfirm();
                                        setConfirmDialog({ ...confirmDialog, open: false });
                                    }}
                                    className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center"
                                >
                                    Sim
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout >
    );
};

export default GenerateScalePage;
