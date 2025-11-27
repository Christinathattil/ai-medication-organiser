// ============================================
// SIMPLIFIED MEDICATION WIZARD (3 Steps)
// ============================================

let wizardData = {};
let currentWizardStep = 1;

function showMedicationWizard() {
    wizardData = {};
    currentWizardStep = 1;

    const modal = document.getElementById('add-medication-modal');
    const originalForm = document.getElementById('medication-form');

    // Hide original form
    originalForm.style.display = 'none';

    // Create wizard container
    const wizardContainer = document.createElement('div');
    wizardContainer.id = 'medication-wizard';
    wizardContainer.innerHTML = `
    <div class="wizard-progress" style="display: flex; justify-content: space-between; margin-bottom: 24px;">
      <div class="wizard-step-indicator active" data-step="1">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-success); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">1</div>
        <span style="font-size: 14px; margin-top: 4px;">What?</span>
      </div>
      <div class="wizard-step-indicator" data-step="2">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #d1d5db; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">2</div>
        <span style="font-size: 14px; margin-top: 4px;">When?</span>
      </div>
      <div class="wizard-step-indicator" data-step="3">
        <div style="width: 40px; height: 40px; border-radius: 50%; background: #d1d5db; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">3</div>
        <span style="font-size: 14px; margin-top: 4px;">Food?</span>
      </div>
    </div>
    
    <div id="wizard-step-1" class="wizard-step">
      <h2 style="font-size: 28px; margin-bottom: 24px; text-align: center;">What medicine?</h2>
      <div style="margin-bottom: 20px;">
        <label style="font-size: 20px; font-weight: 600; display: block; margin-bottom: 8px;">Medicine Name</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="wizard-name" placeholder="e.g., Aspirin" style="flex: 1; font-size: 22px; padding: 16px; border: 3px solid #10b981; border-radius: 12px; min-height: 60px;">
          <button onclick="startVoiceInput('wizard-name')" class="voice-btn" style="min-width: 60px; min-height: 60px; border-radius: 12px; background: var(--color-success); color: white; border: none;">
            <i class="fas fa-microphone" style="font-size: 24px;"></i>
          </button>
        </div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="font-size: 20px; font-weight: 600; display: block; margin-bottom: 8px;">How much?</label>
        <input type="text" id="wizard-dosage" placeholder="e.g., 500mg" style="font-size: 22px; padding: 16px; border: 3px solid #10b981; border-radius: 12px; width: 100%; min-height: 60px;">
      </div>
      <button onclick="wizardNext()" class="btn-large btn-success" style="width: 100%; font-size: 24px;">
        Next → Step 2
      </button>
    </div>
    
    <div id="wizard-step-2" class="wizard-step" style="display: none;">
      <h2 style="font-size: 28px; margin-bottom: 24px; text-align: center;">When do you take it?</h2>
      <div style="margin-bottom: 20px;">
        <label style="font-size: 20px; font-weight: 600; display: block; margin-bottom: 8px;">Time</label>
        <input type="time" id="wizard-time" style="font-size: 22px; padding: 16px; border: 3px solid #10b981; border-radius: 12px; width: 100%; min-height: 60px;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="font-size: 20px; font-weight: 600; display: block; margin-bottom: 12px;">How often?</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <button onclick="setWizardFrequency('daily')" class="freq-btn" data-freq="daily" style="min-height: 64px; font-size: 20px; border: 3px solid #10b981; background: white; border-radius: 12px; cursor: pointer;">
            <i class="fas fa-calendar-day" style="font-size: 28px; display: block; margin-bottom: 4px;"></i>
            Daily
          </button>
          <button onclick="setWizardFrequency('weekly')" class="freq-btn" data-freq="weekly" style="min-height: 64px; font-size: 20px; border: 3px solid #d1d5db; background: white; border-radius: 12px; cursor: pointer;">
            <i class="fas fa-calendar-week" style="font-size: 28px; display: block; margin-bottom: 4px;"></i>
            Weekly
          </button>
        </div>
      </div>
      <div style="display: flex; gap: 12px;">
        <button onclick="wizardBack()" class="btn-large btn-secondary" style="flex: 1; font-size: 20px;">
          ← Back
        </button>
        <button onclick="wizardNext()" class="btn-large btn-success" style="flex: 2; font-size: 20px;">
          Next → Step 3
        </button>
      </div>
    </div>
    
    <div id="wizard-step-3" class="wizard-step" style="display: none;">
      <h2 style="font-size: 28px; margin-bottom: 24px; text-align: center;">With food or empty stomach?</h2>
      <div style="display: grid; gap: 16px; margin-bottom: 24px;">
        <button onclick="setWizardFood('before_food')" class="food-btn" data-food="before_food" style="min-height: 80px; font-size: 22px; border: 3px solid #d1d5db; background: white; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 16px;">
          <i class="fas fa-utensils-slash" style="font-size: 36px; color: #f59e0b;"></i>
          <span>Before Food</span>
        </button>
        <button onclick="setWizardFood('after_food')" class="food-btn" data-food="after_food" style="min-height: 80px; font-size: 22px; border: 3px solid #d1d5db; background: white; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 16px;">
          <i class="fas fa-utensils" style="font-size: 36px; color: #10b981;"></i>
          <span>After Food</span>
        </button>
        <button onclick="setWizardFood('anytime')" class="food-btn" data-food="anytime" style="min-height: 80px; font-size: 22px; border: 3px solid #d1d5db; background: white; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 16px;">
          <i class="fas fa-check-circle" style="font-size: 36px; color: #7c3aed;"></i>
          <span>Anytime</span>
        </button>
      </div>
      <div style="display: flex; gap: 12px;">
        <button onclick="wizardBack()" class="btn-large btn-secondary" style="flex: 1; font-size: 20px;">
          ← Back
        </button>
        <button onclick="wizardFinish()" class="btn-large btn-success" style="flex: 2; font-size: 20px;">
          <i class="fas fa-check"></i> Add Medicine
        </button>
      </div>
    </div>
  `;

    originalForm.parentNode.insertBefore(wizardContainer, originalForm);
    openModal('add-medication-modal');
}

