// My Details page functionality
let currentUser = null;
let vehicles = [];
let qualifications = [];

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        await loadInstructorData();
        await loadVehicles();
        await loadQualifications();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to load page data');
    }
});

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

// Load instructor personal data
async function loadInstructorData() {
    try {
        const { data, error } = await supabase
            .from('instructors')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        if (data) {
            // Update instructor name in header
            document.getElementById('instructor-name').textContent = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown';
            
            // Populate form fields
            document.getElementById('first-name').value = data.first_name || '';
            document.getElementById('last-name').value = data.last_name || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('address-line1').value = data.address_line1 || '';
            document.getElementById('address-line2').value = data.address_line2 || '';
            document.getElementById('city').value = data.city || '';
            document.getElementById('postcode').value = data.postcode || '';
            document.getElementById('date-of-birth').value = data.date_of_birth || '';
            document.getElementById('emergency-contact-name').value = data.emergency_contact_name || '';
            document.getElementById('emergency-contact-phone').value = data.emergency_contact_phone || '';
        }
    } catch (error) {
        console.error('Error loading instructor data:', error);
        showError('Failed to load personal details');
    }
}

// Save personal details
document.getElementById('personal-details-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const updateData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address_line1: formData.get('address_line1'),
            address_line2: formData.get('address_line2'),
            city: formData.get('city'),
            postcode: formData.get('postcode'),
            date_of_birth: formData.get('date_of_birth') || null,
            emergency_contact_name: formData.get('emergency_contact_name'),
            emergency_contact_phone: formData.get('emergency_contact_phone')
        };
        
        const { error } = await supabase
            .from('instructors')
            .update(updateData)
            .eq('id', currentUser.id);
            
        if (error) throw error;
        
        showSuccess('Personal details saved successfully!');
        
        // Update header name
        document.getElementById('instructor-name').textContent = `${updateData.first_name} ${updateData.last_name}`.trim();
        
    } catch (error) {
        console.error('Error saving personal details:', error);
        showError('Failed to save personal details');
    }
});

// Load vehicles
async function loadVehicles() {
    try {
        const { data, error } = await supabase
            .from('instructor_vehicles')
            .select('*')
            .eq('instructor_id', currentUser.id)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        vehicles = data || [];
        renderVehicles();
        
    } catch (error) {
        console.error('Error loading vehicles:', error);
        showError('Failed to load vehicles');
    }
}

// Render vehicles list
function renderVehicles() {
    const container = document.getElementById('vehicles-list');
    container.innerHTML = '';
    
    vehicles.forEach((vehicle, index) => {
        const vehicleDiv = document.createElement('div');
        vehicleDiv.className = 'vehicle-item';
        vehicleDiv.innerHTML = `
            <button type="button" class="remove-btn" onclick="removeVehicle(${index})">&times;</button>
            <div class="form-grid">
                <div class="form-group">
                    <label>Make & Model</label>
                    <input type="text" value="${vehicle.make_model || ''}" onchange="updateVehicle(${index}, 'make_model', this.value)">
                </div>
                <div class="form-group">
                    <label>Registration</label>
                    <input type="text" value="${vehicle.registration || ''}" onchange="updateVehicle(${index}, 'registration', this.value)">
                </div>
                <div class="form-group">
                    <label>Fuel Type</label>
                    <select onchange="updateVehicle(${index}, 'fuel_type', this.value)">
                        <option value="Petrol" ${vehicle.fuel_type === 'Petrol' ? 'selected' : ''}>Petrol</option>
                        <option value="Diesel" ${vehicle.fuel_type === 'Diesel' ? 'selected' : ''}>Diesel</option>
                        <option value="Electric" ${vehicle.fuel_type === 'Electric' ? 'selected' : ''}>Electric</option>
                        <option value="Hybrid" ${vehicle.fuel_type === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
                        <option value="Manual" ${vehicle.fuel_type === 'Manual' ? 'selected' : ''}>Manual</option>
                        <option value="Automatic" ${vehicle.fuel_type === 'Automatic' ? 'selected' : ''}>Automatic</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Mileage</label>
                    <input type="number" value="${vehicle.mileage || ''}" onchange="updateVehicle(${index}, 'mileage', this.value)">
                </div>
            </div>
        `;
        container.appendChild(vehicleDiv);
    });
}

// Add new vehicle
function addVehicle() {
    vehicles.push({
        id: null,
        instructor_id: currentUser.id,
        make_model: '',
        registration: '',
        fuel_type: 'Petrol',
        mileage: null
    });
    renderVehicles();
}

