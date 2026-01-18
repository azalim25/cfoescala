import React, { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

interface Assignment {
    militaryId: string;
    role: string;
}

interface Semestre {
    id: string;
    name: string;
    assignments: Assignment[];
    createdAt: string;
}

const FuncoesTurmaPage: React.FC = () => {
    const { militaries } = useMilitary();
    const { isGuest } = useAuth();
    const [semestres, setSemestres] = useState<Semestre[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formSemestreName, setFormSemestreName] = useState('');
    const [formAssignments, setFormAssignments] = useState<Assignment[]>([
        { militaryId: '', role: '' }
    ]);

    // Fetch semestres from Supabase
    const fetchSemestres = async () => {
        setIsLoading(true);
        try {
            const { data: semData, error: semError } = await supabase
                .from('funcoes_turma_semestre')
                .select('*')
                .order('created_at', { ascending: true });

            if (semError) throw semError;

            if (semData) {
                const semestresWithAssignments = await Promise.all(
                    semData.map(async (sem) => {
                        const { data: assignments, error: assignError } = await supabase
                            .from('funcoes_turma_assignments')
                            .select('military_id, role')
                            .eq('semestre_id', sem.id);

                        if (assignError) throw assignError;

                        return {
                            id: sem.id,
                            name: sem.name,
                            assignments: assignments?.map(a => ({
                                militaryId: a.military_id,
                                role: a.role
                            })) || [],
                            createdAt: sem.created_at
                        };
                    })
                );

                setSemestres(semestresWithAssignments);
            }
        } catch (error) {
            console.error('Error fetching semestres:', error);
            alert('Erro ao carregar Funções de Turma.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSemestres();
    }, []);

    const handleOpenAddModal = () => {
        setFormSemestreName('');
        setFormAssignments([{ militaryId: '', role: '' }]);
        setIsModalOpen(true);
    };

    const handleAddAssignment = () => {
        setFormAssignments([...formAssignments, { militaryId: '', role: '' }]);
    };

    const handleRemoveAssignment = (index: number) => {
        setFormAssignments(formAssignments.filter((_, i) => i !== index));
    };

    const handleAssignmentChange = (index: number, field: 'militaryId' | 'role', value: string) => {
        const updated = [...formAssignments];
        updated[index][field] = value;
        setFormAssignments(updated);
    };

    const handleSave = async () => {
        if (!formSemestreName.trim()) {
            alert('Por favor, insira o nome do semestre.');
            return;
        }

        setIsSaving(true);
        try {
            const validAssignments = formAssignments.filter(a => a.militaryId && a.role.trim());

            // Create new semestre
            const { data: newSem, error: createError } = await supabase
                .from('funcoes_turma_semestre')
                .insert({ name: formSemestreName })
                .select()
                .single();

            if (createError) throw createError;

            // Insert assignments
            if (validAssignments.length > 0 && newSem) {
                const { error: insertError } = await supabase
                    .from('funcoes_turma_assignments')
                    .insert(
                        validAssignments.map(a => ({
                            semestre_id: newSem.id,
                            military_id: a.militaryId,
                            role: a.role
                        }))
                    );

                if (insertError) throw insertError;
            }

            setIsModalOpen(false);
            fetchSemestres();
        } catch (error) {
            console.error('Error saving semestre:', error);
            alert('Erro ao salvar Funções de Turma.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSemestre = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este semestre?')) return;

        try {
            const { error } = await supabase
                .from('funcoes_turma_semestre')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchSemestres();
        } catch (error) {
            console.error('Error deleting semestre:', error);
            alert('Erro ao excluir semestre.');
        }
    };

    // Build table data
    const getMilitaryRole = (militaryId: string, semestreId: string): string => {
        const semestre = semestres.find(s => s.id === semestreId);
        const assignment = semestre?.assignments.find(a => a.militaryId === militaryId);
        return assignment?.role || '-';
    };

    return (
        <MainLayout activePage="funcoes-turma">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">school</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">Funções de Turma</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Funções por Semestre</p>
                        </div>
                    </div>
                    {!isGuest && (
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Adicionar Funções de Turma
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-slate-400 text-sm mt-4">Carregando...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 z-10">
                                            Militar
                                        </th>
                                        {semestres.map(sem => (
                                            <th key={sem.id} className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center min-w-[150px]">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="flex-1">{sem.name}</span>
                                                    {!isGuest && (
                                                        <button
                                                            onClick={() => handleDeleteSemestre(sem.id)}
                                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Excluir semestre"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        {semestres.length === 0 && (
                                            <th className="p-4 text-center text-slate-400 text-sm">
                                                Nenhum semestre cadastrado
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {militaries.map(military => (
                                        <tr key={military.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                                            {military.rank} {military.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {semestres.map(sem => (
                                                <td key={sem.id} className="p-4 text-center">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {getMilitaryRole(military.id, sem.id)}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </MainLayout.Content>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_circle</span>
                                Adicionar Funções de Turma
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                                    Nome do Semestre
                                </label>
                                <input
                                    type="text"
                                    value={formSemestreName}
                                    onChange={(e) => setFormSemestreName(e.target.value)}
                                    placeholder="Ex: 1º Semestre 2026"
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Militares e Funções
                                    </label>
                                    <button
                                        onClick={handleAddAssignment}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Adicionar Função e Militar
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formAssignments.map((assignment, index) => (
                                        <div key={index} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex-1 space-y-2">
                                                <select
                                                    value={assignment.militaryId}
                                                    onChange={(e) => handleAssignmentChange(index, 'militaryId', e.target.value)}
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                >
                                                    <option value="">Selecione um militar...</option>
                                                    {militaries.map(m => (
                                                        <option key={m.id} value={m.id}>{m.rank} {m.name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={assignment.role}
                                                    onChange={(e) => handleAssignmentChange(index, 'role', e.target.value)}
                                                    placeholder="Função (ex: Chefe de Turma, Subchefe...)"
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                />
                                            </div>
                                            {formAssignments.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveAssignment(index)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default FuncoesTurmaPage;
