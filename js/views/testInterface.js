/* -------------------------------------------------------------
   TestAbhi - Active Test Interface & Proctoring Engine
------------------------------------------------------------- */

import { addProctorLog } from '../db.js';
import { formatTime, showToast } from '../utils.js';

export function renderTestInterface(user, test, onSubmitTest) {
    const container = document.createElement("div");
    container.className = "test-interface-wrapper fade-in";

    // State of active exam attempt
    let currentIdx = 0;
    const totalQuestions = test.questions.length;
    
    // Section-Wise Timing variables
    const isSectionWise = test.sectionWiseTiming || false;
    const sections = [];
    let currentSectionIdx = 0;
    
    if (isSectionWise) {
        if (Array.isArray(test.sections) && test.sections.length > 0) {
            // Initialize empty structures for all defined sections
            test.sections.forEach(s => {
                sections.push({
                    name: s.name,
                    duration: s.duration,
                    questions: []
                });
            });
            // Assign questions to matching sections
            test.questions.forEach(q => {
                const secName = q.sectionName || 'General';
                let sec = sections.find(s => s.name === secName);
                if (!sec) {
                    sec = sections[0]; // fallback
                }
                sec.questions.push(q);
            });
            // Clean empty sections
            for (let i = sections.length - 1; i >= 0; i--) {
                if (sections[i].questions.length === 0) {
                    sections.splice(i, 1);
                }
            }
        } else {
            // Fallback dynamic grouping
            test.questions.forEach(q => {
                const secName = q.sectionName || 'General';
                const secDur = parseInt(q.sectionDuration, 10) || 5;
                let sec = sections.find(s => s.name === secName);
                if (!sec) {
                    sec = { name: secName, duration: secDur, questions: [] };
                    sections.push(sec);
                }
                sec.questions.push(q);
            });
        }
        // Override initial question index to the first question of the first section
        if (sections.length > 0) {
            currentIdx = test.questions.indexOf(sections[0].questions[0]);
        }
    }

    // Answers tracker: maps question ID to student's answer
    // For single/text/code, it holds a value. For multi, it holds an array.
    const studentAnswers = {};
    test.questions.forEach(q => {
        if (q.type === 'multi') {
            studentAnswers[q.id] = [];
        } else if (q.type === 'code') {
            studentAnswers[q.id] = q.template || '';
        } else {
            studentAnswers[q.id] = '';
        }
    });

    // Flags/marked for review state tracker
    const flaggedQuestions = {};

    // Timer setup (duration in seconds)
    let timeRemaining = isSectionWise ? (sections[0].duration * 60) : (test.duration * 60);
    let timerInterval = null;

    // Proctoring tracker
    let focusOffenseCount = 0;
    const offenses = [];
    let webcamStream = null;
    let webcamContainer = null;

    // Main HTML Shell
    container.innerHTML = `
        <!-- Main Question / Work Area -->
        <div class="test-content-area">
            <div>
                <!-- Top Header Bar -->
                <div class="test-header-bar">
                    <div class="test-title-info">
                        <h2>${test.title}</h2>
                        <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.25rem;">
                            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0;">
                                Candidate: <strong style="color: var(--text-primary);">${user.name}</strong>
                            </p>
                            ${isSectionWise ? `<span id="section-badge" class="test-badge" style="background-color: var(--primary-glow); border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--text-primary);">Section: ${sections[0].name}</span>` : ''}
                        </div>
                    </div>
                    <div class="timer-box timer-normal" id="exam-timer">
                        <i class="far fa-clock"></i> <span id="timer-display">${formatTime(timeRemaining)}</span>
                    </div>
                </div>

                <!-- Active Question Container -->
                <div id="active-question-card"></div>
            </div>

            <!-- Bottom Navigation Bar -->
            <div class="question-actions-bar">
                <button class="btn btn-secondary" id="prev-question-btn">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                
                <button class="btn btn-secondary" id="flag-question-btn" style="color: hsl(38, 92%, 50%); border-color: rgba(245, 158, 11, 0.2);">
                    <i class="far fa-flag"></i> Mark for Review
                </button>
                
                <button class="btn btn-primary" id="next-question-btn">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>

        <!-- Right Proctoring & Navigation Sidebar -->
        <div class="test-sidebar">
            <!-- Exam Sections List (For clarity) -->
            ${isSectionWise ? `
                <div class="test-sidebar-section" style="margin-bottom: 1.25rem;">
                    <h3 style="margin-bottom: 0.5rem;"><i class="fas fa-folder-open"></i> Exam Sections</h3>
                    <div id="sidebar-sections-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
                </div>
            ` : ''}

            <!-- Questions Nav Grid -->
            <div class="test-sidebar-section">
                <h3>Question Status</h3>
                <div class="nav-grid" id="sidebar-question-grid"></div>
            </div>

            <!-- Legend Info -->
            <div class="test-sidebar-section">
                <h3>Legend</h3>
                <div class="legend-list">
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: var(--success-gradient);"></span>
                        <span>Answered</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: var(--warning-gradient);"></span>
                        <span>Marked for Review</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: var(--bg-input); border: 1px solid var(--border-color);"></span>
                        <span>Unvisited / Unanswered</span>
                    </div>
                </div>
            </div>

            <!-- Live Proctoring Status -->
            <div class="test-sidebar-section" style="margin-top: auto;">
                <div class="proctoring-status-panel">
                    <div class="proctoring-title">
                        <i class="fas fa-shield-alt"></i>
                        <span>AI PROCTOR ACTIVE</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
                        Do not exit tab, resize browser, or open developers console. System tracks focus changes.
                    </p>
                    <div class="proctoring-log" id="proctoring-log-box">
                        <p style="color: var(--text-muted); font-style: italic; font-size: 0.7rem;">System monitoring initialized...</p>
                    </div>
                </div>
            </div>

            <!-- Final Submission Trigger -->
            <button class="btn btn-danger" id="submit-exam-btn" style="width: 100%; justify-content: center;">
                Submit Assessment <i class="fas fa-check-double"></i>
            </button>
        </div>
    `;

    // References to DOM elements
    const timerDisplay = container.querySelector("#timer-display");
    const timerBox = container.querySelector("#exam-timer");
    const questionCard = container.querySelector("#active-question-card");
    const sidebarGrid = container.querySelector("#sidebar-question-grid");
    
    const prevBtn = container.querySelector("#prev-question-btn");
    const nextBtn = container.querySelector("#next-question-btn");
    const flagBtn = container.querySelector("#flag-question-btn");
    const submitBtn = container.querySelector("#submit-exam-btn");
    const proctorLogBox = container.querySelector("#proctoring-log-box");

    // -------------------------------------------------------------
    // View Rendering logic
    // -------------------------------------------------------------

    function renderQuestion() {
        const q = test.questions[currentIdx];
        
        // Update Previous / Next Buttons visibility and text
        if (isSectionWise) {
            const activeSec = sections[currentSectionIdx];
            const minIdx = test.questions.indexOf(activeSec.questions[0]);
            const maxIdx = test.questions.indexOf(activeSec.questions[activeSec.questions.length - 1]);
            
            prevBtn.style.visibility = currentIdx === minIdx ? 'hidden' : 'visible';
            
            if (currentIdx === maxIdx) {
                if (currentSectionIdx < sections.length - 1) {
                    nextBtn.innerHTML = `Submit Section <i class="fas fa-arrow-right"></i>`;
                    nextBtn.classList.replace('btn-primary', 'btn-success');
                } else {
                    nextBtn.innerHTML = `Finish <i class="fas fa-check"></i>`;
                    nextBtn.classList.replace('btn-primary', 'btn-success');
                }
            } else {
                nextBtn.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
                nextBtn.classList.replace('btn-success', 'btn-primary');
            }
        } else {
            prevBtn.style.visibility = currentIdx === 0 ? 'hidden' : 'visible';
            if (currentIdx === totalQuestions - 1) {
                nextBtn.innerHTML = `Finish <i class="fas fa-check"></i>`;
                nextBtn.classList.replace('btn-primary', 'btn-success');
            } else {
                nextBtn.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
                nextBtn.classList.replace('btn-success', 'btn-primary');
            }
        }

        // Update active flag state representation
        if (flaggedQuestions[currentIdx]) {
            flagBtn.innerHTML = `<i class="fas fa-flag"></i> Unmark Review`;
            flagBtn.style.background = 'rgba(245, 158, 11, 0.1)';
        } else {
            flagBtn.innerHTML = `<i class="far fa-flag"></i> Mark for Review`;
            flagBtn.style.background = 'transparent';
        }

        // Question markup depending on input types
        let inputHtml = '';
        if (q.type === 'single') {
            inputHtml = `
                <div class="options-container">
                    ${q.options.map((opt, i) => {
                        const isSelected = studentAnswers[q.id] === i;
                        return `
                            <div class="option-item ${isSelected ? 'selected' : ''}" data-index="${i}">
                                <div class="option-marker">${String.fromCharCode(65 + i)}</div>
                                <span style="font-size: 0.95rem;">${opt}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else if (q.type === 'multi') {
            inputHtml = `
                <div class="options-container">
                    ${q.options.map((opt, i) => {
                        const isSelected = studentAnswers[q.id].includes(i);
                        return `
                            <div class="option-item ${isSelected ? 'selected' : ''}" data-index="${i}">
                                <div class="option-marker" style="border-radius: 4px;">
                                    ${isSelected ? '<i class="fas fa-check" style="font-size: 0.75rem;"></i>' : String.fromCharCode(65 + i)}
                                </div>
                                <span style="font-size: 0.95rem;">${opt}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else if (q.type === 'text') {
            inputHtml = `
                <div style="margin-top: 1rem;">
                    <textarea class="input-control textarea-control" id="text-answer-field" placeholder="Type your answer here...">${studentAnswers[q.id] || ''}</textarea>
                </div>
            `;
        } else if (q.type === 'code') {
            inputHtml = `
                <div class="code-split-container">
                    <div class="code-instructions-pane">
                        <strong style="font-size: 0.9rem; text-transform: uppercase; color: hsl(239, 84%, 57%);">Task Instructions</strong>
                        <p style="margin: 0.25rem 0; font-size: 0.85rem; color: var(--text-secondary);">Implement the solution in JavaScript. Ensure you use the exact function signature provided in the editor.</p>
                        
                        <strong style="font-size: 0.85rem; margin-top: 0.5rem;">Assertion Test Cases:</strong>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                            ${q.assertions.map((as, aIdx) => `
                                <div class="code-assertion-item" id="assert-${q.id}-${aIdx}">
                                    <span>Assert ${aIdx + 1}: input <code>(${as.input.join(', ')})</code> expected <code>${as.expected}</code></span>
                                    <span class="code-assertion-status" style="color: var(--text-muted); font-size: 0.75rem;">Untested</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="code-editor-pane">
                        <textarea class="ide-textarea" id="ide-textarea-field" spellcheck="false" placeholder="// Write code here">${studentAnswers[q.id] || ''}</textarea>
                        
                        <div style="display: flex; gap: 1rem; align-items: center;">
                            <button class="btn btn-primary" id="run-code-btn" style="flex: 1; justify-content: center; padding: 0.85rem;">
                                <i class="fas fa-play"></i> Run Test Cases
                            </button>
                        </div>

                        <div class="console-output-wrapper">
                            <div class="console-title"><i class="fas fa-terminal"></i> Console Log Output</div>
                            <div id="console-logs-output" style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">
                                Code execution results will print here.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        questionCard.innerHTML = `
            <div class="question-block" style="${q.type === 'code' ? 'max-width: 100%;' : ''}">
                <div class="question-number">Question ${currentIdx + 1} of ${totalQuestions}</div>
                <div class="question-text">${q.text}</div>
                ${inputHtml}
            </div>
        `;

        // Event listeners for options selection
        if (q.type === 'single') {
            questionCard.querySelectorAll(".option-item").forEach(item => {
                item.addEventListener("click", () => {
                    const selIdx = parseInt(item.getAttribute("data-index"), 10);
                    studentAnswers[q.id] = selIdx;
                    renderQuestion();
                    renderSidebarGrid();
                });
            });
        } else if (q.type === 'multi') {
            questionCard.querySelectorAll(".option-item").forEach(item => {
                item.addEventListener("click", () => {
                    const selIdx = parseInt(item.getAttribute("data-index"), 10);
                    const currentSel = studentAnswers[q.id];
                    if (currentSel.includes(selIdx)) {
                        studentAnswers[q.id] = currentSel.filter(x => x !== selIdx);
                    } else {
                        studentAnswers[q.id].push(selIdx);
                    }
                    renderQuestion();
                    renderSidebarGrid();
                });
            });
        } else if (q.type === 'text') {
            const textarea = questionCard.querySelector("#text-answer-field");
            textarea.addEventListener("input", (e) => {
                studentAnswers[q.id] = e.target.value;
                renderSidebarGrid();
            });
        } else if (q.type === 'code') {
            const textarea = questionCard.querySelector("#ide-textarea-field");
            textarea.addEventListener("input", (e) => {
                studentAnswers[q.id] = e.target.value;
                renderSidebarGrid();
            });

            const runBtn = questionCard.querySelector("#run-code-btn");
            runBtn.addEventListener("click", (e) => {
                e.preventDefault();
                runUnitTests(q);
            });
        }
    }

    function runUnitTests(q) {
        const userCode = studentAnswers[q.id];
        const funcMatch = q.template.match(/function\s+([a-zA-Z0-9_]+)/);
        const funcName = funcMatch ? funcMatch[1] : '';
        const logsContainer = questionCard.querySelector("#console-logs-output");
        logsContainer.innerHTML = '';
        let allPassed = true;

        q.assertions.forEach((as, aIdx) => {
            const testResult = runAssertion(userCode, funcName, as.input, as.expected);
            const assertEl = questionCard.querySelector(`#assert-${q.id}-${aIdx}`);
            const statusEl = assertEl.querySelector(".code-assertion-status");
            
            if (testResult.passed) {
                statusEl.innerText = "Passed";
                statusEl.style.color = "hsl(142, 70%, 45%)";
                logsContainer.innerHTML += `<div class="console-log pass">[PASS] Assert ${aIdx + 1}: expected ${as.expected}, got ${testResult.result}</div>`;
            } else {
                allPassed = false;
                statusEl.innerText = "Failed";
                statusEl.style.color = "hsl(355, 78%, 56%)";
                logsContainer.innerHTML += `<div class="console-log fail">[FAIL] Assert ${aIdx + 1}: expected ${as.expected}, got ${testResult.result}</div>`;
            }
        });

        if (allPassed) {
            showToast("All test cases passed successfully!", "success");
        } else {
            showToast("Some test cases failed. Please inspect logs.", "error");
        }
    }

    function renderSidebarGrid() {
        sidebarGrid.innerHTML = '';
        const activeSec = isSectionWise ? sections[currentSectionIdx] : null;

        for (let i = 0; i < totalQuestions; i++) {
            const q = test.questions[i];
            
            // If section-wise timing is active, filter out questions not belonging to the active section
            if (isSectionWise && !activeSec.questions.includes(q)) {
                continue;
            }

            const btn = document.createElement("button");
            btn.className = "nav-grid-btn";
            btn.innerText = i + 1;

            // Compute answered state
            let isAnswered = false;
            if (q.type === 'multi') {
                isAnswered = studentAnswers[q.id] && studentAnswers[q.id].length > 0;
            } else {
                isAnswered = studentAnswers[q.id] !== undefined && studentAnswers[q.id] !== '';
            }

            // Assign status classes
            if (i === currentIdx) btn.classList.add("active");
            if (flaggedQuestions[i]) {
                btn.classList.add("flagged");
            } else if (isAnswered) {
                btn.classList.add("answered");
            }

            btn.addEventListener("click", () => {
                currentIdx = i;
                renderQuestion();
                renderSidebarGrid();
            });

            sidebarGrid.appendChild(btn);
        }

        // Render global sections progress bar in sidebar
        const sectionsListDiv = container.querySelector("#sidebar-sections-list");
        if (sectionsListDiv && isSectionWise) {
            sectionsListDiv.innerHTML = sections.map((sec, sIdx) => {
                const isActive = sIdx === currentSectionIdx;
                const isPast = sIdx < currentSectionIdx;
                const statusColor = isActive 
                    ? 'background-color: var(--primary-glow); border-color: rgba(99,102,241,0.5); color: var(--text-primary);' 
                    : isPast 
                        ? 'background-color: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.2); color: var(--text-muted); opacity: 0.7;'
                        : 'background-color: transparent; border-color: var(--border-color); color: var(--text-muted); opacity: 0.5;';
                const badge = isActive 
                    ? '<span class="test-badge badge-active" style="font-size:0.65rem; background: var(--secondary-gradient); color: white; border: none; padding: 0.15rem 0.4rem; border-radius: 4px;">Active</span>' 
                    : isPast 
                        ? '<span class="test-badge badge-completed" style="font-size:0.65rem; background: var(--success-gradient); color: white; border: none; padding: 0.15rem 0.4rem; border-radius: 4px;">Done</span>'
                        : '<span class="test-badge badge-locked" style="font-size:0.65rem; background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border-color); padding: 0.15rem 0.4rem; border-radius: 4px;">Locked</span>';
                
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.8rem; font-weight: 500; ${statusColor}">
                        <span>${sec.name} (${sec.duration}m)</span>
                        ${badge}
                    </div>
                `;
            }).join('');
        }
    }

    // Timer ticks
    function startTimer() {
        timerInterval = setInterval(() => {
            timeRemaining--;
            timerDisplay.innerText = formatTime(timeRemaining);

            // Change timer border colors based on urgency
            if (timeRemaining <= 60) {
                timerBox.className = "timer-box timer-urgent";
            } else if (timeRemaining <= 180) {
                timerBox.className = "timer-box timer-warning";
            } else {
                timerBox.className = "timer-box timer-normal";
            }

            if (timeRemaining <= 0) {
                if (isSectionWise && currentSectionIdx < sections.length - 1) {
                    // Automatically move to next section
                    showToast(`Section "${sections[currentSectionIdx].name}" time expired! Moving to the next section.`, "warning");
                    proceedToNextSection();
                } else {
                    clearInterval(timerInterval);
                    showToast("Time has expired! Submitting your work automatically.", "warning");
                    submitExam(true); // Forced submission
                }
            }
        }, 1000);
    }

    // Helper: proceed to next section during section-wise exams
    function proceedToNextSection() {
        currentSectionIdx++;
        const nextSec = sections[currentSectionIdx];
        
        // Reset timer duration for the new section
        timeRemaining = nextSec.duration * 60;
        timerBox.className = "timer-box timer-normal";
        timerDisplay.innerText = formatTime(timeRemaining);
        
        // Update section badge UI
        const badge = container.querySelector("#section-badge");
        if (badge) {
            badge.innerText = `Section: ${nextSec.name}`;
        }
        
        // Redirect currentIdx to the first question of the new section
        const firstQOfNextSection = nextSec.questions[0];
        currentIdx = test.questions.indexOf(firstQOfNextSection);
        
        // Re-render everything
        renderQuestion();
        renderSidebarGrid();
    }

    // Submission Logic
    function submitExam(forced = false) {
        clearInterval(timerInterval);
        
        // Remove proctor listeners
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);

        // Exit Fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.warn(err));
        }

        // Stop and clean up webcam
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
        }
        if (webcamContainer) {
            webcamContainer.remove();
        }
        document.body.classList.remove("taking-test");

        // Grade the test
        let score = 0;
        let correctCount = 0;
        const reviewDetails = [];

        test.questions.forEach(q => {
            const studentAns = studentAnswers[q.id];
            let isCorrect = false;

            if (q.type === 'single') {
                isCorrect = studentAns === q.answer;
                reviewDetails.push({
                    questionText: q.text,
                    options: q.options,
                    correctAnswer: q.answer,
                    studentAnswer: studentAns,
                    isCorrect,
                    explanation: q.explanation,
                    type: q.type
                });
            } else if (q.type === 'multi') {
                // Check if arrays hold the exact same elements
                const isMatch = Array.isArray(studentAns) && 
                                studentAns.length === q.answers.length && 
                                studentAns.every(val => q.answers.includes(val));
                isCorrect = isMatch;
                reviewDetails.push({
                    questionText: q.text,
                    options: q.options,
                    correctAnswers: q.answers,
                    studentAnswer: studentAns,
                    isCorrect,
                    explanation: q.explanation,
                    type: q.type
                });
            } else if (q.type === 'text') {
                const normalizedStudent = (studentAns || '').toLowerCase().trim();
                const normalizedCorrect = q.answer.toLowerCase().trim();
                isCorrect = normalizedStudent === normalizedCorrect;
                reviewDetails.push({
                    questionText: q.text,
                    correctAnswer: q.answer,
                    studentAnswer: studentAns,
                    isCorrect,
                    explanation: q.explanation,
                    type: q.type
                });
            } else if (q.type === 'code') {
                const funcMatch = q.template.match(/function\s+([a-zA-Z0-9_]+)/);
                const funcName = funcMatch ? funcMatch[1] : '';
                let allAssertsPassed = true;
                
                q.assertions.forEach(as => {
                    const testResult = runAssertion(studentAns, funcName, as.input, as.expected);
                    if (!testResult.passed) {
                        allAssertsPassed = false;
                    }
                });
                
                isCorrect = allAssertsPassed;
                reviewDetails.push({
                    questionText: q.text,
                    studentAnswer: studentAns,
                    isCorrect,
                    explanation: q.explanation,
                    type: q.type
                });
            }

            if (isCorrect) correctCount++;
        });

        score = Math.round((correctCount / totalQuestions) * 100);
        let timeSpent = 0;
        if (isSectionWise) {
            for (let s = 0; s < currentSectionIdx; s++) {
                timeSpent += (sections[s].duration * 60);
            }
            const activeSec = sections[currentSectionIdx];
            timeSpent += (activeSec.duration * 60) - timeRemaining;
        } else {
            timeSpent = (test.duration * 60) - timeRemaining;
        }

        const attemptRecord = {
            testId: test.id,
            testTitle: test.title,
            score,
            totalQuestions,
            correctCount,
            timeSpent,
            date: new Date().toISOString().split('T')[0],
            reviewDetails
        };

        onSubmitTest(attemptRecord);
    }

    // Section transition dialog modal (prevents exiting fullscreen or losing focus)
    function showSectionTransitionModal(onConfirm) {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        
        const activeSec = sections[currentSectionIdx];
        
        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-title"><i class="fas fa-arrow-circle-right" style="color: hsl(190, 90%, 50%);"></i> Submit Section?</div>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">
                    Are you sure you want to submit section <strong>"${activeSec.name}"</strong>?<br>
                    <span style="color: hsl(355, 78%, 56%); font-weight: 500;">Warning: You cannot return to this section once submitted.</span>
                </p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-sec-cancel">Back to Section</button>
                    <button class="btn btn-primary" id="modal-sec-confirm">Submit & Proceed</button>
                </div>
            </div>
        `;
        
        overlay.querySelector("#modal-sec-cancel").addEventListener("click", () => {
            overlay.remove();
        });
        
        overlay.querySelector("#modal-sec-confirm").addEventListener("click", () => {
            overlay.remove();
            onConfirm();
        });
        
        document.body.appendChild(overlay);
    }

    // Modal Confirmation Dialog
    function showConfirmationModal() {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        // Count unanswered questions
        let unansweredCount = 0;
        test.questions.forEach(q => {
            if (q.type === 'multi') {
                if (!studentAnswers[q.id] || studentAnswers[q.id].length === 0) unansweredCount++;
            } else {
                if (studentAnswers[q.id] === undefined || studentAnswers[q.id] === '') unansweredCount++;
            }
        });

        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-title"><i class="fas fa-question-circle" style="color: hsl(239, 84%, 57%);"></i> Submit Exam?</div>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">
                    ${isSectionWise ? 'Are you sure you want to end the test? This will submit all sections, and you will forfeit any remaining sections and questions.' : 'Are you sure you want to end the test?'} 
                    ${unansweredCount > 0 ? `<br><strong style="color: hsl(355, 78%, 56%);">Warning: You have ${unansweredCount} unanswered questions remaining.</strong>` : 'All questions have responses recorded.'}
                </p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="modal-cancel-btn">Back to Exam</button>
                    <button class="btn btn-danger" id="modal-confirm-btn">Confirm Submit</button>
                </div>
            </div>
        `;

        overlay.querySelector("#modal-cancel-btn").addEventListener("click", () => {
            overlay.remove();
        });

        overlay.querySelector("#modal-confirm-btn").addEventListener("click", () => {
            overlay.remove();
            submitExam(false);
        });

        document.body.appendChild(overlay);
    }

    // -------------------------------------------------------------
    // Proctoring Simulator
    // -------------------------------------------------------------
    function handleProctorViolation(violationText) {
        focusOffenseCount++;
        const timeNow = new Date().toLocaleTimeString();
        
        // Log locally
        offenses.push({ time: timeNow, details: violationText });
        
        // Render in log box
        proctorLogBox.innerHTML = offenses.map(off => {
            return `<p style="color: hsl(355, 78%, 56%); font-weight: 500; font-size: 0.72rem; margin-top: 0.25rem;">
                [${off.time}] ${off.details}
            </p>`;
        }).join('') + `<p style="color: var(--text-muted); font-size: 0.7rem; margin-top: 0.25rem;">Monitoring active...</p>`;

        // Flash toast alert warning
        showToast(`AI Proctor Alert: ${violationText} (#${focusOffenseCount})`, "error", 4000);

        // Record proctor log to central DB
        addProctorLog({
            studentName: user.name,
            testTitle: test.title,
            event: violationText,
            severity: "high"
        });
    }

    function handleBlur() {
        handleProctorViolation("Window Focus Lost (Clicked Outside)");
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            handleProctorViolation("Tab Switched (Hidden Page State)");
        }
    }

    function handleFullscreenChange() {
        if (!document.fullscreenElement) {
            handleProctorViolation("Exited Fullscreen Mode (Security Check)");
        }
    }

    // Initialize Webcam Stream Overlay
    function initWebcam() {
        webcamContainer = document.createElement("div");
        webcamContainer.className = "webcam-container";
        webcamContainer.innerHTML = `
            <div class="webcam-indicator-bar">
                <div class="webcam-rec-dot"></div>
                <span>PROCTOR LIVE</span>
            </div>
            <div class="webcam-scanline"></div>
            <video id="proctor-webcam-feed" class="webcam-feed" autoplay playsinline muted></video>
            <div class="webcam-placeholder" id="webcam-placeholder-avatar">
                <i class="fas fa-user-slash"></i>
                <span>CAMERA OFFLINE</span>
            </div>
        `;
        document.body.appendChild(webcamContainer);
        document.body.classList.add("taking-test");

        const video = webcamContainer.querySelector("#proctor-webcam-feed");
        const placeholder = webcamContainer.querySelector("#webcam-placeholder-avatar");

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                webcamStream = stream;
                video.srcObject = stream;
                placeholder.style.display = "none";
            })
            .catch(err => {
                console.warn("Webcam access denied/unavailable:", err);
                // Keep simulated diagnostics offline placeholder active
            });
    }

    // Setup proctor event listeners
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Request Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Fullscreen request rejected:", err);
            showToast("AI Proctor Alert: Programmatic fullscreen blocked. Maximize browser manually.", "warning");
        });
    }

    // -------------------------------------------------------------
    // Controls Event Listeners
    // -------------------------------------------------------------
    prevBtn.addEventListener("click", () => {
        const minIdx = isSectionWise ? test.questions.indexOf(sections[currentSectionIdx].questions[0]) : 0;
        if (currentIdx > minIdx) {
            currentIdx--;
            renderQuestion();
            renderSidebarGrid();
        }
    });

    nextBtn.addEventListener("click", () => {
        if (isSectionWise) {
            const activeSec = sections[currentSectionIdx];
            const maxIdx = test.questions.indexOf(activeSec.questions[activeSec.questions.length - 1]);
            
            if (currentIdx < maxIdx) {
                currentIdx++;
                renderQuestion();
                renderSidebarGrid();
            } else {
                if (currentSectionIdx < sections.length - 1) {
                    showSectionTransitionModal(() => {
                        proceedToNextSection();
                    });
                } else {
                    showConfirmationModal();
                }
            }
        } else {
            if (currentIdx < totalQuestions - 1) {
                currentIdx++;
                renderQuestion();
                renderSidebarGrid();
            } else {
                showConfirmationModal();
            }
        }
    });

    flagBtn.addEventListener("click", () => {
        flaggedQuestions[currentIdx] = !flaggedQuestions[currentIdx];
        renderQuestion();
        renderSidebarGrid();
    });

    submitBtn.addEventListener("click", () => {
        showConfirmationModal();
    });

    // Initialize View
    renderQuestion();
    renderSidebarGrid();
    startTimer();
    initWebcam();

    return container;
}

// -------------------------------------------------------------
// Sandboxed Local Code Evaluation Assertion Engine
// -------------------------------------------------------------
function runAssertion(userCode, funcName, inputArgs, expectedVal) {
    try {
        // Construct wrapper
        const wrapper = new Function(`
            ${userCode}
            return ${funcName}(${inputArgs.join(', ')});
        `);
        const result = wrapper();
        
        // Format results for checking
        const serializedResult = typeof result === 'string' ? `'${result}'` : String(result);
        const isMatch = serializedResult.trim() === String(expectedVal).trim();
        return { passed: isMatch, result: serializedResult };
    } catch (err) {
        return { passed: false, result: `Error: ${err.message}` };
    }
}
