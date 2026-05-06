"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { BLOCKED_DOMAINS } from '@/utils/blockedDomains';
import { useCart } from '@/context/CartContext';

export default function LoginPage() {
  const { userRole, isLoggedIn, isAuthLoading } = useCart();
  

  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [step, setStep] = useState('auth'); // 'auth', 'otp', 'magiclink'
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [emailInUse, setEmailInUse] = useState(false);
  const [phoneInUse, setPhoneInUse] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const router = useRouter();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const isDisposableEmail = BLOCKED_DOMAINS.has(emailDomain);

  // Real-time checks
  useEffect(() => {
    if (!isLogin && isEmailValid && !isDisposableEmail) {
      const checkEmail = async () => {
        setIsCheckingEmail(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .limit(1);
        
        setEmailInUse(!!(data && data.length > 0));
        setIsCheckingEmail(false);
      };

      const timer = setTimeout(checkEmail, 500);
      return () => clearTimeout(timer);
    } else {
      setEmailInUse(false);
    }
  }, [email, isLogin, isEmailValid, isDisposableEmail]);

  useEffect(() => {
    if (!isLogin && phone.length === 10) {
      const checkPhone = async () => {
        setIsCheckingPhone(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('mobile_number')
          .eq('mobile_number', phone)
          .limit(1);
        
        setPhoneInUse(!!(data && data.length > 0));
        setIsCheckingPhone(false);
      };

      const timer = setTimeout(checkPhone, 500);
      return () => clearTimeout(timer);
    } else {
      setPhoneInUse(false);
    }
  }, [phone, isLogin]);

  useEffect(() => {
    if (isLoggedIn && !isAuthLoading && userRole) {
      if (userRole === 'admin') router.push('/admin');
      else if (userRole === 'seller') router.push('/seller');
      else router.push('/menu');
    }
  }, [isLoggedIn, isAuthLoading, userRole, router]);

  const otpRefs = [
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
  ];

  // Prevent flash for logged in users
  if (isAuthLoading || isLoggedIn) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  const passMismatch = !isLogin && confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid = isLogin 
    ? (email && isEmailValid && password) 
    : (firstName && lastName && email && isEmailValid && !isDisposableEmail && !emailInUse && phone && phone.length === 10 && !phoneInUse && password && !passMismatch);

  const handleAuthSubmit = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
        }
      } else {
        if (isDisposableEmail) {
          setError('Disposable email addresses are not allowed. Please use a permanent email.');
          setIsLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              gender: gender,
              mobile_number: phone,
              role: 'user'
            }
          }
        });
        if (error) {
          let friendlyError = error.message;
          if (error.message.toLowerCase().includes('duplicate key') || error.message.toLowerCase().includes('unique constraint')) {
            if (error.message.includes('mobile_number') || error.message.includes('phone')) {
              friendlyError = 'This phone number is already used by another account.';
            } else if (error.message.includes('email')) {
              friendlyError = 'This email address is already used by another account.';
            } else {
              friendlyError = 'This phone number or email is already used by another account.';
            }
          }
          setError(friendlyError);
        } else {
          setMessage('Account created! Please check your email for the verification link.');
          setStep('magiclink'); 
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = () => {
    setStep('magiclink');
  };
  
  return (
    <div className={styles.container}>
      <motion.div layout className={styles.authCard} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {step === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%' }}
            >
              <div className={styles.header}>
                <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                {isLogin && <p>Login to your Grill 6 account</p>}
              </div>

              <form className={styles.form}>
                {!isLogin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>First Name <span className={styles.required}>*</span></label>
                        <input 
                          type="text" 
                          placeholder="John" 
                          className={styles.input} 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label>Last Name <span className={styles.required}>*</span></label>
                        <input 
                          type="text" 
                          placeholder="Doe" 
                          className={styles.input} 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Gender</label>
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} />
                          <span>Male</span>
                        </label>
                        <label className={styles.radioLabel}>
                          <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} />
                          <span>Female</span>
                        </label>
                        <label className={styles.radioLabel}>
                          <input type="radio" name="gender" value="others" checked={gender === 'others'} onChange={() => setGender('others')} />
                          <span>Others</span>
                        </label>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Phone Number <span className={styles.required}>*</span></label>
                      <div className={styles.phoneInputWrapper}>
                        <span className={styles.countryCode}>+91</span>
                        <input 
                          type="tel" 
                          placeholder="9876543210" 
                          className={styles.phoneInput} 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                      </div>
                      {isCheckingPhone && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checking availability...</span>}
                      {phoneInUse && (
                        <span style={{ color: 'var(--destructive)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>This phone number is already registered</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className={styles.formGroup}>
                  <label>Email Address <span className={styles.required}>*</span></label>
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    className={styles.input} 
                    value={email}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ borderColor: emailTouched && !isEmailValid ? 'var(--destructive)' : undefined }}
                  />
                  {emailTouched && !isEmailValid && email.length > 0 && (
                    <span style={{ color: 'var(--destructive)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>Invalid Email Address</span>
                  )}
                  {isCheckingEmail && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checking availability...</span>}
                  {!isLogin && emailInUse && (
                    <span style={{ color: 'var(--destructive)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>Email is already in use</span>
                  )}
                  {emailTouched && isEmailValid && isDisposableEmail && !isLogin && (
                    <span style={{ color: 'var(--destructive)', fontSize: '0.8rem', fontWeight: 600, marginTop: '4px', display: 'block' }}>Temporary/Disposable emails are not allowed</span>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label>Password <span className={styles.required}>*</span></label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className={styles.input} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {!isLogin && (
                  <div className={styles.formGroup}>
                    <label>Confirm Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      className={styles.input}
                      style={{ borderColor: passMismatch ? 'var(--destructive)' : undefined }}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {passMismatch && (
                      <span style={{ color: 'var(--destructive)', fontSize: '0.8rem', fontWeight: 600 }}>Passwords do not match</span>
                    )}
                  </div>
                )}

                {error && <p className={styles.errorText} style={{ textAlign: 'center' }}>{error}</p>}
                {message && <p className={styles.successText} style={{ textAlign: 'center', color: 'var(--success)' }}>{message}</p>}

                <button 
                  type="button" 
                  className={styles.submitBtn}
                  onClick={handleAuthSubmit}
                  disabled={!isFormValid || isLoading}
                  style={{ opacity: (isFormValid && !isLoading) ? 1 : 0.6, cursor: (isFormValid && !isLoading) ? 'pointer' : 'not-allowed' }}
                >
                  {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
              </form>

              <div className={styles.toggleText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className={styles.toggleBtn}>
                  {isLogin ? 'Sign up' : 'Login'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={styles.verificationCard}
            >
              <div className={styles.header}>
                <h2>Verify Mobile</h2>
                <p>Enter the 4-digit OTP sent to your phone</p>
              </div>
              <div className={styles.otpGrid}>
                {otp.map((digit, idx) => (
                  <input 
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    maxLength={1}
                    className={styles.otpInput}
                    value={digit}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                        otpRefs[idx - 1].current?.focus();
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[0-9]$/.test(val) || val === '') {
                        const newOtp = [...otp];
                        newOtp[idx] = val;
                        setOtp(newOtp);
                        if (val && idx < 3) {
                          otpRefs[idx + 1].current?.focus();
                        }
                      }
                    }}
                  />
                ))}
              </div>
              <button className={styles.submitBtn} onClick={handleOtpSubmit}>
                Verify & Continue
              </button>
              <div className={styles.toggleText}>
                Didn't receive it? <button className={styles.toggleBtn}>Resend OTP</button>
              </div>
            </motion.div>
          )}

          {step === 'magiclink' && (
            <motion.div
              key="magiclink"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.verificationCard}
              style={{ textAlign: 'center' }}
            >
              <div className={styles.successIcon}>📧</div>
              <div className={styles.header}>
                <h2>Check your Email</h2>
                <p>We've sent a Verification link to your email address. Click the link to complete your registration.</p>
              </div>
              <button className={styles.submitBtn} onClick={() => { setStep('auth'); setIsLogin(true); }}>
                Back to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
