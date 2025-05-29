// src/lib/auth-service.ts
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile as updateFirebaseProfile,
  User,
  sendEmailVerification,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  UserCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import { doc, getDoc, setDoc, updateDoc, getFirestore } from 'firebase/firestore';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore();

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
  // Expose auth for direct access
  auth,
  
  // Handle Email/Password Sign In
  signInWithEmail: async (email: string, password: string): Promise<UserCredential> => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  },

  // Handle Email/Password Sign Up
  signUpWithEmail: async (email: string, password: string, name: string): Promise<UserCredential> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user profile with the provided name
      await updateFirebaseProfile(userCredential.user, {
        displayName: name
      });
      
      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Create user profile in Firestore
      const profile = firebaseAuthService.mapUserToProfile(userCredential.user);
      await firebaseAuthService.saveUserProfile(userCredential.user.uid, profile);
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  },

  // Handle Google Sign In
  signInWithGoogle: async (): Promise<UserCredential> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Save user profile to Firestore if it's their first login
      const profile = firebaseAuthService.mapUserToProfile(result.user);
      await firebaseAuthService.saveUserProfile(result.user.uid, profile);
      
      return result;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  },

  // Sign Out
  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  },

  // Send password reset email
  sendPasswordReset: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  },

  // Delete Account
  deleteUserAccount: async (password?: string): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      // If password is provided, reauthenticate first
      if (password && user.email) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      await deleteUser(user);
    } catch (error) {
      throw error;
    }
  },

  // Update User Profile
  updateUserProfile: async (userId: string, data: Partial<UserProfile>): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      // Update displayName in Firebase Auth if provided
      if (data.name) {
        await updateFirebaseProfile(user, {
          displayName: data.name
        });
      }

      // Update profile in Firestore
      await updateDoc(doc(firestore, 'users', userId), { ...data });
    } catch (error) {
      throw error;
    }
  },

  // Get user profile from Firestore
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error("Error getting user profile:", error);
      return null;
    }
  },

  // Save user profile to Firestore
  saveUserProfile: async (userId: string, profile: UserProfile): Promise<void> => {
    try {
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new profile if it doesn't exist
        await setDoc(userRef, profile);
      } else {
        // Update existing profile
        await updateDoc(userRef, { ...profile });
      }
    } catch (error) {
      console.error("Error saving user profile:", error);
      throw error;
    }
  },

  // Convert Firebase User to UserProfile
  mapUserToProfile: (user: User): UserProfile => {
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
  }
};

export default firebaseAuthService;