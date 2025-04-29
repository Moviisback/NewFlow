// src/hooks/use-auth.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import firebaseAuthService, { UserProfile, AuthState } from '@/lib/auth-service';

// Default auth state
const defaultAuthState: AuthState = {
  authenticated: false,
  profile: {
    id: '',
    name: '',
    email: '',
    verified: false
  },
  loading: true
};

// Create context
const AuthContext = createContext<{
  authState: AuthState;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  signup: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}>({
  authState: defaultAuthState,
  user: null,
  login: async () => { throw new Error('Not implemented') },
  loginWithGoogle: async () => { throw new Error('Not implemented') },
  signup: async () => { throw new Error('Not implemented') },
  logout: async () => { throw new Error('Not implemented') },
  updateProfile: async () => { throw new Error('Not implemented') },
  sendPasswordResetEmail: async () => { throw new Error('Not implemented') },
  deleteAccount: async () => { throw new Error('Not implemented') }
});

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in
        setUser(user);
        
        // Get user profile from Firestore
        const profile = await firebaseAuthService.getUserProfile(user.uid);
        
        setAuthState({
          authenticated: true,
          profile: profile || {
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            verified: user.emailVerified
          },
          loading: false
        });
      } else {
        // User is signed out
        setUser(null);
        setAuthState({
          ...defaultAuthState,
          loading: false
        });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Authentication methods
  const login = async (email: string, password: string) => {
    return await firebaseAuthService.signInWithEmail(email, password);
  };

  const loginWithGoogle = async () => {
    return await firebaseAuthService.signInWithGoogle();
  };

  const signup = async (email: string, password: string, name: string) => {
    return await firebaseAuthService.signUpWithEmail(email, password, name);
  };

  const logout = async () => {
    await firebaseAuthService.signOut();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user');
    await firebaseAuthService.updateUserProfile(user.uid, data);
    
    // Update local state to reflect changes
    setAuthState(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...data
      }
    }));
  };

  const sendPasswordResetEmail = async (email: string) => {
    await firebaseAuthService.sendPasswordReset(email);
  };

  const deleteAccount = async (password?: string) => {
    await firebaseAuthService.deleteUserAccount(password);
  };

  const value = {
    authState,
    user,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateProfile,
    sendPasswordResetEmail,
    deleteAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;