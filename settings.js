import { app } from '../../scripts/app.js';

function reloadSettings() {
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
        id: 'minimap.RestrictToGraph',
        category: ['Minimap', 'Bounds', 'Restrict To Graph'],
        name: 'Restrict Minimap to Graph',
        defaultValue: true,
        type: 'boolean',
        tooltip: 'Prevents the minimap from overlapping UI elements and restricts it to the graph area only.',
        onChange: () => reloadSettings(),
    },
    {
        id: 'minimap.SnapTo',
        category: ['Minimap', 'Bounds', 'Snap To'],
        name: 'Snap To',
        defaultValue: 'none',
        options: [
            { text: 'None', value: 'none' },
            { text: 'Relative', value: 'relative' },
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