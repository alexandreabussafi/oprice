import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppRole, BusinessUnitAccess } from '../types';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    role: AppRole;
    allowed_types: BusinessUnitAccess[];
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchProfile(userId: string, retries = 3): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error.message, error.code);
                // If it's a "row not found" error, the trigger might still be running.
                if (error.code === 'PGRST116' && retries > 0) {
                    console.log(`Profile not found yet, retrying in 1s... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return fetchProfile(userId, retries - 1);
                }
                // Profile fetch truly failed - return false
                return false;
            }

            if (data) {
                setProfile(data as UserProfile);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in fetchProfile:', error);
            return false;
        }
    }

    useEffect(() => {
        let isMounted = true;

        // Safety timeout: if auth takes too long (e.g. Supabase offline/slow),
        // unlock the app after 8 seconds to prevent permanent loading state.
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                console.warn('Auth safety timeout triggered - forcing loading to false');
                setLoading(false);
            }
        }, 8000);

        // 1. Initial manual check
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            if (!isMounted) return;
            setSession(initialSession);
            setUser(initialSession?.user ?? null);

            if (initialSession?.user) {
                fetchProfile(initialSession.user.id).finally(() => {
                    if (isMounted) {
                        clearTimeout(safetyTimeout);
                        setLoading(false);
                    }
                });
            } else {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        }).catch((err) => {
            console.error('Failed to get initial session:', err);
            if (isMounted) {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        });

        // 2. Subscribe to changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isMounted) return;
            console.log('Auth state changed event:', event);

            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                await fetchProfile(newSession.user.id);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        console.log('AuthContext: signOut initiated');

        // Helper: race signOut against a timeout
        const signOutWithTimeout = () =>
            Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000))
            ]);

        try {
            await signOutWithTimeout();
            console.log('AuthContext: Supabase signOut completed');
        } catch (error) {
            console.warn('AuthContext: signOut timed out or failed, forcing cleanup:', error);
        }

        // Always run cleanup regardless of whether signOut succeeded
        // 1. Clear ALL Supabase-related localStorage keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
                localStorage.removeItem(key);
            }
        });

        // 2. Clear React state
        setSession(null);
        setUser(null);
        setProfile(null);

        // 3. Hard reload
        console.log('AuthContext: forcing page reload');
        window.location.replace('/');
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
