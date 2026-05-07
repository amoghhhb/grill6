"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from '../page.module.css';

export function StaffAssignmentDropdown({ sellers, onAssign, disabled }: { 
  sellers: any[], 
  onAssign: (uid: string) => void, 
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.staffDropdownContainer} ref={containerRef}>
      <button 
        type="button"
        className={`${styles.staffDropdownTrigger} ${isOpen ? styles.triggerActive : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>+ Assign Seller...</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={styles.staffDropdownList}
          >
            {sellers.length === 0 ? (
              <div className={styles.emptySellers}>No available sellers</div>
            ) : sellers.map(s => (
              <button 
                key={s.id}
                type="button"
                className={styles.staffOption}
                onClick={() => {
                  onAssign(s.id);
                  setIsOpen(false);
                }}
              >
                <div className={styles.staffAvatar}>{s.first_name[0]}{s.last_name[0]}</div>
                <div className={styles.staffInfo}>
                  <p className={styles.staffName}>{s.first_name} {s.last_name}</p>
                  <p className={styles.staffEmail}>{s.email}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
