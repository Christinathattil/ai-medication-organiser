// Simple AI Chatbot - Guaranteed to work!
console.log('🤖 Loading chatbot...');

// Wait for page to fully load
window.addEventListener('load', function() {
  console.log('📄 Page loaded, creating chatbot...');
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'ai-chat-button';
  button.innerHTML = '💬';
  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 28px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    transition: transform 0.2s;
  `;
  
  button.onmouseover = function() {
    this.style.transform = 'scale(1.1)';
  };
  
  button.onmouseout = function() {
    this.style.transform = 'scale(1)';
  };
  
  button.onclick = function() {
    toggleChat();
  };
  
  document.body.appendChild(button);
  console.log('✅ Chatbot button created!');
  
  // Create the chat panel
  const chatPanel = document.createElement('div');
  chatPanel.id = 'ai-chat-panel';
  chatPanel.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 24px;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 999998;
    display: none;
    flex-direction: column;
    overflow: hidden;
  `;
  
  chatPanel.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
      <span>🤖 AI Assistant</span>
      <button onclick="toggleChat()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
    </div>
    <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f5f5f5;">
      <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
        <strong>👋 Hi! I'm your AI assistant!</strong><br><br>
        Try these commands:<br>
        • "Add aspirin 500mg tablet"<br>
        • "Show today's schedule"<br>
        • "What needs refilling?"
      </div>
    </div>
    <div style="padding: 16px; border-top: 1px solid #ddd; background: white;">
      <input 
        type="text" 
        id="chat-input" 
        placeholder="Type a command..." 
        style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"
        onkeypress="if(event.key==='Enter') sendMessage()"
      >
      <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="quickAction('today')" style="padding: 6px 12px; background: #f0f0f0; border: none; border-radius: 16px; font-size: 12px; cursor: pointer;">Today's Schedule</button>
        <button onclick="quickAction('add')" style="padding: 6px 12px; background: #f0f0f0; border: none; border-radius: 16px; font-size: 12px; cursor: pointer;">Add Medication</button>
        <button onclick="quickAction('stats')" style="padding: 6px 12px; background: #f0f0f0; border: none; border-radius: 16px; font-size: 12px; cursor: pointer;">My Stats</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatPanel);
  console.log('✅ Chatbot panel created!');
});

function toggleChat() {
  const panel = document.getElementById('ai-chat-panel');
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
  } else {
    panel.style.display = 'none';
  }
}

function addChatMessage(message, isUser = false) {
  const messagesDiv = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `
    background: ${isUser ? '#667eea' : '#e3f2fd'};
    color: ${isUser ? 'white' : 'black'};
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    ${isUser ? 'margin-left: 40px;' : 'margin-right: 40px;'}
  `;
  msgDiv.textContent = message;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  addChatMessage(message, true);
  input.value = '';
  
  // Process the message
  setTimeout(() => {
    processAICommand(message);
  }, 500);
}

