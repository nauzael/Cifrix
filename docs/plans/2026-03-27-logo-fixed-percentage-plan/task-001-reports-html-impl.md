# Task 001: HTML Logo Container Implementation

## BDD Scenario
Scenario: Logo Sizing in HTML Reports
  Given a browser viewing a report with a wide or vertical logo
  When the header is rendered
  Then the logo container width is exactly 18% of the header
  And the image height is capped at 80px (20rem) without any distortion

## Files
- `src/pages/Reports.tsx`

## Steps
1. Locate the logo rendering logic in `buildHtml` function templates (multiple occurrences).
2. Replace the existing `h-16` or fixed height class with a container system:
   ```html
   <div class="w-[18%] flex items-center">
     <img src="${url}" class="max-w-full max-h-20 object-contain object-left" />
   </div>
   ```
3. Ensure the company info column uses the remaining `82%` or an `auto` layout to maintain spacing.
4. Verify by checking the balance sheet preview with various logo shapes.

## Verification
- Visually confirm the logo width is proportional to the overall paper width.
- Ensure the company name starts immediately after the logo container.
