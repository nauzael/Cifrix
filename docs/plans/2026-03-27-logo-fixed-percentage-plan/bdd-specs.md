# BDD Specs for Logo Fixed Percentage

## Scenario: Logo Sizing in HTML Reports
- **Given** a browser viewing a report with a wide or vertical logo
- **When** the header is rendered
- **Then** the logo container width is exactly 18% of the header
- **And** the image height is capped at 80px (20rem) without any distortion
- **And** the object-position is set to left center

## Scenario: Logo Sizing in PDF Reports
- **Given** a PDF being generated (FinancialStatements or ChamberOfCommerce)
- **When** the logo is added via doc.addImage
- **Then** the target width is initially 18% of the printable page width
- **And** if the resulting height (based on aspect ratio) exceeds 60 points, the width is scaled down to maintain the 60 points height cap
- **And** the subsequent header text (company name, NIT) starts exactly 15 points after the actual drawn image width

## Scenario: Settings Logo Preview
- **Given** the Settings page is open
- **When** the organization has a logo uploaded
- **Then** a "Vista Previa en Reportes" section replicates the report header layout
- **And** the preview uses the 18% width container and max-height logic
