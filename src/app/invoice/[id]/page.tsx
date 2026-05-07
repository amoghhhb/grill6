"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import styles from './page.module.css';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_type: string;
  user_id: string;
  outlet_id: string;
  discount_amount?: number;
  coupon_code?: string;
  items: OrderItem[];
  outlets?: {
    name: string;
    address: string;
  };
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            outlets (
              name,
              address
            )
          `)
          .eq('id', params.id)
          .single();

        if (error) throw error;

        // Fetch items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', params.id);

        if (itemsError) throw itemsError;

        setOrder({ ...data, items: itemsData || [] });
      } catch (err) {
        console.error("Error fetching invoice:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) fetchOrder();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <div className="loader-ring"></div>
        <p>Generating your invoice...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.errorContainer}>
        <h2>Invoice Not Found</h2>
        <button onClick={() => router.push('/profile')}>Back to Orders</button>
      </div>
    );
  }

  const subtotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const date = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.invoiceCard}
      >
        <div className={styles.header}>
          <div className={styles.brand}>
            <h1>GRILL 6</h1>
            <p>Savor the Grill Experience</p>
          </div>
          <div className={styles.invoiceMeta}>
            <h2>INVOICE</h2>
            <p>Order #{order.id.slice(0, 8).toUpperCase()}</p>
            <p>{date}</p>
          </div>
        </div>

        <div className={styles.addressSection}>
          <div className={styles.from}>
            <h3>From:</h3>
            <p className={styles.outletName}>{order.outlets?.name || 'Grill 6 Outlet'}</p>
            <p>{order.outlets?.address || 'Restaurant Address'}</p>
          </div>
          <div className={styles.to}>
            <h3>Order Details:</h3>
            <p><strong>Status:</strong> <span className={styles.statusBadge}>{order.status.toUpperCase()}</span></p>
            <p><strong>Type:</strong> {order.order_type.toUpperCase()}</p>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th className={styles.textRight}>Price</th>
              <th className={styles.textCenter}>Qty</th>
              <th className={styles.textRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className={styles.textRight}>₹{item.price.toFixed(2)}</td>
                <td className={styles.textCenter}>{item.quantity}</td>
                <td className={styles.textRight}>₹{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totalsSection}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {order.discount_amount && order.discount_amount > 0 && (
            <div className={`${styles.totalRow} ${styles.discount}`}>
              <span>Discount ({order.coupon_code})</span>
              <span>-₹{order.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className={styles.finalTotal}>
            <span>Grand Total</span>
            <span>₹{order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.footer}>
          <p>Thank you for ordering with Grill 6!</p>
          <p className={styles.taxNote}>*This is a computer generated invoice and does not require a signature.</p>
          <div className={styles.actions}>
            <button onClick={() => window.print()} className={styles.printBtn}>
              🖨️ Print Invoice
            </button>
            <button onClick={() => router.push('/profile')} className={styles.backBtn}>
              My Orders
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