function wizardNext() {
    // Validate current step
    if (currentWizardStep === 1) {
        const name = document.getElementById('wizard-name').value.trim();
        const dosage = document.getElementById('wizard-dosage').value.trim();

        if (!name) {
            showNotification('Please enter medicine name', 'warning');
            speak('Please enter medicine name');
            return;
        }
        if (!dosage) {
            showNotification('Please enter dosage', 'warning');
            speak('Please enter dosage');
            return;
        }

        wizardData.name = name;
        wizardData.dosage = dosage;
        wizardData.form = 'tablet';
    }

    if (currentWizardStep === 2) {
        const time = document.getElementById('wizard-time').value;
        if (!time) {
            showNotification('Please select a time', 'warning');
            speak('Please select a time');
            return;
        }

        wizardData.time = time;
        if (!wizardData.frequency) wizardData.frequency = 'daily';
    }

    // Hide current step
    document.getElementById(`wizard-step-${currentWizardStep}`).style.display = 'none';

    // Update progress
    document.querySelector(`.wizard-step-indicator[data-step="${currentWizardStep}"] div`).style.background = '#10b981';

    // Show next step
    currentWizardStep++;
    document.getElementById(`wizard-step-${currentWizardStep}`).style.display = 'block';

    // Update progress indicator
    document.querySelector(`.wizard-step-indicator[data-step="${currentWizardStep}"] div`).style.background = '#10b981';

    // Play success sound
    if (window.seniorFriendly && window.seniorFriendly.playSound) {
        window.seniorFriendly.playSound('success');
    }
}

function wizardBack() {
    document.getElementById(`wizard-step-${currentWizardStep}`).style.display = 'none';
    currentWizardStep--;
    document.getElementById(`wizard-step-${currentWizardStep}`).style.display = 'block';
}

function setWizardFrequency(freq) {
    wizardData.frequency = freq;

    // Update button styles
    document.querySelectorAll('.freq-btn').forEach(btn => {
        if (btn.dataset.freq === freq) {
            btn.style.borderColor = '#10b981';
            btn.style.background = '#dcfce7';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = 'white';
        }
    });
}

function setWizardFood(food) {
    wizardData.food_timing = food;

    // Update button styles
    document.querySelectorAll('.food-btn').forEach(btn => {
        if (btn.dataset.food === food) {
            btn.style.borderColor = '#10b981';
            btn.style.background = '#dcfce7';
        } else {
            btn.style.borderColor = '#d1d5db';
            btn.style.background = 'white';
        }
    });

    // Auto-advance after selection (better UX)
    setTimeout(() => {
        wizardFinish();
    }, 500);
}

async function wizardFinish() {
    try {
        // Add medication
        const medResponse = await fetch(`${API_BASE}/medications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: wizardData.name,
                dosage: wizardData.dosage,
                form: wizardData.form || 'tablet',
                total_quantity: 30
            })
        });

        if (!medResponse.ok) {
            const error = await medResponse.json();
            showNotification(error.error || 'Failed to add medication', 'error');
            return;
        }

        const medData = await medResponse.json();
        const medicationId = medData.medication_id;

        // Add schedule if time was provided
        if (wizardData.time) {
            await fetch(`${API_BASE}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medication_id: medicationId,
                    time: wizardData.time,
                    frequency: wizardData.frequency || 'daily',
                    food_timing: wizardData.food_timing || 'anytime',
                    active: true
                })
            });
        }

        // Success!
        playSound('success');
        speak(`${wizardData.name} added successfully`);
        showNotification(`✅ ${wizardData.name} added!`, 'success');

        // Clean up
        document.getElementById('medication-wizard').remove();
        document.getElementById('medication-form').style.display = 'block';
        closeModal('add-medication-modal');

        // Reload data
        if (typeof loadMedications === 'function') loadMedications();
        if (typeof loadSchedules === 'function') loadSchedules();

    } catch (error) {
        console.error('Wizard error:', error);
        showNotification('Error adding medication', 'error');
    }
}

// Add wizard option to the add medication button
window.showMedicationWizardOption = function () {
    const choice = confirm('Would you like to use the simple 3-step wizard?\n\nClick OK for wizard (easier)\nClick Cancel for full form');

    if (choice) {
        showMedicationWizard();
    } else {
        showAddMedicationModal();
    }
};

// Export for use
window.medicationWizard = {
    show: showMedicationWizard,
    next: wizardNext,
    back: wizardBack,
    finish: wizardFinish
};
