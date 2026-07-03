import { initDB, getTests, saveTestAttempt, fetchCurrentUser } from './db.js';
import { renderHeader } from './components/header.js';
import { renderAuthView } from './views/auth.js';
import { renderStudentDashboard } from './views/studentDashboard.js';
import { renderTestInterface } from './views/testInterface.js';
import { renderTestResults } from './views/testResults.js';
import { renderAdminDashboard } from './views/adminDashboard.js';
import { renderProfileView } from './views/profile.js';
import { renderSuperAdminDashboard } from './views/superAdmin.js';
import { renderFacultyDashboard } from './views/facultyDashboard.js';
import { showToast } from './utils.js';

// Application state variables
let currentUser = null;
let currentPage = 'auth'; // 'auth', 'student', 'faculty', 'admin', 'super-admin', 'test-taking', 'results', 'profile'
let activeParams = null; // Arguments to pass to views

// Initial initialization
async function initApp() {
    // Show loading spinner while Firebase connects
    const appEl = document.getElementById("app");
    appEl.innerHTML = `
        <div style="
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100vh; gap: 1.25rem; color: var(--text-secondary);
        ">
            <div style="
                width: 52px; height: 52px; border-radius: 50%;
                border: 4px solid var(--border-color);
                border-top-color: hsl(239, 84%, 67%);
                animation: spin 0.8s linear infinite;
            "></div>
            <p style="font-size: 1rem; font-weight: 500;">Connecting to TestAbhi...</p>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    // Restore theme early so loading screen respects it
    const savedTheme = localStorage.getItem("testabhi_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    try {
        await initDB(); // Fetch all data from Firestore into cache
    } catch (err) {
        appEl.innerHTML = `
            <div style="
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 100vh; gap: 1rem; text-align: center; padding: 2rem;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: hsl(0, 85%, 60%);"></i>
                <h2 style="color: var(--text-primary);">Connection Failed</h2>
                <p style="color: var(--text-secondary);">Could not connect to the database. Please check your internet connection and try again.</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 0.5rem;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
        return;
    }

    // Restore login session
    const sessionUser = sessionStorage.getItem("testabhi_session");
    if (sessionUser) {
        const parsed = JSON.parse(sessionUser);
        try {
            const latestUser = await fetchCurrentUser(parsed.username);
            if (latestUser) {
                currentUser = latestUser;
                sessionStorage.setItem("testabhi_session", JSON.stringify(latestUser));
            } else {
                currentUser = parsed;
            }
        } catch (e) {
            currentUser = parsed;
        }
        currentPage = getDefaultPage(currentUser.role);
    }

    render();
}


function getDefaultPage(role) {
    if (role === 'admin') return 'super-admin';
    if (role === 'faculty') return 'faculty';
    return 'student';
}

// Router trigger function
export function navigate(page, params = null) {
    currentPage = page;
    activeParams = params;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Theme Switcher
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("testabhi_theme", nextTheme);
    showToast(`Switched to ${nextTheme} theme.`, "info");
}

// Render loop
function render() {
    const appEl = document.getElementById("app");
    if (!appEl) return;

    appEl.innerHTML = ''; // Reset UI

    // Create wrapper shell
    const shell = document.createElement("div");
    shell.className = "app-container";

    // 1. Add Header if not taking an active test (distraction-free focus)
    if (currentPage !== 'test-taking') {
        const header = renderHeader(currentUser, handleLogout, toggleTheme);
        shell.appendChild(header);
    }

    // 2. Add Content View
    let viewNode = null;

    switch (currentPage) {
        case 'auth':
            viewNode = renderAuthView(handleLoginSuccess);
            break;
            
        case 'student':
            if (!currentUser || currentUser.role !== 'student') {
                navigate('auth');
                return;
            }
            viewNode = renderStudentDashboard(
                currentUser,
                (testId) => {
                    const tests = getTests();
                    const targetTest = tests.find(t => t.id === testId);
                    if (targetTest) {
                        navigate('test-taking', targetTest);
                    } else {
                        showToast("Failed to find target assessment.", "error");
                    }
                },
                (attemptRecord) => {
                    navigate('results', attemptRecord);
                }
            );
            break;

        case 'faculty':
            if (!currentUser || currentUser.role !== 'faculty') {
                navigate('auth');
                return;
            }
            viewNode = renderFacultyDashboard(currentUser);
            break;
            
        case 'admin':
            if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'faculty')) {
                navigate('auth');
                return;
            }
            viewNode = renderAdminDashboard(currentUser);
            break;

        case 'super-admin':
            if (!currentUser || currentUser.role !== 'admin') {
                navigate('auth');
                return;
            }
            viewNode = renderSuperAdminDashboard(currentUser);
            break;

        case 'profile':
            if (!currentUser) {
                navigate('auth');
                return;
            }
            viewNode = renderProfileView(currentUser);
            break;
            
        case 'test-taking':
            if (!currentUser || currentUser.role !== 'student') {
                navigate('auth');
                return;
            }
            const test = activeParams;
            viewNode = renderTestInterface(
                currentUser,
                test,
                async (attemptRecord) => {
                    // Save attempt to user's history
                    await saveTestAttempt(currentUser.username, attemptRecord);
                    showToast("Test submitted successfully!", "success");
                    // Route to results screen
                    navigate('results', attemptRecord);
                }
            );

            break;
            
        case 'results':
            if (!currentUser) {
                navigate('auth');
                return;
            }
            const attempt = activeParams;
            viewNode = renderTestResults(
                attempt,
                () => {
                    navigate(getDefaultPage(currentUser.role));
                }
            );
            break;
            
        default:
            navigate('auth');
            return;
    }

    shell.appendChild(viewNode);
    appEl.appendChild(shell);
}

// State Action Handlers
function handleLoginSuccess(user) {
    currentUser = user;
    sessionStorage.setItem("testabhi_session", JSON.stringify(user));
    navigate(getDefaultPage(user.role));
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem("testabhi_session");
    showToast("Signed out successfully.", "info");
    navigate('auth');
}

// Start Application on Page Load
document.addEventListener("DOMContentLoaded", initApp);

