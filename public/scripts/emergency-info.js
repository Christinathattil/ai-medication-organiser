// ============================================
// EMERGENCY INFO SCREEN
// Medical information accessible without login
// ============================================

// Create emergency info page
function createEmergencyInfoPage() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Emergency Medical Information</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <link rel="stylesheet" href="/styles/senior-friendly.css">
      <style>
        body {
          background: white;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .emergency-header {
          background: #ef4444;
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 24px;
        }
        .med-list {
          background: #f9fafb;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .med-item {
          background: white;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 8px;
          border-left: 4px solid #7c3aed;
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 18px;
        }
        @media print {
          .print-btn, .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">
        <i class="fas fa-print"></i> Print
      </button>
      
      <div class="emergency-header">
        <i class="fas fa-ambulance" style="font-size: 48px; margin-bottom: 12px;"></i>
        <h1 style="font-size: 36px; margin: 0;">EMERGENCY MEDICAL INFORMATION</h1>
        <p style="font-size: 20px; margin-top: 8px;">For First Responders & Medical Personnel</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 32px;">
        <div id="emergency-qr" style="display: inline-block;"></div>
        <p style="font-size: 18px; color: #6b7280; margin-top: 12px;">
          Scan for full medical details
        </p>
      </div>
      
      <div class="med-list">
        <h2 style="font-size: 28px; margin-bottom: 16px;">
          <i class="fas fa-pills"></i> Current Medications
        </h2>
        <div id="emergency-meds">
          <!-- Medications will be loaded here -->
        </div>
      </div>
      
      <div class="med-list">
        <h2 style="font-size: 28px; margin-bottom: 16px;">
          <i class="fas fa-exclamation-triangle"></i> Allergies
        </h2>
        <div id="emergency-allergies">
          <p style="font-size: 20px; color: #6b7280;">None recorded</p>
        </div>
      </div>
      
      <div class="med-list">
        <h2 style="font-size: 28px; margin-bottom: 16px;">
          <i class="fas fa-user-md"></i> Emergency Contact
        </h2>
        <div id="emergency-contact">
          <p style="font-size: 20px; color: #6b7280;">Not set</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 32px; padding: 20px; background: #fef3c7; border-radius: 12px;">
        <p style="font-size: 18px; color: #92400e;">
          <strong>Last Updated:</strong> <span id="last-updated"></span>
        </p>
      </div>
      
      <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
      <script>
        // Load emergency data
        async function loadEmergencyData() {
          try {
            // Get medications from localStorage (cached for offline access)
            const cachedMeds = localStorage.getItem('emergency_meds');
            if (cachedMeds) {
              const meds = JSON.parse(cachedMeds);
              displayMedications(meds);
              generateQR(meds);
            }
            
            document.getElementById('last-updated').textContent = new Date().toLocaleString();
          } catch (error) {
            console.error('Error loading emergency data:', error);
          }
        }
        
        function displayMedications(meds) {
          const container = document.getElementById('emergency-meds');
          if (!meds || meds.length === 0) {
            container.innerHTML = '<p style="font-size: 20px; color: #6b7280;">No medications recorded</p>';
            return;
          }
          
          container.innerHTML = meds.map(med => \`
            <div class="med-item">
              <h3 style="font-size: 24px; margin: 0 0 8px 0;">\${med.name}</h3>
              <p style="font-size: 20px; margin: 4px 0;"><strong>Dosage:</strong> \${med.dosage || 'Not specified'}</p>
              <p style="font-size: 20px; margin: 4px 0;"><strong>Form:</strong> \${med.form || 'Tablet'}</p>
              \${med.purpose ? \`<p style="font-size: 20px; margin: 4px 0;"><strong>Purpose:</strong> \${med.purpose}</p>\` : ''}
            </div>
          \`).join('');
        }
        
        function generateQR(data) {
          const qrData = {
            medications: data,
            emergency: true,
            generated: new Date().toISOString()
          };
          
          new QRCode(document.getElementById('emergency-qr'), {
            text: JSON.stringify(qrData),
            width: 256,
            height: 256
          });
        }
        
        loadEmergencyData();
      </script>
    </body>
    </html>
  `;
}

// Function to cache emergency data
async function cacheEmergencyData() {
    try {
        const response = await fetch(`${API_BASE}/medications`);
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('emergency_meds', JSON.stringify(data.medications));
            console.log('✅ Emergency data cached');
        }
    } catch (error) {
        console.error('Failed to cache emergency data:', error);
    }
}

// Show emergency info in new page
function showEmergencyInfo() {
    const win = window.open('', '_blank');
    win.document.write(createEmergencyInfoPage());
    win.document.close();
}

// Export functions
window.emergencyInfo = {
    show: showEmergencyInfo,
    cache: cacheEmergencyData
};

// Cache emergency data whenever medications are updated
if (typeof window.addEventListener === 'function') {
    window.addEventListener('medicationUpdated', cacheEmergencyData);
}
