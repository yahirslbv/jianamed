import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'tic-toc-pharma-cart';

function normalizeQuantity(quantity) {
  const parsedQuantity = Number.parseInt(quantity, 10);
  return Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const storedCart = localStorage.getItem(CART_KEY);
      return storedCart ? JSON.parse(storedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addToCart: (product, quantity = 1) => {
        const safeQuantity = normalizeQuantity(quantity);

        setItems((currentItems) => {
          const existingItem = currentItems.find((item) => item.product.id === product.id);

          if (existingItem) {
            return currentItems.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + safeQuantity }
                : item,
            );
          }

          return [...currentItems, { product, quantity: safeQuantity }];
        });
      },
      removeFromCart: (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.product.id !== productId));
      },
      updateQuantity: (productId, quantity) => {
        const safeQuantity = normalizeQuantity(quantity);
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.product.id === productId ? { ...item, quantity: safeQuantity } : item,
          ),
        );
      },
      clearCart: () => setItems([]),
      getCartTotal: () =>
        items.reduce((total, item) => total + (item.product.price || 0) * item.quantity, 0),
      getCartItemCount: () => items.reduce((total, item) => total + item.quantity, 0),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }

  return context;
}
