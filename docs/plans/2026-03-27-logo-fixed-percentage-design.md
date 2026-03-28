# Logo Fixed Percentage Implementation Design

**Date:** 2026-03-27
**Topic:** Unified Logo Sizing System (Fluid Percentage)
**Related Conversation:** [Antigravity BRAIN - 5a7a06c0-4bc1-4f98-bfa2-5bbf121f39d7]

## Overview

The current logo handling in reports uses fixed pixel values (e.g., `h-16` or `50x50` points), which can cause visual inconsistency if a user uploads a very wide or very vertical logo. This design implements a fluid percentage-based system to ensure the logo always occupies a proportional space in the report header regardless of the original image dimensions.

## Objectives

- Standardize logo display using a **fluid 18% of the printable width** across all report formats.
- Add safety bounds (max-height) to prevent large vertical logos from disrupting the header layout.
- Provide a real-time preview in the organization settings screen for better user experience.

## Design Specification

### 1. HTML Reports (`Reports.tsx`)

- **Container Styling**: The logo will be wrapped in a container that occupies `18%` of the header width.
- **Image Styling**:
  - `width: 100%` (fills the 18% container).
  - `max-height: 80px` (`max-h-20` in Tailwind).
  - `object-fit: contain` (prevents distortion).
  - `object-position: left center` (aligned with the company info).

### 2. PDF Reports (`FinancialStatements.tsx` / `ChamberOfCommerceReport.tsx`)

- **Printable Width Calculation**:
  - `printableWidth = pageWidth - 2 * margin`.
  - `targetLogoWidth = printableWidth * 0.18`.
- **Vertical Constraint**:
  - `maxLogoHeight = 60` (points).
- **Proportional Scaling Logic**:
  - Determine the image's original aspect ratio.
  - Set `width = targetLogoWidth`.
  - Calculate `height = width / aspectRatio`.
  - If `height > maxLogoHeight`, recalculate: `height = maxLogoHeight` and `width = height * aspectRatio`.
- **Dynamic Element Positioning**: The company name and NIT text `x` coordinate will be dynamically set to `margin + logoWidth + 15` points to maintain a consistent gap.

### 3. Settings Interface (`Settings.tsx`)

- **New Preview Component**: A dedicated section titled "Vista Previa en Reportes" will be added next to the logo upload field.
- **Styling**: It will replicate the report header layout (small company name + logo at 18% width) to show exactly how it will look on official documents.

## Success Criteria

1.  **Horizontal Logos**: Fit within the 18% width without exceeding header height.
2.  **Vertical/Circular Logos**: Capped by height, with text correctly padded to the right.
3.  **No Distortion**: Aspect ratio is preserved everywhere.
4.  **Consistency**: Settings preview matches the generated PDF layout.
