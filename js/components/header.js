/* -------------------------------------------------------------
   TestAbhi - Header Component
------------------------------------------------------------- */

import { navigate } from '../app.js';

export function renderHeader(user, onLogout, toggleTheme) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const header = document.createElement("header");
    header.className = "app-header";

    header.innerHTML = `
        <div class="brand" id="nav-brand">
            <i class="fas fa-graduation-cap"></i>
            <span>TestAbhi</span>
        </div>
        <div class="nav-right">
            ${user ? `
                <div class="user-info-badge" id="nav-profile-badge" style="cursor: pointer;" title="View Profile">
                    <i class="fas ${user.role === 'admin' ? 'fa-user-shield' : (user.role === 'faculty' ? 'fa-user-tie' : 'fa-user-graduate')}"></i>
                    <span>${user.name} (${user.role})</span>
                </div>
            ` : ''}
            
            <button class="theme-toggle" id="theme-toggle" title="Toggle Theme">
                <i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i>
            </button>

            ${user ? `
                <button class="logout-btn" id="logout-btn" title="Logout">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            ` : ''}
        </div>
    `;

    // Handlers
    const navBrand = header.querySelector("#nav-brand");
    navBrand.addEventListener("click", () => {
        if (!user) {
            navigate('auth');
        } else if (user.role === 'admin') {
            navigate('admin');
        } else {
            navigate('student');
        }
    });

    const themeBtn = header.querySelector("#theme-toggle");
    themeBtn.addEventListener("click", () => {
        toggleTheme();
        const currentIsDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const icon = themeBtn.querySelector("i");
        icon.className = `fas ${currentIsDark ? 'fa-sun' : 'fa-moon'}`;
    });

    if (user) {
        const profileBadge = header.querySelector("#nav-profile-badge");
        if (profileBadge) {
            profileBadge.addEventListener("click", () => {
                navigate('profile');
            });
        }

        const logoutBtn = header.querySelector("#logout-btn");
        logoutBtn.addEventListener("click", () => {
            onLogout();
        });
    }

    return header;
}
