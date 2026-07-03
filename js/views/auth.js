/* -------------------------------------------------------------
   TestAbhi - Authentication View (Login)
------------------------------------------------------------- */

import { authenticateUser } from '../db.js';
import { showToast } from '../utils.js';

export function renderAuthView(onLoginSuccess) {
    const container = document.createElement("div");
    container.className = "auth-wrapper fade-in";

    container.innerHTML = `
        <div class="auth-card">
            <h1 class="auth-logo"><i class="fas fa-graduation-cap"></i> TestAbhi</h1>
            <p class="auth-sub">Assessments made secure, smart, and beautiful.</p>
            
            <form class="auth-form" id="login-form">
                <div class="input-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" class="input-control" placeholder="e.g. student" required autocomplete="username">
                </div>
                
                <div class="input-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" class="input-control" placeholder="••••••••" required autocomplete="current-password">
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                    Sign In <i class="fas fa-arrow-right"></i>
                </button>
            </form>
            
            <div style="margin-top: 2rem; text-align: center; width: 100%;">
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">
                    Quick Demo Access
                </p>
                <div class="quick-roles">
                    <button id="quick-student-btn"><i class="fas fa-user-graduate"></i> Student Account</button>
                    <button id="quick-admin-btn"><i class="fas fa-user-shield"></i> Admin Account</button>
                </div>
            </div>
        </div>
    `;

    const form = container.querySelector("#login-form");
    const usernameInput = container.querySelector("#username");
    const passwordInput = container.querySelector("#password");

    const handleAuth = (user, pass) => {
        const authenticated = authenticateUser(user, pass);
        if (authenticated) {
            showToast(`Welcome back, ${authenticated.name}!`, "success");
            onLoginSuccess(authenticated);
        } else {
            showToast("Invalid credentials. Try student/student123 or admin/admin123", "error");
            container.querySelector(".auth-card").classList.add("shake");
            setTimeout(() => {
                container.querySelector(".auth-card").classList.remove("shake");
            }, 500);
        }
    };

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        handleAuth(usernameInput.value, passwordInput.value);
    });

    container.querySelector("#quick-student-btn").addEventListener("click", (e) => {
        e.preventDefault();
        usernameInput.value = "student";
        passwordInput.value = "student123";
        handleAuth("student", "student123");
    });

    container.querySelector("#quick-admin-btn").addEventListener("click", (e) => {
        e.preventDefault();
        usernameInput.value = "admin";
        passwordInput.value = "admin123";
        handleAuth("admin", "admin123");
    });

    return container;
}
