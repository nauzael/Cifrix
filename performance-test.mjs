import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, 'docs/plan/landing-page');

// Ensure output directory exists
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {}

const URL = process.env.TEST_URL || 'http://localhost:4173';

console.log('🚀 Starting performance tests for Cifrix Landing Page...');
console.log(`📍 Target URL: ${URL}`);

const results = {
  timestamp: new Date().toISOString(),
  url: URL,
  lighthouse: {
    performance: null,
    accessibility: null,
    seo: null,
    bestPractices: null
  },
  coreWebVitals: {
    lcp: null,
    cls: null,
    tbt: null
  },
  bundleSize: {
    jsTotal: 0,
    cssTotal: 0,
    totalWeight: 0
  },
  passed: {},
  opportunities: []
};

// Run Lighthouse via node module
import { lighthouse } from '@lhci/cli/src/collect/lighthouse.js';

async function runLighthouseTest() {
  console.log('\n📊 Running Lighthouse audit...');
  
  try {
    const { lhr } = await lighthouse(URL, {
      output: ['json'],
      chromeFlags: '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
      numberOfRuns: 3
    });
    
    results.lighthouse = {
      performance: lhr.categories.performance?.score * 100 || 0,
      accessibility: lhr.categories.accessibility?.score * 100 || 0,
      seo: lhr.categories.seo?.score * 100 || 0,
      bestPractices: lhr.categories['best-practices']?.score * 100 || 0
    };
    
    // Core Web Vitals
    results.coreWebVitals = {
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      si: lhr.audits['speed-index']?.numericValue || 0
    };
    
    // Bundle size from resource summary
    const resourceSummary = lhr.audits['resource-summary']?.details?.items || [];
    resourceSummary.forEach(item => {
      if (item.resourceType === 'Script') {
        results.bundleSize.jsTotal += item.transferSize || 0;
      } else if (item.resourceType === 'Stylesheet') {
        results.bundleSize.cssTotal += item.transferSize || 0;
      }
    });
    results.bundleSize.totalWeight = lhr.audits['total-byte-weight']?.numericValue || 0;
    
    // Check budgets
    const budgets = {
      performance: results.lighthouse.performance >= 90,
      accessibility: results.lighthouse.accessibility >= 90,
      seo: results.lighthouse.seo >= 90,
      bestPractices: results.lighthouse.bestPractices >= 90,
      lcp: results.coreWebVitals.lcp < 2500,
      cls: results.coreWebVitals.cls < 0.1,
      tbt: results.coreWebVitals.tbt < 200,
      jsSize: results.bundleSize.jsTotal < 150000,
      cssSize: results.bundleSize.cssTotal < 50000,
      totalWeight: results.bundleSize.totalWeight < 1000000
    };
    
    results.passed = budgets;
    
    // Generate opportunities
    const opportunities = [];
    if (!budgets.performance) opportunities.push('Performance score below 90 - optimize JavaScript execution and reduce main thread work');
    if (!budgets.jsSize) opportunities.push('JavaScript bundle too large - consider code splitting');
    if (!budgets.cssSize) opportunities.push('CSS bundle too large - remove unused styles');
    if (!budgets.lcp) opportunities.push('LCP too high - optimize largest contentful paint');
    if (!budgets.cls) opportunities.push('CLS too high - avoid layout shifts');
    
    results.opportunities = opportunities;
    
    console.log('✅ Lighthouse audit complete');
    console.log(`   Performance: ${results.lighthouse.performance}`);
    console.log(`   Accessibility: ${results.lighthouse.accessibility}`);
    console.log(`   SEO: ${results.lighthouse.seo}`);
    console.log(`   Best Practices: ${results.lighthouse.bestPractices}`);
    
  } catch (error) {
    console.error('❌ Lighthouse failed:', error.message);
    results.error = error.message;
  }
}

// Run the test
runLighthouseTest().then(() => {
  // Save results
  writeFileSync(join(OUTPUT_DIR, 'lighthouse-report.json'), JSON.stringify(results, null, 2));
  console.log(`\n✅ Report saved to ${OUTPUT_DIR}/lighthouse-report.json`);
}).catch(console.error);
