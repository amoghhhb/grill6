"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './page.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import EmailModal from '@/components/EmailModal/EmailModal';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

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

const RoleDropdown = ({ userId, currentRole, onRoleChange }: { userId: string, currentRole: string, onRoleChange: (uid: string, role: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const roles = ['user', 'seller', 'admin'];

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div className={styles.customDropdownContainer}>
      <button 
        ref={buttonRef}
        className={`${styles.roleDisplay} ${styles[currentRole]}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {currentRole}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, pointerEvents: 'none' }}>
              <div 
                className={styles.dropdownOverlay} 
                style={{ pointerEvents: 'auto' }}
                onClick={() => setIsOpen(false)} 
              />
              <motion.div 
                className={styles.dropdownList}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'fixed',
                  top: (coords.top + 8) + 'px',
                  left: coords.left + 'px',
                  minWidth: coords.width + 'px',
                  pointerEvents: 'auto',
                }}
              >
                {roles.map(role => (
                  <button 
                    key={role}
                    className={`${styles.dropdownItem} ${currentRole === role ? styles.activeItem : ''}`}
                    onClick={() => {
                      if (role !== currentRole) onRoleChange(userId, role);
                      setIsOpen(false);
                    }}
                  >
                    <span className={`${styles.roleDot} ${styles[role]}`}></span>
                    {role}
                  </button>
                ))}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const CustomSelect = ({ options, value, onChange, label }: { options: any[], value: string, onChange: (val: string) => void, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={styles.customSelectContainer} ref={containerRef}>
      <label className={styles.selectLabel}>{label}</label>
      <div 
        className={`${styles.selectDisplay} ${isOpen ? styles.selectOpen : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || 'Select option...'}</span>
        <motion.span 
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={styles.selectArrow}
        >
          ▼
        </motion.span>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={styles.selectDropdown}
          >
            {options.map(opt => (
              <div 
                key={opt.value} 
                className={`${styles.selectOption} ${value === opt.value ? styles.selectedOpt : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StaffAssignmentDropdown = ({ sellers, onAssign, disabled }: { sellers: any[], onAssign: (uid: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.staffDropdownContainer} ref={containerRef}>
      <button 
        type="button"
        className={`${styles.staffDropdownTrigger} ${isOpen ? styles.triggerActive : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>+ Assign Seller...</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={styles.staffDropdownList}
          >
            {sellers.length === 0 ? (
              <div className={styles.emptySellers}>No available sellers</div>
            ) : sellers.map(s => (
              <button 
                key={s.id}
                type="button"
                className={styles.staffOption}
                onClick={() => {
                  onAssign(s.id);
                  setIsOpen(false);
                }}
              >
                <div className={styles.staffAvatar}>{s.first_name[0]}{s.last_name[0]}</div>
                <div className={styles.staffInfo}>
                  <p className={styles.staffName}>{s.first_name} {s.last_name}</p>
                  <p className={styles.staffEmail}>{s.email}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function AdminDashboard() {
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
    status: 'active'
  });
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  
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

      // Calculate Stats
      // 'user' or NULL role are your real customers
      const totalUsers = profiles?.filter(p => p.role === 'user' || !p.role).length || 0;
      const totalSellers = profiles?.filter(p => p.role === 'seller').length || 0;

      // Fetch All Orders for Revenue calculation
      console.log("[Admin Analytics] Fetching orders...");
      const { data: orders, error: oError } = await supabase
        .from('orders')
        .select('total_amount');
      
      let totalRev = 0;
      let orderCount = 0;

      if (oError) {
        console.error("[Admin Analytics] Order Fetch Error:", oError);
      } else if (orders) {
        console.log("[Admin Analytics] Raw Orders Data:", orders);
        totalRev = orders.reduce((acc, curr) => {
          const val = typeof curr.total_amount === 'string' ? parseFloat(curr.total_amount) : curr.total_amount;
          return acc + (val || 0);
        }, 0);
        orderCount = orders.length;
      }

      setTotalStats({
        totalUsers,
        totalSellers,
        totalOrders: orderCount,
        totalRevenue: totalRev
      });
      console.log("[Admin Analytics] Final Stats Applied:", { totalUsers, totalSellers, totalRev, orderCount });

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

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('coupons')
        .insert([{
          ...newCoupon,
          discount_value: parseFloat(newCoupon.discount_value),
          min_order: parseFloat(newCoupon.min_order),
          seller_id: null // Admin coupons are platform-wide
        }]);

      if (error) throw error;
      
      setShowCouponModal(false);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', target_type: 'all', target_details: '', status: 'active' });
      fetchCoupons();
      setToastMessage("🎟️ New Global Coupon Created!");
      setShowToast(true);
    } catch (err: any) {
      alert("Failed to create coupon: " + err.message);
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
      if (!error && data) setOutlets(data);
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
              <button className={styles.primaryBtn} onClick={() => setShowCouponModal(true)}>+ Create Global Coupon</button>
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
                          <button className={styles.dangerBtn} onClick={() => deleteCoupon(coupon.id)}>Delete</button>
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
                    <span className={`${styles.statusBadge} ${outlet.is_open ? styles.pending : styles.cancelled}`}>
                      {outlet.is_open ? 'OPEN' : 'CLOSED'}
                    </span>
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
                <div className={styles.statIcon}>💰</div>
                <div className={styles.statContent}>
                  <h3>Gross Revenue</h3>
                  <div className={styles.statValue}>₹{totalStats.totalRevenue.toLocaleString()}</div>
                  <div className={`${styles.statTrend} ${styles.trendUp}`}>+12.5% vs last month</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📦</div>
                <div className={styles.statContent}>
                  <h3>Total Orders</h3>
                  <div className={styles.statValue}>{totalStats.totalOrders}</div>
                  <div className={`${styles.statTrend} ${styles.trendUp}`}>+5.2% vs last month</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statContent}>
                  <h3>User Growth</h3>
                  <div className={styles.statValue}>{totalStats.totalUsers}</div>
                  <div className={`${styles.statTrend} ${styles.trendUp}`}>+24 new this week</div>
                </div>
              </div>
            </div>

            <div className={styles.chartsGrid}>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h4>Revenue Growth (INR)</h4>
                  <p>Daily platform earnings trend</p>
                </div>
                <div className={styles.chartBody}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3c8dbc" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3c8dbc" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                        itemStyle={{ color: '#3c8dbc' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#3c8dbc" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <h4>Order Frequency</h4>
                  <p>Daily order volume distribution</p>
                </div>
                <div className={styles.chartBody}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="orders" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
              <h2>Create Global Promotion</h2>
              <button className={styles.closeBtn} onClick={() => setShowCouponModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCoupon} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Coupon Code (e.g. SUMMER50)</label>
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
              <div className={styles.formGroup}>
                <label>Minimum Order Value (₹)</label>
                <input 
                  type="number" 
                  className={styles.input}
                  value={newCoupon.min_order} 
                  onChange={e => setNewCoupon({...newCoupon, min_order: e.target.value})}
                  placeholder="0"
                />
              </div>
              <CustomSelect 
                label="Target Audience"
                value={newCoupon.target_type}
                onChange={(val) => setNewCoupon({...newCoupon, target_type: val, target_details: ''})}
                options={[
                  { value: 'all', label: 'All Users (Global)' },
                  { value: 'particular', label: 'Particular User (by ID)' }
                ]}
              />
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
                Launch Global Coupon
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
