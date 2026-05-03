import { lighthouse } from '@lhci/cli/src/collect/lighthouse.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = 'docs/plan/landing-page';
const URL = 'http://localhost:4173';

// Ensure output directory exists
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {}

async function runPerformanceTest() {
  console.log('🚀 Starting performance tests for Cifrix Landing Page...');
  console.log(`📍 Target URL: ${URL}`);
  
  const results = {
    timestamp: new Date().toISOString(),
    url: URL,
    runs: []
  };
  
  // Run 3 times and average
  for (let i = 1; i <= 3; i++) {
    console.log(`\n📊 Run ${i}/3...`);
    try {
      const { lhr } = await lighthouse(URL, {
        output: ['json'],
        outputPath: join(OUTPUT_DIR, `lighthouse-run-${i}.json`),
        chromeFlags: '--headless --no-sandbox --disable-gpu',
        numberOfRuns: 1
      });
      
      results.runs.push({
        run: i,
        performance: lhr.categories.performance?.score * 100 || 0,
        accessibility: lhr.categories.accessibility?.score * 100 || 0,
        seo: lhr.categories.seo?.score * 100 || 0,
        bestPractices: lhr.categories['best-practices']?.score * 100 || 0,
        lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
        cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
        fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
        si: lhr.audits['speed-index']?.numericValue || 0,
        tti: lhr.audits['interactive']?.numericValue || 0,
        jsSize: lhr.audits['resource-summary']?.details?.items?.find(i => i.resourceType === 'Script')?.transferSize || 0,
        cssSize: lhr.audits['resource-summary']?.details?.items?.find(i => i.resourceType === 'Stylesheet')?.transferSize || 0,
        totalSize: lhr.audits['total-byte-weight']?.numericValue || 0,
        raw: lhr
      });
      
      console.log(`   Performance: ${results.runs[results.runs.length - 1].performance}`);
      console.log(`   Accessibility: ${results.runs[results.runs.length - 1].accessibility}`);
      console.log(`   SEO: ${results.runs[results.runs.length - 1].seo}`);
      console.log(`   Best Practices: ${results.runs[results.runs.length - 1].bestPractices}`);
    } catch (error) {
      console.error(`❌ Run ${i} failed:`, error.message);
      results.runs.push({ run: i, error: error.message });
    }
  }
  
  // Calculate averages
  const validRuns = results.runs.filter(r => !r.error);
  if (validRuns.length > 0) {
    const avg = {
      performance: validRuns.reduce((s, r) => s + r.performance, 0) / validRuns.length,
      accessibility: validRuns.reduce((s, r) => s + r.accessibility, 0) / validRuns.length,
      seo: validRuns.reduce((s, r) => s + r.seo, 0) / validRuns.length,
      bestPractices: validRuns.reduce((s, r) => s + r.bestPractices, 0) / validRuns.length,
      lcp: validRuns.reduce((s, r) => s + r.lcp, 0) / validRuns.length,
      cls: validRuns.reduce((s, r) => s + r.cls, 0) / validRuns.length,
      tbt: validRuns.reduce((s, r) => s + r.tbt, 0) / validRuns.length,
    };
    
    results.average = avg;
    results.passed = {
      performance: avg.performance >= 90,
      accessibility: avg.accessibility >= 90,
      seo: avg.seo >= 90,
      bestPractices: avg.bestPractices >= 90,
      lcp: avg.lcp < 2500,
      cls: avg.cls < 0.1,
      tbt: avg.tbt < 200,
    };
  }
  
  // Save results
  writeFileSync(join(OUTPUT_DIR, 'performance-results.json'), JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${OUTPUT_DIR}/performance-results.json`);
  
  return results;
}

runPerformanceTest().catch(console.error);
