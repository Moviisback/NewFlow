// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Check if Firebase Admin is already initialized
if (!getApps().length) {
  try {
    // Initialize Firebase Admin SDK with credentials
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (process.env.FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY) {
      // If we have a service account key, use it
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_KEY
      );
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId
      });
    } else {
      // For development, initialize with just project ID
      // Note: This will only work with Firebase Emulator or
      // if application default credentials are set up
      initializeApp({
        projectId: projectId
      });
      
      console.warn(
        'Firebase Admin initialized without credentials. ' +
        'This will only work with Firebase Emulator or if ' +
        'application default credentials are set up.'
      );
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

// Export admin services (using individual imports for better tree-shaking)
export const auth = getAuth();
export const db = getFirestore();