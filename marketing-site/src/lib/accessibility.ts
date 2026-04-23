// Accessibility utilities for world-class standards

// ARIA labels generator
export const generateAriaLabel = (action: string, object: string) => {
  return `${action} ${object}`;
};

// Focus management
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }
  };
  
  element.addEventListener('keydown', handleKeyDown);
  
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

// Skip to main content link
export const createSkipLink = () => {
  if (typeof document !== 'undefined') {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
};

// Announce to screen readers
export const announceToScreenReader = (message: string) => {
  if (typeof document !== 'undefined') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
};

// Color contrast checker
export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(val => {
      const valNum = parseInt(val);
      return valNum / 255;
    });
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// Check if color contrast meets WCAG AA standards
export const meetsWCAGAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 4.5;
};

// Check if color contrast meets WCAG AAA standards
export const meetsWCAGAAA = (color1: string, color2: string): boolean => {
  return getContrastRatio(color1, color2) >= 7;
};

// Keyboard navigation enhancement
export const enhanceKeyboardNavigation = () => {
  if (typeof document !== 'undefined') {
    // Add focus indicators
    const style = document.createElement('style');
    style.textContent = `
      *:focus {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
      }
      
      button:focus,
      input:focus,
      select:focus,
      textarea:focus,
      a:focus {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
      }
      
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
      
      .focus:not-sr-only {
        position: static !important;
        width: auto !important;
        height: auto !important;
        padding: inherit !important;
        margin: inherit !important;
        overflow: visible !important;
        clip: auto !important;
        white-space: normal !important;
      }
    `;
    document.head.appendChild(style);
    
    // Add keyboard navigation hints
    document.addEventListener('keydown', (e) => {
      // Alt + S for search
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Alt + N for navigation
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        const nav = document.querySelector('nav') as HTMLElement;
        if (nav) {
          nav.focus();
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
          (modal as HTMLElement).style.display = 'none';
        });
      }
    });
  }
};

// Responsive font size adjustment
export const adjustFontSize = () => {
  if (typeof window !== 'undefined') {
    const baseSize = 16;
    const viewportWidth = window.innerWidth;
    let scaleFactor = 1;
    
    if (viewportWidth < 640) {
      scaleFactor = 0.875; // 14px
    } else if (viewportWidth < 1024) {
      scaleFactor = 0.9375; // 15px
    }
    
    const fontSize = baseSize * scaleFactor;
    document.documentElement.style.fontSize = `${fontSize}px`;
  }
};

// Touch target size checker
export const ensureTouchTargets = () => {
  if (typeof document !== 'undefined') {
    const touchTargets = document.querySelectorAll('button, a, input, select, textarea');
    
    touchTargets.forEach(target => {
      const element = target as HTMLElement;
      const computedStyle = window.getComputedStyle(element);
      const width = parseInt(computedStyle.width);
      const height = parseInt(computedStyle.height);
      
      // Minimum touch target size is 44x44 pixels
      if (width < 44 || height < 44) {
        element.style.minWidth = '44px';
        element.style.minHeight = '44px';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
      }
    });
  }
};

// Language detection and RTL support
export const handleLanguageDirection = () => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    const lang = html.lang || 'en';
    
    // Set direction based on language
    if (['ar', 'he', 'fa', 'ur'].includes(lang)) {
      html.dir = 'rtl';
    } else {
      html.dir = 'ltr';
    }
    
    // Add language-specific CSS
    const style = document.createElement('style');
    style.textContent = `
      [dir="rtl"] .flex-row {
        flex-direction: row-reverse;
      }
      
      [dir="rtl"] .text-left {
        text-align: right;
      }
      
      [dir="rtl"] .text-right {
        text-align: left;
      }
      
      [dir="rtl"] .ml-4 {
        margin-left: 0;
        margin-right: 1rem;
      }
      
      [dir="rtl"] .mr-4 {
        margin-right: 0;
        margin-left: 1rem;
      }
    `;
    document.head.appendChild(style);
  }
};

// Reduced motion support
export const handleReducedMotion = () => {
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
};

// Initialize all accessibility features
export const initializeAccessibility = () => {
  createSkipLink();
  enhanceKeyboardNavigation();
  adjustFontSize();
  ensureTouchTargets();
  handleLanguageDirection();
  handleReducedMotion();
  
  // Listen for window resize
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', adjustFontSize);
  }
  
  // Announce page load
  setTimeout(() => {
    announceToScreenReader('Page loaded successfully');
  }, 1000);
};
