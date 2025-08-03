/* ===================================
   Pass Plus SOM - Utility Functions
   Common utility functions and helpers
   =================================== */

// Logger utility
const Logger = {
  levels: { error: 0, warn: 1, info: 2, debug: 3 },
  
  getCurrentLevel() {
    const configLevel = CONFIG?.debug?.logLevel || 'info';
    return this.levels[configLevel] || 2;
  },
  
  log(level, message, ...args) {
    if (this.levels[level] <= this.getCurrentLevel()) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      console[level](prefix, message, ...args);
    }
  },
  
  error(message, ...args) { this.log('error', message, ...args); },
  warn(message, ...args) { this.log('warn', message, ...args); },
  info(message, ...args) { this.log('info', message, ...args); },
  debug(message, ...args) { this.log('debug', message, ...args); }
};

// DOM utilities
const DOM = {
  // Get element by ID with error handling
  $(id) {
    const element = document.getElementById(id);
    if (!element) {
      Logger.warn(`Element with ID '${id}' not found`);
    }
    return element;
  },
  
  // Query selector with error handling
  find(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      Logger.error('Invalid selector:', selector, error);
      return null;
    }
  },
  
  // Query selector all
  findAll(selector, parent = document) {
    try {
      return Array.from(parent.querySelectorAll(selector));
    } catch (error) {
      Logger.error('Invalid selector:', selector, error);
      return [];
    }
  },
  
  // Add event listener with cleanup tracking
  on(element, event, handler, options = false) {
    if (!element || typeof handler !== 'function') {
      Logger.warn('Invalid element or handler for event listener');
      return null;
    }
    
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => element.removeEventListener(event, handler, options);
  },
  
  // Safely set HTML content with basic sanitization
  safeSetHTML(element, htmlString) {
    // Basic sanitization - remove script tags and event handlers
    const sanitized = htmlString
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
    
    element.innerHTML = sanitized;
  },

  // Create element with attributes and content
  create(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (content) {
      if (typeof content === 'string') {
        // Use safe HTML insertion for trusted HTML content
        // For plain text, use textContent instead
        if (content.includes('<') && content.includes('>')) {
          this.safeSetHTML(element, content);
        } else {
          element.textContent = content;
        }
      } else {
        element.appendChild(content);
      }
    }
    
    return element;
  },
  
  // Show/hide elements
  show(element, display = 'block') {
    if (element) element.style.display = display;
  },
  
  hide(element) {
    if (element) element.style.display = 'none';
  },
  
  // Toggle element visibility
  toggle(element, force) {
    if (!element) return;
    
    if (typeof force === 'boolean') {
      element.style.display = force ? 'block' : 'none';
    } else {
      element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
  },
  
  // Add/remove classes
  addClass(element, className) {
    if (element && className) {
      element.classList.add(...className.split(' '));
    }
  },
  
  removeClass(element, className) {
    if (element && className) {
      element.classList.remove(...className.split(' '));
    }
  },
  
  toggleClass(element, className, force) {
    if (element && className) {
      return element.classList.toggle(className, force);
    }
    return false;
  },
  
  // Check if element has class
  hasClass(element, className) {
    return element && element.classList.contains(className);
  }
};

// Validation utilities
const Validation = {
  // Email validation
  isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // UK postcode validation
  isUKPostcode(postcode) {
    const postcodeRegex = /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
    return postcodeRegex.test(postcode.replace(/\s/g, ''));
  },
  
  // UK phone number validation
  isUKPhone(phone) {
    const phoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },
  
  // Password strength validation
  checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    let strength = 'weak';
    
    if (passedChecks >= 4) strength = 'strong';
    else if (passedChecks >= 3) strength = 'medium';
    
    return { strength, checks, score: passedChecks };
  },
  
  // Age validation
  isValidAge(birthDate, minAge = 17) {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 >= minAge;
    }
    
    return age >= minAge;
  },
  
  // Credit card validation (basic Luhn algorithm)
  isValidCreditCard(number) {
    const num = number.replace(/\s/g, '');
    if (!/^\d+$/.test(num)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }
};

// Date and time utilities
const DateTime = {
  // Format date for display
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options })
      .format(new Date(date));
  },
  
  // Format time for display
  formatTime(time, format24h = true) {
    const date = typeof time === 'string' ? new Date(`2000-01-01T${time}`) : new Date(time);
    
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !format24h
    }).format(date);
  },
  
  // Format date and time together
  formatDateTime(date, time = null) {
    const dateObj = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':');
      dateObj.setHours(parseInt(hours), parseInt(minutes));
    }
    
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  },
  
  // Get relative time (e.g., "2 hours ago")
  getRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now - target;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return this.formatDate(date);
  },
  
  // Check if date is today
  isToday(date) {
    const today = new Date();
    const target = new Date(date);
    
    return today.toDateString() === target.toDateString();
  },
  
  // Check if date is in the future
  isFuture(date) {
    return new Date(date) > new Date();
  },
  
  // Add days to date
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  // Get date in YYYY-MM-DD format
  toISODate(date) {
    return new Date(date).toISOString().split('T')[0];
  },
  
  // Get time in HH:MM format
  toTimeString(date) {
    return new Date(date).toTimeString().slice(0, 5);
  }
};

