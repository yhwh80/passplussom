// Utility functions for the Pass Plus S.O.M. application

// Date and Time Formatting
export function formatDate(date, format = 'short') {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    const options = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' }
    };
    
    return d.toLocaleDateString('en-GB', options[format] || options.short);
}

export function formatTime(time) {
    if (!time) return 'N/A';
    
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

export function formatCurrency(amount, currency = 'GBP') {
    if (amount === null || amount === undefined) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Validation Functions
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function validatePostcode(postcode) {
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode);
}

// Data Formatting
export function formatPupilData(pupil) {
    return {
        ...pupil,
        displayName: pupil.full_name,
        displayEmail: pupil.email,
        displayPhone: pupil.phone || 'N/A',
        displayDOB: formatDate(pupil.date_of_birth),
        displayStatus: pupil.status.charAt(0).toUpperCase() + pupil.status.slice(1),
        displayLessons: pupil.lessons_completed || 0,
        displayHours: pupil.total_hours || 0
    };
}

export function formatLessonData(lesson) {
    return {
        ...lesson,
        displayDate: formatDate(lesson.lesson_date),
        displayTime: formatTime(lesson.start_time),
        displayDuration: `${lesson.duration} minutes`,
        displayStatus: lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1),
        displayType: lesson.lesson_type.charAt(0).toUpperCase() + lesson.lesson_type.slice(1)
    };
}

// Local Storage Helpers
export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

export function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// UI Helpers
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '9999',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    });

    // Set background color based on type
    const colors = {
        info: '#3498db',
        success: '#2ecc71',
        warning: '#f39c12',
        error: '#e74c3c'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Form Helpers
export function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

export function clearForm(form) {
    form.reset();
    
    // Clear any custom validation messages
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.remove('error');
        const errorMsg = input.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    });
}

export function validateForm(form, rules) {
    const data = serializeForm(form);
    const errors = {};
    
    for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];
        
        if (rule.required && (!value || value.trim() === '')) {
            errors[field] = `${field.replace('_', ' ')} is required`;
            continue;
        }
        
        if (rule.email && !validateEmail(value)) {
            errors[field] = 'Please enter a valid email address';
        }
        
        if (rule.phone && !validatePhone(value)) {
            errors[field] = 'Please enter a valid phone number';
        }
        
        if (rule.minLength && value.length < rule.minLength) {
            errors[field] = `${field.replace('_', ' ')} must be at least ${rule.minLength} characters`;
        }
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        data
    };
}

// Date Calculations
export function calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

export function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    return endTotal - startTotal;
}

export function isOverdue(date) {
    if (!date) return false;
    return new Date(date) < new Date();
}

// Array Helpers
export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
        if (direction === 'asc') {
            return a[key] > b[key] ? 1 : -1;
        } else {
            return a[key] < b[key] ? 1 : -1;
        }
    });
}

export function filterBy(array, key, value) {
    return array.filter(item => item[key] === value);
}

// String Helpers
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str, length = 50, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Debounce function for performance
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export all utilities
export default {
    formatDate,
    formatTime,
    formatCurrency,
    validateEmail,
    validatePhone,
    validatePostcode,
    formatPupilData,
    formatLessonData,
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    showNotification,
    showModal,
    hideModal,
    serializeForm,
    clearForm,
    validateForm,
    calculateAge,
    calculateDuration,
    isOverdue,
    groupBy,
    sortBy,
    filterBy,
    capitalize,
    truncate,
    generateId,
    debounce,
    throttle
};