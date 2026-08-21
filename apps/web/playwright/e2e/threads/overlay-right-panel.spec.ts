/*
Copyright 2026 Alaister Leung

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { test, expect } from "../../element-web-test";
import { isDendrite } from "../../plugins/homeserver/dendrite";

test.describe("Overlay right panel", () => {
    test.skip(isDendrite, "Overlay is not supported on Dendrite due to the width model");
    test.use({
        displayName: "Tom",
        botCreateOpts: {
            displayName: "BotBob",
            autoAcceptInvites: true,
        },
    });

    test.beforeEach(async ({ page, app }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem("mx_lhs_size", "0"); // Collapse left panel for these tests
        });
    });

    test("overlay does not reserve layout width when closed or open", async ({ page, app, user }) => {
        await app.settings.setValue("feature_overlay_right_panel", null, SettingLevel.DEVICE, true);
        // Animation off for deterministic sizing checks; the slide itself is covered by unit tests
        await app.settings.setValue("overlayRightPanelAnimation", null, SettingLevel.DEVICE, false);

        const roomId = await app.client.createRoom({});
        await page.goto("/#/room/" + roomId);

        const roomViewBody = page.locator(".mx_RoomView_body");
        await expect(roomViewBody).toBeVisible();

        // Baseline width with the panel closed (overlay mode must leave the room full width)
        const bodyWidthBefore = (await roomViewBody.boundingBox())?.width;
        expect(bodyWidthBefore).toBeGreaterThan(0);

        // Open the thread list (any right-panel card works; threads is the primary use case)
        await page.locator(".mx_RoomHeader").getByRole("button", { name: "Threads" }).click();
        const split = page.locator(".mx_MainSplit_overlay");
        await expect(split).toHaveClass(/mx_RightPanel_open/);

        // Room body must not shrink while the overlay is open
        const bodyWidthOpen = (await roomViewBody.boundingBox())?.width;
        expect(bodyWidthOpen).toBe(bodyWidthBefore);

        // Close via the panel's close button (same mechanism as the scrim click)
        await page.locator(".mx_RightPanel").getByTestId("base-card-close-button").click();
        await expect(split).toHaveClass(/mx_RightPanel_closed/);

        // Width unchanged after closing
        const bodyWidthAfter = (await roomViewBody.boundingBox())?.width;
        expect(bodyWidthAfter).toBe(bodyWidthBefore);
    });

    test("docked mode still reserves width (sanity)", async ({ page, app, user }) => {
        // Flag untouched → default off → docked behaviour
        const roomId = await app.client.createRoom({});
        await page.goto("/#/room/" + roomId);

        const roomViewBody = page.locator(".mx_RoomView_body");
        await expect(roomViewBody).toBeVisible();

        const bodyWidthBefore = (await roomViewBody.boundingBox())?.width;
        expect(bodyWidthBefore).toBeGreaterThan(0);

        await page.locator(".mx_RoomHeader").getByRole("button", { name: "Threads" }).click();
        await expect(page.locator(".mx_RightPanel")).toBeVisible();
        const bodyWidthOpen = (await roomViewBody.boundingBox())?.width;

        // Docked panel reserves horizontal space: the body must be narrower
        expect(bodyWidthOpen).toBeLessThan(bodyWidthBefore!);
    });
});