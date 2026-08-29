/**
 * Jones Automation - Exercise
 * Automates the contact form on https://test.netlify.app/
 *
 * Run with:  node automation.js
 */

const { chromium } = require('playwright');

// Watch it run (false) or run invisibly (true).
const HEADLESS = false;
const SITE_URL = 'https://test.netlify.app/';

// Test data kept separate from the flow, so the "what" is easy to change
// without touching the "how".
const formData = {
  name: 'Dana Levi',
  email: 'dana.levi@example.com',
  phone: '0501234567',
  company: 'Acme QA Ltd',
  website: 'https://example.com',
  employees: '51-500',
};

(async () => {
  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: HEADLESS ? 0 : 1000, // slows each action so it's watchable
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // --- 1. Open the page -------------------------------------------------
    await page.goto(SITE_URL);

    // --- 2. Fill the text fields ------------------------------------------
    // Fields are found by the text on their visible label, which is how a
    // person identifies which box is which.
    //
    // The labels on this form read "Name *", "Email *" and so on. Playwright
    // matches part of the text by default, so 'Email' finds "Email *" without
    // writing the asterisk, which is only a required-field marker.
    await page.getByRole('textbox', { name: 'Name' }).fill(formData.name);
    await page.getByRole('textbox', { name: 'Email' }).fill(formData.email);
    await page.getByRole('textbox', { name: 'Phone' }).fill(formData.phone);
    await page.getByRole('textbox', { name: 'Company' }).fill(formData.company);
    await page.getByRole('textbox', { name: 'Website' }).fill(formData.website);

    // --- 3. Bonus: change Number of Employees to 51-500 -------------------
    // { label: ... } picks the option by the text shown on screen, which is
    // how the exercise describes the change.
    await page
      .getByLabel('Number of Employees')
      .selectOption({ label: formData.employees });

    // The real <select> sits inside a styled wrapper that mirrors the choice
    // in data-value. Check the wrapper shows the same value, so what's
    // selected and what's displayed on screen can't disagree.
    const wrapperValue = await page
      .locator('.select-wrapper')
      .getAttribute('data-value');

    if (wrapperValue !== formData.employees) {
      throw new Error(
        `Dropdown did not update on screen: expected "${formData.employees}", ` +
          `wrapper shows "${wrapperValue}"`
      );
    }

    // --- 4. Screenshot BEFORE submitting ----------------------------------
    // fullPage captures the whole page, not just the part currently on screen.
    await page.screenshot({ path: 'before-submit.png', fullPage: true });
    console.log('Screenshot saved to before-submit.png');

    // --- 5. Submit ---------------------------------------------------------
    // The exact button text, confirmed by recording the form with codegen.
    await page.getByRole('button', { name: 'Request a call back' }).click();

    // --- 6. Confirm we actually reached the thank you page ---------------
    // This has to be a real wait, not just a console.log: if the submission
    // fails, the script should fail too rather than printing a success
    // message. waitFor() throws an error if the heading never appears.
    await page
      .getByRole('heading', { name: 'Thank You!' })
      .waitFor({ timeout: 10000 });

    console.log('Reached the thank you page');
    console.log('URL:', page.url());

    await page.screenshot({ path: 'thank-you.png', fullPage: true });
  } catch (error) {
    console.error('Automation failed:', error.message);
    // A screenshot of the page at this moment shows what went wrong.
    await page.screenshot({ path: 'failure.png', fullPage: true });
    process.exitCode = 1;
  } finally {
    // Always close the browser, even if something failed partway through.
    await browser.close();
  }
})();