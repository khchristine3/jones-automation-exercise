# Jones Automation — Exercise

Playwright automation of the contact form at https://test.netlify.app/

This is my first time working with Playwright, so the notes below explain the
choices I made and why, including the things I checked before deciding.

---

## Running it

```bash
npm install                        # installs Playwright, as listed in package.json
npx playwright install chromium    # downloads the browser itself
node automation.js
```

Requires Node 18 or newer.

The browser is a separate download from the library, which is why the second
command is needed. Building this from an empty folder was `npm init -y`, then
`npm install playwright`, then the same browser download.

The script opens a visible browser and slows each step down so the flow can be
watched. Set `HEADLESS = true` at the top of `automation.js` to run it without
a window.

**Files it produces:**

| File | When |
|---|---|
| `before-submit.png` | The filled form, before clicking submit |
| `thank-you.png` | The confirmation page, on success |
| `failure.png` | The page as it looked when something went wrong |

If something goes wrong, the script prints the error, saves `failure.png`, and
closes the browser.

I checked this works by temporarily changing one locator to a name that doesn't
exist on the page (`'Nmae'` instead of `'Name'`) and running the script. It
printed the error, saved the screenshot, and closed the browser as expected.
Doing this seemed worth the minute it took — otherwise I would only know the
script works when everything goes right, and not that it correctly reports a
problem when something goes wrong.

---

## How I approached it

I started by opening the page and looking at the form's HTML in the browser's
developer tools, then ran `npx playwright codegen` and clicked through the form
by hand to see what code Playwright would generate. That told me what the page
actually contains rather than what I assumed it contained, and it changed two
of my decisions along the way.

I kept the script to the flow described in the exercise. A few things I noticed
but left out are listed at the end.

---

## Choices I made

### Chromium only

I ran:

```bash
npx playwright install chromium
```

Running the same command without `chromium` at the end:

```bash
npx playwright install
```

downloads three browsers — Chromium, Firefox and WebKit. The script only ever
opens Chromium, so downloading the other two would be wasted time and disk
space.

I also used Playwright's own bundled Chromium rather than pointing it at the
Chrome installed on my machine. Playwright's version is fixed, so the script
behaves the same way every time, and it will run on a machine that has no
Chrome installed at all — which matters if someone else runs this.

### How I find the fields

I didn't decide this up front. I opened the form's HTML in the browser's
developer tools to see how the fields were built, then recorded myself filling
the form with `npx playwright codegen` to see what Playwright itself suggested.
Both pointed the same way, so that's what I used.

I ended up with `getByRole('textbox', { name: 'Name' })` for the text fields and
`getByLabel('Number of Employees')` for the dropdown. Both find an element by
the text on its visible label — the same thing a person reads to know which box
is which. The HTML confirmed this would work: every input has a proper
`<label for="...">` linked to its `id`.

The alternative would have been to use the fields' `id` or `name` attributes,
like `#email`. That works, but those are internal names invisible to users. If
a developer removed the visible label from a field, a test using `#email` would
still pass, even though a user would now see an unlabelled box. Using the label
text means the test fails when something changes for the user, which is what I
want it to notice.

**On the asterisk.** The labels read `Name *`, `Email *`, `Phone *`. Playwright
matches part of the text by default, so `'Name'` finds `Name *` without me
writing the asterisk. I left it out because the asterisk is a required-field
marker rather than part of the field's name, and it could be restyled without
the field itself changing.

**Why not `getByText`.** Recording the form with codegen showed the difference
clearly. Clicking the words `Email *` produced one locator, while clicking the
box and typing in it produced another:

```js
await page.getByText('Email *').click();                                   // clicked the label text
await page.getByRole('textbox', { name: 'Email *' }).click();              // clicked the box itself
await page.getByRole('textbox', { name: 'Email *' }).fill('a@gmail.com');  // typed in the box
```

The label and the box are two different elements, and only the box can be typed
into. So `getByRole` is the one that matches what I need to do. `getByText` is
useful when the text itself is the thing being checked, which is how the script
uses it at the end to confirm the thank-you page appeared.

### The Number of Employees dropdown

