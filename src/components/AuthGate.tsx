import { useState, ReactNode } from 'react';
import { supabase } from '../supabaseClient'; 
import { useUser } from '../contexts/UserContext'; 

// Tell TypeScript that this component accepts children
interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Pull the session and loading state from your UserContext
  const { session, loading: contextLoading } = useUser(); 

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      console.log('Account created successfully!');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      console.log('Logged in successfully!');
    }
    setLoading(false);
  };

  // 1. Show a brief loading state while Supabase checks for an existing session on load
  if (contextLoading) {
    return <div style={{ color: 'white', padding: '20px' }}>Loading session...</div>;
  }

  // 2. If the user is logged in (session exists), render the main Margin Modeler app!
  if (session) {
    return <>{children}</>;
  }

  // 3. Otherwise, show the login form
  return (
    <div className="login-container" style={{ padding: '20px', color: 'white' }}>
      <h2>Margin Modeler Login</h2>
      
      <form>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="omar.ataa@outlook.com"
            required
            style={{ padding: '8px', width: '300px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a secure password"
            required
            style={{ padding: '8px', width: '300px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
          />
        </div>

        {errorMsg && <p style={{ color: '#ff6b6b' }}>{errorMsg}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            type="button" 
            onClick={handleSignIn} 
            disabled={loading}
            style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#0052cc', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>

          <button 
            type="button" 
            onClick={handleSignUp} 
            disabled={loading}
            style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            {loading ? 'Processing...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}