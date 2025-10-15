// Dynamically get the API base URL based on current port
const API_BASE = window.location.hostname === 'localhost' 
  ? `http://localhost:${window.location.port || 8080}/api`
  : '/api';

console.log('✅ API Base URL:', API_BASE);

// Tab Management
window.showTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  document.getElementById(`${tabName}-tab`).classList.remove('hidden');
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-blue-100', 'text-blue-700');
    btn.classList.add('text-gray-700');
  });
  
  // Find and activate the correct tab button
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tabName)) {
      btn.classList.add('bg-blue-100', 'text-blue-700');
      btn.classList.remove('text-gray-700');
    }
  });
  
  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'medications') loadMedications();
  if (tabName === 'schedules') loadSchedules();
  if (tabName === 'history') loadHistory();
  if (tabName === 'stats') loadAdherenceStats();
}

// Modal Management
window.showAddMedicationModal = function() {
  document.getElementById('add-medication-modal').classList.add('active');
}

window.showAddScheduleModal = function() {
  loadMedicationsForSchedule();
  document.getElementById('add-schedule-modal').classList.add('active');
}

window.closeModal = function(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Dashboard Functions
async function loadDashboard() {
  await Promise.all([
    loadQuickStats(),
    loadRefillAlerts(),
    loadTodaySchedule()
  ]);
}

async function loadQuickStats() {
  try {
    const [medsRes, scheduleRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/medications?active_only=true`),
      fetch(`${API_BASE}/schedule/today`),
      fetch(`${API_BASE}/stats/adherence?days=7`)
    ]);
    
    const meds = await medsRes.json();
    const schedule = await scheduleRes.json();
    const stats = await statsRes.json();
    
    document.getElementById('stat-active-meds').textContent = meds.medications.length;
    document.getElementById('stat-today-doses').textContent = schedule.schedules.length;
    
    const avgAdherence = stats.statistics.length > 0
      ? (stats.statistics.reduce((sum, s) => sum + parseFloat(s.adherence_rate), 0) / stats.statistics.length).toFixed(1)
      : 0;
    document.getElementById('stat-adherence').textContent = `${avgAdherence}%`;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadRefillAlerts() {
  try {
    const res = await fetch(`${API_BASE}/refill-alerts?threshold=7`);
    const data = await res.json();
    
    const container = document.getElementById('refill-list');
    
    if (data.medications.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No medications need refilling.</p>';
      return;
    }
    
    container.innerHTML = data.medications.map(med => `
      <div class="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg mb-2">
        <div>
          <p class="font-semibold text-gray-900">${med.name}</p>
          <p class="text-sm text-gray-600">${med.remaining_quantity} ${med.form}(s) remaining</p>
        </div>
        <button onclick="refillMedication(${med.id}, ${med.total_quantity})" 
          class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
          <i class="fas fa-plus mr-2"></i>Refill
        </button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading refill alerts:', error);
  }
}

async function loadTodaySchedule() {
  try {
    const res = await fetch(`${API_BASE}/schedule/today`);
    const data = await res.json();
    
    const container = document.getElementById('today-schedule');
    
    if (data.schedules.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No medications scheduled for today.</p>';
      return;
    }
    
    container.innerHTML = data.schedules.map(schedule => `
      <div class="flex items-center justify-between p-4 border rounded-lg mb-3">
        <div class="flex-1">
          <div class="flex items-center">
            <span class="text-lg font-semibold text-gray-900">${schedule.time}</span>
            <span class="ml-3 px-3 py-1 rounded-full text-sm status-${schedule.status}">
              ${schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
            </span>
          </div>
          <p class="text-gray-900 font-medium mt-1">${schedule.name} - ${schedule.dosage}</p>
          ${schedule.with_food ? '<p class="text-sm text-gray-600"><i class="fas fa-utensils mr-1"></i>Take with food</p>' : ''}
          ${schedule.special_instructions ? `<p class="text-sm text-gray-600">${schedule.special_instructions}</p>` : ''}
        </div>
        <div class="flex space-x-2">
          ${schedule.status === 'pending' ? `
            <button onclick="logMedication(${schedule.medication_id}, ${schedule.id}, 'taken')" 
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <i class="fas fa-check"></i> Taken
            </button>
            <button onclick="logMedication(${schedule.medication_id}, ${schedule.id}, 'missed')" 
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <i class="fas fa-times"></i> Missed
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading today schedule:', error);
  }
}

// Medications Functions
async function loadMedications() {
  try {
    const search = document.getElementById('search-meds')?.value || '';
    const res = await fetch(`${API_BASE}/medications?search=${search}`);
    const data = await res.json();
    
    const container = document.getElementById('medications-list');
    
    if (data.medications.length === 0) {
      container.innerHTML = '<p class="text-gray-500 col-span-3">No medications found.</p>';
      return;
    }
    
    container.innerHTML = data.medications.map(med => `
      <div class="bg-white rounded-lg shadow-sm p-6 card">
        ${med.photo_url ? `<img src="${med.photo_url}" alt="${med.name}" class="w-full h-32 object-cover rounded-lg mb-4">` : ''}
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${med.name}</h3>
            <p class="text-sm text-gray-600">${med.dosage} - ${med.form}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs ${med.remaining_quantity > 7 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}">
            ${med.remaining_quantity || 0} left
          </span>
        </div>
        
        ${med.purpose ? `<p class="text-sm text-gray-700 mb-2"><strong>Purpose:</strong> ${med.purpose}</p>` : ''}
        ${med.prescribing_doctor ? `<p class="text-sm text-gray-600 mb-2"><i class="fas fa-user-md mr-1"></i>${med.prescribing_doctor}</p>` : ''}
        ${med.side_effects ? `<p class="text-sm text-gray-600 mb-2"><i class="fas fa-exclamation-circle mr-1"></i>${med.side_effects}</p>` : ''}
        
        <div class="flex justify-between items-center mt-4 pt-4 border-t">
          <button onclick="viewMedication(${med.id})" class="text-blue-600 hover:text-blue-700">
            <i class="fas fa-eye mr-1"></i>View
          </button>
          <button onclick="deleteMedication(${med.id})" class="text-red-600 hover:text-red-700">
            <i class="fas fa-trash mr-1"></i>Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading medications:', error);
  }
}

function searchMedications() {
  loadMedications();
}

async function addMedication(event) {
  event.preventDefault();
  console.log('🔵 Adding medication...');
  
  const formData = new FormData(event.target);
  
  // Remove empty values to avoid sending empty strings
  const cleanedData = new FormData();
  for (let [key, value] of formData.entries()) {
    // Only add non-empty values, or if it's a file
    if (value instanceof File) {
      if (value.size > 0) {
        cleanedData.append(key, value);
        console.log(`  ${key}: [File: ${value.name}]`);
      }
    } else if (value && value.trim() !== '') {
      cleanedData.append(key, value.trim());
      console.log(`  ${key}: ${value}`);
    }
  }
  
  try {
    console.log('📤 Sending to API...');
    const res = await fetch(`${API_BASE}/medications`, {
      method: 'POST',
      body: cleanedData
    });
    
    console.log('📥 Response status:', res.status);
    
    if (res.ok) {
      const data = await res.json();
      console.log('✅ Success:', data);
      closeModal('add-medication-modal');
      event.target.reset();
      loadMedications();
      showNotification('Medication added successfully!', 'success');
    } else {
      const errorText = await res.text();
      console.error('❌ Server error:', errorText);
      showNotification('Error: ' + errorText, 'error');
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    showNotification('Error adding medication: ' + error.message, 'error');
  }
}

async function viewMedication(id) {
  try {
    const res = await fetch(`${API_BASE}/medications/${id}`);
    const data = await res.json();
    
    if (data.medication) {
      const med = data.medication;
      alert(`Medication Details:

Name: ${med.name}
Dosage: ${med.dosage}
Form: ${med.form}
${med.purpose ? `Purpose: ${med.purpose}` : ''}
${med.prescribing_doctor ? `Doctor: ${med.prescribing_doctor}` : ''}
${med.total_quantity ? `Quantity: ${med.remaining_quantity || 0}/${med.total_quantity}` : ''}
${med.side_effects ? `Side Effects: ${med.side_effects}` : ''}
${med.notes ? `Notes: ${med.notes}` : ''}`);
    }
  } catch (error) {
    console.error('Error viewing medication:', error);
    showNotification('Error loading medication details', 'error');
  }
}

async function deleteMedication(id) {
  if (!confirm('Are you sure you want to delete this medication?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/medications/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadMedications();
      showNotification('Medication deleted', 'success');
    }
  } catch (error) {
    console.error('Error deleting medication:', error);
  }
}

async function refillMedication(id, quantity) {
  try {
    const res = await fetch(`${API_BASE}/medications/${id}/quantity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_change: quantity, is_refill: true })
    });
    
    if (res.ok) {
      loadDashboard();
      showNotification('Medication refilled!', 'success');
    }
  } catch (error) {
    console.error('Error refilling medication:', error);
  }
}

