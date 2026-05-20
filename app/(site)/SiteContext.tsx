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
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  mrp: number;
  qty: number;
  imageUrl?: string;
  sku?: string;
  unit?: string;
};

export type Customer = {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
};

type SiteContextType = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartShopId: string | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (shopProductId: string) => void;
  updateQty: (shopProductId: string, qty: number) => void;
  clearCart: () => void;
  customer: Customer | null;
  customerToken: string | null;
  login: (token: string, customer: Customer) => void;
  logout: () => void;
};

const SiteContext = createContext<SiteContextType | null>(null);

const CART_KEY = "site_cart";
const TOKEN_KEY = "site_token";
const CUSTOMER_KEY = "site_customer";

function readLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(readLS<CartItem[]>(CART_KEY) ?? []);
    setCustomer(readLS<Customer>(CUSTOMER_KEY));
    setCustomerToken(localStorage.getItem(TOKEN_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  const cartShopId = useMemo(
    () => (cart.length > 0 ? cart[0].shopId : null),
    [cart]
  );

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      /* If cart already has items from a DIFFERENT shop, replace the cart */
      if (prev.length > 0 && prev[0].shopId !== item.shopId) {
        return [item];
      }
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
    localStorage.removeItem(CART_KEY);
  }, []);

  const login = useCallback((token: string, cust: Customer) => {
    setCustomerToken(token);
    setCustomer(cust);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(cust));
  }, []);

  const logout = useCallback(() => {
    setCustomerToken(null);
    setCustomer(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
  }, []);

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((s, c) => s + c.price * c.qty, 0),
    [cart]
  );

  return (
    <SiteContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        cartShopId,
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
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be inside SiteProvider");
  return ctx;
}
