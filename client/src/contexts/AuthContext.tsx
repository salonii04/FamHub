import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

// Stand-ins until step 17 (i18n) — real implementations switch the UI language
// and date/number formatting to match the account's saved preference.
const applyServerLanguage = (_language?: string) => {};
const applyRegionalPreferences = (_weekStartDay: number | null | undefined) => {};

interface User {
    id: string;
    email: string;
    name: string;
    is_owner?: boolean;
    role?: string;
    currency?: string;
    avatar_url?: string | null;
    language?: string;
    /** ISO first day of the week (Monday = 1), null = automatic. */
    week_start_day?: number | null;
    /** Family-wide list of optional modules the family has hidden. */
    disabled_modules?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, inviteToken?: string, role?: string) => Promise<void>;
    refreshToken: () => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    updateCurrency: (currency: string) => Promise<void>;
    updateProfile: (data: { name?: string; avatar_url?: string | null }) => Promise<void>;
    disabledModules: string[];
    isModuleEnabled: (key: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_EXPIRED_EVENT = 'openfamily:auth-expired';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const clearSession = () => {
            api.logout();
            localStorage.removeItem('user');
            if (mounted) {
                setUser(null);
            }
        };

        const onAuthExpired = () => {
            clearSession();
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);

        const bootstrapSession = async () => {
            const token = api.getToken();
            if (!token) {
                if (mounted) {
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await api.get<{ success: boolean; data: { user: User } }>('/api/auth/me');
                if (!mounted) {
                    return;
                }

                if (response.success && response.data?.user) {
                    setUser(response.data.user);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    applyServerLanguage(response.data.user.language);
                    applyRegionalPreferences(response.data.user.week_start_day);
                } else {
                    clearSession();
                }
            } catch (error) {
                console.error('Failed to restore session:', error);
                let cached: User | null = null;
                try {
                    cached = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
                } catch {
                    cached = null;
                }
                if (api.getToken() && cached?.id) {
                    if (mounted) {
                        setUser(cached);
                    }
                } else {
                    clearSession();
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void bootstrapSession();

        return () => {
            mounted = false;
            window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
        };
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.login(email, password);
        if (response.success && response.user) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            applyServerLanguage(response.user.language);
            applyRegionalPreferences(response.user.week_start_day);
        }
    };

    const register = async (email: string, password: string, name: string, inviteToken?: string, role?: string) => {
        const response = await api.register(email, password, name, inviteToken, role);
        if (response.success && response.user) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
            applyServerLanguage(response.user.language);
            applyRegionalPreferences(response.user.week_start_day);
        }
    };

    const refreshToken = async () => {
        const response = await api.refreshToken();
        if (response.success && response.user) {
            setUser(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
    };

    const logout = () => {
        api.logout();
        setUser(null);
        applyRegionalPreferences(null);
        localStorage.removeItem('user');
    };

    const updateCurrency = async (currency: string) => {
        const response = await api.put<{ success: boolean; data: { user: User } }>('/api/auth/currency', { currency });
        if (response.success && response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
    };

    const updateProfile = async (data: { name?: string; avatar_url?: string | null }) => {
        const response = await api.put<{ success: boolean; data: { user: User } }>('/api/auth/profile', data);
        if (response.success && response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
    };

    const disabledModules = user?.disabled_modules ?? [];
    const isModuleEnabled = (key: string) => !disabledModules.includes(key);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                refreshToken,
                logout,
                isAuthenticated: !!user,
                updateCurrency,
                updateProfile,
                disabledModules,
                isModuleEnabled,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};