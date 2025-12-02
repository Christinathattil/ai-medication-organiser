// Settings Management for Accessibility Features
// Stores user preferences in localStorage

class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        const defaults = {
            textSize: 'medium', // small (14px), medium (16px), large (18px)
            theme: 'light', // light, dark
            fontWeight: 'normal', // normal, bold
            reduceMotion: false
        };

        try {
            const stored = localStorage.getItem('medicationManagerSettings');
            return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaults;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('medicationManagerSettings', JSON.stringify(this.settings));
            console.log('✅ Settings saved:', this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    applySettings() {
        const root = document.documentElement;

        // Apply text size
        root.setAttribute('data-text-size', this.settings.textSize);

        // Apply theme
        root.setAttribute('data-theme', this.settings.theme);

        // Apply font weight
        root.setAttribute('data-font-weight', this.settings.fontWeight);

        // Apply reduced motion
        root.setAttribute('data-reduce-motion', this.settings.reduceMotion);

        console.log('✅ Settings applied:', this.settings);
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.applySettings();
    }

    getSetting(key) {
        return this.settings[key];
    }

    resetSettings() {
        this.settings = {
            textSize: 'medium',
            theme: 'light',
            fontWeight: 'normal',
            reduceMotion: false
        };
        this.saveSettings();
        this.applySettings();
    }
}

// Initialize settings manager
const settingsManager = new SettingsManager();

// Settings modal functions
window.openSettings = function () {
    // Update UI to reflect current settings
    document.querySelector(`input[name="text-size"][value="${settingsManager.getSetting('textSize')}"]`).checked = true;
    document.querySelector(`input[name="theme"][value="${settingsManager.getSetting('theme')}"]`).checked = true;
    document.querySelector(`input[name="font-weight"][value="${settingsManager.getSetting('fontWeight')}"]`).checked = true;
    document.getElementById('reduce-motion').checked = settingsManager.getSetting('reduceMotion');

    document.getElementById('settings-modal').classList.add('active');
};

window.closeSettings = function () {
    document.getElementById('settings-modal').classList.remove('active');
};

window.saveSettings = function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    settingsManager.updateSetting('textSize', formData.get('text-size'));
    settingsManager.updateSetting('theme', formData.get('theme'));
    settingsManager.updateSetting('fontWeight', formData.get('font-weight'));
    settingsManager.updateSetting('reduceMotion', formData.get('reduce-motion') === 'on');

    closeSettings();

    // Show success notification
    if (typeof showNotification === 'function') {
        showNotification('Settings saved successfully!', 'success');
    }
};

window.resetAllSettings = function () {
    if (confirm('Reset all settings to default?')) {
        settingsManager.resetSettings();
        closeSettings();

        if (typeof showNotification === 'function') {
            showNotification('Settings reset to default', 'success');
        }
    }
};
