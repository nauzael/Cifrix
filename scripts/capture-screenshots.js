import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(baseDir, 'screenshots');

// Crear directorio si no existe
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:5174';
  const screenshots = [];

  try {
    // 1. Login Page
    console.log('Capturando: Login...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: path.resolve(screenshotsDir, '01-login.png'),
      fullPage: true
    });
    screenshots.push('01-login.png');
    console.log('✅ 01-login.png');

    // Login
    console.log('Iniciando sesión...');
    await page.fill('input[placeholder="ejemplo@correo.com"]', 'demo@cifrix.com');
    await page.fill('input[placeholder="••••••••"]', 'Demo123456!');
    await page.click('button:has-text("Ingresar al Sistema")');
    
    // Esperar a que cargue onboarding
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Onboarding - Seleccionar organización
    console.log('Seleccionando organización...');
    const selectElement = await page.$('select#org-select');
    if (selectElement) {
      await selectElement.selectOption({ index: 4 });
      await page.click('button:has-text("Ingresar a la Organización")');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }
    
    await new Promise(r => setTimeout(r, 3000));

    // 2. Dashboard Principal
    console.log('Capturando: Dashboard...');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({
      path: path.resolve(screenshotsDir, '02-dashboard.png'),
      fullPage: true
    });
    screenshots.push('02-dashboard.png');
    console.log('✅ 02-dashboard.png');

    // 3. Contabilidad
    console.log('Capturando: Contabilidad...');
    await page.goto(`${baseUrl}/accounting`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({
      path: path.resolve(screenshotsDir, '03-accounting.png'),
      fullPage: true
    });
    screenshots.push('03-accounting.png');
    console.log('✅ 03-accounting.png');

    // 4. Facturación
    console.log('Capturando: Facturación...');
    await page.goto(`${baseUrl}/invoicing`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({
      path: path.resolve(screenshotsDir, '04-invoicing.png'),
      fullPage: true
    });
    screenshots.push('04-invoicing.png');
    console.log('✅ 04-invoicing.png');

    // 5. Renta
    console.log('Capturando: Renta...');
    await page.goto(`${baseUrl}/renta`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({
      path: path.resolve(screenshotsDir, '05-renta.png'),
      fullPage: true
    });
    screenshots.push('05-renta.png');
    console.log('✅ 05-renta.png');

    // 6. Reportes
    console.log('Capturando: Reportes...');
    await page.goto(`${baseUrl}/reports`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({
      path: path.resolve(screenshotsDir, '06-reports.png'),
      fullPage: true
    });
    screenshots.push('06-reports.png');
    console.log('✅ 06-reports.png');

    // 7. Vista Mobile (Responsive)
    console.log('Capturando: Vista Mobile...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }
    });
    const mobilePage = await mobileContext.newPage();
    
    // Re-login en móvil
    await mobilePage.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await mobilePage.fill('input[placeholder="ejemplo@correo.com"]', 'demo@cifrix.com');
    await mobilePage.fill('input[placeholder="••••••••"]', 'Demo123456!');
    await mobilePage.click('button:has-text("Ingresar al Sistema")');
    await mobilePage.waitForNavigation({ waitUntil: 'networkidle' });
    
    // Seleccionar organización en móvil
    const mobileSelect = await mobilePage.$('select#org-select');
    if (mobileSelect) {
      await mobileSelect.selectOption({ index: 4 });
      await mobilePage.click('button:has-text("Ingresar a la Organización")');
      await mobilePage.waitForNavigation({ waitUntil: 'networkidle' });
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
    await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 1000));
    await mobilePage.screenshot({
      path: path.resolve(screenshotsDir, '08-mobile.png'),
      fullPage: true
    });
    screenshots.push('08-mobile.png');
    console.log('✅ 08-mobile.png');
    
    await mobileContext.close();

    console.log('\n✅ Todos los screenshots capturados exitosamente!');
    console.log(`📁 Ubicación: ${screenshotsDir}`);
    console.log('📸 Archivos generados:');
    screenshots.forEach(f => console.log(`   - ${f}`));

  } catch (error) {
    console.error('❌ Error capturando screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