function processAICommand(message) {
  const lower = message.toLowerCase();
  
  // Check if it's a schedule creation command (has time)
  const timeMatch = message.match(/at\s+(\d{1,2}):(\d{2})/i);
  
  if (lower.includes('schedule') && timeMatch) {
    // Extract schedule details: "schedule aspirin at 10:00 daily" or "add schedule for aspirin at 10:00"
    const medMatch = message.match(/(?:for|schedule)\s+(\w+)/i);
    const freqMatch = message.match(/(daily|weekly|as needed)/i);
    
    if (medMatch) {
      const [, hour, minute] = timeMatch;
      const medName = medMatch[1];
      const frequency = freqMatch ? freqMatch[1].toLowerCase().replace(' ', '_') : 'daily';
      
      addChatMessage(`I'll create a ${frequency} schedule for ${medName} at ${hour}:${minute}. Opening the form...`);
      
      // Switch to schedules tab
      showTab('schedules');
      
      setTimeout(async () => {
        // Load medications first
        try {
          console.log('🔍 Fetching medications...');
          const res = await fetch(`${API_BASE}/medications`);
          const data = await res.json();
          console.log('📋 Medications:', data.medications);
          
          // Find the medication by name
          const medication = data.medications.find(m => 
            m.name.toLowerCase().includes(medName.toLowerCase())
          );
          
          if (medication) {
            console.log('✅ Found medication:', medication);
            
            // Open the modal FIRST
            console.log('🔓 Opening modal...');
            showAddScheduleModal();
            
            // Wait for modal to open, then fill the form
            setTimeout(() => {
              console.log('📝 Filling form...');
              
              // Fill the form
              const medSelect = document.querySelector('#schedule-medication-select');
              const timeInput = document.querySelector('[name="time"]');
              const freqSelect = document.querySelector('[name="frequency"]');
              const dateInput = document.querySelector('[name="start_date"]');
              
              if (medSelect) medSelect.value = medication.id;
              if (timeInput) timeInput.value = `${hour.padStart(2, '0')}:${minute}`;
              if (freqSelect) freqSelect.value = frequency;
              
              // Set today's date as start date
              const today = new Date().toISOString().split('T')[0];
              if (dateInput) dateInput.value = today;
              
              console.log('✅ Form filled!');
              addChatMessage(`✅ Schedule form filled for ${medication.name}! Add phone number and click "Add Schedule".`);
              
              // Close chat
              setTimeout(() => {
                toggleChat();
              }, 1500);
            }, 800);
          } else {
            console.log('❌ Medication not found:', medName);
            addChatMessage(`❌ Medication "${medName}" not found. Please add it first using:\n"Add ${medName} [dosage] [form]"`);
          }
        } catch (error) {
          console.error('❌ Error loading medications:', error);
          addChatMessage('❌ Error loading medications. Please try again.');
        }
      }, 500);
    } else {
      addChatMessage('Please specify: medication name and time.\n\nExample: "Schedule aspirin at 10:00 daily" or "Add schedule for aspirin at 22:30"');
    }
  }
  // Extract medication details
  else if (lower.includes('add') && !lower.includes('schedule')) {
    const match = message.match(/add\s+(\w+)\s+(\d+\s*(?:mg|ml|iu|mcg))\s+(\w+)/i);
    if (match) {
      const [, name, dosage, form] = match;
      addChatMessage(`Great! I'll add ${name} ${dosage} ${form}. Opening the form...`);
      
      // Switch to medications tab first
      showTab('medications');
      
      // Auto-fill and open the form
      setTimeout(() => {
        // Fill the form fields
        document.querySelector('[name="name"]').value = name;
        document.querySelector('[name="dosage"]').value = dosage;
        document.querySelector('[name="form"]').value = form;
        
        // Extract purpose if mentioned
        if (lower.includes('for ')) {
          const purpose = message.split('for ')[1].trim();
          document.querySelector('[name="purpose"]').value = purpose;
        }
        
        // Open the modal using the correct function
        showAddMedicationModal();
        
        addChatMessage('✅ Form filled and opened! Review the details and click "Add Medication" to save.');
        
        // Close the chat panel to show the form
        setTimeout(() => {
          toggleChat();
        }, 1000);
      }, 500);
    } else {
      addChatMessage('Please specify: medication name, dosage, and form.\n\nExample: "Add aspirin 500mg tablet for headache"');
    }
  }
  else if (lower.includes('today') || (lower.includes('schedule') && !lower.includes('add'))) {
    addChatMessage('Checking today\'s schedule...');
    showTab('dashboard');
    setTimeout(() => {
      addChatMessage('Showing today\'s schedule on the dashboard!');
    }, 500);
  }
  else if (lower.includes('refill') || lower.includes('low')) {
    addChatMessage('Checking medications that need refilling...');
    showTab('dashboard');
    setTimeout(() => {
      addChatMessage('Check the "Refill Alerts" section on the dashboard!');
    }, 500);
  }
  else if (lower.includes('stat') || lower.includes('adherence')) {
    addChatMessage('Loading your statistics...');
    showTab('stats');
    setTimeout(() => {
      addChatMessage('Showing your adherence statistics!');
    }, 500);
  }
  else {
    addChatMessage('I can help you with:\n• Adding medications\n• Checking schedules\n• Viewing statistics\n• Refill alerts\n\nTry: "Add aspirin 500mg tablet"');
  }
}

function quickAction(action) {
  switch(action) {
    case 'today':
      addChatMessage('Show me today\'s schedule', true);
      processAICommand('today schedule');
      break;
    case 'add':
      addChatMessage('I want to add a medication', true);
      addChatMessage('What medication would you like to add? Please specify:\n• Name\n• Dosage (e.g., 500mg)\n• Form (tablet/capsule/syrup)');
      break;
    case 'stats':
      addChatMessage('Show my statistics', true);
      processAICommand('show statistics');
      break;
  }
}

console.log('✅ Chatbot script loaded!');
