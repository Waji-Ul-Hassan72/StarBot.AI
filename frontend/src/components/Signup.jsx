// src/components/auth/Signup.jsx

import React, { useState, useEffect } from 'react';

import axios from 'axios';

import JSEncrypt from 'jsencrypt';



export default function Signup({ switchToLogin }) {

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

 

  // Tracking & Feedback States

  const [submittedEmail, setSubmittedEmail] = useState('');

  const [error, setError] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);

  const [publicKey, setPublicKey] = useState('');

  const [loading, setLoading] = useState(false);



  // Fetch RSA Public Key when component mounts

  useEffect(() => {

    const fetchPublicKey = async () => {

      try {

        const response = await axios.get('http://localhost:5000/api/auth/public-key');

        setPublicKey(response.data.publicKey);

      } catch (err) {

        console.error('Failed to fetch public key:', err);

        setError('Failed to establish a secure connection with the server.');

      }

    };

    fetchPublicKey();

  }, []);



  const handleSubmit = async (e) => {

    e.preventDefault();

    setError('');



    // Form Validations

    if (password !== confirmPassword) {

      setPassword('');

      setConfirmPassword('');

      return setError('Passwords do not match');

    }



    if (!publicKey) {

      return setError('Encryption key not loaded. Please refresh the page.');

    }



    setLoading(true);



    try {

      // 1. Encrypt password using RSA Public Key

      const encryptor = new JSEncrypt();

      encryptor.setPublicKey(publicKey);

      const encryptedPassword = encryptor.encrypt(password);



      if (!encryptedPassword) {

        setError('Encryption failed during signup.');

        setLoading(false);

        return;

      }



      // 2. Submit user credentials to backend

      await axios.post('http://localhost:5000/api/auth/signup', {

        email,

        password: encryptedPassword,

      });



      // 3. Save submitted email for confirmation screen & clear form input

      setSubmittedEmail(email);

      setEmail('');

      setPassword('');

      setConfirmPassword('');



      // 4. Show the confirmation screen on the page

      // (Do NOT trigger any parent state change here!)

      setIsSuccess(true);



    } catch (err) {

      setPassword('');

      setConfirmPassword('');

      setError(err.response?.data?.error || 'Failed to sign up. Please try again.');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="min-h-screen flex items-center justify-center bg-[#0e0f11] text-white p-4">

      <div className="bg-[#18191c] p-8 rounded-xl border border-[#2a2d34] w-full max-w-md flex flex-col gap-4 shadow-xl">

       

        {/* SUCCESS CONFIRMATION VIEW */}

        {isSuccess ? (

          <div className="flex flex-col items-center text-center gap-4 py-3">

            {/* Success Icon */}

            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-1">

              ✓

            </div>

           

            <h2 className="text-2xl font-bold text-white">Account Created!</h2>

           

            <p className="text-sm text-gray-300 leading-relaxed">

              We have sent a verification link to:

              <br />

              <strong className="text-indigo-400 text-base">{submittedEmail}</strong>

            </p>



            <div className="bg-[#24262b] border border-[#36393f] p-4 rounded-lg text-xs text-gray-400 text-left w-full mt-1 flex flex-col gap-2">

              <p>📩 Check your inbox (or spam folder) for the verification email.</p>

              <p>🔑 Click the link inside to activate your account before logging in.</p>

            </div>



            {/* REDIRECT BUTTON - Only redirects when clicked */}

            <button

              type="button"

              onClick={switchToLogin}

              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium p-3 rounded-lg text-sm transition-colors mt-3"

            >

              OK, Go to Login

            </button>

          </div>

        ) : (

          /* SIGNUP FORM VIEW */

          <>

            <h2 className="text-2xl font-bold text-center mb-1">Create Account</h2>

            <p className="text-xs text-center text-gray-400 mb-2">

              Sign up to access your legal assistant workspace

            </p>



            {/* ERROR DISPLAY */}

            {error && (

              <p className="text-red-400 text-sm bg-red-950/40 p-3 rounded-lg text-center border border-red-900/50">

                {error}

              </p>

            )}



            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              <div>

                <label className="text-xs text-gray-400 mb-1 block">Email Address</label>

                <input

                  type="email"

                  placeholder="name@example.com"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                  autoComplete="email"

                  className="w-full bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"

                  required

                />

              </div>



              <div>

                <label className="text-xs text-gray-400 mb-1 block">Password</label>

                <input

                  type="password"

                  placeholder="••••••••"

                  value={password}

                  onChange={(e) => setPassword(e.target.value)}

                  autoComplete="new-password"

                  className="w-full bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"

                  required

                />

              </div>



              <div>

                <label className="text-xs text-gray-400 mb-1 block">Confirm Password</label>

                <input

                  type="password"

                  placeholder="••••••••"

                  value={confirmPassword}

                  onChange={(e) => setConfirmPassword(e.target.value)}

                  autoComplete="new-password"

                  className="w-full bg-[#24262b] border border-[#36393f] p-3 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"

                  required

                />

              </div>



              <button

                type="submit"

                disabled={loading}

                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors p-3 rounded-lg font-medium text-sm mt-2 disabled:opacity-50"

              >

                {loading ? 'Creating Account...' : 'Sign Up'}

              </button>



              <p className="text-xs text-center text-gray-400 mt-2">

                Already have an account?{' '}

                <button

                  type="button"

                  onClick={switchToLogin}

                  className="text-indigo-400 hover:text-indigo-300 underline font-medium"

                >

                  Log in

                </button>

              </p>

            </form>

          </>

        )}

      </div>

    </div>

  );

} 