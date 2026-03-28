# Task 003: Chamber of Commerce PDF Logo Sizing Implementation

## BDD Scenario
Scenario: Logo Sizing in PDF PDF Reports
  Given a PDF being generated for a Financial Statement (Chamber of Commerce)
  When the logo is added via doc.addImage
  Then the target width is initially 18% of the printable page width.

## Files
- `src/components/accounting/ChamberOfCommerceReport.tsx`

## Steps
1. Locate the `doc.addImage` call for the header logo in `buildPdf`.
2. Apply the same logic as Phase 2:
   - Calculate `maxWidth = (pageWidth - 2 * margin) * 0.18`.
   - Implement Height cap (60pt).
3. Recalculate `textX` instead of using a hardcoded `margin + 65` offset.
4. Verify by checking the RUES report header.

## Verification
- Visually inspect the RUES report PDF for logo size consistency compared to regular balance sheets.
- Ensure the header text is correctly aligned.
