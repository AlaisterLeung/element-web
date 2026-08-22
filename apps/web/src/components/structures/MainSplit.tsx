/*
Copyright 2024 New Vector Ltd.
Copyright 2019 The Matrix.org Foundation C.I.C.
Copyright 2018 New Vector Ltd

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, type ReactNode } from "react";
import { type NumberSize, Resizable } from "re-resizable";
import { type Direction } from "re-resizable/lib/resizer";
import { type WebPanelResize } from "@matrix-org/analytics-events/types/typescript/WebPanelResize";

import { PosthogAnalytics } from "../../PosthogAnalytics.ts";
import { SDKContext } from "../../contexts/SDKContext.ts";

/**
 * Default overlay panel width in px when the user hasn't dragged the resize handle.
 * Boss's spec: hard-code 800px as the default (the % Labs setting is removed); the
 * width is remembered per-device once the user drags the right-panel border.
 */
const OVERLAY_DEFAULT_WIDTH = 800;

interface IProps {
    collapsedRhs?: boolean;
    panel?: JSX.Element;
    children: ReactNode;
    /**
     * A unique identifier for this panel split.
     *
     * This is appended to the key used to store the panel size in localStorage, allowing the widths of different
     * panels to be stored.
     */
    sizeKey?: string;
    /**
     * The size to use for the panel component if one isn't persisted in storage. Defaults to 320.
     */
    defaultSize: number;

    analyticsRoomType: WebPanelResize["roomType"];

    /** Overlay mode: panel floats over the body instead of docking. */
    overlay?: boolean;
    /** Whether the overlay panel is open; drives the slide transition. */
    open?: boolean;
    /** Whether the slide transition is enabled; off = instant open/close. */
    animate?: boolean;
    /** Close handler for scrim clicks in overlay mode. */
    onClose?: () => void;
}

export default class MainSplit extends React.Component<IProps> {
    public static contextType = SDKContext;
    declare public context: React.ContextType<typeof SDKContext>;

    public static defaultProps = {
        defaultSize: 320,
    };

    public constructor(props: IProps, context: React.ContextType<typeof SDKContext>) {
        super(props, context);
    }

    private onResizeStart = (): void => {
        this.context.resizeNotifier.startResizing();
    };

    private onResize = (): void => {
        this.context.resizeNotifier.notifyRightHandleResized();
    };

    private get sizeSettingStorageKey(): string {
        let key = "mx_rhs_size";
        if (this.props.overlay) {
            // Remember the overlay width independently of the docked panel, so a
            // dragged overlay width never leaks into docked mode (and vice versa).
            key += "_overlay";
        }
        if (!!this.props.sizeKey) {
            key += `_${this.props.sizeKey}`;
        }
        return key;
    }

    private onResizeStop = (
        event: MouseEvent | TouchEvent,
        direction: Direction,
        elementRef: HTMLElement,
        delta: NumberSize,
    ): void => {
        const newSize = this.loadSidePanelSize().width + delta.width;
        this.context.resizeNotifier.stopResizing();
        window.localStorage.setItem(this.sizeSettingStorageKey, newSize.toString());

        PosthogAnalytics.instance.trackEvent<WebPanelResize>({
            eventName: "WebPanelResize",
            panel: "right",
            roomType: this.props.analyticsRoomType,
            size: newSize,
        });
    };

    private loadSidePanelSize(): { height: string | number; width: number } {
        let rhsSize = parseInt(window.localStorage.getItem(this.sizeSettingStorageKey)!, 10);

        if (isNaN(rhsSize)) {
            // Overlay defaults to the hard-coded 800px; docked keeps its own default.
            rhsSize = this.props.overlay ? OVERLAY_DEFAULT_WIDTH : this.props.defaultSize;
        }

        return {
            height: "100%",
            width: rhsSize,
        };
    }

    public render(): React.ReactNode {
        const bodyView = React.Children.only(this.props.children);
        const panelView = this.props.panel;
        const isOverlay = this.props.overlay && panelView !== undefined;

        const hasResizer = !this.props.collapsedRhs && panelView;
        const transformClass = this.props.animate === false ? " mx_RightPanel_instant" : "";
        const openClass = this.props.open ? " mx_RightPanel_open" : " mx_RightPanel_closed";
        const splitClassName = isOverlay
            ? `mx_MainSplit mx_MainSplit_overlay${openClass}${transformClass}`
            : "mx_MainSplit";

        let children;
        if (hasResizer) {
            children = (
                <Resizable
                    key={this.props.sizeKey}
                    defaultSize={this.loadSidePanelSize()}
                    minWidth={320}
                    maxWidth={this.props.overlay ? "100%" : "50%"}
                    enable={{
                        top: false,
                        right: false,
                        bottom: false,
                        left: true,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                    }}
                    onResizeStart={this.onResizeStart}
                    onResize={this.onResize}
                    onResizeStop={this.onResizeStop}
                    className="mx_RightPanel_ResizeWrapper"
                    style={
                        isOverlay
                            ? {
                                  // re-resizable forces position:relative inline, which would
                                  // pull the panel into flex layout; overlay mode pins it absolute.
                                  position: "absolute" as const,
                                  top: 0,
                                  right: 0,
                                  bottom: 0,
                              }
                            : undefined
                    }
                    handleClasses={{ left: "mx_ResizeHandle--horizontal" }}
                >
                    {panelView}
                </Resizable>
            );
        }

        return (
            <div className={splitClassName}>
                {bodyView}
                {isOverlay && (
                    <div className="mx_RightPanel_scrim" onClick={this.props.onClose} onKeyDown={this.props.onClose} />
                )}
                {children}
            </div>
        );
    }
}
