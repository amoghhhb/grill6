"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import styles from './LogoutNotification.module.css';

export default function LogoutNotification() {
  const { showLogoutMessage, setShowLogoutMessage } = useCart();

  useEffect(() => {
    if (showLogoutMessage) {
      const timer = setTimeout(() => {
        setShowLogoutMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showLogoutMessage, setShowLogoutMessage]);

  return (
    <AnimatePresence>
      {showLogoutMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className={styles.overlay}
        >
          <div className={styles.notification}>
            <div className={styles.icon}>👋</div>
            <div className={styles.content}>
              <h3>Logged Out Successfully</h3>
              <p>We hope to see you again soon!</p>
            </div>
            <button 
              onClick={() => setShowLogoutMessage(false)} 
              className={styles.closeBtn}
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
