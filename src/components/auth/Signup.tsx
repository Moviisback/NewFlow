// src/components/auth/Signup.tsx
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSignUp = async (event: any) => {
        event.preventDefault();
        setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Signed up 
      const user = userCredential.user;
      // ...
      router.push("/studyplan");
    } catch (error: any) {
        setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSignUp}>
        {error && <p>{error}</p>}
      {/* Form fields for email and password */}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder='email'/>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder='password'/>
      <button type="submit">Sign Up</button>
    </form>
  );
};

export default Signup;
