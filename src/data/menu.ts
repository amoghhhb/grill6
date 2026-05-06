export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  category: string;
  image?: string;
  description?: string;
}

export const MOCK_CATEGORIES = ['Recommended', 'Starters', 'Main Course', 'Breads', 'Desserts'];

export const MOCK_MENU: MenuItem[] = [
  { id: '1', name: 'Paneer Tikka', price: 250, isVeg: true, category: 'Starters', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80', description: 'Cottage cheese marinated in spices and grilled in a tandoor.' },
  { id: '2', name: 'Chicken Tikka', price: 300, isVeg: false, category: 'Starters', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80', description: 'Boneless chicken marinated in spices and grilled.' },
  { id: '3', name: 'Butter Chicken', price: 400, isVeg: false, category: 'Main Course', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80', description: 'Chicken simmered in a rich tomato and butter gravy.' },
  { id: '4', name: 'Dal Makhani', price: 220, isVeg: true, category: 'Main Course', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80', description: 'Black lentils slow-cooked overnight with cream and butter.' },
  { id: '5', name: 'Paneer Peri Peri Momos', price: 180, isVeg: true, category: 'Starters', description: 'Spicy peri peri infused momos.' },
  { id: '6', name: 'Classic Fries', price: 120, isVeg: true, category: 'Starters', description: 'Crispy golden fries.' },
  { id: '7', name: 'Grill 6 Special Burger', price: 250, isVeg: false, category: 'Main Course', description: 'Signature juicy burger.' },
  { id: '8', name: 'Virgin Mojito', price: 150, isVeg: true, category: 'Desserts', description: 'Refreshing mint and lime drink.' },
  { id: '9', name: 'Chicken Shawarma Roll', price: 180, isVeg: false, category: 'Main Course', description: 'Authentic lebanese chicken shawarma.' }
];
