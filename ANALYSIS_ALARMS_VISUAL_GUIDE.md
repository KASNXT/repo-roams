# Alarms Table - Visual Design Reference

## Mobile View (< 768px)

### Single Alarm Card
```
┌──────────────────────────────────────────┐
│ 🔴 ⚠️ High Pressure   │ [Active Badge] │  ← Header (color-coded background)
│────────────────────────────────────────│
│ 2025-08-12 14:23:15                    │  ← Timestamp
│                                          │
│ Description                              │
│ Pressure exceeded 10 bar threshold       │  ← Full description, no truncation
│ (STATION-01)                             │
│                                          │
│ Severity    │ Acked By                  │
│ [High]      │ John Smith                │  ← Metadata grid
└──────────────────────────────────────────┘
```

### Multiple Cards Stack
```
Card 1 (Critical - Red)
     ↓
Card 2 (High - Orange)
     ↓
Card 3 (Medium - Yellow)
     ↓
Card 4 (Low - Green)
```

### Color Scheme - Mobile Cards
```
Critical (bg-red-50, border-l-red-500)
┌─────────────────────┐
│ 🔴 [Badge]         │
│ ....Description....│
│ Severity │ Acked  │
└─────────────────────┘

High (bg-orange-50, border-l-orange-500)
┌─────────────────────┐
│ 🟠 [Badge]         │
│ ....Description....│
│ Severity │ Acked  │
└─────────────────────┘

Medium (bg-yellow-50, border-l-yellow-500)
┌─────────────────────┐
│ 🟡 [Badge]         │
│ ....Description....│
│ Severity │ Acked  │
└─────────────────────┘

Low (bg-green-50, border-l-green-500)
┌─────────────────────┐
│ 🟢 [Badge]         │
│ ....Description....│
│ Severity │ Acked  │
└─────────────────────┘
```

## Desktop View (≥ 768px)

### Table Layout
```
┌─────┬─────────────────────┬──────────────────┬────────────────┬──────────┬─────────┐
│ 🔴  │ Date/Time           │ Type             │ Description    │ Acked By │ Status  │
├─────┼─────────────────────┼──────────────────┼────────────────┼──────────┼─────────┤
│ ⚠️   │ 2025-08-12 14:23:15 │ [High Pressure]  │ Pressure ex... │ John S.  │ Active  │
│     │ (clickable row)     │                  │ (Click expand) │          │         │
├─────┼─────────────────────┼──────────────────┼────────────────┼──────────┼─────────┤
│ ⏰  │ 2025-08-12 13:45:32 │ [Low Level]      │ Tank level ... │ —        │ Pending │
│     │                     │                  │                │          │         │
├─────┼─────────────────────┼──────────────────┼────────────────┼──────────┼─────────┤
│ 🌡️  │ 2025-08-12 12:15:08 │ [Comm Error]     │ Lost connec... │ Sarah J. │ Acked   │
│     │                     │                  │                │          │         │
└─────┴─────────────────────┴──────────────────┴────────────────┴──────────┴─────────┘
```

### Row Expansion (Click Row)
```
Before Click:
│ ⚠️   │ 2025-08-12 14:23:15 │ [High Pressure]  │ Pressure ex... │ John S.  │ Active  │

After Click:
│ ⚠️   │ 2025-08-12 14:23:15 │ [High Pressure]  │ Pressure ex... │ John S.  │ Active  │
│     │                     │ ─────────────────────────────────────────────────────────│
│     │                     │ Full Description:                                        │
│     │                     │ "Pressure exceeded 10 bar threshold (STATION-01)"        │
└─────┴─────────────────────┴─────────────────────────────────────────────────────────┘
```

### Severity Color Tinting
```
Critical Row (bg-red-50/30):
│ Red tinted background │

High Row (bg-orange-50/30):
│ Orange tinted background │

Medium Row (bg-yellow-50/30):
│ Yellow tinted background │

Low Row (normal):
│ Regular background │
```

