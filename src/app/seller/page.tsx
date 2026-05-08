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
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<{variant_name: string, price: string}[]>([]);

  const addVariant = () => {
    setVariants([...variants, { variant_name: '', price: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: 'variant_name' | 'price', value: string) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

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
  const [assignedOutlets, setAssignedOutlets] = useState<any[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<'completed' | 'cancelled'>('completed');
  const [isCouponDisabled, setIsCouponDisabled] = useState(false);
  const [isVerifyingPermissions, setIsVerifyingPermissions] = useState(true);

  // Editing States
  const [isEditingDish, setIsEditingDish] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string>('');
  const [isEditingCoupon, setIsEditingCoupon] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const toggleOutletStatus = async () => {
    if (!selectedOutletId) return;
    setIsUpdatingStatus(true);
    const newStatus = !isAcceptingOrders;
    try {
      const { error } = await supabase
        .from('outlets')
        .update({ is_open: newStatus })
        .eq('id', selectedOutletId);
      
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

  const fetchInitialStatus = async () => {
    if (!selectedOutletId) return;
    
    // 1. Fetch Outlet Open/Closed status
    const { data: outletData } = await supabase
      .from('outlets')
      .select('is_open')
      .eq('id', selectedOutletId)
      .maybeSingle();
    
    if (outletData) {
      setIsAcceptingOrders(outletData.is_open);
    }

    // 2. Fetch Coupon permission status from global settings (Zero-SQL fallback)
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'coupon_settings')
        .maybeSingle();
      
      const disabledList = settingsData?.value?.disabled_outlets || [];
      const isDisabled = disabledList.includes(selectedOutletId);
      setIsCouponDisabled(isDisabled);
      
      // Auto-redirect if on coupons and it's disabled
      if (isDisabled && activeTab === 'coupons') {
        setActiveTab('orders');
      }
    } catch (e) {
      console.error("Permission check failed", e);
    } finally {
      setIsVerifyingPermissions(false);
    }
  };

  const fetchAssignments = async () => {
    if (!user?.id) return;
    setIsLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('outlet_assignments')
        .select('*, outlets(*)')
        .eq('user_id', user.id);
      
      if (!error && data && data.length > 0) {
        const uniqueOutlets = data.map(d => d.outlets);
        setAssignedOutlets(uniqueOutlets);
        setSelectedOutletId(uniqueOutlets[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchAssignments();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedOutletId) {
      fetchInitialStatus();
      // Listen for specific outlet status changes
      const channel = supabase
        .channel(`outlet-sync-${selectedOutletId}`)
        .on('postgres_changes' as any, { 
          event: '*', 
          table: 'outlets', 
          filter: `id=eq.${selectedOutletId}` 
        }, (payload: any) => {
          if (payload.new) {
            setIsAcceptingOrders(payload.new.is_open);
          }
        })
        .on('postgres_changes' as any, {
          event: '*',
          table: 'settings',
          filter: `key=eq.coupon_settings`
        }, (payload: any) => {
          if (payload.new) {
            const disabledList = payload.new.value?.disabled_outlets || [];
            setIsCouponDisabled(disabledList.includes(selectedOutletId));
          }
        })
        .subscribe();

      // Auto-redirect from coupons if disabled
      if (isCouponDisabled && activeTab === 'coupons') {
        setActiveTab('orders');
      }

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedOutletId, isCouponDisabled, activeTab]);

  const fetchCategories = async () => {
    if (!user?.id) return;
    setIsLoadingCategories(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
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
      if (isEditingCategory && editingCategoryId) {
        const { error } = await supabase
          .from('categories')
          .update({ name: newCategoryName.trim() })
          .eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{ name: newCategoryName.trim(), seller_id: user.id }]);
        if (error) throw error;
      }
      
      setNewCategoryName('');
      setIsEditingCategory(false);
      setEditingCategoryId(null);
      fetchCategories();
      setToastMessage(isEditingCategory ? "✅ Category renamed!" : "✅ Category added successfully!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error("Failed to handle category:", err.message);
      alert("Error: " + err.message);
    } finally {
      setIsAddingCategory(false);
    }
  };

  const openEditCategory = (cat: any) => {
    setNewCategoryName(cat.name);
    setIsEditingCategory(true);
    setEditingCategoryId(cat.id);
    // Scroll to input for better UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!user?.id || !selectedOutletId) return;
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
      .eq('outlet_id', selectedOutletId) // Filter by active outlet
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error.message);
    } else {
      // Since Grill 6 is a single-store platform, all Sellers/Admins see all orders
      const successfulOrders = (data || []).filter(o => o.status !== 'cancelled');
      setOrders(data || []);

      // Calculate Seller-Specific Analytics
      let sellerRevenue = 0;

      successfulOrders.forEach(order => {
        const val = typeof order.total_amount === 'string' ? parseFloat(order.total_amount) : order.total_amount;
        sellerRevenue += (val || 0);
      });

      setSellerStats({
        totalRevenue: sellerRevenue,
        totalOrders: successfulOrders.length,
        successRate: (data || []).length > 0 
          ? (successfulOrders.filter(o => o.status === 'completed' || o.status === 'ready').length / (data || []).length) * 100 
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
    if (!user?.id || !selectedOutletId) return;
    setIsLoadingCoupons(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('outlet_id', selectedOutletId)
      .order('created_at', { ascending: false });
    
    if (data) setCoupons(data);
    setIsLoadingCoupons(false);
  };

  const fetchMenu = async () => {
    if (!selectedOutletId) return;
    setIsLoadingMenu(true);
    const { data, error } = await supabase
      .from('menu_items')
      .select('*, menu_item_variants(*)')
      .eq('outlet_id', selectedOutletId)
      .order('created_at', { ascending: false });
    
    if (data) setMenuItems(data);
    setIsLoadingMenu(false);
  };

  const openEditDishModal = (item: any) => {
    setNewDish({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      is_veg: item.is_veg,
      image_url: item.image_url || ''
    });
    setOldImageUrl(item.image_url || '');
    setHasVariants(item.variants && item.variants.length > 0);
    setVariants(item.variants || []);
    setIsEditingDish(true);
    setEditingDishId(item.id);
    setShowAddModal(true);
  };

  const openEditCouponModal = (coupon: any) => {
    setNewCoupon({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order: coupon.min_order.toString(),
      target_type: coupon.target_type,
      target_details: coupon.target_details || '',
      status: coupon.status
    });
    setIsEditingCoupon(true);
    setEditingCouponId(coupon.id);
    setShowCouponModal(true);
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutletId || !user?.id) return;

    try {
      const dishData = {
        name: newDish.name,
        description: newDish.description,
        price: hasVariants ? 0 : parseFloat(newDish.price),
        category: newDish.category,
        is_veg: newDish.is_veg,
        image_url: newDish.image_url,
        outlet_id: selectedOutletId,
        seller_id: user.id,
        is_available: true
      };

      let resultId;

      if (isEditingDish && editingDishId) {
        const { error } = await supabase
          .from('menu_items')
          .update(dishData)
          .eq('id', editingDishId);
        if (error) throw error;
        resultId = editingDishId;

        // Cleanup: Delete old image from storage if it was replaced
        if (oldImageUrl && oldImageUrl !== newDish.image_url && oldImageUrl.includes('/public/grill6/')) {
          try {
            const urlParts = oldImageUrl.split('/public/grill6/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              await supabase.storage.from('grill6').remove([filePath]);
            }
          } catch (storageError) {
            console.error("Error cleaning up old image:", storageError);
          }
        }
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert([dishData])
          .select();
        if (error) throw error;
        resultId = data[0].id;
      }

      if (hasVariants) {
        if (isEditingDish) {
          await supabase.from('menu_item_variants').delete().eq('menu_item_id', resultId);
        }

        const variantsToInsert = variants.map(v => ({
          menu_item_id: resultId,
          variant_name: v.variant_name,
          price: parseFloat(v.price)
        }));
        
        const { error: variantError } = await supabase
          .from('menu_item_variants')
          .insert(variantsToInsert);
        
        if (variantError) throw variantError;
      } else if (isEditingDish) {
        await supabase.from('menu_item_variants').delete().eq('menu_item_id', resultId);
      }

      setShowAddModal(false);
      setIsEditingDish(false);
      setEditingDishId(null);
      setNewDish({ name: '', description: '', price: '', category: 'Starters', is_veg: true, image_url: '' });
      setVariants([]);
      setHasVariants(false);
      fetchMenu();
      setToastMessage(isEditingDish ? "✅ Dish updated successfully!" : "✅ Dish added to menu!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error(err.message);
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedOutletId}/${Math.random()}.${fileExt}`;
      const filePath = `menu-items/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('grill6')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('grill6')
        .getPublicUrl(filePath);

      setNewDish({ ...newDish, image_url: publicUrl });
      alert("Image uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Error uploading image: " + err.message);
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

  const deleteDish = async (item: any) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      // Delete image from storage if it exists
      if (item.image_url && item.image_url.includes('/public/grill6/')) {
        try {
          // Extract file path from URL (e.g., menu-items/OUTLET_ID/filename.png)
          const urlParts = item.image_url.split('/public/grill6/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            const { error: storageError } = await supabase.storage
              .from('grill6')
              .remove([filePath]);
            
            if (storageError) {
              console.error("Error deleting image from storage:", storageError.message);
            }
          }
        } catch (err) {
          console.error("Storage deletion failed:", err);
        }
      }

      const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
      if (!error) {
        fetchMenu();
        setToastMessage("🗑️ Dish and image deleted successfully!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error("Deletion failed:", error.message);
        alert("Failed to delete dish: " + error.message + "\n\n(Note: You cannot delete dishes that have already been ordered by customers. Try marking it as 'Out of Stock' instead.)");
      }
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutletId || !user?.id) return;

    try {
      const couponData = {
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: parseFloat(newCoupon.discount_value),
        min_order: parseFloat(newCoupon.min_order),
        target_type: newCoupon.target_type,
        target_details: newCoupon.target_details,
        status: newCoupon.status,
        outlet_id: selectedOutletId
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
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '', min_order: '0', target_type: 'all', target_details: '', status: 'active' });
      fetchCoupons();
      setToastMessage(isEditingCoupon ? "✅ Coupon updated!" : "✅ New coupon created!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err: any) {
      console.error(err.message);
      alert(err.message);
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
    if ((activeTab === 'orders' || activeTab === 'analytics') && user?.id && selectedOutletId) {
      fetchOrders();
    }
    if (activeTab === 'menu' && user?.id && selectedOutletId) {
      fetchMenu();
    }
    if (activeTab === 'coupons' && user?.id && selectedOutletId) {
      fetchCoupons();
    }

    // 1. High-Reliability Realtime Subscription for Orders
    const ordersSubscription = supabase
      .channel('seller-realtime-v5')
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
      if ((activeTab === 'orders' || activeTab === 'analytics') && selectedOutletId) {
        fetchOrders(true); // Silent update
      }
    }, 20000);

    return () => {
      supabase.removeChannel(ordersSubscription);
      clearInterval(heartbeat);
    };
  }, [activeTab, user?.id, user?.user_metadata, selectedOutletId]);

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
            <h3>{assignedOutlets.find(o => o.id === selectedOutletId)?.name || 'Grill 6 Outlet'}</h3>
            {assignedOutlets.length > 1 && (
              <select 
                className={styles.outletSelector}
                value={selectedOutletId || ''}
                onChange={(e) => setSelectedOutletId(e.target.value)}
              >
                {assignedOutlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}
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
            Live Orders {orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length > 0 && (
              <span className={styles.badge}>{orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length}</span>
            )}
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'history' ? styles.active : ''}`} onClick={() => setActiveTab('history')}>
            Order History
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'menu' ? styles.active : ''}`} onClick={() => setActiveTab('menu')}>
            Menu Manager
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'categories' ? styles.active : ''}`} onClick={() => setActiveTab('categories')}>
            Category Manager
          </button>
          {!isVerifyingPermissions && !isCouponDisabled && (
            <button className={`${styles.navBtn} ${activeTab === 'coupons' ? styles.active : ''}`} onClick={() => setActiveTab('coupons')}>
              Coupon Manager
            </button>
          )}
          <button className={`${styles.navBtn} ${activeTab === 'analytics' ? styles.active : ''}`} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button className={`${styles.navBtn} ${activeTab === 'notifications' ? styles.active : ''}`} onClick={() => setActiveTab('notifications')}>
            Notification Pusher
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
                  {orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).map(order => (
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
                          {order.status === 'pending' ? (
                            <div className={styles.orderActionButtons}>
                              <button 
                                className={styles.acceptBtn}
                                onClick={() => handleStatusChange(order.id, 'preparing')}
                              >
                                Accept
                              </button>
                              <button 
                                className={styles.declineBtn}
                                onClick={() => handleStatusChange(order.id, 'cancelled')}
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <select 
                              className={styles.actionSelect} 
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            >
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length === 0 && !isLoadingOrders && (
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

        {activeTab === 'history' && (
          <div className="animate-fade-in">
            <h2 className={styles.pageTitle}>Order History</h2>
            
            <div style={{ marginBottom: '2rem' }}>
              <div className={styles.historyFilterWrapper}>
                <CustomSelect 
                  label="Viewing Archive"
                  options={[
                    { value: 'completed', label: 'Completed Orders' },
                    { value: 'cancelled', label: 'Cancelled Orders' }
                  ]}
                  value={historyFilter}
                  onChange={(val) => setHistoryFilter(val as any)}
                />
              </div>

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
                  <motion.tbody layout>
                    <AnimatePresence mode="popLayout">
                      {orders.filter(o => o.status === historyFilter).map(order => (
                        <motion.tr 
                          key={order.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
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
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                    {orders.filter(o => o.status === historyFilter).length === 0 && !isLoadingOrders && (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                          No {historyFilter} orders found in your archive.
                        </td>
                      </motion.tr>
                    )}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Manage Menu</h2>
              <button className={styles.primaryBtn} onClick={() => {
                setIsEditingDish(false);
                setEditingDishId(null);
                setNewDish({ name: '', description: '', price: '', category: 'Starters', is_veg: true, image_url: '' });
                setVariants([]);
                setHasVariants(false);
                setShowAddModal(true);
              }}>+ Add New Dish</button>
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
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.secondaryBtn} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openEditDishModal(item)}>Edit</button>
                            <button className={styles.dangerBtn} onClick={() => deleteDish(item)}>Delete</button>
                          </div>
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

          {activeTab === 'categories' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={styles.card}
            >
              <div className={styles.categoryManagerBody}>
                <div className={styles.categoryHeaderSection}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem' }}>📂 Category Management</h2>
                  <p style={{ color: 'var(--accent)', fontSize: '1rem' }}>
                    Create and organize your menu structure. Custom categories help customers find exactly what they want.
                  </p>
                </div>
                
                <div className={styles.addCategoryRow}>
                  <div className={styles.categoryInputWrapper}>
                    <label>{isEditingCategory ? 'Edit Category Name' : 'New Category Name'}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Burgers, Pizza, Desserts..." 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className={styles.premiumInput}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <button 
                      onClick={handleAddCategory}
                      disabled={isAddingCategory || !newCategoryName.trim()}
                      className={styles.addCategoryBtn}
                    >
                      {isAddingCategory ? '✨ Saving...' : (isEditingCategory ? '💾 Update Name' : '🚀 Create Category')}
                    </button>
                    {isEditingCategory && (
                      <button 
                        onClick={() => {
                          setIsEditingCategory(false);
                          setEditingCategoryId(null);
                          setNewCategoryName('');
                        }}
                        className={styles.secondaryBtn}
                        style={{ height: '54px', padding: '0 1.5rem' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.categoryList}>
                  <h4>
                    <span>📦</span> Active Categories 
                    <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 500, marginLeft: '0.5rem' }}>({categories.length})</span>
                  </h4>
                  
                  {isLoadingCategories ? (
                    <div className={styles.loader}></div>
                  ) : (
                    <div className={styles.categoryItemsGrid}>
                      <AnimatePresence mode="popLayout">
                        {categories.map((cat, index) => (
                          <motion.div 
                            key={cat.id} 
                            layout
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, x: -50 }}
                            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                            className={styles.categoryCard}
                          >
                            <div className={styles.categoryInfo}>
                              <div className={styles.categoryIcon}>
                                {cat.name.toLowerCase().includes('burger') ? '🍔' : 
                                 cat.name.toLowerCase().includes('drink') ? '🥤' :
                                 cat.name.toLowerCase().includes('pizza') ? '🍕' :
                                 cat.name.toLowerCase().includes('dessert') ? '🍰' : '📂'}
                              </div>
                              <span className={styles.categoryName}>{cat.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => openEditCategory(cat)}
                                className={styles.editBtn}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6 }}
                                title="Edit Category"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat.id)}
                                className={styles.deleteBtn}
                                title="Delete Category"
                              >
                                <span style={{ fontSize: '1.2rem' }}>×</span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {!isLoadingCategories && categories.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={styles.emptyCategories}
                    >
                      <div className={styles.emptyIcon}>📂</div>
                      <h3 style={{ margin: 0, fontWeight: 800 }}>No Categories Yet</h3>
                      <p style={{ color: 'var(--accent)', maxWidth: '300px', margin: 0 }}>
                        Start by creating a category above. Your menu items need a home!
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        {activeTab === 'coupons' && (
          <div className="animate-fade-in">
            <div className={styles.headerFlex}>
              <h2 className={styles.pageTitle}>Outlet Coupon Manager</h2>
              <button className={styles.primaryBtn} onClick={() => {
                setIsEditingCoupon(false);
                setEditingCouponId(null);
                setNewCoupon({
                  code: '',
                  discount_type: 'percentage',
                  discount_value: '',
                  min_order: '0',
                  target_type: 'all',
                  target_details: '',
                  status: 'active'
                });
                setShowCouponModal(true);
              }}>+ Create New Coupon</button>
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
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={styles.secondaryBtn} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => openEditCouponModal(coupon)}>Edit</button>
                            <button className={styles.dangerBtn} onClick={() => deleteCoupon(coupon.id)}>Delete</button>
                          </div>
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
                <h2>{isEditingDish ? 'Edit Dish' : 'Add New Dish'}</h2>
                <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddDish} className={styles.modalForm}>
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
                  <AnimatePresence mode="popLayout">
                    {!hasVariants && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.9, width: 0, marginRight: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={styles.formGroup}
                        style={{ overflow: 'hidden' }}
                      >
                        <label>Price (₹)</label>
                        <input 
                          type="number" 
                          required 
                          placeholder="250" 
                          className={styles.input}
                          value={newDish.price}
                          onChange={e => setNewDish({...newDish, price: e.target.value})}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{ flex: 1 }}
                  >
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
                  </motion.div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={hasVariants} 
                      onChange={(e) => setHasVariants(e.target.checked)} 
                    />
                    <span>This dish has multiple sizes/options</span>
                  </label>
                </div>

                <AnimatePresence>
                  {hasVariants && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                      className={styles.variantsBuilder}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <label style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent)' }}>OPTIONS & PRICING</label>
                        <button type="button" onClick={addVariant} className={styles.addVariantBtn}>+ Add Option</button>
                      </div>
                      {variants.map((v, idx) => (
                        <div key={idx} className={styles.variantRow}>
                          <input 
                            type="text" 
                            placeholder="Size/Option Name" 
                            className={styles.input}
                            value={v.variant_name}
                            onChange={(e) => updateVariant(idx, 'variant_name', e.target.value)}
                            required
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: '600' }}>₹</span>
                            <input 
                              type="number" 
                              placeholder="Price" 
                              className={styles.input}
                              style={{ width: '100px' }}
                              value={v.price}
                              onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                              required
                            />
                            <button type="button" onClick={() => removeVariant(idx)} className={styles.removeVariantBtn}>🗑️</button>
                          </div>
                        </div>
                      ))}
                      {variants.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--accent)', fontSize: '0.85rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-sm)' }}>
                          No options added yet. Click "+ Add Option" to start.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    {isEditingDish ? 'Update Dish' : 'Save Dish'}
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
                <h2>{isEditingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
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
                    {isEditingCoupon ? 'Update Coupon' : 'Create Coupon'}
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
