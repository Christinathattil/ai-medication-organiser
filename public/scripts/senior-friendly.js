// ============================================
// SENIOR-FRIENDLY JAVASCRIPT
// Senior-Friendly Features
// Handles accessibility, voice, and themes

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    initSpeechRecognition();

    // Check for saved theme
    const savedTheme = localStorage.getItem('appTheme') || 'light';
    setTheme(savedTheme);
});

// Theme Management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);

    // Update active state of theme buttons if they exist
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });
}

// Text Size Management
function setTextSize(size) {
    const root = document.documentElement;

    // Remove active class from all buttons
    document.querySelectorAll('.text-size-controls button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Set the text size
    switch (size) {
        case 'small':
            root.style.setProperty('--text-size', '18px');
            document.querySelector('.text-size-controls button:nth-child(1)').classList.add('active');
            break;
        case 'medium':
            root.style.setProperty('--text-size', '20px');
            document.querySelector('.text-size-controls button:nth-child(2)').classList.add('active');
            break;
        case 'large':
            root.style.setProperty('--text-size', '24px');
            document.querySelector('.text-size-controls button:nth-child(3)').classList.add('active');
            break;
    }

    // Save preference
    localStorage.setItem('textSize', size);
    showNotification(`Text size set to ${size} `, 'success');
}

// Load saved text size on page load
function loadTextSizePreference() {
    const savedSize = localStorage.getItem('textSize') || 'medium';
    setTextSize(savedSize);
}

// High Contrast Mode
function toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    const isEnabled = document.body.classList.contains('high-contrast');
    localStorage.setItem('highContrast', isEnabled);
    showNotification(isEnabled ? 'High contrast enabled' : 'High contrast disabled', 'success');
}

// Load high contrast preference
function loadHighContrastPreference() {
    const isEnabled = localStorage.getItem('highContrast') === 'true';
    if (isEnabled) {
        document.body.classList.add('high-contrast');
    }
}

// ============================================
// VOICE FEATURES (Web Speech API)
// ============================================

let recognition = null;
let isListening = false;

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            updateVoiceButtonState(true);
            showNotification('🎤 Listening... Speak now', 'info');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleVoiceInput(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateVoiceButtonState(false);

            if (event.error === 'no-speech') {
                showNotification('No speech detected. Please try again.', 'warning');
            } else if (event.error === 'not-allowed') {
                showNotification('Microphone access denied. Please enable it in settings.', 'error');
            } else {
                showNotification('Voice input error. Please try again.', 'error');
            }
        };

        recognition.onend = () => {
            isListening = false;
            updateVoiceButtonState(false);
        };

        console.log('✅ Speech recognition initialized');
        return true;
    } else {
        console.warn('⚠️ Speech recognition not supported');
        return false;
    }
}

// Start Voice Input
function startVoiceInput(targetElementId) {
    if (!recognition) {
        if (!initSpeechRecognition()) {
            showNotification('Voice input is not supported on this device', 'error');
            return;
        }
    }

    if (isListening) {
        recognition.stop();
        return;
    }

    // Store target element for later
    window.currentVoiceTarget = targetElementId;

    try {
        recognition.start();
    } catch (error) {
        console.error('Failed to start recognition:', error);
        showNotification('Failed to start voice input', 'error');
    }
}

// Handle voice input result
function handleVoiceInput(transcript) {
    console.log('Voice input:', transcript);

    const targetId = window.currentVoiceTarget;
    if (targetId) {
        const element = document.getElementById(targetId);
        if (element) {
            element.value = transcript;

            // If it's the chat input, send the message automatically
            if (targetId === 'chat-input') {
                if (typeof sendMessage === 'function') {
                    sendMessage();
                }
            }
        }
    }

    showNotification(`Heard: "${transcript}"`, 'success');
}

