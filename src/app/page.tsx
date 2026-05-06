"use client";

import styles from './page.module.css';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function Home() {
  const { userRole, isLoggedIn, isAuthLoading } = useCart();

  // Prevent flash for sellers/admins who will be redirected
  if (isAuthLoading || (isLoggedIn && (userRole === 'admin' || userRole === 'seller'))) {
    return (
      <div style={{ height: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="loader-ring"></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Order Food Online</h1>
        <p>Delicious meals from Grill 6, delivered fast or ready for pickup.</p>
        <Link href="/menu" className={styles.ctaButton} style={{ display: 'inline-block', marginTop: '2rem', padding: '1rem 2rem', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-full)', fontWeight: 'bold', textDecoration: 'none', boxShadow: 'var(--shadow)' }}>
          Order Now
        </Link>
      </main>

      {/* Single Full-Screen Rolling Background */}
      <div className={styles.marqueeContainer}>
        <div className={styles.marqueeTrack}>
          {[
            '/images/burger.png',
            '/images/chicken_shawarma.png',
            '/images/fries.png',
            '/images/peri_peri_momos.png',
            '/images/momos.png',
            /* Duplicate for seamless loop */
            '/images/burger.png',
            '/images/chicken_shawarma.png',
            '/images/fries.png',
            '/images/peri_peri_momos.png',
            '/images/momos.png',
          ].map((src, i) => (
            <div key={i} className={styles.marqueeItem}>
              <img src={src} alt="Food Gallery" loading="lazy" />
            </div>
          ))}
        </div>
        <div className={styles.overlay}></div>
      </div>
    </div>
  );
}
