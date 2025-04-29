// src/lib/auth-service.ts
import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  sendEmailVerification,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from './firebase';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Define User Profile interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl: string;
  verified: boolean;
  provider: string;
}

// Define Auth State interface
export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  profile: UserProfile;
}

// Firebase Auth Service
const firebaseAuthService = {
  // Handle Email/Password Sign In
  signInWithEmail: async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      throw error;
    }
  },

  // Handle Email/Password Sign Up
  signUpWithEmail: async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile with the provided name
      await updateProfile(result.user, {
        displayName: name
      });
      
      // Send email verification
      await sendEmailVerification(result.user);
      
      return result.user;
    } catch (error) {
      throw error;
    }
  },

  // Handle Google Sign In
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Process user data from result
      return result;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  },

  // Sign Out
  signOut: async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Delete Account
  deleteAccount: async (password?: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return false;

      // If password is provided, reauthenticate first
      if (password && user.email) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Update User Profile
  updateUserProfile: async (displayName: string) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: displayName
        });
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  },

  // Convert Firebase User to UserProfile
  mapUserToProfile: (user: User | null): UserProfile => {
    if (!user) {
      return {
        id: "",
        name: "",
        email: "",
        phone: "",
        photoUrl: "",
        verified: false,
        provider: ""
      };
    }

    // Determine authentication provider
    let provider = "password";
    if (user.providerData.length > 0) {
      provider = user.providerData[0].providerId;
    }

    return {
      id: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      phone: user.phoneNumber || "",
      photoUrl: user.photoURL || "",
      verified: user.emailVerified,
      provider: provider
    };
  },

  // Hook to get current user state
  useAuth: () => {
    const [authState, setAuthState] = useState<AuthState>({
      loading: true,
      authenticated: false,
      profile: {
        id: "",
        name: "",
        email: "",
        phone: "",
        photoUrl: "",
        verified: false,
        provider: ""
      }
    });

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({
          loading: false,
          authenticated: !!user,
          profile: firebaseAuthService.mapUserToProfile(user)
        });
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }, []);

    return authState;
  }
};

export default firebaseAuthService;