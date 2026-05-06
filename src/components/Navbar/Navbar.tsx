"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { MOCK_MENU } from '@/data/menu';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { itemCount, userAddress, setUserAddress, isLoggedIn, logout, user, userRole } = useCart();

  const handleMarkAllAsRead = async () => {
    if (!notifications.length) return;
    
    // Optimistically update UI
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    try {
      const ids = notifications.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleClearNotifications = async () => {
    if (!notifications.length) return;
    
    try {
      const ids = notifications.map(n => n.id);
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', ids);
        
      setNotifications([]);
      setShowNotifications(false);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  const [dishSuggestions, setDishSuggestions] = useState<any[]>([]);
  const [showDishSuggestions, setShowDishSuggestions] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Live Toast State
  const [activeToast, setActiveToast] = useState<any>(null);
  const [isHoveringToast, setIsHoveringToast] = useState(false);
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    if (!isLoggedIn || !user?.id) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false) // Only fetch unread notifications
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("[Navbar] Database Error:", error);
      return;
    }

    if (data) {
      const currentRole = (userRole || '').toLowerCase().trim();
      const filtered = data.filter((n: any) => {
        const target = (n.recipient_type || '').toLowerCase().trim();
        return (target === 'all' || target === '') || 
               (target === 'particular' && String(n.recipient_id) === String(user.id)) ||
               (target === currentRole);
      });
      setNotifications(filtered.slice(0, 10));
    }
  };

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = MOCK_MENU.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5);
      setDishSuggestions(filtered);
      setShowDishSuggestions(true);
    } else {
      setDishSuggestions([]);
      setShowDishSuggestions(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDishSuggestions(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

 
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    if (isLoggedIn && user?.id) {
      fetchNotifications();
 
      const channel = supabase
        .channel('global-notifs')
        .on(
          'postgres_changes' as any,
          { event: 'INSERT', table: 'notifications' },
          (payload: any) => {
            const newNotif = payload.new;
            const target = (newNotif.recipient_type || '').toLowerCase().trim();
            const currentRole = (userRole || '').toLowerCase().trim();
            const currentUserId = String(user?.id);
            
            
            // 1. If it's a global announcement
            const isGlobal = target === 'all' || target === '';
            
            // 2. If it's specifically for ME
            const isForMeById = target === 'particular' && String(newNotif.recipient_id) === currentUserId;
            
            // 3. If it's for MY role
            const isForMyRole = target !== 'particular' && target !== 'all' && target !== '' && target === currentRole;
            
            const isForMe = isGlobal || isForMeById || isForMyRole;
            
            if (isForMe) {
              setNotifications(prev => [newNotif, ...prev].slice(0, 10));
              
              // Trigger Live Toast
              setActiveToast(newNotif);
              
              // Reset any existing timer
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              toastTimerRef.current = setTimeout(() => {
                setActiveToast(null);
              }, 5000);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('scroll', handleScroll);
      };
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoggedIn, user?.id, userRole]);

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLocation.trim()) {
      setUserAddress(tempLocation.trim());
      setShowLocationModal(false);
    }
  };

  // Handle Toast Hover logic
  useEffect(() => {
    if (isHoveringToast && toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    } else if (!isHoveringToast && activeToast) {
      toastTimerRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 3000); // 3s buffer after mouse leaves
    }
  }, [isHoveringToast, activeToast]);

  const fetchSuggestions = async (query: string) => {
    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const response = await fetch(`https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${apiKey}`);
      const data = await response.json();
      if (data && data.predictions && data.predictions.length > 0) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTempLocation(value);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (value.trim().length > 3) {
      typingTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 500);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setTempLocation(suggestion.description);
    setShowSuggestions(false);
  };

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-content">
          <div className="nav-left">
            <Link href="/" className="logo">
              <img src="/images/logo.png" alt="Grill 6" style={{ height: '55px', width: 'auto', display: 'block' }} />
            </Link>
            
            <button className="location-selector" onClick={() => setShowLocationModal(true)}>
              <span className="location-label">Your Location</span>
              <span className="location-value">
                {userAddress ? (userAddress.length > 20 ? userAddress.substring(0, 20) + '...' : userAddress) : 'Select Location'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="location-chevron">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
          </div>
        
        <div className="search-container" ref={searchRef}>
          <input 
            type="text" 
            placeholder="Search dish or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length > 1 && setShowDishSuggestions(true)}
            className="search-input"
          />
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <AnimatePresence>
            {showDishSuggestions && dishSuggestions.length > 0 && (
              <motion.div 
                className="search-dropdown"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {dishSuggestions.map(item => (
                  <div 
                    key={item.id} 
                    className="search-suggestion-item"
                    onClick={() => {
                      router.push(`/menu?search=${encodeURIComponent(item.name)}`);
                      setSearchQuery('');
                      setShowDishSuggestions(false);
                    }}
                  >
                    <div className="suggestion-info">
                      <span className="suggestion-name">{item.name}</span>
                      <span className="suggestion-category">{item.category}</span>
                    </div>
                    <span className="suggestion-price">₹{item.price}</span>
                  </div>
                ))}
                <div 
                  className="search-suggestion-footer"
                  onClick={() => {
                    router.push(`/menu?search=${encodeURIComponent(searchQuery)}`);
                    setShowDishSuggestions(false);
                  }}
                >
                  See all results for "{searchQuery}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="nav-actions" style={{ gap: 0 }}>
          <AnimatePresence>
            {pathname !== '/menu' && (
              <motion.div
                key="menu-btn"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "linear" }}
                style={{ display: 'flex', marginRight: '1.2rem' }}
              >
                <button className="btn-icon" onClick={() => router.push('/menu')} style={{ width: 'auto', padding: '0 0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.05em', color: '#000000' }}>MENU</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            layout="position"
            className="btn-icon cart-btn" 
            onClick={() => router.push('/cart')}
            transition={{ duration: 0.2, ease: "linear" }}
            style={{ marginRight: '1.2rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <AnimatePresence mode="popLayout">
              {itemCount > 0 && (
                <motion.span 
                  key={itemCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="cart-badge"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          
          <div className="notification-container" ref={notificationRef}>
            <motion.button 
              layout="position"
              className="btn-icon notification-btn" 
              onClick={() => setShowNotifications(!showNotifications)}
              transition={{ duration: 0.2, ease: "linear" }}
              style={{ marginRight: '1.2rem' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.some(n => !n.is_read) && <span className="notification-dot"></span>}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  className="notification-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="notification-header">
                    <h3>Notifications</h3>
                    <div className="notification-actions">
                      {notifications.length > 0 && (
                        <>
                          <button onClick={handleMarkAllAsRead} className="action-btn">
                            Mark Read
                          </button>
                          <button onClick={handleClearNotifications} className="action-btn clear">
                            Clear All
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <Link 
                          key={notification.id} 
                          href={notification.redirect_url || '#'} 
                          className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => {
                            setShowNotifications(false);
                            // Optimistically mark as read on click
                            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
                          }}
                        >
                          <div className="notification-content">
                            <span className="notification-title">{notification.title}</span>
                            <p className="notification-message">{notification.message}</p>
                            <span className="notification-time">{notification.time}</span>
                          </div>
                          {!notification.is_read && <span className="unread-indicator"></span>}
                        </Link>
                      ))
                    ) : (
                      <div className="notification-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                        </svg>
                        <p>No new notifications</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="profile-container" ref={profileRef}>
            <motion.button 
              layout="position"
              className="btn-icon profile-btn" 
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              transition={{ duration: 0.2, ease: "linear" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </motion.button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div 
                  className="profile-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {isLoggedIn ? (
                    <>
                      <div className="dropdown-header">
                        <p className="user-name">
                          {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="user-email">{user?.email}</p>
                      </div>
                      <div className="dropdown-list">
                        <button onClick={() => { router.push('/profile'); setShowProfileDropdown(false); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Your Profile
                        </button>

                        {(userRole === 'seller' || userRole === 'admin') && (
                          <button onClick={() => { 
                            router.push(userRole === 'admin' ? '/admin' : '/seller'); 
                            setShowProfileDropdown(false); 
                          }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-icon">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM14 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zM14 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
                            </svg>
                            {userRole === 'admin' ? 'Admin Panel' : 'Seller Dashboard'}
                          </button>
                        )}

                        <button className="logout-btn" onClick={() => { logout(); setShowProfileDropdown(false); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="dropdown-list">
                      <button onClick={() => { router.push('/login'); setShowProfileDropdown(false); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Login / Signup
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </header>

      {/* Location Prompt Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => userAddress && setShowLocationModal(false)}
            />
            <motion.div 
              className="location-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <button 
                className="close-btn" 
                onClick={() => userAddress && setShowLocationModal(false)}
                disabled={!userAddress}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="modal-header">
                <h2>Select Your Location</h2>
                <p>Please enter your location to find the nearest Grill 6 restaurants for takeaway and dine-in.</p>
              </div>

              <form onSubmit={handleSaveLocation} className="location-form">
                <div className="input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="input-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Enter your street, area, or city" 
                    value={tempLocation}
                    onChange={handleInputChange}
                    autoFocus
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  />
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.ul 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          marginTop: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 100,
                          listStyle: 'none',
                          padding: 0,
                          boxShadow: 'var(--shadow-md)'
                        }}
                      >
                        {suggestions.map((s, idx) => (
                          <li 
                            key={idx} 
                            onClick={() => selectSuggestion(s)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              fontSize: '0.95rem'
                            }}
                          >
                            {s.description}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <button type="button" onClick={handleSaveLocation} className="save-btn" disabled={!tempLocation.trim()}>
                  Save Location
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Live Toast Popup */}
      <AnimatePresence>
        {activeToast && (
          <motion.div 
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="live-toast"
            onMouseEnter={() => setIsHoveringToast(true)}
            onMouseLeave={() => setIsHoveringToast(false)}
          >
            <div className="toast-glow"></div>
            <div className="toast-inner">
              <div className="toast-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="toast-text">
                <h5>{activeToast.title}</h5>
                <p>{activeToast.message}</p>
                {activeToast.redirect_url && (
                  <Link href={activeToast.redirect_url} className="toast-link" onClick={() => setActiveToast(null)}>
                    View Details →
                  </Link>
                )}
              </div>
              <button className="toast-close" onClick={() => setActiveToast(null)}>×</button>
            </div>
            <motion.div 
              className="toast-progress-bar"
              initial={{ width: "100%" }}
              animate={isHoveringToast ? { width: "100%" } : { width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
