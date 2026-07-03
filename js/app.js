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
        console.error("Firebase connection error:", err);
        const rawMsg = err.message || "Failed to establish a connection with Firebase.";
        // Format multi-line error messages for HTML display
        const formattedMsg = rawMsg.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;');
        appEl.innerHTML = `
            <div style="
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                min-height: 100vh; gap: 1rem; text-align: center; padding: 2rem;
            ">
                <div style="
                    max-width: 640px; width: 100%;
                    background: var(--card-bg, #1a1a2e);
                    border: 1px solid hsl(355, 78%, 40%);
                    border-radius: 1rem;
                    padding: 2rem 2.5rem;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                ">
                    <i class="fas fa-database" style="font-size: 2.5rem; color: hsl(355, 78%, 56%); margin-bottom: 1rem; display: block;"></i>
                    <h2 style="color: var(--text-primary, #fff); font-family: var(--font-heading, 'Outfit', sans-serif); margin: 0 0 1rem 0; font-size: 1.4rem;">
                        Firebase Connection Failed
                    </h2>
                    <div style="
                        background: rgba(0,0,0,0.3);
                        border-radius: 0.5rem;
                        padding: 1rem 1.25rem;
                        margin-bottom: 1.5rem;
                        text-align: left;
                        font-size: 0.875rem;
                        color: var(--text-secondary, #aaa);
                        line-height: 1.8;
                        font-family: monospace;
                    ">
                        ${formattedMsg}
                    </div>
                    <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" style="
                            background: hsl(239, 84%, 67%);
                            color: white;
                            border: none;
                            padding: 0.75rem 1.75rem;
                            border-radius: 0.5rem;
                            cursor: pointer;
                            font-size: 0.95rem;
                            font-weight: 600;
                            display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-redo"></i> Retry Connection
                        </button>
                        <a href="https://console.firebase.google.com" target="_blank" style="
                            background: transparent;
                            color: hsl(239, 84%, 67%);
                            border: 1px solid hsl(239, 84%, 67%);
                            padding: 0.75rem 1.75rem;
                            border-radius: 0.5rem;
                            cursor: pointer;
                            font-size: 0.95rem;
                            font-weight: 600;
                            text-decoration: none;
                            display: flex; align-items: center; gap: 0.5rem;
                        ">
                            <i class="fas fa-external-link-alt"></i> Open Firebase Console
                        </a>
                    </div>
                </div>
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

