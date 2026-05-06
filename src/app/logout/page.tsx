"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to home after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.container}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={styles.logoutCard}
      >
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>
        <h1>Logged Out Successfully</h1>
        <p>Thank you for visiting Grill 6. We hope to see you again soon!</p>
        
        <div className={styles.actions}>
          <button onClick={() => router.push('/login')} className={styles.primaryBtn}>
            Login Again
          </button>
          <button onClick={() => router.push('/')} className={styles.secondaryBtn}>
            Back to Home
          </button>
        </div>

        <div className={styles.footer}>
          Redirecting to home in 5 seconds...
        </div>
      </motion.div>
    </div>
  );
}
