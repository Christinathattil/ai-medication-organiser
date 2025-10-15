// AI Chatbot for Medication Manager
const API_BASE = window.location.hostname === 'localhost' 
  ? `http://localhost:${window.location.port || 8080}/api` 
  : '/api';

class MedicationChatbot {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    console.log('🤖 Chatbot initialized');
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.createChatbotUI();
        this.attachEventListeners();
        console.log('✅ Chatbot UI created');
      });
    } else {
      this.createChatbotUI();
      this.attachEventListeners();
      console.log('✅ Chatbot UI created');
    }
  }

  createChatbotUI() {
    const chatbotHTML = `
      <!-- Chatbot Toggle Button -->
      <button id="chatbot-toggle" class="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all" style="z-index: 9999;">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
      </button>

      <!-- Chatbot Sidebar -->
      <div id="chatbot-sidebar" class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col" style="z-index: 9998;">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            <h3 class="text-lg font-bold">AI Assistant</h3>
          </div>
          <button id="chatbot-close" class="text-white hover:text-gray-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Chat Messages -->
        <div id="chatbot-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          <div class="bg-blue-100 rounded-lg p-3 max-w-xs">
            <p class="text-sm text-gray-800">👋 Hi! I'm your medication assistant. I can help you:</p>
            <ul class="text-xs text-gray-700 mt-2 space-y-1">
              <li>• Add medications</li>
              <li>• Create schedules</li>
              <li>• Check today's plan</li>
              <li>• Log medications</li>
              <li>• View statistics</li>
            </ul>
            <p class="text-xs text-gray-600 mt-2">Try: "Add aspirin 500mg tablet for headache"</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t bg-white">
          <div class="flex space-x-2">
            <input 
              type="text" 
              id="chatbot-input" 
              placeholder="Ask me anything..."
              class="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button id="chatbot-send" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button class="quick-action text-xs bg-gray-200 px-3 py-1 rounded-full hover:bg-gray-300" data-action="today">Today's schedule</button>
            <button class="quick-action text-xs bg-gray-200 px-3 py-1 rounded-full hover:bg-gray-300" data-action="add">Add medication</button>
            <button class="quick-action text-xs bg-gray-200 px-3 py-1 rounded-full hover:bg-gray-300" data-action="stats">My stats</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');
    
    if (!toggleBtn || !closeBtn || !sendBtn || !input) {
      console.error('❌ Chatbot elements not found!');
      return;
    }
    
    toggleBtn.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.close());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      });
    });
    
    console.log('✅ Chatbot event listeners attached');
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const sidebar = document.getElementById('chatbot-sidebar');
    if (this.isOpen) {
      sidebar.classList.remove('translate-x-full');
    } else {
      sidebar.classList.add('translate-x-full');
    }
  }

  close() {
    this.isOpen = false;
    document.getElementById('chatbot-sidebar').classList.add('translate-x-full');
  }

  async sendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    if (!message) return;

    this.addMessage(message, 'user');
    input.value = '';

    // Process the message
    await this.processMessage(message);
  }

  addMessage(text, sender = 'bot') {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' 
      ? 'bg-blue-600 text-white rounded-lg p-3 max-w-xs ml-auto' 
      : 'bg-white border rounded-lg p-3 max-w-xs';
    messageDiv.innerHTML = `<p class="text-sm">${text}</p>`;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async processMessage(message) {
    const lowerMessage = message.toLowerCase();

    // Intent detection
    if (lowerMessage.includes('add') && (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('tablet') || lowerMessage.includes('capsule'))) {
      await this.handleAddMedication(message);
    } else if (lowerMessage.includes('schedule') && lowerMessage.includes('add')) {
      await this.handleAddSchedule(message);
    } else if (lowerMessage.includes('today') || lowerMessage.includes('schedule')) {
      await this.handleTodaySchedule();
    } else if (lowerMessage.includes('stat') || lowerMessage.includes('adherence')) {
      await this.handleStats();
    } else if (lowerMessage.includes('refill') || lowerMessage.includes('low')) {
      await this.handleRefillAlerts();
    } else if (lowerMessage.includes('log') || lowerMessage.includes('taken') || lowerMessage.includes('took')) {
      await this.handleLogMedication(message);
    } else {
      this.addMessage("I can help you with:\n• Adding medications\n• Creating schedules\n• Checking today's plan\n• Logging medications\n• Viewing statistics\n\nWhat would you like to do?");
    }
  }

  async handleAddMedication(message) {
    // Extract medication details using simple parsing
    const extracted = this.extractMedicationInfo(message);
    
    if (!extracted.name || !extracted.dosage) {
      this.addMessage("I need more details. Please provide:\n• Medication name\n• Dosage (e.g., 500mg)\n• Form (tablet/capsule/syrup)\n\nExample: 'Add aspirin 500mg tablet for headache'");
      return;
    }

    this.addMessage(`I'll add ${extracted.name} ${extracted.dosage} ${extracted.form} for you...`);

    try {
      const response = await fetch(`${API_BASE}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extracted)
      });

      if (response.ok) {
        const data = await response.json();
        this.addMessage(`✅ Successfully added ${extracted.name}! Would you like to create a schedule for it?`);
        
        // Auto-fill the form
        this.autoFillMedicationForm(extracted);
        
        // Reload medications list
        if (typeof loadMedications === 'function') {
          loadMedications();
        }
      } else {
        this.addMessage("❌ Sorry, I couldn't add the medication. Please try again.");
      }
    } catch (error) {
      this.addMessage("❌ Error adding medication. Please check your connection.");
    }
  }

  extractMedicationInfo(message) {
    const info = {
      name: '',
      dosage: '',
      form: 'tablet',
      purpose: '',
      total_quantity: 30
    };

    // Extract dosage (e.g., 500mg, 10ml, 2.5mg)
    const dosageMatch = message.match(/(\d+\.?\d*)\s*(mg|ml|g|mcg|iu)/i);
    if (dosageMatch) {
      info.dosage = dosageMatch[0];
    }

    // Extract form
    const forms = ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler'];
    for (const form of forms) {
      if (message.toLowerCase().includes(form)) {
        info.form = form;
        break;
      }
    }

    // Extract purpose
    const purposeKeywords = ['for', 'treats', 'treating'];
    for (const keyword of purposeKeywords) {
      const index = message.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        info.purpose = message.substring(index + keyword.length).trim();
        break;
      }
    }

    // Extract name (first word after 'add')
    const addIndex = message.toLowerCase().indexOf('add');
    if (addIndex !== -1) {
      const afterAdd = message.substring(addIndex + 3).trim();
      const words = afterAdd.split(' ');
      info.name = words[0];
    }

    return info;
  }

  autoFillMedicationForm(data) {
    // Switch to medications tab
    const medsTab = document.querySelector('[onclick*="medications"]');
    if (medsTab) medsTab.click();

    // Open the modal
    setTimeout(() => {
      if (typeof showAddMedicationModal === 'function') {
        showAddMedicationModal();
      }

      // Fill the form
      setTimeout(() => {
        const form = document.getElementById('add-medication-form');
        if (form) {
          if (data.name) form.querySelector('[name="name"]').value = data.name;
          if (data.dosage) form.querySelector('[name="dosage"]').value = data.dosage;
          if (data.form) form.querySelector('[name="form"]').value = data.form;
          if (data.purpose) form.querySelector('[name="purpose"]').value = data.purpose;
          if (data.total_quantity) form.querySelector('[name="total_quantity"]').value = data.total_quantity;
        }
      }, 100);
    }, 100);
  }

  async handleTodaySchedule() {
    try {
      const response = await fetch(`${API_BASE}/schedule/today`);
      const data = await response.json();

      if (data.schedules.length === 0) {
        this.addMessage("📅 You have no medications scheduled for today.");
        return;
      }

      let message = `📅 Today's Schedule (${data.schedules.length} medications):\n\n`;
      data.schedules.forEach(s => {
        const status = s.status === 'taken' ? '✅' : s.status === 'missed' ? '❌' : '⏰';
        message += `${status} ${s.time} - ${s.name} (${s.dosage})\n`;
      });

      this.addMessage(message);
    } catch (error) {
      this.addMessage("❌ Error fetching schedule.");
    }
  }

  async handleStats() {
    try {
      const response = await fetch(`${API_BASE}/stats/adherence?days=30`);
      const data = await response.json();

      if (data.statistics.length === 0) {
        this.addMessage("📊 No statistics available yet. Start logging your medications!");
        return;
      }

      let message = "📊 Your 30-day Adherence:\n\n";
      data.statistics.forEach(s => {
        message += `${s.medication_name}: ${s.adherence_rate}%\n`;
        message += `  ✅ Taken: ${s.taken_count} | ❌ Missed: ${s.missed_count}\n\n`;
      });

      this.addMessage(message);
    } catch (error) {
      this.addMessage("❌ Error fetching statistics.");
    }
  }

  async handleRefillAlerts() {
    try {
      const response = await fetch(`${API_BASE}/refill-alerts?threshold=7`);
      const data = await response.json();

      if (data.medications.length === 0) {
        this.addMessage("✅ All medications are well-stocked!");
        return;
      }

      let message = "⚠️ Medications needing refill:\n\n";
      data.medications.forEach(m => {
        message += `• ${m.name}: ${m.remaining_quantity} left\n`;
      });

      this.addMessage(message);
    } catch (error) {
      this.addMessage("❌ Error fetching refill alerts.");
    }
  }

  async handleAddSchedule(message) {
    this.addMessage("To create a schedule, I need:\n• Medication name\n• Time (e.g., 08:00)\n• Frequency (daily/weekly)\n\nExample: 'Schedule aspirin daily at 8am'");
  }

  async handleLogMedication(message) {
    this.addMessage("Which medication did you take? Please provide the name.");
  }

  handleQuickAction(action) {
    switch (action) {
      case 'today':
        this.handleTodaySchedule();
        break;
      case 'add':
        this.addMessage("What medication would you like to add? Please provide:\n• Name\n• Dosage\n• Form (tablet/capsule/etc.)");
        break;
      case 'stats':
        this.handleStats();
        break;
    }
  }
}

// Initialize chatbot when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.medicationChatbot = new MedicationChatbot();
});
