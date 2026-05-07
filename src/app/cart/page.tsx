"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

import { useCart } from '@/context/CartContext';
import OrderTypeModal from '@/components/OrderTypeModal/OrderTypeModal';
import { supabase } from '@/lib/supabase';

export default function CartPage() {
  const router = useRouter();
  const { cart: items, updateQuantity, cartTotal, orderType, userLocation, distance, user, isOutletOpen, selectedOutlet } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash'>('cash');
  const [showEditModal, setShowEditModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [dailyNumber, setDailyNumber] = useState(0);
  const [orderId, setOrderId] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { clearCart, setOrderType, setSelectedOutlet, setDistance, setUserLocation } = useCart();

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsVerifyingCoupon(true);
    setCouponError('');
    
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('status', 'active')
        .eq('outlet_id', selectedOutlet?.id)
        .single();

      if (error || !data) {
        throw new Error("Invalid or expired coupon code");
      }

      // Check Min Order
      if (cartTotal < data.min_order) {
        throw new Error(`Minimum order of ₹${data.min_order} required for this coupon`);
      }

      // Check Target
      if (data.target_type === 'particular' && user?.email !== data.target_details) {
        throw new Error("This coupon is not valid for your account");
      }

      // Calculate Discount
      let discount = 0;
      if (data.discount_type === 'percentage') {
        discount = (cartTotal * data.discount_value) / 100;
      } else {
        discount = data.discount_value;
      }

      setDiscountAmount(discount);
      setAppliedCoupon(data);
      setSuccessMsg(`Yay! You saved ₹${discount.toFixed(2)} with ${data.code}`);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (err: any) {
      setCouponError(err.message);
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      alert("Please login to place an order");
      return;
    }

    setIsPlacing(true);
    
    try {
      // 1. Find the next available Daily Number
      const now = new Date();
      // Use local date for the display ID to match the outlet's day
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}${month}${year}`;
      
      // Calculate today's start in UTC for the database query
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Fetch the current max for today ONCE to start with a good guess
      const { data: maxOrder } = await supabase
        .from('orders')
        .select('daily_number')
        .gte('created_at', todayStart)
        .eq('outlet_id', selectedOutlet?.id)
        .order('daily_number', { ascending: false })
        .limit(1);

      let nextDailyNum = 1;
      if (maxOrder && maxOrder.length > 0) {
        nextDailyNum = maxOrder[0].daily_number + 1;
      }

      let orderData: any = null;
      let isUnique = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 30; // High limit for burst ordering

      while (!isUnique && attempts < MAX_ATTEMPTS) {
        attempts++;
        const finalOrderId = `GR6-${dateStr}-${nextDailyNum}`;
        
        const { data, error: insertError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            daily_number: nextDailyNum,
            order_id_display: finalOrderId,
            total_amount: total,
            order_type: orderType,
            payment_method: 'cash',
            outlet_id: selectedOutlet?.id
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') { // Duplicate key (Concurrency)
            // Just increment and try again immediately (Fast burst mode)
            nextDailyNum++;
            // Tiny jitter to allow other concurrent inserts to settle
            if (attempts % 3 === 0) {
              await new Promise(res => setTimeout(res, Math.random() * 100));
            }
            continue;
          }
          throw insertError;
        }

        orderData = data;
        isUnique = true;
      }

      if (!orderData) throw new Error("Could not generate a unique order ID after several attempts.");

      // 3. Insert Order Items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        item_name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. Send Email Invoice
      try {
        const trackingUrl = `${window.location.origin}/order-status/${orderData.id}`;
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #FF7E00; text-align: center;">GRILL 6 - ORDER CONFIRMED</h2>
            <p>Hi ${user.user_metadata?.full_name || 'Customer'},</p>
            <p>Thank you for ordering with Grill 6! Your order has been placed successfully.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" style="background: #FF7E00; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                📍 Track Your Order Live
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee;" />
            <div style="margin: 20px 0;">
              <p><strong>Order ID:</strong> ${orderData.order_id_display}</p>
              <p><strong>Outlet:</strong> ${selectedOutlet?.name}</p>
              <p><strong>Order Type:</strong> ${orderType?.toUpperCase()}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee;">Item</th>
                  <th style="text-align: center; padding: 10px; border-bottom: 1px solid #eee;">Qty</th>
                  <th style="text-align: right; padding: 10px; border-bottom: 1px solid #eee;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="text-align: right; font-size: 1.2rem; font-weight: bold; margin-top: 20px;">
              Total Amount: ₹${total.toFixed(2)}
            </div>
            <div style="text-align: center; margin-top: 40px; color: #888; font-size: 0.8rem;">
              <p>Grill 6 - Savor the Grill Experience</p>
              <p>This is an automated invoice, please do not reply.</p>
            </div>
          </div>
        `;

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: user.email,
            subject: `Your Grill 6 Invoice - Order #${orderData.order_id_display}`,
            html: emailHtml
          })
        });
      } catch (emailErr) {
        console.error("Failed to send invoice email:", emailErr);
      }

      // 5. Success UI
      // 5. Success - Redirect to tracking page and clear session selection
      clearCart();
      setOrderType(null);
      setSelectedOutlet(null);
      setDistance(null);
      setUserLocation(null);
      router.push(`/order-status/${orderData.id}`);
    } catch (err: any) {
      console.error("Order failed:", err);
      alert("Failed to place order: " + err.message);
    } finally {
      setIsPlacing(false);
    }
  };

  const subtotal = cartTotal;
  const total = subtotal - discountAmount;

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        <motion.div 
            key="cart-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.cartContent}
          >
        <div className={styles.itemList}>
          <h2 className={styles.sectionTitle}>Your Order</h2>

          {items.length === 0 ? (
            <div className={styles.emptyCart}>
              <p>Your cart is empty. Let's add some delicious food!</p>
            </div>
          ) : (
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <div className={item.isVeg ? styles.vegBadge : styles.nonVegBadge}></div>
                    <span className={styles.itemName}>{item.name}</span>
                  </div>

                  <div className={styles.itemControls}>
                    <div className={styles.quantityControl}>
                      <button onClick={() => updateQuantity(item.id, -1)} className={styles.qBtn}>-</button>
                      <span className={styles.qNum}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className={styles.qBtn} disabled={item.quantity >= 10}>+</button>
                    </div>
                    <span className={styles.itemTotal}>₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.checkoutSidebar}>
          {/* Order Summary Box */}
          <div className={styles.optionsBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className={styles.summaryTitle} style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Order Details</h3>
              <button onClick={() => setShowEditModal(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>Edit</button>
            </div>
            
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Type: <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{orderType || 'Not Selected'}</span></p>
              {orderType === 'takeaway' && (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent)' }}>
                  {distance !== null ? `Distance: ${distance.toFixed(2)} km` : 'Location not set'}
                </p>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showEditModal && <OrderTypeModal onClose={() => setShowEditModal(false)} />}
          </AnimatePresence>

          {/* Payment Method Selection */}
          <div className={styles.optionsBox}>
            <h3 className={styles.summaryTitle}>Payment Method</h3>
            <div className={styles.paymentMethods}>
              {/* Temporarily disabled online options
              <label className={`${styles.paymentLabel} ${paymentMethod === 'upi' ? styles.activePayment : ''}`}>
                <input type="radio" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className={styles.hiddenRadio} />
                <span>UPI</span>
              </label>
              <label className={`${styles.paymentLabel} ${paymentMethod === 'card' ? styles.activePayment : ''}`}>
                <input type="radio" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className={styles.hiddenRadio} />
                <span>Card</span>
              </label>
              */}
              <label className={`${styles.paymentLabel} ${styles.activePayment}`}>
                <input type="radio" checked={true} readOnly className={styles.hiddenRadio} />
                <span>Pay at Counter</span>
              </label>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: '0.5rem' }}>
              Online payments are currently unavailable. Please pay at the counter.
            </p>
          </div>

          {/* Coupon Section */}
          <div className={styles.optionsBox}>
            <h3 className={styles.summaryTitle}>Apply Coupon</h3>
            <AnimatePresence mode="wait">
              {!appliedCoupon ? (
                <motion.div 
                  key="coupon-input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={styles.couponInputWrapper}
                >
                  <input 
                    type="text" 
                    placeholder="Enter code (e.g. WELCOME10)" 
                    className={styles.couponInput}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <button 
                    onClick={handleApplyCoupon} 
                    className={styles.applyBtn}
                    disabled={isVerifyingCoupon || !couponCode}
                  >
                    {isVerifyingCoupon ? '...' : 'APPLY'}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="coupon-applied"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={styles.appliedCoupon}
                >
                  <div>
                    <p className={styles.couponCode}>{appliedCoupon.code}</p>
                    <p className={styles.couponSavings}>Saved ₹{discountAmount.toFixed(2)}!</p>
                  </div>
                  <button onClick={removeCoupon} className={styles.removeBtn}>Remove</button>
                </motion.div>
              )}
            </AnimatePresence>
            {couponError && <p className={styles.couponError}>{couponError}</p>}
          </div>

          {/* Bill Details */}
          <div className={styles.checkoutBox}>
            <h3 className={styles.summaryTitle}>Bill Details</h3>

            <div className={styles.billRow}>
              <span>Item Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div className={`${styles.billRow} ${styles.discountRow}`}>
                <span>Coupon Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className={`${styles.billRow} ${styles.totalRow}`}>
              <span>To Pay</span>
              <span>₹{total.toFixed(2)}</span>
            </div>

            <button
              className={`${styles.checkoutBtn} ${!isOutletOpen ? styles.closedBtn : ''}`}
              disabled={
                items.length === 0 ||
                orderType === null ||
                (orderType === 'takeaway' && (distance === null || (selectedOutlet && distance > (selectedOutlet.delivery_radius || 5)))) ||
                isPlacing ||
                !isOutletOpen ||
                !selectedOutlet
              }
              onClick={handlePlaceOrder}
            >
              {isPlacing ? 'PLACING ORDER...' : (isOutletOpen ? 'PLACE ORDER' : 'OUTLET CURRENTLY CLOSED')}
            </button>
            {!isOutletOpen && (
              <p className={styles.closedWarning}>
                🚫 We are not accepting orders at the moment. Please try again later!
              </p>
            )}
          </div>
        </div>
          </motion.div>
      </AnimatePresence>

      {showSuccessPopup && typeof document !== 'undefined' && createPortal(
        <div className={styles.toastOverlay}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: 0,
              transition: { type: "spring", damping: 15, stiffness: 300 }
            }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className={styles.toastPopup}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className={styles.toastIcon}
            >
              🎊
            </motion.div>
            <div className={styles.toastContent}>
              <h4>Coupon Applied!</h4>
              <p>{successMsg}</p>
            </div>
            <button onClick={() => setShowSuccessPopup(false)} className={styles.toastClose}>×</button>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.backdrop}
            onClick={() => setShowSuccessPopup(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
