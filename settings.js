import { app } from '../../scripts/app.js';

async function reloadSettings() {
    const event = new CustomEvent('minimap.reloadSettings');
    window.dispatchEvent(event);
}

const settingsDefinitions = [
    {
        id: 'minimap.KeepInBounds',
        category: ['Minimap', 'Bounds', 'Keep In Bounds'],
        name: 'Keep Minimap In Bounds',
        defaultValue: true,
        type: 'boolean',
        onChange: () => reloadSettings(),
    },
    {
        id: 'minimap.SnapTo',
        category: ['Minimap', 'Bounds', 'Snap To'],
        name: 'Snap To',
        defaultValue: 'none',
        options: [
            { text: 'None', value: 'none' },
            { text: 'Top Right', value: 'topright' },
            { text: 'Top Left', value: 'topleft' },
            { text: 'Bottom Right', value: 'bottomright' },
            { text: 'Bottom Left', value: 'bottomleft' },
        ],
        type: 'combo',
        onChange: () => reloadSettings(),
    },
]

function registerSetting(settingDefinition) {
    const extension = {
        name: settingDefinition.id,
        init() {
            app.ui.settings.addSetting({
                ...settingDefinition,
            });
        },
    };
    app.registerExtension(extension);
};

settingsDefinitions.forEach((setting) => {
    registerSetting(setting);
});