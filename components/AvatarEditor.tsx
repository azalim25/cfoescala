import React, { useState } from 'react';
import { AvatarConfig } from '../types';
import { AVATAR_OPTIONS, AVATAR_LABELS, getAvatarDataUriFromConfig, randomAvatarConfig } from '../utils/avatarUtils';

interface AvatarEditorProps {
    initialConfig?: AvatarConfig;
    /** When a moderator is editing someone else's avatar, show whose. */
    targetName?: string;
    isSaving: boolean;
    onSave: (config: AvatarConfig) => void;
    onClose: () => void;
}

type EnumTrait = 'hair' | 'eyes' | 'mouth' | 'nose' | 'body';
type ColorTrait = 'hairColor' | 'skinColor' | 'clothingColor';

const ENUM_SECTIONS: { key: EnumTrait; label: string; icon: string }[] = [
    { key: 'hair', label: 'Cabelo', icon: 'content_cut' },
    { key: 'eyes', label: 'Olhos', icon: 'visibility' },
    { key: 'mouth', label: 'Boca', icon: 'sentiment_satisfied' },
    { key: 'nose', label: 'Nariz', icon: 'face' },
    { key: 'body', label: 'Roupa (Estilo)', icon: 'checkroom' },
];

const COLOR_SECTIONS: { key: ColorTrait; label: string }[] = [
    { key: 'skinColor', label: 'Cor da Pele' },
    { key: 'hairColor', label: 'Cor do Cabelo' },
    { key: 'clothingColor', label: 'Cor da Roupa' },
];

const AvatarEditor: React.FC<AvatarEditorProps> = ({ initialConfig, targetName, isSaving, onSave, onClose }) => {
    const [draft, setDraft] = useState<AvatarConfig>(initialConfig || randomAvatarConfig());

    const setTrait = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">face_retouching_natural</span>
                        Editar Avatar
                    </h3>
                    {targetName && (
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mt-1 ml-6">
                            Editando o avatar de {targetName}
                        </p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="flex justify-center mb-6">
                <img
                    src={getAvatarDataUriFromConfig(draft)}
                    alt="Prévia do avatar"
                    width={112}
                    height={112}
                    className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 shadow-sm"
                />
            </div>

            <div className="space-y-5">
                {ENUM_SECTIONS.map(section => (
                    <div key={section.key}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">{section.icon}</span>
                            {section.label}
                        </p>
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {AVATAR_OPTIONS[section.key].map(option => {
                                const previewConfig = { ...draft, [section.key]: option };
                                const isSelected = draft[section.key] === option;
                                return (
                                    <button
                                        key={option}
                                        title={AVATAR_LABELS[option] || option}
                                        onClick={() => setTrait(section.key, option)}
                                        className={`shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <img
                                            src={getAvatarDataUriFromConfig(previewConfig)}
                                            alt={AVATAR_LABELS[option] || option}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800"
                                        />
                                        <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 max-w-[56px] truncate">
                                            {AVATAR_LABELS[option] || option}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Facial hair — includes a "none" option */}
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">face_6</span>
                        Pelos Faciais
                    </p>
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        <button
                            onClick={() => setTrait('facialHair', null)}
                            className={`shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${draft.facialHair === null ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <img
                                src={getAvatarDataUriFromConfig({ ...draft, facialHair: null })}
                                alt="Nenhuma"
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800"
                            />
                            <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400">Nenhuma</span>
                        </button>
                        {AVATAR_OPTIONS.facialHair.map(option => {
                            const previewConfig = { ...draft, facialHair: option };
                            const isSelected = draft.facialHair === option;
                            return (
                                <button
                                    key={option}
                                    title={AVATAR_LABELS[option] || option}
                                    onClick={() => setTrait('facialHair', option)}
                                    className={`shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <img
                                        src={getAvatarDataUriFromConfig(previewConfig)}
                                        alt={AVATAR_LABELS[option] || option}
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800"
                                    />
                                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 max-w-[56px] truncate">
                                        {AVATAR_LABELS[option] || option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {COLOR_SECTIONS.map(section => (
                    <div key={section.key}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{section.label}</p>
                        <div className="flex gap-2 flex-wrap">
                            {AVATAR_OPTIONS[section.key].map(color => {
                                const isSelected = draft[section.key] === color;
                                return (
                                    <button
                                        key={color}
                                        title={`#${color}`}
                                        onClick={() => setTrait(section.key, color)}
                                        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${isSelected ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-slate-900' : ''
                                            }`}
                                        style={{ backgroundColor: `#${color}` }}
                                    >
                                        {isSelected && <span className="material-symbols-outlined text-white text-base drop-shadow">check</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setDraft(randomAvatarConfig())}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-lg">casino</span>
                    Aleatório
                </button>
                <button
                    onClick={() => onSave(draft)}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-lg">{isSaving ? 'sync' : 'check'}</span>
                    {isSaving ? 'Salvando...' : 'Salvar Avatar'}
                </button>
            </div>
        </div>
    );
};

export default AvatarEditor;
