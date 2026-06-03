"use client";

import { useEffect, useState } from "react";

export function useSetlistsNavState() {
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation depuis l'URL + restauration du scroll
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("cat") || "Toutes";
    setCategoryFilter(cat);
    setIsInitialized(true);

    const savedScroll = sessionStorage.getItem("setlistsScrollPos");
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: "instant" as ScrollBehavior });
      }, 80);
    }
  }, []);

  // Sync URL + sessionStorage quand le filtre change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    if (categoryFilter !== "Toutes") params.set("cat", categoryFilter);

    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
    sessionStorage.setItem("lastListPath", newUrl);
  }, [categoryFilter, isInitialized]);

  // Sauvegarde du scroll au défilement
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("setlistsScrollPos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { categoryFilter, setCategoryFilter };
}