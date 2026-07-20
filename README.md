# Millbridge Court

A Next.js 15 (App Router) site built in the warm, cream-and-slate-blue
countryside-venue style shown in your reference screenshots: a centered
wordmark, dotted picture frames, flower/dot dividers, and soft scroll-reveal
animation throughout.

## Stack

- Next.js 15 / App Router
- React 18 + TypeScript
- Tailwind CSS (custom `cream` / `slate` palette + serif type scale)
- Framer Motion (scroll reveals, mobile menu transitions)
- Lucide React (menu / close icons)

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

Production build:

```bash
npm run build
npm run start
```

## Replacing the placeholder photography

I generated soft gradient placeholders in the correct aspect ratios so the
layout renders correctly out of the box. Swap in your real photography by
replacing these files (keep the same names, or update the `src` paths in
`app/page.tsx` and `components/gallery-section.tsx`):

| File | Used for |
|---|---|
| `public/images/hero.jpg` | Full-bleed hero background |
| `public/images/weddings.jpg` | Weddings section |
| `public/images/private-takeovers.jpg` | Private Takeovers section |
| `public/images/gallery-1.jpg` | Gallery — tall image |
| `public/images/gallery-2.jpg` | Gallery — wide image |

## Structure

```
app/
  layout.tsx        Root layout, Google font loading
  page.tsx           Homepage composition
  globals.css        Base styles, dotted-frame utility, reduced-motion support
components/
  navbar.tsx          Wordmark + hamburger trigger
  mobile-menu.tsx     Full-screen slide-in nav
  hero.tsx            Full-bleed hero with overlay headline
  feature-section.tsx Reusable "Weddings" / "Private Takeovers" pattern
  gallery-section.tsx Two-image asymmetric gallery grid
  dotted-frame.tsx     Signature dotted picture-frame image wrapper
  decorative-icons.tsx Flower / dot-cluster / trio-dot SVG dividers
  footer.tsx
lib/utils.ts          Small class-merge helper
types/index.ts         Shared TypeScript types
```

## Content notes

The heading and body copy is transcribed directly from your screenshots.
Sections not visible in the screenshots you shared (further pages, full
navigation destinations, contact details) are stubbed with sensible
placeholders — update `app/page.tsx`, `components/footer.tsx`, and
`components/mobile-menu.tsx` with your actual content and links as you build
out the rest of the site.

## Accessibility

- Semantic landmarks (`header`, `main`, `footer`, `nav`)
- Visible focus rings on all interactive elements
- `prefers-reduced-motion` respected globally
- Mobile menu is a labeled dialog, closes on `Escape`, alt text on all images
