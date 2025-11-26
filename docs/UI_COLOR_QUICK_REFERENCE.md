# UI Color Quick Reference Guide

## Current Color Palette

### Primary Colors
- **Brand Blue**: `#224FAF` (brand-500) - Primary brand color
- **Coral**: `#F04E43` (coral-500) - Secondary accent
- **Aqua**: `#35C2FF` (aqua-500) - Tertiary accent

### Neutral Colors
- **Slate**: Standard grays (slate-50 to slate-900)
- **Cloud**: Custom neutral grays (cloud-50 to cloud-900)
- **Sand**: Warm beige tones (sand-50 to sand-900)

---

## Recommended Usage Patterns

### Primary Actions (CTAs)
```
✅ Correct:
bg-gradient-to-r from-brand-500 to-brand-600
text-white
shadow-lg shadow-brand-500/25

❌ Avoid:
Solid brand-500 without gradient
Flat colors without shadow
```

### Secondary Actions
```
✅ Correct:
border-2 border-brand-300 dark:border-brand-600
bg-white dark:bg-slate-800
text-brand-700 dark:text-brand-300
hover:bg-brand-50 dark:hover:bg-brand-900/30

❌ Avoid:
Same styling as primary buttons
Weak borders (border instead of border-2)
```

### Semantic Colors (Recommended Addition)

#### Success (Green)
```
bg-semantic-success-50 dark:bg-semantic-success-900/30
text-semantic-success-800 dark:text-semantic-success-300
border-semantic-success-200 dark:border-semantic-success-800
```
**Use for**: Active subscriptions, completed actions, positive feedback

#### Error (Red)
```
bg-semantic-error-50 dark:bg-semantic-error-900/30
text-semantic-error-800 dark:text-semantic-error-300
border-semantic-error-200 dark:border-semantic-error-800
```
**Use for**: Validation errors, destructive actions, critical alerts

#### Warning (Amber)
```
bg-semantic-warning-50 dark:bg-semantic-warning-900/30
text-semantic-warning-800 dark:text-semantic-warning-300
border-semantic-warning-200 dark:border-semantic-warning-800
```
**Use for**: Expiring subscriptions, important notices, caution messages

#### Info (Blue)
```
bg-semantic-info-50 dark:bg-semantic-info-900/30
text-semantic-info-800 dark:text-semantic-info-300
border-semantic-info-200 dark:border-semantic-info-800
```
**Use for**: Neutral information, tooltips, help text

---

## Current Issues & Fixes

### Issue 1: Error Messages
**Current**: Using coral color for errors
```jsx
// Current - Inconsistent with semantic meaning
className="border-coral-200/60 bg-coral-50 text-coral-800"
```

**Recommended**: Use semantic error
```jsx
// Better - Clear semantic meaning
className="border-error-200 dark:border-error-800 
  bg-error-50 dark:bg-error-900/30 
  text-error-800 dark:text-error-300"
```

### Issue 2: Success Messages
**Current**: Mixed use of emerald and brand colors
```jsx
// Inconsistent across components
className="bg-emerald-50 text-emerald-700"  // Some places
className="bg-brand-50 text-brand-700"      // Other places
```

**Recommended**: Standardize on semantic success
```jsx
// Consistent everywhere
className="bg-semantic-success-50 dark:bg-semantic-success-900/30 
  text-semantic-success-800 dark:text-semantic-success-300"
```

### Issue 3: Section Colors
**Current**: Too many color variations (amber, teal, violet, rose, etc.)
- Makes it harder to scan
- Creates visual noise
- Lacks meaning

**Recommended**: Limit to 3-4 themes
1. **Brand Blue** - Default sections
2. **Amber** - Financial/Revenue sections
3. **Semantic Warning/Error** - Risk sections
4. **Semantic Success** - Positive outcomes

---

## Dark Mode Best Practices

### Text Colors
```jsx
// Primary text
text-slate-900 dark:text-slate-100  // ✅ Good contrast

// Secondary text
text-slate-600 dark:text-slate-300  // ✅ Good (not -400)

// Tertiary text
text-slate-500 dark:text-slate-400  // ✅ Acceptable
```

### Backgrounds
```jsx
// Main background
bg-slate-100 dark:bg-slate-900  // ✅ Good

// Card backgrounds
bg-white/95 dark:bg-slate-800/95  // ✅ Good with backdrop blur

// Subtle backgrounds
bg-slate-50 dark:bg-slate-900/50  // ✅ Good
```

### Borders
```jsx
// Standard borders
border-slate-200 dark:border-slate-700  // ✅ Good

// Enhanced borders
border-slate-300 dark:border-slate-600  // ✅ Better visibility
```

---

## Component-Specific Guidelines

### Navigation
- **Active links**: `bg-brand-500/15 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400`
- **Inactive links**: `text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`
- **Background**: `bg-white/95 dark:bg-slate-900/95 backdrop-blur-md`

### Forms
- **Inputs**: `border-slate-200 dark:border-slate-700 focus:border-brand-400 dark:focus:border-brand-500`
- **Labels**: `text-slate-700 dark:text-slate-300`
- **Error states**: Use semantic error colors

### Cards
- **Default**: `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700`
- **Elevated**: Add `shadow-lg`
- **Hover**: `hover:shadow-xl hover:-translate-y-1`

### Buttons
- **Primary**: Gradient with shadow
- **Secondary**: Border with transparent background
- **Tertiary**: Text-only with hover background
- **Destructive**: Semantic error colors

---

## Quick Wins (Easy to Implement)

### 1. Replace Coral Errors with Semantic Error
Find all instances of:
- `border-coral-*` for errors
- `bg-coral-*` for error backgrounds
- `text-coral-*` for error text

Replace with semantic error equivalents.

### 2. Standardize Success Messages
Find all instances of:
- `bg-emerald-*` or `bg-brand-*` for success
- Replace with semantic success colors

### 3. Improve Text Contrast
Update text colors:
- `text-slate-400` → `text-slate-300` (dark mode)
- `text-slate-500` → `text-slate-400` (dark mode)
- `text-slate-600` → `text-slate-700` (light mode for better contrast)

### 4. Simplify Background Gradients
Remove complex body gradient, use simple solid colors:
- Light: `#f8fafc` (slate-50)
- Dark: `#0f172a` (slate-900)

---

## Color Contrast Ratios (WCAG AA Compliance)

### Minimum Requirements
- **Normal text**: 4.5:1 contrast ratio
- **Large text (18pt+ or 14pt+ bold)**: 3:1 contrast ratio
- **UI components**: 3:1 contrast ratio

### Current Status
| Combination | Light Mode | Dark Mode | Status |
|-------------|------------|-----------|--------|
| brand-700 on white | ✅ 4.5:1 | N/A | Pass |
| slate-300 on slate-900 | N/A | ✅ 4.5:1 | Pass |
| coral-500 on white | ⚠️ 3.8:1 | N/A | **Fail** |
| brand-400 on slate-900 | N/A | ⚠️ 3.2:1 | **Fail** |

**Action Required**: Update coral and brand-400 text colors for better contrast.

---

## Migration Checklist

When updating colors:

- [ ] Add semantic colors to Tailwind config
- [ ] Update error message styling (coral → semantic error)
- [ ] Update success message styling (emerald → semantic success)
- [ ] Improve text contrast in dark mode
- [ ] Simplify body background gradients
- [ ] Test all color combinations meet WCAG AA
- [ ] Update component library documentation
- [ ] Review all pages for consistency