## Responsive Behavior

### 320px (Mobile Portrait)
```
┌────────────────────────┐
│ 📱 Card 1              │
│ ────────────────────── │
│ Full content visible   │
└────────────────────────┘
[Export] (Full width)
```

### 640px (Tablet Portrait)
```
┌──────────────────────────────────────┐
│ 📱 Card 1 (Better spacing)           │
│ ──────────────────────────────────── │
│ Content + Metadata side-by-side       │
└──────────────────────────────────────┘
[Export] (Auto width)
```

### 1024px (Desktop/Tablet Landscape)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Full Table with all columns visible                                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1440px (Full Desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Full Table with optimized spacing and alignment                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Pagination Layouts

### Mobile (< 640px)
```
Showing 1-10 of 25
[<] [1][2][3] [>]
```

### Desktop (≥ 640px)
```
Showing 1-10 of 25 alarms        Page 1 of 3  [<] [1][2][3] [>]
```

## Typography & Sizing

### Mobile
```
Header: 16px (text-sm)
Card Title: 14px (text-sm, bold)
DateTime: 12px (text-xs, monospace)
Body Text: 12px (text-xs)
Labels: 12px (text-xs, semibold gray-700)
Badges: 12px (text-xs)
```

### Desktop
```
Table Header: 14px (text-sm)
DateTime: 12px (text-xs, monospace)
Body Text: 12px-14px (text-xs/text-sm)
Badges: 12px (text-xs)
Status: 12px (text-xs)
```

## Icon Sizing

### Mobile
```
Severity Icon: 16x16 (h-4 w-4)
Alert Icons: 16x16 (h-4 w-4)
Chevrons: 12x12 (h-3 w-3)
```

### Desktop
```
Severity Icon: 16x16 (h-4 w-4)
Alert Icons: 16x16 (h-4 w-4)
Chevrons: 16x16 (md:h-4 md:w-4)
```

## Spacing Standards

### Cards (Mobile)
```
Padding: 12px (p-3) on mobile, 16px (p-4) on tablet
Gap between cards: 12px (gap-3)
Header padding: 8px bottom (pb-2)
Content padding: 12px top (pt-3)
Metadata gap: 12px (gap-3)
```

### Table (Desktop)
```
Cell padding: 8px vertical (py-2)
Row gap: 0 (natural)
Column spacing: inherent
Hover padding: maintained
```

## State Indicators

### Badge Colors
```
Active: Red (destructive variant)
Acknowledged: Yellow (status-warning)
Resolved: Green (status-connected)
```

### Severity Icons
```
🔴 Critical: AlertCircle (red)
🟠 High: AlertTriangle (orange)
🟡 Medium: Clock (blue/primary)
🟢 Low: CheckCircle (green)
```

## Interaction States

### Card (Mobile)
```
Default: Normal background
Hover: Slightly darker
Active: Expanded (full description visible)
```

### Table (Desktop)
```
Default: White background
Hover: Muted background (hover:bg-muted/50)
Click: Expanded description inline
```

## Empty State
```
┌──────────────────────────────────┐
│                                  │
│         ⚠️ (Icon)               │
│                                  │
│  No alarms found matching your   │
│  criteria                        │
│                                  │
└──────────────────────────────────┘
```

## Alignment & Justification

### Mobile Cards
```
Header: Items start, justify between (space items)
Icon: Flex shrink 0 (stays fixed)
Title: Flex 1 (takes available space)
Badge: Flex shrink 0 (stays fixed)

Body: Space Y (vertical stacking)
Metadata: Grid cols 2 (equal width)
```

### Desktop Table
```
Severity: Center aligned
DateTime: Left aligned, monospace
Type: Left aligned
Description: Left aligned, truncated
Acknowledged By: Left aligned
Status: Center aligned
```

## Performance Indicators

```
Loading State: Disabled buttons, gray text
Pagination: Disabled chevrons on first/last page
Search: Real-time filtering (no submit needed)
Export: Disabled while loading
```