// Schedules Functions
async function loadSchedules() {
  try {
    const res = await fetch(`${API_BASE}/schedules`);
    const data = await res.json();
    
    const container = document.getElementById('schedules-list');
    
    if (data.schedules.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No schedules found.</p>';
      return;
    }
    
    container.innerHTML = data.schedules.map(schedule => `
      <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${schedule.medication_name}</h3>
            <p class="text-gray-600 mt-1">
              <i class="fas fa-clock mr-2"></i>${schedule.time} - ${schedule.frequency}
            </p>
            ${schedule.days_of_week ? `<p class="text-sm text-gray-600 mt-1">${schedule.days_of_week}</p>` : ''}
            ${schedule.with_food ? '<p class="text-sm text-gray-600 mt-1"><i class="fas fa-utensils mr-1"></i>Take with food</p>' : ''}
            ${schedule.special_instructions ? `<p class="text-sm text-gray-600 mt-1">${schedule.special_instructions}</p>` : ''}
            <p class="text-sm text-gray-500 mt-2">
              ${schedule.start_date} ${schedule.end_date ? `to ${schedule.end_date}` : '(ongoing)'}
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-3 py-1 rounded-full text-sm ${schedule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
              ${schedule.active ? 'Active' : 'Inactive'}
            </span>
            <button onclick="toggleSchedule(${schedule.id}, ${!schedule.active})" 
              class="text-blue-600 hover:text-blue-700">
              <i class="fas fa-toggle-${schedule.active ? 'on' : 'off'}"></i>
            </button>
            <button onclick="deleteSchedule(${schedule.id})" class="text-red-600 hover:text-red-700">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading schedules:', error);
  }
}

async function loadMedicationsForSchedule() {
  try {
    const res = await fetch(`${API_BASE}/medications`);
    const data = await res.json();
    
    const select = document.getElementById('schedule-medication-select');
    select.innerHTML = '<option value="">Select medication</option>' + 
      data.medications.map(med => `<option value="${med.id}">${med.name} (${med.dosage})</option>`).join('');
  } catch (error) {
    console.error('Error loading medications:', error);
  }
}

async function addSchedule(event) {
  event.preventDefault();
  console.log('🔵 Adding schedule...');
  
  const formData = new FormData(event.target);
  const data = {};
  
  // Only include non-empty values
  for (let [key, value] of formData.entries()) {
    if (value && value.trim() !== '') {
      data[key] = value.trim();
    }
  }
  
  // Handle checkbox separately
  data.with_food = formData.get('with_food') === 'on';
  
  console.log('Schedule data:', data);
  
  try {
    console.log('📤 Sending to API...');
    const res = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log('📥 Response status:', res.status);
    
    if (res.ok) {
      const result = await res.json();
      console.log('✅ Success:', result);
      closeModal('add-schedule-modal');
      event.target.reset();
      loadSchedules();
      showNotification('Schedule added successfully!', 'success');
    } else {
      const errorText = await res.text();
      console.error('❌ Server error:', errorText);
      showNotification('Error: ' + errorText, 'error');
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    showNotification('Error adding schedule: ' + error.message, 'error');
  }
}

async function toggleSchedule(id, active) {
  try {
    const res = await fetch(`${API_BASE}/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    
    if (res.ok) {
      loadSchedules();
      showNotification(`Schedule ${active ? 'activated' : 'deactivated'}`, 'success');
    }
  } catch (error) {
    console.error('Error toggling schedule:', error);
  }
}

async function deleteSchedule(id) {
  if (!confirm('Are you sure you want to delete this schedule?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadSchedules();
      showNotification('Schedule deleted', 'success');
    }
  } catch (error) {
    console.error('Error deleting schedule:', error);
  }
}

// Logging Functions
async function logMedication(medicationId, scheduleId, status) {
  try {
    const res = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medication_id: medicationId, schedule_id: scheduleId, status })
    });
    
    if (res.ok) {
      loadTodaySchedule();
      loadQuickStats();
      showNotification(`Medication marked as ${status}`, 'success');
    }
  } catch (error) {
    console.error('Error logging medication:', error);
  }
}

