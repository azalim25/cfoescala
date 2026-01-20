import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useShift } from '../contexts/ShiftContext';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Shift } from '../types';

interface StageAssignment {
    id: string;
    military_id: string;
    date: string;
    location: string;
    duration?: number;
}

const StagePage: React.FC = () => {
    const { militaries } = useMilitary();
    const { shifts } = useShift();
    const { isModerator } = useAuth();
    const [manualStages, setManualStages] = useState<StageAssignment[]>([]);
    const [isLoadingManual, setIsLoadingManual] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Form state for manual entries
    const [formData, setFormData] = useState({
        militaryId: '',
        date: new Date().toISOString().split('T')[0],
        location: '1°BBM - Batalhão Afonso Pena',
        duration: 24
    });

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const locations = [
        '1°BBM - Batalhão Afonso Pena',
        '2°BBM - Batalhão Contagem',
        '3°BBM - Batalhão Antônio Carlos'
    ];

    const fetchManualStages = async () => {
        setIsLoadingManual(true);
        const { data, error } = await supabase
            .from('stages')
            .select('*')
            .order('date', { ascending: false });

        if (!error && data) {
            setManualStages(data);
        }
        setIsLoadingManual(false);
    };

    useEffect(() => {
        fetchManualStages();
    }, []);

    const handlePrevMonth = () => {
        setCurrentMonth(prev => {
            if (prev === 0) {
                setCurrentYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => {
            if (prev === 11) {
                setCurrentYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const handleAddStage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.militaryId || !formData.date || !formData.location) {
            alert('Preencha todos os campos');
            return;
        }

        const { error } = await supabase.from('stages').insert({
            military_id: formData.militaryId,
            date: formData.date,
            location: formData.location,
            duration: formData.duration
        });

        if (error) {
            console.error('Erro ao adicionar estágio:', error);
            alert('Erro ao adicionar estágio. Verifique se a coluna "duration" existe na tabela "stages".');
        } else {
            setIsAdding(false);
            fetchManualStages();
            setFormData({
                ...formData,
                militaryId: ''
            });
        }
    };

    const handleDeleteManualStage = async (id: string) => {
        if (!confirm('Deseja excluir este registro manual?')) return;
        const { error } = await supabase.from('stages').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir');
        } else {
            fetchManualStages();
        }
    };

    // Helper to calculate hours with fallback
    const getShiftDuration = (shift: Shift) => {
        if (shift.duration) return shift.duration;
        const d = new Date(shift.date + 'T12:00:00');
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 6) return 24; // Sábado
        if (dayOfWeek === 0) return 12; // Domingo
        return 0;
    };

    // Automated list from Shifts hook
    const automatedStages = useMemo(() => {
        return shifts.filter(s => {
            if (s.type !== 'Estágio') return false;
            const d = new Date(s.date + 'T12:00:00');
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    }, [shifts, currentMonth, currentYear]);

    // Manual list filtered by month/year
    const filteredManualStages = useMemo(() => {
        return manualStages.filter(s => {
            const d = new Date(s.date + 'T12:00:00');
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    }, [manualStages, currentMonth, currentYear]);

    const currentMonthLabel = `${months[currentMonth]} de ${currentYear}`;

    return (
        <MainLayout activePage="stage">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">clinical_notes</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Controle de Estágios</h2>
                            <p className="text-xs text-slate-500 font-medium">{currentMonthLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button onClick={handlePrevMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={handleNextMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table 1: Automated Stages */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 uppercase tracking-wider">
                                <span className="material-symbols-outlined text-primary text-xl">event_available</span>
                                Relação de Estágios (Calendário)
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">Extraído automaticamente da escala geral</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Militar</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Local</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Data</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Carga Horária</th>
                                </tr>
                            </thead>
                            <tbody>
                                {automatedStages.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum estágio encontrado para este mês no calendário</td>
                                    </tr>
                                ) : (
                                    automatedStages.map(s => {
                                        const mil = militaries.find(m => m.id === s.militaryId);
                                        const duration = getShiftDuration(s);
                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mil ? `${mil.rank} ${mil.name}` : 'Desconhecido'}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="text-slate-600 dark:text-slate-400 text-sm">{s.location || 'Não informado'}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="text-slate-500 dark:text-slate-400 text-sm">{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${duration === 24 ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {duration} Horas
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Table 2: Manual Stages - CFO I */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-12">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 uppercase tracking-wider">
                                <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
                                Local de Estágio - CFO I
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">Registros manuais de estágio profissional</p>
                        </div>
                        {isModerator && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all uppercase tracking-tight"
                            >
                                <span className="material-symbols-outlined text-base">add_box</span>
                                Adicionar Registro
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Militar</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Local</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Data</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Carga Horária</th>
                                    {isModerator && <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingManual ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">Carregando...</td>
                                    </tr>
                                ) : filteredManualStages.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum registro manual encontrado para este mês</td>
                                    </tr>
                                ) : (
                                    filteredManualStages.map(s => {
                                        const mil = militaries.find(m => m.id === s.military_id);
                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{mil ? `${mil.rank} ${mil.name}` : 'Desconhecido'}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="text-slate-600 dark:text-slate-400 text-sm">{s.location}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className="text-slate-500 dark:text-slate-400 text-sm">{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                                </td>
                                                <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.duration === 24 ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {s.duration || 0} Horas
                                                    </span>
                                                </td>
                                                {isModerator && (
                                                    <td className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                                                        <button onClick={() => handleDeleteManualStage(s.id)} className="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="Excluir">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal for adding */}
                {isAdding && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_location_alt</span>
                                    Novo Registro - CFO I
                                </h3>
                                <button onClick={() => setIsAdding(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <form onSubmit={handleAddStage} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Militar</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                        value={formData.militaryId}
                                        onChange={e => setFormData({ ...formData, militaryId: e.target.value })}
                                        required
                                    >
                                        <option value="">Selecione um militar...</option>
                                        {[...militaries]
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(m => (
                                                <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Data</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Batalhão / Local</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        required
                                    >
                                        {locations.map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Duração</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                        {[12, 24].map(h => (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, duration: h }))}
                                                className={`flex-1 py-2 text-xs font-black uppercase rounded-lg transition-all ${formData.duration === h
                                                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                                    : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {h} Horas
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-primary py-3.5 rounded-xl text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">save</span>
                                        Salvar Registro
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </MainLayout.Content>
        </MainLayout>
    );
};

export default StagePage;
