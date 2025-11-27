// ============================================
// HELP SYSTEM & FIRST-TIME SETUP
// ============================================

// Check if this is user's first time
function checkFirstTimeUser() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
        setTimeout(() => showWelcomeWizard(), 1000);
    }
}

// Welcome wizard for first-time users
function showWelcomeWizard() {
    const modal = createModal({
        title: '👋 Welcome!',
        content: `
      <div style="text-align: center; padding: 20px;">
        <i class="fas fa-heart" style="font-size: 80px; color: #10b981; margin-bottom: 20px;"></i>
        <h2 style="font-size: 28px; margin-bottom: 16px;">Welcome to Your Medication Manager</h2>
        <p style="font-size: 22px; color: #6b7280; line-height: 1.6;">
          Never forget your medicine again!<br>
          We'll help you set up in just 3 easy steps.
        </p>
        <button onclick="startSetupWizard()" class="btn-large btn-success" style="width: 100%; margin-top: 24px; font-size: 24px;">
          Let's Get Started! →
        </button>
        <button onclick="skipSetup()" class="btn-secondary" style="width: 100%; margin-top: 12px; font-size: 18px;">
          I'll do this later
        </button>
      </div>
    `
    });

    document.body.appendChild(modal);
}

// Setup wizard steps
let setupStep = 1;

function startSetupWizard() {
    // Mark as seen
    localStorage.setItem('hasSeenWelcome', 'true');

    // Remove welcome modal
    document.getElementById('help-modal')?.remove();

    showSetupStep1();
}

function showSetupStep1() {
    const modal = createModal({
        title: 'Step 1: Add Your First Medicine',
        content: `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-pills" style="font-size: 72px; color: #7c3aed; margin-bottom: 20px;"></i>
        <p style="font-size: 22px; color: #6b7280; margin-bottom: 24px;">
          Let's start by adding a medicine you take regularly.
        </p>
        <button onclick="document.getElementById('help-modal').remove(); showMedicationWizard();" class="btn-large btn-success" style="width: 100%; font-size: 22px;">
          <i class="fas fa-plus-circle"></i> Add My First Medicine
        </button>
        <button onclick="showSetupStep2()" class="btn-secondary" style="width: 100%; margin-top: 12px; font-size: 18px;">
          Skip this step →
        </button>
      </div>
    `
    });

    document.getElementById('help-modal')?.remove();
    document.body.appendChild(modal);
}

function showSetupStep2() {
    const modal = createModal({
        title: 'Step 2: Text Size',
        content: `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-text-height" style="font-size: 72px; color: #10b981; margin-bottom: 20px;"></i>
        <p style="font-size: 22px; color: #6b7280; margin-bottom: 24px;">
          Choose a text size that's comfortable for you.
        </p>
        <div class="text-size-controls">
          <button onclick="setTextSize('small')" style="font-size: 16px;">A</button>
          <button onclick="setTextSize('medium')" class="active" style="font-size: 20px;">A</button>
          <button onclick="setTextSize('large')" style="font-size: 24px;">A</button>
        </div>
        <button onclick="showSetupStep3()" class="btn-large btn-success" style="width: 100%; margin-top: 24px; font-size: 22px;">
          Next →
        </button>
      </div>
    `
    });

    document.getElementById('help-modal')?.remove();
    document.body.appendChild(modal);
}

function showSetupStep3() {
    const modal = createModal({
        title: 'Step 3: All Done!',
        content: `
      <div style="padding: 20px; text-align: center;">
        <i class="fas fa-check-circle" style="font-size: 80px; color: #10b981; margin-bottom: 20px;"></i>
        <h2 style="font-size: 28px; margin-bottom: 16px;">You're All Set!</h2>
        <p style="font-size: 22px; color: #6b7280; margin-bottom: 24px;">
          Here's how to use your medication manager:
        </p>
        <div style="text-align: left; font-size: 20px; line-height: 1.8;">
          <p><strong>🎤 Voice:</strong> Tap the microphone to speak</p>
          <p><strong>💊 Add Medicine:</strong> Use the + button or ask me</p>
          <p><strong>✓ Mark as Taken:</strong> Big green button on schedule</p>
          <p><strong>❓ Help:</strong> Tap the ♿ button anytime</p>
        </div>
        <button onclick="document.getElementById('help-modal').remove(); speak('Welcome! I am ready to help you manage your medications');" class="btn-large btn-success" style="width: 100%; margin-top: 24px; font-size: 24px;">
          <i class="fas fa-rocket"></i> Start Using the App
        </button>
      </div>
    `
    });

    document.getElementById('help-modal')?.remove();
    document.body.appendChild(modal);
}