// History Functions
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/logs?limit=100`);
    const data = await res.json();
    
    const container = document.getElementById('history-list');
    
    if (data.history.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No history found.</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left py-3 px-4">Date & Time</th>
            <th class="text-left py-3 px-4">Medication</th>
            <th class="text-left py-3 px-4">Dosage</th>
            <th class="text-left py-3 px-4">Status</th>
            <th class="text-left py-3 px-4">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data.history.map(log => `
            <tr class="border-b hover:bg-gray-50">
              <td class="py-3 px-4">${new Date(log.taken_at).toLocaleString()}</td>
              <td class="py-3 px-4">${log.medication_name}</td>
              <td class="py-3 px-4">${log.dosage}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-1 rounded-full text-xs status-${log.status}">
                  ${log.status}
                </span>
              </td>
              <td class="py-3 px-4">${log.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Stats Functions
async function loadAdherenceStats() {
  try {
    const days = document.getElementById('stats-period')?.value || 30;
    const res = await fetch(`${API_BASE}/stats/adherence?days=${days}`);
    const data = await res.json();
    
    const container = document.getElementById('stats-list');
    
    if (data.statistics.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No statistics available.</p>';
      return;
    }
    
    container.innerHTML = data.statistics.map(stat => `
      <div class="bg-white border rounded-lg p-6 mb-4">
        <h3 class="text-lg font-bold text-gray-900 mb-4">${stat.medication_name}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p class="text-sm text-gray-600">Total Logs</p>
            <p class="text-2xl font-bold text-gray-900">${stat.total_logs}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Taken</p>
            <p class="text-2xl font-bold text-green-600">${stat.taken_count}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Missed</p>
            <p class="text-2xl font-bold text-red-600">${stat.missed_count}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Adherence Rate</p>
            <p class="text-2xl font-bold text-blue-600">${stat.adherence_rate}%</p>
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="bg-blue-600 h-4 rounded-full" style="width: ${stat.adherence_rate}%"></div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  }`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  
  // Set default date for schedule form
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.querySelector('[name="start_date"]');
  if (startDateInput) {
    startDateInput.value = today;
  }
  
  // Register service worker for PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  }
  
  // Add install prompt for PWA
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    const installBtn = document.createElement('button');
    installBtn.className = 'fixed bottom-20 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-green-700 z-40';
    installBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Install App';
    installBtn.onclick = async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        installBtn.remove();
      }
      deferredPrompt = null;
    };
    document.body.appendChild(installBtn);
  });
});
