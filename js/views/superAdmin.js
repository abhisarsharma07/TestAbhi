/* -------------------------------------------------------------
   TestAbhi - Super Admin View (User & Role Management)
   ------------------------------------------------------------- */

import { getUsers, saveUsers } from '../db.js';
import { showToast } from '../utils.js';

export function renderSuperAdminDashboard(currentUser) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    const renderPanel = () => {
        const users = getUsers();
        const userList = Object.keys(users).map(username => ({
            username,
            ...users[username]
        }));

        const totalStudents = userList.filter(u => u.role === 'student').length;
        const totalFaculty = userList.filter(u => u.role === 'faculty').length;

        container.innerHTML = `
            <div class="welcome-banner">
                <h1>Super Admin Dashboard</h1>
                <p>Manage system users, adjust roles, and monitor portal platform access.</p>
            </div>

            <!-- Stats Bar -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem;">
                <div class="stat-card" style="border: var(--glass-border); background-color: var(--bg-card);">
                    <div class="stat-value" style="color: hsl(190, 90%, 50%);">${totalStudents}</div>
                    <div class="stat-label">Registered Students</div>
                </div>
                <div class="stat-card" style="border: var(--glass-border); background-color: var(--bg-card);">
                    <div class="stat-value" style="color: hsl(263, 90%, 65%);">${totalFaculty}</div>
                    <div class="stat-label">Registered Faculty Members</div>
                </div>
            </div>

            <!-- User Management Table Panel -->
            <div class="sidebar-panel" style="margin-top: 1.5rem; background-color: var(--bg-card); border: var(--glass-border); border-radius: var(--border-radius-md); padding: 2rem;">
                <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-users-cog" style="color: hsl(239, 84%, 67%);"></i> System User Directory
                </h2>

                <div class="table-container" style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; font-weight: 600;">
                                <th style="padding: 1rem 0.5rem;">Display Name</th>
                                <th style="padding: 1rem 0.5rem;">Username</th>
                                <th style="padding: 1rem 0.5rem;">Role</th>
                                <th style="padding: 1rem 0.5rem; text-align: right;">Action Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${userList.map(u => {
                                // Don't allow managing the active logged in admin
                                if (u.username === currentUser.username) {
                                    return `
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); opacity: 0.65;">
                                            <td style="padding: 1rem 0.5rem; font-weight: 600; color: var(--text-primary);">${u.name} (You)</td>
                                            <td style="padding: 1rem 0.5rem; color: var(--text-secondary);">@${u.username}</td>
                                            <td style="padding: 1rem 0.5rem;"><span class="test-badge" style="background-color: var(--primary-glow); border-color: rgba(99, 102, 241, 0.3); color: var(--text-primary); font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px;">${u.role.toUpperCase()}</span></td>
                                            <td style="padding: 1rem 0.5rem; text-align: right; color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Locked</td>
                                        </tr>
                                    `;
                                }
                                
                                const roleBadgeStyle = u.role === 'faculty' 
                                    ? 'background-color: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3); color: hsl(263, 90%, 65%);' 
                                    : 'background-color: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: hsl(142, 70%, 45%);';

                                return `
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                                        <td style="padding: 1rem 0.5rem; font-weight: 500; color: var(--text-primary);">${u.name}</td>
                                        <td style="padding: 1rem 0.5rem; color: var(--text-secondary);">@${u.username}</td>
                                        <td style="padding: 1rem 0.5rem;"><span class="test-badge" style="${roleBadgeStyle} font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 4px;">${u.role.toUpperCase()}</span></td>
                                        <td style="padding: 1rem 0.5rem; text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end;">
                                            <button class="btn btn-secondary toggle-role-btn" data-username="${u.username}" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; border-radius: 4px;">
                                                <i class="fas fa-random"></i> Change Role
                                            </button>
                                            <button class="btn btn-danger delete-user-btn" data-username="${u.username}" style="padding: 0.4rem 0.75rem; font-size: 0.75rem; border-radius: 4px; color: white;">
                                                <i class="fas fa-trash-alt"></i> Delete
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Bind Actions
        container.querySelectorAll(".toggle-role-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetUser = btn.dataset.username;
                const activeUsers = getUsers();
                if (activeUsers[targetUser]) {
                    const currentRole = activeUsers[targetUser].role;
                    activeUsers[targetUser].role = currentRole === 'student' ? 'faculty' : 'student';
                    saveUsers(activeUsers);
                    showToast(`Role updated for user @${targetUser}.`, "success");
                    renderPanel();
                }
            });
        });

        container.querySelectorAll(".delete-user-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetUser = btn.dataset.username;
                showDeleteConfirmationModal(targetUser, () => {
                    const activeUsers = getUsers();
                    delete activeUsers[targetUser];
                    saveUsers(activeUsers);
                    showToast(`User @${targetUser} deleted from directory.`, "success");
                    renderPanel();
                });
            });
        });
    };

    // Custom Glassmorphic Deletion Modal
    function showDeleteConfirmationModal(username, onConfirm) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-title" style="color: hsl(355, 78%, 56%);">
                    <i class="fas fa-exclamation-triangle"></i> Delete Account?
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; text-align: center; margin: 1rem 0;">
                    Are you sure you want to permanently delete user account <strong>@${username}</strong>?<br>
                    This action cannot be undone.
                </p>
                <div class="modal-actions" style="display: flex; gap: 0.75rem; width: 100%;">
                    <button class="btn btn-secondary" id="modal-delete-cancel" style="flex: 1; justify-content: center;">Cancel</button>
                    <button class="btn btn-danger" id="modal-delete-confirm" style="flex: 1; justify-content: center; color: white;">Yes, Delete</button>
                </div>
            </div>
        `;

        overlay.querySelector("#modal-delete-cancel").addEventListener("click", () => {
            overlay.remove();
        });

        overlay.querySelector("#modal-delete-confirm").addEventListener("click", () => {
            overlay.remove();
            onConfirm();
        });

        document.body.appendChild(overlay);
    }

    renderPanel();
    return container;
}