// Local storage utilities
const Storage = {
  // Get item with JSON parsing
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      Logger.warn('Error reading from localStorage:', key, error);
      return defaultValue;
    }
  },
  
  // Set item with JSON stringification
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      Logger.warn('Error writing to localStorage:', key, error);
      return false;
    }
  },
  
  // Remove item
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      Logger.warn('Error removing from localStorage:', key, error);
      return false;
    }
  },
  
  // Clear all items
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      Logger.warn('Error clearing localStorage:', error);
      return false;
    }
  },
  
  // Check if key exists
  has(key) {
    return localStorage.getItem(key) !== null;
  }
};

// HTTP utilities
const HTTP = {
  // Make HTTP request with error handling
  async request(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      Logger.error('HTTP request failed:', url, error);
      throw error;
    }
  },
  
  // Shorthand methods
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },
  
  post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
};

// URL utilities
const URLUtils = {
  // Get query parameters
  getParams() {
    return new URLSearchParams(window.location.search);
  },
  
  // Get specific parameter
  getParam(name, defaultValue = null) {
    return this.getParams().get(name) || defaultValue;
  },
  
  // Set parameter and update URL
  setParam(name, value) {
    const params = this.getParams();
    params.set(name, value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, '', newUrl);
  },
  
  // Remove parameter
  removeParam(name) {
    const params = this.getParams();
    params.delete(name);
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    history.replaceState(null, '', newUrl);
  },
  
  // Get hash without #
  getHash() {
    return window.location.hash.slice(1);
  },
  
  // Navigate to URL
  navigate(url) {
    window.location.href = url;
  },
  
  // Reload page
  reload() {
    window.location.reload();
  }
};

// Formatting utilities
const Format = {
  // Format currency
  currency(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },
  
  // Format phone number
  phone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('44')) {
      // UK international format
      return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    } else if (cleaned.startsWith('07')) {
      // UK mobile format
      return `${cleaned.slice(0, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    return phone; // Return original if format not recognized
  },
  
  // Format postcode
  postcode(postcode) {
    const cleaned = postcode.replace(/\s/g, '').toUpperCase();
    if (cleaned.length <= 6) {
      return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
    }
    return postcode.toUpperCase();
  },
  
  // Capitalize first letter
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  // Title case
  titleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },
  
  // Truncate text
  truncate(text, length = 100, suffix = '...') {
    if (text.length <= length) return text;
    return text.slice(0, length) + suffix;
  },
  
  // Format file size
  fileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Async utilities
const Async = {
  // Delay execution
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Retry async function
  async retry(fn, maxAttempts = 3, delayMs = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        Logger.warn(`Attempt ${attempt}/${maxAttempts} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          await this.delay(delayMs * attempt);
        }
      }
    }
    
    throw lastError;
  },
  
  // Timeout wrapper
  timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), ms)
      )
    ]);
  },
  
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Error handling utilities
const ErrorHandler = {
  // Handle and display errors
  handle(error, context = 'Unknown') {
    Logger.error(`Error in ${context}:`, error);
    
    // Determine user-friendly message
    let message = CONFIG?.errors?.generic || 'Something went wrong';
    
    if (error.message) {
      if (error.message.includes('fetch')) {
        message = CONFIG?.errors?.network || 'Network error';
      } else if (error.message.includes('401')) {
        message = CONFIG?.errors?.authentication || 'Authentication required';
      } else if (error.message.includes('403')) {
        message = CONFIG?.errors?.authorization || 'Access denied';
      }
    }
    
    this.showError(message);
    return message;
  },
  
  // Show error to user
  showError(message) {
    const toast = this.createToast('error', 'Error', message);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  },
  
  // Create toast notification
  createToast(type, title, message) {
    const icons = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };
    
    const toast = DOM.create('div', {
      className: `toast toast-${type}`,
      style: `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        max-width: 300px;
      `
    }, `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 18px;">${icons[type] || icons.info}</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 14px; color: #666;">${message}</div>
        </div>
      </div>
    `);
    
    // Add show class for animation
    toast.classList.add('toast-show');
    
    return toast;
  }
};

// Export utilities for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Logger,
    DOM,
    Validation,
    DateTime,
    Storage,
    HTTP,
    URLUtils,
    Format,
    Async,
    ErrorHandler
  };
} else if (typeof window !== 'undefined') {
  // Make utilities globally available
  Object.assign(window, {
    Logger,
    DOM,
    Validation,
    DateTime,
    Storage,
    HTTP,
    URLUtils,
    Format,
    Async,
    ErrorHandler
  });
}