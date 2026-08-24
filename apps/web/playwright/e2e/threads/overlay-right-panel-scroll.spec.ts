/*
Copyright 2026 Alaister Leung

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { SettingLevel } from "../../../src/settings/SettingLevel";
import { test, expect } from "../../element-web-test";

test.describe("Overlay right panel scroll regression", () => {
    test.use({
        displayName: "Tom",
        botCreateOpts: {
            displayName: "BotBob",
            autoAcceptInvites: true,
        },
    });

    // Regression test for the bug where clicking a thread summary ("N replies")
    // scrolled the whole window horizontally while the overlay panel was still
    // mid-slide (translateX(100%) → 0): the freshly-mounted thread composer
    // focused itself off-screen, and the browser's focus scroll-into-view panned
    // the document sideways until the transition finished.
    test("opening a thread via the summary button never scrolls the window horizontally", async ({
        page,
        app,
        user,
    }) => {
        await app.settings.setValue("feature_overlay_right_panel", null, SettingLevel.DEVICE, true);
        // Animation stays ON — the bug only reproduces mid-slide.

        const roomId = await app.client.createRoom({});
        await page.goto("/#/room/" + roomId);
        await expect(page.locator(".mx_RoomView_body")).toBeVisible();

        // Create a real thread via the UI so the timeline shows the "N replies" summary.
        const composer = page.getByRole("textbox", { name: "Send an unencrypted message…" });
        await composer.fill("root message for thread");
        await composer.press("Enter");
        await expect(
            page.locator(".mx_EventTile").filter({ hasText: "root message for thread" }).first(),
        ).toBeVisible();

        const tile = page.locator(".mx_EventTile[data-scroll-tokens]").filter({ hasText: "root message for thread" });
        await tile.hover();
        await tile.getByRole("button", { name: "Reply in thread" }).click();
        await expect(page.locator(".mx_ThreadView_timelinePanelWrapper")).toHaveCount(1);
        const textbox = page.locator(".mx_ThreadPanel").getByRole("textbox", { name: "Send an unencrypted message…" });
        await textbox.fill("a thread reply");
        await textbox.press("Enter");
        await expect(
            page.locator(".mx_ThreadPanel").locator(".mx_EventTile_last").getByText("a thread reply"),
        ).toBeVisible();
        await page.locator(".mx_ThreadPanel").getByTestId("base-card-close-button").click();

        // Sample every animation frame during the interaction; record any element
        // whose horizontal scroll position changes.
        await page.evaluate(() => {
            const log: unknown[] = [];
            const prev = new Map<Element, number>();
            (window as any).__scrollLog = log;
            const tick = () => {
                const html = document.documentElement;
                document.querySelectorAll("*").forEach((el) => {
                    if (el.scrollWidth > el.clientWidth + 1 || el === html) {
                        const last = prev.get(el);
                        if (last !== undefined && el.scrollLeft !== last) {
                            log.push({
                                cls: (el.className || "").toString().slice(0, 100),
                                tag: el.tagName,
                                from: last,
                                to: el.scrollLeft,
                            });
                        }
                        prev.set(el, el.scrollLeft);
                    }
                });
                if (!(log as any).done) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });

        // Real user path: click the thread summary ("N replies") under the root message.
        const summary = page.locator('[data-testid="thread-summary"], .mx_ThreadSummary').first();
        await expect(summary).toBeVisible({ timeout: 10000 });
        await summary.click();
        await page.waitForTimeout(400);
        await page.evaluate(() => (((window as any).__scrollLog as any).done = true));

        const log = await page.evaluate(() => (window as any).__scrollLog);
        expect(log).toEqual([]);
    });
});
