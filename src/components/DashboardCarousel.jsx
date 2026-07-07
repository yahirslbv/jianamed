import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../styles/App.module.css';

const AUTOPLAY_INTERVAL_MS = 6000;

export default function DashboardCarousel({ children, label, trackClassName = '' }) {
  const trackRef = useRef(null);
  const isPausedRef = useRef(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollBack(track.scrollLeft > 8);
    setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
  }, []);

  const scrollByStep = useCallback((direction) => {
    const track = trackRef.current;
    if (!track) return;
    const firstItem = track.firstElementChild;
    const step = firstItem ? firstItem.getBoundingClientRect().width + 12 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(track);
    return () => observer.disconnect();
  }, [children, updateScrollState]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => {
      const track = trackRef.current;
      if (isPausedRef.current || !track || track.scrollWidth <= track.clientWidth) return;
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 8) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByStep(1);
      }
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scrollByStep]);

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carrusel"
      aria-label={label}
      onMouseEnter={() => { isPausedRef.current = true; }}
      onMouseLeave={() => { isPausedRef.current = false; }}
      onFocusCapture={() => { isPausedRef.current = true; }}
      onBlurCapture={() => { isPausedRef.current = false; }}
      onTouchStart={() => { isPausedRef.current = true; }}
    >
      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`}
        type="button"
        aria-label="Anterior"
        disabled={!canScrollBack}
        onClick={() => scrollByStep(-1)}
      >
        ‹
      </button>
      <div
        className={[styles.carouselTrack, trackClassName].filter(Boolean).join(' ')}
        ref={trackRef}
        onScroll={updateScrollState}
      >
        {children}
      </div>
      <button
        className={`${styles.carouselArrow} ${styles.carouselArrowNext}`}
        type="button"
        aria-label="Siguiente"
        disabled={!canScrollForward}
        onClick={() => scrollByStep(1)}
      >
        ›
      </button>
    </div>
  );
}
