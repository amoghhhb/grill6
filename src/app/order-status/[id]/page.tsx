"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

interface OrderItem {
  item_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_id_display: string;
  daily_number: number;
  status: string;
  total_amount: number;
  order_type: string;
  payment_method: string;
  order_items: OrderItem[];
  outlets?: {
    name: string;
    address: string;
  };
}

const statusSteps = [
  { key: 'pending', label: 'Order Received', icon: '📝', description: 'Waiting for outlet confirmation' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', description: 'Our chefs are crafting your meal' },
  { key: 'ready', label: 'Ready', icon: '🍱', description: 'Your order is ready for pickup/delivery' },
  { key: 'completed', label: 'Enjoy!', icon: '✨', description: 'Thank you for choosing Grill 6!' }
];

export default function OrderStatusPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          outlets (name, address)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Fetch error:", error);
        setError("Order not found");
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-tracking-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setOrder(prev => prev ? { ...prev, status: payload.new.status } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Locating your feast...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.errorContainer}>
        <h1>Oops!</h1>
        <p>{error || "We couldn't find that order."}</p>
        <button onClick={() => router.push('/menu')} className={styles.backBtn}>Back to Menu</button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const displayIndex = currentStepIndex === -1 ? (order.status === 'cancelled' ? -1 : 0) : currentStepIndex;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <button onClick={() => router.push('/menu')} className={styles.iconBtn}>←</button>
          <div className={styles.headerText}>
            <h1>Track Order</h1>
            <p>Order #{order.order_id_display}</p>
          </div>
          <div className={styles.statusBadge}>
            {order.status.toUpperCase()}
          </div>
        </div>

        {/* Hero Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.statusCard}
        >
          {order.status === 'cancelled' ? (
            <div className={styles.cancelledView}>
              <div className={styles.cancelledIcon}>❌</div>
              <h2>Order Cancelled</h2>
              <p>We're sorry, your order could not be fulfilled at this time.</p>
              <button onClick={() => router.push('/menu')} className={styles.primaryBtn}>Try Another Outlet</button>
            </div>
          ) : (
            <>
              <div className={styles.liveIndicator}>
                <span className={styles.pulse}></span>
                LIVE UPDATES
              </div>
              
              <div className={styles.trackingVisual}>
                <div className={styles.mainIcon}>
                  {statusSteps[displayIndex]?.icon || '🛒'}
                </div>
                <h2>{statusSteps[displayIndex]?.label}</h2>
                <p>{statusSteps[displayIndex]?.description}</p>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <motion.div 
                    className={styles.progressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${(displayIndex / (statusSteps.length - 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
                <div className={styles.steps}>
                  {statusSteps.map((step, idx) => (
                    <div 
                      key={step.key} 
                      className={`${styles.step} ${idx <= displayIndex ? styles.activeStep : ''}`}
                    >
                      <div className={styles.stepDot}></div>
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Daily Number Card - Important for the user */}
        <div className={styles.infoGrid}>
          <div className={styles.dailyCard}>
            <p>Your Token Number</p>
            <h3>#{order.daily_number}</h3>
            <small>Show this at the counter</small>
          </div>
          <div className={styles.outletCard}>
            <p>Pickup Location</p>
            <h3>{order.outlets?.name || 'Grill 6 Outlet'}</h3>
            <small>{order.outlets?.address}</small>
          </div>
        </div>

        {/* Order Details */}
        <div className={styles.detailsSection}>
          <h2>Order Summary</h2>
          <div className={styles.itemsList}>
            {order.order_items.map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <span>{item.quantity}x {item.item_name}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className={styles.totalRow}>
            <span>Total Amount</span>
            <span>₹{order.total_amount}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <p className={styles.helpText}>Need help? Please visit the outlet counter.</p>
          <button onClick={() => router.push('/menu')} className={styles.secondaryBtn}>Order More Food</button>
        </div>
      </div>
    </div>
  );
}
