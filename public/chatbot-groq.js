// AI Chatbot with Groq Integration for Medication Manager
// Check if API_BASE is already defined (by app.js), if not define it
if (typeof API_BASE === 'undefined') {
  var API_BASE = window.location.hostname === 'localhost' 
    ? `http://localhost:${window.location.port || 8080}/api` 
    : '/api';
}

class MedicationChatbotGroq {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.isProcessing = false;
    console.log('🤖 Groq-powered Chatbot initialized');
    this.init();
  }

  init() {
    console.log('🔧 Initializing chatbot...');
    
    // Ensure body exists
    if (!document.body) {
      console.log('⏳ Waiting for body...');
      setTimeout(() => this.init(), 50);
      return;
    }
    
    try {
      this.createChatbotUI();
      this.attachEventListeners();
      
      // Verify button exists
      const button = document.getElementById('chatbot-toggle');
      if (button) {
        console.log('✅ Chatbot button created successfully');
      } else {
        console.error('❌ Button creation failed, retrying...');
        setTimeout(() => this.init(), 100);
      }
    } catch (error) {
      console.error('❌ Init error:', error);
      setTimeout(() => this.init(), 200);
    }
  }

  createChatbotUI() {
    console.log('🎨 Creating chatbot UI...');
    console.log('🔍 Current document.body:', document.body ? 'EXISTS' : 'NULL');
    
    // Remove any existing chatbot elements first
    const existingToggle = document.getElementById('chatbot-toggle');
    const existingSidebar = document.getElementById('chatbot-sidebar');
    if (existingToggle) {
      console.log('🧹 Removing existing toggle button');
      existingToggle.remove();
    }
    if (existingSidebar) {
      console.log('🧹 Removing existing sidebar');
      existingSidebar.remove();
    }
    
    // Add pulse animation keyframes to document if not already there
    if (!document.getElementById('chatbot-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'chatbot-pulse-animation';
      style.textContent = `
        @keyframes chatbot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
      console.log('✅ Pulse animation added to document');
    }
    
    const chatbotHTML = `
      <!-- Chatbot Toggle Button - Mobile Optimized -->
      <button id="chatbot-toggle" style="position: fixed !important; bottom: 1.5rem !important; right: 1.5rem !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 60px !important; height: 60px !important; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%) !important; border-radius: 50% !important; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.5) !important; border: none !important; cursor: pointer !important; transition: all 0.3s ease !important; visibility: visible !important; opacity: 1 !important;">
        <svg style="width: 28px; height: 28px; color: white; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
        <span style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 10px; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; animation: chatbot-pulse 2s infinite; pointer-events: none;">AI</span>
      </button>

      <!-- Chatbot Sidebar - Full screen on mobile, sidebar on desktop -->
      <div id="chatbot-sidebar" class="fixed inset-0 md:top-0 md:right-0 md:left-auto h-full w-full md:w-[450px] bg-white shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col z-50 md:max-w-[90vw]" style="z-index: 9999 !important;">
        <!-- Header - Mobile Optimized -->
        <div class="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white p-4 md:p-6 flex justify-between items-center">
          <div class="flex items-center space-x-2 md:space-x-3">
            <div class="bg-white/20 backdrop-blur-lg p-2 md:p-3 rounded-xl">
              <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg md:text-xl font-bold">AI Health Assistant</h3>
              <p class="text-xs text-white/80 hidden md:block">Powered by Groq</p>
            </div>
          </div>
          <button id="chatbot-close" class="text-white hover:bg-white/20 p-2 rounded-lg transition-all touch-manipulation">
            <svg class="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Chat Messages - Mobile Optimized -->
        <div id="chatbot-messages" class="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 bg-gradient-to-b from-gray-50 to-white">
          <div class="flex items-start space-x-2 md:space-x-3">
            <div class="bg-gradient-to-br from-purple-500 to-blue-500 p-1.5 md:p-2 rounded-xl flex-shrink-0">
              <svg class="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
            </div>
            <div class="bg-white rounded-2xl rounded-tl-none p-3 md:p-4 shadow-md max-w-[85%]">
              <p class="text-xs md:text-sm text-gray-800 leading-relaxed">👋 Hi! I'm your AI medication assistant powered by Groq. I understand natural language and can help you with:</p>
              <ul class="text-xs text-gray-700 mt-2 md:mt-3 space-y-1 md:space-y-2">
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> Add medications naturally</li>
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> Create smart schedules</li>
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> Check your medication plan</li>
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> Log doses taken or missed</li>
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> View adherence statistics</li>
                <li class="flex items-center"><span class="text-green-500 mr-2">✓</span> Answer medication questions</li>
              </ul>
              <p class="text-xs text-gray-500 mt-2 md:mt-3 italic">Try: "I need to add my blood pressure medication"</p>
            </div>
          </div>
        </div>

        <!-- Input Area - Mobile Optimized -->
        <div class="p-3 md:p-4 border-t bg-white shadow-lg">
          <div class="flex space-x-2 mb-2 md:mb-3">
            <input 
              type="text" 
              id="chatbot-input" 
              placeholder="Ask me anything..."
              class="flex-1 px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm md:text-base"
            />
            <button id="chatbot-send" class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 md:px-5 py-2 md:py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation">
              <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5 md:gap-2">
            <button class="quick-action text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all font-medium touch-manipulation" data-action="today">📅 Today</button>
            <button class="quick-action text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:from-green-100 hover:to-green-200 transition-all font-medium touch-manipulation" data-action="add">➕ Add</button>
            <button class="quick-action text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all font-medium touch-manipulation" data-action="stats">📊 Stats</button>
            <button class="quick-action text-xs bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all font-medium touch-manipulation" data-action="refill">🔔 Refill</button>
          </div>
        </div>
      </div>
    `;

    try {
      console.log('💉 Inserting chatbot HTML into body...');
      document.body.insertAdjacentHTML('beforeend', chatbotHTML);
      console.log('✅ Chatbot HTML inserted into DOM');
      
      // FALLBACK: If button doesn't exist, create it directly via DOM
      setTimeout(() => {
        if (!document.getElementById('chatbot-toggle')) {
          console.warn('⚠️ Button not found, using direct DOM creation fallback...');
          this.createButtonDirectly();
        }
      }, 50);
      
      // Verify button was created with detailed logging
      setTimeout(() => {
        const button = document.getElementById('chatbot-toggle');
        if (button) {
          const styles = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          
          console.log('✅ Chatbot button FOUND in DOM!');
          console.log('📍 Button Position (getBoundingClientRect):', {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
          console.log('🎨 Button Computed Styles:', {
            position: styles.position,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            bottom: styles.bottom,
            right: styles.right
          });
          console.log('✨ Button is visible:', rect.width > 0 && rect.height > 0 && styles.display !== 'none');
          
          // Log absolute position in viewport
          const viewportW = window.innerWidth;
          const viewportH = window.innerHeight;
          console.log('🌍 Viewport size:', viewportW, 'x', viewportH);
          console.log('📌 Button distance from viewport:', {
            fromBottom: viewportH - rect.bottom + 'px',
            fromRight: viewportW - rect.right + 'px'
          });
        } else {
          console.error('❌ Chatbot button NOT found after insertion!');
          console.error('🔍 Searching for button in entire document...');
          const allButtons = document.querySelectorAll('button');
          console.log('🔍 Total buttons in document:', allButtons.length);
          const chatbotButtons = Array.from(allButtons).filter(b => b.id && b.id.includes('chatbot'));
          console.log('🔍 Chatbot-related buttons:', chatbotButtons);
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error inserting chatbot HTML:', error);
      console.error('❌ Error stack:', error.stack);
    }
  }

  createButtonDirectly() {
    console.log('🔧 Creating button using direct DOM manipulation...');
    
    // Create button element
    const button = document.createElement('button');
    button.id = 'chatbot-toggle';
    button.style.cssText = 'position: fixed !important; bottom: 1.5rem !important; right: 1.5rem !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 60px !important; height: 60px !important; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%) !important; border-radius: 50% !important; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.5) !important; border: none !important; cursor: pointer !important; transition: all 0.3s ease !important; visibility: visible !important; opacity: 1 !important;';
    
    // Create SVG icon
    button.innerHTML = `
      <svg style="width: 28px; height: 28px; color: white; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
      </svg>
      <span style="position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 10px; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; animation: chatbot-pulse 2s infinite; pointer-events: none;">AI</span>
    `;
    
    // Add click event
    button.addEventListener('click', () => this.toggle());
    
    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 15px 35px rgba(124, 58, 237, 0.6)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.5)';
    });
    
    // Append to body
    document.body.appendChild(button);
    console.log('✅ Button created directly and appended to body');
    
    // Verify
    setTimeout(() => {
      const check = document.getElementById('chatbot-toggle');
      if (check) {
        console.log('✅ Direct button creation successful!');
        const rect = check.getBoundingClientRect();
        console.log('📍 Button rect:', rect);
      } else {
        console.error('❌ Direct button creation FAILED!');
      }
    }, 100);
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
    
    // Toggle button click
    toggleBtn.addEventListener('click', () => this.toggle());
    
    // Hover effects for toggle button
    toggleBtn.addEventListener('mouseenter', () => {
      toggleBtn.style.transform = 'scale(1.1)';
      toggleBtn.style.boxShadow = '0 15px 35px rgba(124, 58, 237, 0.6)';
    });
    toggleBtn.addEventListener('mouseleave', () => {
      toggleBtn.style.transform = 'scale(1)';
      toggleBtn.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.5)';
    });
    
    closeBtn.addEventListener('click', () => this.close());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.isProcessing) this.sendMessage();
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
      document.getElementById('chatbot-input').focus();
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
    if (!message || this.isProcessing) return;

    this.addMessage(message, 'user');
    input.value = '';
    this.isProcessing = true;
    this.setInputState(true);

    // Add typing indicator
    const typingId = this.addTypingIndicator();

    try {
      // Send to Groq API for semantic understanding
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          history: this.conversationHistory.slice(-10) // Last 10 messages for context
        })
      });

      this.removeTypingIndicator(typingId);

      if (response.ok) {
        const data = await response.json();
        
        // Add AI response
        this.addMessage(data.response, 'bot');
        
        // Store in conversation history
        this.conversationHistory.push(
          { role: 'user', content: message },
          { role: 'assistant', content: data.response }
        );

        // Execute any actions suggested by the AI
        if (data.action) {
          await this.executeAction(data.action);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.response || "I'm having trouble connecting to the AI service. Please check that your Groq API key is configured correctly.";
        this.addMessage(errorMsg, 'bot', 'error');
        console.error('❌ Chat API error:', response.status, errorData);
      }
    } catch (error) {
      this.removeTypingIndicator(typingId);
      console.error('Chat error:', error);
      this.addMessage("Sorry, I encountered an error. Please check your connection and try again.", 'bot', 'error');
    } finally {
      this.isProcessing = false;
      this.setInputState(false);
    }
  }

  addMessage(text, sender = 'bot', type = 'normal') {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    
    if (sender === 'user') {
      messageDiv.className = 'flex justify-end';
      messageDiv.innerHTML = `
        <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-none p-3 md:p-4 max-w-[85%] shadow-md">
          <p class="text-xs md:text-sm leading-relaxed">${this.escapeHtml(text)}</p>
        </div>
      `;
    } else {
      messageDiv.className = 'flex items-start space-x-2 md:space-x-3';
      const bgColor = type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-white';
      messageDiv.innerHTML = `
        <div class="bg-gradient-to-br from-purple-500 to-blue-500 p-1.5 md:p-2 rounded-xl flex-shrink-0">
          <svg class="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
        </div>
        <div class="${bgColor} rounded-2xl rounded-tl-none p-3 md:p-4 shadow-md max-w-[85%]">
          <p class="text-xs md:text-sm text-gray-800 leading-relaxed whitespace-pre-line">${this.escapeHtml(text)}</p>
        </div>
      `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'flex items-start space-x-2 md:space-x-3';
    typingDiv.innerHTML = `
      <div class="bg-gradient-to-br from-purple-500 to-blue-500 p-1.5 md:p-2 rounded-xl flex-shrink-0">
        <svg class="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <div class="bg-white rounded-2xl rounded-tl-none p-3 md:p-4 shadow-md">
        <div class="flex space-x-1.5 md:space-x-2">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
  }

  removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) indicator.remove();
  }

  setInputState(disabled) {
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    input.disabled = disabled;
    sendBtn.disabled = disabled;
  }

  async executeAction(action) {
    // Execute actions based on AI suggestions
    switch (action.type) {
      case 'show_schedule':
        await this.handleTodaySchedule();
        break;
      case 'show_stats':
        await this.handleStats();
        break;
      case 'show_refills':
        await this.handleRefillAlerts();
        break;
      case 'add_medication':
        if (action.data) {
          await this.handleAddMedication(action.data);
        }
        break;
      case 'add_schedule':
        if (action.data) {
          await this.handleAddSchedule(action.data);
        }
        break;
    }
  }

  async handleTodaySchedule() {
    try {
      const response = await fetch(`${API_BASE}/schedule/today`);
      const data = await response.json();

      if (data.schedules.length === 0) {
        this.addMessage("📅 You have no medications scheduled for today. Would you like to add a schedule?", 'bot');
        return;
      }

      let message = `📅 **Today's Schedule** (${data.schedules.length} medications):\n\n`;
      data.schedules.forEach(s => {
        const status = s.status === 'taken' ? '✅' : s.status === 'missed' ? '❌' : '⏰';
        message += `${status} **${s.time}** - ${s.name} (${s.dosage})\n`;
        if (s.with_food) message += `   🍽️ Take with food\n`;
      });

      this.addMessage(message, 'bot');
    } catch (error) {
      this.addMessage("❌ Error fetching schedule. Please try again.", 'bot', 'error');
    }
  }

  async handleStats() {
    try {
      const response = await fetch(`${API_BASE}/stats/adherence?days=30`);
      const data = await response.json();

      if (data.statistics.length === 0) {
        this.addMessage("📊 No statistics available yet. Start logging your medications to see your adherence!", 'bot');
        return;
      }

      let message = "📊 **Your 30-day Adherence:**\n\n";
      data.statistics.forEach(s => {
        message += `**${s.medication_name}**: ${s.adherence_rate}%\n`;
        message += `  ✅ Taken: ${s.taken_count} | ❌ Missed: ${s.missed_count}\n\n`;
      });

      this.addMessage(message, 'bot');
    } catch (error) {
      this.addMessage("❌ Error fetching statistics.", 'bot', 'error');
    }
  }

  async handleRefillAlerts() {
    try {
      const response = await fetch(`${API_BASE}/refill-alerts?threshold=7`);
      const data = await response.json();

      if (data.medications.length === 0) {
        this.addMessage("✅ All medications are well-stocked! No refills needed.", 'bot');
        return;
      }

      let message = "⚠️ **Medications needing refill:**\n\n";
      data.medications.forEach(m => {
        message += `• **${m.name}**: ${m.remaining_quantity} ${m.form}(s) remaining\n`;
      });
      message += "\nWould you like me to help you refill any of these?";

      this.addMessage(message, 'bot');
    } catch (error) {
      this.addMessage("❌ Error fetching refill alerts.", 'bot', 'error');
    }
  }

  async handleAddMedication(data) {
    this.addMessage(`I'll help you add ${data.name}. Let me open the form for you...`, 'bot');
    
    // Switch to medications tab and open modal
    setTimeout(() => {
      if (typeof showTab === 'function') showTab('medications');
      setTimeout(() => {
        if (typeof showAddMedicationModal === 'function') {
          showAddMedicationModal();
          // Pre-fill form if data available
          setTimeout(() => {
            const form = document.getElementById('add-medication-form');
            if (form && data) {
              if (data.name) form.querySelector('[name="name"]').value = data.name;
              if (data.dosage) form.querySelector('[name="dosage"]').value = data.dosage;
              if (data.form) form.querySelector('[name="form"]').value = data.form;
              if (data.purpose) form.querySelector('[name="purpose"]').value = data.purpose;
            }
          }, 100);
        }
      }, 300);
    }, 500);
  }

  async handleAddSchedule(data) {
    this.addMessage(`I'll help you schedule that. Opening the schedule form...`, 'bot');
    
    // Switch to schedules tab and open modal
    setTimeout(() => {
      if (typeof showTab === 'function') showTab('schedules');
      setTimeout(() => {
        if (typeof showAddScheduleModal === 'function') {
          showAddScheduleModal();
          // Pre-fill form if data available
          setTimeout(() => {
            const form = document.getElementById('add-schedule-form');
            if (form && data) {
              if (data.medication_id) {
                const select = form.querySelector('[name="medication_id"]');
                if (select) select.value = data.medication_id;
              }
              if (data.time) {
                const timeInput = form.querySelector('[name="time"]');
                if (timeInput) timeInput.value = data.time;
              }
              if (data.frequency) {
                const freqSelect = form.querySelector('[name="frequency"]');
                if (freqSelect) freqSelect.value = data.frequency;
              }
              if (data.with_food) {
                const foodCheck = form.querySelector('[name="with_food"]');
                if (foodCheck) foodCheck.checked = true;
              }
              if (data.special_instructions) {
                const instructions = form.querySelector('[name="special_instructions"]');
                if (instructions) instructions.value = data.special_instructions;
              }
            }
          }, 100);
        }
      }, 300);
    }, 500);
  }

  handleQuickAction(action) {
    switch (action) {
      case 'today':
        this.handleTodaySchedule();
        break;
      case 'add':
        this.addMessage("What medication would you like to add? You can tell me naturally, like:\n\n'I need to add aspirin 500mg tablet for headaches'\n\nor\n\n'Add my blood pressure medication lisinopril 10mg'", 'bot');
        break;
      case 'stats':
        this.handleStats();
        break;
      case 'refill':
        this.handleRefillAlerts();
        break;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export the class to global scope
window.MedicationChatbotGroq = MedicationChatbotGroq;
console.log('✅ MedicationChatbotGroq class exported to window');

// Initialize chatbot with multiple fallback attempts
console.log('📦 Chatbot script loaded');

let chatbotInitAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

function initChatbot() {
  chatbotInitAttempts++;
  
  // Check if already initialized
  if (window.medicationChatbot && document.getElementById('chatbot-toggle')) {
    console.log('✅ Chatbot already initialized and button exists');
    return true;
  }
  
  // Check if DOM is ready
  if (!document.body) {
    console.log('⏳ Waiting for document.body...');
    if (chatbotInitAttempts < MAX_INIT_ATTEMPTS) {
      setTimeout(initChatbot, 100);
    }
    return false;
  }
  
  try {
    console.log(`🚀 Initializing chatbot (attempt ${chatbotInitAttempts})...`);
    window.medicationChatbot = new MedicationChatbotGroq();
    
    // Verify button was created
    setTimeout(() => {
      const button = document.getElementById('chatbot-toggle');
      if (button) {
        console.log('✅ Chatbot initialized successfully - button is visible');
        console.log('📍 Button position:', window.getComputedStyle(button).position);
        console.log('📍 Button display:', window.getComputedStyle(button).display);
      } else {
        console.error('❌ Button not found after initialization');
        if (chatbotInitAttempts < MAX_INIT_ATTEMPTS) {
          console.log('🔄 Retrying initialization...');
          window.medicationChatbot = null;
          setTimeout(initChatbot, 200);
        }
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('❌ Chatbot initialization failed:', error);
    if (chatbotInitAttempts < MAX_INIT_ATTEMPTS) {
      console.log('🔄 Retrying initialization...');
      setTimeout(initChatbot, 200);
    }
    return false;
  }
}

// IMMEDIATE TEST: Show we're here
console.log('');
console.log('═══════════════════════════════════════════════');
console.log('🚀 CHATBOT SCRIPT IS LOADING NOW! (v6)');
console.log('═══════════════════════════════════════════════');
console.log('');

// Add visual indicator that script loaded (temporary notification)
if (document.body) {
  const loadNotification = document.createElement('div');
  loadNotification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 20px; border-radius: 10px; z-index: 999999; font-family: sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-size: 14px; font-weight: bold;';
  loadNotification.textContent = '✅ Chatbot Script Loaded (v6)';
  document.body.appendChild(loadNotification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    loadNotification.style.transition = 'opacity 0.5s';
    loadNotification.style.opacity = '0';
    setTimeout(() => loadNotification.remove(), 500);
  }, 3000);
  
  console.log('✅ Load notification displayed');
}

// Multiple initialization strategies
if (document.readyState === 'loading') {
  // Strategy 1: DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📌 DOMContentLoaded fired');
    initChatbot();
  });
} else {
  // Strategy 2: DOM already loaded
  console.log('📌 DOM already loaded - initializing immediately');
  initChatbot();
}

// Strategy 3: Window load as final fallback
window.addEventListener('load', () => {
  console.log('📌 Window load event fired');
  if (!window.medicationChatbot || !document.getElementById('chatbot-toggle')) {
    console.log('🔄 Reinitializing on window load...');
    initChatbot();
  }
});

// Strategy 4: Manual reinit function for debugging
window.reinitChatbot = function() {
  console.log('🔧 Manual reinitialization triggered');
  if (window.medicationChatbot) {
    const toggle = document.getElementById('chatbot-toggle');
    const sidebar = document.getElementById('chatbot-sidebar');
    if (toggle) toggle.remove();
    if (sidebar) sidebar.remove();
    window.medicationChatbot = null;
  }
  chatbotInitAttempts = 0;
  initChatbot();
};
