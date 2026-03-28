# Task 002: Financial Statements PDF Logo Sizing Implementation

## BDD Scenario
Scenario: Logo Sizing in PDF PDF Reports
  Given a PDF being generated for a Financial Statement
  When the logo is added via doc.addImage
  Then the target width is initially 18% of the printable page width.

## Files
- `src/components/accounting/FinancialStatements.tsx`

## Steps
1. Locate the `doc.addImage` call for the header logo in `buildPdf`.
2. Define the target maximum width: `const maxWidth = (pageWidth - 2 * margin) * 0.18`.
3. Set a maximum height: `const maxLogoHeight = 60` (points).
4. For the logo image, we will set a fixed `width` (maxWidth) and use a relative `height` that fits within the cap.
5. If the logo's URL is available, use it to calculate a dynamic `imageWidth` and `imageHeight`. (Note: Since we use Base64 strings, we can use a temporary Image object or predefined aspect ratios if stored).
6. Update `textX = margin + logoWidth + 15` after the logo call.
7. Use `object-contain` equivalent by choosing the smaller of the two scale factors (width vs height).

## Verification
- Generate PDF with various logo images (horizontal, square, vertical).
- Ensure the company name starts precisely after the logo.
