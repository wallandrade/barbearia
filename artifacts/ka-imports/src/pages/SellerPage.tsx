/**
 * SellerPage — catches /:seller routes (e.g. /beatriz, /kaique).
 *
 * 1. Saves seller code SYNCHRONOUSLY during render (before Home/children mount)
 *    so all child components immediately see the correct seller context.
 *
 * 2. Fetches the seller's WhatsApp from the API asynchronously and stores it
 *    in sessionStorage. By the time any WhatsApp button is clicked (seconds
 *    after load), the correct number is already available.
 */
import { useRef, useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import Home from "@/pages/Home";
import { fetchAndCacheSellerWhatsApp, setSellerContext } from "@/lib/utils";

export default function SellerPage() {
  const [, params] = useRoute("/:seller");
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  const seller = params?.seller?.toLowerCase() ?? "";

  // --- Synchronous seller save (runs during render, before children mount) ---
  const lastSavedRef = useRef<string | null>(null);
  if (seller && lastSavedRef.current !== seller) {
    lastSavedRef.current = seller;
    setSellerContext(seller);
  }

  // --- Async WhatsApp pre-load (runs once on mount or when seller changes) ---
  useEffect(() => {
    if (seller) fetchAndCacheSellerWhatsApp(seller);
  }, [seller]);

  // --- Handle ?product= deep-link — navigate to product detail page ---
  useEffect(() => {
    if (!seller) return;
    const sp = new URLSearchParams(searchString);
    const productId = sp.get("product");
    if (productId) {
      setLocation(`/${seller}/produto/${productId}`);
    }
  }, [seller, searchString, setLocation]);

  // Render the full store in-place — URL stays as /{seller}
  return <Home />;
}
