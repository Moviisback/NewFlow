// src/hooks/use-auth.tsx
"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import firebaseAuthService, { UserProfile, AuthState } from '@/lib/auth-service';

// Default auth state
const defaultAuthState: AuthState = {
  authenticated: false,
  profile: {
    id: '',
    name: '',
    email: '',
    phone: '',
    photoUrl: '',
    verified: false,
    provider: ''
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
    const unsubscribe = onAuthStateChanged(firebaseAuthService.auth, async (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
        
        try {
          // Get user profile from Firestore
          const profile = await firebaseAuthService.getUserProfile(currentUser.uid);
          
          setAuthState({
            authenticated: true,
            profile: profile || firebaseAuthService.mapUserToProfile(currentUser),
            loading: false
          });
        } catch (error) {
          console.error("Error getting user profile:", error);
          // Set default profile with current user data
          setAuthState({
            authenticated: true,
            profile: firebaseAuthService.mapUserToProfile(currentUser),
            loading: false
          });
        }
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

  // Authentication methods with proper return types
  const login = async (email: string, password: string): Promise<User> => {
    const userCredential = await firebaseAuthService.signInWithEmail(email, password);
    return userCredential.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    const userCredential = await firebaseAuthService.signInWithGoogle();
    return userCredential.user;
  };

  const signup = async (email: string, password: string, name: string): Promise<User> => {
    const userCredential = await firebaseAuthService.signUpWithEmail(email, password, name);
    return userCredential.user;
  };

  const logout = async (): Promise<void> => {
    await firebaseAuthService.signOut();
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<void> => {
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

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await firebaseAuthService.sendPasswordReset(email);
  };

  const deleteAccount = async (password?: string): Promise<void> => {
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