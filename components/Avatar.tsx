import React from 'react';
import { getAvatarDataUri } from '../utils/avatarUtils';
import { useInterfaceTheme } from '../contexts/InterfaceThemeContext';
import { useMilitary } from '../contexts/MilitaryContext';

interface AvatarProps {
    seed: string;
    size?: number;
    className?: string;
    /**
     * What to render in the classic theme (avatars are a Nova Interface
     * feature only):
     * - 'icon' (default): the original generic "person" circle, for spots
     *   that already had one before avatars existed (keeps classic pixel-
     *   identical to how it always looked).
     * - 'none': render nothing, for spots where the avatar is new and
     *   classic never showed any placeholder there.
     */
    fallback?: 'icon' | 'none';
}

const Avatar: React.FC<AvatarProps> = ({ seed, size = 40, className = '', fallback = 'icon' }) => {
    const { interfaceTheme } = useInterfaceTheme();
    const { militaries } = useMilitary();

    // `seed` is normally a military ID. If that military has picked a custom
    // avatar (Minha Escala), use their chosen seed instead so the same
    // avatar shows up consistently everywhere they appear in the app.
    const resolvedSeed = militaries.find(m => m.id === seed)?.avatarSeed || seed;

    if (interfaceTheme !== 'nova') {
        if (fallback === 'none') return null;
        return (
            <div
                className={`rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: Math.round(size * 0.5) }}>person</span>
            </div>
        );
    }

    return (
        <img
            src={getAvatarDataUri(resolvedSeed)}
            alt=""
            width={size}
            height={size}
            className={`rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

export default Avatar;
