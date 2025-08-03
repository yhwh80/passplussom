/* ===================================
   Pass Plus SOM - Configuration
   App configuration and constants
   =================================== */

// Application Configuration
const CONFIG = {
  // Supabase Configuration
  supabase: {
    url: 'https://yqphthblvsteecczprcs.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcGh0aGJsdnN0ZWVjY3pwcmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjE3MDQsImV4cCI6MjA2ODY5NzcwNH0.moAWw96xbIZEFnBIIWAi36OfuahyqO0WBzJdilXeBfg',
    // Note: Never put service role key in client-side code!
  },
  
  // Payment Configuration
  payments: {
    provider: 'truelayer', // 'truelayer', 'noda', 'stripe'
    apiKey: 'your-payment-api-key',
    sandbox: true, // Set to false for production
    webhookUrl: 'https://your-domain.com/api/webhooks/payment'
  },
  
  // Application Settings
  app: {
    name: 'Pass Plus SOM - Book Lessons',
    version: '1.0.0',
    supportEmail: 'support@passoplus-som.com',
    supportPhone: '+44 20 1234 5678',
    cancelationPolicy: 24, // hours before lesson
    maxBookingDays: 90, // maximum days in advance to book
    minBookingHours: 2, // minimum hours in advance to book
    defaultLessonDuration: 60, // minutes
    maxLessonsPerDay: 8,
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00'
  },
  
  // API Endpoints
  api: {
    postcodesIo: 'https://api.postcodes.io',
    emailService: 'https://api.emailjs.com/api/v1.0/email/send',
    smsService: 'https://api.twilio.com/2010-04-01'
  },
  
  // Feature Flags
  features: {
    socialLogin: true,
    twoFactorAuth: false,
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    openBanking: true,
    cardPayments: true,
    recurringLessons: false,
    groupLessons: false,
    videoLessons: false,
    progressTracking: true,
    referralSystem: false,
    loyaltyProgram: false
  },
  
  // UI Configuration
  ui: {
    theme: 'light', // 'light', 'dark', 'auto'
    language: 'en-GB',
    currency: 'GBP',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h', // '12h' or '24h'
    timezone: 'Europe/London',
    mapProvider: 'google', // 'google', 'mapbox', 'openstreetmap'
    animations: true,
    reducedMotion: false
  },
  
  // Business Rules
  business: {
    // Pricing
    basePrices: {
      standard: 35.00,
      intensive: 40.00,
      testPrep: 40.00,
      passPlus: 45.00
    },
    
    // Discounts
    discounts: {
      bulkBooking: {
        5: 0.05,  // 5% off for 5+ lessons
        10: 0.10, // 10% off for 10+ lessons
        20: 0.15  // 15% off for 20+ lessons
      },
      firstTime: 0.10, // 10% off first lesson
      referral: 5.00    // £5 off for referrals
    },
    
    // Cancellation Policy
    cancellation: {
      free: 24,      // hours - free cancellation
      halfCharge: 2, // hours - 50% charge
      fullCharge: 0  // hours - full charge
    },
    
    // Age Requirements
    age: {
      minimum: 17,
      maximumWithoutParentalConsent: 18
    },
    
    // Service Areas
    defaultServiceRadius: 10, // miles
    maxServiceRadius: 25,     // miles
    
    // Booking Rules
    maxConsecutiveLessons: 3,
    minTimeBetweenLessons: 30, // minutes
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2
  },
  
  // Error Messages
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Please check your internet connection and try again.',
    authentication: 'Please log in to continue.',
    authorization: 'You don\'t have permission to perform this action.',
    validation: 'Please check the highlighted fields.',
    paymentFailed: 'Payment failed. Please try a different payment method.',
    bookingUnavailable: 'This time slot is no longer available.',
    postcodeInvalid: 'Please enter a valid UK postcode.',
    emailInvalid: 'Please enter a valid email address.',
    phoneInvalid: 'Please enter a valid phone number.',
    ageRestriction: 'You must be at least 17 years old to book lessons.'
  },
  
  // Success Messages
  success: {
    bookingConfirmed: 'Your lesson has been booked successfully!',
    paymentProcessed: 'Payment processed successfully.',
    profileUpdated: 'Your profile has been updated.',
    passwordChanged: 'Your password has been changed.',
    emailVerified: 'Your email has been verified.',
    lessonCancelled: 'Your lesson has been cancelled.',
    accountCreated: 'Your account has been created successfully!'
  },
  
  // Development/Debug Settings
  debug: {
    enabled: true, // Set to false in production
    logLevel: 'info', // 'error', 'warn', 'info', 'debug'
    mockData: false,
    skipAuth: false,
    skipPayments: false
  }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
  // Browser environment
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development environment
    CONFIG.debug.enabled = true;
    CONFIG.debug.logLevel = 'debug';
    CONFIG.payments.sandbox = true;
  } else if (hostname.includes('staging') || hostname.includes('dev')) {
    // Staging environment
    CONFIG.debug.enabled = true;
    CONFIG.debug.logLevel = 'info';
    CONFIG.payments.sandbox = true;
  } else {
    // Production environment
    CONFIG.debug.enabled = false;
    CONFIG.debug.logLevel = 'error';
    CONFIG.payments.sandbox = false;
  }
}

