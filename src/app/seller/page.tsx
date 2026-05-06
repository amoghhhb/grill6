"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { AnimatePresence } from 'framer-motion';
import EmailModal from '@/components/EmailModal/EmailModal';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';
import { motion } from 'framer-motion';

// Removed MOCK_ORDERS for real implementation

const CustomSelect = ({ options, value, onChange, label }: { options: any[], value: string, onChange: (val: string) => void, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

export default function SellerDashboard() {
  const { userRole, isLoggedIn, user } = useCart();
  const [activeTab, setActiveTab] = useState('orders');

  const [targetType, setTargetType] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDish, setNewDish] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    is_veg: true,
    image_url: ''
  });

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
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const toggleOutletStatus = async () => {
    setIsUpdatingStatus(true);
    const newStatus = !isAcceptingOrders;
    try {
      // 1. Update private user metadata for the seller's session
      await supabase.auth.updateUser({
        data: { is_open: newStatus }
      });

      // 2. Update public profiles table so customers can see it
      const { error } = await supabase
        .from('profiles')
        .update({ is_open: newStatus })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setIsAcceptingOrders(newStatus);
      setToastMessage(newStatus ? "🟢 Outlet is now OPEN" : "🔴 Outlet is now CLOSED");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error("Failed to update outlet status:", err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (user?.user_metadata) {
      setIsAcceptingOrders(user.user_metadata.is_open ?? true);
    }
  }, [user]);

  const fetchCategories = async () => {
    if (!user?.id) return;
    setIsLoadingCategories(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('seller_id', user.id)
      .order('name', { ascending: true });
    
    if (!error && data) {
      setCategories(data);
    }
    setIsLoadingCategories(false);
  };

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      fetchCategories();
    }
  }, [isLoggedIn, user?.id]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !user?.id) return;
    setIsAddingCategory(true);
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim(), seller_id: user.id }]);
      
      if (error) throw error;
      
      setNewCategoryName('');
      fetchCategories();
      setToastMessage("✅ Category added successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error("Failed to add category:", err.message);
      alert("Error adding category: " + err.message);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? This will NOT delete dishes in this category, but they won't have a category assigned anymore.")) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      fetchCategories();
      setToastMessage("🗑️ Category deleted");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error("Failed to delete category:", err.message);
    }
  };

  const [selectedEmailUser, setSelectedEmailUser] = useState<{ email: string; name: string } | null>(null);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    recipient_type: 'all',
    recipient_id: '',
    redirect_url: ''
  });

  const [sellerStats, setSellerStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    successRate: 0
  });

  const fetchOrders = async (isSilent = false) => {
    if (!user?.id) return;
    if (!isSilent) setIsLoadingOrders(true);
    
    // Fetch all orders with their items
    // We join with profiles and order_items
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*),
        profiles:user_id (email, first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error.message);
    } else {
      // Get all menu items for THIS seller
      const { data: myMenu } = await supabase
        .from('menu_items')
        .select('name')
        .eq('seller_id', user.id);
      
      // Create a normalized set of names for robust matching
      const myItemNames = new Set(myMenu?.map(m => m.name.toLowerCase().trim()) || []);

      // Filter orders to only show those that contain items from THIS seller
      const filteredOrders = userRole === 'admin' 
        ? (data || []) 
        : (data || []).filter(order => 
            order.order_items?.some((item: any) => 
              myItemNames.has(item.item_name?.toLowerCase().trim())
            )
          );

      setOrders(filteredOrders);

      // Calculate Seller-Specific Analytics
      let sellerRevenue = 0;

      filteredOrders.forEach(order => {
        // Match the Admin Dashboard logic by using total_amount
        const val = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount;
        sellerRevenue += (val || 0);
      });

      setSellerStats({
        totalRevenue: sellerRevenue,
        totalOrders: filteredOrders.length,
        successRate: filteredOrders.length > 0 
          ? (filteredOrders.filter(o => o.status === 'completed' || o.status === 'ready').length / filteredOrders.length) * 100 
          : 0
      });
    }
    setIsLoadingOrders(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    
    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      fetchOrders();
    }
  };

  const fetchCoupons = async () => {
    if (!user?.id) return;
    setIsLoadingCoupons(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setCoupons(data);
    setIsLoadingCoupons(false);
  };

  const fetchMenu = async () => {
    setIsLoadingMenu(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setMenuItems(data);
    setIsLoadingMenu(false);
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const { error } = await supabase
      .from('menu_items')
      .insert([{
        ...newDish,
        price: parseFloat(newDish.price),
        seller_id: user.id
      }]);

    if (!error) {
      setShowAddModal(false);
      setNewDish({ name: '', description: '', price: '', category: 'Starters', is_veg: true, image_url: '' });
      fetchMenu();
    } else {
      alert(error.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`; // bucket is already public/configured

      const { error: uploadError, data } = await supabase.storage
        .from('menu-items')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-items')
        .getPublicUrl(filePath);

      setNewDish({ ...newDish, image_url: publicUrl });
      alert("Image uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error uploading image: " + err.message + "\n(Note: Ensure 'menu-items' bucket exists in Supabase Storage)");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus })
      .eq('id', id);
    
    if (!error) fetchMenu();
  };

  const deleteDish = async (id: string) => {
    if (confirm('Are you sure you want to delete this dish?')) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);
      
      if (!error) fetchMenu();
    }
  };
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const { error } = await supabase
      .from('coupons')
      .insert([{
        ...newCoupon,
        discount_value: parseFloat(newCoupon.discount_value),
        min_order: parseFloat(newCoupon.min_order),
        seller_id: user.id
      }]);

    if (!error) {
      setShowCouponModal(false);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', target_type: 'all', target_details: '', status: 'active' });
      fetchCoupons();
    } else {
      alert(error.message);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (!error) fetchCoupons();
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('coupons')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (!error) fetchCoupons();
  };

  const handleUpdateTaxSetting = async (enabled: boolean) => {
    setIsUpdatingSettings(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { tax_enabled: enabled }
      });
      if (error) throw error;
      setTaxEnabled(enabled);
      alert(`Tax ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (err: any) {
      alert("Failed to update tax setting: " + err.message);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handlePushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!notifForm.title || !notifForm.message) {
      alert("Please fill in title and message!");
      return;
    }

    setIsPushing(true);
    try {
      console.log("[Seller] Attempting to push notification:", notifForm);
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          ...notifForm,
          sender_id: user.id
        }])
        .select();

      if (error) throw error;
      console.log("[Seller] Push Success! Inserted data:", data);

      setToastMessage("🚀 Notification Pushed Successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

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

  useEffect(() => {
    // Refresh data when switching to relevant tabs
    if ((activeTab === 'orders' || activeTab === 'analytics') && user?.id) {
      fetchOrders();
    }
    if (activeTab === 'menu' && user?.id) {
      fetchMenu();
    }
    if (activeTab === 'coupons' && user?.id) {
      fetchCoupons();
    }
    if (user?.user_metadata) {
      setTaxEnabled(user.user_metadata.tax_enabled ?? false);
    }

    // 1. High-Reliability Realtime Subscription for Orders
    const ordersSubscription = supabase
      .channel('seller-realtime-v4')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          table: 'orders',
          schema: 'public'
        }, 
        (payload) => {
          console.log('[Seller Realtime] Order Change:', payload);
          fetchOrders(true); // Silent update
        }
      )
      .subscribe();

    // 2. Failsafe "Heartbeat" Sync (Every 20 seconds)
    const heartbeat = setInterval(() => {
      if (activeTab === 'orders' || activeTab === 'analytics') {
        fetchOrders(true); // Silent update
      }
    }, 20000);

    return () => {
      supabase.removeChannel(ordersSubscription);
      clearInterval(heartbeat);
    };
  }, [activeTab, user?.id, user?.user_metadata]);

  // Hard block to prevent flash - Must be after all hooks
  if (!isLoggedIn || (userRole !== 'seller' && userRole !== 'admin')) {
    return null; 
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sellerProfile}>
          <div className={styles.avatar}>
            <img src="/images/logo.png" alt="Grill 6 Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h3>Grill 6 Outlet</h3>
            <p className={`${styles.status} ${!isAcceptingOrders ? styles.closed : ''}`}>
              <span className={`${styles.dot} ${!isAcceptingOrders ? styles.redDot : ''}`}></span> 
              {isAcceptingOrders ? 'Accepting Orders' : 'Currently Closed'}
            </p>
            <div className={styles.modernToggleWrapper}>
              <span className={`${styles.toggleLabel} ${!isAcceptingOrders ? styles.textClosed : ''}`}>Closed</span>
              <div 
                className={`${styles.simpleSwitch} ${isAcceptingOrders ? styles.switchOn : styles.switchOff}`}
                onClick={!isUpdatingStatus ? toggleOutletStatus : undefined}
              >
                <div className={styles.switchHandle} />
              </div>
              <span className={`${styles.toggleLabel} ${isAcceptingOrders ? styles.textOpen : ''}`}>Open</span>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${activeTab === 'orders' ? styles.active : ''}`} onClick={() => setActiveTab('orders')}>
            Live Orders {orders.length > 0 && <span className={styles.badge}>{orders.length}</span>}
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'menu' ? styles.active : ''}`} onClick={() => setActiveTab('menu')}>
            Menu Manager
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'coupons' ? styles.active : ''}`} onClick={() => setActiveTab('coupons')}>
            Coupon Manager
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'analytics' ? styles.active : ''}`} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'notifications' ? styles.active : ''}`} onClick={() => setActiveTab('notifications')}>
            Notification Pusher
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'settings' ? styles.active : ''}`} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
        </nav>
      </aside>

      <main className={styles.content}>
        {activeTab === 'orders' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Live Orders</h2>
            
            <div className={styles.tableCard}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Details</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className={styles.highlight}>{order.order_id_display}</td>
                      <td>
                        <strong>
                          {order.profiles?.first_name 
                            ? `${order.profiles.first_name} ${order.profiles.last_name || ''}`.trim()
                            : order.profiles?.email || 'Customer'}
                        </strong><br/>
                        <small className={styles.subtext}>
                          {order.order_items?.map((item: any) => `${item.quantity}x ${item.item_name}`).join(', ')}
                        </small>
                      </td>
                      <td><span className={styles.typeBadge}>{order.order_type}</span></td>
                      <td className={styles.amount}>
                        ₹{order.total_amount}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[order.status] || styles.pending}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button 
                            className={styles.emailBtn} 
                            onClick={() => setSelectedEmailUser({ 
                              email: order.profiles?.email || '', 
                              name: order.profiles?.first_name 
                                ? `${order.profiles.first_name} ${order.profiles.last_name || ''}`.trim()
                                : 'Customer' 
                            })}
                          >
                            <span className={styles.btnIcon}>✉️</span> Email
                          </button>
                          <select 
                            className={styles.actionSelect} 
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !isLoadingOrders && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No live orders found.</td>
                    </tr>
                  )}
                  {isLoadingOrders && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Loading live orders...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Manage Menu</h2>
              <button className={styles.primaryBtn} onClick={() => setShowAddModal(true)}>+ Add New Dish</button>
            </div>
            
            {isLoadingMenu ? (
              <p>Loading menu...</p>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Dish</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.name}</strong>
                          <br/><small className={styles.subtext}>{item.description}</small>
                        </td>
                        <td>{item.category}</td>
                        <td className={styles.amount}>₹{item.price}</td>
                        <td>
                          <span className={item.is_veg ? styles.vegBadge : styles.nonVegBadge}>
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`${styles.statusToggle} ${item.is_available ? styles.available : styles.unavailable}`}
                            onClick={() => toggleAvailability(item.id, item.is_available)}
                          >
                            {item.is_available ? 'In Stock' : 'Out of Stock'}
                          </button>
                        </td>
                        <td>
                          <button className={styles.dangerBtn} onClick={() => deleteDish(item.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {menuItems.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No dishes found. Add your first dish!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Outlet Coupon Manager</h2>
              <button className={styles.primaryBtn} onClick={() => setShowCouponModal(true)}>+ Create New Coupon</button>
            </div>
            
            {isLoadingCoupons ? (
              <p>Loading coupons...</p>
            ) : (
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Min Order</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map(coupon => (
                      <tr key={coupon.id}>
                        <td className={styles.highlight}>{coupon.code}</td>
                        <td>
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}% OFF` 
                            : `₹${coupon.discount_value} OFF`}
                        </td>
                        <td>₹{coupon.min_order}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
                            {coupon.target_type === 'all' ? 'All Users' : 
                             coupon.target_type === 'particular' ? `Email: ${coupon.target_details}` :
                             `Random (${coupon.target_type})`}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`${styles.statusToggle} ${coupon.status === 'active' ? styles.available : styles.unavailable}`}
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
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No coupons found. Create your first offer!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Outlet Performance</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>Total Sales Revenue</h3>
                <div className={styles.statValue}>₹{sellerStats.totalRevenue.toLocaleString()}</div>
                <span className={styles.successText}>Live from orders</span>
              </div>
              <div className={styles.statCard}>
                <h3>Orders Processed</h3>
                <div className={styles.statValue}>{sellerStats.totalOrders}</div>
                <span className={styles.subtext}>Lifetime total</span>
              </div>
              <div className={styles.statCard}>
                <h3>Success Rate</h3>
                <div className={styles.statValue}>{sellerStats.successRate.toFixed(1)}%</div>
                <span className={styles.subtext}>Orders completed</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              {/* Order Status Chart */}
              <div className={styles.tableCard} style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Fulfillment Distribution</h3>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: orders.filter(o => o.status === 'completed' || o.status === 'ready').length },
                          { name: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length },
                          { name: 'Pending/Preparing', value: orders.filter(o => ['pending', 'preparing'].includes(o.status)).length }
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" /> {/* Success Green */}
                        <Cell fill="#ef4444" /> {/* Destructive Red */}
                        <Cell fill="#f59e0b" /> {/* Amber Warning */}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time Based Sales Chart */}
              <div className={styles.tableCard} style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Sales Momentum</h3>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'This Month', 
                            value: orders.filter(o => {
                              const date = new Date(o.created_at);
                              const now = new Date();
                              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                            }).length 
                          },
                          { 
                            name: 'Rest of Year', 
                            value: orders.filter(o => {
                              const date = new Date(o.created_at);
                              const now = new Date();
                              return date.getFullYear() === now.getFullYear() && date.getMonth() !== now.getMonth();
                            }).length 
                          }
                        ].filter(d => d.value > 0 || (d.name === 'This Month' && d.value === 0))}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#6366f1" /> {/* Indigo */}
                        <Cell fill="#cbd5e1" /> {/* Slate 300 */}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className={styles.tableCard} style={{ padding: '2rem', marginTop: '2rem' }}>
              <h3>Revenue breakdown by items is now active.</h3>
              <p>Your analytics are calculated based on the items sold from your specific menu.</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Outlet Notification Pusher</h2>
            <form className={styles.formCard} onSubmit={handlePushNotification}>
              <div className={styles.formGroup}>
                <label>Notification Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Special Weekend Offer!" 
                  className={styles.input} 
                  value={notifForm.title}
                  onChange={e => setNotifForm({...notifForm, title: e.target.value})}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea 
                  placeholder="Write your message here..." 
                  className={styles.textarea}
                  value={notifForm.message}
                  onChange={e => setNotifForm({...notifForm, message: e.target.value})}
                  required
                ></textarea>
              </div>
 
              <div className={styles.formGroup}>
                <label>Target Group</label>
                <select 
                  className={styles.select} 
                  value={notifForm.recipient_type} 
                  onChange={(e) => setNotifForm({...notifForm, recipient_type: e.target.value})}
                >
                  <option value="all">Every Single User</option>
                  <option value="particular">Specific User ID</option>
                  <option value="admin">All Admins Only</option>
                  <option value="seller">All Sellers Only</option>
                </select>
              </div>
 
              {notifForm.recipient_type === 'particular' && (
                <div className={styles.formGroup}>
                  <label>User ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. USR-001" 
                    className={styles.input} 
                    value={notifForm.recipient_id}
                    onChange={e => setNotifForm({...notifForm, recipient_id: e.target.value})}
                    required
                  />
                </div>
              )}
 
              <div className={styles.formGroup}>
                <label>Redirect Link (Optional)</label>
                <input 
                  type="text" 
                  placeholder="/menu?category=Desserts" 
                  className={styles.input} 
                  value={notifForm.redirect_url}
                  onChange={e => setNotifForm({...notifForm, redirect_url: e.target.value})}
                />
              </div>
 
              <button 
                type="submit" 
                className={styles.primaryBtn} 
                disabled={isPushing}
              >
                {isPushing ? 'Pushing...' : '🚀 Push Notification'}
              </button>
            </form>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Outlet Settings</h2>
            <div className={styles.formCard}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <h3>Tax Configuration</h3>
                  <p>Enable or disable tax calculation for all orders at this outlet.</p>
                </div>
                <div className={styles.settingAction}>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={taxEnabled} 
                      disabled={isUpdatingSettings}
                      onChange={(e) => handleUpdateTaxSetting(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                  <span className={styles.statusLabel}>{taxEnabled ? 'Tax Enabled' : 'Tax Disabled'}</span>
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

      <AnimatePresence>
        {showAddModal && (
          <div className={styles.modalOverlay}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.modalContent}
            >
              <div className={styles.modalHeader}>
                <h2>Add New Dish</h2>
                <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddDish} className={styles.modalForm}>
              <div className={styles.sectionHeader}>
                <h3>Menu Management</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className={styles.addCategoryBtn}
                    onClick={() => setShowCategoryModal(true)}
                  >
                    📂 Manage Categories
                  </button>
                  <button 
                    className={styles.addDishBtn}
                    onClick={() => setShowAddModal(true)}
                  >
                    + Add New Dish
                  </button>
                </div>
              </div>
                <div className={styles.formGroup}>
                  <label>Dish Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Paneer Tikka" 
                    className={styles.input}
                    value={newDish.name}
                    onChange={e => setNewDish({...newDish, name: e.target.value})}
                  />
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Price (₹)</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="250" 
                      className={styles.input}
                      value={newDish.price}
                      onChange={e => setNewDish({...newDish, price: e.target.value})}
                    />
                  </div>
                  <CustomSelect 
                      options={categories.length > 0 
                        ? categories.map(c => ({ label: c.name, value: c.name }))
                        : [
                            { label: 'Starters', value: 'Starters' },
                            { label: 'Main Course', value: 'Main Course' },
                            { label: 'Desserts', value: 'Desserts' },
                            { label: 'Beverages', value: 'Beverages' }
                          ]
                      }
                      value={newDish.category}
                      onChange={(val) => setNewDish({ ...newDish, category: val })}
                      label="Category"
                    />
                </div>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="type" 
                        checked={newDish.is_veg} 
                        onChange={() => setNewDish({...newDish, is_veg: true})}
                      /> <span>Veg</span>
                    </label>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="type" 
                        checked={!newDish.is_veg} 
                        onChange={() => setNewDish({...newDish, is_veg: false})}
                      /> <span>Non-Veg</span>
                    </label>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea 
                    placeholder="Briefly describe the dish..." 
                    className={styles.textarea}
                    value={newDish.description}
                    onChange={e => setNewDish({...newDish, description: e.target.value})}
                  ></textarea>
                </div>
                <div className={styles.formGroup}>
                  <label>Dish Image</label>
                  <div className={styles.imageUploadArea}>
                    <input 
                      type="text" 
                      placeholder="https://image-url.com..." 
                      className={styles.input}
                      value={newDish.image_url}
                      onChange={e => setNewDish({...newDish, image_url: e.target.value})}
                    />
                    <div className={styles.uploadActionRow}>
                      <span className={styles.orText}>OR</span>
                      <label className={styles.browseBtn}>
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        {isUploading ? 'Uploading...' : 'Browse Device'}
                      </label>
                    </div>
                  </div>
                  {newDish.image_url && (
                    <div className={styles.imagePreview}>
                      <img src={newDish.image_url} alt="Preview" />
                      <button type="button" onClick={() => setNewDish({...newDish, image_url: ''})}>Remove</button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className={styles.secondaryBtn} 
                    style={{ flex: 1 }}
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.primaryBtn} 
                    style={{ flex: 2 }}
                  >
                    Save Dish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCouponModal && (
          <div className={styles.modalOverlay}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.modalContent}
            >
              <div className={styles.modalHeader}>
                <h2>Create New Coupon</h2>
                <button className={styles.closeBtn} onClick={() => setShowCouponModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddCoupon} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label>Coupon Code</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. WELCOME10" 
                    className={styles.input}
                    style={{ textTransform: 'uppercase' }}
                    value={newCoupon.code}
                    onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
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
                    <label>Discount Value</label>
                    <input 
                      type="number" 
                      required 
                      placeholder={newCoupon.discount_type === 'percentage' ? '10' : '50'} 
                      className={styles.input}
                      value={newCoupon.discount_value}
                      onChange={e => setNewCoupon({...newCoupon, discount_value: e.target.value})}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Minimum Order Value (₹)</label>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className={styles.input}
                    value={newCoupon.min_order}
                    onChange={e => setNewCoupon({...newCoupon, min_order: e.target.value})}
                  />
                </div>
                <CustomSelect 
                  label="Target Audience"
                  value={newCoupon.target_type}
                  onChange={(val) => setNewCoupon({...newCoupon, target_type: val, target_details: ''})}
                  options={[
                    { value: 'all', label: 'All Users (Global)' },
                    { value: 'particular', label: 'Particular User (by ID)' },
                    { value: 'random_very', label: 'Very Random' },
                    { value: 'random_orders', label: 'Based on Total Orders' },
                    { value: 'random_recent', label: 'Based on Recent Purchases' },
                    { value: 'random_highest', label: 'Highest Purchase Users' },
                    { value: 'top_10', label: 'Top 10 Buyers' }
                  ]}
                />

                {newCoupon.target_type === 'particular' && (
                  <div className={styles.formGroup}>
                    <label>User Email</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="e.g. customer@example.com" 
                      className={styles.input}
                      value={newCoupon.target_details}
                      onChange={e => setNewCoupon({...newCoupon, target_details: e.target.value})}
                    />
                  </div>
                )}

                {newCoupon.target_type.startsWith('random_') && (
                  <div className={styles.formGroup}>
                    <label>Sample Size (Number of Users)</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="e.g. 50" 
                      className={styles.input}
                      value={newCoupon.target_details}
                      onChange={e => setNewCoupon({...newCoupon, target_details: e.target.value})}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className={styles.secondaryBtn} 
                    style={{ flex: 1 }}
                    onClick={() => setShowCouponModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.primaryBtn} 
                    style={{ flex: 2 }}
                  >
                    Create Coupon
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={styles.toast}
          >
            <div className={styles.toastContent}>
              <span className={styles.toastIcon}>🚀</span>
              <p>{toastMessage}</p>
            </div>
            <div className={styles.toastProgress}></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
