import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/MainLayout';
import Avatar from '../components/Avatar';
import { useAuth } from '../contexts/AuthContext';
import { useMilitary } from '../contexts/MilitaryContext';
import { useAcademic } from '../contexts/AcademicContext';
import { useGrades } from '../contexts/GradesContext';
import { supabase } from '../supabase';
import { disciplineWeight, rankMilitaries } from '../utils/gradeUtils';

const NOTAS_CONTROLLER_PASSWORD = 'trindade182';

const NotasPage: React.FC = () => {
    const { session } = useAuth();
    const { militaries } = useMilitary();
    const { disciplines, updateDiscipline } = useAcademic();
    const { grades, setGrade } = useGrades();

    const [userProfile, setUserProfile] = useState<{ name: string } | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [unlocked, setUnlocked] = useState(false);

    const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
    const [draftScores, setDraftScores] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchProfile = async () => {
            if (!session?.user) {
                setProfileLoading(false);
                return;
            }
            const { data } = await supabase.from('profiles').select('name').eq('id', session.user.id).single();
            setUserProfile(data);
            setProfileLoading(false);
        };
        fetchProfile();
    }, [session]);

    const isTrindade = !!userProfile?.name?.toLowerCase().includes('trindade');

    const sortedDisciplines = useMemo(() =>
        [...disciplines].sort((a, b) => a.name.localeCompare(b.name))
        , [disciplines]);

    useEffect(() => {
        if (!selectedDisciplineId && sortedDisciplines.length > 0) {
            setSelectedDisciplineId(sortedDisciplines[0].id);
        }
    }, [sortedDisciplines, selectedDisciplineId]);

    const ranking = useMemo(() =>
        rankMilitaries(militaries, grades, disciplines)
        , [militaries, grades, disciplines]);

    const rankingByMilitaryId = useMemo(() => {
        const map = new Map<string, typeof ranking[number]>();
        ranking.forEach(r => map.set(r.militaryId, r));
        return map;
    }, [ranking]);

    const pendingByDiscipline = useMemo(() => {
        return sortedDisciplines.map(d => {
            const pendingMilitaries = militaries.filter(m =>
                !grades.some(g => g.militaryId === m.id && g.disciplineId === d.id && g.score !== null && g.score !== undefined)
            );
            return { discipline: d, pendingMilitaries };
        }).filter(entry => entry.pendingMilitaries.length > 0);
    }, [sortedDisciplines, militaries, grades]);

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === NOTAS_CONTROLLER_PASSWORD) {
            setUnlocked(true);
            setPasswordError(null);
        } else {
            setPasswordError('Senha incorreta.');
        }
    };

    const getScoreValue = (militaryId: string, disciplineId: string): string => {
        const draftKey = `${militaryId}:${disciplineId}`;
        if (draftKey in draftScores) return draftScores[draftKey];
        const grade = grades.find(g => g.militaryId === militaryId && g.disciplineId === disciplineId);
        return grade?.score !== null && grade?.score !== undefined ? String(grade.score) : '';
    };

    const handleScoreChange = (militaryId: string, disciplineId: string, value: string) => {
        setDraftScores(prev => ({ ...prev, [`${militaryId}:${disciplineId}`]: value }));
    };

    const handleScoreBlur = async (militaryId: string, disciplineId: string) => {
        const draftKey = `${militaryId}:${disciplineId}`;
        const raw = draftScores[draftKey];
        if (raw === undefined) return;

        const trimmed = raw.trim().replace(',', '.');
        const parsed = trimmed === '' ? null : parseFloat(trimmed);
        if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 10)) {
            alert('A nota deve ser um número entre 0 e 10.');
            return;
        }
        // Normaliza para no máximo 3 casas decimais (ex: 9.999), evitando
        // artefatos de ponto flutuante na hora de somar/comparar médias.
        const score = parsed !== null ? Math.round(parsed * 1000) / 1000 : null;
        await setGrade(militaryId, disciplineId, score);
        setDraftScores(prev => {
            const next = { ...prev };
            delete next[draftKey];
            return next;
        });
    };

    if (profileLoading) {
        return (
            <MainLayout activePage="notas">
                <MainLayout.Content>
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </MainLayout.Content>
            </MainLayout>
        );
    }

    if (!isTrindade) {
        return (
            <MainLayout activePage="notas">
                <MainLayout.Content>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-12 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                            <span className="material-symbols-outlined text-3xl">block</span>
                        </div>
                        <h2 className="text-xl font-black text-red-600 dark:text-red-400 uppercase tracking-wide">Você não tem acesso.</h2>
                        <p className="text-sm text-slate-500 font-medium">Esta página é restrita ao controlador de notas do curso.</p>
                    </div>
                </MainLayout.Content>
            </MainLayout>
        );
    }

    if (!unlocked) {
        return (
            <MainLayout activePage="notas">
                <MainLayout.Content>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-3xl">lock</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Controle de Notas</h2>
                        <p className="text-sm text-slate-500 font-medium">Digite a senha para acessar.</p>
                        <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="Senha"
                                autoFocus
                                className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-primary/50 transition-all text-center"
                            />
                            {passwordError && <p className="text-xs font-bold text-red-500">{passwordError}</p>}
                            <button
                                type="submit"
                                className="w-full h-12 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                            >
                                Entrar
                            </button>
                        </form>
                    </div>
                </MainLayout.Content>
            </MainLayout>
        );
    }

    const selectedDiscipline = sortedDisciplines.find(d => d.id === selectedDisciplineId);

    return (
        <MainLayout activePage="notas">
            <MainLayout.Content>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">grade</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 uppercase">Controle de Notas</h2>
                            <p className="text-xs text-slate-500 font-medium">Classificação do CFO II • Média ponderada por carga horária</p>
                        </div>
                    </div>
                </div>

                {/* Lançar notas */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                            <span className="material-symbols-outlined text-primary text-xl">edit_note</span>
                            Lançar Notas
                        </h3>
                        <select
                            value={selectedDisciplineId}
                            onChange={(e) => setSelectedDisciplineId(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {sortedDisciplines.map(d => (
                                <option key={d.id} value={d.id}>{d.name} (Peso {disciplineWeight(d.totalHours)})</option>
                            ))}
                        </select>
                    </div>

                    {selectedDiscipline && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Militar</th>
                                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 w-32 text-center">Nota (0–10, até 3 decimais)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {militaries.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar seed={m.id} size={28} fallback="none" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{m.rank} {m.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2.5 text-center">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={getScoreValue(m.id, selectedDiscipline.id)}
                                                    onChange={(e) => handleScoreChange(m.id, selectedDiscipline.id, e.target.value)}
                                                    onBlur={() => handleScoreBlur(m.id, selectedDiscipline.id)}
                                                    placeholder="—"
                                                    className="w-20 h-9 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-center text-slate-700 dark:text-slate-200 outline-none focus:border-primary/50 transition-all"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Classificação geral */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                            <span className="material-symbols-outlined text-primary text-xl">leaderboard</span>
                            Classificação CFO II
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Pos.</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">Militar</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Média</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 text-center">Lançadas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {ranking.map(r => {
                                    const m = militaries.find(mil => mil.id === r.militaryId);
                                    if (!m) return null;
                                    return (
                                        <tr key={r.militaryId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-2.5 text-center">
                                                <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-xs">{r.rank}</span>
                                            </td>
                                            <td className="px-6 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar seed={m.id} size={28} fallback="none" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{m.rank} {m.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-2.5 text-center">
                                                <span className="font-black text-primary text-sm">{r.average.toFixed(3)}</span>
                                            </td>
                                            <td className="px-6 py-2.5 text-center">
                                                <span className="text-xs font-bold text-slate-500">{r.gradedCount}/{r.totalCount}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quem está devendo nota */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                            <span className="material-symbols-outlined text-amber-500 text-xl">warning</span>
                            Pendências (possível 2ª chamada)
                        </h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {pendingByDiscipline.length === 0 ? (
                            <p className="text-sm text-slate-400 font-medium italic text-center py-6">Nenhuma pendência — todas as notas lançadas.</p>
                        ) : pendingByDiscipline.map(({ discipline, pendingMilitaries }) => (
                            <div key={discipline.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                                <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">{discipline.name}</p>
                                <div className="flex flex-wrap gap-2">
                                    {pendingMilitaries.map(m => (
                                        <span key={m.id} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-[11px] font-bold">
                                            {m.rank} {m.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mostra de prova */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-6 mb-6">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase">
                            <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
                            Mostra de Prova
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sortedDisciplines.map(d => (
                            <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                                <button
                                    onClick={() => updateDiscipline(d.id, { mostraProvaFeita: !d.mostraProvaFeita })}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${d.mostraProvaFeita
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm">{d.mostraProvaFeita ? 'check_circle' : 'radio_button_unchecked'}</span>
                                    {d.mostraProvaFeita ? 'Feita' : 'Não feita'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </MainLayout.Content>
        </MainLayout>
    );
};

export default NotasPage;
