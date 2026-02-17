import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { Military } from '../types';
import { safeParseISO } from '../utils/dateUtils';

interface ExtraHourRecord {
    id: string;
    military_id: string;
    hours: number;
    minutes: number;
    description: string;
    category: string;
    date: string;
    created_at: string;
    militaries?: Military;
}

const ExtraHoursPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isModerator } = useAuth();
    const [selectedMilitaryId, setSelectedMilitaryId] = useState<string>('');
    const [hours, setHours] = useState<number>(0);
    const [minutes, setMinutes] = useState<number>(0);
    const [category, setCategory] = useState<string>('CFO I - Sentinela');
    const [description, setDescription] = useState<string>('');
    const [records, setRecords] = useState<ExtraHourRecord[]>([]);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories = [
        'CFO I - Sentinela',
        'CFO I - Acumulado',
        'CFO II - Registro de Horas'
    ];

    const fetchRecords = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('extra_hours')
            .select('*, militaries(*)')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setRecords(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMilitaryId || (hours === 0 && minutes === 0)) {
            alert('Por favor, selecione um militar e informe o tempo.');
            return;
        }

        setIsSubmitting(true);
        const recordData = {
            military_id: selectedMilitaryId,
            hours,
            minutes,
            category,
            description,
            date: new Date().toISOString().split('T')[0]
        };

        const { error } = editingRecordId
            ? await supabase
                .from('extra_hours')
                .update(recordData)
                .eq('id', editingRecordId)
            : await supabase
                .from('extra_hours')
                .insert([recordData]);

        if (!error) {
            handleCancelEdit();
            fetchRecords();
            alert(editingRecordId ? 'Registro atualizado com sucesso!' : 'Horas registradas com sucesso!');
        } else {
            alert('Erro ao salvar horas.');
        }
        setIsSubmitting(false);
    };

    const handleEdit = (record: ExtraHourRecord) => {
        setEditingRecordId(record.id);
        setSelectedMilitaryId(record.military_id);
        setHours(record.hours);
        setMinutes(record.minutes);
        setCategory(record.category || 'CFO I - Sentinela');
        setDescription(record.description || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingRecordId(null);
        setSelectedMilitaryId('');
        setHours(0);
        setMinutes(0);
        setCategory('CFO I - Sentinela');
        setDescription('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este registro?')) return;
        const { error } = await supabase
            .from('extra_hours')
            .delete()
            .eq('id', id);
        if (!error) {
            fetchRecords();
        }
    };

    return (
        <MainLayout activePage="extra-hours">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-2xl sm:text-3xl">more_time</span>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">Registro de Horas</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Atividades Externas</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 sm:mb-0">
                    {isModerator && (
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                        <span className="material-symbols-outlined text-primary text-lg">
                                            {editingRecordId ? 'edit_note' : 'add_circle'}
                                        </span>
                                        {editingRecordId ? 'Editar Registro' : 'Novo Registro'}
                                    </h3>
                                </div>
                                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Militar</label>
                                        <select
                                            value={selectedMilitaryId}
                                            onChange={(e) => setSelectedMilitaryId(e.target.value)}
                                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            required
                                        >
                                            <option value="">Selecione um militar...</option>
                                            {militaries.map(m => (
                                                <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Atividade</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            required
                                        >
                                            {categories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={hours}
                                                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                                                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minutos</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={minutes}
                                                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                                                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={2}
                                            placeholder="Detalhes adicionais..."
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        ></textarea>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">save</span>
                                            {isSubmitting ? 'Salvando...' : (editingRecordId ? 'Salvar' : 'Registrar')}
                                        </button>
                                        {editingRecordId && (
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                className="w-full h-10 text-slate-500 text-xs font-bold hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">cancel</span>
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className={isModerator ? "lg:col-span-2" : "lg:col-span-3"}>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-auto lg:h-[calc(100vh-270px)]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center text-center">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                                    <span className="material-symbols-outlined text-primary text-lg">list_alt</span>
                                    Histórico
                                </h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    {records.length} Total
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar text-center">
                                {isLoading ? (
                                    <div className="p-12 flex items-center justify-center text-slate-400">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : records.length === 0 ? (
                                    <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50">
                                        <span className="material-symbols-outlined text-6xl">history</span>
                                        <p className="font-bold text-sm">Nenhum registro encontrado.</p>
                                    </div>
                                ) : (
                                    <>
                                        <table className="hidden sm:table w-full text-left">
                                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 z-10">
                                                <tr>
                                                    <th className="px-6 py-4">Militar</th>
                                                    <th className="px-6 py-4">Tempo</th>
                                                    <th className="px-6 py-4">Tipo/Observação</th>
                                                    <th className="px-6 py-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {records.map((record) => (
                                                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                                                    <span className="material-symbols-outlined text-sm">person</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                        {record.militaries?.rank} {record.militaries?.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-black">
                                                                        {safeParseISO(record.date || record.created_at).toLocaleDateString('pt-BR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-black rounded uppercase border border-blue-100 dark:border-blue-800/50">
                                                                {record.hours}h {record.minutes}min
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-primary uppercase tracking-tight mb-0.5">{record.category || 'Outros'}</span>
                                                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1" title={record.description}>
                                                                    {record.description || '-'}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {isModerator && (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleEdit(record)}
                                                                        className={`p-1.5 transition-colors ${editingRecordId === record.id ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
                                                                        title="Editar"
                                                                    >
                                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(record.id)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                                        title="Excluir"
                                                                    >
                                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                            {records.map((record) => (
                                                <div key={record.id} className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                                                <span className="material-symbols-outlined text-sm">person</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                    {record.militaries?.rank} {record.militaries?.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-black">
                                                                    {safeParseISO(record.date || record.created_at).toLocaleDateString('pt-BR')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-black rounded uppercase border border-blue-100 dark:border-blue-800/50">
                                                            {record.hours}h {record.minutes}min
                                                        </span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50">
                                                        <span className="text-[9px] font-black text-primary uppercase tracking-tight block mb-1">{record.category || 'Outros'}</span>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap">
                                                            {record.description || '-'}
                                                        </p>
                                                    </div>
                                                    {isModerator && (
                                                        <div className="flex items-center justify-end gap-3 pt-1">
                                                            <button
                                                                onClick={() => handleEdit(record)}
                                                                className={`flex items-center gap-1 text-[10px] font-bold ${editingRecordId === record.id ? 'text-primary' : 'text-slate-500'}`}
                                                            >
                                                                <span className="material-symbols-outlined text-base">edit</span>
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(record.id)}
                                                                className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-red-500"
                                                            >
                                                                <span className="material-symbols-outlined text-base">delete</span>
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default ExtraHoursPage;
