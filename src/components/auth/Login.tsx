// src/components/auth/Login.tsx
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSignIn = async (event: any) => {
        event.preventDefault();
        setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Signed in 
      const user = userCredential.user;
      // ...
      router.push("/studyplan")
    } catch (error: any) {
        setError(error.message)
    }
  };

  return (
    <form onSubmit={handleSignIn}>
        {error && <p>{error}</p>}
      {/* Form fields for email and password */}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder='email'/>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder='password'/>
      <button type="submit">Sign In</button>
    </form>
  );
};

export default Login;
