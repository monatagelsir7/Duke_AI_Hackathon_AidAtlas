# Design Guidelines: Humanitarian Donation Platform MVP

## Design Approach

**Reference-Based Strategy**: Drawing inspiration from Tinder's swipe mechanics, Airbnb's trust-building card design, and Linear's typography restraint. This platform requires emotional engagement while maintaining credibility and clarity for donation actions.

**Core Principles**:
- **Trust through transparency**: Clean layouts, verified badges, clear information hierarchy
- **Emotional connection without exploitation**: Dignified imagery, hopeful tone, respectful presentation
- **Effortless interaction**: Intuitive swipe mechanics, minimal friction to donate
- **Mobile-first excellence**: Touch-optimized, thumb-friendly navigation zones

---

## Typography

**Font Stack** (via Google Fonts CDN):
- **Primary**: Inter (400, 500, 600, 700) - UI text, body copy, interface elements
- **Display**: Fraunces (600, 700) - Hero headlines, impact numbers, emotional emphasis

**Scale & Hierarchy**:
- **Hero/Display**: text-4xl to text-6xl (Fraunces 600)
- **Section Headers**: text-2xl to text-3xl (Inter 600)
- **Card Titles**: text-xl to text-2xl (Inter 600)
- **Body Text**: text-base to text-lg (Inter 400)
- **Metadata/Labels**: text-sm to text-base (Inter 500)
- **Micro-copy**: text-xs to text-sm (Inter 400)

**Line Heights**: leading-tight for headlines, leading-relaxed for body text

---

## Layout System

**Spacing Primitives** (Tailwind units): Consistently use **2, 4, 6, 8, 12, 16, 20, 24** for rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20 (mobile), py-20, py-24, py-32 (desktop)
- Card gaps: gap-4, gap-6
- Element margins: mb-2, mb-4, mb-6

**Container Strategy**:
- Full viewport: w-full
- Content containers: max-w-7xl mx-auto px-4 (mobile), px-6 (tablet), px-8 (desktop)
- Card interface: max-w-md mx-auto (centered mobile experience)
- Text content: max-w-prose

**Responsive Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header: h-16, backdrop-blur-lg, border-b
- Logo left-aligned, profile/menu right-aligned
- Mobile: Hamburger menu with slide-out drawer
- Navigation links: Desktop horizontal, mobile vertical list

### Card Interface (Core Feature)
**Swipeable Conflict Cards**:
- Card container: max-w-md, aspect-ratio-[3/4], rounded-2xl, shadow-2xl
- Image zone: Top 50-60% with gradient overlay (top to transparent)
- Content zone: Bottom 40-50%, p-6, white background
- Swipe indicators: Left/right edge glow/shadow on drag
- Card stack: Show 2-3 cards behind with scale/opacity reduction

**Card Content Structure**:
- Country/Region: text-sm, uppercase, tracking-wide, opacity-70
- Conflict Title: text-2xl, font-semibold, mb-2
- Summary: text-base, leading-relaxed, line-clamp-3
- Tags/Badges: Pill-shaped, text-xs, px-3, py-1, rounded-full
- CTA buttons: Fixed bottom zone, gap-3, full-width

**Action Buttons (Below Cards)**:
- Three-button layout: Pass, Details, Support
- Icon-based with labels: Large touch targets (h-14, w-14 for icons)
- Center button (Details) emphasized: Larger, primary styling

### Organization Cards
**Verified Organization Display**:
- Compact card: p-4, rounded-xl, border
- Logo: h-12, w-12, rounded-lg
- Name + verification badge: Inline display
- Rating stars + Charity Navigator score
- Description: text-sm, line-clamp-2
- Donate button: Secondary style, right-aligned

### Forms
**Preference Quiz**:
- Progress indicator: Stepped dots, top of screen
- Question card: Centered, max-w-lg, p-8
- Multi-select chips: Pill buttons, toggle state, gap-2, flex-wrap
- Navigation: Previous/Next buttons, bottom fixed bar

