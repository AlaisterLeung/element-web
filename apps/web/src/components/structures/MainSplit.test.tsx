/*
Copyright 2024 New Vector Ltd.
Copyright 2023 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { describe, it, beforeEach, expect, vi } from "vitest";
import React from "react";
import { render, fireEvent } from "test-utils-rtl";

import MainSplit from "./MainSplit";
import { PosthogAnalytics } from "../../PosthogAnalytics.ts";
import { SDKContext } from "../../contexts/SDKContext.ts";
import { SDKContextClass } from "../../contexts/SDKContextClass";

describe("<MainSplit/>", () => {
    const children = (
        <div>
            Child<span>Foo</span>Bar
        </div>
    );
    const panel = <div>Right panel</div>;
    let sdkContext: SDKContextClass;

    beforeEach(() => {
        localStorage.clear();
        sdkContext = new SDKContextClass();
    });

    it("renders", () => {
        const { asFragment, container } = render(
            <MainSplit children={children} panel={panel} analyticsRoomType="other_room" />,
        );
        expect(asFragment()).toMatchSnapshot();
        // Assert it matches the default width of 320
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("320px");
    });

    it("respects defaultSize prop", () => {
        const { asFragment, container } = render(
            <MainSplit children={children} panel={panel} defaultSize={500} analyticsRoomType="other_room" />,
        );
        expect(asFragment()).toMatchSnapshot();
        // Assert it matches the default width of 350
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("500px");
    });

    it("prefers size stashed in LocalStorage to the defaultSize prop", () => {
        localStorage.setItem("mx_rhs_size_thread", "333");
        const { container } = render(
            <MainSplit
                children={children}
                panel={panel}
                sizeKey="thread"
                defaultSize={400}
                analyticsRoomType="other_room"
            />,
        );
        expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("333px");
    });

    it("should report to analytics on resize stop", () => {
        const { container } = render(
            <MainSplit
                children={children}
                panel={panel}
                sizeKey="thread"
                defaultSize={400}
                analyticsRoomType="other_room"
            />,
            { wrapper: ({ children }) => <SDKContext.Provider value={sdkContext}>{children}</SDKContext.Provider> },
        );

        const spy = vi.spyOn(PosthogAnalytics.instance, "trackEvent");

        const handle = container.querySelector(".mx_ResizeHandle--horizontal")!;
        expect(handle).toBeInTheDocument();
        fireEvent.mouseDown(handle);
        fireEvent.resize(handle, { clientX: 0 });
        fireEvent.mouseUp(handle);

        expect(spy).toHaveBeenCalledWith({
            eventName: "WebPanelResize",
            panel: "right",
            roomType: "other_room",
            size: 400,
        });
    });

    describe("overlay mode", () => {
        const renderOverlay = (open = true) =>
            render(
                <MainSplit
                    children={children}
                    panel={panel}
                    sizeKey="thread"
                    defaultSize={400}
                    analyticsRoomType="other_room"
                    overlay
                    open
                    onClose={open ? vi.fn() : undefined}
                />,
                { wrapper: ({ children }) => <SDKContext.Provider value={sdkContext}>{children}</SDKContext.Provider> },
            );

        const trackSpy = () => vi.spyOn(PosthogAnalytics.instance, "trackEvent");

        it("renders the scrim and overlay classes when open", () => {
            // Stash an overlay width BEFORE rendering so loadSidePanelSize picks it up.
            localStorage.setItem("mx_rhs_size_overlay_thread", "777");
            const { container } = renderOverlay();
            const split = container.firstElementChild as HTMLElement;
            expect(split).toHaveClass("mx_MainSplit_overlay");
            expect(split).toHaveClass("mx_RightPanel_open");
            expect(container.querySelector(".mx_RightPanel_scrim")).toBeInTheDocument();

            // Overlay width is persisted under the dedicated _overlay key, not the docked key.
            expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("777px");
        });

        it("defaults the overlay width to 800px when nothing is stashed", () => {
            const { container } = renderOverlay();
            expect(container.querySelector<HTMLElement>(".mx_RightPanel_ResizeWrapper")!.style.width).toBe("800px");
        });

        it("stores dragged widths in the dedicated overlay key without touching the docked one", () => {
            const { container } = renderOverlay();

            const spy = trackSpy();
            const handle = container.querySelector(".mx_ResizeHandle--horizontal")!;
            fireEvent.mouseDown(handle);
            fireEvent.resize(handle, { clientX: 0 });
            fireEvent.mouseUp(handle);

            expect(spy).toHaveBeenCalled();
            expect(localStorage.getItem("mx_rhs_size_overlay_thread")).toBe("800");
            expect(localStorage.getItem("mx_rhs_size_thread")).toBeNull();
        });

        it("closes when the scrim is clicked or a key is pressed on it", () => {
            const onClose = vi.fn();
            const { container } = render(
                <MainSplit
                    children={children}
                    panel={panel}
                    defaultSize={400}
                    analyticsRoomType="other_room"
                    overlay
                    open
                    onClose={onClose}
                />,
                {
                    wrapper: ({ children }) => <SDKContext.Provider value={sdkContext}>{children}</SDKContext.Provider>,
                },
            );

            const scrim = container.querySelector(".mx_RightPanel_scrim")!;
            fireEvent.click(scrim);
            fireEvent.keyDown(scrim);
            expect(onClose).toHaveBeenCalledTimes(2);
        });

        it("does not render the scrim when closed", () => {
            // isOverlay requires a panel; without `panel` there is no scrim even in overlay mode.
            const { container } = render(
                <MainSplit children={children} defaultSize={400} analyticsRoomType="other_room" overlay open />,
            );
            expect(container.querySelector(".mx_RightPanel_scrim")).not.toBeInTheDocument();
            expect(container.firstElementChild).not.toHaveClass("mx_MainSplit_overlay");
        });
    });
});
