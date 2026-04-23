// Performance optimization utilities

// Image optimization
export const optimizeImage = (src: string, width?: number, height?: number) => {
  if (!src) return src;
  
  // If it's already an optimized URL, return as is
  if (src.includes('?')) return src;
  
  // Add optimization parameters (for Next.js Image optimization)
  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', '80'); // Quality
  params.set('auto', 'format');
  
  return `${src}?${params.toString()}`;
};

// Debounce utility for search inputs and other frequent events
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll events and other frequent events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Lazy loading for components
export const lazyLoad = (callback: () => Promise<any>, fallback?: React.ComponentType) => {
  // This would be used with React.lazy for code splitting
  return callback();
};

// Cache utility for API responses
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new SimpleCache();

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  if (typeof window !== 'undefined' && window.performance) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

// Optimized fetch with caching
export const optimizedFetch = async (url: string, options?: RequestInit) => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Try to get from cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If not in cache, fetch and cache
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Cache successful responses
    if (response.ok) {
      apiCache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      ...options
    });
  }
  return null;
};

// Request animation frame for smooth animations
export const raf = (callback: FrameRequestCallback) => {
  if (typeof window !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return null;
};

// Cancel animation frame
export const caf = (id: number | null) => {
  if (typeof window !== 'undefined' && id) {
    cancelAnimationFrame(id);
  }
};

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  }
};

// Web Vitals monitoring
export const reportWebVitals = (metric: any) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Also log to console for development
  console.log(`[Web Vital] ${metric.name}: ${metric.value}`);
};

// Memory usage monitoring
export const checkMemoryUsage = () => {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576),
      total: Math.round(memory.totalJSHeapSize / 1048576),
      limit: Math.round(memory.jsHeapSizeLimit / 1048576)
    };
  }
  return null;
};
