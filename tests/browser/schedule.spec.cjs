const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const presets = JSON.parse(fs.readFileSync('supabase/migrations/202610070002_semester_catalog.sql', 'utf8').match(/'26W', '(\{"iurii"[^\n]+)'::jsonb/)[1]);

async function fakeAccount(page, owner = false) {
  await page.route('**/auth-config.js', route => route.fulfill({ contentType: 'text/javascript', body:
    "window.WU_AUTH_CONFIG = {supabaseUrl:'https://demo.supabase.co',supabasePublishableKey:'sb_publishable_example',semesterCode:'26W'};" }));
  await page.route('**/vendor/supabase.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.__remote = {is_owner:${owner},presets:${JSON.stringify(owner ? presets : {})},plan:null};
    window.__requests=[];
    window.supabase = {createClient(){
      let callback, signedIn=true;
      const user={id:'test-user',email:'test@example.com',user_metadata:{full_name:'Test Person'}};
      return {auth:{
        async getSession(){return {data:{session:signedIn?{user}:null}}},
        async getUser(){return {data:{user}}},
        onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}}},
        async exchangeCodeForSession(code){window.__requests.push({code});return {}},
        async signInWithOAuth(options){window.__requests.push(options);return {}},
        async signOut(){signedIn=false;callback('SIGNED_OUT');return {}}
      },async rpc(name,args){
        window.__requests.push({name,args});
        if(name==='get_schedule_context')return {data:structuredClone(window.__remote)};
        const revision=window.__remote.plan?.revision||0;
        if(args.p_expected_revision!==revision)return {error:{code:'40001'}};
        window.__remote.plan={selected_course_ids:args.p_course_ids,profile:args.p_profile,revision:revision+1};
        return {data:structuredClone(window.__remote.plan)};
      }};
    }};` }));
}

test('unconfigured app supports a guest plan and keeps personal presets hidden', async ({ page }) => {
  await page.route('**/auth-config.js', route => route.fulfill({ contentType: 'text/javascript', body:
    "window.WU_AUTH_CONFIG = {supabaseUrl:'',supabasePublishableKey:'',semesterCode:'26W'};" }));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/index.html#settings');
  await expect(page.locator('#profile-grid')).toContainText('My schedule');
  await expect(page.locator('#profile-select')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  await page.locator('.course-checkbox[value="Data Management"]').check();
  await page.locator('.group-button[data-course="Data Management"][data-group="B"]').click();
  await page.reload();
  await expect(page.locator('.course-checkbox[value="Data Management"]')).toBeChecked();
  await expect(page.locator('.group-button[data-course="Data Management"][data-group="B"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.course-checkbox[value="Foundations of Digital Economy"]')).toBeDisabled();
  await page.screenshot({ path: 'test-results/guest-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('ordinary accounts edit and sync their own courses without owner profiles', async ({ page }) => {
  await fakeAccount(page);
  await page.goto('/index.html#settings');
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
  await expect(page.locator('#profile-grid')).not.toContainText('Iurii');
  await page.locator('.course-checkbox[value="Data Management"]').check();
  await page.locator('.group-button[data-course="Data Management"][data-group="B"]').click();
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
  expect(await page.evaluate(() => window.__remote.plan.selected_course_ids)).toContain('2463');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#account-title')).toHaveText('Your account');
  await expect(page.locator('.course-checkbox[value="Data Management"]')).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('wu-schedule-account-v2:test-user:26W'))).toBeNull();
});

test('owner retains Iurii, Anna and Both with correct courses and separate totals', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await fakeAccount(page, true);
  await page.goto('/index.html#settings');
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
  await expect(page.locator('#profile-select')).toBeVisible();
  await expect(page.locator('#profile-select option')).toHaveText(['Iurii', 'Anna', 'Both', 'Custom']);
  await page.locator('#profile-select').selectOption('both');
  await expect(page.locator('.course-checkbox[value="Data Management"]')).toBeChecked();
  await expect(page.locator('.group-button[data-course="Digital Markets and Strategies"][data-group="A"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.group-button[data-course="Digital Markets and Strategies"][data-group="B"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.desktop-nav [data-view-button="planner"]').click();
  await expect(page.locator('#planner-metrics')).toContainText('Iurii');
  await expect(page.locator('#planner-metrics')).toContainText('Anna');
  await expect(page.locator('#planner-metrics')).toContainText('24 ECTS');
  await page.screenshot({ path: 'test-results/owner-planner-desktop.png', fullPage: true });
  await page.locator('.desktop-nav [data-view-button="settings"]').click();
  await expect(page.locator('.course-checkbox[value="Data Management"]')).toBeDisabled();
  await page.locator('#profile-select').selectOption('custom');
  await expect(page.locator('.course-checkbox[value="Data Management"]')).toBeEnabled();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('#profile-select')).toBeHidden();
  await expect(page.locator('#profile-grid')).not.toContainText('Iurii');
  expect(errors).toEqual([]);
});

test('mobile Google callback is consumed before tab navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeAccount(page, true);
  await page.goto('/index.html?code=google-code#settings');
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
  await expect(page).toHaveURL(/index\.html#settings$/);
  expect(await page.evaluate(() => window.__requests.some(item => item.code === 'google-code'))).toBe(true);
  await page.locator('#profile-select').selectOption('both');
  await page.locator('.bottom-nav [data-view-button="planner"]').click();
  await expect(page.locator('#planner-view')).not.toHaveAttribute('aria-hidden');
  await expect.poll(() => page.evaluate(() => Math.abs(document.querySelector('#app-main').scrollLeft - document.querySelector('#app-main').clientWidth))).toBeLessThan(1);
  await page.screenshot({ path: 'test-results/owner-planner-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('a cloud conflict offers explicit choices instead of overwriting another device', async ({ page }) => {
  await fakeAccount(page);
  await page.goto('/index.html#settings');
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
  await page.evaluate(() => { window.__remote.plan.revision = 7; });
  await page.locator('.course-checkbox[value="Data Management"]').check();
  await expect(page.getByRole('button', { name: 'Use cloud schedule', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use cloud schedule', exact: true }).click();
  await expect(page.locator('.course-checkbox[value="Data Management"]')).not.toBeChecked();
  await expect(page.locator('#save-status')).toHaveText('Saved to your account');
});

test('the real Supabase SDK starts Google OAuth with a PKCE challenge', async ({ page }) => {
  await page.route('**/auth-config.js', route => route.fulfill({ contentType: 'text/javascript', body:
    "window.WU_AUTH_CONFIG = {supabaseUrl:'https://demo.supabase.co',supabasePublishableKey:'sb_publishable_example',semesterCode:'26W'};" }));
  await page.route('https://demo.supabase.co/auth/v1/authorize?**', route => route.fulfill({ contentType: 'text/html', body: 'OAuth request captured' }));
  await page.goto('/index.html#settings');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/demo\.supabase\.co\/auth\/v1\/authorize/);
  const url = new URL(page.url());
  expect(url.searchParams.get('provider')).toBe('google');
  expect(url.searchParams.get('code_challenge_method')).toBe('s256');
  expect(url.searchParams.get('code_challenge')).toBeTruthy();
  expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173/index.html');
});
