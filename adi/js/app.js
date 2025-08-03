import { authManager } from './auth.js';
import { supabaseService } from './supabase.js';
import { pupilsManager } from './pupils.js';
import { APP_CONFIG } from './config.js';

class AppManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.instructorId = null;
        this.init();
    }

    async init() {
        if (!authManager.isAuthenticated()) {
            return;
        }

        this.instructorId = authManager.getCurrentUser().id;
        this.setupNavigation();
        this.setupEventListeners();
        await this.loadDashboard();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.showSection(section);
                this.setActiveNavLink(link);
            });
        });
    }

    setupEventListeners() {
        // Settings form
        const settingsForm = document.getElementById('instructor-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', this.handleSettingsUpdate.bind(this));
        }

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                modal.style.display = 'none';
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            this.loadSectionData(sectionName);
        }
    }

    setActiveNavLink(activeLink) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'pupils':
                await pupilsManager.loadPupils();
                break;
            case 'lessons':
                await this.loadLessons();
                break;
            case 'skills':
                await this.loadSkills();
                break;
            case 'payments':
                await this.loadPayments();
                break;
            case 'settings':
                await this.loadSettings();
                break;
        }
    }

    async loadDashboard() {
        try {
            const result = await supabaseService.getDashboardStats(this.instructorId);
            if (result.success) {
                this.updateDashboardStats(result.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-pupils').textContent = stats.totalPupils;
        document.getElementById('active-lessons').textContent = stats.activeLessons;
        document.getElementById('pending-payments').textContent = stats.pendingPayments;
        document.getElementById('skills-completed').textContent = stats.completedSkills;
    }

    async loadLessons() {
        try {
            const result = await supabaseService.getLessons(this.instructorId);
            if (result.success) {
                this.renderLessons(result.data);
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
        }
    }

    renderLessons(lessons) {
        const container = document.getElementById('lessons-calendar');
        if (!container) return;

        container.innerHTML = `
            <div class="lessons-list">
                ${lessons.map(lesson => `
                    <div class="lesson-card">
                        <h4>${lesson.pupils.full_name}</h4>
                        <p>Date: ${new Date(lesson.lesson_date).toLocaleDateString()}</p>
                        <p>Time: ${lesson.start_time}</p>
                        <p>Duration: ${lesson.duration} minutes</p>
                        <p>Status: ${lesson.status}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadSkills() {
        try {
            const result = await supabaseService.getSkills();
            if (result.success) {
                this.renderSkills(result.data);
            }
        } catch (error) {
            console.error('Error loading skills:', error);
        }
    }

    renderSkills(skills) {
        const container = document.getElementById('skills-progress');
        if (!container) return;

        container.innerHTML = skills.map(skill => `
            <div class="skill-card">
                <h3>${skill.name}</h3>
                <p>${skill.description}</p>
                <div class="skill-progress">
                    <div class="skill-progress-bar" style="width: 0%"></div>
                </div>
            </div>
        `).join('');
    }

    async loadPayments() {
        try {
            const result = await supabaseService.getPayments(this.instructorId);
            if (result.success) {
                this.renderPayments(result.data);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
        }
    }

    renderPayments(payments) {
        const container = document.getElementById('payments-list');
        if (!container) return;

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Pupil</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                        <tr>
                            <td>${payment.pupils.full_name}</td>
                            <td>£${payment.amount}</td>
                            <td>${payment.payment_status}</td>
                            <td>${payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'N/A'}</td>
                            <td>
                                <button class="btn btn-primary" onclick="app.markPaid('${payment.id}')">Mark Paid</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadSettings() {
        try {
            const result = await supabaseService.getInstructor(this.instructorId);
            if (result.success && result.data) {
                this.populateSettingsForm(result.data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populateSettingsForm(instructor) {
        const form = document.getElementById('instructor-settings-form');
        if (!form) return;

        form.elements.full_name.value = instructor.full_name || '';
        form.elements.email.value = instructor.email || '';
        form.elements.phone.value = instructor.phone || '';
        form.elements.hourly_rate.value = instructor.hourly_rate || APP_CONFIG.DEFAULT_HOURLY_RATE;
    }

    async handleSettingsUpdate(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const updates = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            hourly_rate: parseFloat(formData.get('hourly_rate'))
        };

        try {
            const result = await supabaseService.updateInstructor(this.instructorId, updates);
            if (result.success) {
                alert('Settings updated successfully!');
            } else {
                alert('Error updating settings: ' + result.error);
            }
        } catch (error) {
            alert('Error updating settings: ' + error.message);
        }
    }

    async markPaid(paymentId) {
        try {
            const result = await supabaseService.updatePayment(paymentId, {
                payment_status: 'paid',
                payment_date: new Date().toISOString()
            });
            
            if (result.success) {
                this.loadPayments();
            }
        } catch (error) {
            console.error('Error marking payment as paid:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AppManager();
});

// Page navigation function
function showPage(pageId) {
    console.log('Switching to page:', pageId);
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.add('hidden');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        console.log('Page shown:', pageId);
    } else {
        console.error('Page not found:', pageId);
    }
    
    // Update navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to current button
    const activeButton = document.querySelector(`[onclick="showPage('${pageId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Pupil form functions
function showAddPupilForm() {
    const modal = document.getElementById('add-pupil-modal');
    if (modal) {
        modal.style.display = 'block';
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }
}

function hideAddPupilForm() {
    const modal = document.getElementById('add-pupil-modal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

// Lesson form functions
function showAddLessonForm() {
    console.log('Show lesson form - coming soon!');
    // TODO: Implement lesson form
}

// Initialize page on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing...');
    // Start with dashboard page
    const dashboardSection = document.getElementById('dashboard-section');
    if (dashboardSection) {
        dashboardSection.classList.add('active');
    }
});
export { AppManager };