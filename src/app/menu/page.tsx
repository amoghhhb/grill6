"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import OrderTypeModal from '@/components/OrderTypeModal/OrderTypeModal';
import styles from './page.module.css';

import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/data/menu';

const quantityVariants = {
  initial: (dir: number) => ({ y: dir > 0 ? 20 : -20, opacity: 0 }),
  animate: { y: 0, opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? -20 : 20, opacity: 0 }),
};

const AnimatedQuantity = ({ quantity }: { quantity: number }) => {
  const prevQuantityRef = React.useRef(quantity - 1);
  const direction = quantity > prevQuantityRef.current ? 1 : -1;
  
  React.useEffect(() => {
    prevQuantityRef.current = quantity;
  }, [quantity]);

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', width: '24px', height: '24px' }}>
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.span
          key={quantity}
          custom={direction}
          variants={quantityVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        >
          {quantity}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

function MenuContent() {
  const searchParams = useSearchParams();
  const searchFilter = searchParams.get('search')?.toLowerCase() || '';

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Recommended']);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState('Recommended');
  const { cart, addToCart, updateQuantity, orderType, isOutletOpen } = useCart();
  const [modalDismissed, setModalDismissed] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true);

        if (error) throw error;

        if (data) {
          const mappedItems: MenuItem[] = data.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            isVeg: item.is_veg,
            category: item.category,
            image: item.image_url,
            description: item.description
          }));
          setMenuItems(mappedItems);

          // Dynamically get categories
          const uniqueCats = Array.from(new Set(data.map(item => item.category)));
          setCategories(['Recommended', ...uniqueCats.filter(c => c !== 'Recommended')]);
        }
      } catch (err) {
        console.error("Error fetching menu:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const filteredMenu = menuItems.filter(item => {
    const matchesFilter = filter === 'all' ? true : (filter === 'veg' ? item.isVeg : !item.isVeg);
    const matchesSearch = !searchFilter || 
                         item.name.toLowerCase().includes(searchFilter) || 
                         item.category.toLowerCase().includes(searchFilter);
    const matchesCategory = activeCategory === 'Recommended' ? true : item.category === activeCategory;
    
    return matchesFilter && matchesSearch && matchesCategory;
  });

  return (
    <>
      <AnimatePresence>
        {orderType === null && !modalDismissed && (
          <OrderTypeModal onClose={() => setModalDismissed(true)} />
        )}
      </AnimatePresence>
      <div className={styles.container}>

      <div className={orderType === null && !modalDismissed ? styles.contentBlurred : styles.contentNormal}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Categories</h3>
          <nav className={styles.categoryNav}>
            {categories.map(cat => (
              <button 
                key={cat} 
                className={`${styles.categoryBtn} ${activeCategory === cat ? styles.active : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span>{cat}</span>
                {activeCategory === cat && (
                  <motion.div 
                    layoutId="activeCategoryBar" 
                    className={styles.activeBar} 
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.menuFeed}>
          <div className={styles.filterGroup}>
            <label className={`${styles.filterLabel} ${filter === 'all' ? styles.activeFilter : ''}`}>
              <input 
                type="radio" 
                name="vegFilter" 
                className={styles.hiddenRadio}
                checked={filter === 'all'} 
                onChange={() => setFilter('all')} 
              /> 
              <span>All</span>
            </label>
            <label className={`${styles.filterLabel} ${filter === 'veg' ? styles.activeFilter : ''}`}>
              <input 
                type="radio" 
                name="vegFilter" 
                className={styles.hiddenRadio}
                checked={filter === 'veg'} 
                onChange={() => setFilter('veg')} 
              /> 
              <span className={styles.vegIcon} /> 
              <span>Veg</span>
            </label>
            <label className={`${styles.filterLabel} ${filter === 'non-veg' ? styles.activeFilter : ''}`}>
              <input 
                type="radio" 
                name="vegFilter" 
                className={styles.hiddenRadio}
                checked={filter === 'non-veg'} 
                onChange={() => setFilter('non-veg')} 
              /> 
              <span className={styles.nonVegIcon} /> 
              <span>Non-Veg</span>
            </label>
          </div>

          <h2 className={styles.sectionTitle}>{activeCategory}</h2>
          <motion.div 
            key={filter + activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={styles.grid}
          >
            {isLoading ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                Loading fresh dishes for you...
              </div>
            ) : filteredMenu.length > 0 ? (
              filteredMenu.map(item => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardImageGroup}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} className={styles.cardImage} />
                    ) : (
                      <div className={styles.cardImagePlaceholder} />
                    )}
                    <div className={item.isVeg ? styles.vegBadge : styles.nonVegBadge}></div>
                  </div>
                  
                  <div className={styles.cardContent}>
                    <h3>{item.name}</h3>
                    <p className={styles.price}>₹{item.price}</p>
                    <p className={styles.description}>{item.description}</p>
                    
                    <div className={styles.cardActions} style={{ height: '54px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                      <AnimatePresence mode="wait">
                        {(() => {
                          const cartItem = cart.find(c => c.id === item.id);
                          if (cartItem) {
                            return (
                              <motion.div 
                                key="quantity"
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
                                className={`${styles.quantityControl} ${!isOutletOpen ? styles.disabledActions : ''}`}
                              >
                                <button onClick={() => updateQuantity(item.id, -1)} disabled={!isOutletOpen}>-</button>
                                <AnimatedQuantity quantity={cartItem.quantity} />
                                <button onClick={() => updateQuantity(item.id, 1)} disabled={cartItem.quantity >= 10 || !isOutletOpen}>+</button>
                              </motion.div>
                            );
                          }
                          return (
                            <motion.button 
                              key="add"
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
                              className={`${styles.addBtn} ${!isOutletOpen ? styles.disabledBtn : ''}`} 
                              onClick={() => isOutletOpen && addToCart(item)}
                              disabled={!isOutletOpen}
                            >
                              {isOutletOpen ? 'ADD' : 'CLOSED'}
                            </motion.button>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No dishes found in this category.
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
    </>
  );
}

export default function MenuPage() {
  return (
    <React.Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Loading menu...</div>}>
      <MenuContent />
    </React.Suspense>
  );
}
