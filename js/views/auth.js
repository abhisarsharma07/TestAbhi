/* -------------------------------------------------------------
   TestAbhi - Authentication View (Login)
------------------------------------------------------------- */

import { authenticateUser, registerUser } from '../db.js';
import { showToast } from '../utils.js';

export function renderAuthView(onLoginSuccess) {
    const container = document.createElement("div");
    container.className = "auth-wrapper fade-in";

    let viewMode = 'login'; // 'login' or 'register'

    const renderContent = () => {
        if (viewMode === 'login') {
            container.innerHTML = `
                <div class="auth-card">
                    <h1 class="auth-logo"><img src="assets/logo.png" alt="TestAbhi Logo" class="auth-logo-img"> TestAbhi</h1>
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
                    
                    <div style="margin-top: 1.5rem; text-align: center; width: 100%;">
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">
                            Don't have an account? 
                            <a href="#" id="go-to-register" style="color: hsl(239, 84%, 67%); font-weight: 600; text-decoration: none; margin-left: 0.25rem;">Sign Up</a>
                        </p>
                    </div>
                </div>
            `;
            
            const form = container.querySelector("#login-form");
            const usernameInput = container.querySelector("#username");
            const passwordInput = container.querySelector("#password");
            
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector("[type='submit']");
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

                try {
                    const authenticated = await authenticateUser(usernameInput.value.trim(), passwordInput.value);
                    if (authenticated) {
                        showToast(`Welcome back, ${authenticated.name}!`, "success");
                        onLoginSuccess(authenticated);
                    } else {
                        showToast("Invalid username or password. Please try again.", "error");
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Sign In <i class="fas fa-arrow-right"></i>';
                        container.querySelector(".auth-card").classList.add("shake");
                        setTimeout(() => {
                            container.querySelector(".auth-card").classList.remove("shake");
                        }, 500);
                    }
                } catch (err) {
                    console.error("Login error:", err);
                    if (err.message === 'PENDING_APPROVAL') {
                        showToast("Your faculty account is pending admin approval. Please check back later.", "warning", 6000);
                    } else {
                        showToast(`Login error: ${err.message || "Please check your connection and try again."}`, "error");
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Sign In <i class="fas fa-arrow-right"></i>';
                }
            });

            
            container.querySelector("#go-to-register").addEventListener("click", (e) => {
                e.preventDefault();
                viewMode = 'register';
                renderContent();
            });
            
        } else {
            container.innerHTML = `
                <div class="auth-card">
                    <h1 class="auth-logo"><img src="assets/logo.png" alt="TestAbhi Logo" class="auth-logo-img"> TestAbhi</h1>
                    <p class="auth-sub">Create your account to get started.</p>
                    
                    <form class="auth-form" id="register-form">
                        <div class="input-group">
                            <label for="reg-name">Full Name</label>
                            <input type="text" id="reg-name" class="input-control" placeholder="e.g. Abhisar Sharma" required>
                        </div>
                        
                        <div class="input-group">
                            <label for="reg-username">Username</label>
                            <input type="text" id="reg-username" class="input-control" placeholder="Choose a unique username" required autocomplete="username">
                        </div>
                        
                        <div class="input-group">
                            <label for="reg-password">Password</label>
                            <input type="password" id="reg-password" class="input-control" placeholder="••••••••" required autocomplete="new-password">
                        </div>
                        
                        <div class="input-group">
                            <label for="reg-role">Role</label>
                            <select id="reg-role" class="input-control" style="cursor: pointer;" required>
                                <option value="student" selected>Student</option>
                                <option value="faculty">Faculty</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                            Register Account <i class="fas fa-user-plus"></i>
                        </button>
                    </form>
                    
                    <div style="margin-top: 1.5rem; text-align: center; width: 100%;">
                        <p style="font-size: 0.85rem; color: var(--text-secondary);">
                            Already have an account? 
                            <a href="#" id="go-to-login" style="color: hsl(239, 84%, 67%); font-weight: 600; text-decoration: none; margin-left: 0.25rem;">Sign In</a>
                        </p>
                    </div>
                </div>
            `;
            
            const form = container.querySelector("#register-form");
            const nameInput = container.querySelector("#reg-name");
            const usernameInput = container.querySelector("#reg-username");
            const passwordInput = container.querySelector("#reg-password");
            const roleSelect = container.querySelector("#reg-role");
            
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector("[type='submit']");
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

                try {
                    const res = await registerUser(
                        usernameInput.value.trim(),
                        passwordInput.value,
                        nameInput.value.trim(),
                        roleSelect.value
                    );
                    
                    if (res.success) {
                        showToast(res.message + ' Please sign in.', "success");
                        // Remember username so user doesn't have to retype it
                        const registeredUsername = usernameInput.value.trim().toLowerCase();
                        viewMode = 'login';
                        renderContent();
                        // Auto-fill the username on the login form
                        const loginUsernameInput = container.querySelector('#username');
                        if (loginUsernameInput) loginUsernameInput.value = registeredUsername;
                    } else {
                        showToast(res.message, "error");
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Register Account <i class="fas fa-user-plus"></i>';
                        container.querySelector(".auth-card").classList.add("shake");
                        setTimeout(() => {
                            container.querySelector(".auth-card").classList.remove("shake");
                        }, 500);
                    }
                } catch (err) {
                    console.error("Registration error:", err);
                    showToast(`Registration failed: ${err.message || "Please check your connection."}`, "error");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Register Account <i class="fas fa-user-plus"></i>';
                }
            });

            
            container.querySelector("#go-to-login").addEventListener("click", (e) => {
                e.preventDefault();
                viewMode = 'login';
                renderContent();
            });
        }
    };

    renderContent();
    return container;
}
