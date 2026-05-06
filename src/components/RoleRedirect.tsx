"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function RoleRedirect() {
  const { userRole, isLoggedIn } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. If not logged in, block Admin/Seller paths
    if (!isLoggedIn) {
      if (pathname.startsWith('/admin') || pathname.startsWith('/seller')) {
        router.push('/login');
      }
      return;
    }

    // 2. If logged in but role not fetched yet, wait
    if (!userRole) return;

    // 3. Prevent logged-in users from accessing /login
    if (pathname === '/login') {
      if (userRole === 'admin') router.push('/admin');
      else if (userRole === 'seller') router.push('/seller');
      else router.push('/');
      return;
    }

    // 4. Handle Seller Navigation
    if (userRole === 'seller') {
      // Auto-redirect to dashboard only if landing on homepage or login
      if (pathname === '/' || pathname === '/login') {
        router.push('/seller');
      }
    }

    // 5. Handle Admin Navigation
    if (userRole === 'admin') {
      // Auto-redirect to dashboard only if landing on homepage or login
      if (pathname === '/' || pathname === '/login') {
        router.push('/admin');
      }
    }

    // 6. Handle Normal User Restrictions
    if (userRole === 'user') {
      if (pathname.startsWith('/admin') || pathname.startsWith('/seller')) {
        router.push('/');
      }
    }
  }, [userRole, isLoggedIn, pathname, router]);

  return null;
}
