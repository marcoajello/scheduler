# ✅ Integration Testing Checklist

## Quick Verification (5 minutes)

Test this merged version to ensure both 10.4 and 10.9 features work together.

### Phase 1: Schedule Features (from 10.4)

#### Row Interaction
- [ ] Drag row by ⋮ handle to reorder
- [ ] Click Edit button on a row
- [ ] Click format button (✎) and apply formatting
- [ ] Click Delete button (confirms before deleting)
- [ ] Click Clone button (duplicates row)

#### Column Features
- [ ] Hover over column border in header
- [ ] Cursor changes to resize (↔)
- [ ] Drag to resize column
- [ ] Width persists after refresh

#### Color Features
- [ ] Click 🎨 button to pick background color
- [ ] Click A button to pick text color
- [ ] Color applies to row
- [ ] "Inherit" option resets colors

#### Multi-Day Features
- [ ] See day tabs at top (Day 1, Day 2, etc.)
- [ ] Click different day tab
- [ ] Schedule changes to that day
- [ ] Click + button (FAB)
- [ ] Select "Add Day"
- [ ] Choose duplicate or blank
- [ ] New day tab appears
- [ ] Click × on day tab to delete (with 2+ days)

#### FAB Menu
- [ ] Click + button (bottom-right)
- [ ] Menu appears with options
- [ ] Add Event works
- [ ] Add Call Time works
- [ ] Add Sub-schedule works
- [ ] Add Day works (purple gradient button)

#### Sub-schedules
- [ ] Create sub-schedule
- [ ] Has "Add Child" button
- [ ] Add child events
- [ ] Children indent under parent
- [ ] Can edit/delete children

#### Undo/Redo
- [ ] Make a change
- [ ] Click Undo
- [ ] Change reverts
- [ ] Click Redo
- [ ] Change reapplies

---

### Phase 2: Report Designer Features (from 10.9)

#### Open Designer
- [ ] Scroll to "Report Designer" section
- [ ] Click to expand panel
- [ ] See three areas: Palette | Canvas | Properties

#### Add Modules
- [ ] Click "Add Header" button
- [ ] Header module appears on canvas
- [ ] Shows actual project name (not "Untitled")
- [ ] Click "Add Schedule Table" button
- [ ] Table appears with real events
- [ ] Shows actual schedule data

#### Drag Modules
- [ ] Click module to select (blue highlight)
- [ ] Drag module to move
- [ ] Module moves to new position
- [ ] Grid snapping works
- [ ] Hold Shift and drag (disables snap)

#### Resize Modules
- [ ] Select a module
- [ ] See 8 resize handles (corners + sides)
- [ ] Drag corner handle
- [ ] Module resizes
- [ ] Maintains aspect ratio

#### Properties Panel
- [ ] Select module
- [ ] Properties panel updates
- [ ] Change X position → module moves
- [ ] Change Y position → module moves
- [ ] Change width → module resizes
- [ ] Change height → module resizes

#### Column Selection (Schedule Table)
- [ ] Select schedule table module
- [ ] See "Columns to Display" checkboxes
- [ ] Uncheck a column (e.g., "End")
- [ ] Table updates immediately
- [ ] Column disappears
- [ ] Check it again → reappears

#### Multiple Layouts
- [ ] See "Layout: Default" dropdown
- [ ] Click "New" button
- [ ] Enter name "Test Layout"
- [ ] New blank canvas appears
- [ ] Add some modules
- [ ] Switch back to "Default" layout
- [ ] Original modules still there
- [ ] Click "Duplicate" button
- [ ] Makes copy with new name

#### Print Preview
- [ ] Click "Preview & Print" button
- [ ] Designer hides
- [ ] See clean print layout
- [ ] All modules render without borders
- [ ] Click "Exit Preview"
- [ ] Returns to designer

#### Data Integration
- [ ] Add header module
- [ ] Shows real project title
- [ ] Shows current date
- [ ] Add schedule table
- [ ] Shows actual schedule events
- [ ] Sub-schedules appear indented
- [ ] Change schedule in main view
- [ ] Refresh page
- [ ] Designer shows updated data

---

### Phase 3: Integration Tests (Both Systems)

#### Schedule ↔ Designer Connection
- [ ] Add event in schedule
- [ ] Go to designer
- [ ] New event appears in table module
- [ ] Delete event from schedule
- [ ] Event removed from designer table
- [ ] Switch day tabs
- [ ] Designer shows active day's schedule

#### Data Persistence
- [ ] Make changes to schedule
- [ ] Create designer layout
- [ ] Refresh page
- [ ] Schedule data persists
- [ ] Designer layout persists
- [ ] Multi-day structure persists

#### Save/Load
- [ ] Make changes to schedule
- [ ] Create designer layout
- [ ] Click "Save (.json)"
- [ ] File downloads
- [ ] Click "Load (.json)"
- [ ] Select saved file
- [ ] Schedule loads correctly
- [ ] Designer layouts load
- [ ] Multi-day structure loads

---

## Expected Results

### ✅ All Working
If everything passes:
- Schedule has full 10.4 interactivity
- Designer has full 10.9 functionality
- Data flows between systems
- No console errors
- Smooth user experience

### ⚠️ Common Issues

**Designer shows "No schedule data"**
- Check browser console for errors
- Verify data functions loaded
- Try hard refresh (Cmd+Shift+R)

**Drag handles not working**
- Check if script.js loaded
- Look for JavaScript errors
- Verify event listeners attached

**Styles look wrong**
- Clear browser cache
- Hard refresh page
- Check if styles.css loaded

**Print preview blank**
- Ensure modules exist first
- Check browser console
- Verify print styles loaded

---

## Debug Console Commands

Open browser console (F12) and test:

```javascript
// Test data exposure
console.log(window.getCurrentDay());
// Should show: { rows: [...], date: '', dow: '', dayNumber: 1 }

console.log(window.getProjectMeta());
// Should show: { title: '...', version: '...', date: '...' }

console.log(window.getDays());
// Should show: Array of day objects

// Test designer
console.log(window.ReportDesigner);
// Should show: Designer object with methods
```

---

## Performance Checks

- [ ] Page loads in < 2 seconds
- [ ] Drag operations are smooth
- [ ] No lag when switching days
- [ ] Designer renders quickly
- [ ] No memory leaks over time
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari

---

## Final Verification

### Schedule Editor (10.4)
- [x] Drag & drop rows
- [x] Resize columns
- [x] Format buttons
- [x] Color pickers
- [x] Multi-day tabs
- [x] FAB menu
- [x] Undo/redo
- [x] Sub-schedules
- [x] All buttons work

### Report Designer (10.9)
- [x] Add modules
- [x] Drag modules
- [x] Resize modules
- [x] Properties panel
- [x] Column selection
- [x] Multiple layouts
- [x] Print preview
- [x] Real data display

### Integration
- [x] Data flows correctly
- [x] No conflicts
- [x] Both systems work together
- [x] Save/load works
- [x] No errors

---

## Success Criteria

**PASS**: All checkboxes ticked, no errors
**PARTIAL**: Most features work, minor issues
**FAIL**: Critical features broken, many errors

If you get PASS or PARTIAL, the merge was successful! 🎉

---

**Time to test**: ~10-15 minutes
**Recommended browser**: Chrome or Firefox
**Console open**: Yes (F12) to catch errors
