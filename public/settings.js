// Settings Management for Accessibility Features
// Stores user preferences in localStorage

class SettingsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.applySettings();
    }

    loadSettings() {
        const defaults = {
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
    const reduceMotionInput = document.getElementById('reduce-motion');
    if (reduceMotionInput) {
        reduceMotionInput.checked = settingsManager.getSetting('reduceMotion');
    }
    document.getElementById('settings-modal').classList.add('active');
};

window.closeSettings = function () {
    document.getElementById('settings-modal').classList.remove('active');
};

window.saveSettings = function (event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    settingsManager.updateSetting('reduceMotion', formData.get('reduce-motion') === 'on');

    closeSettings();

    // Show success notification
    if (typeof showNotification === 'function') {
        showNotification('Settings saved successfully!', 'success');
    }
};

window.resetAllSettings = function () {
    if (confirm('Reset settings to default?')) {
        settingsManager.resetSettings();
        closeSettings();

        if (typeof showNotification === 'function') {
            showNotification('Settings reset to default', 'success');
        }
    }
};
