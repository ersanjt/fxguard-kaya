/**
 * One-shot Play Console filler for Kaya Staff store settings + listing.
 * Does not send for production review.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..', '..');
const listing = 'C:\\Users\\ersan\\Desktop\\Kaya-Play-Listing';
const shots = path.join(process.env.TEMP || '.', 'kaya-play-shots');
fs.mkdirSync(shots, { recursive: true });

const DEV = '6197823596632672611';
const APP = '4973017204243165858';
const BASE = `https://play.google.com/console/u/0/developers/${DEV}/app/${APP}`;
const DASH = `${BASE}/app-dashboard`;

const TITLE = 'Kaya Staff';
const SHORT_EN = fs.readFileSync(path.join(listing, 'short-en.txt'), 'utf8').trim();
const FULL_EN = fs.readFileSync(path.join(listing, 'full-en.txt'), 'utf8').trim();
const SHORT_FA = fs.readFileSync(path.join(listing, 'short-fa.txt'), 'utf8').trim();
const FULL_FA = fs.readFileSync(path.join(listing, 'full-fa.txt'), 'utf8').trim();
const SHORT_TR = fs.readFileSync(path.join(listing, 'short-tr.txt'), 'utf8').trim();
const FULL_TR = fs.readFileSync(path.join(listing, 'full-tr.txt'), 'utf8').trim();

const ICON = path.join(listing, 'icon-512.png');
const FEATURE = path.join(listing, 'featureGraphic.png');
const SHOTS = [
  path.join(listing, 'screen-01-dashboard.png'),
  path.join(listing, 'screen-02-inbox.png'),
  path.join(listing, 'screen-03-customers.png'),
];

const EMAIL = 'support@kaya.fxguard.io';
const PHONE = '+905010676486';
const WEB = 'https://kaya.fxguard.io';
const PRIVACY = 'https://kaya.fxguard.io/privacy';

function log(msg) {
  console.log(`[play] ${msg}`);
}

async function shot(page, name) {
  const p = path.join(shots, name);
  await page.screenshot({ path: p, fullPage: false });
  log(`shot ${p}`);
}

async function clickText(page, text, timeout = 8000) {
  const loc = page.getByText(text, { exact: true }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.click({ timeout });
  return true;
}

async function clickRole(page, role, name, timeout = 12000) {
  const loc = page.getByRole(role, { name });
  await loc.first().waitFor({ state: 'visible', timeout });
  await loc.first().click({ timeout });
}

async function fillFirstVisible(page, selectors, value) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try {
        if (await loc.isVisible()) {
          await loc.fill(value);
          return sel;
        }
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

async function dismissOverview(page) {
  try {
    const notNow = page.getByRole('button', { name: 'Not now' });
    if (await notNow.isVisible({ timeout: 2500 })) {
      await notNow.click();
      log('dismissed publishing overview');
    }
  } catch {
    /* none */
  }
}

async function saveForm(page) {
  const save = page.getByRole('button', { name: /^Save$/ }).first();
  if (await save.count()) {
    const disabled = await save.isDisabled().catch(() => false);
    if (!disabled) {
      await save.click();
      log('clicked Save');
      await page.waitForTimeout(1800);
      await dismissOverview(page);
      return true;
    }
  }
  const more = page.getByRole('button', { name: 'More options' });
  if (await more.count()) {
    await more.last().click();
    await page.waitForTimeout(400);
    const item = page.getByRole('menuitem', { name: /^Save$/ });
    if (await item.count()) {
      await item.click();
      log('clicked Save via overflow');
      await page.waitForTimeout(1800);
      await dismissOverview(page);
      return true;
    }
  }
  log('Save not found');
  return false;
}

async function waitForConsole(page) {
  log('waiting for Play Console (sign in if the Google page appears)');
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const url = page.url();
    const title = await page.title().catch(() => '');
    if (/accounts\.google\.com|signin/i.test(url) || /Sign in/i.test(title)) {
      await page.waitForTimeout(2000);
      continue;
    }
    if (/play\.google\.com\/console/.test(url) && /Kaya Staff|Dashboard|Play Console/.test(title)) {
      if (await page.getByText('Kaya Staff').count()) {
        log(`console ready: ${title} ${url}`);
        return true;
      }
    }
    await page.waitForTimeout(1500);
  }
  return false;
}

