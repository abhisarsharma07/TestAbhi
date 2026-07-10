/* -------------------------------------------------------------
   TestAbhi - Admin / Teacher Console & Test Creator
------------------------------------------------------------- */

import { getTests, saveTests, getProctorLogs, fetchAllProctorLogs } from '../db.js';
import { formatDate, showToast } from '../utils.js';
import { navigate } from '../app.js';

export function renderAdminDashboard(user) {
    const container = document.createElement("div");
    container.className = "dashboard-container fade-in";

    // Setup state
    let activeTab = 'analytics'; // 'analytics', 'builder', 'monitor'
    let builderQuestions = []; // Hold questions being built for a new test
    let builderSections = [{ name: 'General', duration: 10 }]; // Global sections list

    // Conversational Chat Agent state variables
    let chatHistory = [
        { sender: 'agent', text: "Hello! I am your AI Assessment Agent. What topic or subject would you like to build an exam for today?" }
    ];
    let chatPhase = 0; // 0 = Topic, 1 = Format, 2 = Ready to load
    let chatTopic = '';
    let chatFormat = 'mix';
    let chatCount = 3;
    let proposedQuestionsList = [];
    let proposedSectionsList = [];

    // Seed empty default question for builder
    const createEmptyQuestion = () => ({
        text: '',
        type: 'single',
        options: ['', ''],
        answer: 0,
        answers: [],
        explanation: '',
        sectionName: builderSections[0] ? builderSections[0].name : 'General',
        sectionDuration: builderSections[0] ? builderSections[0].duration : 5
    });

    // Main structural outline
    container.innerHTML = `
        <div class="welcome-banner" style="background: var(--secondary-gradient); box-shadow: 0 8px 30px rgba(6, 182, 212, 0.15);">
            <h1>Teacher Console</h1>
            <p>Welcome back, ${user.name}. Build new assessments, view performance statistics, and monitor live candidate proctoring logs.</p>
            <div class="welcome-banner-shapes" style="background: rgba(255, 255, 255, 0.05);"></div>
        </div>

        <!-- Navigation Tabs -->
        <div class="admin-tabs">
            <button class="admin-tab-btn active" data-tab="analytics">
                <i class="fas fa-chart-pie"></i> Analytics Overview
            </button>
            <button class="admin-tab-btn" data-tab="builder">
                <i class="fas fa-plus-circle"></i> Test Creator
            </button>
            <button class="admin-tab-btn" data-tab="monitor">
                <i class="fas fa-video"></i> Live Monitor logs
            </button>
            ${user.role === 'admin' ? `
                <button class="admin-tab-btn" id="user-mgmt-tab-btn" style="margin-left: auto; color: hsl(263, 90%, 65%); border-color: rgba(139, 92, 246, 0.3);">
                    <i class="fas fa-users-cog"></i> User Management
                </button>
            ` : ''}
        </div>

        <!-- Tab content wrappers -->
        <div id="tab-analytics" class="admin-pane active"></div>
        <div id="tab-builder" class="admin-pane"></div>
        <div id="tab-monitor" class="admin-pane"></div>
    `;

    // References to DOM Panes
    const paneAnalytics = container.querySelector("#tab-analytics");
    const paneBuilder = container.querySelector("#tab-builder");
    const paneMonitor = container.querySelector("#tab-monitor");
    const tabBtns = container.querySelectorAll(".admin-tab-btn");

    // -------------------------------------------------------------
    // RENDER: Analytics Tab
    // -------------------------------------------------------------
    function renderAnalytics() {
        const tests = getTests();
        const logs = getProctorLogs();
        const totalExams = tests.length;
        
        // Sum total questions
        const totalQuestions = tests.reduce((acc, test) => acc + test.questions.length, 0);
        
        // Count security alerts
        const highSeverityLogs = logs.filter(l => l.severity === 'high').length;

        paneAnalytics.innerHTML = `
            <div class="dashboard-stats-grid">
                <div class="stat-item">
                    <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
                    <div class="stat-details">
                        <h4>${totalExams}</h4>
                        <p>Total Exams Active</p>
                    </div>
                </div>
                
                <div class="stat-item">
                    <div class="stat-icon secondary"><i class="fas fa-question-circle"></i></div>
                    <div class="stat-details">
                        <h4>${totalQuestions}</h4>
                        <p>Questions Configured</p>
                    </div>
                </div>

                <div class="stat-item" style="background-color: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2);">
                    <div class="stat-icon" style="background: var(--danger-gradient);"><i class="fas fa-shield-alt"></i></div>
                    <div class="stat-details">
                        <h4>${highSeverityLogs}</h4>
                        <p>Security Violations Logged</p>
                    </div>
                </div>
            </div>

            <!-- List configured tests -->
            <div style="margin-top: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <h3 class="section-title" style="margin-bottom: 0;"><i class="fas fa-clipboard-list"></i> Active Assessment Overview</h3>
                    <div>
                        <button class="btn btn-secondary" id="import-test-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                            <i class="fas fa-file-import"></i> Import Test JSON
                        </button>
                        <input type="file" id="import-test-file-input" accept=".json" style="display: none;">
                    </div>
                </div>
                
                <div class="proctor-logs-table-wrapper">
                    <table class="proctor-table">
                        <thead>
                            <tr>
                                <th>Exam Title</th>
                                <th>Difficulty</th>
                                <th>Duration</th>
                                <th>Questions</th>
                                <th>Test ID</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tests.map(test => `
                                <tr>
                                    <td><strong>${test.title}</strong></td>
                                    <td><span class="test-badge badge-${test.difficulty}">${test.difficulty}</span></td>
                                    <td>${test.duration} mins</td>
                                    <td>${test.questions.length}</td>
                                    <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${test.id}</td>
                                    <td style="text-align: right; display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
                                        <button class="icon-btn export-test-btn" data-id="${test.id}" title="Export Test JSON">
                                            <i class="fas fa-download"></i>
                                        </button>
                                        <button class="icon-btn delete-test-btn" data-id="${test.id}" title="Delete Test" style="color: hsl(355, 78%, 56%);">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Bind Export Action
        paneAnalytics.querySelectorAll(".export-test-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const testId = btn.getAttribute("data-id");
                const test = tests.find(t => t.id === testId);
                if (test) {
                    const jsonStr = JSON.stringify(test, null, 4);
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `testabhi-${testId}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`Exported "${test.title}" configuration!`, "success");
                }
            });
        });

        // Bind Delete Action
        paneAnalytics.querySelectorAll(".delete-test-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const testId = btn.getAttribute("data-id");
                const test = tests.find(t => t.id === testId);
                if (test && confirm(`Are you sure you want to delete assessment "${test.title}"?`)) {
                    const updated = tests.filter(t => t.id !== testId);
                    await saveTests(updated);
                    showToast("Test configuration deleted.", "info");
                    renderAnalytics();
                }
            });
        });

        // Bind Import actions
        const importBtn = paneAnalytics.querySelector("#import-test-btn");
        const fileInput = paneAnalytics.querySelector("#import-test-file-input");

        importBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (!imported.id || !imported.title || !Array.isArray(imported.questions)) {
                        throw new Error("Invalid TestAbhi assessment format.");
                    }

                    const currentTests = getTests();
                    if (currentTests.some(t => t.id === imported.id)) {
                        imported.id = `${imported.id}-${Date.now()}`;
                    }

                    currentTests.push(imported);
                    await saveTests(currentTests);
                    showToast(`Assessment "${imported.title}" imported successfully!`, "success");
                    renderAnalytics();
                } catch (err) {
                    showToast(`Failed to parse file: ${err.message}`, "error");
                }
            };
            reader.readAsText(file);
        });

    }

    // -------------------------------------------------------------
    // RENDER: Test Builder Tab
    // -------------------------------------------------------------
    function renderBuilder() {
        if (builderQuestions.length === 0) {
            builderQuestions.push(createEmptyQuestion());
        }

        paneBuilder.innerHTML = `
            <!-- AI Conversational Agent Panel -->
            <div class="ai-generator-panel" style="border-style: solid;">
                <div class="ai-panel-header" style="justify-content: space-between; display: flex; width: 100%; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fas fa-robot" style="animation: pulse-glow 2s infinite;"></i>
                        <h3>AI Conversational Agent Assistant</h3>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        <button class="btn btn-secondary" id="gemini-config-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem; border-color: rgba(6, 182, 212, 0.3); color: hsl(190, 90%, 50%);">
                            <i class="fas fa-key"></i> Gemini API Key
                        </button>
                        <button class="btn btn-secondary" id="pdf-upload-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem; border-color: rgba(239, 68, 68, 0.25); color: hsl(355, 78%, 56%);">
                            <i class="fas fa-file-pdf"></i> Upload PDF
                        </button>
                        <input type="file" id="pdf-file-input" accept=".pdf" style="display: none;">
                        <button class="btn btn-secondary" id="reset-chat-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-color: rgba(255,255,255,0.1);">
                            <i class="fas fa-sync-alt"></i> Reset Chat
                        </button>
                    </div>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: -0.75rem; line-height: 1.5;">
                    Chat with the AI Agent below to generate dynamic questions. Specify a topic, formats (multiple choice, checkbox, code tasks), or count, and review proposed outputs.
                </p>

                <!-- Sleek collapsible API Key setting panel -->
                <div id="gemini-key-panel" style="display: none; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); padding: 1rem; border-radius: 8px; margin: 0.5rem 0 1rem 0; gap: 0.5rem; flex-direction: column;">
                    <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                        Enter your <strong>Gemini API Key</strong> for smarter parsing / generation via Gemini 1.5 Flash:
                    </label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="password" id="gemini-api-key-input" class="input-control" placeholder="AIzaSy..." style="flex: 1; font-size: 0.8rem; padding: 0.4rem 0.75rem;">
                        <button class="btn btn-primary" id="save-gemini-key-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem;">Save</button>
                    </div>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">
                        Key is saved locally in your browser's LocalStorage and is never sent to any server other than Google's Gemini API.
                    </span>
                </div>
                
                <!-- Chat Window Container -->
                <div class="ai-chat-container">
                    <div class="ai-chat-messages" id="ai-chat-messages-box"></div>
                    
                    <div class="ai-chat-input-bar">
                        <input type="text" id="ai-chat-input" class="input-control" placeholder="Type message to the AI Assistant...">
                        <button class="btn btn-primary" id="ai-chat-send-btn" style="padding: 0.85rem 1.5rem;">
                            <i class="fas fa-paper-plane"></i> Send
                        </button>
                    </div>
                </div>

                <!-- Load proposed questions trigger button -->
                <button class="btn btn-success" id="ai-load-drafts-btn" style="width: 100%; display: none; justify-content: center; align-items: center; padding: 0.85rem; font-size: 1rem; gap: 0.5rem;">
                    <i class="fas fa-magic"></i> Load Proposed Questions into Editor <i class="fas fa-arrow-down"></i>
                </button>
            </div>

            <!-- Manual Editor Workspace (Verification Panel) -->
            <div class="sidebar-panel" style="background-color: var(--bg-card); display: flex; flex-direction: column; gap: 1.5rem; width: 100%;">
                <h3 class="section-title" style="margin-bottom: 0.5rem;"><i class="fas fa-edit"></i> Verification Panel & Configure Exam</h3>
                
                <div class="creator-config-grid">
                    <div class="input-group" style="margin-bottom: 0;">
                        <label for="test-title">Test Title</label>
                        <input type="text" id="test-title" class="input-control" placeholder="e.g. Advanced Python Concepts">
                    </div>
                    <div class="input-group" style="margin-bottom: 0;">
                        <label for="test-duration">Duration (Minutes)</label>
                        <input type="number" id="test-duration" class="input-control" value="20" min="1">
                    </div>
                    <div class="input-group" style="margin-bottom: 0;">
                        <label for="test-difficulty">Difficulty</label>
                        <select id="test-difficulty" class="input-control" style="cursor: pointer;">
                            <option value="easy">Easy</option>
                            <option value="medium" selected>Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>

                <div class="input-group" style="margin-bottom: 0;">
                    <label for="test-desc">Description</label>
                    <input type="text" id="test-desc" class="input-control" placeholder="Brief outline detailing what the test covers...">
                </div>

                <!-- Schedule Window -->
                <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); padding: 1.25rem; border-radius: 8px;">
                    <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-calendar-alt" style="color: hsl(190, 90%, 50%);"></i> Schedule Window (Optional)
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label for="test-window-start">Available From</label>
                            <input type="datetime-local" id="test-window-start" class="input-control">
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label for="test-window-end">Expires At</label>
                            <input type="datetime-local" id="test-window-end" class="input-control">
                        </div>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">Leave blank to keep the test always available.</p>
                </div>

                <!-- Global Negative Marking -->
                <div class="input-group" style="margin-bottom: 0;">
                    <label for="test-negative-marking">Global Negative Marking</label>
                    <select id="test-negative-marking" class="input-control" style="cursor: pointer;">
                        <option value="0">None (0)</option>
                        <option value="-0.25">-1/4 per wrong answer</option>
                        <option value="-0.33">-1/3 per wrong answer</option>
                        <option value="-0.5">-1/2 per wrong answer</option>
                        <option value="-1">-1 per wrong answer</option>
                        <option value="-1.5">-3/2 per wrong answer</option>
                        <option value="-2">-2 per wrong answer</option>
                    </select>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Applied to incorrect answers. Unanswered questions score 0.</p>
                </div>

                <div class="input-group" style="margin-bottom: 0; display: flex; align-items: center; gap: 0.5rem; flex-direction: row; cursor: pointer;">
                    <input type="checkbox" id="test-section-wise-timing" style="width: 1.1rem; height: 1.1rem; cursor: pointer;">
                    <label for="test-section-wise-timing" style="cursor: pointer; margin-bottom: 0; user-select: none; font-weight: 500;">Enable Section-Wise Timing</label>
                </div>

                <!-- Global Sections Manager Card -->
                <div id="builder-sections-manager-wrapper" style="display: none; background: rgba(255, 255, 255, 0.02); border: 1px dashed var(--border-color); padding: 1.25rem; border-radius: 8px; margin-top: 0.5rem;">
                    <h4 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-folder-open" style="color: hsl(190, 90%, 50%);"></i> Configure Exam Sections
                    </h4>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4;">
                        Create global sections. You can then assign question cards to these sections from their respective dropdown lists below.
                    </p>
                    <div id="builder-sections-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;"></div>
                    <button class="btn btn-secondary" id="add-section-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem;">
                        <i class="fas fa-plus"></i> Add Section Card
                    </button>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 0.5rem 0;">

                <h3 class="section-title" style="margin-bottom: 0.5rem;"><i class="fas fa-tasks"></i> Questions Outline</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: -1rem; margin-bottom: 0.5rem;">
                    Review the draft generated above or add custom cards. You can make manual changes here before clicking Create.
                </p>
                <div id="builder-questions-list"></div>

                <div style="display: flex; gap: 0.75rem; width: 100%; flex-wrap: wrap;">
                    <button class="btn btn-secondary" id="add-question-btn" style="flex: 1; min-width: 140px; justify-content: center;">
                        <i class="fas fa-plus-circle"></i> Add Question
                    </button>
                    <button class="btn btn-secondary" id="import-questions-json-btn" style="flex: 1.5; min-width: 160px; justify-content: center; border-color: rgba(6, 182, 212, 0.3); color: hsl(190, 90%, 50%);">
                        <i class="fas fa-file-import"></i> Import JSON
                    </button>
                    <input type="file" id="questions-json-file-input" accept=".json" style="display: none;">
                    <button class="icon-btn" id="questions-json-help-btn" title="View JSON Schema" style="width: 40px; height: 40px; flex-shrink: 0;">
                        <i class="fas fa-question-circle"></i>
                    </button>
                    <button class="btn btn-success" id="save-test-btn" style="flex: 1.5; min-width: 160px; justify-content: center;">
                        Create Assessment <i class="fas fa-save"></i>
                    </button>
                </div>
            </div>
        `;

        renderBuilderQuestions();
        renderChatMessages();

        // Manual Event hooks
        paneBuilder.querySelector("#add-question-btn").addEventListener("click", () => {
            builderQuestions.push(createEmptyQuestion());
            renderBuilderQuestions();
        });

        paneBuilder.querySelector("#save-test-btn").addEventListener("click", async () => {
            const btn = paneBuilder.querySelector("#save-test-btn");
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            try {
                await saveTestFromBuilder();
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Create Assessment <i class="fas fa-save"></i>';
            }
        });

        // Import Questions JSON Action
        const importQuestionsBtn = paneBuilder.querySelector("#import-questions-json-btn");
        const questionsJsonInput = paneBuilder.querySelector("#questions-json-file-input");
        const helpBtn = paneBuilder.querySelector("#questions-json-help-btn");

        if (helpBtn) {
            helpBtn.addEventListener("click", (e) => {
                e.preventDefault();
                showJsonSchemaHelpModal();
            });
        }

        if (importQuestionsBtn && questionsJsonInput) {
            importQuestionsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                questionsJsonInput.click();
            });

            questionsJsonInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        let items = [];

                        if (Array.isArray(parsed)) {
                            items = parsed;
                        } else if (typeof parsed === 'object' && parsed !== null) {
                            items = [parsed];
                        } else {
                            throw new Error("JSON must be a question object or an array of question objects.");
                        }

                        // Validate and normalize each question
                        const validated = [];
                        items.forEach((item, idx) => {
                            if (!item.text || !item.type) {
                                throw new Error(`Question #${idx + 1} is missing required fields (text, type).`);
                            }
                            
                            const validTypes = ['single', 'multi', 'text', 'code'];
                            if (!validTypes.includes(item.type)) {
                                throw new Error(`Question #${idx + 1} has an invalid type: "${item.type}". Allowed types: ${validTypes.join(', ')}`);
                            }

                            // Normalize the question object
                            const normalized = {
                                text: String(item.text),
                                type: item.type,
                                explanation: item.explanation ? String(item.explanation) : '',
                                sectionName: item.sectionName ? String(item.sectionName) : (builderSections[0] ? builderSections[0].name : 'General'),
                                sectionDuration: builderSections[0] ? builderSections[0].duration : 5
                            };

                            if (item.type === 'single' || item.type === 'multi') {
                                if (!Array.isArray(item.options) || item.options.length < 2) {
                                    throw new Error(`Question #${idx + 1} (choice question) must have an options array with at least 2 choices.`);
                                }
                                normalized.options = item.options.map(String);
                                
                                if (item.type === 'single') {
                                    const ansIdx = parseInt(item.answer, 10);
                                    if (isNaN(ansIdx) || ansIdx < 0 || ansIdx >= normalized.options.length) {
                                        throw new Error(`Question #${idx + 1} (single-choice) must have a valid numerical 0-indexed 'answer' field.`);
                                    }
                                    normalized.answer = ansIdx;
                                } else {
                                    if (!Array.isArray(item.answers)) {
                                        throw new Error(`Question #${idx + 1} (multi-choice) must have an 'answers' array of option indexes.`);
                                    }
                                    normalized.answers = item.answers.map(ans => {
                                        const parsedAns = parseInt(ans, 10);
                                        if (isNaN(parsedAns) || parsedAns < 0 || parsedAns >= normalized.options.length) {
                                            throw new Error(`Question #${idx + 1} (multi-choice) answer "${ans}" is invalid.`);
                                        }
                                        return parsedAns;
                                    });
                                }
                            } else if (item.type === 'text') {
                                if (item.answer === undefined || item.answer === null) {
                                    throw new Error(`Question #${idx + 1} (short text entry) must have an 'answer' string.`);
                                }
                                normalized.answer = String(item.answer);
                            } else if (item.type === 'code') {
                                normalized.language = item.language ? String(item.language) : 'JavaScript';
                                normalized.template = item.template ? String(item.template) : '';
                                normalized.assertions = Array.isArray(item.assertions) ? item.assertions.map(as => ({
                                    input: Array.isArray(as.input) ? as.input.map(String) : [String(as.input)],
                                    expected: String(as.expected)
                                })) : [];
                                normalized.answer = '';
                            }

                            validated.push(normalized);
                        });

                        // Add questions and update
                        builderQuestions.push(...validated);
                        renderBuilderQuestions();
                        showToast(`Successfully imported ${validated.length} questions!`, "success");

                    } catch (err) {
                        showToast(`Import Error: ${err.message}`, "error");
                    }
                    questionsJsonInput.value = '';
                };
                reader.readAsText(file);
            });
        }


        const checkbox = paneBuilder.querySelector("#test-section-wise-timing");
        const managerWrapper = paneBuilder.querySelector("#builder-sections-manager-wrapper");

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                managerWrapper.style.display = "block";
            } else {
                managerWrapper.style.display = "none";
            }
            renderBuilderQuestions();
        });

        paneBuilder.querySelector("#add-section-btn").addEventListener("click", (e) => {
            e.preventDefault();
            const newIndex = builderSections.length + 1;
            builderSections.push({ name: `Section ${newIndex}`, duration: 10 });
            renderBuilderSections();
            renderBuilderQuestions();
        });

        // Initialize sub-renderers
        renderBuilderSections();

        // Collapsible Gemini panel triggers
        const configBtn = paneBuilder.querySelector("#gemini-config-btn");
        const keyPanel = paneBuilder.querySelector("#gemini-key-panel");
        const keyInput = paneBuilder.querySelector("#gemini-api-key-input");
        const saveKeyBtn = paneBuilder.querySelector("#save-gemini-key-btn");

        // Load existing key
        const savedKey = localStorage.getItem("testabhi_gemini_key") || '';
        if (savedKey) {
            keyInput.value = savedKey;
        }

        configBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (keyPanel.style.display === "none" || !keyPanel.style.display) {
                keyPanel.style.display = "flex";
            } else {
                keyPanel.style.display = "none";
            }
        });

        saveKeyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const val = keyInput.value.trim();
            if (val) {
                localStorage.setItem("testabhi_gemini_key", val);
                showToast("Gemini API Key saved locally!", "success");
            } else {
                localStorage.removeItem("testabhi_gemini_key");
                showToast("Gemini API Key removed.", "info");
            }
            keyPanel.style.display = "none";
        });

        // Chat Interface Elements
        const chatInput = paneBuilder.querySelector("#ai-chat-input");
        const chatSendBtn = paneBuilder.querySelector("#ai-chat-send-btn");
        const resetChatBtn = paneBuilder.querySelector("#reset-chat-btn");
        const loadDraftsBtn = paneBuilder.querySelector("#ai-load-drafts-btn");
        const pdfUploadBtn = paneBuilder.querySelector("#pdf-upload-btn");
        const pdfFileInput = paneBuilder.querySelector("#pdf-file-input");

        // PDF upload logic
        if (pdfUploadBtn && pdfFileInput) {
            pdfUploadBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const apiKey = localStorage.getItem("testabhi_gemini_key");
                if (!apiKey) {
                    showToast("Please save your Gemini API Key first before uploading a PDF.", "warning");
                    if (keyPanel && keyPanel.style.display === "none") {
                        keyPanel.style.display = "flex";
                        keyInput.focus();
                    }
                    return;
                }
                pdfFileInput.click();
            });

            pdfFileInput.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (file.type !== "application/pdf") {
                    showToast("Invalid file format. Please upload a PDF.", "error");
                    return;
                }

                chatHistory.push({ sender: 'user', text: `Uploaded PDF: **${file.name}** (${Math.round(file.size / 1024)} KB). Extracting questions...` });
                chatHistory.push({ sender: 'agent', isTyping: true });
                renderChatMessages();

                const apiKey = localStorage.getItem("testabhi_gemini_key");

                try {
                    const extractedText = await extractTextFromPDF(file);
                    if (!extractedText.trim()) {
                        throw new Error("No readable text content found inside the PDF.");
                    }

                    const prompt = `The user has uploaded a PDF document containing exam questions. Please analyze the following extracted text, search for all questions, and parse them completely. Fill in the options, correct answer keys, and logical explanations. Output raw JSON matching the required schema.\n\n[EXTRACTED PDF TEXT]:\n${extractedText}`;
                    
                    const geminiResponse = await callGeminiAPI(apiKey, prompt);
                    chatHistory = chatHistory.filter(m => !m.isTyping);

                    if (geminiResponse && Array.isArray(geminiResponse.questions)) {
                        proposedQuestionsList = geminiResponse.questions;
                        proposedSectionsList = geminiResponse.sections || [];
                        chatTopic = geminiResponse.chatTopic || file.name.replace(".pdf", "");
                        chatCount = geminiResponse.questions.length;
                        chatPhase = 2; // Ready to load
                        
                        let parsedSummary = `Successfully parsed **${geminiResponse.questions.length}** questions from your PDF!`;
                        if (proposedSectionsList.length > 0) {
                            parsedSummary += `\n\n**Sections Identified:**\n` + 
                                proposedSectionsList.map(s => `- **${s.name}** (${s.duration} mins)`).join('\n');
                        }
                        parsedSummary += `\n\nClick the **Load Proposed Questions into Editor** button below to inspect and customize them.`;

                        chatHistory.push({ 
                            sender: 'agent', 
                            text: geminiResponse.reply || parsedSummary 
                        });
                    } else {
                        throw new Error("Invalid question structure returned by Gemini API.");
                    }
                } catch (err) {
                    console.error("PDF Parsing/Gemini Error: ", err);
                    chatHistory = chatHistory.filter(m => !m.isTyping);
                    chatHistory.push({ 
                        sender: 'agent', 
                        text: `⚠️ **PDF Question Extraction Failed:** ${err.message}\n\nPlease check your file or Gemini API Key and try again.` 
                    });
                }

                pdfFileInput.value = '';
                renderChatMessages();
            });
        }

        const processLocalLogic = (userText) => {
            let reply = '';
            const lower = userText.toLowerCase();

            // Try local parsing
            const parsed = parseRawQuestions(userText);
            if (parsed.questions.length > 0) {
                proposedQuestionsList = parsed.questions;
                proposedSectionsList = parsed.sections;
                chatTopic = "Custom Pasted Assessment";
                chatCount = parsed.questions.length;
                chatPhase = 2; // Finalized state ready to load
                
                reply = `I detected a list of raw questions! I have successfully parsed **${parsed.questions.length}** questions${parsed.sections.length > 0 ? ` across **${parsed.sections.length}** sections` : ''} from your copy-pasted text.\n\n`;
                
                if (parsed.sections.length > 0) {
                    reply += `**Parsed Sections:**\n` + 
                        parsed.sections.map(s => `- **${s.name}**: ${s.duration} minutes (${parsed.questions.filter(q => q.sectionName === s.name).length} questions)`).join('\n') + `\n\n`;
                }
                
                reply += `**Questions Structured:**\n` +
                    parsed.questions.map((q, idx) => {
                        const ansLabel = q.type === 'multi' 
                            ? (q.answers || []).map(a => String.fromCharCode(65 + a)).join(', ') 
                            : (typeof q.answer === 'number' ? String.fromCharCode(65 + q.answer) : q.answer);
                        return `${idx + 1}. [${q.type.toUpperCase()}] ${q.text} (Section: *${q.sectionName}*, Answer: ${ansLabel})`;
                    }).join('\n') +
                    `\n\n💡 **Tip:** Set a **Gemini API Key** via the cyan button above for 100% accurate, error-free parsing of messy text formats!\n\nClick the **Load Proposed Questions into Editor** button below to sync them to the Verification Panel so you can manually check and publish the assessment!`;
                
                chatHistory.push({ sender: 'agent', text: reply });
                return;
            }

            // Standard Dialog Tree
            if (chatPhase === 0) {
                chatTopic = userText;
                chatPhase = 1;
                reply = `Awesome choice: **${chatTopic}**! Let's configure the structure.\n\nShould we include **Multiple Choice** questions, **Multiple Response** (checkmarks), **JavaScript Coding Tasks**, or a **Mixed Format** (a blend of everything)?`;
            } else if (chatPhase === 1) {
                if (lower.includes("code") || lower.includes("coding") || lower.includes("task")) {
                    chatFormat = 'code';
                } else if (lower.includes("multi") || lower.includes("response") || lower.includes("check")) {
                    chatFormat = 'multi';
                } else if (lower.includes("single") || lower.includes("radio") || lower.includes("choice")) {
                    chatFormat = 'single';
                } else {
                    chatFormat = 'mix';
                }

                proposedQuestionsList = generateMockQuestions(chatTopic, chatCount, chatFormat);
                chatPhase = 2;

                reply = `I have successfully drafted a **${chatFormat.toUpperCase()}** format exam on **${chatTopic}** with **${chatCount}** questions!\n\nHere is a quick summary of the generated items:\n` +
                    proposedQuestionsList.map((q, idx) => `${idx + 1}. [${q.type.toUpperCase()}] ${q.text.slice(0, 60)}...`).join('\n') +
                    `\n\nTo load these into the editor workspace, click the **Load Proposed Questions into Editor** button below! You can also tell me to "change count to 5" or "make it coding only" to refine it.`;
            } else {
                const numMatch = lower.match(/\b([1-9]|10)\b/);
                if (numMatch) {
                    chatCount = parseInt(numMatch[0], 10);
                }
                if (lower.includes("code") || lower.includes("coding")) {
                    chatFormat = 'code';
                } else if (lower.includes("multi") || lower.includes("checkbox")) {
                    chatFormat = 'multi';
                } else if (lower.includes("single") || lower.includes("radio") || lower.includes("choice")) {
                    chatFormat = 'single';
                } else if (lower.includes("mixed") || lower.includes("mix")) {
                    chatFormat = 'mix';
                }

                proposedQuestionsList = generateMockQuestions(chatTopic, chatCount, chatFormat);

                reply = `I've updated the draft according to your adjustments (Count: **${chatCount}**, Format: **${chatFormat.toUpperCase()}**).\n\nHere is the updated draft summary:\n` +
                    proposedQuestionsList.map((q, idx) => `${idx + 1}. [${q.type.toUpperCase()}] ${q.text.slice(0, 60)}...`).join('\n') +
                    `\n\nClick the load button below to sync with the verification panel!`;
            }

            chatHistory.push({ sender: 'agent', text: reply });
        };

        // Send handles
        const handleSend = async () => {
            const userText = chatInput.value.trim();
            if (!userText) return;

            // 1. User Message
            chatHistory.push({ sender: 'user', text: userText });
            chatInput.value = '';
            renderChatMessages();

            // 2. Typing indicator
            chatHistory.push({ sender: 'agent', isTyping: true });
            renderChatMessages();

            const apiKey = localStorage.getItem("testabhi_gemini_key");

            if (apiKey) {
                try {
                    const geminiResponse = await callGeminiAPI(apiKey, userText);
                    chatHistory = chatHistory.filter(m => !m.isTyping);

                    if (geminiResponse && Array.isArray(geminiResponse.questions)) {
                        proposedQuestionsList = geminiResponse.questions;
                        proposedSectionsList = geminiResponse.sections || [];
                        chatTopic = geminiResponse.chatTopic || "Gemini Generated Test";
                        chatCount = geminiResponse.questions.length;
                        chatPhase = 2; // ready

                        chatHistory.push({ sender: 'agent', text: geminiResponse.reply || "Questions successfully generated/parsed by Gemini API!" });
                    } else {
                        throw new Error("Invalid structure returned by Gemini.");
                    }
                } catch (err) {
                    console.error("Gemini API Error: ", err);
                    chatHistory = chatHistory.filter(m => !m.isTyping);
                    chatHistory.push({ 
                        sender: 'agent', 
                        text: `⚠️ **Gemini API Error:** ${err.message}\n\n*Falling back to local parsing engine...*` 
                    });
                    processLocalLogic(userText);
                }
                renderChatMessages();
            } else {
                // Local Fallback simulation
                setTimeout(() => {
                    chatHistory = chatHistory.filter(m => !m.isTyping);
                    processLocalLogic(userText);
                    renderChatMessages();
                }, 1200);
            }
        };

        chatSendBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handleSend();
        });

        chatInput.addEventListener("keydown", (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        });

        // Reset chat session
        resetChatBtn.addEventListener("click", (e) => {
            e.preventDefault();
            chatHistory = [
                { sender: 'agent', text: "Hello! I am your AI Assessment Agent. What topic or subject would you like to build an exam for today?" }
            ];
            chatPhase = 0;
            chatTopic = '';
            chatFormat = 'mix';
            chatCount = 3;
            proposedQuestionsList = [];
            loadDraftsBtn.style.display = "none";
            renderChatMessages();
            showToast("Conversation reset.", "info");
        });

        // Sync drafts to manual verification editor (merging/appending questions & sections)
        loadDraftsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (proposedQuestionsList.length === 0) return;

            // Fill text fields if currently blank
            const titleEl = paneBuilder.querySelector("#test-title");
            const descEl = paneBuilder.querySelector("#test-desc");
            if (!titleEl.value.trim()) {
                titleEl.value = `${chatTopic.charAt(0).toUpperCase() + chatTopic.slice(1)} Test`;
            }
            if (!descEl.value.trim()) {
                descEl.value = `AI Conversational Draft covering ${chatTopic} metrics.`;
            }

            // Load & Merge sections
            if (proposedSectionsList.length > 0) {
                proposedSectionsList.forEach(pSec => {
                    if (!builderSections.some(s => s.name.toLowerCase() === pSec.name.toLowerCase())) {
                        builderSections.push(pSec);
                    }
                });
            } else {
                if (builderSections.length === 0) {
                    builderSections.push({ name: 'General', duration: 15 });
                }
            }
                
            // Check the "Enable Section-Wise Timing" checkbox if multiple sections exist
            const timingCheckbox = paneBuilder.querySelector("#test-section-wise-timing");
            const managerWrapper = paneBuilder.querySelector("#builder-sections-manager-wrapper");
            
            const hasMultipleSections = builderSections.length > 1;
            timingCheckbox.checked = hasMultipleSections;
            if (hasMultipleSections) {
                managerWrapper.style.display = "block";
            } else {
                managerWrapper.style.display = "none";
            }

            // Append questions (remove the default initial empty question card if present)
            const isInitialEmpty = builderQuestions.length === 1 && 
                                   !builderQuestions[0].text && 
                                   builderQuestions[0].options.every(o => !o);
            
            if (isInitialEmpty) {
                builderQuestions = [...proposedQuestionsList];
            } else {
                builderQuestions = [...builderQuestions, ...proposedQuestionsList];
            }
            
            renderBuilderSections();
            renderBuilderQuestions();

            showToast("AI proposed questions loaded! Review and edit below.", "success");
        });
    }

    // Helper: Render messages inside chat window
    function renderChatMessages() {
        const msgBox = paneBuilder.querySelector("#ai-chat-messages-box");
        if (!msgBox) return;

        msgBox.innerHTML = chatHistory.map(msg => {
            if (msg.isTyping) {
                return `
                    <div class="chat-bubble agent">
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                `;
            }
            const bubbleClass = msg.sender === 'user' ? 'user' : 'agent';
            const formattedText = msg.text.replace(/\n/g, '<br>');
            return `
                <div class="chat-bubble ${bubbleClass}">
                    ${formattedText}
                </div>
            `;
        }).join('');

        // Show/hide Sync button
        const loadBtn = paneBuilder.querySelector("#ai-load-drafts-btn");
        if (loadBtn) {
            if (chatPhase === 2 && proposedQuestionsList.length > 0) {
                loadBtn.style.display = "flex";
            } else {
                loadBtn.style.display = "none";
            }
        }

        msgBox.scrollTop = msgBox.scrollHeight;
    }

    // Helper: Parse raw copy-pasted questions text block with intelligent chunking and regex heuristics
    function parseRawQuestions(text) {
        const questions = [];
        const sectionsParsed = [];

        // Scan text for section titles chronologically
        const sectionHeaderRegex = /(?:Part|Section)\s+([A-Z0-9]+)\s*:\s*([^\r\n\(\:]+)/gi;
        const sectionMatches = [...text.matchAll(sectionHeaderRegex)];
        
        sectionMatches.forEach(sm => {
            sectionsParsed.push({
                name: sm[2].trim(),
                startIndex: sm.index,
                duration: 5
            });
        });

        // Pre-process text to add newlines before options, answers, and question starters if they are on a single line
        let cleanedText = text;
        // Add newlines before option letters A-E
        cleanedText = cleanedText.replace(/\s+([A-Ea-e])\s*[\)\.\-\:\u2013\u2014]\s+/g, '\n$1) ');
        // Add newlines before Answer keywords
        cleanedText = cleanedText.replace(/\s+(Correct\s+Answer|Answer|Ans|Key|Correct\s+Option)\s*[\:\-\=]\s*/gi, '\nAnswer: ');
        
        // Add newlines before common question starter words/patterns
        const questionStarters = ['What', 'Which', 'How', 'Who', 'Where', 'When', 'Is', 'Are', 'Do', 'Does', 'Did', 'If', 'The', 'Select', 'Write', 'In', 'On', 'At', 'Identify', 'Choose', 'Q\\d+', '\\d+'];
        const starterPattern = new RegExp(`\\s+(${questionStarters.join('|')})\\b`, 'gi');
        cleanedText = cleanedText.replace(starterPattern, '\n$1');

        // Split into lines
        const rawLines = cleanedText.split(/\r?\n/);
        const lines = rawLines.map(l => l.trim()).filter(Boolean);

        let currentQ = {
            text: '',
            options: [],
            correctOptionIndexes: [],
            explanation: '',
            textAnswer: ''
        };

        const finalizeCurrentQ = () => {
            if (!currentQ.text.trim()) return;

            // Find matching parsed section based on position in original text
            let assignedSection = null;
            const textIdx = text.indexOf(currentQ.text.slice(0, 30));
            for (let s = sectionsParsed.length - 1; s >= 0; s--) {
                if (textIdx >= sectionsParsed[s].startIndex) {
                    assignedSection = sectionsParsed[s];
                    break;
                }
            }
            const secName = assignedSection ? assignedSection.name : 'General';

            const cleanText = currentQ.text
                .replace(/^\s*(?:Q|Question\s*)?\d+\s*[\.\)\:\-\u2013\u2014]\s*/i, '')
                .replace(/^\s*[\[\(]\d+[\]\)]\s*/, '')
                .trim();

            if (currentQ.options.length >= 2) {
                const isMulti = currentQ.correctOptionIndexes.length > 1;
                questions.push({
                    id: `parsed-q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    text: cleanText,
                    type: isMulti ? 'multi' : 'single',
                    options: currentQ.options,
                    ...(isMulti ? { answers: currentQ.correctOptionIndexes } : { answer: currentQ.correctOptionIndexes[0] || 0 }),
                    sectionName: secName,
                    sectionDuration: 5,
                    explanation: currentQ.explanation || `Parsed dynamically (${isMulti ? 'Multiple Response' : 'Single Choice'} MCQ).`
                });
            } else {
                questions.push({
                    id: `parsed-q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    text: cleanText,
                    type: 'text',
                    options: ['', ''],
                    answer: currentQ.textAnswer || '',
                    sectionName: secName,
                    sectionDuration: 5,
                    explanation: currentQ.explanation || "Parsed dynamically (Short Text Entry)."
                });
            }
        };

        const optionPrefixRegex = /^([A-Ea-e])\s*[\.\)\-\:\u2013\u2014]\s*(.+)$/;
        const answerRegex = /^(?:Correct\s*Answer|Answer|Ans|Key|Correct\s*Option)\s*[\:\-\=]?\s*(.+)$/i;
        const explanationRegex = /^(?:Explanation|Exp|Reason)\s*[\:\-\=]?\s*(.+)$/i;

        lines.forEach(line => {
            const optMatch = line.match(optionPrefixRegex);
            const ansMatch = line.match(answerRegex);
            const expMatch = line.match(explanationRegex);
            const isSec = /^(?:Part|Section)\s+[A-Z0-9]+/i.test(line);

            if (isSec) return;

            if (expMatch) {
                currentQ.explanation = expMatch[1].trim();
            } else if (ansMatch) {
                const rawAnsVal = ansMatch[1].trim();
                // Extract answer keys starting at option keys (e.g. "B" or "B, C")
                const optionKeysMatch = rawAnsVal.match(/^\s*([A-E](?:\s*,\s*[A-E])*)/i);
                if (optionKeysMatch) {
                    const parsedAnsLetters = optionKeysMatch[1].toUpperCase().replace(/[^A-E]/g, '');
                    for (let c of parsedAnsLetters) {
                        const idx = c.charCodeAt(0) - 65;
                        if (idx >= 0 && idx < 5 && !currentQ.correctOptionIndexes.includes(idx)) {
                            currentQ.correctOptionIndexes.push(idx);
                        }
                    }
                }
                currentQ.textAnswer = rawAnsVal;
            } else if (optMatch) {
                let optText = optMatch[2].trim();
                const letter = optMatch[1].toUpperCase();
                const isMarkedCorrect = optText.toLowerCase().includes('(correct)') || optText.endsWith('*') || line.startsWith('*');
                
                optText = optText.replace(/\(correct\)/gi, '').replace(/\*$/, '').trim();
                currentQ.options.push(optText);

                if (isMarkedCorrect) {
                    const idx = letter.charCodeAt(0) - 65;
                    if (!currentQ.correctOptionIndexes.includes(idx)) {
                        currentQ.correctOptionIndexes.push(idx);
                    }
                }
            } else {
                const hasAnswersOrOptions = currentQ.options.length > 0 || currentQ.correctOptionIndexes.length > 0 || currentQ.textAnswer;
                if (hasAnswersOrOptions) {
                    finalizeCurrentQ();
                    currentQ = {
                        text: line,
                        options: [],
                        correctOptionIndexes: [],
                        explanation: '',
                        textAnswer: ''
                    };
                } else {
                    if (currentQ.text) currentQ.text += ' ';
                    currentQ.text += line;
                }
            }
        });

        finalizeCurrentQ();

        // Compute sections duration
        sectionsParsed.forEach(sec => {
            const count = questions.filter(q => q.sectionName === sec.name).length;
            sec.duration = Math.max(2, count * 2);
        });

        questions.forEach(q => {
            const matchedSec = sectionsParsed.find(s => s.name === q.sectionName);
            if (matchedSec) {
                q.sectionDuration = matchedSec.duration;
            }
        });

        return {
            questions,
            sections: sectionsParsed
        };
    }

    // Helper: generate mockup questions matching target topic keywords
    function generateMockQuestions(topic, count, format) {
        const list = [];
        const normalized = topic.toLowerCase().trim();
        
        // Standard topic identifiers
        const isReact = normalized.includes("react");
        const isPython = normalized.includes("python") || normalized.includes("code") || normalized.includes("program");
        const isGeo = normalized.includes("capitals") || normalized.includes("geography") || normalized.includes("world");
        
        for (let i = 0; i < count; i++) {
            // Determine type: circular mix or exact
            let qType = format === 'mix' ? (i % 3 === 0 ? 'single' : (i % 3 === 1 ? 'multi' : 'code')) : format;
            
            if (isReact) {
                if (qType === 'single') {
                    list.push({
                        text: "In React, what does the 'useState' hook return?",
                        type: 'single',
                        options: [
                            "The current state value only.",
                            "An array containing the current state value and a function to update it.",
                            "An object with state keys.",
                            "A reference node to the virtual DOM."
                        ],
                        answer: 1,
                        explanation: "useState returns a stateful value and a function to update it as a destructured array: [state, setState]."
                    });
                } else if (qType === 'multi') {
                    list.push({
                        text: "Select all React hooks used to cache/memoize values or callbacks. (Select all that apply)",
                        type: 'multi',
                        options: [
                            "useMemo",
                            "useCallback",
                            "useEffect",
                            "useRef"
                        ],
                        answers: [0, 1],
                        explanation: "useMemo caches a computed value. useCallback caches the callback function itself to prevent re-renders."
                    });
                } else {
                    list.push({
                        text: "Write a React helper function named 'getBadgeStyle(score)' that returns 'badge-success' if the score is 80 or above, and 'badge-danger' otherwise.",
                        type: 'code',
                        template: "function getBadgeStyle(score) {\n    // Write your code here\n    \n}",
                        assertions: [
                            { input: [85], expected: "'badge-success'" },
                            { input: [50], expected: "'badge-danger'" }
                        ],
                        explanation: "Returns styling tag strings based on simple logic bounds."
                    });
                }
            } else if (isPython) {
                if (qType === 'single') {
                    list.push({
                        text: "Which list method is used to insert an item at the end of a list in Python?",
                        type: 'single',
                        options: [
                            "insert()",
                            "append()",
                            "extend()",
                            "push()"
                        ],
                        answer: 1,
                        explanation: "append() adds a single element to the end of the list."
                    });
                } else if (qType === 'multi') {
                    list.push({
                        text: "Which of the following data types are immutable in Python? (Select all that apply)",
                        type: 'multi',
                        options: [
                            "list",
                            "tuple",
                            "string",
                            "dict"
                        ],
                        answers: [1, 2],
                        explanation: "Tuples and strings cannot be changed after creation. Lists and dictionaries are mutable."
                    });
                } else {
                    list.push({
                        text: "Write a function named 'reverseString(str)' that accepts a string and returns it reversed.",
                        type: 'code',
                        template: "function reverseString(str) {\n    // Write your code here\n    \n}",
                        assertions: [
                            { input: ["'hello'"], expected: "'olleh'" },
                            { input: ["'TestAbhi'"], expected: "'ihbAtseT'" }
                        ],
                        explanation: "Split code, reverse, and join."
                    });
                }
            } else if (isGeo) {
                if (qType === 'single') {
                    list.push({
                        text: "What is the capital city of France?",
                        type: 'single',
                        options: [
                            "London",
                            "Berlin",
                            "Paris",
                            "Madrid"
                        ],
                        answer: 2,
                        explanation: "Paris is the capital of France."
                    });
                } else if (qType === 'multi') {
                    list.push({
                        text: "Select all countries located in South America. (Select all that apply)",
                        type: 'multi',
                        options: [
                            "Brazil",
                            "Argentina",
                            "Mexico",
                            "Egypt"
                        ],
                        answers: [0, 1],
                        explanation: "Brazil and Argentina are South American countries."
                    });
                } else {
                    list.push({
                        text: "Write a function named 'getContinent(country)' that returns 'Asia' if the country is 'India' or 'China', and 'Europe' otherwise.",
                        type: 'code',
                        template: "function getContinent(country) {\n    // Write your code here\n    \n}",
                        assertions: [
                            { input: ["'India'"], expected: "'Asia'" },
                            { input: ["'France'"], expected: "'Europe'" }
                        ],
                        explanation: "Condition checks on country string arguments."
                    });
                }
            } else {
                // Fallback templates based on their custom topic
                const capitalized = topic.charAt(0).toUpperCase() + topic.slice(1);
                if (qType === 'single') {
                    list.push({
                        text: `Which of the following is considered a core element or foundational pillar of ${capitalized}?`,
                        type: 'single',
                        options: [
                            `Standard modular structure of ${capitalized}`,
                            `An irrelevant obsolete secondary model`,
                            `A completely incorrect assertion block`,
                            `External deprecated variables`
                        ],
                        answer: 0,
                        explanation: `Understanding the structural elements of ${capitalized} is essential for proper workflow design.`
                    });
                } else if (qType === 'multi') {
                    list.push({
                        text: `Select all valid concepts, strategies, or techniques closely associated with modern ${capitalized}. (Select all that apply)`,
                        type: 'multi',
                        options: [
                            `Modular integration workflows`,
                            `Proactive system lifecycle optimization`,
                            `Completely randomized legacy parameters`,
                            `Obsolete framework deprecation blocks`
                        ],
                        answers: [0, 1],
                        explanation: `Both modular workflows and proactive optimization represent core best-practices in modern ${capitalized}.`
                    });
                } else {
                    // Generate a simple math or logic code question related to the topic
                    list.push({
                        text: `Write a validator function named 'check${capitalized.replace(/[^a-zA-Z0-9]/g, '')}(value)' that returns true if the input value is positive (greater than 0), and false otherwise.`,
                        type: 'code',
                        template: `function check${capitalized.replace(/[^a-zA-Z0-9]/g, '')}(value) {\n    // Write your code here\n    \n}`,
                        assertions: [
                            { input: [10], expected: "true" },
                            { input: [-5], expected: "false" }
                        ],
                        explanation: `Returns true if value > 0, false otherwise.`
                    });
                }
            }
        }
        return list;
    }

    function renderBuilderQuestions() {
        const listDiv = paneBuilder.querySelector("#builder-questions-list");
        listDiv.innerHTML = '';

        builderQuestions.forEach((q, qIdx) => {
            const card = document.createElement("div");
            card.className = "builder-question-card";

            card.innerHTML = `
                <div class="builder-question-header">
                    <strong style="color: hsl(239, 84%, 57%); font-size: 0.9rem; text-transform: uppercase;">
                        Question #${qIdx + 1}
                    </strong>
                    ${builderQuestions.length > 1 ? `
                        <button class="btn btn-secondary remove-question-btn" data-index="${qIdx}" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.2); color: hsl(355, 78%, 56%);">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    ` : ''}
                </div>

                <div class="input-group">
                    <label>Question Body</label>
                    <input type="text" class="input-control q-text-input" data-index="${qIdx}" value="${q.text}" placeholder="What is the output of 2 + 2?" required>
                </div>

                <div class="question-config-grid">
                    <div class="input-group">
                        <label>Question Format</label>
                        <select class="input-control q-type-select" data-index="${qIdx}" style="cursor: pointer;">
                            <option value="single" ${q.type === 'single' ? 'selected' : ''}>Single Choice (Radio)</option>
                            <option value="multi" ${q.type === 'multi' ? 'selected' : ''}>Multiple Response (Checkbox)</option>
                            <option value="text" ${q.type === 'text' ? 'selected' : ''}>Short Text Entry</option>
                            <option value="code" ${q.type === 'code' ? 'selected' : ''}>Coding Challenge</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>Explanation (Optional)</label>
                        <input type="text" class="input-control q-explanation-input" data-index="${qIdx}" value="${q.explanation}" placeholder="Detail why the correct answer is correct...">
                    </div>
                </div>

                ${paneBuilder.querySelector("#test-section-wise-timing")?.checked ? `
                    <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 1rem;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Assign to Section</label>
                            <select class="input-control q-section-select" data-index="${qIdx}" style="cursor: pointer;">
                                ${builderSections.map(sec => `
                                    <option value="${sec.name}" ${q.sectionName === sec.name ? 'selected' : ''}>
                                        ${sec.name} (${sec.duration} Mins)
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                ` : ''}

                <div class="q-options-wrapper" data-index="${qIdx}"></div>
            `;

            // Build dynamic options container
            const optionsWrapper = card.querySelector(".q-options-wrapper");
            
            if (q.type === 'text') {
                optionsWrapper.innerHTML = `
                    <div class="input-group">
                        <label>Correct Value (Case-Insensitive)</label>
                        <input type="text" class="input-control q-correct-text" data-index="${qIdx}" value="${q.answer}" placeholder="Enter the exact correct text answer...">
                    </div>
                `;
            } else if (q.type === 'code') {
                optionsWrapper.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Coding Language</label>
                            <select class="input-control q-lang-select" data-index="${qIdx}" style="cursor: pointer;">
                                ${['JavaScript', 'Python', 'Java', 'C', 'C++', 'HTML', 'CSS'].map(lang => `
                                    <option value="${lang}" ${q.language === lang || (!q.language && lang === 'JavaScript') ? 'selected' : ''}>${lang}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="input-group" style="margin-bottom: 0;">
                            <label>Starter Code Template</label>
                            <textarea class="input-control q-template-textarea" data-index="${qIdx}" rows="3" style="font-family: monospace; font-size: 0.85rem;" placeholder="// Provide function template signature...">${q.template || ''}</textarea>
                        </div>
                    </div>
                    <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
                        Assertion Test Cases
                    </label>
                    <div class="assertions-inputs-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem;">
                        ${(q.assertions || []).map((as, aIdx) => `
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; min-width: 60px;">Assert #${aIdx + 1}:</span>
                                <input type="text" class="input-control q-assert-input" data-qindex="${qIdx}" data-aindex="${aIdx}" value="${as.input ? as.input.join(', ') : ''}" placeholder="Inputs (e.g. 2, 3 or 'hello')" style="flex: 2;">
                                <input type="text" class="input-control q-assert-expected" data-qindex="${qIdx}" data-aindex="${aIdx}" value="${as.expected || ''}" placeholder="Expected Output (e.g. 5 or 'olleh')" style="flex: 1.5;">
                                <button class="icon-btn remove-assert-item" data-qindex="${qIdx}" data-aindex="${aIdx}" title="Delete Test Case" style="color: hsl(355, 78%, 56%);">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-secondary add-assert-item" data-index="${qIdx}" style="padding: 0.4rem 1rem; font-size: 0.8rem;">
                        <i class="fas fa-plus"></i> Add Test Case Assertion
                    </button>
                `;
            } else {
                // Radio or Checkbox options
                optionsWrapper.innerHTML = `
                    <label style="font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); display: block; margin-bottom: 0.5rem;">
                        Options & Answer Keys
                    </label>
                    <div class="options-inputs-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${q.options.map((opt, oIdx) => {
                            const isCorrectSingle = q.type === 'single' && q.answer === oIdx;
                            const isCorrectMulti = q.type === 'multi' && q.answers.includes(oIdx);
                            const markerIcon = q.type === 'single' ? (isCorrectSingle ? 'fa-dot-circle' : 'fa-circle') : (isCorrectMulti ? 'fa-check-square' : 'fa-square');

                            return `
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    <button class="icon-btn toggle-option-answer" data-qindex="${qIdx}" data-oindex="${oIdx}" title="Mark as correct answer" style="border-color: ${isCorrectSingle || isCorrectMulti ? 'hsl(142, 70%, 45%)' : 'var(--border-color)'}; color: ${isCorrectSingle || isCorrectMulti ? 'hsl(142, 70%, 45%)' : 'var(--text-secondary)'};">
                                        <i class="far ${markerIcon}"></i>
                                    </button>
                                    <input type="text" class="input-control q-option-text" data-qindex="${qIdx}" data-oindex="${oIdx}" value="${opt}" placeholder="Option Value ${String.fromCharCode(65 + oIdx)}" required style="flex: 1;">
                                    ${q.options.length > 2 ? `
                                        <button class="icon-btn remove-option-item" data-qindex="${qIdx}" data-oindex="${oIdx}" title="Delete option" style="color: hsl(355, 78%, 56%);">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <button class="btn btn-secondary add-option-item" data-index="${qIdx}" style="padding: 0.4rem 1rem; font-size: 0.8rem; margin-top: 0.75rem;">
                        <i class="fas fa-plus"></i> Add Option Option
                    </button>
                `;
            }

            // Options-specific hooks inside the question card
            optionsWrapper.querySelectorAll(".q-option-text").forEach(optInput => {
                optInput.addEventListener("input", (e) => {
                    const qi = parseInt(optInput.getAttribute("data-qindex"), 10);
                    const oi = parseInt(optInput.getAttribute("data-oindex"), 10);
                    builderQuestions[qi].options[oi] = e.target.value;
                });
            });

            const textCorrect = optionsWrapper.querySelector(".q-correct-text");
            if (textCorrect) {
                textCorrect.addEventListener("input", (e) => {
                    const qi = parseInt(textCorrect.getAttribute("data-index"), 10);
                    builderQuestions[qi].answer = e.target.value;
                });
            }

            // Coding question specific hooks
            const langSelect = optionsWrapper.querySelector(".q-lang-select");
            if (langSelect) {
                langSelect.addEventListener("change", (e) => {
                    const qi = parseInt(langSelect.getAttribute("data-index"), 10);
                    builderQuestions[qi].language = e.target.value;
                });
            }

            const templateTextarea = optionsWrapper.querySelector(".q-template-textarea");
            if (templateTextarea) {
                templateTextarea.addEventListener("input", (e) => {
                    const qi = parseInt(templateTextarea.getAttribute("data-index"), 10);
                    builderQuestions[qi].template = e.target.value;
                });
            }

            optionsWrapper.querySelectorAll(".q-assert-input").forEach(input => {
                input.addEventListener("input", (e) => {
                    const qi = parseInt(input.getAttribute("data-qindex"), 10);
                    const ai = parseInt(input.getAttribute("data-aindex"), 10);
                    builderQuestions[qi].assertions[ai].input = e.target.value.split(',').map(s => s.trim());
                });
            });

            optionsWrapper.querySelectorAll(".q-assert-expected").forEach(expected => {
                expected.addEventListener("input", (e) => {
                    const qi = parseInt(expected.getAttribute("data-qindex"), 10);
                    const ai = parseInt(expected.getAttribute("data-aindex"), 10);
                    builderQuestions[qi].assertions[ai].expected = e.target.value;
                });
            });

            optionsWrapper.querySelectorAll(".remove-assert-item").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const qi = parseInt(btn.getAttribute("data-qindex"), 10);
                    const ai = parseInt(btn.getAttribute("data-aindex"), 10);
                    builderQuestions[qi].assertions.splice(ai, 1);
                    renderBuilderQuestions();
                });
            });

            const addAssertBtn = optionsWrapper.querySelector(".add-assert-item");
            if (addAssertBtn) {
                addAssertBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const qi = parseInt(addAssertBtn.getAttribute("data-index"), 10);
                    if (!builderQuestions[qi].assertions) {
                        builderQuestions[qi].assertions = [];
                    }
                    builderQuestions[qi].assertions.push({ input: [''], expected: '' });
                    renderBuilderQuestions();
                });
            }

            optionsWrapper.querySelectorAll(".toggle-option-answer").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const qi = parseInt(btn.getAttribute("data-qindex"), 10);
                    const oi = parseInt(btn.getAttribute("data-oindex"), 10);
                    
                    if (builderQuestions[qi].type === 'single') {
                        builderQuestions[qi].answer = oi;
                    } else {
                        const answersArr = builderQuestions[qi].answers;
                        if (answersArr.includes(oi)) {
                            builderQuestions[qi].answers = answersArr.filter(x => x !== oi);
                        } else {
                            builderQuestions[qi].answers.push(oi);
                        }
                    }
                    renderBuilderQuestions();
                });
            });

            optionsWrapper.querySelectorAll(".remove-option-item").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const qi = parseInt(btn.getAttribute("data-qindex"), 10);
                    const oi = parseInt(btn.getAttribute("data-oindex"), 10);
                    builderQuestions[qi].options.splice(oi, 1);
                    
                    // Reset answer indexes if out of bounds
                    if (builderQuestions[qi].type === 'single') {
                        if (builderQuestions[qi].answer >= builderQuestions[qi].options.length) {
                            builderQuestions[qi].answer = 0;
                        }
                    } else {
                        builderQuestions[qi].answers = builderQuestions[qi].answers
                            .filter(x => x < builderQuestions[qi].options.length);
                    }
                    renderBuilderQuestions();
                });
            });

            const addOptBtn = optionsWrapper.querySelector(".add-option-item");
            if (addOptBtn) {
                addOptBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const qi = parseInt(addOptBtn.getAttribute("data-index"), 10);
                    builderQuestions[qi].options.push('');
                    renderBuilderQuestions();
                });
            }

            // General Card Hooks
            card.querySelector(".q-text-input").addEventListener("input", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                builderQuestions[idx].text = e.target.value;
            });

            card.querySelector(".q-explanation-input").addEventListener("input", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                builderQuestions[idx].explanation = e.target.value;
            });

            card.querySelector(".q-type-select").addEventListener("change", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                builderQuestions[idx].type = e.target.value;
                if (e.target.value === 'text') {
                    builderQuestions[idx].answer = '';
                } else if (e.target.value === 'multi') {
                    builderQuestions[idx].answers = [];
                } else if (e.target.value === 'code') {
                    builderQuestions[idx].language = 'JavaScript';
                    builderQuestions[idx].template = "function reverseString(str) {\n    // Write your code here\n    \n}";
                    builderQuestions[idx].assertions = [{ input: ["'hello'"], expected: "'olleh'" }];
                    builderQuestions[idx].answer = '';
                } else {
                    builderQuestions[idx].answer = 0;
                }
                renderBuilderQuestions();
            });

            const secSelect = card.querySelector(".q-section-select");
            if (secSelect) {
                secSelect.addEventListener("change", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    const selectedSecName = e.target.value;
                    const matchedSec = builderSections.find(s => s.name === selectedSecName);
                    
                    builderQuestions[idx].sectionName = selectedSecName;
                    builderQuestions[idx].sectionDuration = matchedSec ? matchedSec.duration : 5;
                });
            }

            const removeQBtn = card.querySelector(".remove-question-btn");
            if (removeQBtn) {
                removeQBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const idx = parseInt(removeQBtn.getAttribute("data-index"), 10);
                    builderQuestions.splice(idx, 1);
                    renderBuilderQuestions();
                });
            }

            listDiv.appendChild(card);
        });
    }

    function renderBuilderSections() {
        const sectionsListDiv = paneBuilder.querySelector("#builder-sections-list");
        if (!sectionsListDiv) return;
        
        sectionsListDiv.innerHTML = '';
        
        builderSections.forEach((sec, sIdx) => {
            const row = document.createElement("div");
            row.style.display = "grid";
            row.style.gridTemplateColumns = "2fr 1fr auto";
            row.style.gap = "1rem";
            row.style.alignItems = "center";
            
            row.innerHTML = `
                <input type="text" class="input-control sec-name-input" data-index="${sIdx}" value="${sec.name}" placeholder="Section Name" required>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <input type="number" class="input-control sec-duration-input" data-index="${sIdx}" value="${sec.duration}" min="1" required style="width: 100%;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">m</span>
                </div>
                <select class="input-control sec-neg-marking-select" data-index="${sIdx}" title="Section Negative Marking" style="cursor: pointer; font-size: 0.8rem; padding: 0.4rem;">
                    <option value="global" ${!sec.negativeMarking ? 'selected' : ''}>Use Global</option>
                    <option value="0" ${sec.negativeMarking === '0' ? 'selected' : ''}>None (0)</option>
                    <option value="-0.25" ${sec.negativeMarking === '-0.25' ? 'selected' : ''}>-1/4</option>
                    <option value="-0.33" ${sec.negativeMarking === '-0.33' ? 'selected' : ''}>-1/3</option>
                    <option value="-0.5" ${sec.negativeMarking === '-0.5' ? 'selected' : ''}>-1/2</option>
                    <option value="-1" ${sec.negativeMarking === '-1' ? 'selected' : ''}>-1</option>
                    <option value="-1.5" ${sec.negativeMarking === '-1.5' ? 'selected' : ''}>-3/2</option>
                    <option value="-2" ${sec.negativeMarking === '-2' ? 'selected' : ''}>-2</option>
                </select>
                ${builderSections.length > 1 ? `
                    <button class="icon-btn delete-section-btn" data-index="${sIdx}" title="Delete section" style="color: hsl(355, 78%, 56%); background: none; border: none; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : '<div style="width: 28px;"></div>'}
            `;
            row.style.gridTemplateColumns = "2fr 1fr 1fr auto";
            
            row.querySelector(".sec-name-input").addEventListener("input", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                const oldName = builderSections[idx].name;
                const newName = e.target.value.trim() || `Section ${idx + 1}`;
                
                builderSections[idx].name = newName;
                
                builderQuestions.forEach(q => {
                    if (q.sectionName === oldName) {
                        q.sectionName = newName;
                    }
                });
                
                updateAllQuestionSectionDropdowns();
            });
            
            row.querySelector(".sec-duration-input").addEventListener("input", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                builderSections[idx].duration = parseInt(e.target.value, 10) || 5;
                
                builderQuestions.forEach(q => {
                    if (q.sectionName === builderSections[idx].name) {
                        q.sectionDuration = builderSections[idx].duration;
                    }
                });
            });

            const negSelect = row.querySelector(".sec-neg-marking-select");
            if (negSelect) {
                negSelect.addEventListener("change", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    const val = e.target.value;
                    builderSections[idx].negativeMarking = val === 'global' ? null : val;
                });
            }
            
            const delBtn = row.querySelector(".delete-section-btn");
            if (delBtn) {
                delBtn.addEventListener("click", () => {
                    const idx = parseInt(delBtn.getAttribute("data-index"), 10);
                    const removedSecName = builderSections[idx].name;
                    
                    builderSections.splice(idx, 1);
                    
                    const fallbackSecName = builderSections[0] ? builderSections[0].name : 'General';
                    const fallbackSecDur = builderSections[0] ? builderSections[0].duration : 10;
                    
                    builderQuestions.forEach(q => {
                        if (q.sectionName === removedSecName) {
                            q.sectionName = fallbackSecName;
                            q.sectionDuration = fallbackSecDur;
                        }
                    });
                    
                    renderBuilderSections();
                    renderBuilderQuestions();
                });
            }
            
            sectionsListDiv.appendChild(row);
        });
    }

    function updateAllQuestionSectionDropdowns() {
        const questionCards = paneBuilder.querySelectorAll(".builder-question-card");
        questionCards.forEach(card => {
            const dropdown = card.querySelector(".q-section-select");
            if (dropdown) {
                const qIdx = parseInt(dropdown.getAttribute("data-index"), 10);
                const currentVal = builderQuestions[qIdx].sectionName;
                
                dropdown.innerHTML = builderSections.map(sec => {
                    return `<option value="${sec.name}" ${sec.name === currentVal ? 'selected' : ''}>${sec.name}</option>`;
                }).join('');
            }
        });
    }

    async function saveTestFromBuilder() {
        const titleEl = paneBuilder.querySelector("#test-title");
        const descEl = paneBuilder.querySelector("#test-desc");
        const durationEl = paneBuilder.querySelector("#test-duration");
        const diffEl = paneBuilder.querySelector("#test-difficulty");

        if (!titleEl.value.trim()) {
            showToast("Test Title cannot be empty", "error");
            titleEl.focus();
            return;
        }

        // Validate all questions
        for (let i = 0; i < builderQuestions.length; i++) {
            const q = builderQuestions[i];
            if (!q.text.trim()) {
                showToast(`Question #${i + 1} details are empty`, "error");
                return;
            }
            if (q.type === 'text' || q.type === 'code') {
                if (q.type === 'text') {
                    if (typeof q.answer !== 'string' || !q.answer.trim()) {
                        showToast(`Provide a correct answer string for Question #${i + 1}`, "error");
                        return;
                    }
                }
            } else {
                // Choice validation
                for (let o = 0; o < q.options.length; o++) {
                    if (!q.options[o].trim()) {
                        showToast(`Option ${String.fromCharCode(65 + o)} in Question #${i + 1} is empty`, "error");
                        return;
                    }
                }
                
                if (q.type === 'multi' && q.answers.length === 0) {
                    showToast(`Select at least one correct option key for Question #${i + 1}`, "error");
                    return;
                }
            }
        }

        // Create ID
        const id = titleEl.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const tests = getTests();
        
        if (tests.some(t => t.id === id)) {
            showToast("A test with a similar title already exists.", "error");
            return;
        }

        const sectionWiseTiming = paneBuilder.querySelector("#test-section-wise-timing")?.checked || false;
        const negMarkingEl = paneBuilder.querySelector("#test-negative-marking");
        const globalNegativeMarking = negMarkingEl ? parseFloat(negMarkingEl.value) : 0;
        const windowStartEl = paneBuilder.querySelector("#test-window-start");
        const windowEndEl = paneBuilder.querySelector("#test-window-end");
        const windowStart = windowStartEl?.value ? new Date(windowStartEl.value).toISOString() : null;
        const windowEnd = windowEndEl?.value ? new Date(windowEndEl.value).toISOString() : null;

        const newTest = {
            id,
            title: titleEl.value.trim(),
            description: descEl.value.trim() || "No description provided.",
            duration: parseInt(durationEl.value, 10) || 15,
            difficulty: diffEl.value,
            sectionWiseTiming,
            negativeMarking: globalNegativeMarking,
            windowStart,
            windowEnd,
            sections: sectionWiseTiming ? builderSections.map(s => ({
                name: s.name.trim(),
                duration: parseInt(s.duration, 10) || 5,
                negativeMarking: s.negativeMarking !== undefined ? s.negativeMarking : null
            })) : [{ name: 'General', duration: parseInt(durationEl.value, 10) || 15, negativeMarking: null }],
            questions: builderQuestions.map((q, idx) => ({
                id: `bq-${idx}-${Date.now()}`,
                type: q.type,
                text: q.text.trim(),
                sectionName: q.sectionName || 'General',
                sectionDuration: parseInt(q.sectionDuration, 10) || 5,
                ...((q.type === 'single' || q.type === 'multi') ? { options: q.options.map(o => o.trim()) } : {}),
                ...(q.type === 'text' ? { answer: q.answer.trim() } : {}),
                ...(q.type === 'code' ? { language: q.language || 'JavaScript', template: q.template || '', assertions: q.assertions || [], answer: '' } : {}),
                ...(q.type === 'single' ? { answer: q.answer } : {}),
                ...(q.type === 'multi' ? { answers: q.answers } : {}),
                explanation: q.explanation.trim()
            }))
        };

        tests.push(newTest);
        await saveTests(tests);
        showToast("Assessment created successfully!", "success");

        // Clear builder
        titleEl.value = '';
        descEl.value = '';
        builderQuestions = [];
        
        // Go back to analytics overview tab
        switchTab('analytics');
    }


    async function renderMonitor() {
        paneMonitor.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; min-height: 200px; color: var(--text-secondary); flex-direction: column; gap: 0.75rem;">
                <i class="fas fa-spinner fa-spin fa-lg" style="color: hsl(239, 84%, 67%);"></i>
                <p>Fetching proctor security logs...</p>
            </div>
        `;

        try {
            await fetchAllProctorLogs();
        } catch (err) {
            paneMonitor.innerHTML = `<p style="color: var(--text-danger); text-align: center; padding: 2rem;">Failed to load logs.</p>`;
            return;
        }

        const logs = getProctorLogs();

        paneMonitor.innerHTML = `
            <div class="sidebar-panel" style="background-color: var(--bg-card); display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="section-title" style="margin-bottom: 0;"><i class="fas fa-shield-alt"></i> Live Proctoring Monitor</h3>
                    <button class="btn btn-secondary" id="refresh-logs-btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                        <i class="fas fa-sync-alt"></i> Refresh Logs
                    </button>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">
                    Real-time logs captured when students lose browser focus, click outside window margins, or switch tabs.
                </p>

                <div class="proctor-logs-table-wrapper" style="margin-top: 0.5rem;">
                    <table class="proctor-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Candidate Name</th>
                                <th>Assessment</th>
                                <th>Event Type</th>
                                <th>Severity</th>
                            </tr>
                        </thead>
                        <tbody id="proctor-logs-tbody">
                            ${renderProctorRows(logs)}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        paneMonitor.querySelector("#refresh-logs-btn").addEventListener("click", async () => {
            const btn = paneMonitor.querySelector("#refresh-logs-btn");
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            try {
                await fetchAllProctorLogs();
                const refreshedLogs = getProctorLogs();
                paneMonitor.querySelector("#proctor-logs-tbody").innerHTML = renderProctorRows(refreshedLogs);
                showToast("Proctoring log feed refreshed.", "info");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Logs';
            }
        });
    }


    function renderProctorRows(logs) {
        if (logs.length === 0) {
            return `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No security alerts logged.</td></tr>`;
        }
        return logs.map(log => {
            const timeStr = formatDate(log.timestamp);
            return `
                <tr>
                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${timeStr}</td>
                    <td><strong>${log.studentName}</strong></td>
                    <td style="color: var(--text-secondary);">${log.testTitle}</td>
                    <td><span style="color: hsl(355, 78%, 56%); font-weight: 500;"><i class="fas fa-exclamation-triangle"></i> ${log.event}</span></td>
                    <td><span class="proctor-severity-badge severity-${log.severity}">${log.severity}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Tab Switch Controller
    function switchTab(tabId) {
        activeTab = tabId;
        tabBtns.forEach(btn => {
            if (btn.getAttribute("data-tab") === tabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Hide all panes, show target pane
        paneAnalytics.classList.remove("active");
        paneBuilder.classList.remove("active");
        paneMonitor.classList.remove("active");

        if (tabId === 'analytics') {
            paneAnalytics.classList.add("active");
            renderAnalytics();
        } else if (tabId === 'builder') {
            paneBuilder.classList.add("active");
            renderBuilder();
        } else if (tabId === 'monitor') {
            paneMonitor.classList.add("active");
            renderMonitor();
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.getAttribute("data-tab"));
        });
    });

    // User management button (Admin only) → routes to Super Admin panel
    const userMgmtBtn = container.querySelector("#user-mgmt-tab-btn");
    if (userMgmtBtn) {
        userMgmtBtn.addEventListener("click", () => {
            navigate('super-admin');
        });
    }

    // Initial load
    renderAnalytics();

    return container;
}

// -------------------------------------------------------------
// Call Google Gemini API to parse or generate questions
// -------------------------------------------------------------
async function callGeminiAPI(apiKey, promptText) {
    const cleanKey = apiKey.trim();
    const systemInstruction = `You are a helpful AI Assessment Agent for TestAbhi.
Your task is to parse copy-pasted exam questions or generate new questions based on the user's prompt (such as copy-pasted text or extracted text from a PDF file).
You must analyze the text very carefully and extract EVERY single question present in the text without missing any.
Fix spelling, punctuation, capitalization, and formatting anomalies to make the questions look clean and professional.
For coding questions, automatically identify the language from code syntax or comments, and output it in the 'language' field.
You must output a single valid JSON object. Do NOT wrap it in markdown code blocks like \`\`\`json. Just output raw JSON.
The JSON structure must match this EXACT schema:
{
  "reply": "Friendly response summary detailing how many questions you parsed or generated",
  "chatTopic": "The subject/topic of the exam",
  "questions": [
    {
      "text": "The question body",
      "type": "single" | "multi" | "text" | "code",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for single/multi
      "answer": 0, // 0-indexed number of the correct option for 'single'. Or the correct answer string for 'text'.
      "answers": [0, 2], // Array of 0-indexed numbers of correct options for 'multi' (ONLY if type is 'multi')
      "explanation": "Why this is correct",
      "sectionName": "Name of the section (e.g. General, Math, coding)",
      "template": "starter code template (e.g. function reverseString(str) {})", // ONLY if type is 'code'
      "language": "JavaScript" | "Python" | "Java" | "C" | "C++" | "HTML" | "CSS", // ONLY if type is 'code'. Detect the target coding language from the question or default to JavaScript.
      "assertions": [{"input": [args], "expected": "output"}] // ONLY if type is 'code'
    }
  ],
  "sections": [
    {
      "name": "Section Name",
      "duration": 10
    }
  ]
}`;

    const bodyObj = {
        contents: [
            {
                parts: [
                    { text: promptText }
                ]
            }
        ],
        systemInstruction: {
            parts: [
                { text: systemInstruction }
            ]
        },
        generationConfig: {
            responseMimeType: "application/json"
        }
    };

    // List of models and versions to attempt in order of performance and availability
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'];
    const versions = ['v1', 'v1beta'];

    let lastError = null;

    for (let model of models) {
        for (let ver of versions) {
            const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${cleanKey}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyObj)
                });

                if (response.ok) {
                    const data = await response.json();
                    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResponse) {
                        return JSON.parse(textResponse.trim());
                    }
                } else {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || response.statusText;
                    lastError = new Error(`Model ${model} (${ver}) returned ${response.status}: ${errMsg}`);
                    console.warn(lastError.message);
                }
            } catch (e) {
                lastError = e;
                console.warn(`Fetch error for ${model} (${ver}):`, e);
            }
        }
    }

    throw lastError || new Error("Failed to connect to Gemini API. Please check your API key or connection.");
}

