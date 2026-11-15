import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("floating Callback and WhatsApp buttons are hidden at the top and visible after scrolling past the hero", async ({ page }) => {
    await page.goto("/");
    const fab = page.getByTestId("floating-actions");
    await expect(fab).toHaveAttribute("data-visible", "false");
    await expect(page.getByRole("button", { name: "Request a Callback" })).toBeHidden();

    await page.locator("#how-it-works").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(fab).toHaveAttribute("data-visible", "true");
    await expect(page.getByRole("button", { name: "Request a Callback" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Let's Chat on WhatsApp" })).toBeVisible();

    // hidden again while a modal is open
    await page.getByRole("button", { name: "Request a Callback" }).click();
    await expect(page.getByRole("dialog", { name: "Request a call back" })).toBeVisible();
    await expect(fab).toHaveAttribute("data-visible", "false");
  });

  test("About Us opens in a new tab", async ({ page, context }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    const [popup] = await Promise.all([context.waitForEvent("page"), nav.getByRole("link", { name: "About Us" }).click()]);
    await popup.waitForLoadState();
    await expect(popup).toHaveURL(/\/about$/);
    await expect(popup.getByRole("heading", { level: 1 })).toContainText("forex desk");
  });

  test("Contact Us and Store Locator scroll to their sections; logo returns to the top", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });

    await nav.getByRole("link", { name: "Contact Us" }).click();
    await expect(page.locator("#contact")).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

    await nav.getByRole("link", { name: "Store Locator" }).click();
    await expect(page.locator("#stores")).toBeInViewport();

    await page.getByRole("link", { name: "APM Forex home" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("reviews rows animate in opposite directions", async ({ page }) => {
    await page.goto("/");
    const rtl = page.getByTestId("reviews-row-rtl");
    const ltr = page.getByTestId("reviews-row-ltr");
    await expect(rtl).toBeAttached();
    expect(await rtl.evaluate((el) => getComputedStyle(el).animationName)).toBe("marquee-rtl");
    expect(await ltr.evaluate((el) => getComputedStyle(el).animationName)).toBe("marquee-ltr");
  });

  test("reviews marquee stops under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const rtl = page.getByTestId("reviews-row-rtl");
    await expect(rtl).toBeAttached();
    expect(await rtl.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    expect(await page.getByTestId("reviews-row-ltr").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    // falls back to horizontal scroll
    expect(await rtl.evaluate((el) => getComputedStyle(el.parentElement!).overflowX)).toBe("auto");
  });

  test("Nepal search in the country combobox shows the ELIG-2 note", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("country-combobox").click();
    await page.getByRole("textbox", { name: "Search country or currency" }).fill("Nepal");
    await expect(page.getByRole("status").filter({ hasText: "not released for travel to Nepal" })).toBeVisible();
  });

  test("contact form creates a callback request", async ({ page }) => {
    await page.goto("/#contact");
    const form = page.locator("#contact form");
    await form.getByLabel("Your name").fill("E2E Tester");
    await form.getByLabel("Mobile number").fill("9876543210");
    await form.getByLabel("Your question").fill("What is today's USD rate?");
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.locator("#contact").getByRole("status")).toContainText("Thank you");
  });
});

test.describe("inner pages", () => {
  test("buy and sell pages render rate tables; legal pages are marked draft", async ({ page }) => {
    await page.goto("/buy-forex");
    await expect(page.getByRole("heading", { name: "Today's rates to buy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy US Dollar" })).toBeVisible();
    await page.goto("/sell-forex");
    await expect(page.getByRole("heading", { name: "Today's buy-back rates" })).toBeVisible();
    for (const p of ["/privacy", "/terms", "/grievance"]) {
      await page.goto(p);
      await expect(page.getByText("Draft - to be reviewed.")).toBeVisible();
    }
  });

  test("public APIs respond", async ({ request }) => {
    expect((await (await request.get("/api/banners")).json()).banners.length).toBeGreaterThan(0);
    expect((await (await request.get("/api/stores")).json()).stores.length).toBeGreaterThan(0);
    const reviews = await (await request.get("/api/reviews")).json();
    expect(Array.isArray(reviews.reviews)).toBe(true);
    const bad = await request.post("/api/callbacks", { data: { name: "x", mobile: "123" } });
    expect(bad.status()).toBe(400);
  });
});
