import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '..');
const screenshotsDir = path.resolve(baseDir, 'screenshots');

async function captureOfflineScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    offline: true  // Iniciar en modo offline
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:5174';

  try {
    // Ir al login primero en línea
    console.log('Iniciando en línea para login...');
    
    // Reactivar conexión temporalmente para login
    await context.setOffline(false);
    
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[placeholder="ejemplo@correo.com"]', 'demo@cifrix.com');
    await page.fill('input[placeholder="••••••••"]', 'Demo123456!');
    await page.click('button:has-text("Ingresar al Sistema")');
    
    // Esperar onboarding
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));

    // Seleccionar organización
    const selectElement = await page.$('select#org-select');
    if (selectElement) {
      await selectElement.selectOption({ index: 4 });
      await page.click('button:has-text("Ingresar a la Organización")');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }
    
    await new Promise(r => setTimeout(r, 2000));

    // Ir al dashboard
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await new Promise(r => setTimeout(r, 2000));

    // Ahora activar modo offline
    console.log('Capturando: Modo Offline...');
    await context.setOffline(true);
    await new Promise(r => setTimeout(r, 1500));
    
    await page.screenshot({
      path: path.resolve(screenshotsDir, '07-offline.png'),
      fullPage: true
    });
    console.log('✅ 07-offline.png');

  } catch (error) {
    console.error('❌ Error capturando screenshot offline:', error.message);
  } finally {
    await browser.close();
  }
}

captureOfflineScreenshot().catch(console.error);