**Donation Flow**:
- Amount selector: Grid of preset buttons (2x3 layout) + custom input
- Organization allocation: Checkbox list with percentages
- Payment form: Single-column, generous spacing (gap-6)
- Summary panel: Sticky sidebar (desktop) or bottom sheet (mobile)

### Data Visualization
**Impact Dashboard**:
- Stats grid: grid-cols-2 md:grid-cols-4, gap-4
- Stat cards: p-6, rounded-xl, text-center
- Large numbers: text-4xl, Fraunces font
- Labels: text-sm, opacity-70
- Icons: text-3xl, mb-2

**Donation History**:
- Timeline list: Vertical with connecting line
- History items: p-4, rounded-lg, flex layout
- Date badges: Absolute positioned, text-xs
- Organization thumbnails: h-10, w-10, rounded-full

### Modals & Overlays
**Detail Modal**:
- Full-screen mobile, centered card desktop (max-w-2xl)
- Header: Fixed with close button, h-16
- Scrollable content: p-6
- Footer: Sticky with primary CTA

**Bottom Sheets** (Mobile):
- Drag handle: Centered pill shape
- Backdrop: backdrop-blur-sm, bg-black/20
- Content: rounded-t-3xl, min-h-[50vh]

---

## Images

**Hero Section**: 
- Full-width hero with humanitarian imagery (people helping people, hope-focused)
- h-[70vh] on desktop, h-[60vh] on mobile
- Gradient overlay: from-black/60 via-black/30 to-transparent
- Content overlaid: Centered, text-white, with blurred button backgrounds (backdrop-blur-md, bg-white/20)

**Conflict Cards**: 
- Contextual imagery showing conflict regions with dignity
- Each card features one compelling image
- Aspect ratio: 4:3 or 16:9, object-cover

**Organization Logos**: 
- Square format, h-12 w-12 for list view
- h-20 w-20 for detail view
- Background: white with subtle border

**Impact Visuals**: 
- Before/after imagery where appropriate
- Beneficiary stories: Respectful portraits
- Data visualizations: Charts and infographics

---

## Icon System

**Library**: Heroicons (via CDN) - outline for regular, solid for emphasis

**Usage**:
- Navigation: 24px icons
- Cards: 20px for metadata icons
- Buttons: 20px inline with text
- Feature highlights: 32-40px decorative

**Key Icons**: MapPin, Heart, Users, Globe, ChartBar, CheckCircle, ExclamationTriangle

---

## Animations

**Strategic Use Only**:
- Card swipe physics: Spring animation, subtle bounce
- Page transitions: Fade + slight slide (150ms)
- Button states: Scale on press (0.95), 100ms
- Loading states: Skeleton screens, gentle pulse
- Success feedback: Checkmark scale-in animation

**Avoid**: Excessive parallax, continuous animations, scroll-triggered effects

---

## Landing Page Structure

**Sections** (8 comprehensive sections):
1. **Hero**: Full-width image, headline "Support Where It Matters Most", subtitle, dual CTAs (Start Giving / Learn More)
2. **How It Works**: 3-column grid with icons - Discover, Choose, Impact
3. **Live Impact**: Real-time donation map visualization with stats overlay
4. **Featured Conflicts**: Carousel of 3 current priority conflict cards
5. **Trust & Verification**: 2-column layout - left text about verification, right organization badges/ratings
6. **Impact Stories**: 3 testimonial cards with beneficiary updates
7. **Transparency**: Split layout - pie chart of fund distribution, list of partner organizations
8. **Final CTA**: Centered with background image, Get Started button, newsletter signup

**Multi-Column Strategy**:
- Hero/CTA sections: Single column, centered
- Features: 3 columns desktop, 1 mobile
- Organizations: 2-3 columns desktop
- Impact stats: 4 columns desktop, 2 mobile