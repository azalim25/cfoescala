import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import { Military, Rank } from '../types';
import { useMilitary } from '../contexts/MilitaryContext';

const ContactsPage: React.FC = () => {
  const { militaries, addMilitary, updateMilitary, deleteMilitary } = useMilitary();
  const [editingMilitary, setEditingMilitary] = useState<Military | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newMilitary, setNewMilitary] = useState<Partial<Military>>({
    name: '',
    rank: Rank.CADETE,
    firefighterNumber: '',
    contact: '',
    battalion: 'Guarani'
  });
  const [authCode, setAuthCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilitary) return;

    updateMilitary(editingMilitary);
    setEditingMilitary(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (authCode.toLowerCase() !== 'guarani') {
      alert('Código de autorização incorreto!');
      return;
    }
    const military = {
      name: newMilitary.name as string,
      rank: newMilitary.rank as Rank,
      firefighterNumber: newMilitary.firefighterNumber as string,
      contact: newMilitary.contact as string,
      battalion: newMilitary.battalion as string
    };
    addMilitary(military);
    setIsAdding(false);
    setAuthCode('');
    setNewMilitary({
      name: '',
      rank: Rank.CADETE,
      firefighterNumber: '',
      contact: '',
      battalion: 'Guarani'
    });
  };

  const handleDelete = (id: string) => {
    const code = prompt('Para excluir este militar, digite o código de autorização:');
    if (code?.toLowerCase() === 'guarani') {
      deleteMilitary(id);
    } else if (code !== null) {
      alert('Código incorreto! A exclusão foi cancelada.');
    }
  };



  return (
    <MainLayout activePage="contacts">
      <MainLayout.Content>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Efetivo da Unidade</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                className="pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary w-64 dark:text-white"
                placeholder="Filtrar por nome ou número..."
                type="text"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              Adicionar Militar
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Militar</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº Bombeiro</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posto</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {militaries
                  .filter((m: Military) =>
                    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.firefighterNumber.includes(searchTerm)
                  )
                  .map((m: Military) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-xl">person</span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{m.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-bold">{m.firefighterNumber}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 text-[10px] font-bold rounded uppercase border border-blue-200 dark:border-blue-800">
                          {m.rank}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{m.contact}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingMilitary(m)}
                          className="p-1.5 text-slate-400 hover:text-primary transition-colors border border-slate-100 dark:border-slate-800 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-800 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout.Content>

      <MainLayout.Sidebar>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <h3 className="font-bold text-sm uppercase tracking-tight dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span> Resumo do Efetivo
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Geral</p>
              <p className="text-xl font-bold dark:text-white">{militaries.length}</p>
            </div>
          </div>

        </div>
      </MainLayout.Sidebar>

      {/* Edit Modal */}
      {editingMilitary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">Editar Militar</h2>
              <button onClick={() => setEditingMilitary(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">person</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={editingMilitary.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingMilitary({ ...editingMilitary, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Posto</label>
                  <select
                    value={editingMilitary.rank}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingMilitary({ ...editingMilitary, rank: e.target.value as Rank })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                  >
                    {Object.values(Rank).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nº Bombeiro</label>
                  <input
                    type="text"
                    value={editingMilitary.firefighterNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingMilitary({ ...editingMilitary, firefighterNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                  />
                </div>
              </div>



              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMilitary(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">Adicionar Militar</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">person_add</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newMilitary.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMilitary({ ...newMilitary, name: e.target.value })}
                  placeholder="Ex: ALEXANDRE BRAIT"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Posto</label>
                  <select
                    value={newMilitary.rank}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewMilitary({ ...newMilitary, rank: e.target.value as Rank })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                  >
                    {Object.values(Rank).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nº Bombeiro</label>
                  <input
                    type="text"
                    required
                    value={newMilitary.firefighterNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMilitary({ ...newMilitary, firefighterNumber: e.target.value })}
                    placeholder="Ex: 123.456"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contato</label>
                <input
                  type="text"
                  required
                  value={newMilitary.contact}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMilitary({ ...newMilitary, contact: e.target.value })}
                  placeholder="+55 (11) 99999-9999"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                />
              </div>

              <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Código de Autorização</label>
                <input
                  type="password"
                  required
                  value={authCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthCode(e.target.value)}
                  placeholder="Digite o código da unidade"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none dark:text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default ContactsPage;