// Update voice button appearance
function updateVoiceButtonState(listening) {
    const voiceButtons = document.querySelectorAll('.voice-btn');
    voiceButtons.forEach(btn => {
        if (listening) {
            btn.classList.add('listening');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        } else {
            btn.classList.remove('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    });
}

// ============================================
// TEXT-TO-SPEECH
// ============================================

function speak(text, options = {}) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 0.9; // Slightly slower for seniors
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';

        speechSynthesis.speak(utterance);

        return utterance;
    } else {
        console.warn('Text-to-speech not supported');
        return null;
    }
}

// Stop speaking
function stopSpeaking() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

// ============================================
// AUDIO NOTIFICATIONS
// ============================================

const audioCache = {};

function playSound(soundName) {
    try {
        const soundPath = `/ sounds / ${soundName}.mp3`;

        if (!audioCache[soundName]) {
            audioCache[soundName] = new Audio(soundPath);
        }

        const audio = audioCache[soundName];
        audio.currentTime = 0; // Reset to beginning
        audio.play().catch(err => {
            console.warn('Audio play failed:', err);
        });
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// ============================================
// VIBRATION
// ============================================

function vibrate(pattern = [200, 100, 200]) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
        return true;
    }
    return false;
}

// ============================================
// REMINDER WITH AUDIO & VIBRATION
// ============================================

function showReminderWithAudioVibration(medication) {
    // Play sound
    playSound('reminder');

    // Vibrate
    vibrate([300, 100, 300, 100, 300]);

    // Speak
    const message = `Time to take your ${medication.name} `;
    speak(message);

    // Show visual reminder
    showFullScreenReminder(medication);
}

// ============================================
// FULL SCREEN REMINDER MODAL
// ============================================

function showFullScreenReminder(medication) {
    const modal = document.createElement('div');
    modal.id = 'fullscreen-reminder';
    modal.className = 'fullscreen-modal';
    modal.innerHTML = `
    < div class="reminder-content" >
      <i class="fas fa-pills mega-icon" style="color: var(--color-success);"></i>
      <h1 style="font-size: 32px; margin: 20px 0;">Time for your medicine!</h1>
      <h2 style="font-size: 28px; margin: 10px 0;">${medication.name}</h2>
      <p style="font-size: 22px; color: #6b7280;">${medication.dosage || ''}</p>
      ${medication.food_timing ? `<p style="font-size: 20px;">Take ${medication.food_timing === 'before_food' ? 'before' : medication.food_timing === 'after_food' ? 'after' : 'with'} food</p>` : ''}
      
      <button class="giant-btn btn-success" onclick="takeNow(${medication.id}, ${medication.schedule_id})">
        <i class="fas fa-check-circle"></i> I'LL TAKE IT NOW
      </button>
      <button class="giant-btn btn-warning" onclick="snooze10min(${medication.schedule_id})">
        <i class="fas fa-clock"></i> REMIND ME IN 10 MINUTES
      </button>
      <button class="btn-secondary" onclick="dismissReminder()" style="margin-top: 16px;">
        Not now
      </button>
    </div >
    `;

    document.body.appendChild(modal);
    modal.classList.add('fade-in');
}

function takeNow(medicationId, scheduleId) {
    dismissReminder();

    // Mark as taken
    logMedication(medicationId, scheduleId, 'taken');

    speak('Great! Medicine marked as taken');
    playSound('success');
    showNotification('✅ Marked as taken!', 'success');
}

function snooze10min(scheduleId) {
    dismissReminder();

    // Set reminder for 10 minutes from now
    setTimeout(() => {
        // Re-show reminder (in real implementation, fetch medication data)
        showNotification('⏰ Reminder: Time to take your medicine!', 'warning');
        playSound('reminder');
        vibrate();
    }, 10 * 60 * 1000);

    speak('Okay, I will remind you in 10 minutes');
    showNotification('⏰ Will remind you in 10 minutes', 'info');
}

function dismissReminder() {
    const modal = document.getElementById('fullscreen-reminder');
    if (modal) {
        modal.remove();
    }
    stopSpeaking();
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load user preferences
    loadTextSizePreference();
    loadHighContrastPreference();

    // Initialize speech recognition
    initSpeechRecognition();

    console.log('✅ Senior-friendly features initialized');
});

// Export functions for use in other scripts
window.seniorFriendly = {
    setTextSize,
    toggleHighContrast,
    startVoiceInput,
    speak,
    stopSpeaking,
    playSound,
    vibrate,
    showReminderWithAudioVibration,
    showFullScreenReminder
};
