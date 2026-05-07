"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const TABS = ['Profile', 'Your Orders', 'Addresses', 'Authentication', 'Settings', 'Delete Account'];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isAddressesLoading, setIsAddressesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile Form States
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  
  // MFA States
  const [mfaData, setMfaData] = useState<any>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [isMfaVerifying, setIsMfaVerifying] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<'none' | 'enrolling' | 'verified'>('none');

  const { user, isLoggedIn, userAddress, isAuthLoading } = useCart();
  const router = useRouter();

  // Check MFA status on load
  useEffect(() => {
    if (isLoggedIn && user) {
      supabase.auth.mfa.listFactors().then(({ data, error }) => {
        if (data?.all?.some(f => f.status === 'verified')) {
          setMfaStatus('verified');
        }
      });

      // Initialize form states
      const metadata = user.user_metadata || {};
      setFname(metadata.first_name || '');
      setLname(metadata.last_name || '');
    }
  }, [isLoggedIn, user]);

  const handleEnrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
      });
      if (error) throw error;
      setMfaData(data);
      setMfaStatus('enrolling');
    } catch (err: any) {
      alert("MFA Enrollment failed: " + err.message);
    }
  };

  const handleVerifyMFA = async () => {
    if (!mfaData || mfaVerifyCode.length !== 6) return;
    setIsMfaVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaData.id
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaData.id,
        challengeId: challengeData.id,
        code: mfaVerifyCode
      });

      if (verifyError) throw verifyError;
      
      setMfaStatus('verified');
      setMfaData(null);
      alert("MFA Enabled successfully!");
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setIsMfaVerifying(false);
    }
  };

  const handleUnenrollMFA = async () => {
    if (!confirm("Are you sure you want to disable 2FA?")) return;
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const factor = data?.all?.find(f => f.status === 'verified');
      if (factor) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
        setMfaStatus('none');
      }
    } catch (err: any) {
      alert("Failed to disable MFA: " + err.message);
    }
  };

  const fetchAddresses = async () => {
    setIsAddressesLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setIsAddressesLoading(false);
    }
  };

  const handleAddCurrentLocation = async () => {
    if (!userAddress) {
      alert("Please set your location in the navbar first!");
      return;
    }
    try {
      const { error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          address_line: userAddress,
          label: 'Current Location'
        });
      if (error) throw error;
      fetchAddresses();
    } catch (err: any) {
      alert("Failed to save address: " + err.message);
    }
  };

  const fetchOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      // 1. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: fname,
          last_name: lname
        }
      });
      if (authError) throw authError;

      // 2. Sync with Profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: fname,
          last_name: lname
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;

      alert("Profile updated successfully!");
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // If not logged in after check, redirect
    if (!isLoggedIn && !isAuthLoading) {
      router.push('/login');
    }
  }, [isLoggedIn, isAuthLoading, router]);

  useEffect(() => {
    let ordersSubscription: any;

    if (activeTab === 'Your Orders' && user?.id) {
      fetchOrders();

      // Subscribe to all order changes and filter on client side for better compatibility
      ordersSubscription = supabase
        .channel(`user-orders-live`)
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            table: 'orders'
          },
          (payload: any) => {
            console.log('Live Database Event:', payload);
            
            // Check if this update belongs to the current user
            const isMyOrder = payload.new?.user_id === user.id || payload.old?.user_id === user.id;
            
            if (isMyOrder) {
              console.log('Detected change in YOUR order. Syncing...');
              fetchOrders(); 
            }
          }
        )
        .subscribe((status) => {
          console.log(`Live Sync Status: ${status}`);
        });
    }
    
    if (activeTab === 'Addresses' && user?.id) {
      fetchAddresses();
    }

    return () => {
      if (ordersSubscription) {
        supabase.removeChannel(ordersSubscription);
      }
    };
  }, [activeTab, user?.id]);

  if (isAuthLoading || !isLoggedIn) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className={styles.loader}></div>
      </div>
    );
  }

  const metadata = user?.user_metadata || {};

  const renderContent = () => {
    switch (activeTab) {
      case 'Your Orders':
        return (
          <motion.div 
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle}>Your Recent Orders</h2>
            <div className={styles.orderList}>
              {isOrdersLoading ? (
                <p>Loading your orders...</p>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <motion.div 
                    layout
                    key={order.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={styles.orderCard}
                    onClick={() => router.push(`/order-status/${order.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.orderInfo}>
                      <div className={styles.orderMeta}>
                        <span className={styles.orderId}>#{order.daily_number} ({order.order_id_display})</span>
                        <span className={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className={styles.orderItems}>
                        {order.order_items.map((oi: any) => `${oi.item_name} (x${oi.quantity})`).join(', ')}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <span className={styles.orderTotal}>₹{order.total_amount}</span>
                        {order.status === 'completed' && (
                          <button 
                            className={styles.reviewBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("Review feature coming soon! Thank you for your feedback.");
                            }}
                          >
                            ⭐ Review Order
                          </button>
                        )}
                      </div>
                    </div>
                    <motion.div 
                      key={`${order.id}-${order.status}`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className={styles.orderStatus} 
                      style={{ 
                        padding: '4px 12px', 
                        borderRadius: '12px', 
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        backgroundColor: order.status === 'pending' ? '#fef3c7' : 
                                       order.status === 'preparing' ? '#dbeafe' :
                                       order.status === 'ready' ? '#f0fdf4' : '#dcfce7',
                        color: order.status === 'pending' ? '#92400e' : 
                               order.status === 'preparing' ? '#1e40af' :
                               order.status === 'ready' ? '#166534' : '#166534',
                        boxShadow: order.status === 'ready' ? '0 0 15px rgba(22, 101, 52, 0.2)' : 'none'
                      }}
                    >
                      {order.status}
                    </motion.div>
                  </motion.div>
                ))
              ) : (
                <div className={styles.emptyOrders}>
                  <p>You haven't placed any orders yet. Time to eat!</p>
                  <button onClick={() => router.push('/menu')} className={styles.secondaryBtn} style={{ marginTop: '1rem' }}>Browse Menu</button>
                </div>
              )}
            </div>
          </motion.div>
        );
      
      case 'Profile':
        return (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <input 
                  type="text" 
                  value={fname} 
                  onChange={(e) => setFname(e.target.value.toUpperCase())} 
                  className={styles.input} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name</label>
                <input 
                  type="text" 
                  value={lname} 
                  onChange={(e) => setLname(e.target.value.toUpperCase())} 
                  className={styles.input} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input type="email" defaultValue={user?.email || ''} className={styles.input} readOnly />
                <p className={styles.lockNotice}>Contact admin to change your email</p>
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <div className={styles.phoneInputWrapper} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--input-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '0 1rem' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-muted)', marginRight: '0.5rem' }}>+91</span>
                  <input 
                    type="tel" 
                    defaultValue={metadata.mobile_number || ''} 
                    className={styles.input} 
                    style={{ border: 'none', paddingLeft: '0' }}
                    readOnly
                  />
                </div>
                <p className={styles.lockNotice}>Contact admin to change your number</p>
              </div>
              <div className={styles.formGroup}>
                <label>Gender</label>
                <div className={styles.radioGroup} style={{ pointerEvents: 'none' }}>
                  <label className={styles.radioLabel}>
                    <input type="radio" checked={metadata.gender === 'male'} readOnly />
                    <span>Male</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" checked={metadata.gender === 'female'} readOnly />
                    <span>Female</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" checked={metadata.gender === 'others'} readOnly />
                    <span>Others</span>
                  </label>
                </div>
                <p className={styles.lockNotice}>Contact admin to change your gender</p>
              </div>
            </div>
            <button 
              className={styles.saveBtn} 
              onClick={handleProfileUpdate}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        );
      
      case 'Addresses':
        return (
          <motion.div 
            key="addresses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle}>Saved Addresses</h2>
            <p className={styles.helperText}>Manage your favorite delivery and takeaway locations.</p>
            
            <div className={styles.addressList}>
              {isAddressesLoading ? (
                <p>Loading addresses...</p>
              ) : addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div key={addr.id} className={styles.addressCard}>
                    <div className={styles.addressHeader}>
                      <span className={styles.addressType}>{addr.label}</span>
                      <button className={styles.editBtn} onClick={async () => {
                        await supabase.from('addresses').delete().eq('id', addr.id);
                        fetchAddresses();
                      }}>Delete</button>
                    </div>
                    <p>{addr.address_line}</p>
                  </div>
                ))
              ) : (
                <div className={styles.emptyOrders}>
                  <p>No saved addresses yet.</p>
                </div>
              )}
              
              {userAddress && !addresses.some(a => a.address_line === userAddress) && (
                <div className={styles.addressCard} style={{ borderStyle: 'dashed', opacity: 0.8 }}>
                  <div className={styles.addressHeader}>
                    <span className={styles.addressType}>Current Active Location</span>
                  </div>
                  <p>{userAddress}</p>
                  <button 
                    className={styles.addAddressBtn} 
                    style={{ marginTop: '1rem', width: 'auto', padding: '8px 16px' }}
                    onClick={handleAddCurrentLocation}
                  >
                    Save to Profile
                  </button>
                </div>
              )}
              
              <button className={styles.addAddressBtn} onClick={() => alert("Manual address entry coming soon! Use the Navbar to set location for now.")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Add New Address
              </button>
            </div>
          </motion.div>
        );

      case 'Authentication':
        return (
          <motion.div 
            key="auth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle}>Security Settings</h2>
            
            <div className={styles.authSection}>
              <h3>Two-Factor Authentication</h3>
              <p className={styles.helperText}>Add an extra layer of security to your account using an Authenticator app.</p>
              
              {mfaStatus === 'none' && (
                <button className={styles.secondaryBtn} onClick={handleEnrollMFA}>Enable 2FA</button>
              )}

              {mfaStatus === 'enrolling' && mfaData && (
                <div className={styles.mfaEnrollBox} style={{ marginTop: '2rem', textAlign: 'center', background: 'var(--background)', padding: '2rem', borderRadius: 'var(--radius)' }}>
                  <p style={{ marginBottom: '1rem' }}>Scan this QR code with Google Authenticator or Authy:</p>
                  <img 
                    src={mfaData.totp.qr_code} 
                    alt="MFA QR Code" 
                    style={{ width: '200px', height: '200px', backgroundColor: 'white', padding: '10px', borderRadius: '8px', margin: '0 auto' }} 
                  />
                  <div className={styles.formGroup} style={{ marginTop: '2rem', maxWidth: '300px', margin: '2rem auto 0' }}>
                    <label>Enter 6-digit Verification Code</label>
                    <input 
                      type="text" 
                      maxLength={6} 
                      placeholder="000000" 
                      className={styles.input} 
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value)}
                      style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                    <button className={styles.saveBtn} onClick={handleVerifyMFA} disabled={isMfaVerifying || mfaVerifyCode.length !== 6}>
                      {isMfaVerifying ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                    <button className={styles.secondaryBtn} onClick={() => setMfaStatus('none')}>Cancel</button>
                  </div>
                </div>
              )}

              {mfaStatus === 'verified' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--success)', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)', marginTop: '1rem' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>2FA is Active</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Your account is protected with Two-Factor Authentication.</p>
                  </div>
                  <button className={styles.editBtn} onClick={handleUnenrollMFA} style={{ color: 'var(--destructive)' }}>Disable</button>
                </div>
              )}
            </div>

            <div className={styles.authSection} style={{ marginTop: '3rem' }}>
              <h3>Change Password</h3>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <input type="password" placeholder="••••••••" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>New Password</label>
                <input type="password" placeholder="••••••••" className={styles.input} />
              </div>
              <button className={styles.saveBtn}>Update Password</button>
            </div>
          </motion.div>
        );

      case 'Settings':
        return (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle}>Preferences</h2>
            
            <div className={styles.settingsGroup}>
              <div className={styles.settingItem}>
                <div>
                  <h4>Order Updates</h4>
                  <p>Receive SMS notifications for order status.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.settingItem}>
                <div>
                  <h4>Promotional Emails</h4>
                  <p>Receive offers and discounts via email.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            <h2 className={styles.sectionTitle} style={{ marginTop: '3rem' }}>Advanced Options</h2>
            <div className={styles.settingsGroup}>
              <div className={styles.settingItem}>
                <div>
                  <h4>Developer Mode</h4>
                  <p>Enable verbose logging and beta features.</p>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.settingItem}>
                <div>
                  <h4>Download My Data</h4>
                  <p>Request an archive of your order history and account info.</p>
                </div>
                <button className={styles.secondaryBtn}>Export JSON</button>
              </div>
            </div>
          </motion.div>
        );

      case 'Delete Account':
        return (
          <motion.div 
            key="delete"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={styles.tabContent}
          >
            <h2 className={styles.sectionTitle} style={{ color: 'var(--destructive)' }}>Danger Zone</h2>
            <div className={styles.dangerBox}>
              <h3>Delete Account</h3>
              <p>Once you delete your account, there is no going back. All your saved addresses, order history, and preferences will be permanently wiped from our servers.</p>
              
              <div className={styles.confirmDelete}>
                <label>Type <strong>DELETE</strong> to confirm</label>
                <input type="text" placeholder="DELETE" className={styles.input} />
                <button className={styles.deleteBtn} disabled>Permanently Delete Account</button>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Account Settings</h1>
        <p>Manage your profile, preferences, and security.</p>
      </div>

      <div className={styles.dashboard}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="profileActiveTab"
                    className={styles.activeIndicator}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className={styles.contentArea}>
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
