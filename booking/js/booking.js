/* ===================================
   Pass Plus SOM - Booking Module
   Multi-step booking flow and management
   =================================== */

// Booking Controller
const Booking = {
  currentStep: 1,
  totalSteps: 5,
  bookingData: {
    instructorId: null,
    instructor: null,
    date: null,
    time: null,
    lessonType: 'standard',
    duration: 60,
    pickupPostcode: '',
    pickupAddress: '',
    notes: '',
    basePrice: 35,
    areaCharge: 0,
    totalPrice: 35,
    paymentMethod: 'open_banking'
  },
  
  // Initialize booking module
  async init() {
    Logger.info('Initializing booking module');
    
    // Check authentication
    if (!Auth.requireAuth('/book-lesson.html')) {
      return;
    }
    
    // Get selected instructor
    const instructorId = Storage.get('selectedInstructorId');
    if (!instructorId) {
      // No instructor selected, redirect to find instructors
      window.location.href = '/index.html#instructors';
      return;
    }
    
    this.bookingData.instructorId = instructorId;
    
    // Initialize UI
    this.initializeStepNavigation();
    this.initializeFormHandlers();
    
    // Load instructor data
    await this.loadInstructorData();
    
    // Initialize calendar
    if (typeof Calendar !== 'undefined') {
      Calendar.init(this.handleDateSelection.bind(this));
    }
    
    // Initialize payment methods
    this.initializePaymentMethods();
    
    // Show first step
    this.showStep(1);
  },
  
  // Initialize step navigation
  initializeStepNavigation() {
    // Previous button
    const prevBtn = DOM.$('prev-step');
    if (prevBtn) {
      DOM.on(prevBtn, 'click', () => this.previousStep());
    }
    
    // Next button
    const nextBtn = DOM.$('next-step');
    if (nextBtn) {
      DOM.on(nextBtn, 'click', () => this.nextStep());
    }
    
    // Complete booking button
    const completeBtn = DOM.$('complete-booking');
    if (completeBtn) {
      DOM.on(completeBtn, 'click', () => this.completeBooking());
    }
  },
  
  // Initialize form handlers
  initializeFormHandlers() {
    // Lesson type selection
    const lessonTypeSelect = DOM.$('lesson-type');
    if (lessonTypeSelect) {
      DOM.on(lessonTypeSelect, 'change', () => {
        this.bookingData.lessonType = lessonTypeSelect.value;
        this.updatePricing();
      });
    }
    
    // Duration selection
    const durationSelect = DOM.$('lesson-duration');
    if (durationSelect) {
      DOM.on(durationSelect, 'change', () => {
        this.bookingData.duration = parseInt(durationSelect.value);
        this.updatePricing();
      });
    }
    
    // Pickup postcode
    const pickupPostcode = DOM.$('pickup-postcode');
    if (pickupPostcode) {
      this.initializePickupPostcode(pickupPostcode);
    }
    
    // Pickup address
    const pickupAddress = DOM.$('pickup-address');
    if (pickupAddress) {
      DOM.on(pickupAddress, 'input', () => {
        this.bookingData.pickupAddress = pickupAddress.value;
      });
    }
    
    // Lesson notes
    const lessonNotes = DOM.$('lesson-notes');
    if (lessonNotes) {
      DOM.on(lessonNotes, 'input', () => {
        this.bookingData.notes = lessonNotes.value;
      });
    }
    
    // Alternative instructors
    this.initializeAlternativeInstructors();
  },
  
  // Load instructor data
  async loadInstructorData() {
    try {
      const instructor = await InstructorService.getInstructorById(this.bookingData.instructorId);
      this.bookingData.instructor = instructor;
      
      // Update instructor summary
      this.updateInstructorSummary(instructor);
      
      // Update pricing based on instructor preferences
      if (instructor.preferences && instructor.preferences[0]) {
        const prefs = instructor.preferences[0];
        this.bookingData.basePrice = prefs.standard_lesson_price || 35;
        this.updatePricing();
      }
      
      // Load alternative instructors
      await this.loadAlternativeInstructors();
      
    } catch (error) {
      Logger.error('Failed to load instructor data:', error);
      ErrorHandler.showError('Unable to load instructor information');
      
      // Redirect back to instructors
      setTimeout(() => {
        window.location.href = '/index.html#instructors';
      }, 2000);
    }
  },
  
  // Update instructor summary
  updateInstructorSummary(instructor) {
    const summaryDiv = DOM.$('instructor-summary');
    if (!summaryDiv) return;
    
    const areas = instructor.areas?.map(a => a.area_name).join(', ') || 'Various locations';
    const price = instructor.preferences?.[0]?.standard_lesson_price || 35;
    
    const summaryHtml = `
      <img src="assets/icons/default-avatar.svg" alt="${instructor.name}" class="instructor-avatar">
      <div class="instructor-info">
        <h3>${instructor.name}</h3>
        <div class="instructor-rating">
          <div class="rating-stars">
            ${App.renderStars(4.5)}
          </div>
          <span>4.5 (42 reviews)</span>
        </div>
        <div class="instructor-details">
          <span><strong>Areas:</strong> ${areas}</span>
          <span><strong>Price:</strong> ${ConfigUtils.formatCurrency(price)}/hr</span>
        </div>
      </div>
    `;
    
    // Use safe HTML insertion
    Utils.safeSetHTML(summaryDiv, summaryHtml);
  },
  
  // Load alternative instructors
  async loadAlternativeInstructors() {
    try {
      // Get all instructors except current one
      const instructors = await InstructorService.getAllInstructors();
      const alternatives = instructors.filter(i => i.id !== this.bookingData.instructorId).slice(0, 4);
      
      const container = DOM.$('instructor-alternatives');
      if (!container) return;
      
      // Clear container and create instructor cards
      container.textContent = '';
      
      alternatives.forEach(instructor => {
        const instructorHtml = `
          <div class="instructor-card ${instructor.id === this.bookingData.instructorId ? 'selected' : ''}" 
               data-instructor-id="${instructor.id}">
            <div class="instructor-card-header">
              <img src="assets/icons/default-avatar.svg" alt="${instructor.name}" class="instructor-card-avatar">
              <div class="instructor-card-info">
                <h4>${instructor.name}</h4>
                <div class="rating-stars">
                  ${App.renderStars(4 + Math.random())}
                </div>
              </div>
            </div>
            <div class="instructor-card-details">
              <span>${ConfigUtils.formatCurrency(instructor.preferences?.[0]?.standard_lesson_price || 35)}/hr</span>
              <span>${instructor.areas?.length || 0} areas</span>
            </div>
          </div>
        `;
        // Use safe HTML insertion
        const instructorElement = document.createElement('div');
        Utils.safeSetHTML(instructorElement, instructorHtml);
        container.appendChild(instructorElement);
      });
      
      // Add click handlers
      this.initializeAlternativeInstructors();
      
    } catch (error) {
      Logger.warn('Failed to load alternative instructors:', error);
    }
  },
  
  // Initialize alternative instructor selection
  initializeAlternativeInstructors() {
    DOM.findAll('.instructor-card').forEach(card => {
      DOM.on(card, 'click', async () => {
        const instructorId = card.dataset.instructorId;
        if (instructorId === this.bookingData.instructorId) return;
        
        // Update selection
        DOM.findAll('.instructor-card').forEach(c => DOM.removeClass(c, 'selected'));
        DOM.addClass(card, 'selected');
        
        // Update booking data
        this.bookingData.instructorId = instructorId;
        await this.loadInstructorData();
      });
    });
  },
  
  // Initialize pickup postcode
  initializePickupPostcode(input) {
    const validationDiv = DOM.$('pickup-postcode-validation');
    if (!validationDiv) return;
    
    const spinner = validationDiv.querySelector('.validation-spinner');
    const result = validationDiv.querySelector('.validation-result');
    
    let timeout;
    
    DOM.on(input, 'input', () => {
      clearTimeout(timeout);
      DOM.hide(result);
      
      const postcode = input.value.trim();
      if (!postcode) return;
      
      // Format postcode
      input.value = Format.postcode(postcode);
      this.bookingData.pickupPostcode = postcode;
      
      // Debounce validation
      timeout = setTimeout(async () => {
        DOM.show(spinner);
        spinner.style.display = 'block';
        
        try {
          const validation = await PostcodeService.getPostcodeInfo(postcode);
          
          DOM.hide(spinner);
          DOM.show(result);
          
          if (validation.valid) {
            DOM.addClass(result, 'valid');
            DOM.removeClass(result, 'invalid');
            
            // Check area charge
            await this.checkAreaCharge(postcode);
          } else {
            DOM.addClass(result, 'invalid');
            DOM.removeClass(result, 'valid');
            this.bookingData.areaCharge = 0;
            this.updatePricing();
          }
        } catch (error) {
          DOM.hide(spinner);
          Logger.warn('Postcode validation error:', error);
        }
      }, 500);
    });
  },
  
  // Check area charge
  async checkAreaCharge(postcode) {
    if (!this.bookingData.instructor) return;
    
    // Check if postcode is in instructor's areas
    const areas = this.bookingData.instructor.areas || [];
    const matchingArea = areas.find(area => 
      area.postcode && postcode.toUpperCase().startsWith(area.postcode.slice(0, 2).toUpperCase())
    );
    
    if (matchingArea && matchingArea.additional_charge > 0) {
      this.bookingData.areaCharge = matchingArea.additional_charge;
      
      // Show area charge row
      const chargeRow = DOM.$('area-charge-row');
      const chargeAmount = DOM.$('area-charge');
      
      if (chargeRow && chargeAmount) {
        DOM.show(chargeRow);
        chargeAmount.textContent = ConfigUtils.formatCurrency(matchingArea.additional_charge);
      }
    } else {
      this.bookingData.areaCharge = 0;
      DOM.hide(DOM.$('area-charge-row'));
    }
    
    this.updatePricing();
  },
  
  // Update pricing
  updatePricing() {
    // Calculate base price
    let basePrice = ConfigUtils.getBasePrice(this.bookingData.lessonType);
    
    // Apply duration multiplier
    const hours = this.bookingData.duration / 60;
    basePrice = basePrice * hours;
    
    // Add area charge
    const totalPrice = basePrice + this.bookingData.areaCharge;
    
    this.bookingData.basePrice = basePrice;
    this.bookingData.totalPrice = totalPrice;
    
    // Update UI
    const basePriceEl = DOM.$('base-price');
    const totalPriceEl = DOM.$('total-price');
    
    if (basePriceEl) basePriceEl.textContent = ConfigUtils.formatCurrency(basePrice);
    if (totalPriceEl) totalPriceEl.textContent = ConfigUtils.formatCurrency(totalPrice);
    
    // Update summary
    this.updateOrderSummary();
  },
  
  // Handle date selection
  handleDateSelection(date) {
    this.bookingData.date = date;
    Logger.debug('Date selected:', date);
    
    // Load available times
    this.loadAvailableTimes(date);
  },
  
  // Load available times
  async loadAvailableTimes(date) {
    const container = DOM.$('timeslots-grid');
    if (!container) return;
    
    // Update selected date display
    const dateDisplay = DOM.$('selected-date');
    if (dateDisplay) {
      dateDisplay.textContent = DateTime.formatDate(date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Show loading
    container.textContent = '';
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    container.appendChild(spinner);
    
    try {
      const slots = await BookingService.getInstructorAvailability(
        this.bookingData.instructorId,
        date
      );
      
      if (slots.length === 0) {
        container.textContent = '';
        const p = document.createElement('p');
        p.className = 'text-center';
        p.textContent = 'No available times for this date';
        container.appendChild(p);
        return;
      }
      
      // Clear container and render time slots
      container.textContent = '';
      
      slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `timeslot ${!slot.available ? 'unavailable' : ''}`;
        slotElement.setAttribute('data-time', slot.time);
        if (!slot.available) {
          slotElement.disabled = true;
        }
        slotElement.textContent = DateTime.formatTime(slot.time);
        container.appendChild(slotElement);
      });
      
      // Add click handlers
      DOM.findAll('.timeslot:not(.unavailable)').forEach(slot => {
        DOM.on(slot, 'click', () => {
          // Remove previous selection
          DOM.findAll('.timeslot').forEach(s => DOM.removeClass(s, 'selected'));
          
          // Select this slot
          DOM.addClass(slot, 'selected');
          this.bookingData.time = slot.dataset.time;
          
          // Update summary
          this.updateOrderSummary();
        });
      });
      
    } catch (error) {
      Logger.error('Failed to load available times:', error);
      container.textContent = '';
      const p = document.createElement('p');
      p.className = 'text-center text-error';
      p.textContent = 'Failed to load available times';
      container.appendChild(p);
    }
  },
  
  // Initialize payment methods
  initializePaymentMethods() {
    const methodCards = DOM.findAll('.payment-method-card');
    
    methodCards.forEach(card => {
      DOM.on(card, 'click', () => {
        // Update active state
        methodCards.forEach(c => DOM.removeClass(c, 'active'));
        DOM.addClass(card, 'active');
        
        // Update payment method
        const method = card.dataset.method;
        this.bookingData.paymentMethod = method;
        
        // Update radio button
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });
    
    // Bank selection for Open Banking
    const bankSelect = DOM.$('bank-select');
    if (bankSelect) {
      DOM.on(bankSelect, 'change', () => {
        this.bookingData.selectedBank = bankSelect.value;
      });
    }
  },
  
  // Show step
  showStep(step) {
    // Validate before moving forward
    if (step > this.currentStep && !this.validateStep(this.currentStep)) {
      return;
    }
    
    // Hide all steps
    DOM.findAll('.booking-step').forEach(el => {
      DOM.removeClass(el, 'active');
    });
    
    // Show current step
    const stepEl = DOM.find(`.booking-step[data-step="${step}"]`);
    if (stepEl) {
      DOM.addClass(stepEl, 'active');
    }
    
    // Update progress
    DOM.findAll('.progress-steps .step').forEach((el, index) => {
      if (index + 1 < step) {
        DOM.addClass(el, 'completed');
        DOM.removeClass(el, 'active');
      } else if (index + 1 === step) {
        DOM.addClass(el, 'active');
        DOM.removeClass(el, 'completed');
      } else {
        DOM.removeClass(el, 'active');
        DOM.removeClass(el, 'completed');
      }
    });
    
    // Update navigation buttons
    DOM.toggle(DOM.$('prev-step'), step > 1);
    DOM.toggle(DOM.$('next-step'), step < this.totalSteps);
    DOM.toggle(DOM.$('complete-booking'), step === 4); // Show on payment step
    
    this.currentStep = step;
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Step-specific initialization
    if (step === 4) {
      this.updateOrderSummary();
    }
  },
  
  // Validate step
  validateStep(step) {
    let isValid = true;
    let errorMessage = '';
    
    switch (step) {
      case 1: // Instructor selection
        if (!this.bookingData.instructorId) {
          errorMessage = 'Please select an instructor';
          isValid = false;
        }
        break;
        
      case 2: // Date & Time
        if (!this.bookingData.date) {
          errorMessage = 'Please select a date';
          isValid = false;
        } else if (!this.bookingData.time) {
          errorMessage = 'Please select a time';
          isValid = false;
        }
        break;
        
      case 3: // Lesson Details
        if (!this.bookingData.pickupPostcode) {
          errorMessage = 'Please enter a pickup postcode';
          isValid = false;
        } else if (!Validation.isUKPostcode(this.bookingData.pickupPostcode)) {
          errorMessage = 'Please enter a valid UK postcode';
          isValid = false;
        } else if (!this.bookingData.pickupAddress) {
          errorMessage = 'Please enter a full pickup address';
          isValid = false;
        }
        break;
        
      case 4: // Payment
        if (!this.bookingData.paymentMethod) {
          errorMessage = 'Please select a payment method';
          isValid = false;
        } else if (this.bookingData.paymentMethod === 'open_banking' && !this.bookingData.selectedBank) {
          errorMessage = 'Please select your bank';
          isValid = false;
        }
        break;
    }
    
    if (!isValid) {
      ErrorHandler.showError(errorMessage);
    }
    
    return isValid;
  },
  
  // Previous step
  previousStep() {
    if (this.currentStep > 1) {
      this.showStep(this.currentStep - 1);
    }
  },
  
  // Next step
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.showStep(this.currentStep + 1);
    }
  },
  
  // Update order summary
  updateOrderSummary() {
    const elements = {
      instructor: DOM.$('summary-instructor'),
      datetime: DOM.$('summary-datetime'),
      lessonType: DOM.$('summary-lesson-type'),
      duration: DOM.$('summary-duration'),
      pickup: DOM.$('summary-pickup'),
      total: DOM.$('summary-total')
    };
    
    if (elements.instructor && this.bookingData.instructor) {
      elements.instructor.textContent = this.bookingData.instructor.name;
    }
    
    if (elements.datetime && this.bookingData.date && this.bookingData.time) {
      elements.datetime.textContent = `${DateTime.formatDate(this.bookingData.date)} at ${DateTime.formatTime(this.bookingData.time)}`;
    }
    
    if (elements.lessonType) {
      const types = {
        standard: 'Standard Lesson',
        intensive: 'Intensive Lesson',
        testPrep: 'Test Preparation',
        passPlus: 'Pass Plus Module'
      };
      elements.lessonType.textContent = types[this.bookingData.lessonType] || 'Standard Lesson';
    }
    
    if (elements.duration) {
      elements.duration.textContent = `${this.bookingData.duration} minutes`;
    }
    
    if (elements.pickup && this.bookingData.pickupPostcode) {
      elements.pickup.textContent = this.bookingData.pickupPostcode;
    }
    
    if (elements.total) {
      elements.total.textContent = ConfigUtils.formatCurrency(this.bookingData.totalPrice);
    }
  },
  
  // Complete booking
  async completeBooking() {
    // Validate all steps
    for (let i = 1; i <= 4; i++) {
      if (!this.validateStep(i)) {
        this.showStep(i);
        return;
      }
    }
    
    // Show loading overlay
    const loadingOverlay = DOM.$('booking-loading');
    if (loadingOverlay) {
      DOM.show(loadingOverlay, 'flex');
    }
    
    try {
      // Get current user
      const user = Auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Get pupil account
      const pupils = await Database.select('pupil_accounts', '*', { email: user.email });
      if (!pupils || pupils.length === 0) {
        throw new Error('Pupil account not found');
      }
      
      const pupilAccount = pupils[0];
      
      // Create booking request
      const booking = await BookingService.createBookingRequest({
        pupil_account_id: pupilAccount.id,
        instructor_id: this.bookingData.instructorId,
        lesson_date: this.bookingData.date,
        start_time: this.bookingData.time,
        duration: this.bookingData.duration,
        lesson_type: this.bookingData.lessonType,
        pickup_postcode: this.bookingData.pickupPostcode,
        pickup_address: this.bookingData.pickupAddress,
        amount: this.bookingData.totalPrice,
        notes: this.bookingData.notes,
        payment_method: this.bookingData.paymentMethod
      });
      
      // Process payment
      await this.processPayment(booking);
      
      // Update booking status
      await BookingService.updateBookingStatus(booking.id, 'confirmed', 'paid');
      
      // Create notification
      await NotificationService.createNotification(
        pupilAccount.id,
        booking.id,
        'booking_confirmed',
        'Booking Confirmed',
        `Your lesson on ${DateTime.formatDate(booking.lesson_date)} has been confirmed!`
      );
      
      // Show confirmation
      this.showConfirmation(booking);
      
    } catch (error) {
      Logger.error('Booking failed:', error);
      ErrorHandler.showError('Unable to complete booking. Please try again.');
    } finally {
      DOM.hide(loadingOverlay);
    }
  },
  
  // Process payment
  async processPayment(booking) {
    // In production, this would integrate with real payment provider
    if (this.bookingData.paymentMethod === 'open_banking') {
      // Simulate Open Banking flow
      Logger.info('Processing Open Banking payment for booking:', booking.id);
      
      // In real implementation:
      // 1. Create payment request with provider
      // 2. Redirect to bank authorization
      // 3. Handle callback with payment confirmation
      // 4. Update booking payment status
      
      // Simulate successful payment
      await Async.delay(1500);
      
      return {
        paymentId: 'mock-payment-' + Date.now(),
        status: 'success',
        reference: 'OB-' + booking.id.slice(0, 8).toUpperCase()
      };
      
    } else if (this.bookingData.paymentMethod === 'card') {
      // Simulate card payment
      Logger.info('Processing card payment for booking:', booking.id);
      
      // In real implementation:
      // 1. Tokenize card details
      // 2. Create payment intent
      // 3. Process payment
      // 4. Handle 3D Secure if required
      
      // Simulate successful payment
      await Async.delay(2000);
      
      return {
        paymentId: 'mock-payment-' + Date.now(),
        status: 'success',
        reference: 'CARD-' + booking.id.slice(0, 8).toUpperCase()
      };
    }
    
    throw new Error('Invalid payment method');
  },
  
  // Show confirmation
  showConfirmation(booking) {
    // Show confirmation step
    this.showStep(5);
    
    // Update booking details
    const detailsDiv = DOM.$('booking-details');
    if (detailsDiv) {
      const detailsHtml = `
        <div class="booking-detail-item">
          <span class="detail-label">Booking Reference</span>
          <span class="detail-value"><strong>#${booking.id.slice(0, 8).toUpperCase()}</strong></span>
        </div>
        <div class="booking-detail-item">
          <span class="detail-label">Instructor</span>
          <span class="detail-value">${this.bookingData.instructor.name}</span>
        </div>
        <div class="booking-detail-item">
          <span class="detail-label">Date & Time</span>
          <span class="detail-value">${DateTime.formatDateTime(booking.lesson_date, booking.start_time)}</span>
        </div>
        <div class="booking-detail-item">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${booking.duration} minutes</span>
        </div>
        <div class="booking-detail-item">
          <span class="detail-label">Pickup Location</span>
          <span class="detail-value">${booking.pickup_address}<br>${booking.pickup_postcode}</span>
        </div>
        <div class="booking-detail-item">
          <span class="detail-label">Total Paid</span>
          <span class="detail-value"><strong>${ConfigUtils.formatCurrency(booking.amount)}</strong></span>
        </div>
      `;
      
      // Use safe HTML insertion
      Utils.safeSetHTML(detailsDiv, detailsHtml);
    }
    
    // Add calendar button handler
    const calendarBtn = DOM.$('add-to-calendar');
    if (calendarBtn) {
      DOM.on(calendarBtn, 'click', () => {
        this.addToCalendar(booking);
      });
    }
    
    // Add receipt button handler
    const receiptBtn = DOM.$('download-receipt');
    if (receiptBtn) {
      DOM.on(receiptBtn, 'click', () => {
        this.downloadReceipt(booking);
      });
    }
    
    // Clear booking data
    Storage.remove('selectedInstructorId');
    
    // Send confirmation email (in production)
    this.sendConfirmationEmail(booking);
  },
  
  // Add to calendar
  addToCalendar(booking) {
    const event = {
      title: `Driving Lesson with ${this.bookingData.instructor.name}`,
      start: new Date(`${booking.lesson_date}T${booking.start_time}`),
      duration: booking.duration,
      location: `${booking.pickup_address}, ${booking.pickup_postcode}`,
      description: `Booking Reference: #${booking.id.slice(0, 8).toUpperCase()}\nInstructor: ${this.bookingData.instructor.name}\nPhone: ${this.bookingData.instructor.phone || 'Not provided'}`
    };
    
    // Create calendar event (this would integrate with calendar APIs)
    Logger.info('Adding to calendar:', event);
    
    // For now, show instructions
    alert('To add to your calendar:\n\n1. Open your calendar app\n2. Create a new event\n3. Copy the booking details from this page');
  },
  
  // Download receipt
  downloadReceipt(booking) {
    // In production, this would generate a PDF receipt
    Logger.info('Downloading receipt for booking:', booking.id);
    
    // Create receipt content
    const receiptContent = `
      PASS PLUS SOM - BOOKING RECEIPT
      ================================
      
      Booking Reference: #${booking.id.slice(0, 8).toUpperCase()}
      Date: ${new Date().toLocaleDateString()}
      
      LESSON DETAILS
      --------------
      Instructor: ${this.bookingData.instructor.name}
      Date: ${DateTime.formatDate(booking.lesson_date)}
      Time: ${DateTime.formatTime(booking.start_time)}
      Duration: ${booking.duration} minutes
      Type: ${booking.lesson_type}
      
      PICKUP LOCATION
      ---------------
      ${booking.pickup_address}
      ${booking.pickup_postcode}
      
      PAYMENT DETAILS
      ---------------
      Amount Paid: ${ConfigUtils.formatCurrency(booking.amount)}
      Payment Method: ${booking.payment_method === 'open_banking' ? 'Open Banking' : 'Card'}
      Payment Status: PAID
      
      CONTACT INFORMATION
      -------------------
      Instructor Phone: ${this.bookingData.instructor.phone || 'Not provided'}
      Support Email: ${CONFIG.app.supportEmail}
      
      Thank you for choosing Pass Plus SOM!
    `;
    
    // Create and download text file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PassPlusSOM-Receipt-${booking.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  
  // Send confirmation email
  async sendConfirmationEmail(booking) {
    // In production, this would send via email service
    Logger.info('Sending confirmation email for booking:', booking.id);
    
    // Email would include:
    // - Booking confirmation
    // - Lesson details
    // - Instructor contact
    // - Cancellation policy
    // - Calendar invite attachment
  }
};

// Initialize booking module when DOM is ready
if (typeof window !== 'undefined') {
  window.Booking = Booking;
  
  // Auto-initialize if on booking page
  if (window.location.pathname.includes('book-lesson')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        Booking.init();
      });
    } else {
      Booking.init();
    }
  }
}