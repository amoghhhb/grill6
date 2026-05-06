"use client";

import React from 'react';
import { useCart } from '@/context/CartContext';
import { motion } from 'framer-motion';

export default function BannedGuard({ children }: { children: React.ReactNode }) {
  const { isBanned } = useCart();

  if (isBanned) {
    return (
      <div className="banned-screen">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="banned-card"
        >
          <div className="banned-icon">🚫</div>
          <h1>ACCESS DENIED</h1>
          <p>YOU are banned for violating our rules.</p>
          <div className="banned-details">
            If you believe this is a mistake, please contact support.
          </div>
          <button onClick={() => window.location.href = 'mailto:support@grill6.com'} className="support-btn">
            Contact Support
          </button>
        </motion.div>

        <style jsx>{`
          .banned-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #0a0a0a;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            padding: 2rem;
            color: white;
            font-family: 'Inter', sans-serif;
          }
          .banned-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 3rem;
            border-radius: 24px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          .banned-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
          }
          h1 {
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            color: #ff4d4d;
            margin-bottom: 1rem;
          }
          p {
            font-size: 1.2rem;
            font-weight: 600;
            opacity: 0.9;
            margin-bottom: 2rem;
            text-transform: uppercase;
          }
          .banned-details {
            font-size: 0.9rem;
            opacity: 0.6;
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .support-btn {
            background: white;
            color: black;
            border: none;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
          }
          .support-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
