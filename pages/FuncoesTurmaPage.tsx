import React, { useState, useEffect, useMemo } from 'react';
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
    const { isModerator } = useAuth();
    const [semestres, setSemestres] = useState<Semestre[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSemestreId, setEditingSemestreId] = useState<string | null>(null);

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
        setEditingSemestreId(null);
        setFormSemestreName('');
        setFormAssignments([{ militaryId: '', role: '' }]);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (semestre: Semestre) => {
        setEditingSemestreId(semestre.id);
        setFormSemestreName(semestre.name);
        setFormAssignments(semestre.assignments.length > 0 ? semestre.assignments : [{ militaryId: '', role: '' }]);
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

            if (editingSemestreId) {
                // Update existing semestre
                const { error: updateError } = await supabase
                    .from('funcoes_turma_semestre')
                    .update({ name: formSemestreName })
                    .eq('id', editingSemestreId);

                if (updateError) throw updateError;

                // Delete old assignments
                const { error: deleteError } = await supabase
                    .from('funcoes_turma_assignments')
                    .delete()
                    .eq('semestre_id', editingSemestreId);

                if (deleteError) throw deleteError;

                // Insert new assignments
                if (validAssignments.length > 0) {
                    const { error: insertError } = await supabase
                        .from('funcoes_turma_assignments')
                        .insert(
                            validAssignments.map(a => ({
                                semestre_id: editingSemestreId,
                                military_id: a.militaryId,
                                role: a.role
                            }))
                        );

                    if (insertError) throw insertError;
                }
            } else {
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
    const sortedMilitaries = useMemo(() => {
        return [...militaries].sort((a, b) => {
            const aAnt = a.antiguidade || 999999;
            const bAnt = b.antiguidade || 999999;
            if (aAnt !== bAnt) return aAnt - bAnt;
            return a.warName.localeCompare(b.warName);
        });
    }, [militaries]);

    const getMilitaryRole = (militaryId: string, semestreId: string): string => {
        const semestre = semestres.find(s => s.id === semestreId);
        const assignment = semestre?.assignments.find(a => a.militaryId === militaryId);
        return assignment?.role || '-';
    };

    return (
        <MainLayout activePage="funcoes-turma">
            <MainLayout.Content>
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-2xl sm:text-3xl">school</span>
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none">Funções de Turma</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão por Semestre</p>
                        </div>
                    </div>
                    {isModerator && (
                        <button
                            onClick={handleOpenAddModal}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Novo Semestre
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8 sm:mb-0">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-400 text-sm mt-4">Carregando...</p>
                        </div>
                    ) : semestres.length === 0 ? (
                        <div className="py-20 text-center text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-2">school</span>
                            <p className="text-sm font-bold">Nenhuma função de turma cadastrada.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50 dark:bg-slate-800/50 z-10 w-64">
                                                Militar
                                            </th>
                                            {semestres.map(sem => (
                                                <th key={sem.id} className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center min-w-[180px]">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="flex-1 text-center">{sem.name}</span>
                                                        {isModerator && (
                                                            <div className="flex gap-1 shrink-0">
                                                                <button
                                                                    onClick={() => handleOpenEditModal(sem)}
                                                                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                                                                    title="Editar semestre"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSemestre(sem.id)}
                                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                    title="Excluir semestre"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {sortedMilitaries.map(military => (
                                            <tr key={military.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                        </div>
                                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                            {military.rank} {military.warName}
                                                        </p>
                                                    </div>
                                                </td>
                                                {semestres.map(sem => {
                                                    const role = getMilitaryRole(military.id, sem.id);
                                                    return (
                                                        <td key={sem.id} className="p-4 text-center">
                                                            <span className={`text-xs font-bold leading-tight ${role !== '-' ? 'text-primary' : 'text-slate-400'}`}>
                                                                {role}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile/Tablet Card View */}
                            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                {sortedMilitaries.map(military => {
                                    const assignments = semestres
                                        .map(sem => ({ semestre: sem.name, role: getMilitaryRole(military.id, sem.id), id: sem.id, raw: sem }))
                                        .filter(a => a.role !== '-');

                                    if (assignments.length === 0) return null;

                                    return (
                                        <div key={military.id} className="p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0">
                                                    <span className="material-symbols-outlined text-base">person</span>
                                                </div>
                                                <p className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                                    {military.rank} {military.warName}
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {assignments.map(a => (
                                                    <div key={a.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{a.semestre}</p>
                                                            <p className="text-xs font-bold text-primary uppercase">{a.role}</p>
                                                        </div>
                                                        {isModerator && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleOpenEditModal(a.raw)}
                                                                    className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {sortedMilitaries.every(military =>
                                    semestres.every(sem => getMilitaryRole(military.id, sem.id) === '-')
                                ) && (
                                        <div className="py-12 text-center text-slate-400">
                                            <p className="text-xs font-bold px-6">Nenhuma função atribuída neste período.</p>
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </div>
            </MainLayout.Content>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">
                                    {editingSemestreId ? 'edit' : 'add_circle'}
                                </span>
                                {editingSemestreId ? 'Editar Funções de Turma' : 'Adicionar Funções de Turma'}
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
                                                    {sortedMilitaries.map(m => (
                                                        <option key={m.id} value={m.id}>{m.rank} {m.warName}</option>
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
