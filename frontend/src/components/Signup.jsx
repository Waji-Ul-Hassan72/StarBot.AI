// src/components/auth/Signup.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JSEncrypt from 'jsencrypt';

export default function Signup({ onSignupSuccess, switchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [publicKey, setPublicKey] = useState('');

  // Fetch the RSA public key from the backend when the component mounts
  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/auth/public-key');
        setPublicKey(response.data.publicKey);
      } catch (err) {
        console.error('Failed to fetch public key:', err);
        setError('Failed to establish a secure connection.');
      }
    };
    fetchPublicKey();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      // ✅ CLEAR PASSWORDS IF THEY DON'T MATCH
      setPassword('');
      setConfirmPassword('');
      return setError('Passwords do not match');
    }

    if (!publicKey) {
      setError('Encryption key not loaded. Please refresh the page.');
      return;
    }

    try {
      // Initialize the encryptor and set the fetched public key
      const encryptor = new JSEncrypt();
      encryptor.setPublicKey(publicKey);

      // Encrypt the password 
      const encryptedPassword = encryptor.encrypt(password);

      if (!encryptedPassword) {
        setError('Encryption failed during signup.');
        return;
      }

      // Send the encrypted payload to the backend
      await axios.post('http://localhost:5000/api/auth/signup', { 
        email, 
        password: encryptedPassword 
      });
      
      // ✅ CLEAR ALL BOXES ON SUCCESSFUL SIGNUP
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      onSignupSuccess(); 
    } catch (err) {
      // ✅ CLEAR PASSWORDS IF API FAILS
      setPassword('');
      setConfirmPassword('');
      setError(err.response?.data?.error || 'Failed to sign up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0f11] text-white">
      <form onSubmit={handleSubmit} className="bg-[#18191c] p-8 rounded-xl border border-[#2a2d34] w-96 flex flex-col gap-4 shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
        {error && <p className="text-red-400 text-sm bg-red-950/40 p-2 rounded text-center border border-red-900/50">{error}</p>}
        
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          autoComplete="email"
          className="bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
          required 
        />
        
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          autoComplete="new-password"
          className="bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
          required 
        />
        
        <input 
          type="password" 
          placeholder="Confirm Password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          autoComplete="new-password"
          className="bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
          required 
        />
        
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 transition-colors p-3 rounded-lg font-medium mt-2">Sign Up</button>
        <p className="text-xs text-center text-gray-400 mt-2">
          Already have an account? <button type="button" onClick={switchToLogin} className="text-indigo-400 hover:text-indigo-300 underline font-medium">Log in</button>
        </p>
      </form>
    </div>
  );
}