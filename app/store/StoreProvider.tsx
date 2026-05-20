"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  shopProductId: string;
  productId: string;
  name: string;
  price: number;
  mrp: number;
  qty: number;
  imageUrl?: string;
  sku?: string;
  unit?: string;
};

export type StoredCustomer = {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
};

type StoreContextType = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (shopProductId: string) => void;
  updateQty: (shopProductId: string, qty: number) => void;
  clearCart: () => void;
  customer: StoredCustomer | null;
  customerToken: string | null;
  login: (token: string, customer: StoredCustomer) => void;
  logout: () => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

const CART_KEY = "store_cart";
const TOKEN_KEY = "store_token";
const CUSTOMER_KEY = "store_customer";

function readLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLS(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function removeLS(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<StoredCustomer | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(readLS<CartItem[]>(CART_KEY) ?? []);
    setCustomer(readLS<StoredCustomer>(CUSTOMER_KEY));
    setCustomerToken(
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeLS(CART_KEY, cart);
  }, [cart, ready]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.shopProductId === item.shopProductId);
      if (existing) {
        return prev.map((c) =>
          c.shopProductId === item.shopProductId
            ? { ...c, qty: c.qty + item.qty }
            : c
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((shopProductId: string) => {
    setCart((prev) => prev.filter((c) => c.shopProductId !== shopProductId));
  }, []);

  const updateQty = useCallback((shopProductId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.shopProductId !== shopProductId));
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.shopProductId === shopProductId ? { ...c, qty } : c
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    removeLS(CART_KEY);
  }, []);

  const login = useCallback((token: string, cust: StoredCustomer) => {
    setCustomerToken(token);
    setCustomer(cust);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      writeLS(CUSTOMER_KEY, cust);
    }
  }, []);

  const logout = useCallback(() => {
    setCustomerToken(null);
    setCustomer(null);
    removeLS(TOKEN_KEY);
    removeLS(CUSTOMER_KEY);
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((s, c) => s + c.qty, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.qty, 0),
    [cart]
  );

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        customer,
        customerToken,
        login,
        logout,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
