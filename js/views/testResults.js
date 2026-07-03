/* -------------------------------------------------------------
   TestAbhi - Test Results & Analytics Review View
------------------------------------------------------------- */

import { formatTime } from '../utils.js';

export function renderTestResults(attempt, onBackToDashboard) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    const { testTitle, score, totalQuestions, correctCount, wrongCount, unattemptedCount, totalMarks, timeSpent, reviewDetails } = attempt;
    // Fallbacks for older attempt records without new fields
    const wCount = wrongCount ?? (totalQuestions - (correctCount || 0) - (unattemptedCount || 0));
    const uCount = unattemptedCount ?? 0;
    const rawMarks = totalMarks ?? correctCount;

    // Get candidate name from session
    const sessionUser = JSON.parse(sessionStorage.getItem("testabhi_session"));
    const candidateName = sessionUser ? sessionUser.name : "Candidate";

    // SVG circular gauge metrics
    const radius = 40;
    const circumference = 2 * Math.PI * radius; // 251.2
    const dashoffset = circumference - (score / 100) * circumference;

    container.innerHTML = `
        <div class="results-card">
            <h1 style="font-size: 2rem; font-weight: 800;">Assessment Completed</h1>
            <p style="color: var(--text-secondary); margin-top: -1rem;">${testTitle}</p>
            
            <!-- Animated SVG Gauge Chart -->
            <div class="gauge-container">
                <svg class="gauge-svg" width="100%" height="100%" viewBox="0 0 100 100">
                    <!-- Gradient definitions for visual elegance -->
                    <defs>
                        <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="hsl(263, 90%, 51%)" />
                            <stop offset="100%" stop-color="hsl(186, 94%, 43%)" />
                        </linearGradient>
                    </defs>
                    <circle class="gauge-bg" cx="50" cy="50" r="${radius}"></circle>
                    <circle class="gauge-fill" cx="50" cy="50" r="${radius}" 
                            style="stroke-dashoffset: ${dashoffset}; stroke-dasharray: ${circumference};">
                    </circle>
                </svg>
                <div class="gauge-text">
                    <span class="gauge-percentage">${score}%</span>
                    <span class="gauge-label">${score >= 40 ? 'Passed' : 'Failed'}</span>
                </div>
            </div>

            <!-- Score breakdown text -->
            <div style="margin-top: -0.5rem;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: ${score >= 70 ? 'hsl(142, 70%, 45%)' : (score >= 40 ? 'hsl(38, 92%, 50%)' : 'hsl(355, 78%, 56%)');}">
                    ${score >= 80 ? 'Exceptional Performance!' : (score >= 40 ? 'Good Effort!' : 'Keep Learning!')}
                </h3>
            </div>

            <!-- Statistics cards row -->
            <div class="results-stats-row" style="grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                <div class="results-stat">
                    <h5 style="color: hsl(142,70%,45%);">${correctCount}</h5>
                    <p><i class="fas fa-check-circle" style="color:hsl(142,70%,45%);"></i> Correct</p>
                </div>
                <div class="results-stat">
                    <h5 style="color: hsl(355,78%,56%);">${wCount}</h5>
                    <p><i class="fas fa-times-circle" style="color:hsl(355,78%,56%);"></i> Wrong</p>
                </div>
                <div class="results-stat">
                    <h5 style="color: var(--text-muted);">${uCount}</h5>
                    <p><i class="far fa-circle" style="color:var(--text-muted);"></i> Skipped</p>
                </div>
                <div class="results-stat">
                    <h5>${rawMarks.toFixed ? rawMarks.toFixed(2) : rawMarks} / ${totalQuestions}</h5>
                    <p><i class="fas fa-star" style="color:hsl(43,96%,56%);"></i> Marks Earned</p>
                </div>
            </div>
            <div style="text-align:center; color: var(--text-secondary); font-size:0.85rem; margin-top:-0.5rem;">
                <i class="far fa-clock"></i> Time Spent: <strong>${formatTime(timeSpent)}</strong>
            </div>

            <!-- Dashboard Exit Control -->
            <div style="display: flex; gap: 1rem; justify-content: center; width: 100%; margin-top: 1rem; flex-wrap: wrap;">
                <button class="btn btn-primary" id="results-back-btn" style="padding: 0.85rem 2rem;">
                    <i class="fas fa-home"></i> Back to Dashboard
                </button>
                ${score >= 40 ? `
                    <button class="btn btn-success" id="print-cert-btn" style="padding: 0.85rem 2rem;">
                        <i class="fas fa-print"></i> Print Certificate
                    </button>
                ` : ''}
            </div>
        </div>

        <!-- Printable Certificate Template -->
        <div class="print-certificate">
            <h1>Certificate of Completion</h1>
            <p class="subtitle">This is proudly presented to</p>
            <div class="recipient">${candidateName}</div>
            <p class="achievement">
                for successfully completing the assessment <strong>"${testTitle}"</strong> with a final passing score of <strong>${score}%</strong> on ${attempt.date}.
            </p>
            <div class="footer-row">
                <div class="sig-block">
                    <span style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 700; color: #4f46e5;">TestAbhi Proctor System</span>
                    <span class="sig-line">Verified Digital Seal</span>
                </div>
                <div class="sig-block">
                    <span style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 700; color: #4f46e5;">Professor Abhi</span>
                    <span class="sig-line">Authorized Signatory</span>
                </div>
            </div>
        </div>

        <!-- Question Review Section -->
        ${reviewDetails && reviewDetails.length > 0 ? `
            <div class="review-section">
                <h3 class="review-title"><i class="fas fa-search"></i> Response Breakdown</h3>
                
                <div class="review-list">
                    ${reviewDetails.map((q, idx) => {
                        const statusClass = q.isCorrect ? 'correct' : 'incorrect';
                        const badgeIcon = q.isCorrect ? 'fa-check' : 'fa-times';
                        const badgeText = q.isCorrect ? 'Correct' : 'Incorrect';

                        let answerDetailHtml = '';

                        if (q.type === 'single') {
                            answerDetailHtml = `
                                <div class="review-details">
                                    ${q.options.map((opt, oIdx) => {
                                        const isSelected = q.studentAnswer === oIdx;
                                        const isCorrectOpt = q.correctAnswer === oIdx;
                                        let classStyle = '';
                                        let iconStyle = '';

                                        if (isSelected && isCorrectOpt) {
                                            classStyle = 'class="review-answer-line user-answer correct-match"';
                                            iconStyle = '<i class="fas fa-check-circle" style="color: hsl(142, 70%, 45%); margin-right: 0.5rem;"></i>';
                                        } else if (isSelected && !isCorrectOpt) {
                                            classStyle = 'class="review-answer-line user-answer"';
                                            iconStyle = '<i class="fas fa-times-circle" style="color: hsl(355, 78%, 56%); margin-right: 0.5rem;"></i>';
                                        } else if (isCorrectOpt) {
                                            classStyle = 'class="review-answer-line" style="background-color: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.2);"';
                                            iconStyle = '<i class="far fa-check-circle" style="color: hsl(142, 70%, 45%); margin-right: 0.5rem;"></i>';
                                        } else {
                                            classStyle = 'class="review-answer-line"';
                                            iconStyle = '<i class="far fa-circle" style="color: var(--text-muted); margin-right: 0.5rem;"></i>';
                                        }

                                        return `
                                            <div ${classStyle}>
                                                ${iconStyle}
                                                <span>${opt}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `;
                        } else if (q.type === 'multi') {
                            answerDetailHtml = `
                                <div class="review-details">
                                    ${q.options.map((opt, oIdx) => {
                                        const isSelected = q.studentAnswer.includes(oIdx);
                                        const isCorrectOpt = q.correctAnswers.includes(oIdx);
                                        let classStyle = '';
                                        let iconStyle = '';

                                        if (isSelected && isCorrectOpt) {
                                            classStyle = 'class="review-answer-line user-answer correct-match"';
                                            iconStyle = '<i class="fas fa-check-square" style="color: hsl(142, 70%, 45%); margin-right: 0.5rem;"></i>';
                                        } else if (isSelected && !isCorrectOpt) {
                                            classStyle = 'class="review-answer-line user-answer"';
                                            iconStyle = '<i class="fas fa-minus-square" style="color: hsl(355, 78%, 56%); margin-right: 0.5rem;"></i>';
                                        } else if (isCorrectOpt) {
                                            classStyle = 'class="review-answer-line" style="background-color: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.2);"';
                                            iconStyle = '<i class="far fa-check-square" style="color: hsl(142, 70%, 45%); margin-right: 0.5rem;"></i>';
                                        } else {
                                            classStyle = 'class="review-answer-line"';
                                            iconStyle = '<i class="far fa-square" style="color: var(--text-muted); margin-right: 0.5rem;"></i>';
                                        }

                                        return `
                                            <div ${classStyle}>
                                                ${iconStyle}
                                                <span>${opt}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `;
                        } else if (q.type === 'text') {
                            const isMatch = q.isCorrect;
                            answerDetailHtml = `
                                <div class="review-details">
                                    <div class="review-answer-line ${isMatch ? 'user-answer correct-match' : 'user-answer'}">
                                        <strong style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.15rem;">Your Submission:</strong>
                                        <span>${q.studentAnswer || '[Empty]'}</span>
                                    </div>
                                    ${!isMatch ? `
                                        <div class="review-answer-line" style="background-color: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.2); margin-top: 0.5rem;">
                                            <strong style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.15rem;">Expected Answer:</strong>
                                            <span>${q.correctAnswer}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        } else if (q.type === 'code') {
                            const isMatch = q.isCorrect;
                            answerDetailHtml = `
                                <div class="review-details">
                                    <div class="review-answer-line ${isMatch ? 'user-answer correct-match' : 'user-answer'}" style="font-family: monospace; white-space: pre-wrap; font-size: 0.85rem; background-color: #0b0f19; color: #72f1b8; padding: 1rem; border-radius: var(--border-radius-sm);">
                                        <strong style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem; font-family: var(--font-body);">Your Solution:</strong>
                                        <code>${q.studentAnswer || '// No solution submitted'}</code>
                                    </div>
                                </div>
                            `;
                        }

                        return `
                            <div class="review-item ${statusClass}">
                                <div class="review-header">
                                    <h4 style="font-size: 1.05rem; font-weight: 600; max-width: 80%;">${idx + 1}. ${q.questionText}</h4>
                                    <span class="review-status-badge status-${statusClass}">
                                        <i class="fas ${badgeIcon}"></i> ${badgeText}
                                    </span>
                                </div>
                                
                                ${answerDetailHtml}
                                
                                ${q.explanation ? `
                                    <div class="review-explanation">
                                        <strong>Explanation:</strong> ${q.explanation}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
    `;

    container.querySelector("#results-back-btn").addEventListener("click", () => {
        onBackToDashboard();
    });

    const printCertBtn = container.querySelector("#print-cert-btn");
    if (printCertBtn) {
        printCertBtn.addEventListener("click", () => {
            window.print();
        });
    }

    return container;
}
