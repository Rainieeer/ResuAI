// User Management Module
const UserManagementModule = {
    // Initialize user management functionality
    init() {
        this.setupEventListeners();
        this.loadUsers();
    },

    // Setup event listeners
    setupEventListeners() {
        // Create user button
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.createUser());
        }

        // Update user button
        const updateUserBtn = document.getElementById('updateUserBtn');
        if (updateUserBtn) {
            updateUserBtn.addEventListener('click', () => this.updateUser());
        }

        // Password toggle buttons
        const toggleNewPassword = document.getElementById('toggleNewUserPassword');
        if (toggleNewPassword) {
            toggleNewPassword.addEventListener('click', () => this.togglePassword('newUserPassword', 'toggleNewUserPassword'));
        }

        const toggleEditPassword = document.getElementById('toggleEditUserPassword');
        if (toggleEditPassword) {
            toggleEditPassword.addEventListener('click', () => this.togglePassword('editUserPassword', 'toggleEditUserPassword'));
        }
    },

    // Toggle password visibility
    togglePassword(passwordId, buttonId) {
        const passwordField = document.getElementById(passwordId);
        const toggleButton = document.getElementById(buttonId);
        const icon = toggleButton.querySelector('i');
        
        if (passwordField.type === 'password') {
            passwordField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    // Load users from API
    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            
            if (data.success) {
                this.renderUsers(data.users);
            } else {
                console.error('Failed to load users:', data.message);
                this.showError('Failed to load users: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Error loading users');
        }
    },

    // Render users in table
    renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No users found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.is_admin ? 'bg-danger' : 'bg-secondary'}">
                        ${user.is_admin ? 'Administrator' : 'User'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-warning'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="UserManagementModule.editUser(${user.id})" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.id !== 1 ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="UserManagementModule.deleteUser(${user.id})" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    },

    // Create new user
    async createUser() {
        const email = document.getElementById('newUserEmail').value;
        const password = document.getElementById('newUserPassword').value;
        const isAdmin = document.getElementById('newUserIsAdmin').checked;
        const isActive = document.getElementById('newUserIsActive').checked;

        if (!email || !password) {
            this.showError('Email and password are required');
            return;
        }

        const createBtn = document.getElementById('createUserBtn');
        const loader = createBtn.querySelector('.btn-loader');
        
        createBtn.disabled = true;
        loader.style.display = 'inline';

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    is_admin: isAdmin,
                    is_active: isActive
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('User created successfully');
                this.loadUsers(); // Refresh the user list
                
                // Close modal and reset form
                const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
                modal.hide();
                document.getElementById('createUserForm').reset();
                document.getElementById('newUserIsActive').checked = true; // Reset to default
            } else {
                this.showError('Failed to create user: ' + data.message);
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showError('Error creating user');
        } finally {
            createBtn.disabled = false;
            loader.style.display = 'none';
        }
    },

    // Edit user
    editUser(userId) {
        // Find user data from table
        const row = document.querySelector(`button[onclick*="${userId}"]`).closest('tr');
        const cells = row.querySelectorAll('td');
        
        // Populate edit form
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserEmail').value = cells[1].textContent;
        document.getElementById('editUserIsAdmin').checked = cells[2].textContent.includes('Administrator');
        document.getElementById('editUserIsActive').checked = cells[3].textContent.includes('Active');
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
    },

    // Update user
    async updateUser() {
        const userId = document.getElementById('editUserId').value;
        const email = document.getElementById('editUserEmail').value;
        const password = document.getElementById('editUserPassword').value;
        const isAdmin = document.getElementById('editUserIsAdmin').checked;
        const isActive = document.getElementById('editUserIsActive').checked;

        if (!email) {
            this.showError('Email is required');
            return;
        }

        const updateBtn = document.getElementById('updateUserBtn');
        const loader = updateBtn.querySelector('.btn-loader');
        
        updateBtn.disabled = true;
        loader.style.display = 'inline';

        const updateData = {
            email: email,
            is_admin: isAdmin,
            is_active: isActive
        };

        // Only include password if provided
        if (password) {
            updateData.password = password;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('User updated successfully');
                this.loadUsers(); // Refresh the user list
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
            } else {
                this.showError('Failed to update user: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Error updating user');
        } finally {
            updateBtn.disabled = false;
            loader.style.display = 'none';
        }
    },

    // Delete user
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('User deleted successfully');
                this.loadUsers(); // Refresh the user list
            } else {
                this.showError('Failed to delete user: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Error deleting user');
        }
    },

    // Show success message
    showSuccess(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else {
            alert(message);
        }
    },

    // Show error message
    showError(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else {
            alert(message);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the user management section
    if (document.getElementById('usersTable')) {
        UserManagementModule.init();
    }
});
