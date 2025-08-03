import { supabaseService } from './supabase.js';
import { authManager } from './auth.js';

class PupilsManager {
    constructor() {
        this.pupils = [];
        this.currentInstructorId = null;
        this.init();
    }

    async init() {
        if (authManager.isAuthenticated()) {
            this.currentInstructorId = authManager.getCurrentUser().id;
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Add pupil button
        const addPupilBtn = document.getElementById('add-pupil-btn');
        if (addPupilBtn) {
            addPupilBtn.addEventListener('click', () => {
                document.getElementById('add-pupil-modal').style.display = 'block';
            });
        }

        // Add pupil form
        const addPupilForm = document.getElementById('add-pupil-form');
        if (addPupilForm) {
            addPupilForm.addEventListener('submit', this.handleAddPupil.bind(this));
        }

        // Close modal
        const closeBtn = document.querySelector('#add-pupil-modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('add-pupil-modal').style.display = 'none';
            });
        }
    }

    async loadPupils() {
        try {
            const result = await supabaseService.getPupils(this.currentInstructorId);
            if (result.success) {
                this.pupils = result.data;
                this.renderPupils();
            }
        } catch (error) {
            console.error('Error loading pupils:', error);
        }
    }

    renderPupils() {
        const container = document.getElementById('pupils-list');
        if (!container) return;

        if (this.pupils.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No pupils found</h3>
                    <p>Add your first pupil to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Lessons</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.pupils.map(pupil => `
                        <tr>
                            <td>${pupil.full_name}</td>
                            <td>${pupil.email}</td>
                            <td>${pupil.phone || 'N/A'}</td>
                            <td>${pupil.lessons_completed || 0}</td>
                            <td>
                                <span class="status-badge status-${pupil.status}">
                                    ${pupil.status}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-primary" onclick="pupilsManager.viewPupil('${pupil.id}')">
                                    View
                                </button>
                                <button class="btn btn-secondary" onclick="pupilsManager.editPupil('${pupil.id}')">
                                    Edit
                                </button>
                                <button class="btn btn-danger" onclick="pupilsManager.deletePupil('${pupil.id}')">
                                    Delete
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async handleAddPupil(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const pupilData = {
            instructor_id: this.currentInstructorId,
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            date_of_birth: formData.get('date_of_birth'),
            status: 'active'
        };

        // Validate email
        if (!this.validateEmail(pupilData.email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const result = await supabaseService.addPupil(pupilData);
            
            if (result.success) {
                // Initialize pupil skills
                await this.initializePupilSkills(result.data.id);
                
                // Close modal and reload
                document.getElementById('add-pupil-modal').style.display = 'none';
                e.target.reset();
                await this.loadPupils();
                
                alert('Pupil added successfully!');
            } else {
                alert('Error adding pupil: ' + result.error);
            }
        } catch (error) {
            alert('Error adding pupil: ' + error.message);
        }
    }

    async initializePupilSkills(pupilId) {
        try {
            // Get all skills
            const skillsResult = await supabaseService.getSkills();
            if (skillsResult.success) {
                // Create pupil_skills entries for each skill
                const pupilSkills = skillsResult.data.map(skill => ({
                    pupil_id: pupilId,
                    skill_id: skill.id,
                    status: 'not_started'
                }));

                // Insert all pupil skills
                for (const pupilSkill of pupilSkills) {
                    await supabaseService.updatePupilSkill(
                        pupilSkill.pupil_id,
                        pupilSkill.skill_id,
                        { status: 'not_started' }
                    );
                }
            }
        } catch (error) {
            console.error('Error initializing pupil skills:', error);
        }
    }

    async viewPupil(pupilId) {
        const pupil = this.pupils.find(p => p.id === pupilId);
        if (!pupil) return;

        // Create modal or redirect to pupil detail view
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>${pupil.full_name}</h2>
                <p>Email: ${pupil.email}</p>
                <p>Phone: ${pupil.phone || 'N/A'}</p>
                <p>Date of Birth: ${pupil.date_of_birth || 'N/A'}</p>
                <p>Lessons Completed: ${pupil.lessons_completed || 0}</p>
                <p>Total Hours: ${pupil.total_hours || 0}</p>
                <p>Status: ${pupil.status}</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    async editPupil(pupilId) {
        const pupil = this.pupils.find(p => p.id === pupilId);
        if (!pupil) return;

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Pupil</h2>
                <form id="edit-pupil-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value="${pupil.full_name}" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value="${pupil.email}" required>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="${pupil.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Date of Birth</label>
                        <input type="date" name="date_of_birth" value="${pupil.date_of_birth || ''}">
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="active" ${pupil.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${pupil.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            <option value="completed" ${pupil.status === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#edit-pupil-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditPupil(pupilId, e.target);
            document.body.removeChild(modal);
        });
    }

    async handleEditPupil(pupilId, form) {
        const formData = new FormData(form);
        const updates = {
            full_name: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            date_of_birth: formData.get('date_of_birth'),
            status: formData.get('status')
        };

        try {
            const result = await supabaseService.updatePupil(pupilId, updates);
            
            if (result.success) {
                await this.loadPupils();
                alert('Pupil updated successfully!');
            } else {
                alert('Error updating pupil: ' + result.error);
            }
        } catch (error) {
            alert('Error updating pupil: ' + error.message);
        }
    }

    async deletePupil(pupilId) {
        if (!confirm('Are you sure you want to delete this pupil? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await supabaseService.deletePupil(pupilId);
            
            if (result.success) {
                await this.loadPupils();
                alert('Pupil deleted successfully!');
            } else {
                alert('Error deleting pupil: ' + result.error);
            }
        } catch (error) {
            alert('Error deleting pupil: ' + error.message);
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getPupilById(id) {
        return this.pupils.find(p => p.id === id);
    }

    getPupilsCount() {
        return this.pupils.length;
    }

    getActivePupilsCount() {
        return this.pupils.filter(p => p.status === 'active').length;
    }
}

// Create and export singleton instance
const pupilsManager = new PupilsManager();
export { pupilsManager };