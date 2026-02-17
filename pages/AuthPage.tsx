

import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
    const { loginAsGuest } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [fullName, setFullName] = useState('');
    const [firefighterNumber, setFirefighterNumber] = useState('');

    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Normalize inputs: trim spaces and remove non-digits from firefighter number for the email
        const cleanName = fullName.trim();
        const cleanNumber = firefighterNumber.trim();
        const internalEmail = `${cleanNumber.replace(/\D/g, '')}@guarani.mil`;
        const internalPassword = 'guarani2026'; // Standard internal password for all users

        try {
            if (isSignUp) {
                // Validate against militaries list (Contacts)
                const { data: militaries, error: militariesError } = await supabase
                    .from('militaries')
                    .select('fullName:full_name, warName:war_name, firefighterNumber:firefighter_number');

                if (militariesError) throw militariesError;

                const normalizedInputNumber = cleanNumber.replace(/\D/g, '');
                const inputNameWords = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 0);

                const isValidMilitary = militaries?.some(m => {
                    const normalizedMilNumber = m.firefighterNumber.replace(/\D/g, '');
                    const milWarNameStr = m.warName.toLowerCase();
                    const milFullNameStr = m.fullName?.toLowerCase() || '';

                    const numberMatch = normalizedMilNumber === normalizedInputNumber;
                    const nameMatch = inputNameWords.some(word =>
                        milWarNameStr.includes(word) || milFullNameStr.includes(word)
                    );

                    return numberMatch && nameMatch;
                });

                if (!isValidMilitary) {
                    setError('Cadastro Indeferido.');
                    setLoading(false);
                    return;
                }

                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: internalEmail,
                    password: internalPassword,
                    options: {
                        data: {
                            full_name: cleanName,
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: data.user.id,
                                name: cleanName,
                                firefighter_number: cleanNumber
                            }
                        ]);

                    if (profileError) console.error("Error creating profile:", profileError);

                    alert("Cadastro realizado com sucesso! Você já pode acessar o sistema.");
                    setIsSignUp(false);
                }
            } else {
                // Simplified login: all users now use the universal internal password
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: internalEmail,
                    password: internalPassword,
                });

                if (signInError) throw signInError;

                navigate('/');
            }
        } catch (err: any) {
            setError(isSignUp ? 'Erro ao realizar cadastro. O número pode já estar em uso.' : 'Acesso negado. Verifique o Nome de Guerra e Número de Bombeiro.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = () => {
        loginAsGuest();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-primary/30 overflow-y-auto">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in py-8 sm:py-0">
                <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
                    <div className="text-center mb-6 sm:mb-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-primary/20 rotate-3 shrink-0">
                            <span className="material-symbols-outlined text-2xl sm:text-3xl">shield</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">CFO • GUARANI</h1>
                        <p className="text-slate-400 text-[10px] sm:text-sm mt-2 font-black uppercase tracking-widest">
                            {isSignUp ? 'Crie sua conta no sistema' : 'Sistema de Gestão Militar'}
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-bold mb-6 text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome de Guerra</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Ex: Sgt. Smith"
                                className="w-full bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Número de Bombeiro</label>
                            <input
                                type="text"
                                required
                                value={firefighterNumber}
                                onChange={(e) => setFirefighterNumber(e.target.value)}
                                placeholder="Ex: 123.456"
                                className="w-full bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-4 text-xs sm:text-sm uppercase tracking-widest"
                        >
                            {loading ? 'Aguarde...' : isSignUp ? 'Criar Cadastro' : 'Acessar Sistema'}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#0f172a] px-2 text-slate-500 font-bold">ou</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGuestLogin}
                            className="w-full bg-slate-800/30 border border-slate-700 text-slate-300 font-bold py-4 rounded-xl hover:bg-slate-800 hover:border-slate-600 active:scale-[0.98] transition-all text-[10px] sm:text-xs uppercase tracking-widest"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg sm:text-xl">visibility</span>
                                Entrar como Visitante
                            </span>
                        </button>
                    </form>

                    <div className="mt-8 text-center text-xs sm:text-sm">
                        <p className="text-slate-500 font-medium">
                            {isSignUp ? 'Já possui cadastro?' : 'Novo bombeiro na unidade?'}
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-primary font-bold ml-2 hover:underline decoration-2 underline-offset-4"
                            >
                                {isSignUp ? 'Fazer Login' : 'Cadastrar-se'}
                            </button>
                        </p>
                    </div>
                </div>


            </div>
        </div>
    );
};

export default AuthPage;
