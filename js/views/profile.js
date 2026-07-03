/* -------------------------------------------------------------
   TestAbhi - Profile View (Multi-role Profile & Edit Settings)
   ------------------------------------------------------------- */

import { updateUserProfile, getTests, getUsers } from '../db.js';
import { showToast } from '../utils.js';
import { navigate } from '../app.js';

export function renderProfileView(user) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    // Fetch up-to-date stats
    const users = getUsers();
    const tests = getTests();
    const currentUserData = users[user.username] || user;

    let roleDescription = "";
    let statsHtml = "";

    if (user.role === 'student') {
        roleDescription = "Student Portal Candidate";
        const taken = currentUserData.history || [];
        const avgScore = taken.length > 0 
            ? Math.round(taken.reduce((sum, item) => sum + item.score, 0) / taken.length) 
            : 0;

        statsHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; width: 100%; margin-top: 1rem;">
                <div class="stat-card">
                    <div class="stat-value" style="color: hsl(190, 90%, 50%);">${taken.length}</div>
                    <div class="stat-label">Exams Taken</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: hsl(142, 70%, 45%);">${avgScore}%</div>
                    <div class="stat-label">Average Score</div>
                </div>
            </div>
        `;
    } else if (user.role === 'faculty') {
        roleDescription = "Academic Faculty Member";
        statsHtml = `
            <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; width: 100%; margin-top: 1rem;">
                <div class="stat-card">
                    <div class="stat-value" style="color: hsl(263, 90%, 65%);">${tests.length}</div>
                    <div class="stat-label">Total Test Bank Collections</div>
                </div>
            </div>
        `;
    } else {
        roleDescription = "System Super Administrator";
        const totalUsers = Object.keys(users).length;
        statsHtml = `
            <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; width: 100%; margin-top: 1rem;">
                <div class="stat-card">
                    <div class="stat-value" style="color: hsl(355, 78%, 56%);">${totalUsers}</div>
                    <div class="stat-label">Total Registered Accounts</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="welcome-banner">
            <h1>User Profile</h1>
            <p>View your credentials, overview stats, and update settings.</p>
        </div>

        <div class="code-split-container" style="margin-top: 1rem;">
            <!-- Left Pane: Profile Overview -->
            <div class="code-instructions-pane" style="background-color: var(--bg-card); border: var(--glass-border); padding: 2rem; border-radius: var(--border-radius-md); display: flex; flex-direction: column; align-items: center; text-align: center;">
                <div style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-gradient); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 4px 15px var(--primary-glow);">
                    <i class="fas ${user.role === 'admin' ? 'fa-user-shield' : (user.role === 'faculty' ? 'fa-user-tie' : 'fa-user-graduate')}" style="font-size: 3rem; color: white;"></i>
                </div>
                
                <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${currentUserData.name}</h2>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">@${user.username}</p>
                
                <span class="test-badge" style="background-color: var(--primary-glow); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.8rem; padding: 0.35rem 0.75rem; border-radius: 50px; color: var(--text-primary); margin-top: 0.5rem; font-weight: 600;">
                    ${roleDescription}
                </span>

                <div style="border-top: 1px solid var(--border-color); width: 100%; margin-top: 1.5rem; padding-top: 1rem;">
                    <strong style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Performance Overview</strong>
                    ${statsHtml}
                </div>
            </div>

            <!-- Right Pane: Edit Credentials Form -->
            <div class="code-editor-pane" style="background-color: var(--bg-card); border: var(--glass-border); padding: 2.5rem; border-radius: var(--border-radius-md);">
                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary);"><i class="fas fa-cog"></i> Account Settings</h3>
                
                <form id="profile-settings-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div class="input-group">
                        <label for="profile-name">Display Name</label>
                        <input type="text" id="profile-name" class="input-control" value="${currentUserData.name}" required>
                    </div>

                    <div class="input-group">
                        <label for="profile-password">Update Password</label>
                        <input type="password" id="profile-password" class="input-control" placeholder="Leave empty to keep current password" autocomplete="new-password">
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" class="btn btn-secondary" id="profile-back-btn" style="flex: 1; justify-content: center;">
                            <i class="fas fa-arrow-left"></i> Dashboard
                        </button>
                        <button type="submit" class="btn btn-primary" style="flex: 1; justify-content: center;">
                            Save Changes <i class="fas fa-save"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const form = container.querySelector("#profile-settings-form");
    const nameInput = container.querySelector("#profile-name");
    const passwordInput = container.querySelector("#profile-password");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const updatedName = nameInput.value.trim();
        const updatedPassword = passwordInput.value;

        const res = updateUserProfile(user.username, updatedName, updatedPassword || null);
        if (res.success) {
            showToast(res.message, "success");
            // Update active session data name
            user.name = updatedName;
            sessionStorage.setItem("testabhi_session", JSON.stringify(user));
            
            // Redirect back to dashboard based on role
            setTimeout(() => {
                if (user.role === 'admin') {
                    navigate('admin');
                } else if (user.role === 'faculty') {
                    navigate('faculty');
                } else {
                    navigate('student');
                }
            }, 1000);
        } else {
            showToast(res.message, "error");
        }
    });

    container.querySelector("#profile-back-btn").addEventListener("click", () => {
        if (user.role === 'admin') {
            navigate('admin');
        } else if (user.role === 'faculty') {
            navigate('faculty');
        } else {
            navigate('student');
        }
    });

    return container;
}
