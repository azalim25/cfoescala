import React from 'react';

interface BrasaoVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BrasaoVideoModal: React.FC<BrasaoVideoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-slate-950 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-800 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 flex justify-between items-center border-b border-slate-800">
                    <div>
                        <h3 className="font-bold text-sm text-white">Brasão Guarani</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Academia de Bombeiros Militar · ASP 2027</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined text-slate-300">close</span>
                    </button>
                </div>
                <video
                    src="/guarani-brasao-motion.mp4"
                    autoPlay
                    loop
                    playsInline
                    controls
                    className="w-full aspect-square bg-black"
                />
            </div>
        </div>
    );
};

export default BrasaoVideoModal;
