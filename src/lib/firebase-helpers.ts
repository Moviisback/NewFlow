// src/lib/admin-helpers.ts
import { auth, db, adminUserManagement } from './firebase-admin';
import type { NextApiRequest, NextApiResponse } from 'next';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Authentication Middleware
 * Verify Firebase ID token and attach user to request
 */
export async function withAuth(
  req: NextApiRequest & { user?: DecodedIdToken },
  res: NextApiResponse,
  handler: (req: NextApiRequest & { user: DecodedIdToken }, res: NextApiResponse) => Promise<void>
): Promise<void> {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    // Extract token from header
    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    try {
      // Verify token
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = decodedToken;
      
      // Pass to handler
      return await handler(req as NextApiRequest & { user: DecodedIdToken }, res);
    } catch (error: any) {
      console.error('Error verifying auth token:', error);
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token',
        details: error.message 
      });
    }
  } catch (error: any) {
    console.error('Server error in auth middleware:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

/**
 * Role-Based Access Control Middleware
 * Check if user has required roles
 */
export function withRoles(
  roles: string[],
  handler: (req: NextApiRequest & { user: DecodedIdToken }, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest & { user: DecodedIdToken }, res: NextApiResponse) => {
    try {
      const userRoles = req.user.roles || [];
      const hasRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          requiredRoles: roles
        });
      }
      
      return await handler(req, res);
    } catch (error: any) {
      console.error('Server error in role middleware:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
      });
    }
  };
}

/**
 * User Management Helpers
 */
export const userManagement = {
  // Create a new user with extended profile
  createUser: async (userData: {
    email: string;
    password: string;
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    emailVerified?: boolean;
    disabled?: boolean;
  }) => {
    try {
      // Create Firebase Auth user
      const user = await adminUserManagement.createUser(userData);
      
      // Create user profile in Firestore
      await db.collection('users').doc(user.uid).set({
        email: userData.email,
        displayName: userData.displayName || '',
        phoneNumber: userData.phoneNumber || '',
        photoURL: userData.photoURL || '',
        emailVerified: userData.emailVerified || false,
        disabled: userData.disabled || false,
        createdAt: new Date(),
        lastLogin: null,
        updatedAt: new Date()
      });
      
      return user;
    } catch (error) {
      console.error('Error creating user with profile:', error);
      throw error;
    }
  },
  
  // Update user profile in both Auth and Firestore
  updateUserProfile: async (uid: string, userData: {
    displayName?: string;
    phoneNumber?: string;
    photoURL?: string;
    emailVerified?: boolean;
    disabled?: boolean;
    email?: string;
    password?: string;
    customAttributes?: Record<string, any>;
  }) => {
    try {
      // Prepare Auth update (basic user data)
      const authUpdate: any = {};
      if (userData.displayName !== undefined) authUpdate.displayName = userData.displayName;
      if (userData.phoneNumber !== undefined) authUpdate.phoneNumber = userData.phoneNumber;
      if (userData.photoURL !== undefined) authUpdate.photoURL = userData.photoURL;
      if (userData.emailVerified !== undefined) authUpdate.emailVerified = userData.emailVerified;
      if (userData.disabled !== undefined) authUpdate.disabled = userData.disabled;
      if (userData.email !== undefined) authUpdate.email = userData.email;
      if (userData.password !== undefined) authUpdate.password = userData.password;
      
      // Update Firebase Auth user if there are auth-related changes
      if (Object.keys(authUpdate).length > 0) {
        await adminUserManagement.updateUser(uid, authUpdate);
      }
      
      // Prepare Firestore update (including any custom attributes)
      const firestoreUpdate: any = {
        ...authUpdate,
        updatedAt: new Date()
      };
      
      // Add any custom attributes
      if (userData.customAttributes) {
        Object.entries(userData.customAttributes).forEach(([key, value]) => {
          firestoreUpdate[key] = value;
        });
      }
      
      // Update Firestore profile
      await db.collection('users').doc(uid).update(firestoreUpdate);
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },
  
  // Delete user from Auth and Firestore
  deleteUser: async (uid: string) => {
    try {
      // Delete from Firebase Auth
      await adminUserManagement.deleteUser(uid);
      
      // Delete user profile from Firestore
      await db.collection('users').doc(uid).delete();
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  
  // Assign roles to a user
  assignRoles: async (uid: string, roles: string[]) => {
    try {
      // Get current custom claims
      const user = await adminUserManagement.getUserById(uid);
      const currentClaims = user.customClaims || {};
      
      // Set roles in custom claims
      await adminUserManagement.setCustomUserClaims(uid, {
        ...currentClaims,
        roles: roles
      });
      
      // Also update in Firestore
      await db.collection('users').doc(uid).update({
        roles: roles,
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error assigning roles to user:', error);
      throw error;
    }
  },
  
  // Get complete user profile from both Auth and Firestore
  getUserProfile: async (uid: string) => {
    try {
      // Get user from Firebase Auth
      const authUser = await adminUserManagement.getUserById(uid);
      
      // Get user profile from Firestore
      const profileDoc = await db.collection('users').doc(uid).get();
      const profile = profileDoc.exists ? profileDoc.data() : null;
      
      return {
        ...authUser,
        profile: profile || {}
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
};

/**
 * Data Export Utility
 */
export const dataExport = {
  // Export a user's data (for GDPR/privacy requests)
  exportUserData: async (uid: string) => {
    try {
      // Get user profile
      const userProfile = await userManagement.getUserProfile(uid);
      
      // Get user's documents from various collections
      const userData: Record<string, any> = {
        profile: userProfile,
        collections: {}
      };
      
      // Add collections that contain user data - customize as needed
      const collections = ['settings', 'preferences', 'sessions'];
      
      for (const collection of collections) {
        const docs = await db.collection(collection)
          .where('userId', '==', uid)
          .get();
          
        userData.collections[collection] = docs.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }
};

/**
 * Utilities for API Routes
 */
export const apiHelpers = {
  // Handle API errors consistently
  handleError: (res: NextApiResponse, error: any, statusCode = 500) => {
    console.error('API error:', error);
    
    return res.status(statusCode).json({
      error: error.message || 'Something went wrong',
      code: error.code || 'unknown_error',
      status: statusCode
    });
  },
  
  // Response with success and data
  success: (res: NextApiResponse, data: any, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      status: statusCode
    });
  }
};

/**
 * Example API route using these helpers:
 * 
 * // pages/api/user/profile.ts
 * import { withAuth, apiHelpers, userManagement } from '@/lib/admin-helpers';
 * 
 * export default async function handler(req, res) {
 *   return withAuth(req, res, async (req, res) => {
 *     try {
 *       // Get user profile
 *       const profile = await userManagement.getUserProfile(req.user.uid);
 *       return apiHelpers.success(res, profile);
 *     } catch (error) {
 *       return apiHelpers.handleError(res, error);
 *     }
 *   });
 * }
 */