/* -------------------------------------------------------------
   TestAbhi - Enhanced User Profile View
   Features: Photo upload, Extended Details, Richer Stats
------------------------------------------------------------- */

import { updateUserProfile, getTests, fetchAllUsers } from '../db.js';
import { showToast } from '../utils.js';
import { navigate } from '../app.js';

export function renderProfileView(user) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    const tests = getTests();

    let roleDescription = "";
    let roleIcon = "fa-user";
    let statsHtml = "";

    // ---- Role-specific Stats ----
    if (user.role === 'student') {
        roleDescription = "Student Portal Candidate";
        roleIcon = "fa-user-graduate";

        const taken = user.history || [];
        const avgScore = taken.length > 0
            ? Math.round(taken.reduce((sum, h) => sum + h.score, 0) / taken.length)
            : 0;
        const bestScore  = taken.length > 0 ? Math.max(...taken.map(h => h.score)) : 0;
        const worstScore = taken.length > 0 ? Math.min(...taken.map(h => h.score)) : 0;

        statsHtml = `
            <div class="profile-stats-grid">
                <div class="profile-stat-chip" style="--chip-color: hsl(190, 90%, 50%);">
                    <span class="profile-stat-val">${taken.length}</span>
                    <span class="profile-stat-lbl">Exams Taken</span>
                </div>
                <div class="profile-stat-chip" style="--chip-color: hsl(142, 70%, 45%);">
                    <span class="profile-stat-val">${avgScore}%</span>
                    <span class="profile-stat-lbl">Avg Score</span>
                </div>
                <div class="profile-stat-chip" style="--chip-color: hsl(263, 90%, 65%);">
                    <span class="profile-stat-val">${bestScore}%</span>
                    <span class="profile-stat-lbl">Best Score</span>
                </div>
                <div class="profile-stat-chip" style="--chip-color: hsl(355, 78%, 56%);">
                    <span class="profile-stat-val">${worstScore > 0 ? worstScore + '%' : '—'}</span>
                    <span class="profile-stat-lbl">Lowest Score</span>
                </div>
            </div>
        `;

    } else if (user.role === 'faculty') {
        roleDescription = "Academic Faculty Member";
        roleIcon = "fa-user-tie";

        statsHtml = `
            <div class="profile-stats-grid">
                <div class="profile-stat-chip" style="--chip-color: hsl(263, 90%, 65%);">
                    <span class="profile-stat-val">${tests.length}</span>
                    <span class="profile-stat-lbl">Test Collections</span>
                </div>
            </div>
        `;

    } else {
        roleDescription = "System Super Administrator";
        roleIcon = "fa-user-shield";

        statsHtml = `
            <div id="admin-profile-stats" class="profile-stats-grid">
                <div class="profile-stat-chip" style="--chip-color: hsl(355, 78%, 56%);">
                    <span class="profile-stat-val"><i class="fas fa-spinner fa-spin"></i></span>
                    <span class="profile-stat-lbl">Total Accounts</span>
                </div>
            </div>
        `;
        setTimeout(async () => {
            try {
                const users = await fetchAllUsers();
                const statsBox = container.querySelector("#admin-profile-stats");
                if (statsBox) {
                    statsBox.innerHTML = `
                        <div class="profile-stat-chip" style="--chip-color: hsl(355, 78%, 56%);">
                            <span class="profile-stat-val">${Object.keys(users).length}</span>
                            <span class="profile-stat-lbl">Total Accounts</span>
                        </div>
                    `;
                }
            } catch { /* fail silently */ }
        }, 50);
    }

    // ---- Helper: info chip row (only renders if value exists) ----
    const infoChip = (icon, label, value) =>
        value ? `<div class="profile-info-chip">
                    <i class="fas ${icon} pic-icon"></i>
                    <div class="pic-text">
                        <span class="pic-label">${label}</span>
                        <span class="pic-value">${value}</span>
                    </div>
                 </div>` : '';

    // ---- Build detail chips from saved data ----
    const detailChips = [
        infoChip('fa-at',          'Username',       `@${user.username}`),
        infoChip('fa-quote-left',  'Bio',            user.bio),
        infoChip('fa-phone',       'Phone',          user.phone),
        infoChip('fa-university',  'College',        user.college),
        infoChip('fa-sitemap',     'Department',     user.department),
        user.role === 'student' ? infoChip('fa-layer-group', 'Year of Study', user.year) : '',
        user.role === 'faculty' ? infoChip('fa-book-open',   'Specialization', user.specialization) : '',
    ].join('');

    // ---- Avatar: real photo or icon fallback ----
    const avatarInner = user.profilePhoto
        ? `<img src="${user.profilePhoto}" alt="Profile Photo" class="profile-avatar-img">`
        : `<div class="profile-avatar-icon-wrap"><i class="fas ${roleIcon}"></i></div>`;

    // ---- Role-conditional extra form fields ----
    const studentFields = user.role === 'student' ? `
        <div class="input-group">
            <label for="profile-year"><i class="fas fa-layer-group"></i> Year of Study <span class="optional-tag">optional</span></label>
            <select id="profile-year" class="input-control">
                <option value="">Select Year</option>
                <option value="1st Year"  ${user.year === '1st Year'  ? 'selected' : ''}>1st Year</option>
                <option value="2nd Year"  ${user.year === '2nd Year'  ? 'selected' : ''}>2nd Year</option>
                <option value="3rd Year"  ${user.year === '3rd Year'  ? 'selected' : ''}>3rd Year</option>
                <option value="4th Year"  ${user.year === '4th Year'  ? 'selected' : ''}>4th Year</option>
                <option value="Graduate"  ${user.year === 'Graduate'  ? 'selected' : ''}>Graduate</option>
            </select>
        </div>` : '';

    const facultyFields = user.role === 'faculty' ? `
        <div class="input-group">
            <label for="profile-specialization"><i class="fas fa-book-open"></i> Specialization / Subject <span class="optional-tag">optional</span></label>
            <input type="text" id="profile-specialization" class="input-control"
                placeholder="e.g. Data Structures & Algorithms"
                value="${user.specialization || ''}">
        </div>` : '';

    // ---- Render HTML ----
    container.innerHTML = `
        <div class="welcome-banner">
            <h1><i class="fas fa-id-card"></i> My Profile</h1>
            <p>Manage your photo, personal info, and account settings.</p>
        </div>

        <div class="profile-grid">

            <!-- ===== LEFT: Overview Pane ===== -->
            <div class="profile-overview-pane">

                <!-- Avatar Upload -->
                <div class="profile-avatar-wrap" id="avatar-wrap" title="Click to upload a photo">
                    <div class="profile-avatar-ring">
                        ${avatarInner}
                    </div>
                    <div class="avatar-overlay">
                        <i class="fas fa-camera"></i>
                        <span>Change Photo</span>
                    </div>
                    <input type="file" id="avatar-file-input" accept="image/*" style="display:none;">
                </div>

                <!-- Identity -->
                <h2 class="profile-display-name">${user.name}</h2>
                <p class="profile-username">@${user.username}</p>
                <span class="profile-role-badge">
                    <i class="fas ${roleIcon}"></i> ${roleDescription}
                </span>

                <!-- Detail Chips -->
                <div class="profile-info-section">
                    ${detailChips || '<p class="profile-empty-hint"><i class="fas fa-pen"></i> Add your details in Settings →</p>'}
                </div>

                <!-- Stats -->
                <div class="profile-stats-section">
                    <div class="profile-stats-title">
                        <i class="fas fa-chart-bar"></i> Performance Overview
                    </div>
                    ${statsHtml}
                </div>
            </div>

            <!-- ===== RIGHT: Settings Form ===== -->
            <div class="profile-settings-pane">
                <h3 class="profile-settings-title">
                    <i class="fas fa-sliders-h"></i> Account Settings
                </h3>

                <form id="profile-settings-form">

                    <!-- Basic Info -->
                    <div class="profile-form-section">
                        <div class="profile-form-section-label">Basic Info</div>

                        <div class="input-group">
                            <label for="profile-name"><i class="fas fa-user"></i> Display Name</label>
                            <input type="text" id="profile-name" class="input-control" value="${user.name}" required>
                        </div>

                        <div class="input-group">
                            <label for="profile-bio">
                                <i class="fas fa-quote-left"></i> Bio
                                <span class="optional-tag">optional</span>
                            </label>
                            <textarea id="profile-bio" class="input-control profile-textarea" rows="3"
                                placeholder="Tell something about yourself...">${user.bio || ''}</textarea>
                        </div>
                    </div>

                    <!-- Contact & Education -->
                    <div class="profile-form-section">
                        <div class="profile-form-section-label">Contact &amp; Education</div>

                        <div class="input-group">
                            <label for="profile-phone">
                                <i class="fas fa-phone"></i> Phone
                                <span class="optional-tag">optional</span>
                            </label>
                            <input type="tel" id="profile-phone" class="input-control"
                                placeholder="e.g. +91 98765 43210" value="${user.phone || ''}">
                        </div>

                        <div class="input-group">
                            <label for="profile-college">
                                <i class="fas fa-university"></i> College / Institution
                                <span class="optional-tag">optional</span>
                            </label>
                            <input type="text" id="profile-college" class="input-control"
                                placeholder="e.g. JECRC College, Jaipur" value="${user.college || ''}">
                        </div>

                        <div class="input-group">
                            <label for="profile-department">
                                <i class="fas fa-sitemap"></i> Branch / Department
                                <span class="optional-tag">optional</span>
                            </label>
                            <input type="text" id="profile-department" class="input-control"
                                placeholder="e.g. Computer Science & Engineering" value="${user.department || ''}">
                        </div>

                        ${studentFields}
                        ${facultyFields}
                    </div>

                    <!-- Security -->
                    <div class="profile-form-section">
                        <div class="profile-form-section-label">Security</div>

                        <div class="input-group">
                            <label for="profile-password">
                                <i class="fas fa-lock"></i> Update Password
                                <span class="optional-tag">leave blank to keep current</span>
                            </label>
                            <input type="password" id="profile-password" class="input-control"
                                placeholder="••••••••" autocomplete="new-password">
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="profile-form-actions">
                        <button type="button" class="btn btn-secondary" id="profile-back-btn">
                            <i class="fas fa-arrow-left"></i> Dashboard
                        </button>
                        <button type="submit" class="btn btn-primary" id="profile-save-btn">
                            Save Changes <i class="fas fa-save"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // ---- Wire: Avatar Upload ----
    const avatarWrap      = container.querySelector("#avatar-wrap");
    const avatarFileInput = container.querySelector("#avatar-file-input");
    const avatarRing      = container.querySelector(".profile-avatar-ring");

    avatarWrap.addEventListener("click", () => avatarFileInput.click());

    avatarFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showToast("Photo must be under 2 MB. Please choose a smaller image.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            avatarRing.innerHTML = `<img src="${ev.target.result}" alt="Profile Photo" class="profile-avatar-img">`;
            user._pendingPhoto = ev.target.result;
            showToast("Photo ready — click Save Changes to apply. 📸", "info");
        };
        reader.readAsDataURL(file);
    });

    // ---- Wire: Save Form ----
    const form    = container.querySelector("#profile-settings-form");
    const saveBtn = container.querySelector("#profile-save-btn");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const newName     = container.querySelector("#profile-name").value.trim();
        const newPassword = container.querySelector("#profile-password").value;

        const extras = {
            bio:        container.querySelector("#profile-bio").value.trim(),
            phone:      container.querySelector("#profile-phone").value.trim(),
            college:    container.querySelector("#profile-college").value.trim(),
            department: container.querySelector("#profile-department").value.trim(),
        };

        if (user.role === 'student') {
            extras.year = container.querySelector("#profile-year")?.value || '';
        }
        if (user.role === 'faculty') {
            extras.specialization = container.querySelector("#profile-specialization")?.value.trim() || '';
        }
        if (user._pendingPhoto) {
            extras.profilePhoto = user._pendingPhoto;
        }

        const res = await updateUserProfile(user.username, newName, newPassword || null, extras);

        if (res.success) {
            Object.assign(user, { name: newName, ...extras });
            if (user._pendingPhoto) {
                user.profilePhoto = user._pendingPhoto;
                delete user._pendingPhoto;
            }
            sessionStorage.setItem("testabhi_session", JSON.stringify(user));
            showToast("Profile updated successfully! 🎉", "success");

            setTimeout(() => {
                if (user.role === 'admin')        navigate('super-admin');
                else if (user.role === 'faculty') navigate('faculty');
                else                              navigate('student');
            }, 1200);
        } else {
            showToast(res.message, "error");
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Changes <i class="fas fa-save"></i>';
        }
    });

    // ---- Wire: Back Button ----
    container.querySelector("#profile-back-btn").addEventListener("click", () => {
        if (user.role === 'admin')        navigate('admin');
        else if (user.role === 'faculty') navigate('faculty');
        else                              navigate('student');
    });

    return container;
}