// Extract text from a PDF file using pdf.js client-side
async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                resolve();
            };
            script.onerror = () => reject(new Error("Failed to load PDF parsing library."));
            document.head.appendChild(script);
        });
    } else {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    return fullText;
}

// Display questions JSON schema specification guide modal
function showJsonSchemaHelpModal() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
        <div class="modal-content" style="max-width: 650px; text-align: left; padding: 2rem;">
            <div class="modal-title" style="color: hsl(239, 84%, 67%); display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem;">
                <i class="fas fa-info-circle"></i> Questions JSON Import Schema
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0 1rem 0; line-height: 1.5;">
                To import questions, upload a <code>.json</code> file containing either a single question object or an array of question objects matching the format below.
            </p>
            <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px; max-height: 320px; overflow-y: auto; font-family: monospace; font-size: 0.8rem; color: var(--text-primary); border: 1px solid var(--border-color); line-height: 1.6;">
                <pre><code id="schema-code-block">[
  {
    "text": "What is 2 + 2?",
    "type": "single",
    "options": ["3", "4", "5"],
    "answer": 1,
    "explanation": "2 + 2 is equal to 4.",
    "sectionName": "General"
  },
  {
    "text": "Which of these are programming languages?",
    "type": "multi",
    "options": ["Python", "HTML", "C++", "JSON"],
    "answers": [0, 2],
    "explanation": "Python and C++ are programming languages.",
    "sectionName": "General"
  },
  {
    "text": "What is the capital of France?",
    "type": "text",
    "answer": "Paris",
    "explanation": "Paris is the capital of France.",
    "sectionName": "General"
  },
  {
    "text": "Write a function isOdd(n) that checks if n is odd.",
    "type": "code",
    "language": "Python",
    "template": "def isOdd(n):\\n    pass",
    "assertions": [
      { "input": ["3"], "expected": "True" },
      { "input": ["4"], "expected": "False" }
    ],
    "explanation": "Use modulo operator.",
    "sectionName": "Coding"
  }
]</code></pre>
            </div>
            <div class="modal-actions" style="display: flex; gap: 0.75rem; width: 100%; margin-top: 1.5rem;">
                <button class="btn btn-secondary" id="modal-help-copy" style="flex: 1; justify-content: center;">
                    <i class="far fa-copy"></i> Copy Schema
                </button>
                <button class="btn btn-primary" id="modal-help-close" style="flex: 1; justify-content: center;">Close</button>
            </div>
        </div>
    `;

    overlay.querySelector("#modal-help-close").addEventListener("click", () => {
        overlay.remove();
    });

    overlay.querySelector("#modal-help-copy").addEventListener("click", () => {
        const codeText = overlay.querySelector("#schema-code-block").innerText;
        navigator.clipboard.writeText(codeText).then(() => {
            showToast("Schema copied to clipboard!", "success");
        });
    });

    document.body.appendChild(overlay);
}

