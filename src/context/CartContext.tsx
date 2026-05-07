"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Define the Menu Item structure based on what's in menu/page.tsx
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  category: string;
  image?: string;
  description?: string;
  outlet_id?: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_radius: number;
  is_open: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  variant_id?: string;
  variant_name?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, variant?: { id: string, name: string, price: number }) => void;
  removeFromCart: (itemId: string, variantId?: string) => void;
  updateQuantity: (itemId: string, delta: number, variantId?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  orderType: 'takeaway' | 'dine-in' | null;
  setOrderType: (type: 'takeaway' | 'dine-in' | null) => void;
  userLocation: { lat: number, lng: number } | null;
  setUserLocation: (loc: { lat: number, lng: number } | null) => void;
  distance: number | null;
  setDistance: (dist: number | null) => void;
  userAddress: string | null;
  setUserAddress: (addr: string | null) => void;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  login: () => void; // Legacy simulation, will be replaced by actual auth flow
  user: any;
  userRole: 'user' | 'seller' | 'admin' | null;
  isBanned: boolean;
  isAuthLoading: boolean;
  showLogoutMessage: boolean;
  setShowLogoutMessage: (show: boolean) => void;
  isOutletOpen: boolean;
  isMaintenanceMode: boolean;
  isMfaVerified: boolean;
  setIsMfaVerified: (val: boolean) => void;
  mfaPolicy: { is_active: boolean };
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (outlet: Outlet | null) => void;
  isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'takeaway' | 'dine-in' | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'user' | 'seller' | 'admin' | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);
  const [isOutletOpen, setIsOutletOpen] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [mfaPolicy, setMfaPolicy] = useState({ is_active: false });
  const [isMfaVerified, setIsMfaVerified] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  const fetchGlobalSettings = async () => {
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
      console.error("Error fetching global settings:", err);
    }
  };

  const fetchOutletStatus = async () => {
    try {
      if (selectedOutlet) {
        // Fetch specific outlet status
        const { data } = await supabase
          .from('outlets')
          .select('is_open')
          .eq('id', selectedOutlet.id)
          .maybeSingle();
        
        if (data) {
          setIsOutletOpen(data.is_open);
          // Sync selectedOutlet object too if status changed
          if (data.is_open !== selectedOutlet.is_open) {
            setSelectedOutlet({ ...selectedOutlet, is_open: data.is_open });
          }
        }
      } else {
        // Fallback to global setting if no outlet selected
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'outlet_status')
          .maybeSingle();
        
        if (data?.value) {
          setIsOutletOpen(data.value.is_open);
        } else {
          setIsOutletOpen(true);
        }
      }
    } catch (err) {
      console.error("Error fetching outlet status:", err);
    }
  };

  useEffect(() => {
    fetchOutletStatus();
    fetchGlobalSettings();
    console.log("🏪 [System] Status Monitor & Heartbeat Active");
    
    // Subscribe to Status and Settings
    const channel = supabase
      .channel('system-wide-sync')
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', table: 'profiles' },
        (payload: any) => {
          // No longer purely profile based, but keeping for legacy sync
          fetchOutletStatus();
        }
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', table: 'outlets', filter: selectedOutlet ? `id=eq.${selectedOutlet.id}` : undefined },
        (payload: any) => {
          console.log("🏪 [System] Outlet Sync:", payload.new.is_open);
          setIsOutletOpen(payload.new.is_open);
          if (selectedOutlet) {
            setSelectedOutlet({ ...selectedOutlet, is_open: payload.new.is_open });
          }
        }
      )
      .on(
        'postgres_changes' as any,
        { event: '*', table: 'settings' },
        (payload: any) => {
          console.log("🛠️ [System] Settings Sync:", payload);
          fetchGlobalSettings();
        }
      )
      .subscribe();

    // 2. Failsafe "Heartbeat" Sync (Every 10 seconds)
    const heartbeat = setInterval(() => {
      fetchOutletStatus();
      fetchGlobalSettings();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeat);
    };
  }, [selectedOutlet]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_banned')
        .eq('id', userId)
        .single();
      
      if (error) {
        // If is_banned column is missing, fallback to just role
        const { data: retryData } = await supabase.from('profiles').select('role').eq('id', userId).single();
        if (retryData) setUserRole(retryData.role as any);
        return;
      }

      if (data) {
        setUserRole(data.role as any);
        setIsBanned(!!data.is_banned);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    // Initial Session Check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // If we get a "Refresh Token Not Found" error, we need to sign out completely
          if (error.message.includes('Refresh Token Not Found')) {
            console.warn("[Auth] Session expired or invalid. Clearing state...");
            await supabase.auth.signOut();
            setIsLoggedIn(false);
            setUser(null);
            setUserRole(null);
          }
        }
        
        setIsLoggedIn(!!session);
        setUser(session?.user || null);
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.error("Initial session check failed:", err);
        setIsAuthLoading(false);
      }
    };

    initSession();
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth Event]: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setIsLoggedIn(!!session);
        setUser(session?.user || null);
        if (session?.user) {
          fetchUserRole(session.user.id);
        }
      } else if (event === 'SIGNED_OUT' || (event as any) === 'USER_DELETED') {
        setIsLoggedIn(false);
        setUser(null);
        setUserRole(null);
        setIsBanned(false);
        setIsAuthLoading(false);
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });
 
    return () => subscription.unsubscribe();
  }, []);

  // Realtime Subscription for the current user's profile (to catch bans instantly)
  useEffect(() => {
    if (!user?.id) return;

    const profileSubscription = supabase
      .channel(`profile-${user.id}`)
      .on('postgres_changes' as any, 
        { event: 'UPDATE', table: 'profiles', filter: `id=eq.${user.id}` }, 
        (payload: any) => {
          console.log("[Auth] Profile Change Detected:", payload.new);
          if (payload.new.is_banned !== undefined) {
            setIsBanned(!!payload.new.is_banned);
          }
          if (payload.new.role) {
            setUserRole(payload.new.role);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('grill6_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from local storage");
      }
    }
    
    const savedAddress = localStorage.getItem('user_location');
    if (savedAddress) {
      setUserAddress(savedAddress);
    }

    const savedOutlet = localStorage.getItem('selected_outlet');
    if (savedOutlet) {
      try {
        setSelectedOutlet(JSON.parse(savedOutlet));
      } catch (e) {
        console.error("Failed to parse outlet from local storage");
      }
    }

    const savedOrderType = localStorage.getItem('order_type');
    if (savedOrderType) {
      setOrderType(savedOrderType as any);
    }

    const savedDist = localStorage.getItem('user_distance');
    if (savedDist) {
      setDistance(parseFloat(savedDist));
    }

    const savedLoc = localStorage.getItem('user_lat_lng');
    if (savedLoc) {
      try {
        setUserLocation(JSON.parse(savedLoc));
      } catch (e) {}
    }
    
    setIsHydrated(true);
  }, []);

  // Save outlet to localStorage
  useEffect(() => {
    if (selectedOutlet) {
      localStorage.setItem('selected_outlet', JSON.stringify(selectedOutlet));
    } else {
      localStorage.removeItem('selected_outlet');
    }
  }, [selectedOutlet]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('grill6_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (orderType) localStorage.setItem('order_type', orderType);
    else localStorage.removeItem('order_type');
  }, [orderType]);

  useEffect(() => {
    if (distance) localStorage.setItem('user_distance', distance.toString());
    else localStorage.removeItem('user_distance');
  }, [distance]);

  useEffect(() => {
    if (userLocation) localStorage.setItem('user_lat_lng', JSON.stringify(userLocation));
    else localStorage.removeItem('user_lat_lng');
  }, [userLocation]);

  const addToCart = (item: MenuItem, variant?: { id: string, name: string, price: number }) => {
    setCart((prev) => {
      const vId = variant?.id;
      const existing = prev.find((cartItem) => cartItem.id === item.id && cartItem.variant_id === vId);
      
      if (existing) {
        if (existing.quantity >= 10) return prev;
        return prev.map((cartItem) =>
          (cartItem.id === item.id && cartItem.variant_id === vId)
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      
      const price = variant ? variant.price : item.price;
      return [...prev, { 
        ...item, 
        price, 
        variant_id: vId, 
        variant_name: variant?.name, 
        quantity: 1 
      }];
    });
  };

  const removeFromCart = (itemId: string, variantId?: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === itemId && item.variant_id === variantId)));
  };

  const updateQuantity = (itemId: string, delta: number, variantId?: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId && item.variant_id === variantId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return { ...item, quantity: 0 };
          if (newQuantity > 10) return item;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        orderType,
        setOrderType,
        userLocation,
        setUserLocation,
        distance,
        setDistance,
        userAddress,
        setUserAddress: (addr) => {
          setUserAddress(addr);
          if (addr) localStorage.setItem('user_location', addr);
        },
        isLoggedIn,
        user,
        userRole,
        isBanned,
        isAuthLoading,
        showLogoutMessage,
        setShowLogoutMessage,
        isOutletOpen,
        isMaintenanceMode,
        isMfaVerified,
        setIsMfaVerified,
        mfaPolicy,
        selectedOutlet,
        setSelectedOutlet,
        isHydrated,
        logout: async () => {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setUser(null);
          setUserRole(null);
          setIsBanned(false);
          localStorage.removeItem('user_location');
          localStorage.removeItem('order_type');
          localStorage.removeItem('selected_outlet');
          localStorage.removeItem('user_distance');
          localStorage.removeItem('user_lat_lng');
          setShowLogoutMessage(true);
          setOrderType(null);
          setSelectedOutlet(null);
          router.push('/');
        },
        login: () => setIsLoggedIn(true),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
