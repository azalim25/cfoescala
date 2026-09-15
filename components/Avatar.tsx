import React from 'react';
import { getAvatarDataUri } from '../utils/avatarUtils';

interface AvatarProps {
    seed: string;
    size?: number;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ seed, size = 40, className = '' }) => {
    return (
        <img
            src={getAvatarDataUri(seed)}
            alt=""
            width={size}
            height={size}
            className={`rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

export default Avatar;
