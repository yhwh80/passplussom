/* ===================================
   Pass Plus SOM - Payment Processing Module
   Handles payment integration and processing
   =================================== */

// Payment processing functionality
const Payments = {
  currentProvider: null,
  supportedMethods: ['open_banking', 'card', 'paypal'],
  testMode: true, // Set to false in production
  
  // Initialize payment module
  init() {
    Logger.info('Initializing payment module');
    
    // Set test mode based on config
    this.testMode = CONFIG?.payments?.testMode ?? true;
    
    // Initialize payment providers
    this.initializeProviders();
    
    // Setup payment method selection
    this.initializePaymentMethods();
  },
  
  // Initialize payment providers
  initializeProviders() {
    // In production, this would initialize real payment providers
    // For now, we'll set up mock providers
    
    if (this.testMode) {
      Logger.info('Payment module running in test mode');
    }
    
    // Initialize Open Banking provider
    this.initializeOpenBanking();
    
    // Initialize card payment provider
    this.initializeCardPayments();
    
    // Initialize PayPal provider
    this.initializePayPal();
  },
  
  // Initialize Open Banking
  initializeOpenBanking() {
    // In production, this would integrate with providers like:
    // - Yapily, TrueLayer, Plaid, or similar
    Logger.debug('Open Banking provider initialized (mock)');
  },
  
  // Initialize card payments
  initializeCardPayments() {
    // In production, this would integrate with:
    // - Stripe, Square, Adyen, or similar
    Logger.debug('Card payment provider initialized (mock)');
  },
  
  // Initialize PayPal
  initializePayPal() {
    // In production, this would load PayPal SDK
    Logger.debug('PayPal provider initialized (mock)');
  },
  
  // Initialize payment method selection UI
  initializePaymentMethods() {
    const paymentMethods = DOM.findAll('.payment-method-card');
    
    paymentMethods.forEach(method => {
      DOM.on(method, 'click', () => {
        this.selectPaymentMethod(method);
      });
    });
    
    // Initialize method-specific forms
    this.initializeOpenBankingForm();
    this.initializeCardForm();
    this.initializePayPalForm();
  },
  
  // Select payment method
  selectPaymentMethod(methodElement) {
    // Remove active state from all methods
    DOM.findAll('.payment-method-card').forEach(el => {
      DOM.removeClass(el, 'active');
    });
    
    // Add active state to selected method
    DOM.addClass(methodElement, 'active');
    
    // Get method type
    const methodType = methodElement.dataset.method;
    Logger.debug('Payment method selected:', methodType);
    
    // Show appropriate form
    this.showPaymentForm(methodType);
    
    // Update radio button
    const radio = methodElement.querySelector('input[type="radio"]');
    if (radio) {
      radio.checked = true;
    }
  },
  
  // Show payment form for selected method
  showPaymentForm(methodType) {
    // Hide all payment forms
    DOM.findAll('.payment-form').forEach(form => {
      DOM.hide(form);
    });
    
    // Show selected form
    const targetForm = DOM.$(`${methodType}-form`);
    if (targetForm) {
      DOM.show(targetForm);
    }
    
    // Method-specific initialization
    switch (methodType) {
      case 'open_banking':
        this.initializeBankSelection();
        break;
      case 'card':
        this.initializeCardInputs();
        break;
      case 'paypal':
        this.initializePayPalButton();
        break;
    }
  },
  
  // Initialize Open Banking form
  initializeOpenBankingForm() {
    const bankSelect = DOM.$('bank-select');
    if (bankSelect) {
      DOM.on(bankSelect, 'change', () => {
        const selectedBank = bankSelect.value;
        Logger.debug('Bank selected:', selectedBank);
        
        // Show bank-specific information
        this.showBankInfo(selectedBank);
      });
    }
  },
  
  // Initialize bank selection
  initializeBankSelection() {
    const bankSelect = DOM.$('bank-select');
    if (!bankSelect) return;
    
    // Populate with UK banks (in production, this would come from API)
    const ukBanks = [
      { code: 'hsbc', name: 'HSBC', logo: 'assets/banks/hsbc.png' },
      { code: 'barclays', name: 'Barclays', logo: 'assets/banks/barclays.png' },
      { code: 'lloyds', name: 'Lloyds Bank', logo: 'assets/banks/lloyds.png' },
      { code: 'natwest', name: 'NatWest', logo: 'assets/banks/natwest.png' },
      { code: 'santander', name: 'Santander', logo: 'assets/banks/santander.png' },
      { code: 'halifax', name: 'Halifax', logo: 'assets/banks/halifax.png' },
      { code: 'tsb', name: 'TSB', logo: 'assets/banks/tsb.png' },
      { code: 'rbs', name: 'Royal Bank of Scotland', logo: 'assets/banks/rbs.png' },
      { code: 'nationwide', name: 'Nationwide', logo: 'assets/banks/nationwide.png' },
      { code: 'metro', name: 'Metro Bank', logo: 'assets/banks/metro.png' }
    ];
    
    // Clear existing options
    bankSelect.textContent = '';
    
    // Create default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select your bank...';
    bankSelect.appendChild(defaultOption);
    
    // Create bank options
    ukBanks.forEach(bank => {
      const option = document.createElement('option');
      option.value = bank.code;
      option.setAttribute('data-logo', bank.logo);
      option.textContent = bank.name;
      bankSelect.appendChild(option);
    });
  },
  
  // Show bank information
  showBankInfo(bankCode) {
    const bankInfo = DOM.$('bank-info');
    if (!bankInfo || !bankCode) return;
    
    const bankDetails = {
      hsbc: { name: 'HSBC', redirectTime: '30 seconds', security: 'SSL encrypted' },
      barclays: { name: 'Barclays', redirectTime: '25 seconds', security: 'PINsentry or app' },
      lloyds: { name: 'Lloyds Bank', redirectTime: '35 seconds', security: 'Mobile app' },
      natwest: { name: 'NatWest', redirectTime: '30 seconds', security: 'Secure PIN' },
      // Add more banks as needed
    };
    
    const details = bankDetails[bankCode] || { name: 'Your Bank', redirectTime: '30 seconds', security: 'Bank security' };
    
    // Clear existing content
    bankInfo.textContent = '';
    
    // Create main container
    const container = document.createElement('div');
    container.className = 'bank-info-content';
    
    // Create title
    const title = document.createElement('h4');
    title.textContent = `Paying with ${details.name}`;
    container.appendChild(title);
    
    // Create instruction list
    const ul = document.createElement('ul');
    const instructions = [
      `You'll be redirected to ${details.name} in a new window`,
      `Login using your usual ${details.security}`,
      'Authorize the payment and return here',
      `Typical redirect time: ~${details.redirectTime}`
    ];
    
    instructions.forEach(instruction => {
      const li = document.createElement('li');
      li.textContent = instruction;
      ul.appendChild(li);
    });
    container.appendChild(ul);
    
    // Create security badges
    const badges = document.createElement('div');
    badges.className = 'security-badges';
    
    const securityBadge = document.createElement('span');
    securityBadge.className = 'security-badge';
    securityBadge.textContent = '🔒 Bank-level security';
    badges.appendChild(securityBadge);
    
    const regulatedBadge = document.createElement('span');
    regulatedBadge.className = 'security-badge';
    regulatedBadge.textContent = '✅ FCA regulated';
    badges.appendChild(regulatedBadge);
    
    container.appendChild(badges);
    bankInfo.appendChild(container);
    
    DOM.show(bankInfo);
  },
  
  // Initialize card form
  initializeCardForm() {
    // Card number formatting
    const cardNumber = DOM.$('card-number');
    if (cardNumber) {
      DOM.on(cardNumber, 'input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value;
        
        // Detect card type
        this.detectCardType(value.replace(/\s/g, ''));
      });
    }
    
    // Expiry date formatting
    const expiryDate = DOM.$('expiry-date');
    if (expiryDate) {
      DOM.on(expiryDate, 'input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
          value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value;
      });
    }
    
    // CVV input restriction
    const cvv = DOM.$('cvv');
    if (cvv) {
      DOM.on(cvv, 'input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }
  },
  
  // Initialize card inputs
  initializeCardInputs() {
    // Focus first empty field
    const cardNumber = DOM.$('card-number');
    if (cardNumber && !cardNumber.value) {
      cardNumber.focus();
    }
  },
  
  // Detect card type from number
  detectCardType(cardNumber) {
    const cardTypes = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/
    };
    
    let detectedType = 'unknown';
    
    for (const [type, pattern] of Object.entries(cardTypes)) {
      if (pattern.test(cardNumber)) {
        detectedType = type;
        break;
      }
    }
    
    // Update card type indicator
    const cardTypeIndicator = DOM.$('card-type-indicator');
    if (cardTypeIndicator) {
      cardTypeIndicator.className = `card-type-indicator ${detectedType}`;
      cardTypeIndicator.textContent = detectedType.toUpperCase();
    }
    
    return detectedType;
  },
  
  // Initialize PayPal form
  initializePayPalForm() {
    // In production, this would load PayPal buttons
    Logger.debug('PayPal form initialized (mock)');
  },
  
  // Initialize PayPal button
  initializePayPalButton() {
    const paypalContainer = DOM.$('paypal-button-container');
    if (!paypalContainer) return;
    
    // Clear existing content
    paypalContainer.textContent = '';
    
    // Create PayPal button (mock implementation)
    const paypalButton = document.createElement('div');
    paypalButton.className = 'mock-paypal-button';
    paypalButton.addEventListener('click', () => Payments.processPayPalPayment());
    
    const img = document.createElement('img');
    img.src = 'assets/icons/paypal-logo.svg';
    img.alt = 'PayPal';
    paypalButton.appendChild(img);
    
    const span = document.createElement('span');
    span.textContent = 'Pay with PayPal';
    paypalButton.appendChild(span);
    
    paypalContainer.appendChild(paypalButton);
  },
  
  // Process payment based on selected method
  async processPayment(amount, currency = 'GBP', metadata = {}) {
    const selectedMethod = DOM.find('.payment-method-card.active')?.dataset.method;
    
    if (!selectedMethod) {
      throw new Error('No payment method selected');
    }
    
    Logger.info('Processing payment:', { amount, currency, method: selectedMethod });
    
    switch (selectedMethod) {
      case 'open_banking':
        return await this.processOpenBankingPayment(amount, currency, metadata);
      case 'card':
        return await this.processCardPayment(amount, currency, metadata);
      case 'paypal':
        return await this.processPayPalPayment(amount, currency, metadata);
      default:
        throw new Error(`Unsupported payment method: ${selectedMethod}`);
    }
  },
  
  // Process Open Banking payment
  async processOpenBankingPayment(amount, currency, metadata) {
    const selectedBank = DOM.$('bank-select')?.value;
    
    if (!selectedBank) {
      throw new Error('Please select your bank');
    }
    
    if (this.testMode) {
      // Mock successful payment
      await Async.delay(2000);
      
      return {
        success: true,
        paymentId: 'ob_' + Date.now(),
        method: 'open_banking',
        bank: selectedBank,
        amount,
        currency,
        status: 'completed',
        reference: this.generatePaymentReference()
      };
    }
    
    // Production Open Banking flow would:
    // 1. Create payment intent with provider
    // 2. Redirect to bank authorization
    // 3. Handle callback with payment confirmation
    // 4. Return payment result
    
    throw new Error('Open Banking not implemented in production');
  },
  
  // Process card payment
  async processCardPayment(amount, currency, metadata) {
    const cardData = this.getCardFormData();
    
    if (!this.validateCardData(cardData)) {
      throw new Error('Please check your card details');
    }
    
    if (this.testMode) {
      // Mock payment processing
      await Async.delay(3000);
      
      // Simulate occasional failures for testing
      if (Math.random() < 0.1) {
        throw new Error('Payment declined by bank');
      }
      
      return {
        success: true,
        paymentId: 'card_' + Date.now(),
        method: 'card',
        last4: cardData.number.slice(-4),
        amount,
        currency,
        status: 'completed',
        reference: this.generatePaymentReference()
      };
    }
    
    // Production card payment would:
    // 1. Tokenize card details securely
    // 2. Create payment intent
    // 3. Handle 3D Secure if required
    // 4. Process payment
    // 5. Return result
    
    throw new Error('Card payments not implemented in production');
  },
  
  // Process PayPal payment
  async processPayPalPayment(amount, currency, metadata) {
    if (this.testMode) {
      // Mock PayPal payment flow
      await Async.delay(1500);
      
      return {
        success: true,
        paymentId: 'pp_' + Date.now(),
        method: 'paypal',
        amount,
        currency,
        status: 'completed',
        reference: this.generatePaymentReference()
      };
    }
    
    // Production PayPal would use PayPal SDK
    throw new Error('PayPal not implemented in production');
  },
  
  // Get card form data
  getCardFormData() {
    return {
      number: DOM.$('card-number')?.value.replace(/\s/g, '') || '',
      expiry: DOM.$('expiry-date')?.value || '',
      cvv: DOM.$('cvv')?.value || '',
      name: DOM.$('card-name')?.value || ''
    };
  },
  
  // Validate card data
  validateCardData(cardData) {
    // Basic validation
    if (!cardData.number || cardData.number.length < 13) {
      return false;
    }
    
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      return false;
    }
    
    if (!cardData.cvv || cardData.cvv.length < 3) {
      return false;
    }
    
    if (!cardData.name || cardData.name.trim().length < 2) {
      return false;
    }
    
    // Check expiry date is in future
    const [month, year] = cardData.expiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    if (expiryDate <= new Date()) {
      return false;
    }
    
    // Luhn algorithm check for card number
    return Validation.isValidCreditCard(cardData.number);
  },
  
  // Generate payment reference
  generatePaymentReference() {
    const prefix = 'PP';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },
  
  // Refund payment
  async refundPayment(paymentId, amount = null, reason = '') {
    Logger.info('Processing refund:', { paymentId, amount, reason });
    
    if (this.testMode) {
      // Mock refund processing
      await Async.delay(1000);
      
      return {
        success: true,
        refundId: 'rf_' + Date.now(),
        originalPaymentId: paymentId,
        amount: amount,
        status: 'completed',
        reason
      };
    }
    
    // Production refund processing
    throw new Error('Refunds not implemented in production');
  },
  
  // Get payment status
  async getPaymentStatus(paymentId) {
    Logger.debug('Checking payment status:', paymentId);
    
    if (this.testMode) {
      // Mock status check
      return {
        paymentId,
        status: 'completed',
        amount: 3500, // £35.00 in pence
        currency: 'GBP',
        createdAt: new Date().toISOString()
      };
    }
    
    // Production status check
    throw new Error('Payment status check not implemented in production');
  },
  
  // Calculate fees
  calculateFees(amount, method) {
    const feeRates = {
      open_banking: 0, // Usually free
      card: 0.029, // 2.9% + 30p
      paypal: 0.034 // 3.4% + 30p
    };
    
    const rate = feeRates[method] || 0;
    const percentageFee = amount * rate;
    const fixedFee = method === 'open_banking' ? 0 : 30; // 30p in pence
    
    return Math.round(percentageFee + fixedFee);
  },
  
  // Format amount for display
  formatAmount(amountInPence, currency = 'GBP') {
    return Format.currency(amountInPence / 100, currency);
  },
  
  // Validate payment amount
  validateAmount(amount) {
    // Minimum £1.00, maximum £500.00
    return amount >= 100 && amount <= 50000;
  },
  
  // Get supported payment methods
  getSupportedMethods() {
    return this.supportedMethods;
  },
  
  // Check if payment method is available
  isMethodAvailable(method) {
    return this.supportedMethods.includes(method);
  }
};

// Initialize payment module when DOM is ready
if (typeof window !== 'undefined') {
  window.Payments = Payments;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.includes('book-lesson')) {
        Payments.init();
      }
    });
  } else {
    if (window.location.pathname.includes('book-lesson')) {
      Payments.init();
    }
  }
}