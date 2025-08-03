/* ===================================
   Pass Plus SOM - Calendar Module
   Interactive calendar for lesson booking
   =================================== */

// Calendar functionality
const Calendar = {
  currentDate: new Date(),
  selectedDate: null,
  availableDates: [],
  bookedDates: [],
  disabledDates: [],
  dateSelectionCallback: null,
  minDate: new Date(),
  maxDate: null,
  
  // Initialize calendar
  init(onDateSelect = null, options = {}) {
    Logger.info('Initializing calendar module');
    
    this.dateSelectionCallback = onDateSelect;
    this.minDate = options.minDate || new Date();
    this.maxDate = options.maxDate || this.getMaxBookingDate();
    
    // Set max date to 3 months ahead by default
    if (!this.maxDate) {
      this.maxDate = new Date();
      this.maxDate.setMonth(this.maxDate.getMonth() + 3);
    }
    
    this.render();
    this.initializeControls();
    
    // Load available dates if instructor is selected
    const instructorId = Storage.get('selectedInstructorId');
    if (instructorId) {
      this.loadInstructorAvailability(instructorId);
    }
  },
  
  // Get maximum booking date (3 months ahead)
  getMaxBookingDate() {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate;
  },
  
  // Render calendar
  render() {
    const container = DOM.$('calendar-container');
    if (!container) {
      Logger.warn('Calendar container not found');
      return;
    }
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const calendarHtml = `
      <div class="calendar">
        <div class="calendar-header">
          <button type="button" id="prev-month" class="calendar-nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <h3 class="calendar-title" id="calendar-title">
            ${this.getMonthName(month)} ${year}
          </h3>
          
          <button type="button" id="next-month" class="calendar-nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        
        <div class="calendar-weekdays">
          <div class="weekday">Sun</div>
          <div class="weekday">Mon</div>
          <div class="weekday">Tue</div>
          <div class="weekday">Wed</div>
          <div class="weekday">Thu</div>
          <div class="weekday">Fri</div>
          <div class="weekday">Sat</div>
        </div>
        
        <div class="calendar-grid" id="calendar-grid">
          ${this.generateCalendarDays(year, month)}
        </div>
        
        <div class="calendar-legend">
          <div class="legend-item">
            <div class="legend-color available"></div>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <div class="legend-color booked"></div>
            <span>Booked</span>
          </div>
          <div class="legend-item">
            <div class="legend-color disabled"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </div>
    `;
    
    // Use safe HTML insertion
    Utils.safeSetHTML(container, calendarHtml);
    
    this.attachDateListeners();
  },
  
  // Generate calendar days
  generateCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let html = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + (week * 7) + day);
        
        const isCurrentMonth = current.getMonth() === month;
        const isToday = current.getTime() === today.getTime();
        const isSelected = this.selectedDate && 
          current.getTime() === new Date(this.selectedDate).getTime();
        const isPast = current < today;
        const isTooFar = current > this.maxDate;
        const dateStr = DateTime.toISODate(current);
        
        let cssClasses = ['calendar-day'];
        let clickable = true;
        
        if (!isCurrentMonth) {
          cssClasses.push('other-month');
          clickable = false;
        }
        
        if (isToday) {
          cssClasses.push('today');
        }
        
        if (isSelected) {
          cssClasses.push('selected');
        }
        
        if (isPast || isTooFar) {
          cssClasses.push('disabled');
          clickable = false;
        }
        
        // Check availability status
        if (this.availableDates.includes(dateStr)) {
          cssClasses.push('available');
        } else if (this.bookedDates.includes(dateStr)) {
          cssClasses.push('booked');
          clickable = false;
        } else if (this.disabledDates.includes(dateStr)) {
          cssClasses.push('disabled');
          clickable = false;
        }
        
        html += `
          <div class="${cssClasses.join(' ')}" 
               data-date="${dateStr}"
               ${clickable ? 'data-clickable="true"' : ''}>
            <span class="day-number">${current.getDate()}</span>
            ${this.getDayIndicators(dateStr)}
          </div>
        `;
      }
    }
    
    return html;
  },
  
  // Get day indicators (dots for availability, bookings, etc.)
  getDayIndicators(dateStr) {
    let indicators = '';
    
    if (this.availableDates.includes(dateStr)) {
      indicators += '<div class="day-indicator available-indicator"></div>';
    }
    
    if (this.bookedDates.includes(dateStr)) {
      indicators += '<div class="day-indicator booked-indicator"></div>';
    }
    
    return indicators;
  },
  
  // Get month name
  getMonthName(monthIndex) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
  },
  
  // Initialize navigation controls
  initializeControls() {
    const prevBtn = DOM.$('prev-month');
    const nextBtn = DOM.$('next-month');
    
    if (prevBtn) {
      DOM.on(prevBtn, 'click', () => this.previousMonth());
    }
    
    if (nextBtn) {
      DOM.on(nextBtn, 'click', () => this.nextMonth());
    }
  },
  
  // Navigate to previous month
  previousMonth() {
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    
    // Don't go before current month
    const today = new Date();
    if (newDate.getFullYear() < today.getFullYear() || 
        (newDate.getFullYear() === today.getFullYear() && 
         newDate.getMonth() < today.getMonth())) {
      return;
    }
    
    this.currentDate = newDate;
    this.render();
    
    // Reload availability for new month
    const instructorId = Storage.get('selectedInstructorId');
    if (instructorId) {
      this.loadInstructorAvailability(instructorId);
    }
  },
  
  // Navigate to next month
  nextMonth() {
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    
    // Don't go beyond max booking date
    if (newDate > this.maxDate) {
      return;
    }
    
    this.currentDate = newDate;
    this.render();
    
    // Reload availability for new month
    const instructorId = Storage.get('selectedInstructorId');
    if (instructorId) {
      this.loadInstructorAvailability(instructorId);
    }
  },
  
  // Attach date click listeners
  attachDateListeners() {
    const clickableDays = DOM.findAll('.calendar-day[data-clickable="true"]');
    
    clickableDays.forEach(day => {
      DOM.on(day, 'click', () => {
        const dateStr = day.dataset.date;
        this.selectDate(dateStr);
      });
    });
  },
  
  // Select a date
  selectDate(dateStr) {
    // Remove previous selection
    const previousSelected = DOM.find('.calendar-day.selected');
    if (previousSelected) {
      DOM.removeClass(previousSelected, 'selected');
    }
    
    // Add selection to new date
    const dayElement = DOM.find(`[data-date="${dateStr}"]`);
    if (dayElement) {
      DOM.addClass(dayElement, 'selected');
    }
    
    this.selectedDate = dateStr;
    Logger.debug('Date selected:', dateStr);
    
    // Call selection callback
    if (this.dateSelectionCallback) {
      this.dateSelectionCallback(dateStr);
    }
    
    // Update selected date display
    this.updateSelectedDateDisplay(dateStr);
  },
  
  // Update selected date display
  updateSelectedDateDisplay(dateStr) {
    const displayElement = DOM.$('selected-date-display');
    if (displayElement) {
      displayElement.textContent = DateTime.formatDate(dateStr, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  },
  
  // Load instructor availability
  async loadInstructorAvailability(instructorId, monthOffset = 0) {
    try {
      const targetDate = new Date(this.currentDate);
      targetDate.setMonth(targetDate.getMonth() + monthOffset);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      Logger.debug('Loading availability for instructor:', instructorId, 'from', startDate, 'to', endDate);
      
      // Get instructor preferences for working days
      const instructor = await InstructorService.getInstructorById(instructorId);
      const preferences = instructor.preferences?.[0] || {};
      
      // Get existing bookings for the month
      const bookings = await Database.select('booking_requests', 'lesson_date', {
        instructor_id: instructorId,
        lesson_date: { 
          operator: 'gte', 
          value: DateTime.toISODate(startDate) 
        },
        lesson_date2: { 
          operator: 'lte', 
          value: DateTime.toISODate(endDate) 
        },
        status: { operator: 'neq', value: 'cancelled' }
      });
      
      // Clear previous data
      this.availableDates = [];
      this.bookedDates = [];
      this.disabledDates = [];
      
      // Process each day of the month
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = DateTime.toISODate(date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Check if day is in instructor's working days
        const workingDays = preferences.working_days || [1, 2, 3, 4, 5]; // Default: Mon-Fri
        
        if (!workingDays.includes(dayOfWeek)) {
          this.disabledDates.push(dateStr);
          continue;
        }
        
        // Check if date is already booked
        const isBooked = bookings.some(booking => booking.lesson_date === dateStr);
        
        if (isBooked) {
          this.bookedDates.push(dateStr);
        } else {
          // Check if date is too far in the past or future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (date >= today && date <= this.maxDate) {
            this.availableDates.push(dateStr);
          } else {
            this.disabledDates.push(dateStr);
          }
        }
      }
      
      Logger.debug('Availability loaded:', {
        available: this.availableDates.length,
        booked: this.bookedDates.length,
        disabled: this.disabledDates.length
      });
      
      // Re-render calendar with updated availability
      this.render();
      
    } catch (error) {
      Logger.error('Failed to load instructor availability:', error);
    }
  },
  
  // Set available dates externally
  setAvailableDates(dates) {
    this.availableDates = dates;
    this.render();
  },
  
  // Set booked dates externally
  setBookedDates(dates) {
    this.bookedDates = dates;
    this.render();
  },
  
  // Set disabled dates externally
  setDisabledDates(dates) {
    this.disabledDates = dates;
    this.render();
  },
  
  // Get selected date
  getSelectedDate() {
    return this.selectedDate;
  },
  
  // Clear selection
  clearSelection() {
    const selected = DOM.find('.calendar-day.selected');
    if (selected) {
      DOM.removeClass(selected, 'selected');
    }
    this.selectedDate = null;
  },
  
  // Jump to specific month
  goToMonth(year, month) {
    this.currentDate = new Date(year, month, 1);
    this.render();
    
    // Reload availability
    const instructorId = Storage.get('selectedInstructorId');
    if (instructorId) {
      this.loadInstructorAvailability(instructorId);
    }
  },
  
  // Jump to today
  goToToday() {
    const today = new Date();
    this.goToMonth(today.getFullYear(), today.getMonth());
  },
  
  // Refresh calendar data
  async refresh() {
    const instructorId = Storage.get('selectedInstructorId');
    if (instructorId) {
      await this.loadInstructorAvailability(instructorId);
    }
  },
  
  // Check if date is available
  isDateAvailable(dateStr) {
    return this.availableDates.includes(dateStr);
  },
  
  // Check if date is booked
  isDateBooked(dateStr) {
    return this.bookedDates.includes(dateStr);
  },
  
  // Check if date is disabled
  isDateDisabled(dateStr) {
    return this.disabledDates.includes(dateStr);
  },
  
  // Get calendar state
  getState() {
    return {
      currentDate: this.currentDate,
      selectedDate: this.selectedDate,
      availableDates: this.availableDates,
      bookedDates: this.bookedDates,
      disabledDates: this.disabledDates
    };
  },
  
  // Restore calendar state
  setState(state) {
    this.currentDate = new Date(state.currentDate);
    this.selectedDate = state.selectedDate;
    this.availableDates = state.availableDates || [];
    this.bookedDates = state.bookedDates || [];
    this.disabledDates = state.disabledDates || [];
    this.render();
  }
};

// Initialize calendar module when DOM is ready
if (typeof window !== 'undefined') {
  window.Calendar = Calendar;
  
  // Auto-initialize if calendar container exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (DOM.$('calendar-container')) {
        // Calendar will be initialized by the booking module
        Logger.debug('Calendar container found, waiting for booking module initialization');
      }
    });
  } else {
    if (DOM.$('calendar-container')) {
      Logger.debug('Calendar container found, waiting for booking module initialization');
    }
  }
}