/* -------------------------------------------------------------
   TestAbhi - Core Router & Orchestrator
------------------------------------------------------------- */

import { initDB, getTests, saveTestAttempt } from './db.js';
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
function initApp() {
    initDB();
    
    // Restore Theme preference
    const savedTheme = localStorage.getItem("testabhi_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Restore login session
    const sessionUser = sessionStorage.getItem("testabhi_session");
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
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
                (attemptRecord) => {
                    // Save attempt to user's history
                    saveTestAttempt(currentUser.username, attemptRecord);
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

