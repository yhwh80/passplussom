/* ===================================
   Pass Plus SOM - Dashboard Module
   Pupil dashboard and account management
   =================================== */

// Dashboard functionality
const Dashboard = {
  currentUser: null,
  pupilAccount: null,
  activeBookings: [],
  pastBookings: [],
  notifications: [],
  
  // Initialize dashboard
  async init() {
    Logger.info('Initializing dashboard module');
    
    // Check authentication
    if (!Auth.requireAuth()) {
      return;
    }
    
    // Get current user
    this.currentUser = Auth.getCurrentUser();
    if (!this.currentUser) {
      Logger.error('No authenticated user found');
      window.location.href = '/login.html';
      return;
    }
    
    // Load dashboard data
    await this.loadDashboardData();
    
    // Initialize dashboard sections
    this.initializeDashboardSections();
    
    // Setup real-time updates
    this.setupRealtimeUpdates();
  },
  
  // Load all dashboard data
  async loadDashboardData() {
    try {
      // Load pupil account
      await this.loadPupilAccount();
      
      // Load bookings
      await this.loadBookings();
      
      // Load notifications
      await this.loadNotifications();
      
      // Update dashboard UI
      this.updateDashboardUI();
      
    } catch (error) {
      Logger.error('Failed to load dashboard data:', error);
      ErrorHandler.showError('Unable to load dashboard data');
    }
  },
  
  // Load pupil account
  async loadPupilAccount() {
    try {
      const pupils = await Database.select('pupil_accounts', '*', {
        email: this.currentUser.email
      });
      
      if (pupils && pupils.length > 0) {
        this.pupilAccount = pupils[0];
        Logger.debug('Pupil account loaded:', this.pupilAccount.id);
      } else {
        // Create pupil account if it doesn't exist
        this.pupilAccount = await PupilService.createPupilAccount({
          email: this.currentUser.email,
          first_name: this.currentUser.user_metadata?.first_name || '',
          last_name: this.currentUser.user_metadata?.last_name || '',
          phone: this.currentUser.user_metadata?.phone || ''
        });
        Logger.info('New pupil account created:', this.pupilAccount.id);
      }
    } catch (error) {
      Logger.error('Failed to load pupil account:', error);
      throw error;
    }
  },
  
  // Load bookings
  async loadBookings() {
    try {
      const allBookings = await BookingService.getBookingsForPupil(this.pupilAccount.id);
      
      // Separate active and past bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      this.activeBookings = allBookings.filter(booking => {
        const lessonDate = new Date(booking.lesson_date);
        return lessonDate >= today && booking.status !== 'cancelled';
      });
      
      this.pastBookings = allBookings.filter(booking => {
        const lessonDate = new Date(booking.lesson_date);
        return lessonDate < today || booking.status === 'cancelled';
      });
      
      Logger.debug('Bookings loaded:', {
        active: this.activeBookings.length,
        past: this.pastBookings.length
      });
    } catch (error) {
      Logger.error('Failed to load bookings:', error);
      throw error;
    }
  },
  
  // Load notifications
  async loadNotifications() {
    try {
      this.notifications = await NotificationService.getNotificationsForPupil(
        this.pupilAccount.id
      );
      Logger.debug('Notifications loaded:', this.notifications.length);
    } catch (error) {
      Logger.error('Failed to load notifications:', error);
      // Don't throw - notifications are not critical
    }
  },
  
  // Initialize dashboard sections
  initializeDashboardSections() {
    // Initialize navigation
    this.initializeDashboardNavigation();
    
    // Initialize profile section
    this.initializeProfileSection();
    
    // Initialize bookings section
    this.initializeBookingsSection();
    
    // Initialize notifications section
    this.initializeNotificationsSection();
    
    // Initialize quick actions
    this.initializeQuickActions();
  },
  
  // Initialize dashboard navigation
  initializeDashboardNavigation() {
    const navLinks = DOM.findAll('[data-dashboard-section]');
    
    navLinks.forEach(link => {
      DOM.on(link, 'click', (e) => {
        e.preventDefault();
        const section = link.dataset.dashboardSection;
        this.showDashboardSection(section);
      });
    });
    
    // Show default section
    this.showDashboardSection('overview');
  },
  
  // Show dashboard section
  showDashboardSection(sectionName) {
    // Hide all sections
    DOM.findAll('.dashboard-section').forEach(section => {
      DOM.removeClass(section, 'active');
    });
    
    // Show target section
    const targetSection = DOM.$(`dashboard-${sectionName}`);
    if (targetSection) {
      DOM.addClass(targetSection, 'active');
    }
    
    // Update navigation
    DOM.findAll('[data-dashboard-section]').forEach(link => {
      if (link.dataset.dashboardSection === sectionName) {
        DOM.addClass(link, 'active');
      } else {
        DOM.removeClass(link, 'active');
      }
    });
    
    // Load section-specific data
    this.loadSectionData(sectionName);
  },
  
  // Load section-specific data
  async loadSectionData(sectionName) {
    switch (sectionName) {
      case 'overview':
        this.updateOverviewSection();
        break;
      case 'bookings':
        this.updateBookingsSection();
        break;
      case 'profile':
        this.updateProfileSection();
        break;
      case 'notifications':
        this.updateNotificationsSection();
        break;
    }
  },
  
  // Update dashboard UI
  updateDashboardUI() {
    this.updateWelcomeMessage();
    this.updateStatsCards();
    this.updateUpcomingLessons();
    this.updateRecentActivity();
  },
  
  // Update welcome message
  updateWelcomeMessage() {
    const welcomeElement = DOM.$('dashboard-welcome');
    if (welcomeElement && this.pupilAccount) {
      const firstName = this.pupilAccount.first_name || 'there';
      const timeOfDay = this.getTimeOfDay();
      welcomeElement.textContent = `Good ${timeOfDay}, ${firstName}!`;
    }
  },
  
  // Get time of day greeting
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  },
  
  // Update stats cards
  updateStatsCards() {
    // Total lessons
    const totalLessonsElement = DOM.$('stat-total-lessons');
    if (totalLessonsElement) {
      const totalLessons = this.activeBookings.length + this.pastBookings.length;
      totalLessonsElement.textContent = totalLessons;
    }
    
    // Upcoming lessons
    const upcomingLessonsElement = DOM.$('stat-upcoming-lessons');
    if (upcomingLessonsElement) {
      upcomingLessonsElement.textContent = this.activeBookings.length;
    }
    
    // Hours driven
    const hoursDrivenElement = DOM.$('stat-hours-driven');
    if (hoursDrivenElement) {
      const completedBookings = this.pastBookings.filter(b => b.status === 'completed');
      const totalMinutes = completedBookings.reduce((sum, booking) => sum + (booking.duration || 60), 0);
      const hours = Math.floor(totalMinutes / 60);
      hoursDrivenElement.textContent = hours;
    }
    
    // Unread notifications
    const unreadNotificationsElement = DOM.$('stat-unread-notifications');
    if (unreadNotificationsElement) {
      const unreadCount = this.notifications.filter(n => !n.read_at).length;
      unreadNotificationsElement.textContent = unreadCount;
    }
  },
  
  // Update upcoming lessons
  updateUpcomingLessons() {
    const container = DOM.$('upcoming-lessons-list');
    if (!container) return;
    
    if (this.activeBookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No upcoming lessons</p>
          <a href="/index.html#instructors" class="btn btn-primary">Book a Lesson</a>
        </div>
      `;
      return;
    }
    
    // Sort by date
    const sortedBookings = this.activeBookings.sort((a, b) => 
      new Date(a.lesson_date + 'T' + a.start_time) - new Date(b.lesson_date + 'T' + b.start_time)
    );
    
    // Clear container and create booking elements
    container.textContent = '';
    
    sortedBookings.slice(0, 3).forEach(booking => {
      const bookingHtml = this.renderUpcomingLessonCard(booking);
      // Use safe HTML insertion
      const bookingElement = document.createElement('div');
      Utils.safeSetHTML(bookingElement, bookingHtml);
      container.appendChild(bookingElement);
    });
  },
  
  // Render upcoming lesson card
  renderUpcomingLessonCard(booking) {
    const lessonDateTime = new Date(booking.lesson_date + 'T' + booking.start_time);
    const isToday = DateTime.isToday(booking.lesson_date);
    const timeUntil = this.getTimeUntilLesson(lessonDateTime);
    
    return `
      <div class="lesson-card ${isToday ? 'today' : ''}">
        <div class="lesson-info">
          <div class="lesson-header">
            <h4>Lesson with ${booking.instructor_name}</h4>
            <span class="lesson-status status-${booking.status}">${booking.status}</span>
          </div>
          
          <div class="lesson-details">
            <div class="detail-item">
              <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
              </svg>
              <span>${DateTime.formatDateTime(booking.lesson_date, booking.start_time)}</span>
            </div>
            
            <div class="detail-item">
              <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>${booking.duration || 60} minutes</span>
            </div>
            
            <div class="detail-item">
              <svg class="detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${booking.pickup_postcode}</span>
            </div>
          </div>
          
          <div class="lesson-countdown">
            <small>${timeUntil}</small>
          </div>
        </div>
        
        <div class="lesson-actions">
          <button class="btn btn-outline btn-sm" onclick="Dashboard.viewBookingDetails('${booking.id}')">
            View Details
          </button>
          <button class="btn btn-outline btn-sm" onclick="Dashboard.cancelBooking('${booking.id}')">
            Cancel
          </button>
        </div>
      </div>
    `;
  },
  
  // Get time until lesson
  getTimeUntilLesson(lessonDateTime) {
    const now = new Date();
    const diffMs = lessonDateTime - now;
    
    if (diffMs < 0) return 'Past lesson';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }
  },
  
  // Update recent activity
  updateRecentActivity() {
    const container = DOM.$('recent-activity-list');
    if (!container) return;
    
    // Combine recent bookings and notifications
    const recentItems = [];
    
    // Add recent bookings
    this.pastBookings.slice(-3).forEach(booking => {
      recentItems.push({
        type: 'booking',
        date: booking.lesson_date,
        title: `Lesson with ${booking.instructor_name}`,
        description: `${booking.duration || 60} minute lesson - ${booking.status}`,
        icon: 'calendar'
      });
    });
    
    // Add recent notifications
    this.notifications.slice(-3).forEach(notification => {
      recentItems.push({
        type: 'notification',
        date: notification.created_at,
        title: notification.title,
        description: notification.message,
        icon: 'bell'
      });
    });
    
    // Sort by date
    recentItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (recentItems.length === 0) {
      container.textContent = '';
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = 'No recent activity';
      container.appendChild(p);
      return;
    }
    
    // Clear container and create activity items
    container.textContent = '';
    
    recentItems.slice(0, 5).forEach(item => {
      const activityHtml = `
        <div class="activity-item">
          <div class="activity-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              ${this.getActivityIcon(item.icon)}
            </svg>
          </div>
          <div class="activity-content">
            <h5>${item.title}</h5>
            <p>${item.description}</p>
            <small>${DateTime.getRelativeTime(item.date)}</small>
          </div>
        </div>
      `;
      // Use safe HTML insertion
      const activityElement = document.createElement('div');
      Utils.safeSetHTML(activityElement, activityHtml);
      container.appendChild(activityElement);
    });
  },
  
  // Get activity icon SVG
  getActivityIcon(iconName) {
    const icons = {
      calendar: '<path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
      bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
      user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    };
    return icons[iconName] || icons.user;
  },
  
  // Initialize profile section
  initializeProfileSection() {
    const profileForm = DOM.$('profile-form');
    if (profileForm) {
      DOM.on(profileForm, 'submit', async (e) => {
        e.preventDefault();
        await this.updateProfile(profileForm);
      });
    }
  },
  
  // Update profile section
  updateProfileSection() {
    if (!this.pupilAccount) return;
    
    const fields = ['first_name', 'last_name', 'email', 'phone', 'postcode', 'address'];
    
    fields.forEach(field => {
      const input = DOM.$(`profile-${field.replace('_', '-')}`);
      if (input && this.pupilAccount[field]) {
        input.value = this.pupilAccount[field];
      }
    });
  },
  
  // Update profile
  async updateProfile(form) {
    const formData = new FormData(form);
    const updateData = {};
    
    for (const [key, value] of formData.entries()) {
      updateData[key] = value.trim();
    }
    
    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, true);
      
      await PupilService.updatePupilAccount(this.pupilAccount.id, updateData);
      
      // Update local data
      Object.assign(this.pupilAccount, updateData);
      
      // Show success message
      ErrorHandler.createToast('success', 'Profile Updated', 'Your profile has been updated successfully');
      
    } catch (error) {
      Logger.error('Profile update failed:', error);
      ErrorHandler.showError('Failed to update profile');
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, false);
    }
  },
  
  // Initialize bookings section
  initializeBookingsSection() {
    // Booking filters
    const statusFilter = DOM.$('booking-status-filter');
    if (statusFilter) {
      DOM.on(statusFilter, 'change', () => {
        this.filterBookings();
      });
    }
    
    // Booking actions
    this.initializeBookingActions();
  },
  
  // Update bookings section
  updateBookingsSection() {
    this.renderBookingsList();
  },
  
  // Render bookings list
  renderBookingsList() {
    const container = DOM.$('bookings-list');
    if (!container) return;
    
    const allBookings = [...this.activeBookings, ...this.pastBookings]
      .sort((a, b) => new Date(b.lesson_date) - new Date(a.lesson_date));
    
    if (allBookings.length === 0) {
      // Create empty state
      container.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      
      const h3 = document.createElement('h3');
      h3.textContent = 'No bookings yet';
      emptyDiv.appendChild(h3);
      
      const p = document.createElement('p');
      p.textContent = 'Ready to start your driving journey?';
      emptyDiv.appendChild(p);
      
      const link = document.createElement('a');
      link.href = '/index.html#instructors';
      link.className = 'btn btn-primary';
      link.textContent = 'Find an Instructor';
      emptyDiv.appendChild(link);
      
      container.appendChild(emptyDiv);
      return;
    }
    
    // Clear container and create booking elements
    container.textContent = '';
    
    allBookings.forEach(booking => {
      const bookingHtml = this.renderBookingListItem(booking);
      // Use safe HTML insertion
      const bookingElement = document.createElement('div');
      Utils.safeSetHTML(bookingElement, bookingHtml);
      container.appendChild(bookingElement);
    });
  },
  
  // Render booking list item
  renderBookingListItem(booking) {
    const isPast = new Date(booking.lesson_date) < new Date();
    const statusClass = `status-${booking.status}`;
    
    return `
      <div class="booking-item ${isPast ? 'past' : 'upcoming'}">
        <div class="booking-main">
          <div class="booking-header">
            <h4>Lesson with ${booking.instructor_name}</h4>
            <span class="booking-status ${statusClass}">${booking.status}</span>
          </div>
          
          <div class="booking-details">
            <span class="booking-date">
              ${DateTime.formatDateTime(booking.lesson_date, booking.start_time)}
            </span>
            <span class="booking-duration">${booking.duration || 60} minutes</span>
            <span class="booking-location">${booking.pickup_postcode}</span>
            <span class="booking-amount">${ConfigUtils.formatCurrency(booking.amount)}</span>
          </div>
          
          ${booking.notes ? `<p class="booking-notes">${booking.notes}</p>` : ''}
        </div>
        
        <div class="booking-actions">
          <button class="btn btn-outline btn-sm" onclick="Dashboard.viewBookingDetails('${booking.id}')">
            View Details
          </button>
          ${!isPast && booking.status !== 'cancelled' ? `
            <button class="btn btn-outline btn-sm" onclick="Dashboard.cancelBooking('${booking.id}')">
              Cancel
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },
  
  // Initialize booking actions
  initializeBookingActions() {
    // These are handled by onclick attributes in the HTML
    // Could be refactored to use event delegation
  },
  
  // View booking details
  async viewBookingDetails(bookingId) {
    try {
      const booking = await BookingService.getBookingById(bookingId);
      this.showBookingModal(booking);
    } catch (error) {
      Logger.error('Failed to load booking details:', error);
      ErrorHandler.showError('Unable to load booking details');
    }
  },
  
  // Show booking modal
  showBookingModal(booking) {
    const modal = DOM.$('booking-details-modal');
    if (!modal) {
      Logger.warn('Booking details modal not found');
      return;
    }
    
    // Populate modal content
    const content = DOM.$('booking-modal-content');
    if (content) {
      const modalHtml = `
        <div class="modal-header">
          <h3>Booking Details</h3>
          <span class="booking-status status-${booking.status}">${booking.status}</span>
        </div>
        
        <div class="booking-detail-grid">
          <div class="detail-item">
            <label>Booking Reference</label>
            <strong>#${booking.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          
          <div class="detail-item">
            <label>Instructor</label>
            <span>${booking.instructor?.name || 'Unknown'}</span>
          </div>
          
          <div class="detail-item">
            <label>Date & Time</label>
            <span>${DateTime.formatDateTime(booking.lesson_date, booking.start_time)}</span>
          </div>
          
          <div class="detail-item">
            <label>Duration</label>
            <span>${booking.duration || 60} minutes</span>
          </div>
          
          <div class="detail-item">
            <label>Lesson Type</label>
            <span>${booking.lesson_type || 'Standard'}</span>
          </div>
          
          <div class="detail-item">
            <label>Pickup Location</label>
            <span>${booking.pickup_address}<br>${booking.pickup_postcode}</span>
          </div>
          
          <div class="detail-item">
            <label>Amount</label>
            <strong>${ConfigUtils.formatCurrency(booking.amount)}</strong>
          </div>
          
          <div class="detail-item">
            <label>Payment Status</label>
            <span class="payment-status status-${booking.payment_status}">${booking.payment_status || 'unknown'}</span>
          </div>
          
          ${booking.notes ? `
            <div class="detail-item full-width">
              <label>Notes</label>
              <p>${booking.notes}</p>
            </div>
          ` : ''}
        </div>
      `;
      
      // Use safe HTML insertion
      Utils.safeSetHTML(content, modalHtml);
    }
    
    DOM.show(modal);
  },
  
  // Cancel booking
  async cancelBooking(bookingId) {
    const confirmed = confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;
    
    try {
      await BookingService.cancelBooking(bookingId, 'Cancelled by pupil');
      
      // Refresh bookings
      await this.loadBookings();
      this.updateDashboardUI();
      
      ErrorHandler.createToast('success', 'Booking Cancelled', 'Your booking has been cancelled');
      
    } catch (error) {
      Logger.error('Failed to cancel booking:', error);
      ErrorHandler.showError('Unable to cancel booking');
    }
  },
  
  // Initialize notifications section
  initializeNotificationsSection() {
    const markAllReadBtn = DOM.$('mark-all-read');
    if (markAllReadBtn) {
      DOM.on(markAllReadBtn, 'click', () => {
        this.markAllNotificationsRead();
      });
    }
  },
  
  // Update notifications section
  updateNotificationsSection() {
    const container = DOM.$('notifications-list');
    if (!container) return;
    
    if (this.notifications.length === 0) {
      container.textContent = '';
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = 'No notifications';
      container.appendChild(p);
      return;
    }
    
    // Clear container and create notification elements
    container.textContent = '';
    
    this.notifications.forEach(notification => {
      const notificationHtml = `
        <div class="notification-item ${notification.read_at ? 'read' : 'unread'}">
          <div class="notification-content">
            <h5>${notification.title}</h5>
            <p>${notification.message}</p>
            <small>${DateTime.getRelativeTime(notification.created_at)}</small>
          </div>
          ${!notification.read_at ? `
            <button class="btn btn-sm btn-outline" onclick="Dashboard.markNotificationRead('${notification.id}')">
              Mark Read
            </button>
          ` : ''}
        </div>
      `;
      // Use safe HTML insertion
      const notificationElement = document.createElement('div');
      Utils.safeSetHTML(notificationElement, notificationHtml);
      container.appendChild(notificationElement);
    });
  },
  
  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      await NotificationService.markNotificationRead(notificationId);
      
      // Update local notification
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read_at = new Date().toISOString();
      }
      
      this.updateNotificationsSection();
      this.updateStatsCards();
      
    } catch (error) {
      Logger.error('Failed to mark notification as read:', error);
    }
  },
  
  // Mark all notifications as read
  async markAllNotificationsRead() {
    try {
      await NotificationService.markAllNotificationsRead(this.pupilAccount.id);
      
      // Update local notifications
      this.notifications.forEach(notification => {
        notification.read_at = new Date().toISOString();
      });
      
      this.updateNotificationsSection();
      this.updateStatsCards();
      
      ErrorHandler.createToast('success', 'All Read', 'All notifications marked as read');
      
    } catch (error) {
      Logger.error('Failed to mark all notifications as read:', error);
      ErrorHandler.showError('Unable to mark notifications as read');
    }
  },
  
  // Initialize quick actions
  initializeQuickActions() {
    const bookLessonBtn = DOM.$('quick-book-lesson');
    if (bookLessonBtn) {
      DOM.on(bookLessonBtn, 'click', () => {
        window.location.href = '/index.html#instructors';
      });
    }
    
    const findInstructorBtn = DOM.$('quick-find-instructor');
    if (findInstructorBtn) {
      DOM.on(findInstructorBtn, 'click', () => {
        window.location.href = '/index.html#instructors';
      });
    }
  },
  
  // Setup real-time updates
  setupRealtimeUpdates() {
    // In production, this would set up WebSocket or Server-Sent Events
    // For now, we'll use periodic polling
    setInterval(() => {
      this.refreshDashboardData();
    }, 30000); // Refresh every 30 seconds
  },
  
  // Refresh dashboard data
  async refreshDashboardData() {
    try {
      await this.loadNotifications();
      this.updateStatsCards();
    } catch (error) {
      Logger.warn('Failed to refresh dashboard data:', error);
    }
  },
  
  // Update overview section
  updateOverviewSection() {
    this.updateDashboardUI();
  },
  
  // Filter bookings
  filterBookings() {
    const statusFilter = DOM.$('booking-status-filter')?.value;
    // Implementation depends on how filtering UI is structured
    Logger.debug('Filtering bookings by status:', statusFilter);
  },
  
  // Set button loading state
  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Loading...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }
};

// Initialize dashboard when DOM is ready
if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
  
  // Auto-initialize if on dashboard page
  if (window.location.pathname.includes('dashboard')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        Dashboard.init();
      });
    } else {
      Dashboard.init();
    }
  }
}