async function fillCategory(page) {
  log('open category / contact');
  await page.goto(DASH, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2800);
  await shot(page, '01-dashboard.png');

  const task = page.getByRole('button', { name: /Select an app category and provide contact details/i });
  if (await task.count()) {
    await task.first().click();
  } else {
    await page.goto(`${BASE}/app-content/store-settings`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(2500);
  await shot(page, '02-category.png');

  // Category combobox / select
  const combo = page.getByRole('combobox').first();
  if (await combo.count()) {
    await combo.click();
    await page.waitForTimeout(500);
    const business = page.getByRole('option', { name: /^Business$/i }).first();
    if (await business.count()) {
      await business.click();
      log('selected Business');
    } else {
      await page.getByText('Business', { exact: true }).first().click().catch(() => {});
    }
  } else {
    try {
      await clickText(page, 'Business');
    } catch {
      log('Business option not clicked yet');
    }
  }

  // Optional tag Productivity
  try {
    const tags = page.getByLabel(/tag/i).or(page.getByPlaceholder(/tag/i));
    if (await tags.count()) {
      await tags.first().click();
      await tags.first().fill('Productivity');
      await page.keyboard.press('Enter');
    }
  } catch {
    /* optional */
  }

  const emailFilled = await fillFirstVisible(page, [
    'input[type="email"]',
    'input[aria-label*="email" i]',
    'input[aria-label*="Email" i]',
  ], EMAIL);
  const phoneFilled = await fillFirstVisible(page, [
    'input[type="tel"]',
    'input[aria-label*="phone" i]',
    'input[aria-label*="Phone" i]',
  ], PHONE);
  const webFilled = await fillFirstVisible(page, [
    'input[type="url"]',
    'input[aria-label*="website" i]',
    'input[aria-label*="Website" i]',
  ], WEB);

  log(`contact fields email=${emailFilled} phone=${phoneFilled} web=${webFilled}`);

  // Fallback: fill by nearby label
  const labels = ['Email address', 'Email', 'Phone number', 'Phone', 'Website'];
  for (const label of labels) {
    const field = page.getByLabel(label, { exact: false }).first();
    if (await field.count()) {
      const val = /email/i.test(label) ? EMAIL : /phone/i.test(label) ? PHONE : WEB;
      try {
        await field.fill(val);
        log(`filled label ${label}`);
      } catch {
        /* ignore */
      }
    }
  }

  await shot(page, '03-category-filled.png');
  await saveForm(page);
  await page.waitForTimeout(1500);
  await shot(page, '04-category-saved.png');
}

async function uploadIfPresent(page, input, files) {
  if (!(await input.count())) return false;
  const existing = files.filter((f) => fs.existsSync(f));
  if (!existing.length) return false;
  await input.setInputFiles(existing);
  log(`uploaded ${existing.length} file(s)`);
  await page.waitForTimeout(1500);
  return true;
}

async function fillListing(page) {
  log('open store listing');
  await page.goto(DASH, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const task = page.getByRole('button', { name: /Set up your store listing/i });
  if (await task.count()) {
    await task.first().click();
  } else {
    await page.goto(`${BASE}/main-store-listing`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(2800);
  await shot(page, '05-listing.png');

  const titleBox = page.getByLabel(/App name|Title/i).first();
  if (await titleBox.count()) {
    await titleBox.fill(TITLE);
  } else {
    const tb = page.locator('input').filter({ hasText: '' }).first();
    await page.locator('input[maxlength="50"], input[aria-label*="name" i]').first().fill(TITLE).catch(() => {});
  }

  const shortBox = page.getByLabel(/Short description/i).first();
  if (await shortBox.count()) await shortBox.fill(SHORT_EN);
  else await page.locator('textarea').nth(0).fill(SHORT_EN).catch(() => {});

  const fullBox = page.getByLabel(/Full description/i).first();
  if (await fullBox.count()) await fullBox.fill(FULL_EN);
  else await page.locator('textarea').nth(1).fill(FULL_EN).catch(() => {});

  // Privacy sometimes lives here too
  const priv = page.getByLabel(/Privacy policy/i).first();
  if (await priv.count()) {
    await priv.fill(PRIVACY).catch(() => {});
  }

  await shot(page, '06-listing-text.png');

  const fileInputs = page.locator('input[type="file"]');
  const n = await fileInputs.count();
  log(`file inputs: ${n}`);
  for (let i = 0; i < n; i++) {
    const input = fileInputs.nth(i);
    const acc = ((await input.getAttribute('accept')) || '') + ' ' + ((await input.getAttribute('aria-label')) || '');
    const name = ((await input.getAttribute('name')) || '') + acc;
    log(`file input ${i}: ${name.slice(0, 120)}`);
    if (/icon/i.test(name)) await uploadIfPresent(page, input, [ICON]);
    else if (/feature|graphic|banner/i.test(name)) await uploadIfPresent(page, input, [FEATURE]);
    else if (/phone|screenshot|tablet/i.test(name)) await uploadIfPresent(page, input, SHOTS);
  }

  // If inputs have no useful names, map by order: icon, feature, phone screenshots
  if (n >= 1) {
    const acc0 = (await fileInputs.nth(0).getAttribute('accept')) || '';
    if (!/icon|feature|phone/i.test(acc0)) {
      await uploadIfPresent(page, fileInputs.nth(0), [ICON]);
      if (n >= 2) await uploadIfPresent(page, fileInputs.nth(1), [FEATURE]);
      if (n >= 3) await uploadIfPresent(page, fileInputs.nth(2), SHOTS);
    }
  }

  await shot(page, '07-listing-assets.png');
  await saveForm(page);
  await page.waitForTimeout(2000);
  await shot(page, '08-listing-saved.png');
}

async function main() {
  const userDataDir = path.join(process.env.TEMP || '.', 'kaya-play-chrome-empty');
  fs.mkdirSync(userDataDir, { recursive: true });
  log(`userDataDir ${userDataDir}`);

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 960 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(DASH, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const ok = await waitForConsole(page);
  if (!ok) {
    await shot(page, '00-login-timeout.png');
    throw new Error('Play Console did not become ready. Sign in in the opened Chrome window and re-run.');
  }
  await fillCategory(page);
  await fillListing(page);
  await page.goto(DASH, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await shot(page, '09-dashboard-final.png');
  log('done — not sent for production');
  await context.close();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});
