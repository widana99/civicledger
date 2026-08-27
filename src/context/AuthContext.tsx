import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Role } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: Role, wilayahId?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  verifyOtp: (params: { email?: string; token: string; type: 'email' }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const MOCK_STORAGE_KEY = 'civicledger_mock_session';

function getMockSession(): { session: Session; profile: Profile } | null {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setMockSession(data: { session: Session; profile: Profile } | null) {
  try {
    if (data) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(MOCK_STORAGE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, userObj?: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        return data as Profile;
      }

      // Auto-create / fallback profile if not found in database (e.g. first-time Google OAuth sign-in)
      let currentUser = userObj;
      if (!currentUser) {
        const { data: userData } = await supabase.auth.getUser();
        currentUser = userData?.user;
      }

      const meta = currentUser?.user_metadata || {};
      const email = currentUser?.email || meta.email || '';
      const fullName = meta.full_name || meta.name || (email ? email.split('@')[0] : 'Warga');
      const phone = currentUser?.phone || meta.phone || null;

      const newProfile = {
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: 'masyarakat' as Role,
        is_active: true,
      };

      try {
        const { data: inserted } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select('*')
          .maybeSingle();

        if (inserted) {
          setProfile(inserted as Profile);
          return inserted as Profile;
        }
      } catch (_) {}

      // Guaranteed fallback in-memory profile so user is NEVER locked out
      const fallbackProfile: Profile = {
        id: userId,
        email: email || 'warga@civicledger.id',
        full_name: fullName || 'Warga Terdaftar',
        phone: phone || null,
        role: 'masyarakat',
        wilayah_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      console.error('fetchProfile error, applying fallback profile:', err);
      const fallbackProfile: Profile = {
        id: userId,
        email: 'warga@civicledger.id',
        full_name: 'Warga Terdaftar',
        phone: null,
        role: 'masyarakat',
        wilayah_id: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      const mock = getMockSession();
      if (mock && mock.session.user.id === session.user.id) {
        setProfile(mock.profile);
        return;
      }
      await fetchProfile(session.user.id, session.user);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data.session?.user?.id) {
          setSession(data.session);
          fetchProfile(data.session.user.id, data.session.user).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          const mock = getMockSession();
          if (mock) {
            setSession(mock.session);
            setProfile(mock.profile);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Session get error:', err);
        const mock = getMockSession();
        if (mock) {
          setSession(mock.session);
          setProfile(mock.profile);
        }
        if (mounted) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user?.id) {
          await fetchProfile(newSession.user.id, newSession.user);
        } else {
          const mock = getMockSession();
          if (mock) {
            setProfile(mock.profile);
          } else {
            setProfile(null);
          }
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: Role,
    wilayahId?: string
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setMockSession(null);
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          wilayah_id: wilayahId || null,
        });

        if (profileError) throw profileError;
      }

      return { error: null };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (import.meta.env.DEV && (msg.includes('Failed to fetch') || msg.includes('fetch'))) {
        // Fallback: Local dev mode only — never in production
        const mockProfile: Profile = {
          id: 'dev-user-' + Date.now(),
          email,
          full_name: fullName,
          phone: phone || null,
          role,
          wilayah_id: wilayahId || null,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        const mockSess = {
          access_token: 'mock-dev-token',
          user: { id: mockProfile.id, email: mockProfile.email },
        } as unknown as Session;

        setMockSession({ session: mockSess, profile: mockProfile });
        setSession(mockSess);
        setProfile(mockProfile);
        return { error: null };
      }
      return { error: translateAuthError(msg) };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session?.user?.id) {
        setMockSession(null);
        setSession(data.session);
        await fetchProfile(data.session.user.id);
      }
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (import.meta.env.DEV && (msg.includes('Failed to fetch') || msg.includes('fetch'))) {
        // Fallback: Local dev mode only — never in production
        const mockProfile: Profile = {
          id: 'dev-user-admin',
          email,
          full_name: email.split('@')[0],
          phone: null,
          role: 'admin',
          wilayah_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        const mockSess = {
          access_token: 'mock-dev-token',
          user: { id: mockProfile.id, email: mockProfile.email },
        } as unknown as Session;

        setMockSession({ session: mockSess, profile: mockProfile });
        setSession(mockSess);
        setProfile(mockProfile);
        return { error: null };
      }
      return { error: translateAuthError(msg) };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Gagal masuk dengan Google' };
    }
  };

  const verifyOtp = async (params: {
    email?: string;
    token: string;
    type: 'email';
  }): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: params.email!,
        token: params.token,
        type: 'email' as const,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: translateAuthError(err?.message || String(err)) };
    }
  };

  const signOut = async () => {
    setMockSession(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore offline error
    }
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signIn, signInWithGoogle, verifyOtp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Email atau kata sandi salah';
  }
  if (message.includes('User already registered')) {
    return 'Email sudah terdaftar. Silakan masuk.';
  }
  if (message.includes('Password should be at least')) {
    return 'Kata sandi minimal 6 karakter';
  }
  if (message.includes('Unable to validate email address')) {
    return 'Format email tidak valid';
  }
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


