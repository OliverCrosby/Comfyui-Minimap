import { app } from '../../scripts/app.js';

async function reloadSettings() {
    const event = new CustomEvent('minimap.reloadSettings');
    window.dispatchEvent(event);
}

const settingsDefinitions = [
    {
        id: 'minimap.KeepInBounds',
        category: ['Minimap', 'Bounds'],
        name: 'Keep Minimap In Bounds',
        defaultValue: true,
        type: 'boolean',
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