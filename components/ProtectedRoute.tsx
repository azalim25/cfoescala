import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireModerator = false }: { children: React.ReactNode; requireModerator?: boolean }) => {
    const { session, isGuest, isModerator, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!session && !isGuest) {
        return <Navigate to="/auth" />;
    }

    if (requireModerator && !isModerator) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
