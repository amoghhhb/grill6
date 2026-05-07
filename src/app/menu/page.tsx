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
  const { cart, addToCart, updateQuantity, orderType, isOutletOpen, selectedOutlet, isHydrated, setOrderType, clearCart } = useCart();
  const [modalDismissed, setModalDismissed] = useState(false);
  const [variantModalItem, setVariantModalItem] = useState<MenuItem | null>(null);

  const handleAddItem = (item: MenuItem) => {
    if (item.variants && item.variants.length > 0) {
      setVariantModalItem(item);
    } else {
      addToCart(item);
    }
  };

  const handleChangeOutlet = () => {
    if (cart.length > 0) {
      if (confirm("Changing your outlet will clear your current cart. Continue?")) {
        clearCart();
        setOrderType(null);
        setModalDismissed(false);
      }
    } else {
      setOrderType(null);
      setModalDismissed(false);
    }
  };

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('menu_items')
          .select('*, menu_item_variants(*)')
          .eq('is_available', true);
        
        if (selectedOutlet) {
          query = query.eq('outlet_id', selectedOutlet.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const mappedItems: MenuItem[] = data.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            isVeg: item.is_veg,
            category: item.category,
            image: item.image_url,
            description: item.description,
            variants: item.menu_item_variants?.map((v: any) => ({
              id: v.id,
              variant_name: v.variant_name,
              price: v.price
            }))
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
  }, [selectedOutlet]);

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
        {isHydrated && orderType === null && !modalDismissed && (
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
          {selectedOutlet && (
            <div className={styles.outletBar}>
              <div className={styles.outletBarInfo}>
                <span className={styles.outletBarLabel}>Ordering from:</span>
                <span className={styles.outletBarName}>{selectedOutlet.name}</span>
                <span className={styles.outletBarType}>• {orderType === 'takeaway' ? 'Takeaway' : 'Dine-in'}</span>
              </div>
              <button className={styles.changeOutletBtn} onClick={handleChangeOutlet}>
                Change
              </button>
            </div>
          )}

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
                      <p className={styles.price}>
                        {item.variants && item.variants.length > 0 
                          ? `From ₹${Math.min(...item.variants.map(v => v.price))}`
                          : `₹${item.price}`
                        }
                      </p>
                    <p className={styles.description}>{item.description}</p>
                    
                    <div className={styles.cardActions} style={{ height: '54px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                      <AnimatePresence mode="wait">
                        {(() => {
                          const cartItems = cart.filter(c => c.id === item.id);
                          const totalQuantity = cartItems.reduce((acc, c) => acc + c.quantity, 0);
                          const hasVariants = item.variants && item.variants.length > 0;

                          if (totalQuantity > 0 && !hasVariants) {
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
                                <AnimatedQuantity quantity={totalQuantity} />
                                <button onClick={() => updateQuantity(item.id, 1)} disabled={totalQuantity >= 10 || !isOutletOpen}>+</button>
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
                              onClick={() => isOutletOpen && handleAddItem(item)}
                              disabled={!isOutletOpen}
                            >
                              {isOutletOpen ? (totalQuantity > 0 ? `ADD +${totalQuantity}` : 'ADD') : 'CLOSED'}
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
      <AnimatePresence>
        {variantModalItem && (
          <div className={styles.modalOverlay} onClick={() => setVariantModalItem(null)}>
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className={styles.variantModal}
              onClick={e => e.stopPropagation()}
            >
              <div className={styles.variantHeader}>
                <div>
                  <h3>Select Options</h3>
                  <p>{variantModalItem.name}</p>
                </div>
                <button className={styles.closeBtn} onClick={() => setVariantModalItem(null)}>✕</button>
              </div>
              
              <div className={styles.variantList}>
                {variantModalItem.variants?.map(v => {
                  const cartItem = cart.find(c => c.id === variantModalItem.id && c.variant_id === v.id);
                  return (
                    <div key={v.id} className={styles.variantItem}>
                      <div className={styles.variantInfo}>
                        <span className={styles.variantName}>{v.variant_name}</span>
                        <span className={styles.variantPrice}>₹{v.price}</span>
                      </div>
                      
                      {cartItem ? (
                        <div className={styles.variantQuantity}>
                          <button onClick={() => updateQuantity(variantModalItem.id, -1, v.id)}>-</button>
                          <span>{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(variantModalItem.id, 1, v.id)} disabled={cartItem.quantity >= 10}>+</button>
                        </div>
                      ) : (
                        <button 
                          className={styles.variantAddBtn}
                          onClick={() => addToCart(variantModalItem, { id: v.id, name: v.variant_name, price: v.price })}
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
