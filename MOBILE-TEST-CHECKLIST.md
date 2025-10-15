# 📱 Mobile Testing Checklist

Use this checklist to verify mobile responsiveness on your device.

## Quick Test (5 minutes)

### 1. AI Chatbot Visibility ⭐ CRITICAL
- [ ] Purple AI button visible in bottom-right corner
- [ ] AI badge shows "AI" text
- [ ] Button doesn't overlap with content
- [ ] Button is easy to tap (not too small)

### 2. AI Chatbot Functionality
- [ ] Clicking AI button opens chatbot
- [ ] Chatbot takes full screen on mobile
- [ ] Close button (X) works properly
- [ ] Can type in input field
- [ ] Send button works
- [ ] Quick action buttons are visible and work
- [ ] Messages display correctly
- [ ] Can scroll through chat history

### 3. Navigation
- [ ] Navigation bar visible at top
- [ ] All tabs accessible (Dashboard, Meds, Schedule, History, Stats)
- [ ] Tab buttons are large enough to tap
- [ ] Active tab is highlighted
- [ ] Navigation doesn't overflow screen

### 4. Dashboard
- [ ] Three stat cards visible
- [ ] Cards stack vertically on mobile
- [ ] Text is readable (not too small)
- [ ] Icons display properly
- [ ] Refill alerts section visible
- [ ] Today's schedule section visible

### 5. Forms and Modals
- [ ] "Add Medication" button works
- [ ] Modal opens and fits screen
- [ ] Can scroll within modal
- [ ] Form fields are single column
- [ ] All inputs are easy to tap
- [ ] Can close modal

## Detailed Test (15 minutes)

### Screen Sizes to Test
Test on at least 3 different sizes:
- [ ] Small phone (< 380px) - iPhone SE
- [ ] Standard phone (390-428px) - iPhone 12/13/14
- [ ] Tablet (768px+) - iPad

### Orientation
- [ ] Portrait mode works
- [ ] Landscape mode works
- [ ] Rotation doesn't break layout

### Touch Interactions
- [ ] All buttons respond to touch
- [ ] No accidental taps (buttons well-spaced)
- [ ] Scrolling is smooth
- [ ] No horizontal scrolling (except tables if needed)
- [ ] Pinch-to-zoom disabled (as intended for app)

### AI Chatbot - Detailed
- [ ] Welcome message displays correctly
- [ ] Can send: "Show me today's schedule"
- [ ] AI response is readable
- [ ] Can send: "Add aspirin 500mg tablet"
- [ ] AI understands and responds
- [ ] Quick actions work:
  - [ ] 📅 Today
  - [ ] ➕ Add
  - [ ] 📊 Stats
  - [ ] 🔔 Refill

### Navigation - Detailed
- [ ] Dashboard tab works
- [ ] Medications tab works
- [ ] Schedules tab works
- [ ] History tab works
- [ ] Stats tab works
- [ ] Tab switching is smooth
- [ ] Content loads properly on each tab

### Forms - Detailed
- [ ] Add Medication form:
  - [ ] All fields visible
  - [ ] Can type in text fields
  - [ ] Dropdowns work
  - [ ] Date picker works
  - [ ] File upload works (if applicable)
  - [ ] Submit button works
  - [ ] Cancel button works

- [ ] Add Schedule form:
  - [ ] All fields visible
  - [ ] Time picker works
  - [ ] Dropdown selections work
  - [ ] Checkboxes work
  - [ ] Submit button works

### Content Display
- [ ] Medication cards display properly
- [ ] Schedule items are readable
- [ ] History table is usable (may need horizontal scroll)
- [ ] Stats display correctly
- [ ] Images (if any) load and scale properly

### Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] Animations are smooth (no lag)
- [ ] Scrolling is responsive
- [ ] No freezing or crashes
- [ ] AI responses come quickly

## Browser-Specific Tests

### iOS Safari
- [ ] All features work
- [ ] No layout issues
- [ ] Touch events work
- [ ] Can add to home screen
- [ ] PWA works when installed

### Android Chrome
- [ ] All features work
- [ ] No layout issues
- [ ] Touch events work
- [ ] Can install as app
- [ ] PWA works when installed

### Other Mobile Browsers
- [ ] Samsung Internet
- [ ] Firefox Mobile
- [ ] Edge Mobile

## Common Issues to Check

### Layout Issues
- [ ] No text overflow
- [ ] No cut-off buttons
- [ ] No overlapping elements
- [ ] Proper spacing everywhere
- [ ] Consistent padding/margins

### Usability Issues
- [ ] Text is readable (minimum 12px)
- [ ] Buttons are tappable (minimum 44x44px)
- [ ] Important features not hidden
- [ ] Easy to navigate
- [ ] Clear visual feedback on interactions

### AI Chatbot Issues
- [ ] Button always visible (not hidden behind content)
- [ ] Chatbot doesn't cover important content
- [ ] Can close chatbot easily
- [ ] Input field accessible (not hidden by keyboard)
- [ ] Messages don't overflow

## Test Scenarios

### Scenario 1: New User
1. [ ] Open app on mobile
2. [ ] See AI button immediately
3. [ ] Click AI button
4. [ ] Read welcome message
5. [ ] Click "📅 Today" quick action
6. [ ] See response
7. [ ] Close chatbot
8. [ ] Navigate to Medications tab
9. [ ] Click "Add Medication"
10. [ ] Fill form and submit

### Scenario 2: Daily Use
1. [ ] Open app
2. [ ] Check dashboard stats
3. [ ] View today's schedule
4. [ ] Mark medication as taken
5. [ ] Ask AI: "What's my adherence?"
6. [ ] View stats tab

### Scenario 3: Adding Medication via AI
1. [ ] Open AI chatbot
2. [ ] Type: "I need to add lisinopril 10mg tablet for blood pressure"
3. [ ] AI responds and opens form
4. [ ] Verify form is pre-filled
5. [ ] Submit form
6. [ ] Verify medication added

## Results

### Pass Criteria
- ✅ All critical items checked (marked with ⭐)
- ✅ At least 90% of all items checked
- ✅ No major usability issues
- ✅ AI chatbot fully functional

### Issues Found
Document any issues here:

1. Issue: _______________
   - Severity: High/Medium/Low
   - Device: _______________
   - Browser: _______________
   - Steps to reproduce: _______________

2. Issue: _______________
   - Severity: High/Medium/Low
   - Device: _______________
   - Browser: _______________
   - Steps to reproduce: _______________

## Testing Tools

### Browser DevTools
```
Chrome DevTools:
1. Press F12
2. Click device icon (Ctrl+Shift+M)
3. Select device from dropdown
4. Test different screen sizes
```

### Real Device Testing
```
1. Start server: npm start
2. Find your IP: ipconfig (Windows) or ifconfig (Mac)
3. On mobile: http://YOUR_IP:8080
4. Example: http://192.168.1.100:8080
```

### Online Testing Tools
- BrowserStack (browserstack.com)
- LambdaTest (lambdatest.com)
- Sauce Labs (saucelabs.com)

## Sign-Off

- [ ] All tests passed
- [ ] Issues documented
- [ ] Ready for production

Tested by: _______________
Date: _______________
Devices tested: _______________

---

**Happy Testing! 📱✅**
