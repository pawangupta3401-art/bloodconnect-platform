# 🎨 Web Application Design System Specification

A unified, professional, and scalable visual design language ensuring consistency, high trust, clarity, and WCAG AA accessibility.

---

## 1. Design Principles & Goals

* **Clarity**: Clean, uncluttered, easy-to-scan interfaces with immediate visual hierarchy.
* **Consistency**: Predictable UI patterns and identical component behavior across all screens.
* **Trust & Professionalism**: Corporate aesthetic with restrained color balance, crisp borders, and refined elevation.
* **Accessibility (a11y)**: Strict compliance with **WCAG AA** standards (minimum 4.5:1 text contrast ratio, clear focus indicators, accessible tap targets).

---

## 2. Color Palette & Semantic Tokens

### 🔵 Primary Brand Colors
| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `Primary Blue` | `#1A3A5C` | Top headers, primary action buttons, brand identity |
| `Primary Blue (Light)` | `#2C5B8C` | Hover states, active links, interactive highlights |
| `Primary Blue (Dark)` | `#0F2540` | Active button states, deep footer backgrounds |

### 🟢 Secondary & Accent Colors
| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `Accent Teal` | `#0E7C7B` | Key CTAs, active indicators, metrics highlights |
| `Slate Gray` | `#4A5568` | Secondary sub-text, meta captions, muted icons |

### ⚪ Neutral Surface Colors
| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `White` | `#FFFFFF` | Core backgrounds, cards, modal sheets |
| `Light Gray` | `#F5F7FA` | Page/section alternating background, table headers |
| `Border Gray` | `#E2E8F0` | Structural dividers, input field borders, table rows |
| `Dark Gray` | `#2D3748` | Standard body copy text |
| `Charcoal` | `#1A202C` | High-contrast headings, primary title text |

### 🚦 Semantic Status Colors
| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `Success` | `#2F855A` | Positive alerts, verified badges, successful actions |
| `Warning` | `#C05621` | Cautionary notices, pending items, inventory warnings |
| `Error` | `#C53030` | Form validation errors, critical alerts, danger buttons |
| `Info` | `#2B6CB0` | Informational callouts, status tips, system notices |

---

## 3. Typography

* **Primary Font**: `Inter`, `Roboto`, `Segoe UI`, `-apple-system`, `sans-serif` (Optimal digital legibility)
* **Secondary Font (Optional Serif)**: `"Source Serif Pro"`, `Georgia`, `serif` (Editorial/Corporate reports)

### Type Scale Hierarchy
| Element | Size (px / rem) | Font Weight | Line Height | CSS Variable |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | `32px / 2.0rem` | `700` (Bold) | `1.2` | `--font-size-h1` |
| **H2** | `24px / 1.5rem` | `700` (Bold) | `1.3` | `--font-size-h2` |
| **H3** | `20px / 1.25rem` | `600` (Semibold) | `1.4` | `--font-size-h3` |
| **H4** | `16px / 1.0rem` | `600` (Semibold) | `1.4` | `--font-size-h4` |
| **Body** | `16px / 1.0rem` | `400` (Regular) | `1.6` | `--font-size-body` |
| **Body Small** | `14px / 0.875rem`| `400` (Regular) | `1.5` | `--font-size-body-sm` |
| **Caption** | `12px / 0.75rem` | `400` (Regular) | `1.4` | `--font-size-caption` |
| **Button Text** | `14px / 0.875rem`| `600` (Semibold) | `1.0` | `--font-size-btn` |

---

## 4. Spacing System (8px Grid)

Consistent spatial harmony built on an 8-point base grid:

| Token | Value | Applied Usage |
| :--- | :--- | :--- |
| `xs` | `4px` | Fine-grain icon padding, inline badge gaps |
| `sm` | `8px` | Small gaps, input internal padding |
| `md` | `16px` | Default component spacing, card internal padding |
| `lg` | `24px` | Section margins, grid gutters, modal padding |
| `xl` | `32px` | Large container margins & vertical block gaps |
| `2xl` | `48px` | Page-level section breaks |
| `3xl` | `64px` | Hero section padding & landmark headers |

---

## 5. Grid & Responsive Layouts

