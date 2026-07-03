/* -------------------------------------------------------------
   TestAbhi - Student Dashboard View
------------------------------------------------------------- */

import { getTests } from '../db.js';
import { navigate } from '../app.js';
import { formatTime, formatDate } from '../utils.js';

export function renderStudentDashboard(user, onSelectTest, onViewAttempt) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    const history = user.history || [];


    // Calculate Stats
    const totalTests = history.length;
    let avgScore = 0;
    if (totalTests > 0) {
        const sum = history.reduce((acc, curr) => acc + (curr.score || 0), 0);
        avgScore = Math.round(sum / totalTests);
    }
    const activeStreak = totalTests > 0 ? 1 : 0; // Simple simulation

    // Generate Performance Trend SVG Chart
    let chartSvgHtml = '';
    if (history.length > 0) {
        const chronological = [...history].reverse();
        const width = 280;
        const height = 100;
        const padding = 15;
        const chartW = width - (padding * 2);
        const chartH = height - (padding * 2);
        
        // Calculate points
        const points = chronological.map((attempt, idx) => {
            const x = padding + (chronological.length > 1 ? (idx / (chronological.length - 1)) * chartW : chartW / 2);
            const y = padding + chartH - (attempt.score / 100) * chartH;
            return { x, y, score: attempt.score, title: attempt.testTitle };
        });

        // Build line path commands
        let pathD = '';
        let areaD = '';
        if (points.length > 0) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            areaD = `M ${points[0].x} ${padding + chartH} L ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                pathD += ` L ${points[i].x} ${points[i].y}`;
                areaD += ` L ${points[i].x} ${points[i].y}`;
            }
            areaD += ` L ${points[points.length - 1].x} ${padding + chartH} Z`;
        }

        chartSvgHtml = `
            <div class="svg-chart-container" title="Score progression trend (click dots to view attempts)">
                <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
                    <defs>
                        <!-- Glow Gradient -->
                        <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" class="chart-gradient-stop-1" />
                            <stop offset="100%" class="chart-gradient-stop-2" />
                        </linearGradient>
                        <linearGradient id="chart-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="hsl(239, 84%, 57%)" stop-opacity="0.25"/>
                            <stop offset="100%" stop-color="hsl(239, 84%, 57%)" stop-opacity="0.0"/>
                        </linearGradient>
                    </defs>
                    <!-- Y gridlines -->
                    <line class="chart-grid" x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}"></line>
                    <line class="chart-grid" x1="${padding}" y1="${padding + chartH / 2}" x2="${width - padding}" y2="${padding + chartH / 2}"></line>
                    <line class="chart-grid" x1="${padding}" y1="${padding + chartH}" x2="${width - padding}" y2="${padding + chartH}"></line>
                    
                    ${points.length > 1 ? `
                        <!-- Area Fill -->
                        <path class="chart-area" d="${areaD}"></path>
                        <!-- Line -->
                        <path class="chart-line" d="${pathD}"></path>
                    ` : ''}

                    <!-- Points -->
                    ${points.map(pt => `
                        <circle class="chart-point" cx="${pt.x}" cy="${pt.y}" r="4" title="${pt.title}: ${pt.score}%"></circle>
                    `).join('')}
                </svg>
            </div>
        `;
    } else {
        chartSvgHtml = `
            <div class="svg-chart-container" style="color: var(--text-muted); font-size: 0.75rem; text-align: center; border-style: dashed; padding: 1.5rem 0.5rem;">
                <p>Complete multiple tests to generate your performance chart.</p>
            </div>
        `;
    }

    const tests = getTests();

    // Render HTML structure
    container.innerHTML = `
        <!-- Welcome Banner -->
        <div class="welcome-banner">
            <h1>Hello, ${currentUser.name}!</h1>
            <p>Welcome to your exam console. Below are the tests available for you today. Ensure you are in a quiet workspace before clicking Start.</p>
            <div class="welcome-banner-shapes"></div>
        </div>

        <!-- Dashboard Grid Layout -->
        <div class="dashboard-grid">
            
            <!-- Main Column: Tests list -->
            <div class="main-column">
                <h3 class="section-title"><i class="fas fa-file-signature"></i> Available Assessments</h3>
                
                <div class="test-cards-grid">
                    ${tests.length === 0 ? `
                        <div class="test-card" style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">
                            <p>No tests are currently active. Check back later.</p>
                        </div>
                    ` : tests.map(test => {
                        return `
                            <div class="test-card">
                                <div class="test-card-header">
                                    <h4 style="font-size: 1.15rem; font-weight: 700;">${test.title}</h4>
                                    <span class="test-badge badge-${test.difficulty}">${test.difficulty}</span>
                                </div>
                                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; flex: 1;">
                                    ${test.description}
                                </p>
                                <div class="test-meta">
                                    <span><i class="far fa-clock"></i> ${test.duration} mins</span>
                                    <span><i class="far fa-question-circle"></i> ${test.questions.length} Questions</span>
                                </div>
                                <button class="btn btn-primary start-test-btn" data-id="${test.id}" style="width: 100%; justify-content: center; margin-top: 0.5rem;">
                                    Start Assessment <i class="fas fa-play"></i>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Sidebar Column: Stats & Past Attempts -->
            <div class="sidebar-column" style="display: flex; flex-direction: column; gap: 2rem;">
                
                <!-- Performance Summary -->
                <div class="sidebar-panel">
                    <h3 class="section-title" style="margin-bottom: 0.5rem;"><i class="fas fa-chart-line"></i> Performance</h3>
                    
                    <div class="stat-item">
                        <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                        <div class="stat-details">
                            <h4>${avgScore}%</h4>
                            <p>Average Score</p>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon secondary"><i class="fas fa-tasks"></i></div>
                        <div class="stat-details">
                            <h4>${totalTests}</h4>
                            <p>Exams Completed</p>
                        </div>
                    </div>

                    <!-- SVG Progression Trend Chart -->
                    <div style="margin-top: 0.5rem;">
                        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Score History Trend</span>
                        ${chartSvgHtml}
                    </div>

                    <div class="stat-item" style="background-color: transparent; border: none; padding: 0.5rem 0; margin-top: -0.5rem;">
                        <div class="stat-details">
                            <p style="font-size: 0.8rem; line-height: 1.5;">
                                <i class="fas fa-info-circle" style="color: hsl(239, 84%, 57%); margin-right: 0.25rem;"></i>
                                Tips: To maintain your proctoring score, do not switch tabs or resize windows while testing.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Past Attempts History -->
                <div class="sidebar-panel" style="flex: 1;">
                    <h3 class="section-title" style="margin-bottom: 0.5rem;"><i class="fas fa-history"></i> History</h3>
                    <div class="history-list" style="display: flex; flex-direction: column; gap: 1rem; max-height: 350px; overflow-y: auto; padding-right: 0.25rem;">
                        ${history.length === 0 ? `
                            <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 2rem 0;">
                                No assessment history yet. Complete your first test!
                            </p>
                        ` : history.map((attempt, index) => {
                            const dateStr = formatDate(attempt.date);
                            const scoreClass = attempt.score >= 70 ? 'status-correct' : (attempt.score >= 40 ? 'text-warning' : 'status-incorrect');
                            return `
                                <div class="history-item" data-index="${index}" style="padding: 1rem; background-color: var(--bg-input); border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); cursor: pointer; transition: all var(--transition-fast);">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                                        <h5 style="font-size: 0.9rem; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 160px;" title="${attempt.testTitle}">
                                            ${attempt.testTitle}
                                        </h5>
                                        <span class="${scoreClass}" style="font-weight: 700; font-size: 0.95rem;">
                                            ${attempt.score}%
                                        </span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary);">
                                        <span>${dateStr}</span>
                                        <span>Time: ${formatTime(attempt.timeSpent)}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>

        </div>
    `;

    // Click handler for starting a test
    container.querySelectorAll(".start-test-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const testId = btn.getAttribute("data-id");
            onSelectTest(testId);
        });
    });

    // Click handler for viewing past test attempt details
    container.querySelectorAll(".history-item").forEach(item => {
        item.addEventListener("click", () => {
            const index = parseInt(item.getAttribute("data-index"), 10);
            onViewAttempt(history[index]);
        });
        
        // Hover effects in JS as well for fluid hover response
        item.addEventListener("mouseenter", () => {
            item.style.borderColor = "hsl(239, 84%, 57%)";
            item.style.transform = "translateX(4px)";
        });
        item.addEventListener("mouseleave", () => {
            item.style.borderColor = "var(--border-color)";
            item.style.transform = "translateX(0)";
        });
    });

    return container;
}
