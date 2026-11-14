import { expect, test } from "@playwright/test";
import sharp from "sharp";

const img = (w: number, h: number) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 15, g: 118, b: 110 } } })
    .png()
    .toBuffer();

const adminBanners = async (request: import("@playwright/test").APIRequestContext) =>
  (await (await request.get("/api/admin/banners")).json()).banners as { id: string; alt: string; position: number; imagePath: string }[];

test.describe("Admin banners", () => {
  test("4:3 rejected, 16:9 added last, drag to top, delete", async ({ page, request }) => {
    await page.goto("/admin/banners");
    await page.waitForLoadState("networkidle");
    const list = page.getByTestId("banner-list").locator("li");
    const initialCount = await list.count();

    // 4:3 is rejected
    await page.getByRole("button", { name: "Add banner" }).click();
    let dlg = page.getByRole("dialog");
    await dlg.getByTestId("banner-file").setInputFiles({ name: "square.png", mimeType: "image/png", buffer: await img(1600, 1200) });
    await dlg.getByLabel("Alt text").fill("A 4:3 picture");
    await dlg.getByRole("button", { name: "Upload banner" }).click();
    await expect(dlg.getByText(/Banner must be 16:9/)).toBeVisible();
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await expect(list).toHaveCount(initialCount);

    // 16:9 is appended last
    await page.getByRole("button", { name: "Add banner" }).click();
    dlg = page.getByRole("dialog");
    await dlg.getByTestId("banner-file").setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: await img(1920, 1080) });
    await dlg.getByLabel("Alt text").fill("E2E wide banner");
    await dlg.getByRole("button", { name: "Upload banner" }).click();
    await expect(dlg).toBeHidden();
    await expect(list).toHaveCount(initialCount + 1);
    await expect(list.last()).toHaveAttribute("data-alt", "E2E wide banner");
    let server = await adminBanners(request);
    const added = server[server.length - 1];
    expect(added.alt).toBe("E2E wide banner");
    expect(added.imagePath).toMatch(/^\/media\/banners\//);
    const imgRes = await request.get(added.imagePath);
    expect(imgRes.headers()["content-type"]).toBe("image/webp");

    // keyboard drag to the top
    const handle = list.last().getByTestId("drag-handle");
    await handle.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    for (let i = 0; i < initialCount; i++) {
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(250);
    }
    await page.keyboard.press("Space");
    await expect(list.first()).toHaveAttribute("data-alt", "E2E wide banner");
    await expect(page.getByText("Banner order saved").first()).toBeVisible();
    server = await adminBanners(request);
    expect(server[0].id).toBe(added.id);
    expect(server[0].position).toBe(0);

    // delete
    await list.first().getByRole("button", { name: /Delete banner E2E wide banner/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(list).toHaveCount(initialCount);
    server = await adminBanners(request);
    expect(server.find((b) => b.id === added.id)).toBeUndefined();
  });
});