* **Max Content Width**: `1280px` (`max-width: 1280px; margin: 0 auto;`)
* **Grid Columns**: `12-column grid` system
* **Column Gutter**: `24px`

### Responsive Breakpoints
| Device Type | Viewport Width | Typical Columns |
| :--- | :--- | :--- |
| **Mobile** | `< 640px` | 4 columns / single-column stack |
| **Tablet** | `640px – 1024px` | 8 columns |
| **Desktop** | `1024px – 1440px` | 12 columns |
| **Large Desktop** | `> 1440px` | 12 columns (centered in max-width) |

---

## 6. Core UI Components

### 6.1 Buttons
* **Height**: `40px` | **Padding**: `10px 20px` | **Border-Radius**: `6px` | **Font-Weight**: `600`
* **Primary**: Background `#1A3A5C`, Text `#FFFFFF`, Hover `#2C5B8C`, Active `#0F2540`.
* **Secondary**: Background `#FFFFFF`, Text `#1A3A5C`, Border `1px solid #1A3A5C`.
* **Tertiary / Ghost**: Background `transparent`, Text `#1A3A5C`, Hover `rgba(26, 58, 92, 0.08)`.
* **Disabled**: Background `#E2E8F0`, Text `#A0AEC0`, Cursor `not-allowed`.

### 6.2 Form Inputs
* **Border**: `1px solid #E2E8F0`
* **Border-Radius**: `6px`
* **Padding**: `10px 12px`
* **Focus State**: Border color `#2C5B8C`, Outline `none`, Box-shadow `0 0 0 3px rgba(44, 91, 140, 0.15)`
* **Error State**: Border color `#C53030`, Error message text in `#C53030` (12px caption)

### 6.3 Cards
* **Background**: `#FFFFFF`
* **Border-Radius**: `8px`
* **Border**: `1px solid #E2E8F0` (optional)
* **Shadow**: `0 1px 3px rgba(0, 0, 0, 0.1)` (Elevation Level 1)
* **Padding**: `24px`

### 6.4 Navigation Bar
* **Height**: `64px`
* **Background**: `#1A3A5C` (Dark Mode) or `#FFFFFF` with `1px solid #E2E8F0` bottom border
* **Active Indicator**: Underline / indicator in `Accent Teal (#0E7C7B)`

### 6.5 Data Tables
* **Header Background**: `#F5F7FA` with font weight `600` and uppercase captions
* **Row Divider**: `1px solid #E2E8F0`
* **Alternate Row Shading**: `#FAFBFC` for high density readability

### 6.6 Modals & Dialogs
* **Backdrop Overlay**: `rgba(0, 0, 0, 0.5)` with optional subtle backdrop-filter
* **Modal Background**: `#FFFFFF`
* **Border-Radius**: `8px`
* **Shadow**: `0 10px 15px -3px rgba(0, 0, 0, 0.1)` (Elevation Level 3)
* **Max Width**: Standard `480px`, Large `720px`

---

## 7. Iconography Standards

* **Style**: Crisp outline / stroke icons with consistent `1.5px – 2px` stroke width.
* **Recommended Library**: `lucide-react` / `feather-icons`.
* **Size Standards**:
  * Small: `16px` (Inline badges, input icons)
  * Regular: `20px` (Buttons, navigation items, card headers)
  * Large: `24px` (Feature icons, metric tiles, hero callouts)

---

## 8. Elevation & Shadow Levels

| Level | CSS Shadow Value | Component Usage |
| :--- | :--- | :--- |
| **Level 1** | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Default cards, resting input fields |
| **Level 2** | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` | Dropdowns, popovers, hovering cards |
| **Level 3** | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` | Modals, floating alert dialogs, drawers |

---

## 9. Accessibility (WCAG AA Compliance)

* **Contrast Ratios**: Minimum `4.5:1` for standard body copy (`#2D3748` on `#FFFFFF` gives `10.7:1` ✅).
* **Focus States**: High-contrast outline/ring on all interactive elements for keyboard navigability.
* **Minimum Font Size**: `14px` for readable interactive text (`12px` restricted to secondary captions).
* **Touch Targets**: Minimum `44x44px` interactive area on mobile viewports.
