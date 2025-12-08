# Design Guidelines: Shopify Customer Segmentation Dashboard

## Design Approach

**Reference-Based Approach** drawing from modern SaaS analytics tools:
- **Primary References**: Shopify Admin UI patterns, Linear's typography and spacing, Stripe Dashboard's data presentation
- **Rationale**: This is a utility-focused, data-dense internal tool where clarity, efficiency, and learnability are paramount. Following established patterns from best-in-class analytics dashboards ensures immediate usability.

## Design Principles

1. **Data First**: Table and filters are the heroes - minimize chrome, maximize content visibility
2. **Hierarchy Through Spacing**: Use whitespace to create visual breathing room between dense information
3. **Scannable Information**: Clear typography hierarchy makes data parsing effortless
4. **Functional Aesthetics**: Clean, professional, purposeful - every element serves the user's workflow

---

## Core Design Elements

### A. Typography

**Font Family**: Inter (via Google Fonts CDN)
- Clean, highly legible at small sizes, excellent for data-heavy interfaces

**Hierarchy**:
- **Page Titles**: text-2xl (24px), font-semibold
- **Section Headers**: text-lg (18px), font-semibold  
- **Card Titles/Stats**: text-base (16px), font-medium
- **Table Headers**: text-sm (14px), font-medium, uppercase tracking
- **Body/Table Data**: text-sm (14px), font-normal
- **Labels/Captions**: text-xs (12px), font-medium

### B. Layout System

**Spacing Primitives**: Tailwind units of **2, 3, 4, 6, 8, 12, 16**
- Micro spacing (gaps, padding): 2-4
- Component spacing: 4-6
- Section spacing: 8-12
- Page margins: 16

**Container Strategy**:
- Full viewport layout with sidebar/main content split
- Main content: max-w-7xl with px-6 py-8
- Consistent vertical rhythm: space-y-6 for major sections

**Grid System**:
- Summary stats: grid-cols-2 md:grid-cols-4 gap-4
- Filters: Single column stack on mobile, 2-column on tablet+
- Table: Full-width scrollable container

---

## C. Component Library

### 1. Application Shell

**Header** (sticky top)
- Height: h-16
- Layout: Horizontal flex with logo/title left, potential actions right
- Contains: App name "Shopify Customer Segmenter" (text-lg font-semibold)
- Border: Bottom border for separation
- Padding: px-6

### 2. Summary Statistics Cards

**Layout**: 4-column grid (responsive: 2 on tablet, 1 on mobile)
- Card structure: Rounded corners (rounded-lg), border, padding p-6
- Content hierarchy:
  - Label: text-xs uppercase tracking-wide (e.g., "Total Customers")
  - Value: text-3xl font-bold (e.g., "1,247")
  - Subtext: text-sm (e.g., "+124 this month")
- Spacing: gap-4 between cards

### 3. Filters Panel

**Container**: Rounded border panel, p-6, space-y-4
- **Section Title**: "Filters" (text-lg font-semibold, mb-4)

**Filter Inputs**:
- **Dropdowns/Selects**: 
  - Height: h-10
  - Full width, rounded-md, border
  - Placeholder text in lighter weight
  
- **Date Range Pickers**:
  - Side-by-side inputs (grid-cols-2 gap-2)
  - Labels: "From" / "To" (text-xs font-medium, mb-1)
  
- **Multi-select Tags**:
  - Chip-based selected display
  - Height: min-h-10
  
- **Text Inputs** (email/name search):
  - Height: h-10
  - Icon prefix (search icon, pl-10)
  
- **Confidence Slider**:
  - Range input with value display
  - Label shows current value

**Action Buttons** (sticky at bottom of filters):
- Primary: "Apply Filters" (w-full h-10, font-medium)
- Secondary: "Clear All" (w-full h-10, font-medium, outline style)
- Spacing: space-y-2

### 4. Customers Table

**Container**: Rounded border panel, overflow-x-auto
- **Table Structure**:
  - Header row: Sticky top, font-medium, text-xs uppercase
  - Row height: h-12
  - Cell padding: px-4 py-3
  - Borders: Bottom borders on rows for separation
  
**Columns**:
1. Name (min-w-48)
2. Email (min-w-64)
3. City
4. Country  
5. Tags (flex-wrap chip display)
6. Gender (with confidence badge)
7. Created (sortable icon)
8. Last Order (sortable icon)

**Gender Display**:
- Inline badge: px-2 py-1, rounded-full, text-xs
- Confidence as percentage in lighter text

**Sortable Columns**:
- Arrow icon next to column header
- Visual indicator for active sort

**Empty State**:
- Centered in table area
- Icon + "No customers found" message
- "Clear filters" suggestion

### 5. Pagination Controls

**Layout**: Flex justify-between items-center, mt-4, px-4
- Left: "Showing X-Y of Z results" (text-sm)
- Right: Page number buttons + prev/next arrows
  - Buttons: h-8 w-8, rounded
  - Current page: font-semibold with distinct styling

### 6. Export Section

**Placement**: Above table, flex justify-between items-center, mb-4
- Left: Result count
- Right: "Export CSV" button
  - Height: h-10, px-6
  - Icon prefix (download icon)
  - Primary button styling

---

## D. Responsive Behavior

**Desktop (≥1024px)**:
- Filters panel: Fixed sidebar (w-80) on left
- Main content: flex-1 with proper margins
- 4-column stats grid
- Full table visibility

**Tablet (768-1023px)**:
- Filters: Collapsible drawer or accordion
- 2-column stats grid
- Table: Horizontal scroll

**Mobile (<768px)**:
- Filters: Full-screen modal/drawer
- 1-column stats grid (stacked)
- Table: Compact view with horizontal scroll, priority columns only
- Export button: Full width at top

---

## E. Micro-interactions

**Minimal Animation** (use sparingly):
- Hover states: Subtle opacity change (opacity-90) or slight shadow increase
- Filter panel: Smooth slide-in transition (200ms)
- Table rows: Hover background change for scannability
- Button states: Standard press feedback

**Loading States**:
- Table: Skeleton rows (shimmer effect)
- Stats cards: Pulse animation
- Filters: Disabled state with reduced opacity

---

## Images

**No hero image required** - This is a data application, not a marketing page. All visual focus should be on data presentation and usability.

---

## Key Deliverables Summary

- Clean, professional dashboard with clear information hierarchy
- Sidebar-main content layout (desktop) with responsive adaptations
- Prominent filtering capabilities without overwhelming the interface  
- Data table as the central focus with excellent scannability
- Summary statistics providing at-a-glance insights
- Export functionality integrated naturally into workflow
- Consistent spacing using Tailwind units: 2, 3, 4, 6, 8, 12, 16
- Inter font family for optimal data readability
- Minimal, purposeful animations focused on usability feedback