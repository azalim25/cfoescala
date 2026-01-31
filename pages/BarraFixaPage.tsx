import React, { useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { useAuth } from '../contexts/AuthContext';
import { SHIFT_TYPE_COLORS } from '../constants';
import { safeParseISO } from '../utils/dateUtils';
import { Shift } from '../types';

const BarraFixaPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts, removeShift, createShifts } = useShift();
    const { isModerator } = useAuth();
    const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
    const [repeatSource, setRepeatSource] = useState<{ date: string; time: string; shifts: Shift[] } | null>(null);
    const [repeatTarget, setRepeatTarget] = useState({ date: '', time: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenRepeatModal = (date: string, time: string, groupShifts: Shift[]) => {
        setRepeatSource({ date, time, shifts: groupShifts });
        setRepeatTarget({ date: '', time: time }); // Default to same time
        setIsRepeatModalOpen(true);
    };

    const handleConfirmRepeat = async () => {
        if (!repeatTarget.date || !repeatTarget.time || !repeatSource) return;

        setIsProcessing(true);
        try {
            const newShifts: Omit<Shift, 'id'>[] = repeatSource.shifts.map(s => ({
                militaryId: s.militaryId,
                date: repeatTarget.date,
                type: 'Barra',
                startTime: repeatTarget.time,
                endTime: repeatTarget.time,
                status: 'Confirmado',
                location: s.location || 'Escola'
            }));

            await createShifts(newShifts);
            setIsRepeatModalOpen(false);
            setRepeatSource(null);
        } catch (error) {
            console.error('Error repeating shifts:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteShift = async (id: string) => {
        if (window.confirm('Deseja realmente remover este militar desta escala?')) {
            await removeShift(id);
        }
    };

    // Filter shifts of type 'Barra' and search term
    const barraShifts = useMemo(() => {
        return shifts
            .filter(s => {
                const isBarra = s.type === 'Barra';
                if (!isBarra) return false;

                if (!searchTerm.trim()) return true;

                const military = militaries.find(m => m.id === s.militaryId);
                const searchLower = searchTerm.toLowerCase();
                return (
                    military?.name.toLowerCase().includes(searchLower) ||
                    military?.rank.toLowerCase().includes(searchLower) ||
                    military?.firefighterNumber.includes(searchTerm)
                );
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [shifts, searchTerm, militaries]);

    // Group by date and then by time
    const groupedShifts = useMemo(() => {
        const groups: Record<string, Record<string, Shift[]>> = {};
        barraShifts.forEach(s => {
            if (!groups[s.date]) groups[s.date] = {};
            if (!groups[s.date][s.startTime]) groups[s.date][s.startTime] = [];
            groups[s.date][s.startTime].push(s);
        });

        // Sort each time slot by military seniority
        Object.keys(groups).forEach(date => {
            Object.keys(groups[date]).forEach(time => {
                groups[date][time].sort((a, b) => {
                    const milA = militaries.find(m => m.id === a.militaryId);
                    const milB = militaries.find(m => m.id === b.militaryId);
                    const antA = milA?.antiguidade ?? 999999;
                    const antB = milB?.antiguidade ?? 999999;
                    if (antA !== antB) return antA - antB;
                    return (milA?.name || "").localeCompare(milB?.name || "");
                });
            });
        });

        return groups;
    }, [barraShifts, militaries]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedShifts).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [groupedShifts]);

    return (
        <MainLayout activePage="barra-fixa">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center text-pink-600 dark:text-pink-400">
                            <span className="material-symbols-outlined text-2xl">fitness_center</span>
                        </div>
                        <div className="flex flex-col">
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Barra Fixa</h2>
                            <p className="text-xs text-slate-500 font-medium text-wrap max-sm:max-w-40 sm:max-w-full">Escala de treinamento físico (Barra)</p>
                        </div>
                    </div>

                    <div className="flex-1 max-w-md">
                        <div className="relative group">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="Pesquisar militar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all dark:text-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shifts List grouped by day */}
                <div className="space-y-6">
                    {sortedDates.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">event_busy</span>
                            <p className="text-slate-500 italic">Nenhuma escala de barra registrada.</p>
                        </div>
                    ) : (
                        sortedDates.map(date => {
                            const dateObj = safeParseISO(date);
                            const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                            const dayNum = dateObj.getDate().toString().padStart(2, '0');
                            const month = dateObj.toLocaleDateString('pt-BR', { month: 'long' });

                            return (
                                <div key={date} className="space-y-6 bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                            {dayOfWeek}, {dayNum} de {month}
                                        </h3>
                                    </div>

                                    <div className="space-y-8 pl-2">
                                        {Object.keys(groupedShifts[date]).sort().map(time => (
                                            <div key={time} className="space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center justify-center px-3 py-1 bg-pink-500 text-white text-[11px] font-black rounded-lg shadow-sm shadow-pink-200 dark:shadow-none">
                                                            {time}
                                                        </span>
                                                        <div className="h-px w-24 bg-gradient-to-r from-pink-200 to-transparent dark:from-pink-900/50"></div>
                                                    </div>

                                                    {isModerator && (
                                                        <button
                                                            onClick={() => handleOpenRepeatModal(date, time, groupedShifts[date][time])}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-all border border-pink-100 dark:border-pink-800/50 text-[10px] font-black uppercase"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                            Repetir Grupo
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {groupedShifts[date][time].map(s => {
                                                        const military = militaries.find(m => m.id === s.militaryId);

                                                        return (
                                                            <div
                                                                key={s.id}
                                                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                                            >
                                                                <div className="flex items-center justify-between relative z-10">
                                                                    <div className="flex items-center gap-4 min-w-0">
                                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                                                            <span className="material-symbols-outlined">person</span>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <h4 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                                                                {military?.rank} {military?.name}
                                                                            </h4>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                                                    BM: {military?.firefighterNumber}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {isModerator && (
                                                                        <button
                                                                            onClick={() => handleDeleteShift(s.id)}
                                                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                                                            title="Remover militar"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="absolute top-0 right-0 w-1 h-full bg-pink-500/30 group-hover:bg-pink-500 transition-colors"></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Repeat Modal */}
                {isRepeatModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                <div>
                                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Repetir Escala</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Criar cópias desta escala</p>
                                </div>
                                <button
                                    onClick={() => !isProcessing && setIsRepeatModalOpen(false)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl border border-pink-100 dark:border-pink-800/50">
                                    <p className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase mb-2">Origem</p>
                                    <div className="flex items-center justify-between text-pink-700 dark:text-pink-300">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base">calendar_today</span>
                                            <span className="text-xs font-bold">{repeatSource?.date ? safeParseISO(repeatSource.date).toLocaleDateString() : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base">schedule</span>
                                            <span className="text-xs font-bold">{repeatSource?.time}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-60">
                                            <span className="text-[10px] font-black">{repeatSource?.shifts.length} MILITARES</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data de Destino</label>
                                        <input
                                            type="date"
                                            value={repeatTarget.date}
                                            onChange={(e) => setRepeatTarget(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Horário de Destino</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {['09:40', '11:40', '15:40', '17:40'].map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setRepeatTarget(prev => ({ ...prev, time: t }))}
                                                    className={`py-3 rounded-xl text-xs font-bold border transition-all ${repeatTarget.time === t
                                                        ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-200 dark:shadow-none'
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-pink-300'
                                                        }`}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                                <button
                                    onClick={() => setIsRepeatModalOpen(false)}
                                    disabled={isProcessing}
                                    className="flex-1 py-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmRepeat}
                                    disabled={isProcessing || !repeatTarget.date || !repeatTarget.time}
                                    className="flex-[2] bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl text-xs font-black uppercase shadow-lg shadow-pink-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">check_circle</span>
                                            Confirmar Cópia
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout >
    );
};

export default BarraFixaPage;
