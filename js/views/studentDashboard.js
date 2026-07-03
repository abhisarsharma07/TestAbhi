/* -------------------------------------------------------------
   TestAbhi - Student Dashboard View
------------------------------------------------------------- */

import { getTests, fetchLeaderboard } from '../db.js';
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

    // Helper: schedule window status for a test
    function getScheduleStatus(test) {
        const now = new Date();
        if (test.windowStart && new Date(test.windowStart) > now) {
            return { type: 'upcoming', label: `Starts ${new Date(test.windowStart).toLocaleString()}` };
        }
        if (test.windowEnd && new Date(test.windowEnd) < now) {
            return { type: 'expired', label: 'Expired' };
        }
        if (test.windowEnd) {
            return { type: 'active', label: `Closes ${new Date(test.windowEnd).toLocaleString()}` };
        }
        return { type: 'always', label: null };
    }

    container.innerHTML = `
        <!-- Welcome Banner -->
        <div class="welcome-banner">
            <h1>Hello, ${user.name}!</h1>
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
                        const sched = getScheduleStatus(test);
                        const canStart = sched.type === 'always' || sched.type === 'active';
                        const negLabel = test.negativeMarking && test.negativeMarking < 0
                            ? `<span style="color: hsl(0,80%,60%); font-size:0.75rem;"><i class="fas fa-minus-circle"></i> Negative Marking: ${test.negativeMarking}</span>`
                            : '';
                        const schedBadge = sched.type === 'upcoming'
                            ? `<div class="schedule-badge upcoming"><i class="fas fa-clock"></i> ${sched.label}</div>`
                            : sched.type === 'expired'
                            ? `<div class="schedule-badge expired"><i class="fas fa-ban"></i> ${sched.label}</div>`
                            : sched.label
                            ? `<div class="schedule-badge active"><i class="fas fa-hourglass-half"></i> ${sched.label}</div>`
                            : '';
                        return `
                            <div class="test-card">
                                <div class="test-card-header">
                                    <h4 style="font-size: 1.15rem; font-weight: 700;">${test.title}</h4>
                                    <span class="test-badge badge-${test.difficulty}">${test.difficulty}</span>
                                </div>
                                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; flex: 1;">
                                    ${test.description}
                                </p>
                                ${negLabel}
                                ${schedBadge}
                                <div class="test-meta">
                                    <span><i class="far fa-clock"></i> ${test.duration} mins</span>
                                    <span><i class="far fa-question-circle"></i> ${test.questions.length} Questions</span>
                                </div>
                                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                    <button class="btn btn-primary start-test-btn" data-id="${test.id}" style="flex: 1; justify-content: center;" ${!canStart ? 'disabled' : ''}>
                                        ${sched.type === 'expired' ? '<i class="fas fa-ban"></i> Expired' : sched.type === 'upcoming' ? '<i class="fas fa-clock"></i> Not Yet Open' : 'Start Assessment <i class="fas fa-play"></i>'}
                                    </button>
                                    <button class="btn btn-secondary leaderboard-btn" data-id="${test.id}" title="View Leaderboard" style="padding: 0.6rem 0.9rem;">
                                        <i class="fas fa-trophy"></i>
                                    </button>
                                </div>
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

    // Click handler for starting a test (shows instruction overlay first)
    container.querySelectorAll(".start-test-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            const testId = btn.getAttribute("data-id");
            const test = tests.find(t => t.id === testId);
            if (!test) return;
            showInstructionOverlay(test, () => onSelectTest(testId));
        });
    });

    // Leaderboard trophy button
    container.querySelectorAll(".leaderboard-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const testId = btn.getAttribute("data-id");
            const test = tests.find(t => t.id === testId);
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const entries = await fetchLeaderboard(testId);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trophy"></i>';
            showLeaderboardModal(test, entries);
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

// Pre-exam instruction overlay
function showInstructionOverlay(test, onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const globalNeg = parseFloat(test.negativeMarking || 0);
    const hasSectionNeg = test.sectionWiseTiming && test.sections && test.sections.some(s => {
        const sNeg = s.negativeMarking !== null && s.negativeMarking !== undefined ? parseFloat(s.negativeMarking) : globalNeg;
        return sNeg < 0;
    });
    const isNegativeMarkingActive = (globalNeg < 0) || hasSectionNeg;

    let negLabel = '';
    if (isNegativeMarkingActive) {
        if (test.sectionWiseTiming && test.sections) {
            negLabel = `<div class="instruction-row warn"><i class="fas fa-minus-circle"></i> <span>Negative marking is active (varies by section). See the table below. Unanswered questions score 0.</span></div>`;
        } else {
            negLabel = `<div class="instruction-row warn"><i class="fas fa-minus-circle"></i> <span>Negative marking active: <strong>${test.negativeMarking}</strong> per wrong answer. Unanswered questions score 0.</span></div>`;
        }
    } else {
        negLabel = `<div class="instruction-row ok"><i class="fas fa-check-circle"></i> <span>No negative marking for this test.</span></div>`;
    }

    let examDetailsHtml = '';
    if (test.sectionWiseTiming && test.sections) {
        examDetailsHtml = `
            <li><i class="far fa-clock"></i> Total Duration: <strong>${test.duration} minutes</strong></li>
            <li><i class="far fa-question-circle"></i> Questions: <strong>${test.questions.length}</strong></li>
            <li style="display: block; margin-top: 0.5rem;"><i class="fas fa-layer-group"></i> <strong>Sections Overview:</strong>
                <div style="margin-top: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; background-color: var(--bg-card);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
                        <thead>
                            <tr style="background-color: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                                <th style="padding: 0.6rem 0.8rem;">Section Name</th>
                                <th style="padding: 0.6rem 0.8rem; text-align: center;">Duration</th>
                                <th style="padding: 0.6rem 0.8rem; text-align: center;">Correct Answer</th>
                                <th style="padding: 0.6rem 0.8rem; text-align: right;">Negative Mark</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${test.sections.map(s => {
                                const sNeg = s.negativeMarking !== null && s.negativeMarking !== undefined ? parseFloat(s.negativeMarking) : globalNeg;
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-main);">
                                        <td style="padding: 0.6rem 0.8rem; font-weight: 600;">${s.name}</td>
                                        <td style="padding: 0.6rem 0.8rem; text-align: center; color: var(--text-secondary);">${s.duration} mins</td>
                                        <td style="padding: 0.6rem 0.8rem; text-align: center; color: hsl(142, 70%, 45%); font-weight: 500;">+1.00</td>
                                        <td style="padding: 0.6rem 0.8rem; text-align: right; color: ${sNeg < 0 ? 'hsl(355, 78%, 56%)' : 'var(--text-muted)'}; font-weight: 500;">
                                            ${sNeg < 0 ? sNeg.toFixed(2) : '0.00'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </li>
        `;
    } else {
        examDetailsHtml = `
            <li><i class="far fa-clock"></i> Duration: <strong>${test.duration} minutes</strong></li>
            <li><i class="far fa-question-circle"></i> Questions: <strong>${test.questions.length}</strong></li>
            <li><i class="fas fa-layer-group"></i> Sections: Single section</li>
        `;
    }

    overlay.innerHTML = `
        <div class="modal-content instruction-modal">
            <div class="instruction-header">
                <i class="fas fa-clipboard-list"></i>
                <h2>Before You Start</h2>
                <p>${test.title}</p>
            </div>

            <div class="instruction-body">
                <h3><i class="fas fa-info-circle"></i> Exam Details</h3>
                <ul class="instruction-details-list">
                    ${examDetailsHtml}
                </ul>

                <h3><i class="fas fa-shield-alt"></i> Marking Scheme</h3>
                <div class="instruction-rules">
                    <div class="instruction-row ok"><i class="fas fa-check-circle"></i> <span>+1 mark for each correct answer</span></div>
                    ${negLabel}
                </div>

                <h3><i class="fas fa-eye"></i> Proctoring Rules</h3>
                <div class="instruction-rules">
                    <div class="instruction-row warn"><i class="fas fa-expand"></i> <span>The exam will run in fullscreen. Exiting fullscreen is a security violation.</span></div>
                    <div class="instruction-row warn"><i class="fas fa-window-restore"></i> <span>Do not switch browser tabs or windows during the exam.</span></div>
                    <div class="instruction-row warn"><i class="fas fa-camera"></i> <span>Webcam access may be requested for identity verification.</span></div>
                    <div class="instruction-row warn"><i class="fas fa-ban"></i> <span>Any violations are recorded and reported to the faculty.</span></div>
                </div>

                <label class="instruction-agree-row" for="instruction-agree-chk">
                    <input type="checkbox" id="instruction-agree-chk">
                    <span>I have read and agree to follow all exam proctoring guidelines.</span>
                </label>
            </div>

            <div class="modal-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                <button class="btn btn-secondary" id="instr-cancel-btn" style="flex: 1; justify-content: center;">Cancel</button>
                <button class="btn btn-primary" id="instr-start-btn" style="flex: 1; justify-content: center;" disabled>
                    <i class="fas fa-play"></i> Begin Exam
                </button>
            </div>
        </div>
    `;

    const chk = overlay.querySelector("#instruction-agree-chk");
    const startBtn = overlay.querySelector("#instr-start-btn");
    chk.addEventListener("change", () => { startBtn.disabled = !chk.checked; });
    overlay.querySelector("#instr-cancel-btn").addEventListener("click", () => overlay.remove());
    startBtn.addEventListener("click", () => { overlay.remove(); onConfirm(); });

    document.body.appendChild(overlay);
}

// Leaderboard modal
function showLeaderboardModal(test, entries) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";

    const medalColors = ['hsl(43,96%,56%)', 'hsl(220,14%,75%)', 'hsl(28,65%,52%)'];
    const rankIcons = ['🥇', '🥈', '🥉'];

    const rows = entries.length === 0
        ? `<p style="text-align:center; color: var(--text-muted); padding: 2rem 0;">No attempts yet for this test.</p>`
        : entries.map((e, i) => {
            const medal = i < 3 ? `<span style="font-size:1.4rem;">${rankIcons[i]}</span>` : `<span class="rank-number">#${i + 1}</span>`;
            const timeStr = e.timeSpent ? formatTime(e.timeSpent) : 'N/A';
            const scoreClass = e.score >= 70 ? 'status-correct' : e.score >= 40 ? 'text-warning' : 'status-incorrect';
            return `
                <div class="leaderboard-row ${i < 3 ? 'top-rank' : ''}" style="${i < 3 ? `border-left: 3px solid ${medalColors[i]};` : ''}">
                    <div class="leaderboard-rank">${medal}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${e.name}</div>
                        <div class="leaderboard-meta">@${e.username} &middot; Time: ${timeStr}</div>
                    </div>
                    <div class="leaderboard-score ${scoreClass}">${e.score}%</div>
                </div>
            `;
        }).join('');

    overlay.innerHTML = `
        <div class="modal-content leaderboard-modal">
            <div class="leaderboard-header">
                <span style="font-size:2rem;">🏆</span>
                <div>
                    <h2>Leaderboard</h2>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${test.title}</p>
                </div>
            </div>
            <div class="leaderboard-list">
                ${rows}
            </div>
            <div style="text-align: center; margin-top: 1rem;">
                <button class="btn btn-secondary" id="lb-close-btn" style="padding: 0.6rem 2rem;">Close</button>
            </div>
        </div>
    `;

    overlay.querySelector("#lb-close-btn").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}
