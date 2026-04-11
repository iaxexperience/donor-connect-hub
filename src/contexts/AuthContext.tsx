import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'gestor' | 'operador' | 'visualizador';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.email!, session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.email!, session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userEmail: string, userId: string) => {
    try {
      setLoading(true);
      
      // Primeiro tentamos pelo ID (forma oficial)
      let { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      // Se não achar pelo ID, buscamos pelo e-mail e vinculamos o ID novo
      if (!data && !error) {
        const { data: emailData, error: emailError } = await supabase
          .from('profiles')
          .select('role')
          .eq('email', userEmail)
          .maybeSingle();
          
        if (emailData && !emailError) {
          data = emailData;
          // Aproveitamos para vincular o ID novo do Supabase Auth ao perfil existente
          await supabase.from('profiles').update({ id: userId }).eq('email', userEmail);
        }
      }
      
      if (error) {
        console.error('Error fetching role:', error);
        setRole('visualizador');
      } else if (data) {
        setRole(data.role as UserRole);
      } else {
        setRole('visualizador');
      }
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
      setRole('visualizador');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
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