This one looked unusual at first. The visible dropdown is a styled `<div>`, but
inside it there is a normal `<select>` — so Playwright's `selectOption()` works
on it directly.

A dropdown option can have a hidden value that differs from what's shown on
screen. That would look like this:

```html
<option value="3">51-500</option>
```

The user reads `51-500`, but `3` is what gets sent to the server. Playwright can
pick an option either way — by the hidden value or by the visible text.

On this page the options are written without a hidden value:

```html
<option>51-500</option>
```

so there is nothing to send except the visible text. That means these two lines
do exactly the same thing here:

```js
await page.getByLabel('Number of Employees').selectOption('51-500');              // by hidden value
await page.getByLabel('Number of Employees').selectOption({ label: '51-500' });   // by visible text
```

I used the second one, because that's how the exercise describes the task —
change it from `1-10` to `51-500`, which is what the user reads on screen.

The styled wrapper keeps its own copy of the current choice in a `data-value`
attribute. After changing the selection I check that this matches, so the
selected value and what's displayed on screen can't disagree.

### Logging the thank-you page

The exercise asks for a `console.log` when reaching the thank-you page. If I
just logged straight after clicking submit, the message would print whether or
not the form actually went through, which would make it meaningless.

So the script waits for the "Thank You!" heading on the confirmation page. If
the submission fails, the wait times out and the script reports an error instead
of printing a success message.

I confirmed the exact heading by recording the form with codegen and using its
assertion tool on the success page, rather than guessing what the page says.

### Small structural choices

- The values typed into the form are in a `formData` object at the top, so they
  are easy to change without touching the rest of the script.
- The browser is closed in a `finally` block, so it still closes if something
  fails partway through.
- If there is an error, the script saves a screenshot of the page at that
  moment, which makes it much easier to see what went wrong. In the `'Nmae'`
  test above, the screenshot showed the form with the Name field still empty,
  which pointed straight at the step that failed.

---

## A problem I found

### The Website field rejects the format its own placeholder suggests

I found this while clicking through the form by hand. Rather than only using the
tidy example values from my script, I tried entering the website the way a real
customer would — `1.com` rather than `https://1.com`, since most people don't
type the `https://` part. That's when the form refused to submit.

**Steps to reproduce**

1. Open https://test.netlify.app/
2. Fill Name, Email and Phone with valid values
3. Type `1.com` in the Website field — the same format shown by the field's own
   placeholder, `example.com`
4. Click "Request a call back"

**Expected:** The form submits. The only guidance the user has is the
placeholder shown inside the field, `example.com`, which is a website written
without `https://`. Entering a website in that same format should be accepted.

**Actual:** The form is blocked with a browser error asking for a valid URL.
Typing `https://1.com` works.

**Why it happens:** The field is `type="url"`, which requires `https://` at the
start, but its placeholder shows an example without it. So the hint teaches the
user a format the field will reject.

**Why it matters:** Website is an optional field, but the check still applies
once something is typed in it. So a user gets blocked for filling in a field
they didn't have to fill in, with no clear explanation. On a form whose purpose
is collecting leads, they may give up or clear the field, and the company loses
the lead either way.

**Suggested fix:** Add `https://` automatically when the user doesn't type it,
so the form just accepts `1.com`. Changing the placeholder to
`https://example.com` would at least stop the form contradicting itself, but it
puts the work back on the user.

---

## Other things I noticed

**Required fields are marked correctly.** This is something I checked rather
than a problem I found. Name, Email and Phone each have both the `required`
attribute and an asterisk in the label. Company and Website have neither, so
the two match up throughout.

It was worth checking because these can disagree: an asterisk with no
`required` would tell the user a field is mandatory while nothing actually
stops them submitting it empty, and `required` with no asterisk would block
them on a field that nothing warned them about. Neither happens here.

---

## What I left out

The exercise describes one path through the form, so that's what the script
covers. With more time, the first things I would add are tests for what happens
when the form is used incorrectly:

- Submitting with a required field empty, and checking it is actually blocked
- An invalid email address, like `abc`
- A required field containing only spaces — `required` accepts that, since the
  field isn't technically empty
- Clicking submit twice quickly, to check it doesn't send two requests
