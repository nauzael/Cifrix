# Task 004: Settings Logo Preview Implementation

## BDD Scenario
Scenario: Settings Logo Preview
  Given the Settings page is open
  When the organization has a logo uploaded
  Then a "Vista Previa en Reportes" section replicates the report header layout
  And the preview uses the 18% width container and max-height logic

## Files
- `src/pages/Settings.tsx`

## Steps
1. Navigate to the organization settings section.
2. Find the Logo upload field.
3. Add a new card/section below it: "Vista Previa en Reportes".
4. Replicate the report header HTML structure:
   ```html
   <div class="p-6 border rounded-xl bg-slate-50">
     <div class="flex items-center gap-4">
       <div class="w-[18%] max-h-20 flex items-center">
         <img src="${logo}" class="max-w-full max-h-20 object-contain object-left" />
       </div>
       <div>
         <p class="font-black uppercase text-xs">${name}</p>
         <p class="text-[10px] text-slate-500">Vista previa del reporte oficial</p>
       </div>
     </div>
   </div>
   ```
5. Ensure the preview updates immediately when a new logo is uploaded.
6. Verify by toggling between different logo files.

## Verification
- Confirm the preview looks similar to what will be rendered in the Reports page.
- Ensure it handles the "No logo" state gracefully (church icon fallback).
