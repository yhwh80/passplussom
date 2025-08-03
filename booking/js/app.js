/* ===================================
   Pass Plus SOM - Main Application Module
   Core app initialization and navigation
   =================================== */

// Main Application Controller
const App = {
  initialized: false,
  currentPage: null,
  routes: {
    'home': { title: 'Home', public: true },
    'instructors': { title: 'Find Instructors', public: true },
    'how-it-works': { title: 'How It Works', public: true },
    'pricing': { title: 'Pricing', public: true },
    'book-lesson': { title: 'Book a Lesson', public: false },
    'dashboard': { title: 'My Dashboard', public: false },
    'profile': { title: 'My Profile', public: false },
    'settings': { title: 'Settings', public: false },
    'help': { title: 'Help & Support', public: true }
  },
  
  // Initialize application
  async init() {
    if (this.initialized) return;
    
    Logger.info('Initializing Pass Plus SOM application');
    
    try {
      // Validate configuration
      if (!validateConfig()) {
        Logger.warn('Configuration validation failed - using defaults');
      }
      
      // Initialize core modules
      await this.initializeModules();
      
      // Setup global error handling
      this.setupErrorHandling();
      
      // Initialize navigation
      this.initializeNavigation();
      
      // Setup auth state listener
      this.setupAuthListener();
      
      // Initialize page-specific functionality
      this.initializeCurrentPage();
      
      // Check for deep links
      this.handleDeepLinks();
      
      // Hide loading screen
      this.hideLoadingScreen();
      
      this.initialized = true;
      Logger.info('Application initialized successfully');
      
    } catch (error) {
      Logger.error('Application initialization failed:', error);
      this.showInitError();
    }
  },
  
  // Initialize core modules
  async initializeModules() {
    // Initialize in order of dependency
    const modules = [
      { name: 'Supabase', init: () => initializeSupabase() },
      { name: 'Auth', init: () => Auth.init() },
      { name: 'Notifications', init: () => this.initializeNotifications() },
      { name: 'ServiceWorker', init: () => this.initializeServiceWorker() }
    ];
    
    for (const module of modules) {
      try {
        Logger.debug(`Initializing ${module.name}...`);
        await module.init();
      } catch (error) {
        Logger.error(`Failed to initialize ${module.name}:`, error);
        // Continue with other modules
      }
    }
  },
  
  // Setup global error handling
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      Logger.error('Global error:', event.error);
      this.handleError(event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      Logger.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason);
    });
  },
  
  // Initialize navigation
  initializeNavigation() {
    // Mobile menu toggle
    const navToggle = DOM.$('nav-toggle');
    const navMenu = DOM.$('nav-menu');
    
    if (navToggle && navMenu) {
      DOM.on(navToggle, 'click', () => {
        DOM.toggleClass(navMenu, 'active');
        DOM.toggleClass(navToggle, 'active');
      });
      
      // Close menu on link click
      DOM.findAll('.nav-link').forEach(link => {
        DOM.on(link, 'click', () => {
          DOM.removeClass(navMenu, 'active');
          DOM.removeClass(navToggle, 'active');
        });
      });
    }
    
    // User menu dropdown
    const userButton = DOM.$('user-button');
    const userDropdown = DOM.$('user-dropdown');
    
    if (userButton && userDropdown) {
      DOM.on(userButton, 'click', (e) => {
        e.stopPropagation();
        DOM.toggleClass(userButton.parentElement, 'open');
      });
      
      // Close on outside click
      document.addEventListener('click', () => {
        DOM.removeClass(userButton?.parentElement, 'open');
      });
    }
    
    // Login and register buttons
    const loginBtn = DOM.$('login-btn');
    const registerBtn = DOM.$('register-btn');

    if (loginBtn) {
      DOM.on(loginBtn, 'click', () => {
        window.location.href = 'login.html';
      });
    }

    if (registerBtn) {
      DOM.on(registerBtn, 'click', () => {
        window.location.href = 'register.html';
      });
    }

    // Smooth scroll for anchor links
    DOM.findAll('a[href^="#"]').forEach(link => {
      DOM.on(link, 'click', (e) => {
        const targetId = link.getAttribute('href').slice(1);
        const targetElement = DOM.$(targetId);

        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: 'smooth' });

          // Update active nav state
          this.updateActiveNavLink(targetId);
        }
      });
    });
    
    // Page navigation
    this.setupPageNavigation();
    
    // Logout functionality
    const logoutBtns = DOM.findAll('#logout-btn');
    logoutBtns.forEach(btn => {
      DOM.on(btn, 'click', () => this.logout());
    });
  },
  
  // Setup page navigation
  setupPageNavigation() {
    // Handle nav links
    DOM.findAll('[data-page]').forEach(link => {
      DOM.on(link, 'click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.navigateToPage(page);
      });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.showPage(e.state.page, false);
      }
    });
    
    // Set initial page
    const hash = window.location.hash.slice(1);
    const initialPage = hash || 'home';
    this.showPage(initialPage, false);
  },
  
  // Navigate to page
  navigateToPage(page) {
    // Check if page requires auth
    const route = this.routes[page];
    if (route && !route.public && !Auth.isAuthenticated()) {
      Storage.set('redirectAfterLogin', `#${page}`);
      window.location.href = '/login.html';
      return;
    }
    
    this.showPage(page);
  },
  
  // Show page section
  showPage(page, updateHistory = true) {
    // Hide all sections
    DOM.findAll('section[id]').forEach(section => {
      DOM.hide(section);
    });
    
    // Show target section
    const targetSection = DOM.$(page);
    if (targetSection) {
      DOM.show(targetSection);
      this.currentPage = page;
      
      // Update URL
      if (updateHistory) {
        history.pushState({ page }, '', `#${page}`);
      }
      
      // Update page title
      const route = this.routes[page];
      if (route) {
        document.title = `${route.title} - Pass Plus SOM`;
      }
      
      // Update active nav
      this.updateActiveNavLink(page);
      
      // Initialize page-specific features
      this.initializePageFeatures(page);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },
  
  // Update active navigation link
  updateActiveNavLink(page) {
    DOM.findAll('.nav-link').forEach(link => {
      const linkPage = link.dataset.page || link.getAttribute('href')?.slice(1);
      if (linkPage === page) {
        DOM.addClass(link, 'active');
      } else {
        DOM.removeClass(link, 'active');
      }
    });
  },
  
  // Setup auth state listener
  setupAuthListener() {
    Auth.onAuthStateChange((event, user) => {
      switch (event) {
        case 'SIGNED_IN':
          this.handleSignIn(user);
          break;
        case 'SIGNED_OUT':
          this.handleSignOut();
          break;
      }
    });
  },
  
  // Handle user sign in
  handleSignIn(user) {
    // Update UI for authenticated state
    DOM.hide(DOM.$('login-btn'));
    DOM.hide(DOM.$('register-btn'));
    DOM.show(DOM.$('user-button')?.parentElement);
    
    // Update user info
    const userName = DOM.$('user-name');
    const userAvatar = DOM.$('user-avatar');
    const welcomeName = DOM.$('welcome-name');
    
    if (userName) {
      userName.textContent = user.user_metadata?.first_name || user.email.split('@')[0];
    }
    
    if (welcomeName) {
      welcomeName.textContent = user.user_metadata?.first_name || 'there';
    }
    
    // Load user notifications
    this.loadNotifications();
  },
  
  // Handle user sign out
  handleSignOut() {
    // Update UI for unauthenticated state
    DOM.show(DOM.$('login-btn'));
    DOM.show(DOM.$('register-btn'));
    DOM.hide(DOM.$('user-button')?.parentElement);
    
    // Redirect from protected pages
    if (this.currentPage && !this.routes[this.currentPage]?.public) {
      this.navigateToPage('home');
    }
  },
  
  // Initialize current page
  initializeCurrentPage() {
    const currentPath = window.location.pathname;
    
    // Page-specific initialization
    switch (currentPath) {
      case '/':
      case '/index.html':
        this.initializeHomePage();
        break;
      case '/book-lesson.html':
        this.initializeBookingPage();
        break;
      case '/dashboard.html':
        this.initializeDashboard();
        break;
      case '/login.html':
      case '/register.html':
        // Auth module handles these
        break;
    }
  },
  
  // Initialize home page
  initializeHomePage() {
    // Quick search form
    const searchForm = DOM.$('instructor-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postcode = searchForm['postcode-search'].value.trim();
        const lessonType = searchForm['lesson-type'].value;
        
        // Validate postcode
        if (!Validation.isUKPostcode(postcode)) {
          ErrorHandler.showError('Please enter a valid UK postcode');
          return;
        }
        
        // Store search params
        Storage.set('searchParams', { postcode, lessonType });
        
        // Navigate to instructors section
        this.navigateToPage('instructors');
        
        // Load instructors
        await this.searchInstructors(postcode, lessonType);
      });
    }
    
    // Initialize postcode validation
    this.initializePostcodeInput('postcode-search');
    
    // Load featured instructors
    this.loadFeaturedInstructors();
  },
  
  // Initialize booking page
  initializeBookingPage() {
    // Booking module handles this
    if (typeof Booking !== 'undefined') {
      Booking.init();
    }
  },
  
  // Initialize dashboard
  initializeDashboard() {
    // Dashboard module handles this
    if (typeof Dashboard !== 'undefined') {
      Dashboard.init();
    }
  },
  
  // Initialize page-specific features
  initializePageFeatures(page) {
    switch (page) {
      case 'instructors':
        this.initializeInstructorsSection();
        break;
      case 'pricing':
        this.initializePricingSection();
        break;
    }
  },
  
  // Initialize instructors section
  async initializeInstructorsSection() {
    // Check for saved search params
    const searchParams = Storage.get('searchParams');
    if (searchParams) {
      await this.searchInstructors(searchParams.postcode, searchParams.lessonType);
    } else {
      await this.loadAllInstructors();
    }
    
    // Initialize filters
    this.initializeInstructorFilters();
  },
  
  // Search instructors
  async searchInstructors(postcode, lessonType) {
    const grid = DOM.$('instructors-grid');
    if (!grid) return;
    
    // Show loading state
    grid.textContent = '';
    grid.appendChild(this.createLoadingSkeletons(6));
    
    try {
      const instructors = await InstructorService.searchInstructors(postcode);
      
      if (instructors.length === 0) {
        grid.textContent = '';
        grid.appendChild(this.createEmptyState('No instructors found in your area'));
        return;
      }
      
      // Render instructors
      grid.textContent = '';
      instructors.forEach(instructor => {
        grid.appendChild(this.createInstructorCard(instructor));
      });
      
      // Initialize card interactions
      this.initializeInstructorCards();
      
    } catch (error) {
      Logger.error('Failed to search instructors:', error);
      grid.textContent = '';
      grid.appendChild(this.createErrorState());
    }
  },
  
  // Load all instructors
  async loadAllInstructors() {
    const grid = DOM.$('instructors-grid');
    if (!grid) return;
    
    // Show loading state
    grid.textContent = '';
    grid.appendChild(this.createLoadingSkeletons(8));
    
    try {
      const instructors = await InstructorService.getAllInstructors();
      
      if (instructors.length === 0) {
        grid.textContent = '';
        grid.appendChild(this.createEmptyState('No instructors available'));
        return;
      }
      
      // Render instructors
      grid.textContent = '';
      instructors.forEach(instructor => {
        grid.appendChild(this.createInstructorCard(instructor));
      });
      
      // Initialize card interactions
      this.initializeInstructorCards();
      
    } catch (error) {
      Logger.error('Failed to load instructors:', error);
      grid.textContent = '';
      grid.appendChild(this.createErrorState());
    }
  },
  
  // Create instructor card element
  createInstructorCard(instructor) {
    const price = instructor.preferences?.[0]?.standard_lesson_price || 35;
    const areas = instructor.areas?.map(a => a.area_name).join(', ') || 'Various locations';
    const rating = 4.5 + Math.random() * 0.5; // Mock rating
    const reviews = Math.floor(20 + Math.random() * 80); // Mock reviews
    
    const card = document.createElement('div');
    card.className = 'instructor-card';
    card.setAttribute('data-instructor-id', instructor.id);
    
    // Header
    const header = document.createElement('div');
    header.className = 'instructor-card-header';
    
    const avatar = document.createElement('img');
    avatar.src = 'assets/icons/default-avatar.svg';
    avatar.alt = instructor.name || 'Unknown Instructor';
    avatar.className = 'instructor-avatar';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'instructor-info';
    
    const nameH3 = document.createElement('h3');
    nameH3.className = 'instructor-name';
    nameH3.textContent = instructor.name || 'Unknown Instructor';
    
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'instructor-rating';
    
    const starsDiv = document.createElement('div');
    starsDiv.className = 'rating-stars';
    starsDiv.appendChild(this.createStars(rating));
    
    const ratingText = document.createElement('span');
    ratingText.className = 'rating-text';
    ratingText.textContent = `${rating.toFixed(1)} (${reviews} reviews)`;
    
    ratingDiv.appendChild(starsDiv);
    ratingDiv.appendChild(ratingText);
    infoDiv.appendChild(nameH3);
    infoDiv.appendChild(ratingDiv);
    header.appendChild(avatar);
    header.appendChild(infoDiv);
    
    // Details
    const details = document.createElement('div');
    details.className = 'instructor-details';
    
    // Location detail
    const locationItem = this.createDetailItem('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10m-3 0a3 3 0 1 1 6 0a3 3 0 1 1-6 0', areas);
    const hoursItem = this.createDetailItem('M12 12m-10 0a10 10 0 1 1 20 0a10 10 0 1 1-20 0 M12 6v6l4 2', 'Flexible hours');
    const transmissionItem = this.createDetailItem('M12 1v6m0 6v6m6-10v8M6 7v8', 'Manual & Automatic');
    
    details.appendChild(locationItem);
    details.appendChild(hoursItem);
    details.appendChild(transmissionItem);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'instructor-footer';
    
    const priceDiv = document.createElement('div');
    priceDiv.className = 'instructor-price';
    
    const priceLabel = document.createElement('span');
    priceLabel.className = 'price-label';
    priceLabel.textContent = 'From';
    
    const priceAmount = document.createElement('span');
    priceAmount.className = 'price-amount';
    priceAmount.textContent = ConfigUtils.formatCurrency(price);
    
    const pricePeriod = document.createElement('span');
    pricePeriod.className = 'price-period';
    pricePeriod.textContent = 'per hour';
    
    priceDiv.appendChild(priceLabel);
    priceDiv.appendChild(priceAmount);
    priceDiv.appendChild(pricePeriod);
    
    const bookBtn = document.createElement('button');
    bookBtn.className = 'btn btn-primary';
    bookBtn.textContent = 'Book Now';
    bookBtn.addEventListener('click', () => this.bookWithInstructor(instructor.id));
    
    footer.appendChild(priceDiv);
    footer.appendChild(bookBtn);
    
    card.appendChild(header);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
  },
  
  // Legacy method for backward compatibility
  renderInstructorCard(instructor) {
    return this.createInstructorCard(instructor).outerHTML;
  },
  
  // Create detail item element
  createDetailItem(pathData, text) {
    const item = document.createElement('div');
    item.className = 'detail-item';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'detail-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    
    const span = document.createElement('span');
    span.textContent = text;
    
    item.appendChild(svg);
    item.appendChild(span);
    
    return item;
  },
  
  // Create star rating elements
  createStars(rating) {
    const container = document.createDocumentFragment();
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      const star = this.createStar('filled');
      container.appendChild(star);
    }
    
    // Half star
    if (hasHalfStar) {
      const star = this.createStar('half');
      container.appendChild(star);
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      const star = this.createStar('empty');
      container.appendChild(star);
    }
    
    return container;
  },
  
  // Create individual star element
  createStar(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `star ${type}`);
    svg.setAttribute('viewBox', '0 0 24 24');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    if (type === 'filled') {
      svg.setAttribute('fill', 'currentColor');
      path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
    } else if (type === 'half') {
      svg.setAttribute('fill', 'currentColor');
      path.setAttribute('d', 'M12 2v15.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
    } else {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      path.setAttribute('d', 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
    }
    
    svg.appendChild(path);
    return svg;
  },
  
  // Render star rating (legacy method)
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars += '<svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    
    // Half star
    if (hasHalfStar) {
      stars += '<svg class="star half" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v15.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars += '<svg class="star empty" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    }
    
    return stars;
  },
  
  // Book with instructor
  bookWithInstructor(instructorId) {
    // Check authentication
    if (!Auth.isAuthenticated()) {
      Storage.set('bookingInstructorId', instructorId);
      Storage.set('redirectAfterLogin', '/book-lesson.html');
      window.location.href = '/login.html';
      return;
    }
    
    // Store instructor ID and navigate to booking
    Storage.set('selectedInstructorId', instructorId);
    window.location.href = '/book-lesson.html';
  },
  
  // Initialize instructor filters
  initializeInstructorFilters() {
    const filters = {
      area: DOM.$('area-filter'),
      price: DOM.$('price-filter'),
      availability: DOM.$('availability-filter')
    };
    
    Object.values(filters).forEach(filter => {
      if (filter) {
        DOM.on(filter, 'change', () => this.applyInstructorFilters());
      }
    });
    
    const clearBtn = DOM.$('clear-filters');
    if (clearBtn) {
      DOM.on(clearBtn, 'click', () => {
        Object.values(filters).forEach(filter => {
          if (filter) filter.value = '';
        });
        this.applyInstructorFilters();
      });
    }
  },
  
  // Apply instructor filters
  applyInstructorFilters() {
    // This would filter the displayed instructors
    Logger.debug('Applying instructor filters');
  },
  
  // Initialize pricing section
  initializePricingSection() {
    // Add click handlers to pricing cards
    DOM.findAll('.pricing-card button').forEach(btn => {
      DOM.on(btn, 'click', () => {
        const card = btn.closest('.pricing-card');
        const title = card.querySelector('.pricing-title').textContent;
        
        // Store selected package
        Storage.set('selectedPackage', title);
        
        // Navigate to instructors
        this.navigateToPage('instructors');
      });
    });
  },
  
  // Load notifications
  async loadNotifications() {
    try {
      const user = Auth.getCurrentUser();
      if (!user) return;
      
      const notifications = await NotificationService.getNotificationsForPupil(
        user.id,
        true // unread only
      );
      
      const count = notifications.length;
      const badge = DOM.$('notification-count');
      
      if (badge) {
        if (count > 0) {
          badge.textContent = count > 9 ? '9+' : count;
          DOM.show(badge);
        } else {
          DOM.hide(badge);
        }
      }
    } catch (error) {
      Logger.warn('Failed to load notifications:', error);
    }
  },
  
  // Initialize notifications
  initializeNotifications() {
    const notificationsBtn = DOM.$('notifications-btn');
    if (notificationsBtn) {
      DOM.on(notificationsBtn, 'click', () => {
        // Show notifications modal/dropdown
        Logger.info('Notifications feature coming soon');
      });
    }
  },
  
  // Initialize service worker
  async initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      Logger.warn('Service Worker not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      Logger.info('Service Worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        Logger.info('Service Worker update found');
      });
    } catch (error) {
      Logger.error('Service Worker registration failed:', error);
    }
  },
  
  // Initialize postcode input
  initializePostcodeInput(inputId) {
    const input = DOM.$(inputId);
    if (!input) return;
    
    const validationDiv = DOM.$(`${inputId}-validation`);
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
      
      // Debounce validation
      timeout = setTimeout(async () => {
        DOM.show(spinner);
        spinner.style.display = 'block';
        
        try {
          const validation = await PostcodeService.validatePostcode(postcode);
          
          DOM.hide(spinner);
          DOM.show(result);
          
          if (validation.valid) {
            DOM.addClass(result, 'valid');
            DOM.removeClass(result, 'invalid');
          } else {
            DOM.addClass(result, 'invalid');
            DOM.removeClass(result, 'valid');
          }
        } catch (error) {
          DOM.hide(spinner);
          Logger.warn('Postcode validation error:', error);
        }
      }, 500);
    });
  },
  
  // Handle deep links
  handleDeepLinks() {
    const params = URLUtils.getParams();
    
    // Handle booking redirect
    const bookingInstructorId = Storage.get('bookingInstructorId');
    if (bookingInstructorId && Auth.isAuthenticated()) {
      Storage.remove('bookingInstructorId');
      this.bookWithInstructor(bookingInstructorId);
    }
    
    // Handle email verification
    if (params.has('type') && params.get('type') === 'email_verification') {
      this.handleEmailVerification();
    }
  },
  
  // Handle email verification
  handleEmailVerification() {
    // Show success message
    const message = 'Email verified successfully! You can now log in.';
    
    if (window.location.pathname.includes('login')) {
      if (typeof Auth !== 'undefined') {
        Auth.showFormSuccess(message);
      }
    } else {
      ErrorHandler.createToast('success', 'Success', message);
    }
  },
  
  // Create loading skeletons
  createLoadingSkeletons(count = 6) {
    const container = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'instructor-skeleton skeleton';
      
      const avatar = document.createElement('div');
      avatar.className = 'skeleton-avatar';
      
      const content = document.createElement('div');
      content.className = 'skeleton-content';
      
      const titleLine = document.createElement('div');
      titleLine.className = 'skeleton-line skeleton-title';
      
      const textLine1 = document.createElement('div');
      textLine1.className = 'skeleton-line skeleton-text';
      
      const textLine2 = document.createElement('div');
      textLine2.className = 'skeleton-line skeleton-text short';
      
      content.appendChild(titleLine);
      content.appendChild(textLine1);
      content.appendChild(textLine2);
      
      skeleton.appendChild(avatar);
      skeleton.appendChild(content);
      
      container.appendChild(skeleton);
    }
    return container;
  },
  
  // Legacy method for backward compatibility - returns safe HTML for loading skeletons
  getLoadingSkeletons(count = 6) {
    const div = document.createElement('div');
    div.appendChild(this.createLoadingSkeletons(count));
    // This is safe since we're only returning generated DOM content, not user input
    return div.innerHTML;
  },
  
  // Create empty state element
  createEmptyState(message = 'No results found') {
    const container = document.createElement('div');
    container.className = 'empty-state';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'empty-state-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z');
    svg.appendChild(path);
    
    const h3 = document.createElement('h3');
    h3.textContent = message;
    
    const p = document.createElement('p');
    p.textContent = 'Try adjusting your search criteria or browse all instructors.';
    
    const button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.textContent = 'Browse All Instructors';
    button.addEventListener('click', () => this.loadAllInstructors());
    
    container.appendChild(svg);
    container.appendChild(h3);
    container.appendChild(p);
    container.appendChild(button);
    
    return container;
  },
  
  // Legacy method for backward compatibility
  getEmptyState(message = 'No results found') {
    return this.createEmptyState(message).outerHTML;
  },
  
  // Create error state element
  createErrorState() {
    const container = document.createElement('div');
    container.className = 'empty-state';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'empty-state-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
    svg.appendChild(path);
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Something went wrong';
    
    const p = document.createElement('p');
    p.textContent = "We couldn't load the instructors. Please try again.";
    
    const button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.textContent = 'Reload Page';
    button.addEventListener('click', () => window.location.reload());
    
    container.appendChild(svg);
    container.appendChild(h3);
    container.appendChild(p);
    container.appendChild(button);
    
    return container;
  },
  
  // Legacy method for backward compatibility
  getErrorState() {
    return this.createErrorState().outerHTML;
  },
  
  // Hide loading screen
  hideLoadingScreen() {
    const loadingScreen = DOM.$('loading-screen');
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          DOM.hide(loadingScreen);
        }, 300);
      }, 500);
    }
  },
  
  // Show initialization error
  showInitError() {
    const container = document.body;
    container.textContent = ''; // Clear existing content safely
    
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
    `;
    
    const innerDiv = document.createElement('div');
    
    const h1 = document.createElement('h1');
    h1.textContent = 'Unable to Load Application';
    
    const p = document.createElement('p');
    p.textContent = 'Please check your internet connection and try again.';
    
    const button = document.createElement('button');
    button.textContent = 'Reload Page';
    button.style.cssText = `
      margin-top: 20px;
      padding: 10px 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    `;
    button.addEventListener('click', () => window.location.reload());
    
    innerDiv.appendChild(h1);
    innerDiv.appendChild(p);
    innerDiv.appendChild(button);
    
    errorContainer.appendChild(innerDiv);
    container.appendChild(errorContainer);
  },
  
  // Handle global errors
  handleError(error) {
    // Don't show errors in production
    if (!CONFIG.debug.enabled) {
      return;
    }
    
    // Log error details
    Logger.error('Application error:', error);
  },
  
  // Initialize instructor card interactions
  initializeInstructorCards() {
    const cards = document.querySelectorAll('.instructor-card');
    
    cards.forEach(card => {
      // Add click handler for booking
      const bookButton = card.querySelector('.btn-primary');
      if (bookButton) {
        bookButton.addEventListener('click', (e) => {
          e.preventDefault();
          const instructorId = card.getAttribute('data-instructor-id');
          if (instructorId) {
            window.location.href = `/book-lesson.html?instructor=${instructorId}`;
          }
        });
      }
      
      // Add click handler for viewing profile  
      const viewButton = card.querySelector('.btn-outline');
      if (viewButton) {
        viewButton.addEventListener('click', (e) => {
          e.preventDefault();
          const instructorId = card.getAttribute('data-instructor-id');
          if (instructorId) {
            this.showInstructorModal(instructorId);
          }
        });
      }
    });
  },
  
  // Show instructor details modal
  showInstructorModal(instructorId) {
    // This would show a modal with instructor details
    console.log('Show instructor modal for:', instructorId);
  },
  
  // Logout
  async logout() {
    const confirmed = confirm('Are you sure you want to log out?');
    if (!confirmed) return;
    
    try {
      await Auth.logout();
    } catch (error) {
      Logger.error('Logout error:', error);
      // Force redirect anyway
      window.location.href = '/login.html';
    }
  }
};

// Initialize app when DOM is ready
if (typeof window !== 'undefined') {
  window.App = App;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      App.init();
    });
  } else {
    App.init();
  }
}