/* VERSION 2025-11-23-GAUGE-REBUILD */
/**
 * Alert System for Tag-based Schedule Validation
 * Works with TagManager (tag-manager-unified.js)
 */

// Debug flag - set to false to disable console logging
const ALERT_DEBUG = true;

// Override console methods when debug is disabled
const alertLog = ALERT_DEBUG ? console.log.bind(console) : () => {};
const alertWarn = ALERT_DEBUG ? console.warn.bind(console) : () => {};
const alertError = ALERT_DEBUG ? console.error.bind(console) : () => {};

// ============================================================================
// RULE TYPES CONFIGURATION
// ============================================================================

const RULE_TYPES = {
  hardOut: {
    label: 'Hard Out',
    type: 'time',
    description: 'Must wrap by this time',
    inputType: 'time'
  },
  maxHours: {
    label: 'Max Hours',
    type: 'number',
    description: 'Maximum work hours (triggers OT warning)',
    inputType: 'number',
    min: 0,
    step: 0.5
  },
  mealBreak: {
    label: 'Meal Break Required',
    type: 'number',
    description: 'Hours of continuous work before meal break required',
    inputType: 'number',
    min: 0,
    step: 0.5
  }
};

const CUSTOM_ALERT_TYPES = {
  duration: { label: 'Duration Alert', description: 'Alert when total duration exceeds threshold' },
  manual: { label: 'Manual Reminder', description: 'Reminder only (no auto-check)' }
};

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