function skipSetup() {
    localStorage.setItem('hasSeenWelcome', 'true');
    document.getElementById('help-modal')?.remove();
}

// Help modal creator
function createModal({ title, content }) {
    const modal = document.createElement('div');
    modal.id = 'help-modal';
    modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;

    modal.innerHTML = `
    <div style="background: white; border-radius: 20px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <div style="padding: 24px; border-bottom: 2px solid #e5e7eb;">
        <h1 style="font-size: 32px; margin: 0;">${title}</h1>
      </div>
      <div>
        ${content}
      </div>
    </div>
  `;

    return modal;
}

// Help button functionality
function showHelpMenu() {
    const modal = createModal({
        title: '❓ Help & Tips',
        content: `
      <div style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 24px; margin-bottom: 12px;">
            <i class="fas fa-microphone" style="color: #10b981;"></i> Using Voice
          </h3>
          <p style="font-size: 20px; color: #6b7280;">
            Tap the microphone button and say things like:<br>
            • "Add aspirin 500mg"<br>
            • "Schedule aspirin at 8am"<br>
            • "Show today's medications"
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 24px; margin-bottom: 12px;">
            <i class="fas fa-pills" style="color: #7c3aed;"></i> Adding Medicine
          </h3>
          <p style="font-size: 20px; color: #6b7280;">
            Use the simple 3-step wizard:<br>
            1. What medicine?<br>
            2. When to take it?<br>
            3. Before or after food?
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 24px; margin-bottom: 12px;">
            <i class="fas fa-check-circle" style="color: #10b981;"></i> Marking as Taken
          </h3>
          <p style="font-size: 20px; color: #6b7280;">
            Just tap the big green "I TOOK IT" button!<br>
            You can also swipe right on any medicine.
          </p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 24px; margin-bottom: 12px;">
            <i class="fas fa-text-height" style="color: #f59e0b;"></i> Text Too Small?
          </h3>
          <p style="font-size: 20px; color: #6b7280;">
            Tap the ♿ button (top right) to adjust text size.
          </p>
        </div>
        
        <button onclick="document.getElementById('help-modal').remove();" class="btn-large btn-success" style="width: 100%; font-size: 22px;">
          Got It!
        </button>
        <button onclick="document.getElementById('help-modal').remove(); startSetupWizard();" class="btn-secondary" style="width: 100%; margin-top: 12px; font-size: 18px;">
          Show Me the Tour Again
        </button>
      </div>
    `
    });

    document.getElementById('help-modal')?.remove();
    document.body.appendChild(modal);
}

// Add floating help button
function addFloatingHelpButton() {
    const helpBtn = document.createElement('button');
    helpBtn.className = 'floating-help-btn';
    helpBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
    helpBtn.onclick = showHelpMenu;
    helpBtn.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: white;
    border: none;
    font-size: 32px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    z-index: 999;
    transition: transform 0.2s;
  `;

    helpBtn.onmousedown = () => helpBtn.style.transform = 'scale(0.95)';
    helpBtn.onmouseup = () => helpBtn.style.transform = 'scale(1)';

    document.body.appendChild(helpBtn);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkFirstTimeUser();
    addFloatingHelpButton();
});

// Export functions
window.helpSystem = {
    show: showHelpMenu,
    startSetup: startSetupWizard,
    checkFirstTime: checkFirstTimeUser
};
