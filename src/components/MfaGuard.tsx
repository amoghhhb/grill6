"use client";

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function MfaGuard({ children }: { children: React.ReactNode }) {
  const { mfaPolicy, isMfaVerified, setIsMfaVerified, userRole, user, isLoggedIn } = useCart();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Define needsMfa FIRST so useEffect can use it
  const needsMfa = isLoggedIn && (userRole === 'admin' || userRole === 'seller') && mfaPolicy.is_active;

  const sendCode = async () => {
    if (!user || isSending || !needsMfa) return;
    setIsSending(true);
    try {
      await fetch('/api/send-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          userId: user.id,
          name: user.user_metadata?.first_name || 'Admin'
        })
      });
    } catch (err) {
      console.error("Failed to send MFA:", err);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (needsMfa && !isMfaVerified) {
      sendCode();
    }
  }, [needsMfa, isMfaVerified]);

  if (!needsMfa || isMfaVerified) {
    return <>{children}</>;
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      console.log("🔍 [MFA] Verifying code for user:", user?.id);
      
      // Check against DB
      const { data, error: dbError } = await supabase
        .from('mfa_codes')
        .select('*')
        .eq('user_id', user?.id)
        .eq('code', fullOtp)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbError) {
        console.error("❌ [MFA] Verification DB Error:", dbError.message);
        throw dbError;
      }

      console.log("📊 [MFA] Verification Result:", data ? "MATCH" : "NO MATCH");

      if (data) {
        // Check expiration (manual check for better debugging)
        const isExpired = new Date(data.expires_at) < new Date();
        if (isExpired) {
          setError('This code has expired. Please request a new one.');
          return;
        }

        setIsMfaVerified(true);
        // Clean up code
        await supabase.from('mfa_codes').delete().eq('id', data.id);
      } else {
        setError('Invalid security code. Please check your email.');
        setOtp(['', '', '', '', '', '']);
        document.getElementById('otp-0')?.focus();
      }
    } catch (err: any) {
      setError('Verification failed: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f172a',
      zIndex: 9999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: '#1e293b',
          padding: '2.5rem',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '450px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔐</div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
          Security Verification
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem' }}>
          MFA is mandatory for {userRole?.toUpperCase()} access. 
          Please enter the security code sent to <strong>{user?.email}</strong>
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              value={digit}
              maxLength={1}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digit && i > 0) {
                  document.getElementById(`otp-${i-1}`)?.focus();
                }
              }}
              style={{
                width: '45px',
                height: '55px',
                background: '#0f172a',
                border: '2px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#3c8dbc'
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          style={{
            width: '100%',
            padding: '1rem',
            background: '#3c8dbc',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: isVerifying ? 'wait' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isVerifying ? 'Verifying...' : 'Unlock Dashboard'}
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          {isSending ? (
            <span style={{ color: '#3c8dbc' }}>Sending new code...</span>
          ) : (
            <>
              Didn't receive a code?{' '}
              <span 
                onClick={sendCode}
                style={{ color: '#3c8dbc', cursor: 'pointer', fontWeight: 600 }}
              >
                Resend Code
              </span>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}
