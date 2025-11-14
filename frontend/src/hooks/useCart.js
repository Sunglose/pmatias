import { useMemo, useState, useEffect } from "react";

export function useCart(role, userId) {
  const cartKey = useMemo(() => `agendar_cart:${role}:${userId}`, [role, userId]);
  const draftKey = useMemo(() => `agendar_draft:${role}:${userId}`, [role, userId]);
  
  const [cart, setCart] = useState(() => {
    try {
      const cartData = JSON.parse(localStorage.getItem(cartKey));
      if (cartData && Array.isArray(cartData)) return cartData;
      const draft = JSON.parse(localStorage.getItem(draftKey));
      if (draft?.items) return draft.items;
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
    localStorage.setItem(draftKey, JSON.stringify({ items: cart }));
  }, [cart, cartKey, draftKey]);

  return [cart, setCart];
}