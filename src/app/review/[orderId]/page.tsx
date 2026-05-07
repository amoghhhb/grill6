"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import styles from './page.module.css';

export default function AddReviewPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useCart();
  
  const [order, setOrder] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*),
            outlets (name)
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error("Error fetching order for review:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, isLoggedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating!");
      return;
    }

    setIsSubmitting(true);
    try {
      // We'll try to insert into 'order_reviews' table
      // If it doesn't exist, we'll try to update the order metadata
      const { error } = await supabase
        .from('order_reviews')
        .insert([{
          order_id: orderId,
          user_id: user.id,
          outlet_id: order.outlet_id,
          rating,
          comment,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        // Fallback: Store in orders table if we have a review_data column or similar
        // For now, if table is missing, we'll tell the user
        if (error.code === '42P01') { // Table does not exist
          throw new Error("Review system database table is being initialized. Please contact admin.");
        }
        throw error;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 3000);
    } catch (err: any) {
      console.error("Failed to submit review:", err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.errorContainer}>
        <h1>Order Not Found</h1>
        <button onClick={() => router.push('/profile')}>Back to Profile</button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={styles.successCard}
        >
          <div className={styles.successIcon}>✨</div>
          <h1>Thank You!</h1>
          <p>Your review helps us improve the Grill 6 experience.</p>
          <button onClick={() => router.push('/profile')} className={styles.backBtn}>Back to My Orders</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.reviewCard}
      >
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.closeBtn}>✕</button>
          <h1>Rate Your Meal</h1>
          <p>Order #{order.order_id_display} from {order.outlets?.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.itemsSummary}>
            <p>You ordered: <strong>{order.order_items.map((i: any) => i.item_name).join(', ')}</strong></p>
          </div>

          <div className={styles.ratingSection}>
            <p>How was your experience?</p>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className={`${styles.starBtn} ${(hoveredRating || rating) >= star ? styles.active : ''}`}
                >
                  ⭐
                </motion.button>
              ))}
            </div>
            <span className={styles.ratingLabel}>
              {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent!' : 'Select a rating'}
            </span>
          </div>

          <div className={styles.commentSection}>
            <label htmlFor="comment">Tell us more (Optional)</label>
            <textarea
              id="comment"
              placeholder="What did you like? What can we improve?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
            />
            <span className={styles.charCount}>{comment.length}/500</span>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || rating === 0} 
            className={styles.submitBtn}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
