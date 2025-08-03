import { supabaseService } from './supabase.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check for existing session
        const user = await supabaseService.getCurrentUser();
        if (user) {
            this.currentUser = user;
            this.handleAuthenticated();
        } else {
            this.handleUnauthenticated();
        }
    }

    async signIn(email, password) {
        const result = await supabaseService.signIn(email, password);
        
        if (result.success) {
            this.currentUser = result.user;
            this.handleAuthenticated();
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    }

    async signOut() {
        const result = await supabaseService.signOut();
        
        if (result.success) {
            this.currentUser = null;
            this.handleUnauthenticated();
            return { success: true };
        } else {
            return { success: false, error: result.error };
        }
    }

    handleAuthenticated() {
        // Redirect to dashboard if on login page
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }
        
        // Update UI with user info
        this.updateUserInterface();
    }

    handleUnauthenticated() {
        // Redirect to login if not on login page
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    updateUserInterface() {
        const userNameElement = document.getElementById('instructor-name');
        if (userNameElement && this.currentUser) {
            userNameElement.textContent = `Welcome, ${this.currentUser.email}`;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Login form handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            
            if (!email || !password) {
                errorDiv.textContent = 'Please enter both email and password';
                errorDiv.style.display = 'block';
                return;
            }
            
            const result = await authManager.signIn(email, password);
            
            if (result.success) {
                errorDiv.style.display = 'none';
            } else {
                errorDiv.textContent = result.error || 'Login failed';
                errorDiv.style.display = 'block';
            }
        });
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await authManager.signOut();
        });
    }
});

export { authManager };