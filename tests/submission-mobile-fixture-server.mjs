// Read-only, loopback-only records for submission-mobile-overview.browser.cjs.
import http from 'node:http';
import { createHash } from 'node:crypto';

const records = ['AG', 'DM', 'legacy', 'compact', 'large'].map((label, index) => ({
  label,
  token: `cleanup-fixture-${label}-`.padEnd(43, 'x'),
  submission: {
    submission_id: index < 3 ? `preview-test-${label}` : `demo8AG${index - 2}`,
    country_code: label === 'DM' ? 'DM' : 'AG',
    name: 'Regression fixture', email: 'fixture@example.test', phone: '+12685550123', address: {},
    preview_url: 'https://tally.so/forms/fixture/submissions/fixture/preview',
    submitted_at: '2026-10-10T13:10:00Z',
    monthly_kwh: label === 'legacy' ? null : label === 'large' ? 2000 : 300,
    consumption_profile: label === 'legacy' ? null : index < 3 ? 'night' : 'daytime',
  },
}));

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  let status = 200, data;
  if (request.method !== 'GET') { status = 405; data = { error: 'Read-only fixture' }; }
  else if (url.pathname === '/fixtures') data = records;
  else if (url.pathname === '/rest/v1/consultation_preview_tokens') {
    const record = records.find(record => createHash('sha256').update(record.token).digest('hex') === url.searchParams.get('token_hash')?.slice(3));
    data = record ? [{ tally_form_submissions: record.submission }] : [];
  } else if (url.pathname === '/rest/v1/quote_pricing_settings') {
    data = { id:1, version:1, inverter_5kw_usd:800, inverter_8kw_usd:1100, inverter_10kw_usd:1200, battery_5kwh_usd:600, panel_usd:100, price_multiplier:4, compensation_xcd:500, updated_at:'2026-10-12T00:00:00Z' };
  } else { status = 404; data = { error: 'Unmocked endpoint' }; }
  response.writeHead(status, { 'Content-Type':'application/json' });
  response.end(JSON.stringify(data));
}).listen(3196, '127.0.0.1', () => console.log('Mobile submission fixtures ready on 3196'));
