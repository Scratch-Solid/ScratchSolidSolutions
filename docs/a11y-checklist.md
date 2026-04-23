# Accessibility Checklist

## Keyboard Navigation
- [x] All interactive elements are reachable via Tab key
- [x] Escape key closes modals
- [x] Focus states visible on all interactive elements

## Screen Readers
- [x] Modal dialogs have `role="dialog"` and `aria-modal="true"`
- [x] Form labels explicitly associated with inputs
- [x] Button and link text is descriptive

## Color Contrast
- [x] Primary blue (#3b82f6) on white meets WCAG AA
- [x] Text on glassmorphism cards uses solid background fallback
- [x] Error text (#ef4444) is distinguishable

## Motion & Animation
- [x] Animations respect `prefers-reduced-motion`
- [x] No auto-playing content without pause controls

## Forms & Validation
- [x] Error messages announced via aria-live regions
- [x] Required fields marked and validated
- [x] Input sanitization prevents XSS

## Responsive
- [x] Touch targets minimum 44x44px
- [x] No horizontal scrolling at 320px viewport
- [x] Text remains readable at 200% zoom
