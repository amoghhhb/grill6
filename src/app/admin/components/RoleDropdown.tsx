"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from '../page.module.css';

export function RoleDropdown({ userId, currentRole, onRoleChange }: { 
  userId: string, 
  currentRole: string, 
  onRoleChange: (uid: string, role: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const roles = ['user', 'seller', 'admin'];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div className={styles.customDropdownContainer}>
      <button 
        ref={buttonRef}
        className={`${styles.roleDisplay} ${styles[currentRole]}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {currentRole}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, pointerEvents: 'none' }}>
              <div 
                className={styles.dropdownOverlay} 
                style={{ pointerEvents: 'auto' }}
                onClick={() => setIsOpen(false)} 
              />
              <motion.div 
                className={styles.dropdownList}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed',
                  top: (coords.top + 8) + 'px',
                  left: coords.left + 'px',
                  minWidth: coords.width + 'px',
                  pointerEvents: 'auto',
                }}
              >
                {roles.map(role => (
                  <button 
                    key={role}
                    className={`${styles.dropdownItem} ${currentRole === role ? styles.activeItem : ''}`}
                    onClick={() => {
                      if (role !== currentRole) onRoleChange(userId, role);
                      setIsOpen(false);
                    }}
                  >
                    <span className={`${styles.roleDot} ${styles[role]}`}></span>
                    {role}
                  </button>
                ))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
