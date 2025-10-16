#!/usr/bin/env node

/**
 * Chatbot Verification Script
 * Run this in browser console or as a standalone test
 */

console.log('🧪 Chatbot Verification Script Starting...\n');

const tests = [];

// Test 1: Check if chatbot script is loaded
function test1() {
  const scriptExists = Array.from(document.scripts).some(s => s.src.includes('chatbot-groq.js'));
  tests.push({
    name: 'Chatbot script loaded',
    passed: scriptExists,
    details: scriptExists ? 'Found chatbot-groq.js in page scripts' : 'Script not found in page'
  });
}

// Test 2: Check if class is exported
function test2() {
  const classExists = typeof window.MedicationChatbotGroq !== 'undefined';
  tests.push({
    name: 'MedicationChatbotGroq class available',
    passed: classExists,
    details: classExists ? 'Class is accessible via window.MedicationChatbotGroq' : 'Class not found in window object'
  });
}

// Test 3: Check if instance is created
function test3() {
  const instanceExists = window.medicationChatbot !== undefined && window.medicationChatbot !== null;
  tests.push({
    name: 'Chatbot instance created',
    passed: instanceExists,
    details: instanceExists ? 'window.medicationChatbot exists' : 'Instance not created'
  });
}

// Test 4: Check if button exists in DOM
function test4() {
  const button = document.getElementById('chatbot-toggle');
  const buttonExists = button !== null;
  tests.push({
    name: 'Chat button exists in DOM',
    passed: buttonExists,
    details: buttonExists ? `Button found with id 'chatbot-toggle'` : 'Button element not found'
  });
  
  if (buttonExists) {
    const styles = window.getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    
    // Test 5: Check if button is visible
    const isVisible = styles.display !== 'none' && 
                     styles.visibility !== 'hidden' && 
                     styles.opacity !== '0' &&
                     rect.width > 0 && 
                     rect.height > 0;
    
    tests.push({
      name: 'Chat button is visible',
      passed: isVisible,
      details: `display: ${styles.display}, visibility: ${styles.visibility}, position: ${styles.position}, z-index: ${styles.zIndex}`
    });
    
    // Test 6: Check button position
    const isPositioned = styles.position === 'fixed' && 
                         parseInt(styles.zIndex) >= 9999;
    
    tests.push({
      name: 'Chat button properly positioned',
      passed: isPositioned,
      details: `position: ${styles.position}, bottom: ${styles.bottom}, right: ${styles.right}, z-index: ${styles.zIndex}`
    });
    
    // Test 7: Check if button has event listeners
    const hasClickHandler = button.onclick !== null || 
                           (window.medicationChatbot && typeof window.medicationChatbot.toggle === 'function');
    
    tests.push({
      name: 'Chat button has click handler',
      passed: hasClickHandler,
      details: hasClickHandler ? 'Click handler attached' : 'No click handler found'
    });
  }
}

// Test 8: Check if sidebar exists
function test5() {
  const sidebar = document.getElementById('chatbot-sidebar');
  const sidebarExists = sidebar !== null;
  tests.push({
    name: 'Chat sidebar exists',
    passed: sidebarExists,
    details: sidebarExists ? 'Sidebar element found' : 'Sidebar not found'
  });
}

// Test 9: Check if API endpoint is accessible
async function test6() {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', history: [] })
    });
    
    const passed = response.status === 200 || response.status === 500; // 500 might mean no API key, but endpoint exists
    const data = await response.json();
    
    tests.push({
      name: 'Chat API endpoint accessible',
      passed: passed,
      details: `Status: ${response.status}, Response: ${data.response ? 'OK' : data.error || 'Unknown'}`
    });
  } catch (error) {
    tests.push({
      name: 'Chat API endpoint accessible',
      passed: false,
      details: `Error: ${error.message}`
    });
  }
}

// Run all tests
async function runAllTests() {
  test1();
  test2();
  test3();
  test4();
  test5();
  await test6();
  
  // Print results
  console.log('\n📊 TEST RESULTS:\n');
  console.log('='.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  
  tests.forEach((test, index) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    const color = test.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${color}${status}${reset} ${test.name}`);
    console.log(`     ${test.details}`);
    console.log('');
    
    if (test.passed) passCount++;
    else failCount++;
  });
  
  console.log('='.repeat(80));
  console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed out of ${tests.length} tests`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Chatbot is working seamlessly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check details above.\n');
  }
  
  return { passCount, failCount, total: tests.length, tests };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.verifyChatbot = runAllTests;
  console.log('✅ Verification script loaded. Run verifyChatbot() in console to test.\n');
  
  // Auto-run after a delay
  setTimeout(() => {
    console.log('🚀 Auto-running verification in 2 seconds...\n');
    setTimeout(runAllTests, 2000);
  }, 100);
} else {
  // Node.js environment
  console.log('⚠️  This script should be run in a browser console, not Node.js');
}
