/*
Copyright 2026 Alaister Leung

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import React from "react";

import { SettingLevel } from "../../../settings/SettingLevel";
import { _t } from "../../../languageHandler";
import SettingsFlag from "../elements/SettingsFlag";
import { SettingsSubsection } from "./shared/SettingsSubsection";

/**
 * Companion settings for the "overlay right panel" lab. The slide animation is a
 * plain (non-feature) setting, so it is surfaced here rather than in the
 * auto-generated labs list. The overlay width has no setting any more: it defaults
 * to 800px and is remembered from the user's resize-handle drags.
 */
export const OverlayPanelSettings = (): React.ReactElement => {
    return (
        <SettingsSubsection heading={_t("labs|overlay_right_panel_section")}>
            <SettingsFlag level={SettingLevel.DEVICE} name="overlayRightPanelAnimation" />
        </SettingsSubsection>
    );
};