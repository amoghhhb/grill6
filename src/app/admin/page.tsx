"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// The ultimate hydration guard: 
// Load the entire complex dashboard logic only on the client.
const AdminDashboardClient = dynamic(() => import('./AdminDashboardClient'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem', fontWeight: 500 }}>Initializing Command Center</h2>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid rgba(255,255,255,0.1)', 
          borderTopColor: '#fff', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
});

export default function AdminPage() {
  return <AdminDashboardClient />;
}
