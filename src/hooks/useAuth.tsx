import { useAuth as useAuthContext } from '@/context/AuthContext';

export default function useAuth() {
  const context = useAuthContext();
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
