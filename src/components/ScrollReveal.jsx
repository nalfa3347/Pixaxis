'use client';

import { useEffect } from 'react';

/**
 * ScrollReveal — Déclencheur haute performance d'animations au défilement.
 * Utilise l'IntersectionObserver natif (0 dépendance, 0 CPU après animation)
 * pour révéler les sections et grilles avec un effet de cascade luxueux et sobre.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respecter le réglage d'accessibilité utilisateur (réduction des animations)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const sections = document.querySelectorAll(
      '.landing-section, .landing-callout'
    );

    if (!sections.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -60px 0px', // Se déclenche légèrement avant l'entrée complète
      threshold: 0.12,
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // Arrêter d'observer après la révélation pour libérer les ressources navigateur
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    sections.forEach((section) => {
      // Vérifier si la section est déjà dans le viewport au chargement initial
      const rect = section.getBoundingClientRect();
      const isAlreadyInViewport = rect.top < window.innerHeight && rect.bottom > 0;

      if (isAlreadyInViewport) {
        section.classList.add('is-revealed');
      } else {
        section.classList.add('reveal-init');
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
