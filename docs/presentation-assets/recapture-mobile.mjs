/**
 * Re-capture member phone screenshots after bottom-nav deploy.
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const MEMBER = "https://emeris-pulse-member.azurewebsites.net";
const PASSWORD = "Pulse123!";

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", name);
}

async function signIn(page, email) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForTimeout(2000);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

await page.goto(MEMBER, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1200);
await shot(page, "01-member-phone-login");
await signIn(page, "student@emeris.test");
await page.waitForSelector("text=Hello", { timeout: 30000 });
await page.waitForTimeout(2500);
await shot(page, "02-member-phone-home");

// Confirm bottom nav is present
const bottom = await page.locator(".ep-nav-bottom, nav.ep-nav-bottom, [class*='bottom']").count();
const navText = await page.locator("nav").first().innerText().catch(() => "");
console.log("nav snippet:", navText.slice(0, 120), "bottomHits", bottom);

await page.goto(`${MEMBER}/access`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
await shot(page, "03-member-phone-access");

await page.goto(`${MEMBER}/classes`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1000);
await shot(page, "04-member-phone-classes");

const more = page.getByRole("button", { name: /^More/i });
if (await more.count()) {
  await more.click();
  await page.waitForTimeout(500);
  await shot(page, "05-member-phone-more");
  // close sheet if close exists
  const close = page.getByRole("button", { name: /Close|Done/i });
  if (await close.count()) await close.first().click();
}

for (const [route, name] of [
  ["/equipment", "06-member-phone-equipment"],
  ["/challenges", "07-member-phone-challenges"],
  ["/notices", "08-member-phone-notifications"],
  ["/membership", "09-member-phone-membership"],
  ["/profile", "10-member-phone-profile"],
]) {
  await page.goto(`${MEMBER}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);
  await shot(page, name);
}

await page.getByRole("button", { name: /Sign out/i }).click().catch(async () => {
  const moreBtn = page.getByRole("button", { name: /^More/i });
  if (await moreBtn.count()) {
    await moreBtn.click();
    await page.getByRole("button", { name: /Sign out/i }).click();
  }
});
await page.waitForTimeout(1000);
await signIn(page, "pending@emeris.test");
await page.waitForTimeout(1500);
await page.goto(`${MEMBER}/membership`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(900);
await shot(page, "14-member-pending-membership");
await page.goto(`${MEMBER}/access`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1200);
await shot(page, "15-member-pending-access");

await page.getByRole("button", { name: /Sign out/i }).click().catch(async () => {
  const moreBtn = page.getByRole("button", { name: /^More/i });
  if (await moreBtn.count()) {
    await moreBtn.click();
    await page.getByRole("button", { name: /Sign out/i }).click();
  }
});
await page.waitForTimeout(800);
await signIn(page, "frozen@emeris.test");
await page.waitForTimeout(1500);
await page.goto(`${MEMBER}/membership`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(900);
await shot(page, "16-member-frozen-membership");

await browser.close();
console.log("mobile recapture done");
