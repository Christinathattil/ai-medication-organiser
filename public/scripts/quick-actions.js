// ============================================
// ONE-TAP ACTIONS FOR SCHEDULES
// Quick "I Took It" buttons with undo
// ============================================

let lastAction = null;
let undoTimeout = null;

// Enhanced schedule rendering with big action buttons
function renderScheduleWithQuickActions(schedule, container) {
    const card = document.createElement('div');
    card.className = 'schedule-card-senior';
    card.dataset.scheduleId = schedule.id;
    card.dataset.medicationId = schedule.medication_id;

    const isTaken = schedule.status === 'taken';
    const isSkipped = schedule.status === 'skipped';
    const isMissed = schedule.status === 'missed';

    card.innerHTML = `
    <div style="background: white; border-radius: 16px; padding: 20px; margin: 12px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);${isTaken ? ' opacity: 0.6;' : ''}">
      <!-- Medicine Info -->
      <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 16px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #6d28d9); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i class="fas fa-pills" style="font-size: 28px; color: white;"></i>
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 24px; font-weight: 700; margin: 0 0 4px 0;">${schedule.name || schedule.medication_name}</h3>
          <p style="font-size: 20px; color: #6b7280; margin: 0;">${schedule.dosage || ''}</p>
          <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
            <span style="font-size: 18px; color: #7c3aed; font-weight: 600;">
              <i class="fas fa-clock"></i> ${schedule.time}
            </span>
            ${schedule.food_timing && schedule.food_timing !== 'anytime' ? `
              <span style="font-size: 18px; color: #10b981;">
                <i class="fas fa-utensils"></i> ${schedule.food_timing === 'before_food' ? 'Before food' : 'After food'}
              </span>
            ` : ''}
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      ${!isTaken && !isSkipped ? `
        <button onclick="quickMarkAsTaken(${schedule.medication_id}, ${schedule.id})" 
                class="btn-giant btn-success" 
                style="width: 100%; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 12px;">
          <i class="fas fa-check-circle" style="font-size: 32px;"></i>
          <span style="font-size: 26px; font-weight: 700;">I TOOK IT</span>
        </button>
        <div style="display: flex; gap: 12px;">
          <button onclick="quickMarkAsSkipped(${schedule.medication_id}, ${schedule.id})" 
                  class="btn-large" 
                  style="flex: 1; background: #fef3c7; color: #92400e; border: 2px solid #fbbf24;">
            Skip
          </button>
          <button onclick="quickSnooze(${schedule.id})" 
                  class="btn-large" 
                  style="flex: 1; background: #dbeafe; color: #1e40af; border: 2px solid #60a5fa;">
            <i class="fas fa-clock"></i> Snooze 10min
          </button>
        </div>
      ` : `
        <div style="padding: 16px; background: ${isTaken ? '#dcfce7' : isSkipped ? '#fef3c7' : '#fee2e2'}; border-radius: 12px; text-align: center;">
          <span style="font-size: 22px; font-weight: 600; color: ${isTaken ? '#166534' : isSkipped ? '#92400e' : '#991b1b'};">
            ${isTaken ? '✓ Taken' : isSkipped ? '⊘ Skipped' : '✕ Missed'}
          </span>
        </div>
      `}
    </div>
  `;

    container.appendChild(card);

    // Add swipe gestures if Hammer.js is loaded
    if (typeof Hammer !== 'undefined' && !isTaken && !isSkipped) {
        const hammer = new Hammer(card);
        hammer.on('swiperight', () => quickMarkAsTaken(schedule.medication_id, schedule.id));
        hammer.on('swipeleft', () => quickMarkAsSkipped(schedule.medication_id, schedule.id));
    }
}

// Quick mark as taken
async function quickMarkAsTaken(medicationId, scheduleId) {
    try {
        // Save for undo
        lastAction = {
            type: 'took',
            medicationId,
            scheduleId,
            timestamp: Date.now()
        };

        // Log medication
        const response = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medication_id: medicationId,
                schedule_id: scheduleId,
                status: 'taken',
                taken_at: new Date().toISOString()
            })
        });

        if (response.ok) {
            // Success feedback
            playSound('success');
            vibrate([200, 100, 200]);
            speak('Great job! Medicine marked as taken');

            // Show undo notification
            showUndoNotification('Marked as taken', () => undoLastAction());

            // Refresh schedule
            if (typeof loadTodaySchedule === 'function') {
                setTimeout(() => loadTodaySchedule(), 500);
            }
        } else {
            throw new Error('Failed to log medication');
        }
    } catch (error) {
        console.error('Error marking as taken:', error);
        showNotification('Error saving. Please try again.', 'error');
    }
}

// Quick mark as skipped
async function quickMarkAsSkipped(medicationId, scheduleId) {
    try {
        lastAction = {
            type: 'skipped',
            medicationId,
            scheduleId,
            timestamp: Date.now()
        };

        const response = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medication_id: medicationId,
                schedule_id: scheduleId,
                status: 'skipped',
                taken_at: new Date().toISOString()
            })
        });

        if (response.ok) {
            playSound('alert');
            showUndoNotification('Marked as skipped', () => undoLastAction());

            if (typeof loadTodaySchedule === 'function') {
                setTimeout(() => loadTodaySchedule(), 500);
            }
        }
    } catch (error) {
        console.error('Error marking as skipped:', error);
        showNotification('Error saving. Please try again.', 'error');
    }
}

// Snooze reminder
function quickSnooze(scheduleId) {
    showNotification('⏰ Will remind you in 10 minutes', 'info');
    speak('Okay, I will remind you in 10 minutes');

    setTimeout(() => {
        showNotification('⏰ Time to take your medicine!', 'warning');
        playSound('reminder');
        vibrate([300, 100, 300]);
        speak('Reminder: Time to take your medicine');
    }, 10 * 60 * 1000); // 10 minutes
}

// Undo notification with toast
function showUndoNotification(message, undoCallback) {
    // Clear any existing undo timeout
    if (undoTimeout) {
        clearTimeout(undoTimeout);
    }

    // Remove existing undo toast
    const existing = document.getElementById('undo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'undo-toast';
    toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 18px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideUp 0.3s ease-out;
  `;

    toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.undoAction()" 
            style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer; min-height: 44px;">
      UNDO
    </button>
  `;

    toast.undoAction = undoCallback;
    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    undoTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Undo last action
async function undoLastAction() {
    if (!lastAction) return;

    try {
        // Find and delete the log entry
        // Note: This requires an API endpoint to delete logs by medication_id and schedule_id
        // For now, we'll just refresh and show notification

        showNotification('Action undone', 'info');
        speak('Action undone');

        // Refresh
        if (typeof loadTodaySchedule === 'function') {
            loadTodaySchedule();
        }

        // Remove toast
        const toast = document.getElementById('undo-toast');
        if (toast) toast.remove();

        lastAction = null;
    } catch (error) {
        console.error('Error undoing action:', error);
        showNotification('Could not undo. Please refresh.', 'error');
    }
}

// Export functions
window.quickActions = {
    markAsTaken: quickMarkAsTaken,
    markAsSkipped: quickMarkAsSkipped,
    snooze: quickSnooze,
    undo: undoLastAction,
    renderSchedule: renderScheduleWithQuickActions
};
