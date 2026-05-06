"use client";

import React from 'react';
import { useCart } from '@/context/CartContext';
import { motion } from 'framer-motion';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { isMaintenanceMode, userRole, isAuthLoading } = useCart();

  // If maintenance is OFF, or the user is an ADMIN, show the site normally
  if (!isMaintenanceMode || userRole === 'admin') {
    return <>{children}</>;
  }

  // Otherwise, show the Maintenance Screen
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0f172a', // Dark slate
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '600px' }}
      >
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🛠️</div>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 900, 
          marginBottom: '1rem',
          background: 'linear-gradient(to right, #f39c12, #d35400)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Under Maintenance
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
          We are currently performing some essential upgrades to the Grill 6 platform. 
          We'll be back shortly with even better features and fresh flavors!
        </p>
        
        <div style={{ 
          display: 'inline-block',
          padding: '0.8rem 1.5rem',
          borderRadius: '12px',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          border: '1px solid rgba(243, 156, 18, 0.3)',
          color: '#f39c12',
          fontWeight: 700
        }}>
          Estimated time: Back in 30 minutes
        </div>
      </motion.div>
      
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(243, 156, 18, 0.1) 0%, transparent 70%)',
        zIndex: -1
      }} />
    </div>
  );
}
