import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { Military, Shift } from '../types';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { SHIFT_TYPE_COLORS } from '../constants';

const GenerateScalePage: React.FC = () => {
    const navigate = useNavigate();
    const { militaries } = useMilitary();
    const { addShifts } = useShift();

    // Time State
    const [currentMonth, setCurrentMonth] = useState(0);
    const [currentYear, setCurrentYear] = useState(2026);

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
    const [formData, setFormData] = useState<{ militaryId: string; type: Shift['type']; location: string }>({
        militaryId: '',
        type: 'Escala Geral',
        location: 'QCG'
    });

    useEffect(() => {
        const today = new Date();
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    }, []);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    // --- Generation Logic ---

    const handleGenerate = async () => {
        if (generationMode === 'auto' && !aiPrompt.trim()) {
            if (!confirm('Nenhuma instrução foi digitada para a IA. Deseja gerar usando as regras padrão?')) {
                return;
            }
        }

        setIsGenerating(true);
        setDraftShifts([]); // Clear current draft

        setTimeout(() => {
            // Mock AI Generation Logic based on "Round Robin" + "Rules"
            // In a real scenario, we would send `aiPrompt` to an LLM.
            // Here we basically run the standard logic but pretend we listened.

            const totalDays = getDaysInMonth(currentYear, currentMonth);
            const newDraft: Shift[] = [];
            let militaryIndex = 0;

            for (let i = 1; i <= totalDays; i++) {
                const date = new Date(currentYear, currentMonth, i);
                const dayOfWeek = date.getDay(); // 0 = Sun
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;

                let requirements: Array<{ type: Shift['type'], count: number }> = [];

                if (dayOfWeek === 1 || dayOfWeek === 3) { // Seg/Qua
                    requirements = [
                        { type: 'Comandante da Guarda', count: 1 },
                        { type: 'Sobreaviso', count: 1 },
                        { type: 'Faxina', count: 3 },
                        { type: 'Manutenção', count: 6 }
                    ];
                } else if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5) { // Ter/Qui/Sex
                    requirements = [
                        { type: 'Comandante da Guarda', count: 1 },
                        { type: 'Sobreaviso', count: 1 },
                        { type: 'Faxina', count: 3 }
                    ];
                } else { // Sáb/Dom
                    requirements = [
                        { type: 'Comandante da Guarda', count: 1 },
                        { type: 'Sobreaviso', count: 1 },
                        { type: 'Estágio', count: 2 }
                    ];
                }

                requirements.forEach(req => {
                    for (let c = 0; c < req.count; c++) {
                        const m = militaries[militaryIndex % militaries.length];
                        militaryIndex++;
                        if (m) {
                            newDraft.push({
                                id: `draft-${Date.now()}-${i}-${c}-${Math.random()}`,
                                militaryId: m.id,
                                date: dateStr,
                                type: req.type,
                                startTime: '08:00',
                                endTime: '08:00',
                                location: 'QCG',
                                status: 'Confirmado'
                            });
                        }
                    }
                });
            }

            setDraftShifts(newDraft);
            setIsGenerating(false);
        }, 1500);
    };

    // --- CRUD Operations on Draft ---

    const handleDayClick = (day: number) => {
        setEditingDay(day);
        setEditingShiftId(null); // New shift by default
        setFormData({ militaryId: '', type: 'Escala Geral', location: 'QCG' });
        setIsModalOpen(true);
    };

    const handleEditShiftClick = (e: React.MouseEvent, shift: Shift, day: number) => {
        e.stopPropagation();
        setEditingDay(day);
        setEditingShiftId(shift.id);
        setFormData({
            militaryId: shift.militaryId,
            type: shift.type,
            location: shift.location || 'QCG'
        });
        setIsModalOpen(true);
    };

    const handleSaveDraftShift = () => {
        if (!editingDay || !formData.militaryId) return;

        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${editingDay.toString().padStart(2, '0')}`;

        if (editingShiftId) {
            // Update existing
            setDraftShifts(prev => prev.map(s =>
                s.id === editingShiftId
                    ? { ...s, militaryId: formData.militaryId, type: formData.type, location: formData.location }
                    : s
            ));
        } else {
            // Create new
            const newShift: Shift = {
                id: `draft-${Date.now()}-${Math.random()}`,
                militaryId: formData.militaryId,
                date: dateStr,
                type: formData.type,
                startTime: '08:00',
                endTime: '08:00',
                location: formData.location,
                status: 'Confirmado'
            };
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

    const handlePublish = () => {
        if (draftShifts.length === 0) {
            alert('A escala está vazia. Gere ou adicione serviços.');
            return;
        }
        if (confirm(`Confirma a publicação de ${draftShifts.length} serviços para ${months[currentMonth]}?`)) {
            addShifts(draftShifts);
            navigate('/');
        }
    };

    return (
        <MainLayout activePage="generate">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col xl:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group">
                            <span className="material-symbols-outlined text-3xl">
                                {generationMode === 'auto' ? 'smart_toy' : 'edit_calendar'}
                            </span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Gerador de Escala</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {generationMode === 'auto' ? 'Inteligência Artificial' : 'Modo Manual'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setGenerationMode('auto')}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'auto'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                    : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Automático (IA)
                            </button>
                            <button
                                onClick={() => {
                                    setGenerationMode('manual');
                                    setDraftShifts([]);
                                }}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${generationMode === 'manual'
                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                    : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Manual
                            </button>
                        </div>

                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden h-10">
                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer uppercase py-1.5 px-3 text-xs font-bold dark:text-white outline-none"
                            >
                                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                            <select
                                value={currentYear}
                                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                                className="bg-transparent border-none focus:ring-0 cursor-pointer py-1.5 px-3 text-xs font-bold dark:text-white outline-none"
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* AI Prompt Area */}
                {generationMode === 'auto' && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                        <div className="relative">
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Descreva aqui regras específicas ou preferências para a criação da escala (ex: 'Não colocar Sd Silva na segunda-feira', 'Priorizar 1º Batalhão nos finais de semana')..."
                                className="w-full min-h-[80px] p-4 pr-32 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm border-none focus:ring-0 resize-none dark:text-white"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                                >
                                    {isGenerating ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                    )}
                                    Gerar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Calendar View */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-20 relative">
                    {/* Overlay loading */}
                    {isGenerating && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-primary animate-bounce mb-4">smart_toy</span>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">A Inteligência Artificial está montando a escala...</h3>
                            <p className="text-slate-500 text-sm mt-2">Isso pode levar alguns segundos.</p>
                        </div>
                    )}

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
                            const shifts = draftShifts.filter(s => s.date === dateStr);
                            const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    className={`min-h-[120px] p-2 border-r border-b border-slate-100 dark:border-slate-800 transition-all group relative text-left hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {day}
                                        </span>
                                        <span className="material-symbols-outlined text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">add</span>
                                    </div>
                                    <div className="space-y-1">
                                        {shifts.map(s => {
                                            const colors = SHIFT_TYPE_COLORS[s.type] || SHIFT_TYPE_COLORS['Escala Geral'];
                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={(e) => handleEditShiftClick(e, s, day)}
                                                    className={`text-[9px] font-bold p-1 rounded ${colors.bg} ${colors.text} truncate border ${colors.border} hover:opacity-80 transition-opacity cursor-pointer`}
                                                    title={`${militaries.find(m => m.id === s.militaryId)?.name} - ${s.type}`}
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

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-40">
                    <div className="text-xs text-slate-500 font-medium">
                        {draftShifts.length} serviços agendados para publicação
                    </div>
                    <button
                        onClick={handlePublish}
                        disabled={draftShifts.length === 0}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">publish</span>
                        Publicar Escala
                    </button>
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
                                        {militaries.map(m => (
                                            <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full h-9 px-2 rounded-lg border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none text-xs font-bold"
                                    >
                                        {Object.keys(SHIFT_TYPE_COLORS).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
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
            </MainLayout.Content>
        </MainLayout>
    );
};

export default GenerateScalePage;