const ScheduleValidator = {
  
  /**
   * Parse time string to minutes since midnight
   * Handles both "8:00 AM" and "15:00" formats
   */
  parseTime(timeStr) {
    if (!timeStr) return null;
    
    timeStr = timeStr.trim();
    
    // Check if it's 12-hour format (contains AM/PM)
    const is12Hour = /AM|PM/i.test(timeStr);
    
    if (is12Hour) {
      const isPM = /PM/i.test(timeStr);
      const timeOnly = timeStr.replace(/\s*(AM|PM)/i, '').trim();
      let [hours, minutes] = timeOnly.split(':').map(Number);
      
      // Convert to 24-hour
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }
      
      return hours * 60 + (minutes || 0);
    } else {
      // 24-hour format
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    }
  },
  
  /**
   * Format minutes to time string (respects user's 12h/24h preference)
   */
  formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    
    const timeFormat = localStorage.getItem('timeFormat') || '12h';
    
    if (timeFormat === '12h') {
      // Convert to 12h format with AM/PM
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
    } else {
      // 24h format
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
  },
  
  /**
   * Get all rows that contain a specific tag
   */
  getRowsWithTag(scheduleData, tagId) {
    const rows = [];
    alertLog('[Validator] getRowsWithTag - Looking for tagId:', tagId);
    alertLog('[Validator] scheduleData.days:', scheduleData.days);
    
    // Get all tag-type columns from schedule
    const tagColumns = (scheduleData.cols || []).filter(col => col.type === 'tags').map(col => col.key);
    alertLog('[Validator] Tag columns found:', tagColumns);
    
    scheduleData.days.forEach((day, dayIndex) => {
      alertLog(`[Validator] Day ${dayIndex}:`, {
        id: day.id,
        rowCount: day.rows?.length || 0
      });
      
      if (!day.rows) {
        alertWarn(`[Validator] Day ${dayIndex} has no rows array`);
        return;
      }
      
      day.rows.forEach((row, rowIndex) => {
        // Log first few rows to see structure
        if (dayIndex === 0 && rowIndex < 3) {
          alertLog(`[Validator] Sample row ${rowIndex}:`, {
            rowData: row,
            custom: row.custom,
            hasCustom: !!row.custom
          });
        }
        
        // Check ALL tag columns for this tag
        let foundTag = false;
        for (const colKey of tagColumns) {
          const tagsValue = row.custom?.[colKey] || '';
          if (tagsValue) {
            const tagIds = tagsValue.split(',').map(id => id.trim()).filter(Boolean);
            if (tagIds.includes(tagId)) {
              foundTag = true;
              alertLog(`[Validator] Found matching tag in row ${rowIndex}, column ${colKey}!`);
              break;
            }
          }
        }
        
        if (foundTag) {
          const rowData = {
            ...row,
            dayId: day.id,
            scheduleStart: day.scheduleStart
          };
          
          // Try to get display times from DOM
          const domRow = document.getElementById(row.id);
          if (domRow) {
            const startCell = domRow.querySelector('td[data-key="start"]');
            const endCell = domRow.querySelector('td[data-key="end"]');
            
            if (startCell && startCell.textContent.trim()) {
              rowData.displayStart = startCell.textContent.trim();
              alertLog(`[Validator] Enriched row ${row.id} with displayStart:`, rowData.displayStart);
            } else {
              alertLog(`[Validator] No start cell content for row ${row.id}`);
            }
            if (endCell && endCell.textContent.trim()) {
              rowData.displayEnd = endCell.textContent.trim();
              alertLog(`[Validator] Enriched row ${row.id} with displayEnd:`, rowData.displayEnd);
            } else {
              alertLog(`[Validator] No end cell content for row ${row.id}`);
            }
          } else {
            alertLog(`[Validator] Could not find DOM element for row ${row.id}`);
          }
          
          rows.push(rowData);
        }
      });
    });
    
    alertLog(`[Validator] Total rows with tag ${tagId}:`, rows.length);
    return rows;
  },
  
  /**
   * Calculate absolute time for a row
   */
  getRowTime(row) {
    // For CALL TIME rows, use whichever display time is populated (start or end)
    if (row.type === 'CALL TIME') {
      if (row.displayStart) {
        const time = this.parseTime(row.displayStart);
        alertLog(`[getRowTime] Using displayStart for CALL TIME row ${row.id}:`, {
          displayStart: row.displayStart,
          parsedMinutes: time
        });
        return time;
      }
      if (row.displayEnd) {
        const time = this.parseTime(row.displayEnd);
        alertLog(`[getRowTime] Using displayEnd for CALL TIME row ${row.id}:`, {
          displayEnd: row.displayEnd,
          parsedMinutes: time
        });
        return time;
      }
    }
    
    // Use display times from DOM if available (these are already calculated with anchoring)
    if (row.displayStart) {
      const time = this.parseTime(row.displayStart);
      alertLog(`[getRowTime] Using displayStart for row ${row.id}:`, {
        displayStart: row.displayStart,
        parsedMinutes: time
      });
      return time;
    }
    
    // Fallback to basic calculation (for rows not in DOM)
    const startMinutes = this.parseTime(row.scheduleStart) || 0;
    const offset = row.offset || 0;
    const calculatedTime = startMinutes + offset;
    alertLog(`[getRowTime] Calculating for row ${row.id}:`, {
      scheduleStart: row.scheduleStart,
      offset: offset,
      calculatedMinutes: calculatedTime
    });
    return calculatedTime;
  },
  
  /**
   * Get row end time
   */
  getRowEndTime(row) {
    // For CALL TIME rows, the end time is the same as start time (they're an instant)
    if (row.type === 'CALL TIME') {
      return this.getRowTime(row);
    }
    
    // Use display end time from DOM if available
    if (row.displayEnd) {
      return this.parseTime(row.displayEnd);
    }
    
    // Fallback to calculation
    const start = this.getRowTime(row);
    return start + (row.duration || 0);
  },
  
  /**
   * Get schedule event time by event ID (dayId-rowId format)
   */
  getScheduleEventTime(eventId) {
    if (!eventId || !window.getScheduleData) return null;
    
    const scheduleData = window.getScheduleData();
    if (!scheduleData || !scheduleData.days) return null;
    
    // Parse eventId: dayId-rowId
    const parts = eventId.split('-');
    if (parts.length < 2) return null;
    
    // Reconstruct dayId and rowId (handle IDs with dashes)
    const rowId = parts[parts.length - 1];
    const dayId = parts.slice(0, -1).join('-');
    
    // Get user's preferred label column
    const labelColumn = localStorage.getItem('eventLabelColumn') || null;
    
    // Find the day and row
    for (const day of scheduleData.days) {
      if (day.id === dayId && day.rows) {
        for (let i = 0; i < day.rows.length; i++) {
          const row = day.rows[i];
          if (row.id === rowId) {
            // Get label using same logic as TagManager
            const label = this.getRowLabel(row, labelColumn);
            const rowNumber = i + 1;
            
            return {
              startTime: this.getRowTime(row),
              endTime: this.getRowEndTime(row),
              label: `#${rowNumber} | ${label}`
            };
          }
        }
      }
    }
    
    return null;
  },
  
  /**
   * Get label for a row using fallback hierarchy (same as TagManager)
   */
  getRowLabel(row, preferredColumn = null) {
    // 1. Try user's preferred column first
    if (preferredColumn && row.custom && row.custom[preferredColumn]) {
      const value = row.custom[preferredColumn].value || row.custom[preferredColumn];
      if (value && typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    
    // 2. Try row.title
    if (row.title && row.title.trim()) {
      return row.title.trim();
    }
    
    // 3. Try first non-empty custom column
    if (row.custom) {
      for (const key in row.custom) {
        const value = row.custom[key]?.value || row.custom[key];
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    
    // 4. Fall back to row type
    return row.type || 'Unnamed';
  },
  
  /**
   * Validate hard out rule
   */
  validateHardOut(tag, rowsWithTag) {
    if (!tag.rules?.hardOut) return [];
    
    alertLog(`[Validator] Checking hard out for ${tag.label}:`, {
      hardOut: tag.rules.hardOut,
      rowsWithTag: rowsWithTag.length
    });
    
    const hardOutTime = this.parseTime(tag.rules.hardOut);
    alertLog(`[Validator] Hard out time in minutes:`, hardOutTime);
    
    const violatingRows = [];
    
    rowsWithTag.forEach(row => {
      // Log the raw row data to see what we're working with
      alertLog(`[Validator] Raw row data for ${row.id}:`, row);
      
      const rowStart = this.getRowTime(row);
      const rowEnd = this.getRowEndTime(row);
      
      alertLog(`[Validator] Row ${row.id} calculated:`, {
        type: row.type,
        displayStart: row.displayStart,
        displayEnd: row.displayEnd,
        scheduleStart: row.scheduleStart,
        offset: row.offset,
        duration: row.duration,
        rowStart: rowStart,
        rowEnd: rowEnd,
        rowStartTime: this.formatTime(rowStart),
        rowEndTime: this.formatTime(rowEnd),
        hardOutTime: hardOutTime,
        hardOutFormatted: this.formatTime(hardOutTime),
        violation: rowEnd > hardOutTime
      });
      
      if (rowEnd > hardOutTime) {
        violatingRows.push({
          type: row.type || 'Unknown',
          title: row.title || '',
          endTime: this.formatTime(rowEnd)
        });
      }
    });
    
    alertLog(`[Validator] Found ${violatingRows.length} violations`);
    
    if (violatingRows.length === 0) return [];
    
    // Create a single alert listing all violations
    const eventList = violatingRows.map(r => 
      `${r.type}${r.title ? ' "' + r.title + '"' : ''} (ends ${r.endTime})`
    ).join(', ');
    
    return [{
      severity: 'critical',
      message: `${tag.label} scheduled past hard out (${this.formatTime(hardOutTime)}): ${eventList}`,
      tagLabel: tag.label
    }];
  },
  
  /**
   * Validate max hours rule
   */
  validateMaxHours(tag, rowsWithTag) {
    alertLog(`[Validator] Checking maxHours for ${tag.label}:`, {
      hasMaxHours: !!tag.rules?.maxHours,
      maxHours: tag.rules?.maxHours,
      rowCount: rowsWithTag.length
    });
    
    if (!tag.rules?.maxHours) return [];
    
    // Calculate working time span: from first row start to last row end
    let earliestStart = Infinity;
    let latestEnd = -Infinity;
    
    rowsWithTag.forEach(row => {
      const rowStart = this.getRowTime(row);
      const rowEnd = this.getRowEndTime(row);
      
      if (rowStart < earliestStart) earliestStart = rowStart;
      if (rowEnd > latestEnd) latestEnd = rowEnd;
    });
    
    const totalMinutes = latestEnd - earliestStart;
    const totalHours = totalMinutes / 60;
    
    alertLog(`[Validator] MaxHours calculation:`, {
      earliestStart,
      latestEnd,
      earliestStartFormatted: this.formatTime(earliestStart),
      latestEndFormatted: this.formatTime(latestEnd),
      totalMinutes,
      totalHours,
      maxHours: tag.rules.maxHours,
      exceeds: totalHours > tag.rules.maxHours
    });
    
    if (totalHours > tag.rules.maxHours) {
      return [{
        severity: 'warning',
        message: `${tag.label} exceeds max hours (${totalHours.toFixed(1)}/${tag.rules.maxHours} hours, from ${this.formatTime(earliestStart)} to ${this.formatTime(latestEnd)})`,
        tagLabel: tag.label
      }];
    }
    
    return [];
  },
  
  /**
   * Validate minor performer work hour rules using grid parameters
   */
  validateMinorRules(tag, rowsWithTag) {
    alertLog(`[Validator] Checking minor rules for ${tag.label}:`, {
      isMinor: !!tag.isMinor,
      minorAge: tag.minorAge,
      minorDayType: tag.minorDayType,
      minorNextDayType: tag.minorNextDayType,
      hasMinorRules: !!tag.minorRules
    });
    
    if (!tag.isMinor || !tag.minorAge || !tag.minorRules) return [];
    
    // Find the appropriate age range in the grid
    const ageRule = tag.minorRules.find(rule => 
      tag.minorAge >= rule.ageMin && tag.minorAge <= rule.ageMax
    );
    
    if (!ageRule) {
      alertLog(`[Validator] No age range found for age ${tag.minorAge}`);
      return [];
    }
    
    // Determine which limits to check based on THIS day type
    const dayType = tag.minorDayType || 'school';
    const onSetLimit = dayType === 'school' ? ageRule.schoolOnSet : ageRule.nonSchoolOnSet;
    const workLimit = dayType === 'school' ? ageRule.schoolWork : ageRule.nonSchoolWork;
    
    // Determine end time based on NEXT day type
    const nextDayType = tag.minorNextDayType || 'school';
    const START_TIME = 5 * 60; // 5:00 AM - earliest allowed start
    const SCHOOL_END_TIME = 22 * 60; // 10:00 PM - if tomorrow is school
    const NON_SCHOOL_END_TIME = 0.5 * 60; // 12:30 AM - if tomorrow is non-school
    
    const endTime = nextDayType === 'school' ? SCHOOL_END_TIME : NON_SCHOOL_END_TIME;
    const endTimeLabel = nextDayType === 'school' ? '10:00 PM' : '12:30 AM';
    
    alertLog(`[Validator] Using limits for ${ageRule.label}:`, {
      thisDayType: dayType,
      nextDayType: nextDayType,
      onSetLimit,
      workLimit,
      endTime: this.formatTime(endTime)
    });
    
    const violations = [];
    
    // Calculate ON-SET time span: from first row start to last row end
    let earliestStart = Infinity;
    let latestEnd = -Infinity;
    
    rowsWithTag.forEach(row => {
      const rowStart = this.getRowTime(row);
      const rowEnd = this.getRowEndTime(row);
      
      if (rowStart < earliestStart) earliestStart = rowStart;
      if (rowEnd > latestEnd) latestEnd = rowEnd;
      
      // Check for work during DEAD HOURS (between end time and 5:00 AM)
      // The end time depends on what type of day TOMORROW is
      
      const isInDeadHours = (time) => {
        if (nextDayType === 'school') {
          // Dead hours: 10:00 PM (1320 min) to 5:00 AM (300 min next day)
          // This means: >= 1320 OR < 300
          return time >= SCHOOL_END_TIME || time < START_TIME;
        } else {
          // Dead hours: 12:30 AM (30 min) to 5:00 AM (300 min)
          // This means: >= 30 AND < 300 (early morning window)
          return time >= NON_SCHOOL_END_TIME && time < START_TIME;
        }
      };
      
      if (isInDeadHours(rowStart) || isInDeadHours(rowEnd)) {
        violations.push({
          severity: 'critical',
          message: `${tag.label} (minor, age ${tag.minorAge}) scheduled during prohibited hours (${this.formatTime(rowStart)} to ${this.formatTime(rowEnd)}). Tomorrow is ${nextDayType === 'school' ? 'school day' : 'non-school day'} - cannot work between ${endTimeLabel} and 5:00 AM`,
          tagLabel: tag.label
        });
      }
    });
    
    const onSetMinutes = latestEnd - earliestStart;
    const onSetHours = onSetMinutes / 60;
    
    // Calculate WORK hours: sum of event durations only (exclude call times, sub-schedules)
    let workMinutes = 0;
    
    rowsWithTag.forEach(row => {
      // Only count actual work events, not call times or sub-schedule headers
      if (row.type === 'EVENT' || row.type === 'SUB_EVENT') {
        workMinutes += row.duration || 0;
      }
    });
    
    const workHours = workMinutes / 60;
    
    alertLog(`[Validator] Time calculations:`, {
      onSetHours,
      workHours,
      onSetLimit,
      workLimit
    });
    
    // Check on-set time limit
    if (onSetHours > onSetLimit) {
      violations.push({
        severity: 'critical',
        message: `${tag.label} (minor, age ${tag.minorAge}, ${dayType} day) exceeds ON-SET limit (${onSetHours.toFixed(1)}h on set, ${onSetLimit}h max for ${ageRule.label})`,
        tagLabel: tag.label
      });
    }
    
    // Check work hours limit
    if (workHours > workLimit) {
      violations.push({
        severity: 'critical',
        message: `${tag.label} (minor, age ${tag.minorAge}, ${dayType} day) exceeds WORK limit (${workHours.toFixed(1)}h work, ${workLimit}h max for ${ageRule.label})`,
        tagLabel: tag.label
      });
    }
    
    alertLog(`[Validator] Minor rules check complete:`, {
      onSetHours,
      workHours,
      violations: violations.length
    });
    
    return violations;
  },
  
  /**
   * Get all designated meal events from schedule
   */
  getDesignatedMeals() {
    if (!window.getScheduleData) return [];
    
    const scheduleData = window.getScheduleData();
    if (!scheduleData || !scheduleData.days) return [];
    
    const meals = [];
    
    scheduleData.days.forEach(day => {
      if (!day.rows) return;
      
      day.rows.forEach((row, index) => {
        // Check main row
        if (row.mealWrapType === '1st meal' || row.mealWrapType === '2nd meal') {
          const mealData = {
            type: row.mealWrapType,
            dayId: day.id,
            rowIndex: index,
            rowId: row.id
          };
          
          // Try to get display times from DOM
          const domRow = document.getElementById(row.id);
          if (domRow) {
            const startCell = domRow.querySelector('td[data-key="start"]');
            const endCell = domRow.querySelector('td[data-key="end"]');
            
            if (startCell && startCell.textContent.trim()) {
              mealData.startTime = this.parseTime(startCell.textContent.trim());
            }
            if (endCell && endCell.textContent.trim()) {
              mealData.endTime = this.parseTime(endCell.textContent.trim());
            }
          }
          
          // Fallback to calculated times if DOM not available
          if (!mealData.startTime) {
            mealData.startTime = this.getRowTime({ ...row, scheduleStart: day.scheduleStart });
          }
          if (!mealData.endTime) {
            mealData.endTime = this.getRowEndTime({ ...row, scheduleStart: day.scheduleStart });
          }
          
          meals.push(mealData);
        }
        
        // Check sub-children
        if (row.type === 'SUB' && row.children) {
          row.children.forEach((child, childIndex) => {
            if (child.mealWrapType === '1st meal' || child.mealWrapType === '2nd meal') {
              const mealData = {
                type: child.mealWrapType,
                dayId: day.id,
                rowIndex: index,
                childIndex: childIndex,
                rowId: child.id
              };
              
              // Try to get display times from DOM (sub-child row)
              const domRow = document.getElementById(child.id);
              if (domRow) {
                const startCell = domRow.querySelector('td[data-key="start"]');
                const endCell = domRow.querySelector('td[data-key="end"]');
                
                if (startCell && startCell.textContent.trim()) {
                  mealData.startTime = this.parseTime(startCell.textContent.trim());
                }
                if (endCell && endCell.textContent.trim()) {
                  mealData.endTime = this.parseTime(endCell.textContent.trim());
                }
              }
              
              // Fallback to calculated times
              if (!mealData.startTime) {
                const parentStart = this.getRowTime({ ...row, scheduleStart: day.scheduleStart });
                mealData.startTime = parentStart;
              }
              if (!mealData.endTime) {
                mealData.endTime = mealData.startTime + (child.duration || 0);
              }
              
              meals.push(mealData);
            }
          });
        }
      });
    });
    
    alertLog('[Validator] Found designated meals:', meals);
    return meals;
  },
  
  /**
   * Validate meal break rule with designated meal support
   */
  validateMealBreak(tag, rowsWithTag) {
    if (!tag.rules?.mealBreak) return [];
    
    alertLog(`[Validator] Checking meal break for ${tag.label}:`, {
      mealBreak: tag.rules.mealBreak,
      rowCount: rowsWithTag.length
    });
    
    // Get designated meal events
    const designatedMeals = this.getDesignatedMeals();
    const firstMeal = designatedMeals.find(m => m.type === '1st meal');
    const secondMeal = designatedMeals.find(m => m.type === '2nd meal');
    
    // Sort rows by time
    const sorted = rowsWithTag.slice().sort((a, b) => this.getRowTime(a) - this.getRowTime(b));
    
    if (sorted.length === 0) return [];
    
    const violations = [];
    const mealThresholdMinutes = tag.rules.mealBreak * 60;
    const firstTagTime = this.getRowTime(sorted[0]);
    const lastTagTime = this.getRowEndTime(sorted[sorted.length - 1]);
    
    alertLog('[Validator] Tag work span:', {
      firstTag: this.formatTime(firstTagTime),
      lastTag: this.formatTime(lastTagTime),
      firstMeal: firstMeal ? this.formatTime(firstMeal.startTime) : 'none',
      secondMeal: secondMeal ? this.formatTime(secondMeal.startTime) : 'none',
      threshold: tag.rules.mealBreak + ' hours'
    });
    
    // Check first work period (first tag to 1st meal or end)
    if (firstMeal) {
      const workBeforeMeal = firstMeal.startTime - firstTagTime;
      const hoursBeforeMeal = workBeforeMeal / 60;
      
      alertLog('[Validator] Work period before 1st meal:', {
        duration: workBeforeMeal,
        hours: hoursBeforeMeal,
        threshold: tag.rules.mealBreak,
        exceeds: hoursBeforeMeal > tag.rules.mealBreak
      });
      
      if (hoursBeforeMeal > tag.rules.mealBreak) {
        violations.push({
          severity: 'warning',
          message: `${tag.label} worked ${hoursBeforeMeal.toFixed(1)} hours before 1st meal (from ${this.formatTime(firstTagTime)} to ${this.formatTime(firstMeal.startTime)}, threshold: ${tag.rules.mealBreak} hours)`,
          tagLabel: tag.label
        });
      }
      
      // Check second work period (after 1st meal)
      const workAfterFirstMeal = secondMeal 
        ? secondMeal.startTime - firstMeal.endTime
        : lastTagTime - firstMeal.endTime;
      const hoursAfterFirstMeal = workAfterFirstMeal / 60;
      
      alertLog('[Validator] Work period after 1st meal:', {
        duration: workAfterFirstMeal,
        hours: hoursAfterFirstMeal,
        threshold: tag.rules.mealBreak,
        exceeds: hoursAfterFirstMeal > tag.rules.mealBreak,
        endPoint: secondMeal ? '2nd meal' : 'last tag'
      });
      
      if (hoursAfterFirstMeal > tag.rules.mealBreak) {
        const endTime = secondMeal ? this.formatTime(secondMeal.startTime) : this.formatTime(lastTagTime);
        const endLabel = secondMeal ? '2nd meal' : 'wrap';
        
        violations.push({
          severity: 'warning',
          message: `${tag.label} worked ${hoursAfterFirstMeal.toFixed(1)} hours after 1st meal before ${endLabel} (from ${this.formatTime(firstMeal.endTime)} to ${endTime}, threshold: ${tag.rules.mealBreak} hours)`,
          tagLabel: tag.label
        });
      }
      
      // Check third work period (after 2nd meal) if applicable
      if (secondMeal) {
        const workAfterSecondMeal = lastTagTime - secondMeal.endTime;
        const hoursAfterSecondMeal = workAfterSecondMeal / 60;
        
        alertLog('[Validator] Work period after 2nd meal:', {
          duration: workAfterSecondMeal,
          hours: hoursAfterSecondMeal,
          threshold: tag.rules.mealBreak,
          exceeds: hoursAfterSecondMeal > tag.rules.mealBreak
        });
        
        if (hoursAfterSecondMeal > tag.rules.mealBreak) {
          violations.push({
            severity: 'warning',
            message: `${tag.label} worked ${hoursAfterSecondMeal.toFixed(1)} hours after 2nd meal (from ${this.formatTime(secondMeal.endTime)} to ${this.formatTime(lastTagTime)}, threshold: ${tag.rules.mealBreak} hours)`,
            tagLabel: tag.label
          });
        }
      }
      
    } else {
      // No designated meals - check if total work span exceeds threshold
      alertLog('[Validator] No designated meals found, checking continuous work span');
      
      const totalWorkMinutes = lastTagTime - firstTagTime;
      const totalWorkHours = totalWorkMinutes / 60;
      
      alertLog('[Validator] Continuous work without meals:', {
        duration: totalWorkMinutes,
        hours: totalWorkHours,
        threshold: tag.rules.mealBreak,
        exceeds: totalWorkHours > tag.rules.mealBreak
      });
      
      if (totalWorkHours > tag.rules.mealBreak) {
        violations.push({
          severity: 'warning',
          message: `${tag.label} worked ${totalWorkHours.toFixed(1)} hours without designated meal break (from ${this.formatTime(firstTagTime)} to ${this.formatTime(lastTagTime)}, threshold: ${tag.rules.mealBreak} hours)`,
          tagLabel: tag.label
        });
      }
    }
    
    alertLog(`[Validator] Meal break violations:`, violations.length);
    return violations;
  },
  
  /**
   * Validate custom duration alerts
   */
  validateCustomAlerts(tag, rowsWithTag) {
    if (!tag.rules?.customAlerts) return [];
    
    const violations = [];
    
    // Sort rows by time to get occurrences in order
    const sortedRows = rowsWithTag.slice().sort((a, b) => this.getRowTime(a) - this.getRowTime(b));
    
    // Build occurrence map
    const occurrences = sortedRows.map(row => ({
      startTime: this.getRowTime(row),
      endTime: this.getRowEndTime(row)
    }));
    
    // Calculate schedule events
    let callTime = occurrences.length > 0 ? occurrences[0].startTime : null;
    let wrapTime = occurrences.length > 0 ? occurrences[occurrences.length - 1].endTime : null;
    let lunchTime = null;
    
    if (tag.rules.mealBreak && callTime) {
      lunchTime = callTime + (tag.rules.mealBreak * 60);
    }
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    tag.rules.customAlerts.forEach(alert => {
      if (!alert.type || !alert.totalMinutes) return;
      
      // Determine anchor time
      let anchorTime = null;
      let anchorLabel = '';
      
      // Handle anchor mode: tag vs event
      if (alert.anchorMode === 'event' && alert.anchorEvent) {
        // Look up schedule event by ID
        const eventTime = this.getScheduleEventTime(alert.anchorEvent);
        if (eventTime) {
          anchorTime = eventTime.startTime;
          anchorLabel = eventTime.label;
        }
      } else {
        // Tag-based anchors
        if (alert.anchor === 'call') {
          anchorTime = callTime;
          anchorLabel = 'call';
        } else if (alert.anchor === 'wrap') {
          anchorTime = wrapTime;
          anchorLabel = 'wrap';
        } else if (alert.anchor === 'lunch') {
          anchorTime = lunchTime;
          anchorLabel = 'lunch';
        } else if (alert.anchor === 'last') {
          anchorTime = wrapTime;
          anchorLabel = 'last occurrence';
        } else if (alert.anchor && alert.anchor.match(/^\d+(st|nd|rd|th)$/)) {
          // Handle 1st, 2nd, 3rd, 4th, 5th occurrences
          const occNum = parseInt(alert.anchor);
          if (occNum > 0 && occNum <= occurrences.length) {
            anchorTime = occurrences[occNum - 1].startTime;
            anchorLabel = alert.anchor + ' occurrence';
          }
        }
      }
      
      if (anchorTime === null) return;
      
      // "Before" anchor (negative offset)
      if (alert.type === 'before') {
        const triggerTime = anchorTime - alert.totalMinutes;
        
        if (currentMinutes >= triggerTime) {
          violations.push({
            severity: 'info',
            message: `${tag.label}: ${alert.description} - due at ${this.formatTime(triggerTime)}`,
            tagLabel: tag.label,
            alertType: 'before',
            alertId: alert.id
          });
        }
      }
      
      // "After" anchor (positive offset)
      if (alert.type === 'after') {
        const triggerTime = anchorTime + alert.totalMinutes;
        
        if (currentMinutes >= triggerTime) {
          violations.push({
            severity: 'info',
            message: `${tag.label}: ${alert.description} - due at ${this.formatTime(triggerTime)}`,
            tagLabel: tag.label,
            alertType: 'after',
            alertId: alert.id
          });
        }
      }
      
      // "Every" X time from anchor (recurring)
      if (alert.type === 'every') {
        const elapsed = currentMinutes - anchorTime;
        if (elapsed > 0 && elapsed % alert.totalMinutes < 5) {
          violations.push({
            severity: 'info',
            message: `${tag.label}: ${alert.description} - recurring reminder`,
            tagLabel: tag.label,
            alertType: 'every',
            alertId: alert.id
          });
        }
      }
      
      // "At" specific time (absolute, anchor ignored)
      if (alert.type === 'at') {
        const alarmMinutes = (alert.hours * 60) + alert.minutes;
        
        if (currentMinutes >= alarmMinutes) {
          violations.push({
            severity: 'info',
            message: `${tag.label}: ${alert.description} - scheduled for ${this.formatTime(alarmMinutes)}`,
            tagLabel: tag.label,
            alertType: 'at',
            alertId: alert.id
          });
        }
      }
    });
    
    return violations;
  },
  
  /**
   * Generate info alerts for meal due times
   */
  generateMealDueInfo(tag, rowsWithTag) {
    if (!tag.rules?.mealBreak) return [];
    
    // Get the earliest start time for this tag
    let earliestStart = Infinity;
    
    rowsWithTag.forEach(row => {
      const rowStart = this.getRowTime(row);
      if (rowStart < earliestStart) earliestStart = rowStart;
    });
    
    if (earliestStart === Infinity) return [];
    
    // Calculate when meal is due (mealBreak hours after start)
    const mealDueTime = earliestStart + (tag.rules.mealBreak * 60);
    
    return [{
      severity: 'info',
      message: `${tag.label}: Meal due at ${this.formatTime(mealDueTime)} (${tag.rules.mealBreak} hours after ${this.formatTime(earliestStart)})`,
      tagLabel: tag.label
    }];
  },
  
  /**
   * Validate entire schedule
   */
  validateSchedule(scheduleData, tags) {
    alertLog('[Validator] ===== VALIDATION START =====');
    alertLog('[Validator] Schedule data:', scheduleData);
    alertLog('[Validator] Tags to check:', Object.keys(tags).length);
    
    const allViolations = [];
    
    Object.values(tags).forEach(tag => {
      alertLog(`[Validator] Checking tag: ${tag.label}`, {
        hasRules: !!tag.rules,
        rules: tag.rules
      });
      
      if (!tag.rules) return;
      
      const rowsWithTag = this.getRowsWithTag(scheduleData, tag.id);
      alertLog(`[Validator] Found ${rowsWithTag.length} rows with tag ${tag.label}`);
      
      if (rowsWithTag.length === 0) return;
      
      // Validate preset rules
      allViolations.push(...this.validateHardOut(tag, rowsWithTag));
      allViolations.push(...this.validateMaxHours(tag, rowsWithTag));
      allViolations.push(...this.validateMealBreak(tag, rowsWithTag));
      allViolations.push(...this.validateMinorRules(tag, rowsWithTag));
      
      // Generate meal due info alerts
      allViolations.push(...this.generateMealDueInfo(tag, rowsWithTag));
      
      // Validate custom alerts (after, every, at)
      allViolations.push(...this.validateCustomAlerts(tag, rowsWithTag));
    });
    
    return {
      violations: allViolations,
      criticalCount: allViolations.filter(v => v.severity === 'critical').length,
      warningCount: allViolations.filter(v => v.severity === 'warning').length,
      infoCount: allViolations.filter(v => v.severity === 'info').length,
      timestamp: Date.now()
    };
  }
};

// ============================================================================
// ALERT DASHBOARD
// ============================================================================

const AlertDashboard = (function() {
  'use strict';
  
  let dashboardElement = null;
  let fabElement = null;
  let isOpen = false;
  let liveMode = false;
  let validationInterval = null;
  
  function init() {
    createFAB();
    createDashboard();
    
    // Listen for time format toggle changes and re-run validation
    const timeFormatToggle = document.getElementById('timeFormatToggle');
    if (timeFormatToggle) {
      timeFormatToggle.addEventListener('change', () => {
        alertLog('[AlertDashboard] Time format changed, re-running validation');
        if (isOpen) {
          runValidation();
        }
      });
    }
    
    alertLog('[AlertDashboard] Initialized');
  }
  
  function createFAB() {
    alertLog('[AlertDashboard] Creating FAB');
    fabElement = document.createElement('button');
    fabElement.id = 'alert-fab';
    fabElement.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span class="alert-badge" style="display: none;">0</span>
    `;
    fabElement.addEventListener('click', toggle);
    document.body.appendChild(fabElement);
    alertLog('[AlertDashboard] FAB appended to body, element:', fabElement);
  }
  
  function createDashboard() {
    dashboardElement = document.createElement('div');
    dashboardElement.id = 'alert-dashboard';
    dashboardElement.className = 'alert-dashboard';
    dashboardElement.innerHTML = `
      <div id="production-tach" class="production-tach" style="visibility: hidden;">
        <div class="tach-gauge">
          <svg width="240" height="240" viewBox="0 0 240 240">
            <!-- Outer circle -->
            <circle cx="120" cy="120" r="114" fill="#2a2a2a" stroke="#4a4a4a" stroke-width="3"/>
            
            <!-- Bottom square-off line -->
            <line x1="6" y1="234" x2="234" y2="234" stroke="#4a4a4a" stroke-width="3"/>
            
            <!-- Vertical lines connecting bottom line to circle edges -->
            <line x1="6" y1="120" x2="6" y2="234" stroke="#4a4a4a" stroke-width="3"/>
            <line x1="234" y1="120" x2="234" y2="234" stroke="#4a4a4a" stroke-width="3"/>
            
            <!-- Inner circle -->
            <circle cx="120" cy="120" r="107" fill="#1a1a1a"/>
            
            <!-- Colored bands -->
            <path d="M 37.3 134.6 A 84 84 0 0 1 68.7 53.4" fill="none" stroke="#dc2626" stroke-width="8" stroke-linecap="butt"/>
            <path d="M 68.7 53.4 A 84 84 0 0 1 171.3 53.4" fill="none" stroke="#e5e5e5" stroke-width="8" stroke-linecap="butt"/>
            <path d="M 171.3 53.4 A 84 84 0 0 1 202.7 134.6" fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="butt"/>
            
            <!-- Hash marks -->
            <line x1="33.3" y1="135.3" x2="44.2" y2="133.4" stroke="#fff" stroke-width="2"/>
            <line x1="32.0" y1="120.0" x2="43.0" y2="120.0" stroke="#fff" stroke-width="2"/>
            <line x1="32.9" y1="107.8" x2="43.7" y2="109.3" stroke="#fff" stroke-width="2"/>
            <line x1="35.8" y1="94.3" x2="46.4" y2="97.5" stroke="#fff" stroke-width="2"/>
            <line x1="42.3" y1="78.7" x2="52.0" y2="83.9" stroke="#fff" stroke-width="2"/>
            <line x1="47.9" y1="69.5" x2="56.9" y2="75.8" stroke="#fff" stroke-width="2"/>
            <line x1="56.7" y1="58.9" x2="64.6" y2="66.5" stroke="#fff" stroke-width="2"/>
            <line x1="66.3" y1="50.3" x2="73.0" y2="59.0" stroke="#fff" stroke-width="2"/>
            <line x1="101.7" y1="33.9" x2="104.0" y2="44.7" stroke="#fff" stroke-width="2"/>
            <!-- 10 minute hash marks -->
            <line x1="82.8" y1="40.2" x2="87.5" y2="50.2" stroke="#fff" stroke-width="2"/>
            <line x1="120.0" y1="32.0" x2="120.0" y2="43.0" stroke="#fff" stroke-width="2"/>
            <line x1="157.2" y1="40.2" x2="152.5" y2="50.2" stroke="#fff" stroke-width="2"/>
            <line x1="138.3" y1="33.9" x2="136.0" y2="44.7" stroke="#fff" stroke-width="2"/>
            <line x1="173.7" y1="50.3" x2="167.0" y2="59.0" stroke="#fff" stroke-width="2"/>
            <line x1="183.3" y1="58.9" x2="175.4" y2="66.5" stroke="#fff" stroke-width="2"/>
            <line x1="192.1" y1="69.5" x2="183.1" y2="75.8" stroke="#fff" stroke-width="2"/>
            <line x1="197.7" y1="78.7" x2="188.0" y2="83.9" stroke="#fff" stroke-width="2"/>
            <line x1="204.2" y1="94.3" x2="193.6" y2="97.5" stroke="#fff" stroke-width="2"/>
            <line x1="207.1" y1="107.8" x2="196.3" y2="109.3" stroke="#fff" stroke-width="2"/>
            <line x1="208.0" y1="120.0" x2="197.0" y2="120.0" stroke="#fff" stroke-width="2"/>
            <line x1="206.7" y1="135.3" x2="195.8" y2="133.4" stroke="#fff" stroke-width="2"/>
            
            <!-- Numbers -->
            <text x="21.5" y="141.4" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">240</text>
            <text x="20.0" y="124.0" fill="#fff" font-size="11" text-anchor="middle" >180</text>
            <text x="21.0" y="110.1" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">120</text>
            <text x="24.4" y="94.8" fill="#fff" font-size="11" text-anchor="middle" >90</text>
            <text x="31.7" y="77.1" fill="#fff" font-size="11" text-anchor="middle" >60</text>
            <text x="38.1" y="66.6" fill="#fff" font-size="11" text-anchor="middle" >45</text>
            <text x="48.1" y="54.5" fill="#fff" font-size="11" text-anchor="middle" >30</text>
            <text x="59.0" y="44.8" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">15</text>
            <!-- 10 minute numbers -->
            <text x="77.7" y="33.4" fill="#fff" font-size="11" text-anchor="middle" >10</text>
            <text x="99.2" y="26.2" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">5</text>
            <text x="120.0" y="24.0" fill="#fff" font-size="11" text-anchor="middle" font-weight="700">0</text>
            <text x="140.8" y="26.2" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">5</text>
            <text x="162.3" y="33.4" fill="#fff" font-size="11" text-anchor="middle" >10</text>
            <text x="181.0" y="44.8" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">15</text>
            <text x="191.9" y="54.5" fill="#fff" font-size="11" text-anchor="middle" >30</text>
            <text x="201.9" y="66.6" fill="#fff" font-size="11" text-anchor="middle" >45</text>
            <text x="208.3" y="77.1" fill="#fff" font-size="11" text-anchor="middle" >60</text>
            <text x="215.6" y="94.8" fill="#fff" font-size="11" text-anchor="middle" >90</text>
            <text x="219.0" y="110.1" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">120</text>
            <text x="220.0" y="124.0" fill="#fff" font-size="11" text-anchor="middle" >180</text>
            <text x="218.5" y="141.4" fill="#fff" font-size="11" text-anchor="middle" font-weight="600">240</text>
            
            <!-- Needle -->
            <line id="tach-needle" x1="120" y1="120" x2="120" y2="50" stroke="#ff0000" stroke-width="3" stroke-linecap="round" transform="rotate(0 120 120)"/>
            
            <!-- Needle pivot -->
            <circle cx="120" cy="120" r="6" fill="#2d3748" stroke="#fff" stroke-width="2"/>
          </svg>
          
          <!-- Time difference display ABOVE pivot -->
          <div class="tach-time-display">
            <div class="tach-number" id="tach-number">--</div>
            <div class="tach-label">MINUTES</div>
          </div>
          
          <!-- Event displays BELOW pivot (two stacked) -->
          <div class="tach-event-display">
            <div class="tach-event-primary">
              <div class="tach-event-time" id="tach-event-time-1">--:--</div>
              <div class="tach-event-label" id="tach-event-label-1">--</div>
            </div>
            <div class="tach-event-secondary">
              <div class="tach-event-time-small" id="tach-event-time-2">--:--</div>
              <div class="tach-event-label-small" id="tach-event-label-2">--</div>
            </div>
          </div>
        </div>
      </div>
      <div class="alert-dashboard-header">
        <button id="alert-tach-toggle" class="alert-tach-toggle" title="Toggle Production Tachometer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
        <button id="alert-live-btn" class="alert-live-btn">
          <span class="live-indicator"></span>
          LIVE
        </button>
        <button id="alert-close-btn" class="alert-close-btn">×</button>
      </div>
      <div class="alert-tabs">
        <button class="alert-tab active" data-tab="active">Active</button>
        <button class="alert-tab" data-tab="hidden">Hidden</button>
      </div>
      <div class="alert-dashboard-body">
        <div class="alert-summary">
          <div class="alert-stat critical">
            <label class="alert-stat-checkbox">
              <input type="checkbox" data-category="critical" checked>
            </label>
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Critical</span>
          </div>
          <div class="alert-stat warning">
            <label class="alert-stat-checkbox">
              <input type="checkbox" data-category="warning" checked>
            </label>
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Warnings</span>
          </div>
          <div class="alert-stat info">
            <label class="alert-stat-checkbox">
              <input type="checkbox" data-category="info" checked>
            </label>
            <span class="alert-stat-count">0</span>
            <span class="alert-stat-label">Info</span>
          </div>
        </div>
        <div class="alert-list active"></div>
        <div class="alert-list hidden" style="display: none;"></div>
      </div>
    `;
    
    document.body.appendChild(dashboardElement);
    
    // Create and append tach as a sibling to dashboard (not a child)
    const tachElement = document.createElement('div');
    tachElement.id = 'production-tach';
    tachElement.className = 'production-tach'; // Don't add initialized yet
    tachElement.innerHTML = dashboardElement.querySelector('#production-tach').innerHTML;
    document.body.appendChild(tachElement);
    
    // Remove tach from dashboard since we've moved it to body
    dashboardElement.querySelector('#production-tach').remove();
    
    // Restore category filter state from localStorage
    const categoryFilters = JSON.parse(localStorage.getItem('alertCategoryFilters') || '{"critical": true, "warning": true, "info": true}');
    document.querySelectorAll('.alert-stat-checkbox input').forEach(checkbox => {
      const category = checkbox.dataset.category;
      checkbox.checked = categoryFilters[category] !== false;
      
      // Add change listener
      checkbox.addEventListener('change', () => {
        categoryFilters[category] = checkbox.checked;
        localStorage.setItem('alertCategoryFilters', JSON.stringify(categoryFilters));
        runValidation(); // Re-run validation to update badge
      });
    });
    
    // Restore live mode state from localStorage
    const savedLiveMode = localStorage.getItem('alertLiveMode') === 'true';
    const liveBtn = document.getElementById('alert-live-btn');
    
    // Initialize body data attribute
    document.body.dataset.liveMode = savedLiveMode ? 'true' : 'false';
    
    // Initialize sharpie button visibility based on live mode state
    if (savedLiveMode) {
      liveBtn.classList.add('active');
      liveMode = true;
      document.body.classList.remove('sharpie-buttons-collapsed');
      
      // DON'T restore tach visibility here - it will be restored when dashboard opens
      // Just set the toggle button state
      const tachVisible = localStorage.getItem('alertTachVisible') === 'true';
      if (tachVisible) {
        document.getElementById('alert-tach-toggle').classList.add('active');
      }
      
      // Restore sharpie lines visibility based on saved preference
      if (typeof SharpieManager !== 'undefined') {
        const linesHidden = localStorage.getItem('sharpie-lines-hidden') === 'true';
        if (linesHidden) {
          document.body.classList.add('sharpie-lines-hidden');
          setTimeout(() => {
            const lineElements = document.querySelectorAll('.sharpie-line-element');
            lineElements.forEach(line => line.style.display = 'none');
          }, 100);
        } else {
          document.body.classList.remove('sharpie-lines-hidden');
          setTimeout(() => {
            const lineElements = document.querySelectorAll('.sharpie-line-element');
            lineElements.forEach(line => line.style.display = '');
          }, 100);
        }
      }
      alertLog('[AlertDashboard] Initialized with live mode ON - sharpie buttons visible');
    } else {
      // LIVE mode is OFF - hide tach and sharpie elements
      document.body.classList.add('sharpie-buttons-collapsed');
      const tach = document.getElementById('production-tach');
      if (tach) tach.classList.remove('visible');
      
      // Hide sharpie lines when live mode is off (without changing localStorage preference)
      document.body.classList.add('sharpie-lines-hidden');
      setTimeout(() => {
        const lineElements = document.querySelectorAll('.sharpie-line-element');
        lineElements.forEach(line => line.style.display = 'none');
      }, 100);
      alertLog('[AlertDashboard] Initialized with live mode OFF - sharpie buttons and tach hidden');
    }
    
    // Event listeners
    document.getElementById('alert-close-btn').addEventListener('click', close);
    document.getElementById('alert-live-btn').addEventListener('click', (e) => {
      if (e.altKey || e.metaKey) {
        // Option/Alt-click triggers demo mode
        activateDemoMode();
      } else {
        toggleLiveMode();
      }
    });
    document.getElementById('alert-tach-toggle').addEventListener('click', toggleTach);
    
    // Tab switching
    document.querySelectorAll('.alert-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.alert-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding list
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.alert-list').forEach(list => {
          list.style.display = list.classList.contains(tabName) ? 'block' : 'none';
        });
      });
    });
    
    // Start validation interval immediately (always runs)
    alertLog('[AlertDashboard] Starting continuous validation');
    validationInterval = setInterval(runValidation, 1000);
  }
  
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }
  
  function open() {
    console.log('[DASHBOARD DEBUG] Opening dashboard');
    dashboardElement.classList.add('open');
    isOpen = true;
    
    // After dashboard animation completes, make tach available (but still parked)
    setTimeout(() => {
      const tach = document.getElementById('production-tach');
      if (tach) {
        tach.classList.add('initialized');
        
        // If tach toggle was active, show it
        const toggleBtn = document.getElementById('alert-tach-toggle');
        if (toggleBtn && toggleBtn.classList.contains('active')) {
          tach.classList.add('visible');
        }
      }
    }, 1100);
    
    runValidation();
  }
  
  function close() {
    console.log('[DASHBOARD DEBUG] Closing dashboard');
    
    const tach = document.getElementById('production-tach');
    
    if (tach && tach.classList.contains('visible')) {
      // Tach is up - slide it down first
      tach.classList.remove('visible');
      
      // Wait for slide animation, then hide and close dashboard
      setTimeout(() => {
        tach.classList.remove('initialized');
        dashboardElement.classList.remove('open');
        isOpen = false;
      }, 500);
    } else {
      // Tach is parked or doesn't exist - just hide and close
      if (tach) {
        tach.classList.remove('initialized');
      }
      dashboardElement.classList.remove('open');
      isOpen = false;
    }
  }
  
  function toggleLiveMode() {
    // Exit demo mode if active
    if (demoModeActive) {
      demoModeActive = false;
      console.log('[DEMO MODE] Deactivated');
    }
    
    liveMode = !liveMode;
    
    const liveBtn = document.getElementById('alert-live-btn');
    const tach = document.getElementById('production-tach');
    const toggleBtn = document.getElementById('alert-tach-toggle');
    
    // Persist live mode state
    localStorage.setItem('alertLiveMode', liveMode ? 'true' : 'false');
    
    // Set body attribute for CSS-based visibility
    document.body.dataset.liveMode = liveMode ? 'true' : 'false';
    
    if (liveMode) {
      alertLog('[AlertDashboard] Live mode enabled - showing sharpie buttons');
      liveBtn.classList.add('active');
      // Remove the collapsed class to show sharpie buttons
      // CSS will automatically transition the actions column width
      document.body.classList.remove('sharpie-buttons-collapsed');
      
      // Restore sharpie lines visibility based on saved preference
      if (typeof SharpieManager !== 'undefined') {
        const linesHidden = localStorage.getItem('sharpie-lines-hidden') === 'true';
        if (linesHidden) {
          document.body.classList.add('sharpie-lines-hidden');
          const lineElements = document.querySelectorAll('.sharpie-line-element');
          lineElements.forEach(line => line.style.display = 'none');
        } else {
          document.body.classList.remove('sharpie-lines-hidden');
          const lineElements = document.querySelectorAll('.sharpie-line-element');
          lineElements.forEach(line => line.style.display = '');
        }
      }
      
      // Restore tach visibility if it was previously shown
      const tachWasVisible = localStorage.getItem('alertTachVisible') === 'true';
      if (tachWasVisible && tach) {
        tach.classList.add('visible');
        if (toggleBtn) toggleBtn.classList.add('active');
      }
    } else {
      alertLog('[AlertDashboard] Live mode disabled - hiding sharpie buttons, tach, and lines');
      liveBtn.classList.remove('active');
      // Add the collapsed class to hide sharpie buttons
      // CSS will automatically transition the actions column width
      document.body.classList.add('sharpie-buttons-collapsed');
      
      // ALWAYS hide tach when LIVE mode is turned off (tach toggle button fades out)
      if (tach) {
        tach.classList.remove('visible');
      }
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
      }
      
      // Hide sharpie lines when exiting live mode (without changing localStorage preference)
      if (typeof SharpieManager !== 'undefined') {
        document.body.classList.add('sharpie-lines-hidden');
        const lineElements = document.querySelectorAll('.sharpie-line-element');
        lineElements.forEach(line => line.style.display = 'none');
      }
    }
  }
  
  function toggleTach() {
    console.log('[TACH DEBUG] toggleTach called');
    const tach = document.getElementById('production-tach');
    const toggleBtn = document.getElementById('alert-tach-toggle');
    console.log('[TACH DEBUG] tach element:', tach);
    console.log('[TACH DEBUG] toggleBtn element:', toggleBtn);
    const isVisible = tach.classList.contains('visible');
    console.log('[TACH DEBUG] isVisible:', isVisible);
    
    if (isVisible) {
      tach.classList.remove('visible');
      toggleBtn.classList.remove('active');
      localStorage.setItem('alertTachVisible', 'false');
      console.log('[TACH DEBUG] Tach hidden');
    } else {
      tach.classList.add('visible');
      toggleBtn.classList.add('active');
      localStorage.setItem('alertTachVisible', 'true');
      console.log('[TACH DEBUG] Tach shown');
      console.log('[TACH DEBUG] Tach classes:', tach.className);
      updateTachPosition(); // Update position when showing
      updateProductionTach();
    }
  }
  
  /**
   * Demo mode - Option-click LIVE button to show fake tach state
   * Shows needle at -22.5 minutes (halfway between -15 and -30)
   * Clears milestone times
   */
  let demoModeActive = false;
  
  function activateDemoMode() {
    console.log('[DEMO MODE] Activated');
    
    demoModeActive = true;
    
    // Turn on live mode if not already on
    if (!liveMode) {
      liveMode = true;
      updateLiveModeUI();
      startValidationInterval();
    }
    
    // Show tach if hidden
    const tach = document.getElementById('production-tach');
    const toggleBtn = document.getElementById('alert-tach-toggle');
    if (!tach.classList.contains('visible')) {
      tach.classList.add('visible');
      toggleBtn.classList.add('active');
    }
    
    // Update tach to demo state
    const needle = document.getElementById('tach-needle');
    const numberDisplay = document.getElementById('tach-number');
    const eventTime1 = document.getElementById('tach-event-time-1');
    const eventLabel1 = document.getElementById('tach-event-label-1');
    const eventTime2 = document.getElementById('tach-event-time-2');
    const eventLabel2 = document.getElementById('tach-event-label-2');
    
    if (!needle || !numberDisplay) return;
    
    // -22.5 minutes is halfway between -15 and -30
    const demoMinutes = -22.5;
    const angle = calculateTachPosition(demoMinutes);
    
    needle.setAttribute('transform', `rotate(${angle} 120 120)`);
    numberDisplay.textContent = '-23'; // Round to nearest minute
    numberDisplay.style.color = '#fff';
    
    // Clear milestone times
    if (eventTime1) eventTime1.textContent = '--:--';
    if (eventLabel1) eventLabel1.textContent = 'CAMERA WRAP';
    if (eventTime2) eventTime2.textContent = '--:--';
    if (eventLabel2) eventLabel2.textContent = 'TAIL-LIGHTS';
    
    console.log('[DEMO MODE] Tach set to -22.5 minutes, angle:', angle);
  }
  
  /**
   * Calculate needle angle for tach based on minutes delta
   * The gauge is non-linear with these visual anchor points:
   * - 0 min = 0° (top)
   * - 5 min = ~18° 
   * - 15 min = ~45°
   * - 30 min = ~60°
   * - 60 min = ~75°
   * - 90 min = ~90° (horizontal)
   * - 120 min = ~105°
   * - 180 min = ~120°
   * - 240 min = ~135° (bottom of visible arc)
   * Negative values mirror to the left
   */
  function calculateTachPosition(minutes) {
    // Clamp to gauge range
    const clamped = Math.max(-240, Math.min(240, minutes));
    
    const sign = clamped >= 0 ? 1 : -1;
    const abs = Math.abs(clamped);
    
    // Piecewise linear interpolation matching the gauge markings
    let angle;
    if (abs <= 5) {
      // 0-5 min: 0° to 18°
      angle = (abs / 5) * 18;
    } else if (abs <= 10) {
      // 5-10 min: 18° to 30°
      angle = 18 + ((abs - 5) / 5) * 12;
    } else if (abs <= 15) {
      // 10-15 min: 30° to 45°
      angle = 30 + ((abs - 10) / 5) * 15;
    } else if (abs <= 30) {
      // 15-30 min: 45° to 60°
      angle = 45 + ((abs - 15) / 15) * 15;
    } else if (abs <= 45) {
      // 30-45 min: 60° to 68°
      angle = 60 + ((abs - 30) / 15) * 8;
    } else if (abs <= 60) {
      // 45-60 min: 68° to 75°
      angle = 68 + ((abs - 45) / 15) * 7;
    } else if (abs <= 90) {
      // 60-90 min: 75° to 90°
      angle = 75 + ((abs - 60) / 30) * 15;
    } else if (abs <= 120) {
      // 90-120 min: 90° to 105°
      angle = 90 + ((abs - 90) / 30) * 15;
    } else if (abs <= 180) {
      // 120-180 min: 105° to 120°
      angle = 105 + ((abs - 120) / 60) * 15;
    } else {
      // 180-240 min: 120° to 135°
      angle = 120 + ((abs - 180) / 60) * 15;
    }
    
    return sign * angle;
  }
  
  /**
   * Update production tachometer based on schedule progress
   */
  function updateProductionTach() {
    // Skip if demo mode is active
    if (demoModeActive) {
      alertLog('[Tach] Demo mode active, skipping update');
      return;
    }
    
    alertLog('[Tach] === UPDATE CALLED ===');
    
    const needle = document.getElementById('tach-needle');
    const numberDisplay = document.getElementById('tach-number');
    const eventTime1 = document.getElementById('tach-event-time-1');
    const eventLabel1 = document.getElementById('tach-event-label-1');
    const eventTime2 = document.getElementById('tach-event-time-2');
    const eventLabel2 = document.getElementById('tach-event-label-2');
    
    if (!needle || !numberDisplay || !eventTime1 || !eventLabel1 || !eventTime2 || !eventLabel2) {
      alertLog('[Tach] Missing tach elements');
      return;
    }
    
    // Find last completed row
    let lastCompleted = null;
    let lastCompletedTime = 0;
    
    alertLog('[Tach] Checking SharpieManager.markedRows:', window.SharpieManager?.markedRows);
    
    if (window.SharpieManager && window.SharpieManager.markedRows) {
      alertLog('[Tach] Found', window.SharpieManager.markedRows.size, 'marked rows');
      window.SharpieManager.markedRows.forEach(rowId => {
        alertLog('[Tach] Checking marked row:', rowId);
        const row = document.getElementById(rowId);
        if (row && row.dataset.completedAt) {
          const completedAt = parseInt(row.dataset.completedAt);
          alertLog('[Tach] Row', rowId, 'completed at', completedAt);
          if (completedAt > lastCompletedTime) {
            lastCompletedTime = completedAt;
            lastCompleted = row;
          }
        } else {
          alertLog('[Tach] Row', rowId, 'found but no completedAt:', row?.dataset.completedAt);
        }
      });
    }
    
    alertLog('[Tach] Last completed row:', lastCompleted?.id);
    
    // Find first incomplete row (next event after last completed)
    let firstIncomplete = null;
    // Get all rows from the same table, filter to EVENTs
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) {
      alertLog('[Tach] ERROR: Could not find schedule table tbody');
      return;
    }
    
    const allRows = Array.from(tbody.querySelectorAll('tr'));
    const eventRows = allRows.filter(row => row.dataset.type === 'EVENT' && !row.classList.contains('subchild'));
    
    alertLog('[Tach] Total rows in table:', allRows.length);
    alertLog('[Tach] Total EVENT rows:', eventRows.length);
    
    if (lastCompleted) {
      // Find the row after the last completed one
      let foundLastCompleted = false;
      for (const row of eventRows) {
        if (foundLastCompleted) {
          // This is the first row after last completed
          const rowId = row.id;
          const isCompleted = window.SharpieManager?.markedRows?.has(rowId);
          alertLog('[Tach] Checking row after lastCompleted:', rowId, 'isCompleted:', isCompleted);
          if (!isCompleted) {
            firstIncomplete = row;
            alertLog('[Tach] Found first incomplete:', rowId);
            break;
          }
        }
        if (row.id === lastCompleted.id) {
          foundLastCompleted = true;
          alertLog('[Tach] Found lastCompleted in EVENT list');
        }
      }
    } else {
      // No completed rows yet - use first EVENT row
      firstIncomplete = eventRows[0];
      alertLog('[Tach] No completed rows, using first EVENT:', firstIncomplete?.id);
    }
    
    alertLog('[Tach] First incomplete row:', firstIncomplete?.id);
    
    if (!firstIncomplete) {
      // All rows completed - reset to center
      needle.setAttribute('transform', 'rotate(0 120 120)');
      numberDisplay.textContent = '--';
      numberDisplay.style.color = '#fff';
      alertLog('[Tach] All EVENT rows completed or none found');
      return;
    }
    
    // Scan entire schedule for specific milestone events
    const milestoneRows = document.querySelectorAll('#scheduleTable tbody tr:not(.sub-row)');
    let cameraWrapRow = null;
    let tailLightsRow = null;
    
    milestoneRows.forEach(row => {
      // Check the TYPE column cell for matching text
      const typeCell = row.querySelector('td[data-key="type"]');
      if (typeCell) {
        const typeText = typeCell.textContent.trim().toUpperCase();
        if (typeText.includes('CAMERA') && typeText.includes('WRAP')) {
          cameraWrapRow = row; // Keep last occurrence
        } else if (typeText.includes('TAIL') && typeText.includes('LIGHT')) {
          tailLightsRow = row; // Keep last occurrence
        }
      }
    });
    
    // Display CAMERA WRAP event (primary display)
    if (cameraWrapRow) {
      const endCell = cameraWrapRow.querySelector('td[data-key="end"]');
      const startCell = cameraWrapRow.querySelector('td[data-key="start"]');
      const endTime = endCell ? endCell.textContent.trim() : '';
      const startTime = startCell ? startCell.textContent.trim() : '';
      // Prefer END time, fall back to START time
      eventTime1.textContent = endTime || startTime || '--:--';
      eventLabel1.textContent = 'CAMERA WRAP';
      alertLog('[Tach] Camera Wrap at:', eventTime1.textContent);
    } else {
      eventTime1.textContent = '--:--';
      eventLabel1.textContent = 'CAMERA WRAP';
      alertLog('[Tach] No Camera Wrap event found');
    }
    
    // Display TAIL-LIGHTS event (secondary display)
    if (tailLightsRow) {
      const endCell = tailLightsRow.querySelector('td[data-key="end"]');
      const startCell = tailLightsRow.querySelector('td[data-key="start"]');
      const endTime = endCell ? endCell.textContent.trim() : '';
      const startTime = startCell ? startCell.textContent.trim() : '';
      // Prefer END time, fall back to START time
      eventTime2.textContent = endTime || startTime || '--:--';
      eventLabel2.textContent = 'TAIL-LIGHTS';
      alertLog('[Tach] Tail-Lights at:', eventTime2.textContent);
    } else {
      eventTime2.textContent = '--:--';
      eventLabel2.textContent = 'TAIL-LIGHTS';
      alertLog('[Tach] No Tail-Lights event found');
    }
    
    // Get END time of the first incomplete row for needle calculation
    const endCell = firstIncomplete.querySelector('td[data-key="end"]');
    alertLog('[Tach] End cell:', endCell, 'content:', endCell?.textContent.trim());
    
    if (!endCell || !endCell.textContent.trim()) {
      needle.setAttribute('transform', 'rotate(0 120 120)');
      numberDisplay.textContent = '--';
      numberDisplay.style.color = '#fff';
      alertLog('[Tach] No end time found');
      return;
    }
    
    const scheduledEndTime = ScheduleValidator.parseTime(endCell.textContent.trim());
    alertLog('[Tach] Scheduled end time (minutes):', scheduledEndTime);
    
    if (scheduledEndTime === null) {
      needle.setAttribute('transform', 'rotate(0 120 120)');
      numberDisplay.textContent = '--';
      numberDisplay.style.color = '#fff';
      alertLog('[Tach] Could not parse scheduled end time');
      return;
    }
    
    // Get current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    alertLog('[Tach] Current time (minutes):', currentMinutes, '(' + now.getHours() + ':' + now.getMinutes() + ')');
    
    // Calculate difference (positive = ahead, negative = behind)
    const diffMinutes = scheduledEndTime - currentMinutes;
    alertLog('[Tach] Time difference:', diffMinutes, 'minutes');
    
    // Update needle position
    const angle = calculateTachPosition(diffMinutes);
    alertLog('[Tach] Needle angle:', angle);
    console.log('[NEEDLE DEBUG] Calculated angle:', angle, 'degrees');
    console.log('[NEEDLE DEBUG] diffMinutes:', diffMinutes);
    
    // Use SVG transform attribute (not CSS style) - specify rotation center as (120 120)
    needle.setAttribute('transform', `rotate(${angle} 120 120)`);
    console.log('[NEEDLE DEBUG] Needle transform set:', needle.getAttribute('transform'));
    alertLog('[Tach] Needle transform set to:', needle.getAttribute('transform'));
    
    // Update numeric display
    const absDiff = Math.abs(diffMinutes);
    
    // Always use white color for number display
    numberDisplay.style.color = '#fff';
    
    // ±5 minute grace period for "ON TIME"
    if (absDiff <= 5) {
      numberDisplay.textContent = '0';
      alertLog('[Tach] ON TIME (within 5 min grace period)');
    } else if (diffMinutes > 5) {
      // More than 5 minutes ahead
      numberDisplay.textContent = '+' + absDiff.toString();
      alertLog('[Tach] AHEAD:', absDiff, 'minutes');
    } else if (diffMinutes < -5) {
      // More than 5 minutes behind
      numberDisplay.textContent = '-' + absDiff.toString();
      alertLog('[Tach] BEHIND:', absDiff, 'minutes');
    }
  }
  
  function runValidation() {
    alertLog('[AlertDashboard] runValidation called, liveMode:', liveMode);
    
    const scheduleData = window.getScheduleData ? window.getScheduleData() : null;
    
    if (!scheduleData) {
      alertWarn('[AlertDashboard] No schedule data available');
      return;
    }
    
    if (!window.TagManager || !window.TagManager.tags) {
      alertWarn('[AlertDashboard] TagManager not available');
      return;
    }
    
    const results = ScheduleValidator.validateSchedule(scheduleData, TagManager.tags);
    displayResults(results);
    updateFABBadge(results);
    
    // Only update production tach if it's visible
    const tach = document.getElementById('production-tach');
    if (tach && tach.classList.contains('visible')) {
      updateProductionTach();
    }
  }
  
  function displayResults(results) {
    // Get dismissed alerts from localStorage
    const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    
    // Split violations into active and hidden
    const activeViolations = results.violations.filter(v => 
      !dismissedAlerts.includes(v.alertId || v.message)
    );
    const hiddenViolations = results.violations.filter(v => 
      dismissedAlerts.includes(v.alertId || v.message)
    );
    
    // Update summary stats (only count active)
    const activeCritical = activeViolations.filter(v => v.severity === 'critical').length;
    const activeWarning = activeViolations.filter(v => v.severity === 'warning').length;
    const activeInfo = activeViolations.filter(v => v.severity === 'info').length;
    
    document.querySelector('.alert-stat.critical .alert-stat-count').textContent = activeCritical;
    document.querySelector('.alert-stat.warning .alert-stat-count').textContent = activeWarning;
    document.querySelector('.alert-stat.info .alert-stat-count').textContent = activeInfo;
    
    // Display active violations
    const activeListEl = document.querySelector('.alert-list.active');
    renderViolationList(activeViolations, activeListEl, false);
    
    // Display hidden violations
    const hiddenListEl = document.querySelector('.alert-list.hidden');
    renderViolationList(hiddenViolations, hiddenListEl, true);
    
    // Update tach position based on dashboard height
    updateTachPosition();
  }
  
  function updateTachPosition() {
    const dashboard = document.querySelector('.alert-dashboard');
    const tach = document.getElementById('production-tach');
    
    if (dashboard && tach) {
      // Wait for DOM update
      setTimeout(() => {
        const rect = dashboard.getBoundingClientRect();
        const dashboardTop = rect.top;
        const tachHeight = 310;
        
        // Position tach so its bottom edge aligns with dashboard top
        tach.style.setProperty('--dashboard-top', `${window.innerHeight - dashboardTop}px`);
        tach.style.bottom = `calc(100vh - ${dashboardTop}px)`;
      }, 0);
    }
  }
  
  // Update tach position on window resize
  window.addEventListener('resize', () => {
    const tach = document.getElementById('production-tach');
    if (tach && tach.classList.contains('visible')) {
      updateTachPosition();
    }
  });
  
  function renderViolationList(violations, listEl, isHidden) {
    listEl.innerHTML = '';
    
    if (violations.length === 0) {
      listEl.innerHTML = `<div class="alert-empty">${isHidden ? 'No hidden alerts' : '✓ No issues found'}</div>`;
      return;
    }
    
    // Group by severity
    const groups = {
      critical: violations.filter(v => v.severity === 'critical'),
      warning: violations.filter(v => v.severity === 'warning'),
      info: violations.filter(v => v.severity === 'info')
    };
    
    // Render each group
    Object.entries(groups).forEach(([severity, items]) => {
      if (items.length === 0) return;
      
      const groupEl = document.createElement('div');
      groupEl.className = `alert-group alert-group-${severity}`;
      
      const headerEl = document.createElement('div');
      headerEl.className = 'alert-group-header';
      headerEl.textContent = `${severity.charAt(0).toUpperCase() + severity.slice(1)} (${items.length})`;
      groupEl.appendChild(headerEl);
      
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'alert-item';
        
        const dismissBtn = isHidden ? 
          `<button class="alert-restore-btn" data-id="${item.alertId || item.message}">↺</button>` :
          `<button class="alert-dismiss-btn" data-id="${item.alertId || item.message}">×</button>`;
        
        itemEl.innerHTML = `
          <div class="alert-item-icon">${getIcon(severity)}</div>
          <div class="alert-item-content">
            <div class="alert-item-message">${item.message}</div>
            ${item.rowInfo ? `<div class="alert-item-meta">${item.rowInfo}</div>` : ''}
          </div>
          ${dismissBtn}
        `;
        groupEl.appendChild(itemEl);
      });
      
      listEl.appendChild(groupEl);
    });
    
    // Attach dismiss/restore handlers
    listEl.querySelectorAll('.alert-dismiss-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alertId = btn.dataset.id;
        dismissAlert(alertId);
      });
    });
    
    listEl.querySelectorAll('.alert-restore-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alertId = btn.dataset.id;
        restoreAlert(alertId);
      });
    });
  }
  
  function dismissAlert(alertId) {
    const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    if (!dismissedAlerts.includes(alertId)) {
      dismissedAlerts.push(alertId);
      localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedAlerts));
    }
    runValidation(); // Refresh display
  }
  
  function restoreAlert(alertId) {
    const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    const index = dismissedAlerts.indexOf(alertId);
    if (index > -1) {
      dismissedAlerts.splice(index, 1);
      localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedAlerts));
    }
    runValidation(); // Refresh display
  }
  
  function getIcon(severity) {
    const icons = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵',
      reminder: '📋'
    };
    return icons[severity] || '•';
  }
  
  function updateFABBadge(results) {
    // Get dismissed alerts
    const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    
    // Filter to only active (non-dismissed) violations
    const activeViolations = results.violations.filter(v => 
      !dismissedAlerts.includes(v.alertId || v.message)
    );
    
    // Get category filter state
    const categoryFilters = JSON.parse(localStorage.getItem('alertCategoryFilters') || '{"critical": true, "warning": true, "info": true}');
    
    // Count only the categories that are enabled
    let totalIssues = 0;
    
    if (categoryFilters.critical !== false) {
      totalIssues += activeViolations.filter(v => v.severity === 'critical').length;
    }
    if (categoryFilters.warning !== false) {
      totalIssues += activeViolations.filter(v => v.severity === 'warning').length;
    }
    if (categoryFilters.info !== false) {
      totalIssues += activeViolations.filter(v => v.severity === 'info').length;
    }
    
    const badge = fabElement.querySelector('.alert-badge');
    
    if (totalIssues > 0) {
      badge.textContent = totalIssues;
      badge.style.display = 'block';
      fabElement.classList.add('has-alerts');
    } else {
      badge.style.display = 'none';
      fabElement.classList.remove('has-alerts');
    }
  }
  
  return {
    init,
    open,
    close,
    runValidation
  };
})();

// ============================================================================
// INITIALIZATION
// ============================================================================

alertLog('[AlertSystem] Script loaded, readyState:', document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    alertLog('[AlertSystem] DOMContentLoaded fired');
    AlertDashboard.init();
  });
} else {
  alertLog('[AlertSystem] DOM already loaded, initializing immediately');
  AlertDashboard.init();
}

// Expose globally (TagRulesEditor is now in tag-manager-unified.js)
window.AlertDashboard = AlertDashboard;
window.ScheduleValidator = ScheduleValidator;

alertLog('[AlertSystem] Globals exposed:', {
  AlertDashboard: !!window.AlertDashboard,
  ScheduleValidator: !!window.ScheduleValidator
});
