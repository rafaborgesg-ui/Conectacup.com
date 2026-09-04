---
name: Industrial Logistics Mobile
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#5c403c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#916f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#bf0715'
  primary: '#b70011'
  on-primary: '#ffffff'
  primary-container: '#dc2626'
  on-primary-container: '#fff6f5'
  inverse-primary: '#ffb4ab'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#004ed0'
  on-tertiary: '#ffffff'
  tertiary-container: '#2d68f0'
  on-tertiary-container: '#f8f7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 48px
  touch-comfortable: 56px
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 20px
  gutter-2xl: 24px
  container-padding: 16px
  bottom-bar-height: 80px
---

## Brand & Style

The design system addresses the operational demands of industrial logistics, dispatchers, truck drivers, and site managers. Built around a pragmatic, high-efficiency Corporate/Modern mobile framework, it translates heavy operational tasks into frictionless, legible on-the-go workflows.

The emotional tone balances speed, absolute clarity, and institutional reliability. Because logistics environments introduce glare, vibration, and fragmented attention, visual density is disciplined: clear sectional hierarchy, elevated contrast for active states, tactile touch targets, and robust form validation replace extraneous ornamentation.

## Colors

The palette leverages high-visibility industrial accents anchored by neutral structural tones:

- **Primary (`#DC2626` / `#EF4444`):** Institutional alert and primary actions, reserved for critical calls-to-action, primary progression controls, active badges, and essential statuses.
- **Secondary (`#1E293B`):** Deep slate foundation for primary text, structural iconography, section numerals, and terminal states.
- **Tertiary (`#2563EB`):** Route and telemetry indicators, map waypoints, transit statuses, and external document links.
- **Neutral Surface (`#F8FAFC` base, `#FFFFFF` containers, `#E2E8F0` borders):** Clean, crisp separation designed to reduce visual fatigue during repetitive manual data entry.
- **Feedback Accents:** Warning (`#D97706`), Success (`#16A34A`), and Subdued Text (`#64748B`).

## Typography

Inter provides geometric clarity and high legibility at both micro-scales and full-width display headers. Numeric values, tracking codes, weight tallies, and licence plates rely on standard tabular lining figures to maintain scan-friendly alignments across lists and summaries.

All labels sitting above input fields enforce a minimum weight of 600 at 12–14px to prevent loss of context on sunlight-exposed mobile screens.

## Layout & Spacing

A strict fluid mobile model governed by an 8px modular baseline grid. Layout edges maintain a constant `16px` safe horizontal margin on standard viewports (360px–428px), expanding to `20px` on small tablets.

Vertical flow follows a grouped section rhythm:
- Form fields within the same section space apart by `12px` to `16px`.
- Numbered thematic cards sit `16px` apart.
- Bottom padding accommodates the persistent floating action container with an `88px` clear scroll margin to prevent the final form controls from resting underneath the fixed footer.

## Elevation & Depth

Visual hierarchy leverages crisp containment over deep projection:

- **Level 0 (Canvas):** Base background tinted in `#F8FAFC`.
- **Level 1 (Section Cards & Form Surfaces):** `#FFFFFF` with a 1px solid `#E2E8F0` border and a light ambient shadow (`0px 1px 3px rgba(15, 23, 42, 0.05)`).
- **Level 2 (Active Sheets, Popovers & Quick Chips):** Elevated cards or active state badges using `0px 4px 6px -1px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Fixed Bottom Navigation / CTAs):** Persistent docked elements featuring a top boundary border (`#E2E8F0`) backed by a wide upward diffusion (`0px -4px 12px rgba(15, 23, 42, 0.06)`) on a solid white fill.

## Shapes

The design uses a clean, modern radius language (Scale 2):
- Cards and content panels: `12px` (`0.75rem`) to `16px` (`1rem`).
- Inputs and touch controls: `8px` (`0.5rem`) to `10px` (`0.625rem`).
- Badges, tags, and quick-add chips: full pill shapes (`9999px`) to immediately distinguish selection controls from text entry blocks.
- Section number circles: `24px` to `28px` full circles.

## Components

### Numbered Section Cards
- Encapsulates multi-step freight declarations:
  1. *Dados Gerais*
  2. *Responsáveis*
  3. *Rota de Retirada & Entrega*
  4. *Quantidades e Itens*
  5. *Fotos & Documentos*
- Headers feature a circular tag (`28x28px`) colored in `#1E293B` or `#DC2626` when active/completed, accompanied by bold section titles (`headline-md`) and an optional completion checkmark.

### Form Inputs & Textareas
- Height minimum is constrained to `48px` (default `52px` for single-line text/number inputs).
- Border default is `1px solid #CBD5E1`, transitioning to `2px solid #DC2626` on focus with a matching light red glow (`rgba(220, 38, 38, 0.12)`).
- Clear action icon inside right padding for single-tap field wiping.

### Quick Selection Chips (Quantidades e Itens)
- Pre-set values (e.g., "+1 Palete", "+5 Fardos", "Carga Seca", "Granel") built at a minimum height of `36px` with horizontal scroll capability.
- Inactive state: `#F1F5F9` background, `#475569` text, `1px solid #E2E8F0`.
- Active state: `#FEF2F2` background, `#DC2626` text, `1px solid #DC2626`.

### File Upload & Media Preview
- Dashed upload zone (`2px dashed #CBD5E1`, `#F8FAFC` fill) with an ergonomic tap target of `100px` height containing camera and document glyphs.
- Thumbnail previews generate inline in an `80x80px` square with an absolute-positioned top-right delete badge (`24x24px`).

### Sticky Bottom CTA Bar
- Fixed viewport baseline container with a height of `80px` (including safe area padding).
- Primary CTA (*Cadastrar Solicitação*) spans full width (minus `32px` margins), `52px` height, `#DC2626` background, `#FFFFFF` text, `label-lg` typography, and an icon affix for instant processing confirmation.