// Update vehicle data
function updateVehicle(index, field, value) {
    if (vehicles[index]) {
        vehicles[index][field] = value;
    }
}

// Remove vehicle
function removeVehicle(index) {
    if (confirm('Are you sure you want to remove this vehicle?')) {
        vehicles.splice(index, 1);
        renderVehicles();
    }
}

// Save vehicles
async function saveVehicles() {
    try {
        // Delete existing vehicles
        await supabase
            .from('instructor_vehicles')
            .delete()
            .eq('instructor_id', currentUser.id);
            
        // Insert new vehicles
        if (vehicles.length > 0) {
            const vehiclesToInsert = vehicles.map(vehicle => ({
                instructor_id: currentUser.id,
                make_model: vehicle.make_model,
                registration: vehicle.registration,
                fuel_type: vehicle.fuel_type,
                mileage: vehicle.mileage ? parseInt(vehicle.mileage) : null
            }));
            
            const { error } = await supabase
                .from('instructor_vehicles')
                .insert(vehiclesToInsert);
                
            if (error) throw error;
        }
        
        showSuccess('Vehicles saved successfully!');
        await loadVehicles(); // Reload to get IDs
        
    } catch (error) {
        console.error('Error saving vehicles:', error);
        showError('Failed to save vehicles');
    }
}

// Load qualifications
async function loadQualifications() {
    try {
        const { data, error } = await supabase
            .from('instructor_qualifications')
            .select('*')
            .eq('instructor_id', currentUser.id)
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        qualifications = data || [];
        renderQualifications();
        
    } catch (error) {
        console.error('Error loading qualifications:', error);
        showError('Failed to load qualifications');
    }
}

// Render qualifications list
function renderQualifications() {
    const container = document.getElementById('qualifications-list');
    container.innerHTML = '';
    
    qualifications.forEach((qualification, index) => {
        const qualDiv = document.createElement('div');
        qualDiv.className = 'qualification-item';
        qualDiv.innerHTML = `
            <button type="button" class="remove-btn" onclick="removeQualification(${index})">&times;</button>
            <div class="form-grid">
                <div class="form-group">
                    <label>Type</label>
                    <select onchange="updateQualification(${index}, 'type', this.value)">
                        <option value="ADI Badge" ${qualification.type === 'ADI Badge' ? 'selected' : ''}>ADI Badge</option>
                        <option value="PDI" ${qualification.type === 'PDI' ? 'selected' : ''}>PDI</option>
                        <option value="Fleet" ${qualification.type === 'Fleet' ? 'selected' : ''}>Fleet</option>
                        <option value="B+E" ${qualification.type === 'B+E' ? 'selected' : ''}>B+E</option>
                        <option value="Other" ${qualification.type === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Details</label>
                    <input type="text" value="${qualification.details || ''}" onchange="updateQualification(${index}, 'details', this.value)">
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="date" value="${qualification.expiry_date || ''}" onchange="updateQualification(${index}, 'expiry_date', this.value)">
                </div>
            </div>
        `;
        container.appendChild(qualDiv);
    });
}

// Add new qualification
function addQualification() {
    qualifications.push({
        id: null,
        instructor_id: currentUser.id,
        type: 'ADI Badge',
        details: '',
        expiry_date: null
    });
    renderQualifications();
}

// Update qualification data
function updateQualification(index, field, value) {
    if (qualifications[index]) {
        qualifications[index][field] = value;
    }
}

// Remove qualification
function removeQualification(index) {
    if (confirm('Are you sure you want to remove this qualification?')) {
        qualifications.splice(index, 1);
        renderQualifications();
    }
}

// Save qualifications
async function saveQualifications() {
    try {
        // Delete existing qualifications
        await supabase
            .from('instructor_qualifications')
            .delete()
            .eq('instructor_id', currentUser.id);
            
        // Insert new qualifications
        if (qualifications.length > 0) {
            const qualsToInsert = qualifications.map(qual => ({
                instructor_id: currentUser.id,
                type: qual.type,
                details: qual.details,
                expiry_date: qual.expiry_date || null
            }));
            
            const { error } = await supabase
                .from('instructor_qualifications')
                .insert(qualsToInsert);
                
            if (error) throw error;
        }
        
        showSuccess('Qualifications saved successfully!');
        await loadQualifications(); // Reload to get IDs
        
    } catch (error) {
        console.error('Error saving qualifications:', error);
        showError('Failed to save qualifications');
    }
}

// Utility functions for showing messages
function showSuccess(message) {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #42d1a3;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

function showError(message) {
    // Create a simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}