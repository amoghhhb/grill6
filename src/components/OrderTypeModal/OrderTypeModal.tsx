"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import dynamic from 'next/dynamic';
import styles from './OrderTypeModal.module.css';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

// Dynamic import for Leaflet map to disable SSR
const LocationMap = dynamic(() => import('./LocationMap'), { ssr: false, loading: () => <p style={{textAlign:'center', padding:'2rem'}}>Loading map...</p> });

const STORE_LOCATION = { lat: 19.007799701306315, lng: 73.1133276380079 }; // Grill 6 Store Location

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface OrderTypeModalProps {
  onClose: () => void;
}

export default function OrderTypeModal({ onClose }: OrderTypeModalProps) {
  const { setOrderType, setUserLocation, setDistance, setUserAddress, selectedOutlet, setSelectedOutlet } = useCart();
  
  const [outlets, setOutlets] = useState<any[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const [step, setStep] = useState<'outlet' | 'type'>('outlet');
  
  const [localOrderType, setLocalOrderType] = useState<'takeaway' | 'dine-in' | null>(null);
  const [localUserLoc, setLocalUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [localDist, setLocalDist] = useState<number | null>(null);
  
  const [locationError, setLocationError] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    setMounted(true);
    fetchOutlets();
    return () => setMounted(false);
  }, []);

  const fetchOutlets = async () => {
    setIsLoadingOutlets(true);
    try {
      const { data, error } = await supabase.from('outlets').select('*').eq('is_open', true);
      if (!error && data) {
        setOutlets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOutlets(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(`.${styles.searchContainer}`)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ Ola Maps API key is missing in this environment! Suggestions will not work.');
      return;
    }
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
    setSearchQuery(value);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim().length > 3) {
      typingTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 500); // 500ms debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    const displayName = suggestion.description;
    setSearchQuery(displayName);
    setShowSuggestions(false);
    
    let lat, lng;
    if (suggestion.geometry && suggestion.geometry.location) {
      lat = suggestion.geometry.location.lat;
      lng = suggestion.geometry.location.lng;
    } else {
      const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
      try {
        const response = await fetch(`https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(displayName)}&api_key=${apiKey}`);
        const data = await response.json();
        if (data && data.geocodingResults && data.geocodingResults.length > 0) {
          lat = data.geocodingResults[0].geometry.location.lat;
          lng = data.geocodingResults[0].geometry.location.lng;
        }
      } catch (e) {
        console.error('Error geocoding selected place', e);
      }
    }

    if (lat && lng && selectedOutlet) {
      setLocalUserLoc({ lat, lng });
      setAddress(displayName);

      const dist = calculateDistance(selectedOutlet.latitude, selectedOutlet.longitude, lat, lng);
      setLocalDist(dist);
      if (dist > (selectedOutlet.delivery_radius || 5)) {
        setLocationError(`Your location is outside our ${selectedOutlet.delivery_radius || 5}km radius for this outlet.`);
      } else {
        setLocationError('');
      }
    } else {
      setLocationError('Could not determine exact location coordinates.');
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
    setIsSearching(true);
    setLocationError('');
    try {
      const response = await fetch(`https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`);
      const data = await response.json();
      if (data && data.geocodingResults && data.geocodingResults.length > 0) {
        const result = data.geocodingResults[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const displayName = result.formatted_address || searchQuery;
        
        setLocalUserLoc({ lat, lng });
        setAddress(displayName);

        if (selectedOutlet) {
          const dist = calculateDistance(selectedOutlet.latitude, selectedOutlet.longitude, lat, lng);
          setLocalDist(dist);
          if (dist > (selectedOutlet.delivery_radius || 5)) {
            setLocationError(`Your location is outside our ${selectedOutlet.delivery_radius || 5}km radius for this outlet.`);
          } else {
            setLocationError('');
          }
        }
      } else {
        setLocationError('Address not found. Please try another search or use current location.');
      }
    } catch (err) {
      setLocationError('Error searching for location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocalUserLoc({ lat, lng });
          
          // Reverse geocode to show actual address in the input box
          reverseGeocode(lat, lng);

          if (selectedOutlet) {
            const dist = calculateDistance(selectedOutlet.latitude, selectedOutlet.longitude, lat, lng);
            setLocalDist(dist);
            if (dist > (selectedOutlet.delivery_radius || 5)) {
              setLocationError(`Your location is outside our ${selectedOutlet.delivery_radius || 5}km radius for this outlet.`);
            } else {
              setLocationError('');
            }
          }
        },
        () => {
          setLocationError('Unable to retrieve your location. Please check browser permissions.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const response = await fetch(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${apiKey}`);
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        const displayName = data.results[0].formatted_address;
        setAddress(displayName);
        setSearchQuery(displayName);
      } else {
        setAddress('Unknown Location');
        setSearchQuery('Unknown Location');
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setLocalUserLoc({ lat, lng });
    if (selectedOutlet) {
      const dist = calculateDistance(selectedOutlet.latitude, selectedOutlet.longitude, lat, lng);
      setLocalDist(dist);
      if (dist > (selectedOutlet.delivery_radius || 5)) {
        setLocationError(`Your location is outside our ${selectedOutlet.delivery_radius || 5}km radius for this outlet.`);
      } else {
        setLocationError('');
      }
    }
    reverseGeocode(lat, lng);
  };

  const handleConfirm = () => {
    if (localOrderType === 'dine-in') {
      setOrderType('dine-in');
      onClose();
    } else if (localOrderType === 'takeaway' && localDist !== null && localDist <= 5) {
      setOrderType('takeaway');
      setUserLocation(localUserLoc);
      setDistance(localDist);
      setUserAddress(address); // Sync string globally
      onClose();
    }
  };

  const isTakeawayInvalid = !!(localOrderType === 'takeaway' && (localDist === null || (selectedOutlet && localDist > (selectedOutlet.delivery_radius || 5))));

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
        className={styles.modal}
        style={{ position: 'relative' }}
      >
        <button onClick={onClose} className={styles.closeModalBtn} aria-label="Close">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h2 className={styles.title}>{step === 'outlet' ? 'Which Grill 6 are you ordering from?' : 'How would you like your order?'}</h2>
        
        {step === 'outlet' && (
          <div className={styles.outletSelectionList}>
            {isLoadingOutlets ? (
              <p>Finding active outlets...</p>
            ) : outlets.map(outlet => (
              <motion.div
                key={outlet.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${styles.outletCard} ${selectedOutlet?.id === outlet.id ? styles.activeCard : ''}`}
                onClick={() => {
                  setSelectedOutlet(outlet);
                  setStep('type');
                }}
              >
                <div className={styles.outletInfo}>
                  <h4>{outlet.name}</h4>
                  <p>{outlet.address}</p>
                </div>
                <div className={styles.selectArrow}>→</div>
              </motion.div>
            ))}
            {!isLoadingOutlets && outlets.length === 0 && (
              <p className={styles.errorText}>No open outlets found nearby. Please try again later.</p>
            )}
          </div>
        )}

        {step === 'type' && (
          <div className={styles.animatedToggleGroup}>
            <button className={styles.backBtn} onClick={() => setStep('outlet')}>← Change Outlet</button>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`${styles.animatedCard} ${localOrderType === 'takeaway' ? styles.activeCard : ''}`}
              onClick={() => setLocalOrderType('takeaway')}
              layout
            >
              <div className={styles.gifWrapper}>
                <img 
                  src="/gifs/takeaway.gif" 
                  alt="Takeaway" 
                  className={styles.animatedGif}
                />
              </div>
              <h4>Takeaway</h4>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`${styles.animatedCard} ${localOrderType === 'dine-in' ? styles.activeCard : ''}`}
              onClick={() => setLocalOrderType('dine-in')}
              layout
            >
              <div className={styles.gifWrapper}>
                <img 
                  src="/gifs/dinein.gif" 
                  alt="Dine-In" 
                  className={styles.animatedGif}
                />
              </div>
              <h4>Dine-In</h4>
            </motion.div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {localOrderType === 'takeaway' && (
            <motion.div
              key="location-selector"
              initial={{ opacity: 0, height: 0, scale: 0.8, y: -20 }}
              animate={{ opacity: 1, height: 'auto', scale: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
              style={{ overflow: 'visible' }}
            >
              <div className={styles.locationContainer}>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search for your address..."
                    className={styles.locationInput}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  />
                  <button onClick={searchLocation} disabled={isSearching} className={styles.searchBtn}>
                    {isSearching ? '...' : 'Search'}
                  </button>

                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.ul 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={styles.suggestionsList}
                      >
                        {suggestions.map((s, idx) => (
                          <li key={idx} onClick={() => selectSuggestion(s)}>
                            {s.description}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {address && (
                  <div className={styles.selectedAddress}>
                    <strong>Selected:</strong> {address}
                  </div>
                )}

                <div className={styles.divider}><span>OR</span></div>

                <button onClick={getCurrentLocation} className={styles.currentLocationBtn}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Use Current Location
                </button>
                
                {/* Leaflet Interactive Map */}
                <LocationMap userLoc={localUserLoc} onLocationSelect={handleMapLocationSelect} />
                
                {localDist !== null && (
                  <p className={styles.distanceText}>Distance: {localDist.toFixed(2)} km</p>
                )}
                {locationError && (
                  <p className={styles.errorText}>{locationError}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={styles.actionButtons}>
          <button 
            onClick={handleConfirm} 
            className={styles.confirmBtn}
            disabled={localOrderType === null || isTakeawayInvalid}
          >
            Confirm to Proceed
          </button>
          
          <button onClick={onClose} className={styles.skipBtn}>
            Skip for now
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
