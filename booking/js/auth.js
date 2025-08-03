/* ===================================
   Pass Plus SOM - Authentication Module
   Handles login, registration, and auth state
   =================================== */

// Authentication state management
const Auth = {
  currentUser: null,
  listeners: [],
  
  // Initialize authentication
  async init() {
    Logger.info('Initializing authentication module');
    
    // Check for existing session
    const storedUser = Storage.get('currentUser');
    if (storedUser) {
      this.currentUser = storedUser;
      await this.validateSession();
    }
    
    // Listen to auth state changes
    if (typeof AuthService !== 'undefined') {
      AuthService.onAuthStateChange((event, session) => {
        Logger.debug('Auth state changed:', event);
        this.handleAuthStateChange(event, session);
      });
    }
    
    // Initialize forms if on auth pages
    this.initializeAuthForms();
  },
  
  // Validate existing session
  async validateSession() {
    try {
      // First check for OAuth session (handles Google OAuth callback)
      const session = await AuthService.getSession();
      if (session?.user) {
        Logger.info('✅ OAuth session found:', session.user.email);
        this.currentUser = session.user;
        Storage.set('currentUser', session.user);
        this.notifyListeners('SIGNED_IN', session.user);
        return;
      }

      // Then check for regular user session
      const user = await AuthService.getCurrentUser();
      if (user) {
        this.currentUser = user;
        Storage.set('currentUser', user);
        this.notifyListeners('SIGNED_IN', user);
      } else {
        this.clearSession();
      }
    } catch (error) {
      Logger.warn('Session validation failed:', error);
      this.clearSession();
    }
  },
  
  // Handle auth state changes
  handleAuthStateChange(event, session) {
    switch (event) {
      case 'SIGNED_IN':
        this.currentUser = session?.user || null;
        if (this.currentUser) {
          Storage.set('currentUser', this.currentUser);
          this.notifyListeners('SIGNED_IN', this.currentUser);
          this.redirectAfterLogin();
        }
        break;
        
      case 'SIGNED_OUT':
        this.clearSession();
        this.notifyListeners('SIGNED_OUT', null);
        this.redirectToLogin();
        break;
        
      case 'TOKEN_REFRESHED':
        Logger.debug('Token refreshed successfully');
        break;
        
      case 'PASSWORD_RECOVERY':
        this.handlePasswordRecovery();
        break;
    }
  },
  
  // Clear session data
  clearSession() {
    this.currentUser = null;
    Storage.remove('currentUser');
    Storage.remove('authToken');
  },
  
  // Add auth state listener
  onAuthStateChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },
  
  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        Logger.error('Auth listener error:', error);
      }
    });
  },
  
  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  },
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  },
  
  // Require authentication
  requireAuth(redirectUrl = '/login.html') {
    if (!this.isAuthenticated()) {
      const currentPath = window.location.pathname;
      Storage.set('redirectAfterLogin', currentPath);
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },
  
  // Redirect after login
  redirectAfterLogin() {
    const redirectPath = Storage.get('redirectAfterLogin') || '/dashboard.html';
    Storage.remove('redirectAfterLogin');
    
    // Don't redirect if already on target page
    if (window.location.pathname !== redirectPath) {
      window.location.href = redirectPath;
    }
  },
  
  // Redirect to login
  redirectToLogin() {
    const publicPages = ['/', '/index.html', '/login.html', '/register.html'];
    const currentPath = window.location.pathname;
    
    if (!publicPages.includes(currentPath)) {
      window.location.href = '/login.html';
    }
  },
  
  // Initialize authentication forms
  initializeAuthForms() {
    // Login form
    const loginForm = DOM.$('login-form');
    if (loginForm) {
      this.initializeLoginForm(loginForm);
    }
    
    // Registration form
    const registerForm = DOM.$('register-form');
    if (registerForm) {
      this.initializeRegistrationForm(registerForm);
    }
    
    // Forgot password form
    const forgotPasswordForm = DOM.$('forgot-password-form');
    if (forgotPasswordForm) {
      this.initializeForgotPasswordForm(forgotPasswordForm);
    }
    
    // Initialize social auth buttons
    this.initializeSocialAuth();
    
    // Initialize password visibility toggles
    this.initializePasswordToggles();
  },
  
  // Initialize login form
  initializeLoginForm(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = form.email.value.trim();
      const password = form.password.value;
      const rememberMe = form['remember-me']?.checked || false;
      
      // Validate inputs
      if (!Validation.isEmail(email)) {
        this.showFormError('Please enter a valid email address');
        return;
      }
      
      if (password.length < 6) {
        this.showFormError('Password must be at least 6 characters');
        return;
      }
      
      // Show loading state
      const submitBtn = form.querySelector('#login-btn');
      this.setButtonLoading(submitBtn, true);
      
      try {
        // Attempt login
        const { user, session } = await AuthService.signIn(email, password);
        
        if (user) {
          // Store remember me preference
          if (rememberMe) {
            Storage.set('rememberEmail', email);
          } else {
            Storage.remove('rememberEmail');
          }
          
          // Success message
          this.showFormSuccess('Login successful! Redirecting...');
          
          // Check if user has pupil account
          await this.ensurePupilAccount(user);
        }
      } catch (error) {
        Logger.error('Login error:', error);
        this.handleAuthError(error);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    });
    
    // Pre-fill remembered email
    const rememberedEmail = Storage.get('rememberEmail');
    if (rememberedEmail) {
      form.email.value = rememberedEmail;
      form['remember-me'].checked = true;
    }
  },
  
  // Initialize registration form
  initializeRegistrationForm(form) {
    let currentStep = 1;
    const totalSteps = 3;
    
    // Step navigation
    const updateStep = (step) => {
      // Hide all steps
      DOM.findAll('.form-step').forEach(el => {
        DOM.removeClass(el, 'active');
      });
      
      // Show current step
      const currentStepEl = DOM.find(`.form-step[data-step="${step}"]`);
      if (currentStepEl) {
        DOM.addClass(currentStepEl, 'active');
      }
      
      // Update progress
      DOM.findAll('.registration-steps .step').forEach((el, index) => {
        if (index + 1 <= step) {
          DOM.addClass(el, 'completed');
        }
        if (index + 1 === step) {
          DOM.addClass(el, 'active');
        }
      });
      
      // Update buttons
      DOM.toggle(DOM.$('prev-step'), step > 1);
      DOM.toggle(DOM.$('next-step'), step < totalSteps);
      DOM.toggle(DOM.$('submit-registration'), step === totalSteps);
      
      currentStep = step;
    };
    
    // Next step button
    const nextBtn = DOM.$('next-step');
    if (nextBtn) {
      DOM.on(nextBtn, 'click', () => {
        if (this.validateRegistrationStep(currentStep)) {
          updateStep(currentStep + 1);
        }
      });
    }
    
    // Previous step button
    const prevBtn = DOM.$('prev-step');
    if (prevBtn) {
      DOM.on(prevBtn, 'click', () => {
        updateStep(currentStep - 1);
      });
    }
    
    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate all steps
      for (let i = 1; i <= totalSteps; i++) {
        if (!this.validateRegistrationStep(i)) {
          updateStep(i);
          return;
        }
      }
      
      // Collect form data
      const formData = {
        firstName: form['first-name'].value.trim(),
        lastName: form['last-name'].value.trim(),
        dateOfBirth: form['date-of-birth'].value,
        provisionalLicense: form['provisional-license'].value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        postcode: form.postcode.value.trim().toUpperCase(),
        address: form.address.value.trim(),
        password: form.password.value,
        emailNotifications: form['email-notifications'].checked,
        smsNotifications: form['sms-notifications'].checked,
        marketingEmails: form['marketing-emails'].checked
      };
      
      // Show loading state
      const submitBtn = DOM.$('submit-registration');
      this.setButtonLoading(submitBtn, true);
      
      try {
        // Create auth account
        const { user, session } = await AuthService.signUp(
          formData.email,
          formData.password,
          {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone
          }
        );
        
        if (user) {
          // Create pupil account
          await PupilService.createPupilAccount({
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            postcode: formData.postcode,
            date_of_birth: formData.dateOfBirth,
            provisional_license_number: formData.provisionalLicense,
            address: formData.address,
            email_notifications: formData.emailNotifications,
            sms_notifications: formData.smsNotifications,
            marketing_emails: formData.marketingEmails
          });
          
          // Show verification message
          this.showVerificationSection(formData.email);
        }
      } catch (error) {
        Logger.error('Registration error:', error);
        this.handleAuthError(error);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    });
    
    // Initialize form enhancements
    this.initializePasswordStrength();
    this.initializePostcodeValidation();
    this.initializePhoneValidation();
  },
  
  // Validate registration step
  validateRegistrationStep(step) {
    const form = DOM.$('register-form');
    let isValid = true;
    let errorMessage = '';
    
    switch (step) {
      case 1: // Personal Information
        const firstName = form['first-name'].value.trim();
        const lastName = form['last-name'].value.trim();
        const dob = form['date-of-birth'].value;
        
        if (!firstName || !lastName) {
          errorMessage = 'Please enter your full name';
          isValid = false;
        } else if (!dob) {
          errorMessage = 'Please enter your date of birth';
          isValid = false;
        } else if (!Validation.isValidAge(dob, 17)) {
          errorMessage = 'You must be at least 17 years old to register';
          isValid = false;
        }
        break;
        
      case 2: // Contact Details
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();
        const postcode = form.postcode.value.trim();
        
        if (!Validation.isEmail(email)) {
          errorMessage = 'Please enter a valid email address';
          isValid = false;
        } else if (phone && !Validation.isUKPhone(phone)) {
          errorMessage = 'Please enter a valid UK phone number';
          isValid = false;
        } else if (!Validation.isUKPostcode(postcode)) {
          errorMessage = 'Please enter a valid UK postcode';
          isValid = false;
        }
        break;
        
      case 3: // Account Setup
        const password = form.password.value;
        const confirmPassword = form['confirm-password'].value;
        const acceptTerms = form['accept-terms'].checked;
        const ageConfirmation = form['age-confirmation'].checked;
        
        if (password.length < 8) {
          errorMessage = 'Password must be at least 8 characters';
          isValid = false;
        } else if (password !== confirmPassword) {
          errorMessage = 'Passwords do not match';
          isValid = false;
        } else if (!acceptTerms) {
          errorMessage = 'Please accept the terms and conditions';
          isValid = false;
        } else if (!ageConfirmation) {
          errorMessage = 'Please confirm you are at least 17 years old';
          isValid = false;
        }
        break;
    }
    
    if (!isValid) {
      this.showFormError(errorMessage);
    }
    
    return isValid;
  },
  
  // Initialize password strength indicator
  initializePasswordStrength() {
    const passwordInput = DOM.$('password');
    const strengthBar = DOM.find('.strength-fill');
    const strengthText = DOM.find('.strength-text span');
    const requirementsList = DOM.findAll('.requirements-list li');
    
    if (!passwordInput || !strengthBar) return;
    
    DOM.on(passwordInput, 'input', () => {
      const password = passwordInput.value;
      const strength = Validation.checkPasswordStrength(password);
      
      // Update strength bar
      const widthPercent = (strength.score / 5) * 100;
      strengthBar.style.width = `${widthPercent}%`;
      
      // Update strength color
      const colors = {
        weak: '#ef4444',
        medium: '#f59e0b',
        strong: '#10b981'
      };
      strengthBar.style.backgroundColor = colors[strength.strength];
      
      // Update strength text
      if (strengthText) {
        strengthText.textContent = strength.strength;
        strengthText.style.color = colors[strength.strength];
      }
      
      // Update requirements
      requirementsList.forEach(li => {
        const requirement = li.dataset.requirement;
        if (strength.checks[requirement]) {
          DOM.addClass(li, 'valid');
        } else {
          DOM.removeClass(li, 'valid');
        }
      });
    });
    
    // Confirm password validation
    const confirmPasswordInput = DOM.$('confirm-password');
    if (confirmPasswordInput) {
      DOM.on(confirmPasswordInput, 'input', () => {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const validationResult = DOM.$('confirm-password-validation');
        
        if (confirmPassword && password !== confirmPassword) {
          DOM.show(validationResult);
          validationResult.textContent = 'Passwords do not match';
          validationResult.style.color = '#ef4444';
        } else if (confirmPassword && password === confirmPassword) {
          DOM.show(validationResult);
          validationResult.textContent = 'Passwords match';
          validationResult.style.color = '#10b981';
        } else {
          DOM.hide(validationResult);
        }
      });
    }
  },
  
  // Initialize postcode validation
  initializePostcodeValidation() {
    const postcodeInputs = DOM.findAll('input[id*="postcode"]');
    
    postcodeInputs.forEach(input => {
      const validationDiv = DOM.find(`#${input.id}-validation`);
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
              result.style.backgroundColor = '#10b981';
              result.textContent = '✓';
              
              // Get full postcode info
              const info = await PostcodeService.getPostcodeInfo(postcode);
              if (info.valid && info.district) {
                const locationSpan = DOM.create('span', {
                  style: 'margin-left: 8px; color: #6b7280; font-size: 12px;'
                }, info.district);
                input.parentNode.appendChild(locationSpan);
              }
            } else {
              result.style.backgroundColor = '#ef4444';
              result.textContent = '✗';
            }
          } catch (error) {
            DOM.hide(spinner);
            Logger.warn('Postcode validation error:', error);
          }
        }, 500);
      });
    });
  },
  
  // Initialize phone validation
  initializePhoneValidation() {
    const phoneInput = DOM.$('phone');
    if (!phoneInput) return;
    
    DOM.on(phoneInput, 'input', () => {
      const phone = phoneInput.value;
      if (phone.length > 5) {
        phoneInput.value = Format.phone(phone);
      }
    });
  },
  
  // Initialize forgot password form
  initializeForgotPasswordForm(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = form['reset-email'].value.trim();
      
      if (!Validation.isEmail(email)) {
        this.showFormError('Please enter a valid email address');
        return;
      }
      
      const submitBtn = form.querySelector('button[type="submit"]');
      this.setButtonLoading(submitBtn, true);
      
      try {
        await AuthService.resetPassword(email);
        this.showFormSuccess('Password reset email sent! Check your inbox.');
        
        // Clear form
        form.reset();
        
        // Show back to login after 3 seconds
        setTimeout(() => {
          DOM.$('back-to-login')?.click();
        }, 3000);
      } catch (error) {
        Logger.error('Password reset error:', error);
        this.handleAuthError(error);
      } finally {
        this.setButtonLoading(submitBtn, false);
      }
    });
    
    // Back to login button
    const backBtn = DOM.$('back-to-login');
    if (backBtn) {
      DOM.on(backBtn, 'click', () => {
        DOM.hide(DOM.$('forgot-password-section'));
        DOM.show(DOM.$('login-form'));
      });
    }
  },
  
  // Initialize social authentication
  initializeSocialAuth() {
    // Google login
    const googleButtons = DOM.findAll('#google-login, #google-register');
    googleButtons.forEach(btn => {
      DOM.on(btn, 'click', async () => {
        try {
          Logger.info('Initiating Google OAuth...');

          // Show loading state
          const originalText = btn.textContent;
          btn.textContent = 'Signing in with Google...';
          btn.disabled = true;

          // Sign in with Google OAuth
          const { data, error } = await AuthService.signInWithOAuth('google', {
            redirectTo: `${window.location.origin}/booking/dashboard.html`
          });

          if (error) {
            throw error;
          }

          // OAuth will handle the redirect automatically
          Logger.info('Google OAuth initiated successfully');

        } catch (error) {
          Logger.error('Google OAuth error:', error);
          this.handleAuthError(error);

          // Reset button state
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    });
    
    // Apple login (placeholder - not configured in Supabase yet)
    const appleButtons = DOM.findAll('#apple-login, #apple-register');
    appleButtons.forEach(btn => {
      DOM.on(btn, 'click', async () => {
        try {
          Logger.info('Apple authentication not configured yet');
          this.showFormError('Apple login not available yet. Please use Google or email.');
        } catch (error) {
          this.handleAuthError(error);
        }
      });
    });
  },
  
  // Initialize password visibility toggles
  initializePasswordToggles() {
    const toggleButtons = DOM.findAll('#toggle-password');
    
    toggleButtons.forEach(btn => {
      DOM.on(btn, 'click', () => {
        const input = btn.parentElement.querySelector('input');
        const eyeIcon = btn.querySelector('.eye-icon');
        const eyeOffIcon = btn.querySelector('.eye-off-icon');
        
        if (input.type === 'password') {
          input.type = 'text';
          DOM.hide(eyeIcon);
          DOM.show(eyeOffIcon);
        } else {
          input.type = 'password';
          DOM.show(eyeIcon);
          DOM.hide(eyeOffIcon);
        }
      });
    });
  },
  
  // Show verification section
  showVerificationSection(email) {
    const section = DOM.$('verification-section');
    if (section) {
      DOM.hide(DOM.$('register-form').parentElement);
      DOM.show(section);
      
      const emailSpan = DOM.$('verification-email');
      if (emailSpan) {
        emailSpan.textContent = email;
      }
    }
  },
  
  // Ensure pupil account exists
  async ensurePupilAccount(user) {
    try {
      // Check if pupil account exists
      const pupils = await Database.select('pupil_accounts', '*', { 
        email: user.email 
      });
      
      if (!pupils || pupils.length === 0) {
        // Create pupil account from auth data
        await PupilService.createPupilAccount({
          email: user.email,
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          phone: user.user_metadata?.phone || ''
        });
      }
    } catch (error) {
      Logger.warn('Could not ensure pupil account:', error);
    }
  },
  
  // Handle authentication errors
  handleAuthError(error) {
    let message = 'Authentication failed. Please try again.';
    
    if (error.message) {
      if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Please verify your email before logging in';
      } else if (error.message.includes('User already registered')) {
        message = 'An account with this email already exists';
      } else if (error.message.includes('Password')) {
        message = error.message;
      }
    }
    
    this.showFormError(message);
  },
  
  // Show form error
  showFormError(message) {
    // Create or update error alert
    let errorAlert = DOM.$('form-error-alert');
    if (!errorAlert) {
      errorAlert = DOM.create('div', {
        id: 'form-error-alert',
        className: 'alert alert-error',
        style: 'margin-bottom: 16px;'
      });
      
      const form = DOM.find('form.auth-form');
      if (form) {
        form.insertBefore(errorAlert, form.firstChild);
      }
    }
    
    // Clear previous content
    errorAlert.textContent = '';
    
    // Create and append SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'alert-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    
    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line1.setAttribute('x1', '12');
    line1.setAttribute('y1', '8');
    line1.setAttribute('x2', '12');
    line1.setAttribute('y2', '12');
    
    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line2.setAttribute('x1', '12');
    line2.setAttribute('y1', '16');
    line2.setAttribute('x2', '12.01');
    line2.setAttribute('y2', '16');
    
    svg.appendChild(circle);
    svg.appendChild(line1);
    svg.appendChild(line2);
    
    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'alert-content';
    const messageP = document.createElement('p');
    messageP.textContent = message;
    contentDiv.appendChild(messageP);
    
    errorAlert.appendChild(svg);
    errorAlert.appendChild(contentDiv);
    
    DOM.show(errorAlert);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      DOM.hide(errorAlert);
    }, 5000);
  },
  
  // Show form success
  showFormSuccess(message) {
    // Create or update success alert
    let successAlert = DOM.$('form-success-alert');
    if (!successAlert) {
      successAlert = DOM.create('div', {
        id: 'form-success-alert',
        className: 'alert alert-success',
        style: 'margin-bottom: 16px;'
      });
      
      const form = DOM.find('form.auth-form');
      if (form) {
        form.insertBefore(successAlert, form.firstChild);
      }
    }
    
    // Clear previous content
    successAlert.textContent = '';
    
    // Create and append SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'alert-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M22 11.08V12a10 10 0 1 1-5.93-9.14');
    
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '22 4 12 14.01 9 11.01');
    
    svg.appendChild(path);
    svg.appendChild(polyline);
    
    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'alert-content';
    const messageP = document.createElement('p');
    messageP.textContent = message;
    contentDiv.appendChild(messageP);
    
    successAlert.appendChild(svg);
    successAlert.appendChild(contentDiv);
    
    DOM.show(successAlert);
  },
  
  // Set button loading state
  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const textEl = button.querySelector('.btn-text');
    const loadingEl = button.querySelector('.btn-loading');
    
    if (isLoading) {
      button.disabled = true;
      if (textEl) DOM.hide(textEl);
      if (loadingEl) DOM.show(loadingEl, 'flex');
    } else {
      button.disabled = false;
      if (textEl) DOM.show(textEl);
      if (loadingEl) DOM.hide(loadingEl);
    }
  },
  
  // Handle forgot password link
  initializeForgotPasswordLink() {
    const forgotLink = DOM.$('forgot-password-link');
    if (forgotLink) {
      DOM.on(forgotLink, 'click', (e) => {
        e.preventDefault();
        DOM.hide(DOM.find('.auth-form-container'));
        DOM.show(DOM.$('forgot-password-section'));
      });
    }
  },
  
  // Handle password recovery
  handlePasswordRecovery() {
    // Check if we're on a password recovery page
    const hash = window.location.hash;
    if (hash && hash.includes('recovery')) {
      // Show password reset form
      Logger.info('Password recovery flow initiated');
      // This would show a password reset form
    }
  },
  
  // Logout functionality
  async logout() {
    try {
      await AuthService.signOut();
      this.clearSession();
      this.redirectToLogin();
    } catch (error) {
      Logger.error('Logout error:', error);
      // Force logout even if API fails
      this.clearSession();
      this.redirectToLogin();
    }
  }
};

// Initialize auth module when DOM is ready
if (typeof window !== 'undefined') {
  window.Auth = Auth;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Auth.init();
    });
  } else {
    Auth.init();
  }
}