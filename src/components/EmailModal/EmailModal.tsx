"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './EmailModal.module.css';

interface EmailModalProps {
  recipientEmail: string;
  recipientName: string;
  onClose: () => void;
}

export default function EmailModal({ recipientEmail, recipientName, onClose }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject,
          html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(onClose, 2000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={styles.modal}
      >
        {!sent ? (
          <>
            <div className={styles.header}>
              <h3>Email to {recipientName}</h3>
              <p className={styles.emailText}>{recipientEmail}</p>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="Order Update / Important Notice..."
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  placeholder="Write your message here..."
                  className={styles.textarea}
                />
              </div>
              <div className={styles.actions}>
                <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                <button 
                  className={styles.sendBtn} 
                  onClick={handleSend}
                  disabled={isSending || !subject || !message}
                >
                  {isSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.sentView}>
            <div className={styles.sentIcon}>📩</div>
            <h3>Email Sent!</h3>
            <p>Your message has been delivered to {recipientEmail}.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
