import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(here, 'index.html');

if (!fs.existsSync(pagePath)) {
  console.error(`FAIL missing ${pagePath}`);
  process.exit(1);
}

const html = fs.readFileSync(pagePath, 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(html.includes('<title>核心指标拆解分析</title>'), 'document title');
expect(!/https?:\/\//i.test(html), 'no external assets or URLs');

const dataMatch = html.match(
  /<script\s+type="application\/json"\s+id="metrics-data">([\s\S]*?)<\/script>/,
);
expect(Boolean(dataMatch), 'metrics-data JSON block');

let data;
if (dataMatch) {
  try {
    data = JSON.parse(dataMatch[1]);
  } catch (error) {
    failures.push(`valid metrics JSON: ${error.message}`);
  }
}

const expectedSummaries = {
  income: ['收入', '1,958,717.67', '+42,818.10', 'positive'],
  revenue: ['营业额', '3,928,696.85', '+87,872.15', 'positive'],
  takeRate: ['到手率', '49.86%', '-0.02个百分点', 'negative'],
  avgPrice: ['客单价（原价）', '37.95', '+0.25', 'positive'],
  orders: ['有效订单', '103,530', '+1,653', 'positive'],
};

const expectedPlatforms = {
  yellow: {
    label: '黄色平台',
    marker: 'rabbit',
    metrics: {
      takeRate: ['50.50%', '-0.07个百分点', 'negative', null],
      avgPrice: ['38.64', '+0.26', 'positive', null],
      orders: ['56,594', '+1,206', 'positive', null],
      repeatOrders: ['1.03', '持平', 'neutral', null],
      orderUsers: ['54,920', '+1,253', 'positive', null],
      orderRate: ['21.31%', '-0.10个百分点', 'negative', null],
      visitors: ['257,685', '+7,031', 'positive', null],
      visitRate: ['6.42%', '+0.02个百分点', 'positive', null],
      exposure: ['4,014,621', '+99,232', 'positive', null],
    },
  },
  taobao: {
    label: '淘宝闪购',
    marker: 'square',
    metrics: {
      takeRate: ['49.51%', '持平', 'neutral', null],
      avgPrice: ['37.93', '+0.14', 'positive', null],
      orders: ['36,682', '+690', 'positive', null],
      repeatOrders: ['1.03', '持平', 'neutral', null],
      orderUsers: ['35,648', '+622', 'positive', null],
      orderRate: ['16.46%', '+0.08个百分点', 'positive', null],
      visitors: ['216,524', '+2,628', 'positive', null],
      visitRate: ['6.15%', '-0.13个百分点', 'negative', null],
      exposure: ['3,518,181', '+114,888', 'positive', '上升明显'],
    },
  },
  red: {
    label: '红色平台',
    marker: 'circle',
    metrics: {
      takeRate: ['47.20%', '+0.01个百分点', 'positive', '上升明显'],
      avgPrice: ['34.22', '+0.40', 'positive', null],
      orders: ['10,254', '-243', 'negative', null],
      repeatOrders: ['-', '-', 'neutral', null],
      orderUsers: ['-', '-', 'neutral', null],
      orderRate: ['-', '-', 'neutral', null],
      visitors: ['-', '-', 'neutral', null],
      visitRate: ['-', '-', 'neutral', null],
      exposure: ['-', '-', 'neutral', null],
    },
  },
};

if (data) {
  expect(JSON.stringify(data.summaries) === JSON.stringify(expectedSummaries), 'canonical summary matrix');
  expect(JSON.stringify(Object.keys(data.platforms)) === JSON.stringify(['yellow', 'taobao', 'red']), 'fixed platform order');
  expect(JSON.stringify(data.platforms) === JSON.stringify(expectedPlatforms), 'canonical platform matrix');
}

const cssValues = [
  '#f7f8fa', '#ffffff', '#fbfbfc', '#1f2329', '#646a73', '#8f959e',
  '#e64a4f', '#5b9b45', '#ffd400', '#ff6a00', '#ef3f2d', '#f56c78', '#dfe3e8',
];
for (const value of cssValues) expect(html.includes(value), `CSS value ${value}`);

expect(html.includes('@media (max-width: 1439px)'), '1439px responsive rule');
expect(html.includes('@media (max-width: 899px)'), '899px responsive rule');
expect(html.includes('data-platform='), 'rendered platform data attributes');
expect(html.includes('data-summary-id='), 'rendered summary data attributes');
expect(html.includes('platform-mark rabbit'), 'yellow rabbit marker');
expect(html.includes('platform-mark square'), 'orange square marker');
expect(html.includes('platform-mark circle'), 'red circle marker');
expect(html.includes('class="tree-connectors root-connectors"'), 'desktop tree connector layer');
expect(html.includes('对比差值'), 'delta prefix');

const summaries = data ? Object.keys(data.summaries).length : 0;
const platformMetrics = data
  ? Object.values(data.platforms).reduce((count, platform) => count + Object.keys(platform.metrics).length, 0)
  : 0;
const badges = data
  ? Object.values(data.platforms).reduce(
      (count, platform) => count + Object.values(platform.metrics).filter((metric) => metric[3]).length,
      0,
    )
  : 0;
const redPlaceholders = data
  ? ['repeatOrders', 'orderUsers', 'orderRate', 'visitors', 'visitRate', 'exposure']
      .filter((key) => data.platforms.red.metrics[key][0] === '-' && data.platforms.red.metrics[key][1] === '-').length
  : 0;

expect(summaries === 5, 'exactly 5 summary metrics');
expect(platformMetrics === 27, 'exactly 27 platform metric entries');
expect(badges === 2, 'exactly 2 badges');
expect(redPlaceholders === 6, 'exactly 6 red downstream placeholders');

if (failures.length) {
  console.error(`FAIL ${failures.length} check(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `PASS summaries=${summaries} platformMetrics=${platformMetrics} badges=${badges} redPlaceholders=${redPlaceholders} externalAssets=0`,
);
