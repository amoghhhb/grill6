"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import EmailModal from '@/components/EmailModal/EmailModal';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { RoleDropdown } from './components/RoleDropdown';
import { CustomSelect } from './components/CustomSelect';
import { StaffAssignmentDropdown } from './components/StaffAssignmentDropdown';

import { AdminAnalyticsCharts } from './components/AdminAnalyticsCharts';

export default function AdminDashboard() {
  const MOCK_CHART_DATA = [
    { date: '01 May', revenue: 4500, orders: 12 },
    { date: '02 May', revenue: 5200, orders: 15 },
    { date: '03 May', revenue: 3800, orders: 10 },
    { date: '04 May', revenue: 6100, orders: 18 },
    { date: '05 May', revenue: 7500, orders: 22 },
    { date: '06 May', revenue: 5900, orders: 16 },
    { date: '07 May', revenue: 8200, orders: 25 },
  ];

  const MOCK_USERS = [
    { id: 'USR-001', name: 'Test User', email: 'test@example.com', role: 'user', joined: '12 Jan 2026', status: 'active' },
    { id: 'USR-002', name: 'Grill 6 Outlet', email: 'seller@grill6.com', role: 'seller', joined: '10 Jan 2026', status: 'active' },
    { id: 'USR-003', name: 'Admin', email: 'admin@grill6.com', role: 'admin', joined: '1 Jan 2026', status: 'active' },
  ];
  const { user, userRole, isLoggedIn } = useCart();
  const [activeTab, setActiveTab] = useState('users');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [chartData, setChartData] = useState(MOCK_CHART_DATA);
  const [totalStats, setTotalStats] = useState({
  totalUsers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [outletBreakdown, setOutletBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailUser, setSelectedEmailUser] = useState<{ email: string; name: string } | null>(null);

  // Notification Pusher State
  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    recipient_type: 'all',
    recipient_id: '',
    redirect_url: ''
  });
  const [isPushing, setIsPushing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Coupon Manager State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order: '0',
    target_type: 'all',
    target_details: '',
    status: 'active',
    outlet_id: 'all'
  });
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  
  // Maintenance Mode State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [mfaPolicy, setMfaPolicy] = useState({ is_active: false });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [newOutlet, setNewOutlet] = useState({
    name: '',
    address: '',
    delivery_radius: '5',
    latitude: '',
    longitude: '',
    is_open: true
  });
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data: maintData } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .maybeSingle();
      
      const { data: mfaData } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'mfa_policy')
        .maybeSingle();
      
      if (maintData) setIsMaintenanceMode(maintData.value.is_active);
      if (mfaData) setMfaPolicy(mfaData.value);
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const toggleMfaPolicy = async () => {
    const newStatus = !mfaPolicy.is_active;
    if (!confirm(`Switching MFA will affect all Admins/Sellers. Continue?`)) return;
    
    setIsUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'mfa_policy', 
          value: { is_active: newStatus },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      setMfaPolicy({ is_active: newStatus });
      setToastMessage(newStatus ? "🔒 MFA Policy Enabled" : "🔓 MFA Policy Disabled");
      setShowToast(true);
    } catch (err: any) {
      alert("Failed to update policy: " + err.message);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    const newStatus = !isMaintenanceMode;
    if (!confirm(`Are you sure you want to ${newStatus ? 'ACTIVATE' : 'DEACTIVATE'} Maintenance Mode?`)) return;
    
    setIsUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'maintenance_mode', 
          value: { is_active: newStatus },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      setIsMaintenanceMode(newStatus);
      setToastMessage(newStatus ? "🚧 Maintenance Mode ACTIVE" : "✅ Platform back ONLINE");
      setShowToast(true);
    } catch (err: any) {
      alert("Failed to update settings: " + err.message);
    } finally {
      setIsUpdatingSettings(false);
    }
  };
  
  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      // Fetch Profiles
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (pError) {
        console.error("Profile fetch error:", pError);
        // If is_banned column is missing, this select '*' might fail in some strict environments
        // or just throw if the table doesn't exist. We handle it here.
      }
      setUsersList(profiles || []);

      // Fetch All Orders for Global Analytics
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total_amount, status, outlet_id');

      // Calculate Stats
      const successfulOrders = (allOrders || []).filter(o => o.status !== 'cancelled');
      
      const totalRev = successfulOrders.reduce((acc, curr) => {
        const val = typeof curr.total_amount === 'string' ? parseFloat(curr.total_amount) : curr.total_amount;
        return acc + (val || 0);
      }, 0);

      // Calculate Breakdown by Outlet
      const breakdownMap: any = {};
      allOrders?.forEach(order => {
        const oid = order.outlet_id || 'unassigned';
        if (!breakdownMap[oid]) {
          breakdownMap[oid] = { revenue: 0, count: 0, successCount: 0 };
        }
        breakdownMap[oid].count += 1;
        if (order.status !== 'cancelled') {
          const val = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount;
          breakdownMap[oid].revenue += (val || 0);
          breakdownMap[oid].successCount += 1;
        }
      });

      const breakdownArray = Object.keys(breakdownMap).map(id => ({
        id,
        name: outlets.find(o => o.id === id)?.name || (id === 'unassigned' ? 'Unassigned/Legacy' : 'Unknown Outlet'),
        ...breakdownMap[id]
      }));

      setOutletBreakdown(breakdownArray);

      setTotalStats({
        totalUsers: profiles?.filter(p => p.role === 'user' || !p.role).length || 0,
        totalSellers: profiles?.filter(p => p.role === 'seller').length || 0,
        totalOrders: successfulOrders.length,
        totalRevenue: totalRev
      });
      console.log("[Admin Analytics] Final Stats Applied:", { 
        totalUsers: profiles?.filter(p => p.role === 'user' || !p.role).length || 0, 
        totalSellers: profiles?.filter(p => p.role === 'seller').length || 0, 
        totalRev, 
        orderCount: successfulOrders.length 
      });

    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setIsLoadingCoupons(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCoupons(data || []);
    } catch (err: any) {
      console.error("Error fetching coupons:", err.message);
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const openEditCouponModal = (coupon: any) => {
    setNewCoupon({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order: coupon.min_order.toString(),
      target_type: coupon.target_type,
      target_details: coupon.target_details || '',
      status: coupon.status,
      outlet_id: coupon.outlet_id || 'all'
    });
    setIsEditingCoupon(true);
    setEditingCouponId(coupon.id);
    setShowCouponModal(true);
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const couponData = {
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: parseFloat(newCoupon.discount_value),
        min_order: parseFloat(newCoupon.min_order),
        target_type: newCoupon.target_type,
        target_details: newCoupon.target_details,
        status: newCoupon.status,
        outlet_id: newCoupon.outlet_id === 'all' ? null : newCoupon.outlet_id,
        seller_id: null // Admin coupons are managed by system
      };

      if (isEditingCoupon && editingCouponId) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCouponId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        if (error) throw error;
      }
      
      setShowCouponModal(false);
      setIsEditingCoupon(false);
      setEditingCouponId(null);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', target_type: 'all', target_details: '', status: 'active', outlet_id: 'all' });
      fetchCoupons();
      setToastMessage(isEditingCoupon ? "🎟️ Global Coupon Updated!" : "🎟️ New Global Coupon Created!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Permanently delete this coupon?')) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      fetchCoupons();
    } catch (err: any) {
      alert("Toggle failed: " + err.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSettings();
    fetchOutlets(); // Always fetch outlets for scoped promotions
    if (activeTab === 'coupons') {
      fetchCoupons();
    }
    if (activeTab === 'sellers') {
      fetchOutlets();
    }

    // 1. High-Reliability Realtime Subscription
    const dashboardSubscription = supabase
      .channel('admin-realtime-v4')
      .on(
        'postgres_changes',
        { event: '*', table: 'orders', schema: 'public' },
        (payload) => {
          console.log("[Realtime] Order Update Detected:", payload);
          fetchDashboardData(true); // Silent update
          setToastMessage("🔄 Live Update: Orders Updated");
          setShowToast(true);
          setTimeout(() => setShowToast(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'profiles', schema: 'public' },
        (payload) => {
          console.log("[Realtime] Profile Update Detected:", payload);
          fetchDashboardData(true); // Silent update
        }
      )
      .subscribe();

    // 2. Failsafe Heartbeat Sync (Refresh every 20 seconds)
    const heartbeat = setInterval(() => {
      fetchDashboardData(true); // Silent update
    }, 20000);

    return () => {
      supabase.removeChannel(dashboardSubscription);
      clearInterval(heartbeat);
    };
  }, [activeTab]);

  // Hard block to prevent flash - Move after all hooks
  if (!isLoggedIn || userRole !== 'admin') {
    return null;
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      alert("Role updated successfully!");
      fetchDashboardData();
    } catch (err: any) {
      alert("Error updating role: " + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("ID copied to clipboard!");
  };

  const handlePushNotification = async () => {
    if (!notifForm.title || !notifForm.message) {
      alert("Please fill in both title and message!");
      return;
    }
 
    setIsPushing(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          ...notifForm,
          sender_id: user?.id || 'admin'
        }]);
 
      if (error) throw error;
 
      setToastMessage("🚀 Platform Announcement Broadcasted!");
      setShowToast(true);
      
      setNotifForm({
        title: '',
        message: '',
        recipient_type: 'all',
        recipient_id: '',
        redirect_url: ''
      });
    } catch (err: any) {
      alert("Failed to push notification: " + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      setToastMessage(!currentStatus ? "🚫 User Banned Successfully" : "🔓 User Unbanned Successfully");
      setShowToast(true);
      fetchDashboardData(); // Refresh list
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  const fetchOutlets = async () => {
    setIsLoadingOutlets(true);
    try {
      const { data, error } = await supabase.from('outlets').select('*, outlet_assignments(*)');
      if (!error && data) {
        const { data: couponSettings } = await supabase.from('settings').select('*').eq('key', 'coupon_settings').maybeSingle();
        const disabledList = couponSettings?.value?.disabled_outlets || [];
        
        const enhancedOutlets = data.map(o => ({
          ...o,
          is_coupon_disabled: disabledList.includes(o.id)
        }));
        setOutlets(enhancedOutlets);
      }
    } catch (e) {
      console.error("Fetch outlets failed", e);
    } finally {
      setIsLoadingOutlets(false);
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('outlets').insert([{
        ...newOutlet,
        delivery_radius: parseFloat(newOutlet.delivery_radius)
      }]);
      if (error) throw error;
      setShowOutletModal(false);
      setNewOutlet({ name: '', address: '', delivery_radius: '5', latitude: '', longitude: '', is_open: true });
      fetchOutlets();
      setToastMessage("🏢 New Outlet Created!");
      setShowToast(true);
    } catch (e: any) {
      alert("Failed to create outlet: " + e.message);
    }
  };

  const handleAssignSeller = async (outletId: string, sellerId: string) => {
    if (!sellerId) return;
    setIsAssigning(true);
    try {
      const { error } = await supabase.from('outlet_assignments').insert([{
        outlet_id: outletId,
        user_id: sellerId
      }]);
      if (error) throw error;
      fetchOutlets();
      setToastMessage("🤝 Seller Assigned Successfully!");
      setShowToast(true);
    } catch (e: any) {
      alert("Assignment failed: " + e.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('outlet_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      fetchOutlets();
      setToastMessage("🗑️ Assignment Removed");
      setShowToast(true);
    } catch (e: any) {
      console.error(e);
    }
  };
 
  const handleToggleCoupons = async (outletId: string, currentStatus: boolean) => {
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'coupon_settings')
        .maybeSingle();
      
      let disabledOutlets = settingsData?.value?.disabled_outlets || [];
      
      if (currentStatus) {
        // Turning OFF -> Add to disabled list
        disabledOutlets = [...new Set([...disabledOutlets, outletId])];
      } else {
        // Turning ON -> Remove from disabled list
        disabledOutlets = disabledOutlets.filter((id: string) => id !== outletId);
      }

      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'coupon_settings', 
          value: { disabled_outlets: disabledOutlets },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
      
      fetchOutlets();
      setToastMessage(!currentStatus ? "🎟️ Coupons Enabled for Outlet" : "🚫 Coupons Disabled for Outlet");
      setShowToast(true);
    } catch (e: any) {
      alert("Update failed: " + e.message);
    }
  };

  const filteredUsers = usersList.filter(user => 
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.adminProfile}>
          <div className={styles.avatar}>A</div>
          <div>
            <h3>System Admin</h3>
            <p className={styles.status}><span className={styles.dot}></span> Superuser Access</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>
            User Management
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'sellers' ? styles.active : ''}`} onClick={() => setActiveTab('sellers')}>
            Seller Outlets
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'analytics' ? styles.active : ''}`} onClick={() => setActiveTab('analytics')}>
            Platform Metrics
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'coupons' ? styles.active : ''}`} onClick={() => setActiveTab('coupons')}>
            Coupon Manager
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'notifications' ? styles.active : ''}`} onClick={() => setActiveTab('notifications')}>
            Notification Pusher
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'settings' ? styles.active : ''}`} onClick={() => setActiveTab('settings')}>
            Global Settings
          </button>
        </nav>
      </aside>

      <main className={styles.content}>
        {activeTab === 'users' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>User Directory</h2>
              <div className={styles.searchBox}>
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Ban Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td className={styles.highlight}>
                        <div className={styles.idContainer}>
                          {u.id.substring(0, 8)}...
                          <button 
                            className={styles.copyBtn} 
                            onClick={() => copyToClipboard(u.id)}
                            title="Copy Full ID"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td><strong>{u.first_name} {u.last_name}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <RoleDropdown userId={u.id} currentRole={u.role} onRoleChange={handleRoleChange} />
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${u.is_banned ? styles.banned : styles.user}`}>
                          {u.is_banned ? 'Banned' : 'Safe'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={u.is_banned ? styles.actionBtn : styles.dangerBtn}
                          onClick={() => handleToggleBan(u.id, u.is_banned)}
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                        <button className={styles.actionBtn} onClick={() => setSelectedEmailUser({ email: u.email, name: `${u.first_name} ${u.last_name}` })}>Email</button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && filteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No users found matching your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Platform Notification Pusher</h2>
            <div className={styles.formCard}>
              <div className={styles.formGroup}>
                <label>Notification Title</label>
                <input 
                  type="text" 
                  placeholder="Global Announcement..." 
                  className={styles.input} 
                  value={notifForm.title}
                  onChange={e => setNotifForm({...notifForm, title: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea 
                  placeholder="Write announcement here..." 
                  className={styles.textarea}
                  value={notifForm.message}
                  onChange={e => setNotifForm({...notifForm, message: e.target.value})}
                ></textarea>
              </div>
              <div className={styles.formGroup}>
                <label>Target Group</label>
                <div className={styles.targetOptions}>
                  <select 
                    className={styles.select} 
                    value={notifForm.recipient_type} 
                    onChange={(e) => setNotifForm({...notifForm, recipient_type: e.target.value})}
                  >
                    <option value="all">Every Single User (Global)</option>
                    <option value="particular">Specific Customer (Targeted)</option>
                    <option value="admin">All Admins Only</option>
                    <option value="seller">All Sellers Only</option>
                  </select>
                </div>
              </div>
              
              {notifForm.recipient_type === 'particular' && (
                <div className={styles.formGroup}>
                  <label>Search & Select Recipient</label>
                  <div className={styles.userSearchContainer}>
                    <input 
                      type="text" 
                      placeholder="Type name or email to find user..." 
                      className={styles.input} 
                      onChange={(e) => {
                        const search = e.target.value.toLowerCase();
                        if (search.length > 1) {
                          const found = usersList.find(u => 
                            `${u.first_name} ${u.last_name}`.toLowerCase().includes(search) || 
                            u.email.toLowerCase().includes(search)
                          );
                          if (found) {
                            setNotifForm({...notifForm, recipient_id: found.id});
                          }
                        }
                      }}
                    />
                    {notifForm.recipient_id && (
                      <div className={styles.selectedRecipient}>
                        Selected: <strong>{usersList.find(u => u.id === notifForm.recipient_id)?.first_name}</strong> 
                        <span className={styles.idBadge}>{notifForm.recipient_id.substring(0, 8)}...</span>
                        <button className={styles.clearBtn} onClick={() => setNotifForm({...notifForm, recipient_id: ''})}>×</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
 
              <div className={styles.formGroup}>
                <label>Redirect URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="/menu or /profile" 
                  className={styles.input} 
                  value={notifForm.redirect_url}
                  onChange={e => setNotifForm({...notifForm, redirect_url: e.target.value})}
                />
              </div>
 
              <button 
                className={styles.primaryBtn} 
                onClick={handlePushNotification}
                disabled={isPushing}
              >
                {isPushing ? 'Broadcasting...' : 'Broadcast Notification'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Universal Coupon Manager</h2>
              <button className={styles.primaryBtn} onClick={() => {
                setIsEditingCoupon(false);
                setEditingCouponId(null);
                setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', target_type: 'all', target_details: '', status: 'active', outlet_id: 'all' });
                setShowCouponModal(true);
              }}>+ Create Global Coupon</button>
            </div>
            
            {isLoadingCoupons ? (
              <div className={styles.emptyState}><p>Synchronizing Coupons...</p></div>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Min Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(coupon => (
                      <tr key={coupon.id}>
                        <td className={styles.highlight}>{coupon.code}</td>
                        <td>{coupon.discount_type.toUpperCase()}</td>
                        <td>
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}% OFF` 
                            : `₹${coupon.discount_value} OFF`}
                        </td>
                        <td>₹{coupon.min_order}</td>
                        <td>
                          <button 
                            className={`${styles.statusToggle} ${coupon.status === 'active' ? styles.available : styles.unavailable}`}
                            style={{ 
                              padding: '0.4rem 0.8rem', 
                              borderRadius: '20px', 
                              border: 'none', 
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: coupon.status === 'active' ? '#d1fae5' : '#fee2e2',
                              color: coupon.status === 'active' ? '#065f46' : '#991b1b'
                            }}
                            onClick={() => toggleCouponStatus(coupon.id, coupon.status)}
                          >
                            {coupon.status.toUpperCase()}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.actionBtn} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => openEditCouponModal(coupon)}>Edit</button>
                            <button className={styles.dangerBtn} onClick={() => deleteCoupon(coupon.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>No coupons found in the system.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sellers' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Outlet Command Center</h2>
              <button className={styles.primaryBtn} onClick={() => setShowOutletModal(true)}>+ New Outlet</button>
            </div>

            <div className={styles.outletGrid}>
              {isLoadingOutlets ? (
                <p>Loading Outlets...</p>
              ) : outlets.map(outlet => (
                <div key={outlet.id} className={styles.outletCard}>
                  <div className={styles.outletHeader}>
                    <h3>{outlet.name}</h3>
                    <div className={styles.headerBadges}>
                      <span className={`${styles.statusBadge} ${!outlet.is_coupon_disabled ? styles.available : styles.unavailable}`} style={{ fontSize: '0.6rem' }}>
                        {!outlet.is_coupon_disabled ? 'COUPONS ON' : 'COUPONS OFF'}
                      </span>
                      <span className={`${styles.statusBadge} ${outlet.is_open ? styles.pending : styles.cancelled}`}>
                        {outlet.is_open ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                  </div>
                  <p className={styles.outletAddr}>{outlet.address}</p>
                  
                  <div className={styles.assignmentSection}>
                    <h4>👥 Assigned Sellers</h4>
                    <div className={styles.staffList}>
                      {outlet.outlet_assignments?.map((asgn: any) => {
                        const seller = usersList.find(u => u.id === asgn.user_id);
                        return (
                          <div key={asgn.id} className={styles.staffItem}>
                            <span>{seller ? `${seller.first_name} ${seller.last_name}` : 'Unknown Seller'}</span>
                            <button onClick={() => handleRemoveAssignment(asgn.id)} className={styles.removeBtn}>×</button>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className={styles.assignRow}>
                        <StaffAssignmentDropdown 
                          sellers={usersList.filter(u => u.role === 'seller')}
                          onAssign={(uid) => handleAssignSeller(outlet.id, uid)}
                          disabled={isAssigning}
                        />
                    </div>
                  </div>

                  <div className={styles.outletActions}>
                    <div className={styles.toggleSetting}>
                      <span>Allow Coupons</span>
                      <div 
                        className={`${styles.simpleSwitch} ${!outlet.is_coupon_disabled ? styles.switchOn : styles.switchOff}`}
                        onClick={() => handleToggleCoupons(outlet.id, !outlet.is_coupon_disabled)}
                      >
                        <div className={styles.switchHandle} />
                      </div>
                    </div>
                    <button 
                      className={`${styles.actionBtn} ${outlet.is_open ? styles.dangerBtn : styles.successBtn}`}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      onClick={async () => {
                        const { error } = await supabase.from('outlets').update({ is_open: !outlet.is_open }).eq('id', outlet.id);
                        if (!error) fetchOutlets();
                      }}
                    >
                      {outlet.is_open ? 'Close Store' : 'Open Store'}
                    </button>
                  </div>
                </div>
              ))}
              {!isLoadingOutlets && outlets.length === 0 && (
                <div className={styles.emptyState}>No outlets created yet.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in">
            <div className={styles.analyticsHeader}>
              <h2 className={styles.pageTitle}>Live Platform Intelligence</h2>
              <div className={styles.timeRange}>Last 30 Days</div>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>Gross Revenue (Global)</h3>
                <div className={styles.statValue}>₹{totalStats.totalRevenue.toLocaleString()}</div>
                <div className={styles.statMeta}>+12.5% vs last month</div>
              </div>
              <div className={styles.statCard}>
                <h3>Total Orders (Global)</h3>
                <div className={styles.statValue}>{totalStats.totalOrders}</div>
                <div className={styles.statMeta}>+5.2% vs last month</div>
              </div>
              <div className={styles.statCard}>
                <h3>User Growth</h3>
                <div className={styles.statValue}>{totalStats.totalUsers}</div>
                <div className={styles.statMeta}>+24 new this week</div>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>Performance by Outlet</h3>
            <div className={styles.tableCard} style={{ marginBottom: '3rem' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Outlet Name</th>
                    <th>Successful Orders</th>
                    <th>Success Rate</th>
                    <th>Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {outletBreakdown.map(item => (
                    <tr key={item.id}>
                      <td className={styles.highlight}>{item.name}</td>
                      <td>{item.successCount}</td>
                      <td>{item.count > 0 ? ((item.successCount / item.count) * 100).toFixed(1) : '0'}%</td>
                      <td className={styles.amount}>₹{item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h4>Revenue Growth (INR)</h4>
                  <AdminAnalyticsCharts 
                    chartData={chartData}
                    outletBreakdown={outletBreakdown}
                  />
                </div>
              </div>
            </div>

            <div className={styles.insightsRow}>
              <div className={styles.insightBox}>
                <h4>Key Performance Indicators</h4>
                <div className={styles.kpiList}>
                  <div className={styles.kpiItem}>
                    <span>Average Order Value</span>
                    <strong>₹{totalStats.totalOrders > 0 ? (totalStats.totalRevenue / totalStats.totalOrders).toFixed(2) : '0'}</strong>
                  </div>
                  <div className={styles.kpiItem}>
                    <span>Customer Conversion Rate</span>
                    <strong>{totalStats.totalUsers > 0 ? ((totalStats.totalOrders / totalStats.totalUsers) * 100).toFixed(1) : '0'}%</strong>
                  </div>
                  <div className={styles.kpiItem}>
                    <span>Seller Adoption</span>
                    <strong>1 Seller per {totalStats.totalSellers > 0 ? (totalStats.totalUsers / totalStats.totalSellers).toFixed(0) : '0'} users</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Global Platform Settings</h2>
            
            <div className={styles.settingsGrid}>
              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3>Platform Maintenance Mode</h3>
                  <p>When active, all users except Admins will be blocked from ordering and viewing the menu. A "Maintenance" screen will be displayed.</p>
                </div>
                <div className={styles.settingAction}>
                  <div className={styles.modernToggleWrapper}>
                    <span className={`${styles.toggleLabel} ${!isMaintenanceMode ? styles.textClosed : ''}`}>Inactive</span>
                    <div 
                      className={`${styles.simpleSwitch} ${isMaintenanceMode ? styles.switchOn : styles.switchOff}`}
                      onClick={toggleMaintenanceMode}
                    >
                      <div className={styles.switchHandle} />
                    </div>
                    <span className={`${styles.toggleLabel} ${isMaintenanceMode ? styles.textOpen : ''}`}>Active</span>
                  </div>
                </div>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3>Global Store Status</h3>
                  <p>Force close all outlets across the platform instantly.</p>
                </div>
                <button className={styles.dangerBtn} style={{ padding: '0.8rem 1.5rem' }}>Force Shutdown</button>
              </div>

              <div className={styles.settingCard}>
                <div className={styles.settingInfo}>
                  <h3>Mandatory Admin/Seller MFA</h3>
                  <p>Require a 2-step email verification for all users with Admin or Seller roles before they can access their dashboards.</p>
                </div>
                <div className={styles.settingAction}>
                  <div className={styles.modernToggleWrapper}>
                    <span className={`${styles.toggleLabel} ${!mfaPolicy.is_active ? styles.textClosed : ''}`}>Off</span>
                    <div 
                      className={`${styles.simpleSwitch} ${mfaPolicy.is_active ? styles.switchOn : styles.switchOff}`}
                      onClick={toggleMfaPolicy}
                    >
                      <div className={styles.switchHandle} />
                    </div>
                    <span className={`${styles.toggleLabel} ${mfaPolicy.is_active ? styles.textOpen : ''}`}>Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedEmailUser && (
          <EmailModal 
            recipientEmail={selectedEmailUser.email} 
            recipientName={selectedEmailUser.name} 
            onClose={() => setSelectedEmailUser(null)} 
          />
        )}
      </AnimatePresence>
 
      {/* Coupon Creation Modal */}
      {showCouponModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{isEditingCoupon ? 'Edit Global Promotion' : 'Create Global Promotion'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowCouponModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCoupon} className={styles.modalForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Coupon Code</label>
                  <input 
                    type="text" 
                    className={styles.input}
                    value={newCoupon.code} 
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    required 
                    placeholder="MEGAOFFER"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Min. Order Value (₹)</label>
                  <input 
                    type="number" 
                    className={styles.input}
                    value={newCoupon.min_order} 
                    onChange={e => setNewCoupon({...newCoupon, min_order: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className={styles.formGrid}>
                <CustomSelect 
                  label="Discount Type"
                  value={newCoupon.discount_type}
                  onChange={(val) => setNewCoupon({...newCoupon, discount_type: val})}
                  options={[
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'flat', label: 'Flat Amount (₹)' }
                  ]}
                />
                <div className={styles.formGroup}>
                  <label>Value</label>
                  <input 
                    type="number" 
                    className={styles.input}
                    value={newCoupon.discount_value} 
                    onChange={e => setNewCoupon({...newCoupon, discount_value: e.target.value})}
                    required 
                    placeholder="10"
                  />
                </div>
              </div>
              <div className={styles.formGrid}>
                <CustomSelect 
                  label="Target Audience"
                  value={newCoupon.target_type}
                  onChange={(val) => setNewCoupon({...newCoupon, target_type: val, target_details: ''})}
                  options={[
                    { value: 'all', label: 'All Users (Global)' },
                    { value: 'particular', label: 'Particular User (by ID)' }
                  ]}
                />
                <CustomSelect 
                  label="Promotion Scope"
                  value={newCoupon.outlet_id}
                  onChange={(val) => setNewCoupon({...newCoupon, outlet_id: val})}
                  options={[
                    { value: 'all', label: 'Platform-Wide (Global)' },
                    ...outlets.map(o => ({ value: o.id, label: o.name }))
                  ]}
                />
              </div>
              {newCoupon.target_type === 'particular' && (
                <div className={styles.formGroup}>
                  <label>Recipient User ID</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Paste user ID here..." 
                    className={styles.input}
                    value={newCoupon.target_details}
                    onChange={e => setNewCoupon({...newCoupon, target_details: e.target.value})}
                  />
                </div>
              )}
              <button type="submit" className={styles.submitBtn}>
                {isEditingCoupon ? 'Update Global Coupon' : 'Launch Global Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Outlet Creation Modal */}
      {showOutletModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Setup New Outlet</h2>
              <button className={styles.closeBtn} onClick={() => setShowOutletModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOutlet} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Outlet Name</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={newOutlet.name} 
                  onChange={e => setNewOutlet({...newOutlet, name: e.target.value})}
                  required 
                  placeholder="e.g. Grill 6 - Downtown"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Full Address</label>
                <textarea 
                  className={styles.textarea}
                  value={newOutlet.address} 
                  onChange={e => setNewOutlet({...newOutlet, address: e.target.value})}
                  required 
                  placeholder="Street, City, Zip..."
                />
              </div>
              <div className={styles.formGroup}>
                <label>Delivery Radius (km)</label>
                <input 
                  type="number" 
                  className={styles.input}
                  value={newOutlet.delivery_radius} 
                  onChange={e => setNewOutlet({...newOutlet, delivery_radius: e.target.value})}
                  placeholder="5"
                />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Latitude</label>
                  <input 
                    type="number" step="any"
                    className={styles.input}
                    value={newOutlet.latitude} 
                    onChange={e => setNewOutlet({...newOutlet, latitude: e.target.value})}
                    required
                    placeholder="19.007..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Longitude</label>
                  <input 
                    type="number" step="any"
                    className={styles.input}
                    value={newOutlet.longitude} 
                    onChange={e => setNewOutlet({...newOutlet, longitude: e.target.value})}
                    required
                    placeholder="73.113..."
                  />
                </div>
              </div>
              <button type="submit" className={styles.submitBtn}>
                Initialize Outlet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={styles.toast}
          >
            <div className={styles.toastContent}>
              <div className={styles.toastIcon}>✨</div>
              <div className={styles.toastBody}>
                <h4>Success!</h4>
                <p>{toastMessage}</p>
              </div>
              <button className={styles.toastClose} onClick={() => setShowToast(false)}>×</button>
            </div>
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3, ease: "linear" }}
              onAnimationComplete={() => setShowToast(false)}
              className={styles.toastProgress}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
