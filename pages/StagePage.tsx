import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

interface StageAssignment {
    id: string;
    military_id: string;
    date: string;
    location: string;
}

const StagePage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isGuest } = useAuth();
    const [stages, setStages] = useState<StageAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Form state
    const [formData, setFormData] = useState({
        militaryId: '',
        date: new Date().toISOString().split('T')[0],
        location: '1°BBM - Batalhão Afonso Pena'
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

    const fetchStages = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('stages')
            .select('*')
            .order('date', { ascending: true });

        if (!error && data) {
            setStages(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchStages();
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
            location: formData.location
        });

        if (error) {
            alert('Erro ao adicionar estágio');
        } else {
            setIsAdding(false);
            fetchStages();
            // Reset form
            setFormData({
                ...formData,
                militaryId: ''
            });
        }
    };

    // Filter stages for the selected month/year
    const filteredStages = stages.filter(s => {
        const d = new Date(s.date + 'T12:00:00'); // Use T12:00:00 to avoid timezone issues
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const currentMonthLabel = `${months[currentMonth]} de ${currentYear}`;

    const handleDeleteStage = async (id: string) => {
        if (!confirm('Deseja excluir este estágio?')) return;
        const { error } = await supabase.from('stages').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir');
        } else {
            fetchStages();
        }
    };

    const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

    return (
        <MainLayout activePage="stage">
            <MainLayout.Content>
                {/* Header Section */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">location_city</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">Estágios de {currentMonthLabel}</h2>
                            <p className="text-xs text-slate-500 font-medium">Distribuição mensal por batalhão</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
                            <button onClick={handlePrevMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={handleNextMonth} className="p-1 px-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-600 dark:text-slate-300">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                        {!isGuest && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">add_location_alt</span>
                                Adicionar Estágio
                            </button>
                        )}
                    </div>
                </div>

                {/* Locations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {locations.map(loc => {
                        const locStages = filteredStages.filter(s => s.location === loc);
                        return (
                            <div key={loc} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                                        {loc}
                                    </h3>
                                </div>
                                <div className="p-4 flex-grow space-y-3">
                                    {isLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    ) : locStages.length === 0 ? (
                                        <p className="text-slate-400 text-sm italic text-center py-8">Nenhum militar alocado</p>
                                    ) : (
                                        locStages.map(s => {
                                            const military = militaries.find(m => m.id === s.military_id);
                                            // Handle date without timezone shift
                                            const dateParts = s.date.split('-');
                                            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                                            const dateFormatted = dateObj.toLocaleDateString('pt-BR');

                                            return (
                                                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg group hover:ring-1 hover:ring-primary/30 transition-all border border-transparent dark:border-slate-700/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                                                            {military ? `${military.rank} ${military.name}` : 'Militar desconhecido'}
                                                        </span>
                                                        <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 mt-1 font-medium">
                                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                            {dateFormatted}
                                                        </span>
                                                    </div>
                                                    {!isGuest && (
                                                        <button
                                                            onClick={() => handleDeleteStage(s.id)}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                                                            title="Excluir"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Modal for adding */}
                {isAdding && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_location_alt</span>
                                    Novo Estágio
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <label className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Batalhão</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            required
                                        >
                                            {locations.map(loc => (
                                                <option key={loc} value={loc}>{loc.split(' - ')[0]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-primary py-3.5 rounded-xl text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Confirmar Alocação
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