// Load environment variables (if available)
if (typeof process !== 'undefined' && process.env) {
  CONFIG.supabase.url = process.env.VITE_SUPABASE_URL || CONFIG.supabase.url;
  CONFIG.supabase.anonKey = process.env.VITE_SUPABASE_ANON_KEY || CONFIG.supabase.anonKey;
  CONFIG.payments.apiKey = process.env.VITE_PAYMENT_API_KEY || CONFIG.payments.apiKey;
}

// Validation function
function validateConfig() {
  const required = [
    'supabase.url',
    'supabase.anonKey'
  ];
  
  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, prop) => obj?.[prop], CONFIG);
    return !value || value.includes('your-') || value.includes('localhost');
  });
  
  if (missing.length > 0 && CONFIG.debug.enabled) {
    console.warn('Missing or placeholder configuration:', missing);
    console.warn('Please update your configuration with actual values.');
  }
  
  return missing.length === 0;
}

// Utility functions
const ConfigUtils = {
  // Get nested config value
  get(path, defaultValue = null) {
    return path.split('.').reduce((obj, prop) => obj?.[prop], CONFIG) ?? defaultValue;
  },
  
  // Check if feature is enabled
  isFeatureEnabled(feature) {
    return CONFIG.features[feature] === true;
  },
  
  // Get business rule
  getBusinessRule(rule) {
    return CONFIG.business[rule];
  },
  
  // Get error message
  getError(key) {
    return CONFIG.errors[key] || CONFIG.errors.generic;
  },
  
  // Get success message
  getSuccess(key) {
    return CONFIG.success[key];
  },
  
  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: CONFIG.ui.currency
    }).format(amount);
  },
  
  // Format date
  formatDate(date) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  },
  
  // Format time
  formatTime(time) {
    const is24h = CONFIG.ui.timeFormat === '24h';
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !is24h
    }).format(new Date(`2000-01-01T${time}`));
  },
  
  // Get base price for lesson type
  getBasePrice(lessonType) {
    return CONFIG.business.basePrices[lessonType] || CONFIG.business.basePrices.standard;
  },
  
  // Calculate discount
  calculateDiscount(type, value) {
    const discounts = CONFIG.business.discounts;
    
    switch (type) {
      case 'bulk':
        const bulkRates = discounts.bulkBooking;
        const applicableRate = Object.keys(bulkRates)
          .reverse()
          .find(threshold => value >= parseInt(threshold));
        return applicableRate ? bulkRates[applicableRate] : 0;
      
      case 'firstTime':
        return discounts.firstTime;
      
      case 'referral':
        return discounts.referral;
      
      default:
        return 0;
    }
  },
  
  // Check if time is within working hours
  isWorkingHours(time) {
    const start = CONFIG.app.workingHoursStart;
    const end = CONFIG.app.workingHoursEnd;
    return time >= start && time <= end;
  },
  
  // Get cancellation fee
  getCancellationFee(hoursInAdvance, lessonPrice) {
    const policy = CONFIG.business.cancellation;
    
    if (hoursInAdvance >= policy.free) {
      return 0;
    } else if (hoursInAdvance >= policy.halfCharge) {
      return lessonPrice * 0.5;
    } else {
      return lessonPrice;
    }
  }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = { CONFIG, ConfigUtils, validateConfig };
} else if (typeof window !== 'undefined') {
  // Browser environment
  window.CONFIG = CONFIG;
  window.ConfigUtils = ConfigUtils;
  window.validateConfig = validateConfig;
  
  // Validate configuration on load
  if (CONFIG.debug.enabled) {
    validateConfig();
  }
}

// Constants for common use
const LESSON_TYPES = {
  STANDARD: 'standard',
  INTENSIVE: 'intensive',
  TEST_PREP: 'testPrep',
  PASS_PLUS: 'passPlus'
};

const PAYMENT_METHODS = {
  OPEN_BANKING: 'open_banking',
  CARD: 'card'
};

const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

// Make constants available globally
if (typeof window !== 'undefined') {
  window.LESSON_TYPES = LESSON_TYPES;
  window.PAYMENT_METHODS = PAYMENT_METHODS;
  window.BOOKING_STATUS = BOOKING_STATUS;
  window.PAYMENT_STATUS = PAYMENT_STATUS;
}