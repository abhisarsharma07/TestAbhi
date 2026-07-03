/* -------------------------------------------------------------
   TestAbhi - Admin / Teacher Console & Test Creator
------------------------------------------------------------- */

import { getTests, saveTests, getProctorLogs } from '../db.js';
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
            <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr);">
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
                <div class="ai-panel-header" style="justify-content: space-between; display: flex; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <i class="fas fa-robot" style="animation: pulse-glow 2s infinite;"></i>
                        <h3>AI Conversational Agent Assistant</h3>
                    </div>
                    <button class="btn btn-secondary" id="reset-chat-btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-color: rgba(255,255,255,0.1);">
                        <i class="fas fa-sync-alt"></i> Reset Chat
                    </button>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: -0.75rem; line-height: 1.5;">
                    Chat with the AI Agent below to generate dynamic questions. Specify a topic, formats (multiple choice, checkbox, code tasks), or count, and review proposed outputs.
                </p>
                
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
                
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.5rem; width: 100%;">
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

                <div style="display: flex; gap: 1rem; width: 100%;">
                    <button class="btn btn-secondary" id="add-question-btn" style="flex: 1;">
                        <i class="fas fa-plus-circle"></i> Add Question Card
                    </button>
                    <button class="btn btn-success" id="save-test-btn" style="flex: 1;">
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

        // Chat Interface Elements
        const chatInput = paneBuilder.querySelector("#ai-chat-input");
        const chatSendBtn = paneBuilder.querySelector("#ai-chat-send-btn");
        const resetChatBtn = paneBuilder.querySelector("#reset-chat-btn");
        const loadDraftsBtn = paneBuilder.querySelector("#ai-load-drafts-btn");

        // Send handles
        const handleSend = () => {
            const userText = chatInput.value.trim();
            if (!userText) return;

            // 1. User Message
            chatHistory.push({ sender: 'user', text: userText });
            chatInput.value = '';
            renderChatMessages();

            // 2. Simulated typing indicator
            chatHistory.push({ sender: 'agent', isTyping: true });
            renderChatMessages();

            // 3. Process dialogue logic
            setTimeout(() => {
                // Remove typing bubble
                chatHistory = chatHistory.filter(m => !m.isTyping);

                let reply = '';
                const lower = userText.toLowerCase();

                // High-priority check: does input look like a raw copy-pasted question list?
                const hasAnswers = lower.includes("correct answer:") || lower.includes("correct answer") || lower.includes("ans:");
                const hasOptions = (lower.includes("a)") && lower.includes("b)")) || (lower.includes("a.") && lower.includes("b."));
                
                if (hasAnswers && hasOptions) {
                    const parsed = parseRawQuestions(userText);
                    if (parsed.questions.length > 0) {
                        proposedQuestionsList = parsed.questions;
                        proposedSectionsList = parsed.sections;
                        chatTopic = "Custom Trivia Quiz";
                        chatCount = parsed.questions.length;
                        chatPhase = 2; // Finalized state ready to load
                        
                        let reply = `I detected a list of raw questions! I have successfully parsed **${parsed.questions.length}** questions${parsed.sections.length > 0 ? ` across **${parsed.sections.length}** sections` : ''} from your copy-pasted text.\n\n`;
                        
                        if (parsed.sections.length > 0) {
                            reply += `**Parsed Sections:**\n` + 
                                parsed.sections.map(s => `- **${s.name}**: ${s.duration} minutes (${parsed.questions.filter(q => q.sectionName === s.name).length} questions)`).join('\n') + `\n\n`;
                        }
                        
                        reply += `**Questions Structured:**\n` +
                            parsed.questions.map((q, idx) => {
                                const ansLabel = q.type === 'multi' 
                                    ? q.answers.map(a => String.fromCharCode(65 + a)).join(', ') 
                                    : String.fromCharCode(65 + q.answer);
                                return `${idx + 1}. [${q.type.toUpperCase()}] ${q.text} (Section: *${q.sectionName}*, Answer: ${ansLabel})`;
                            }).join('\n') +
                            `\n\nClick the **Load Proposed Questions into Editor** button below to sync them to the Verification Panel so you can manually check and publish the assessment!`;
                        
                        chatHistory.push({ sender: 'agent', text: reply });
                        renderChatMessages();
                        return;
                    }
                }

                if (chatPhase === 0) {
                    // Set topic
                    chatTopic = userText;
                    chatPhase = 1;
                    reply = `Awesome choice: **${chatTopic}**! Let's configure the structure.\n\nShould we include **Multiple Choice** questions, **Multiple Response** (checkmarks), **JavaScript Coding Tasks**, or a **Mixed Format** (a blend of everything)?`;
                } else if (chatPhase === 1) {
                    // Set format
                    if (lower.includes("code") || lower.includes("coding") || lower.includes("task")) {
                        chatFormat = 'code';
                    } else if (lower.includes("multi") || lower.includes("response") || lower.includes("check")) {
                        chatFormat = 'multi';
                    } else if (lower.includes("single") || lower.includes("radio") || lower.includes("choice")) {
                        chatFormat = 'single';
                    } else {
                        chatFormat = 'mix';
                    }

                    // Generate proposed questions
                    proposedQuestionsList = generateMockQuestions(chatTopic, chatCount, chatFormat);
                    chatPhase = 2;

                    reply = `I have successfully drafted a **${chatFormat.toUpperCase()}** format exam on **${chatTopic}** with **${chatCount}** questions!\n\nHere is a quick summary of the generated items:\n` +
                        proposedQuestionsList.map((q, idx) => `${idx + 1}. [${q.type.toUpperCase()}] ${q.text.slice(0, 60)}...`).join('\n') +
                        `\n\nTo load these into the editor workspace, click the **Load Proposed Questions into Editor** button below! You can also tell me to "change count to 5" or "make it coding only" to refine it.`;
                } else {
                    // Adjustments in phase 2
                    // Parse counts
                    const numMatch = lower.match(/\b([1-9]|10)\b/);
                    if (numMatch) {
                        chatCount = parseInt(numMatch[0], 10);
                    }
                    // Parse format
                    if (lower.includes("code") || lower.includes("coding")) {
                        chatFormat = 'code';
                    } else if (lower.includes("multi") || lower.includes("checkbox")) {
                        chatFormat = 'multi';
                    } else if (lower.includes("single") || lower.includes("radio") || lower.includes("choice")) {
                        chatFormat = 'single';
                    } else if (lower.includes("mixed") || lower.includes("mix")) {
                        chatFormat = 'mix';
                    }

                    // Re-generate
                    proposedQuestionsList = generateMockQuestions(chatTopic, chatCount, chatFormat);

                    reply = `I've updated the draft according to your adjustments (Count: **${chatCount}**, Format: **${chatFormat.toUpperCase()}**).\n\nHere is the updated draft summary:\n` +
                        proposedQuestionsList.map((q, idx) => `${idx + 1}. [${q.type.toUpperCase()}] ${q.text.slice(0, 60)}...`).join('\n') +
                        `\n\nClick the load button below to sync with the verification panel!`;
                }

                chatHistory.push({ sender: 'agent', text: reply });
                renderChatMessages();
            }, 1200);
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

        // Sync drafts to manual verification editor
        loadDraftsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (proposedQuestionsList.length === 0) return;

            // Fill text fields
            paneBuilder.querySelector("#test-title").value = `${chatTopic.charAt(0).toUpperCase() + chatTopic.slice(1)} Test`;
            paneBuilder.querySelector("#test-desc").value = `AI Conversational Draft covering ${chatTopic} metrics.`;

            // Load sections
            builderSections = proposedSectionsList.length > 0 
                ? [...proposedSectionsList] 
                : [{ name: 'General', duration: 15 }];
                
            // Check the "Enable Section-Wise Timing" checkbox if multiple sections were parsed!
            const checkSectionTiming = proposedSectionsList.length > 1;
            const timingCheckbox = paneBuilder.querySelector("#test-section-wise-timing");
            const managerWrapper = paneBuilder.querySelector("#builder-sections-manager-wrapper");
            
            timingCheckbox.checked = checkSectionTiming;
            if (checkSectionTiming) {
                managerWrapper.style.display = "block";
            } else {
                managerWrapper.style.display = "none";
            }

            // Load questions
            builderQuestions = [...proposedQuestionsList];
            
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

    // Helper: Parse raw copy-pasted questions text block
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
                duration: 5 // default
            });
        });
        
        // Match: Question Body, Option A, Option B, Option C, Option D, Correct Answer Letter(s)
        const globalMcqRegex = /([\s\S]+?)\s*[A]\s*[\.\)]\s*([\s\S]+?)\s*[B]\s*[\.\)]\s*([\s\S]+?)\s*[C]\s*[\.\)]\s*([\s\S]+?)\s*[D]\s*[\.\)]\s*([\s\S]+?)\s*(?:Correct Answer|Answer|Ans):\s*([A-D](?:\s*,\s*[A-D])*)/gi;
        
        const globalMatches = [...text.matchAll(globalMcqRegex)];
        
        if (globalMatches.length > 0) {
            globalMatches.forEach(m => {
                let qText = m[1].trim();
                const qIndex = m.index;
                
                // Find matching parsed section
                let assignedSection = null;
                for (let s = sectionsParsed.length - 1; s >= 0; s--) {
                    if (qIndex >= sectionsParsed[s].startIndex) {
                        assignedSection = sectionsParsed[s];
                        break;
                    }
                }
                
                const secName = assignedSection ? assignedSection.name : 'General';
                
                // 1. Strip section titles or headers (e.g. "Part B: Single Correct Answer...")
                qText = qText.replace(/Part\s+[A-Z]\s*:\s*[\s\S]+?(?=\d+\s*[\.\)]|$)/i, "").trim();
                
                // 2. Strip any introductory text before the first question number
                qText = qText.replace(/^[\s\S]+?(?=\b\d+\s*[\.\)])/i, "").trim();
                
                // 3. Clean leading numbers if any (e.g. "1. ", "10) ")
                qText = qText.replace(/^\s*\d+\s*[\.\)]\s*/, "").trim();
                
                // 4. Clean up previous answer leaks or orphaned symbols
                if (questions.length > 0) {
                    qText = qText.replace(/^\s*[\s\.,\)\(A-D]*\)?\s*/i, "").trim();
                }
                
                const rawOptions = [m[2], m[3], m[4], m[5]];
                const cleanedOptions = rawOptions.map(opt => {
                    // Strip trailing answer declarations if regex matched too lazily
                    return opt.split(/Correct Answer/i)[0].split(/Answer/i)[0].trim().replace(/\s+/g, ' ');
                });
                
                // Parse Correct Answer(s)
                const rawAnsStr = m[6].toUpperCase();
                const letters = rawAnsStr.split(',').map(l => l.trim());
                
                const isMulti = letters.length > 1;
                
                if (isMulti) {
                    const answersIdxs = letters.map(l => l.charCodeAt(0) - 65);
                    questions.push({
                        id: `parsed-q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        text: qText,
                        type: 'multi',
                        options: cleanedOptions,
                        answers: answersIdxs,
                        sectionName: secName,
                        sectionDuration: 5,
                        explanation: "Parsed dynamically from chat copy-paste (Multiple Response)."
                    });
                } else {
                    const answerIdx = letters[0].charCodeAt(0) - 65;
                    questions.push({
                        id: `parsed-q-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        text: qText,
                        type: 'single',
                        options: cleanedOptions,
                        answer: answerIdx,
                        sectionName: secName,
                        sectionDuration: 5,
                        explanation: "Parsed dynamically from chat copy-paste (Single Choice)."
                    });
                }
            });
        }
        
        // Auto compute durations based on assigned questions count
        sectionsParsed.forEach(sec => {
            const count = questions.filter(q => q.sectionName === sec.name).length;
            sec.duration = Math.max(2, count * 2); // 2 minutes per question, minimum of 2 minutes
        });
        
        // Update sectionDuration variables on questions matching each section
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

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
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
                ${builderSections.length > 1 ? `
                    <button class="icon-btn delete-section-btn" data-index="${sIdx}" title="Delete section" style="color: hsl(355, 78%, 56%); background: none; border: none; cursor: pointer;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : '<div style="width: 28px;"></div>'}
            `;
            
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

        const newTest = {
            id,
            title: titleEl.value.trim(),
            description: descEl.value.trim() || "No description provided.",
            duration: parseInt(durationEl.value, 10) || 15,
            difficulty: diffEl.value,
            sectionWiseTiming,
            sections: sectionWiseTiming ? builderSections.map(s => ({
                name: s.name.trim(),
                duration: parseInt(s.duration, 10) || 5
            })) : [{ name: 'General', duration: parseInt(durationEl.value, 10) || 15 }],
            questions: builderQuestions.map((q, idx) => ({
                id: `bq-${idx}-${Date.now()}`,
                type: q.type,
                text: q.text.trim(),
                sectionName: q.sectionName || 'General',
                sectionDuration: parseInt(q.sectionDuration, 10) || 5,
                ...((q.type === 'single' || q.type === 'multi') ? { options: q.options.map(o => o.trim()) } : {}),
                ...(q.type === 'text' ? { answer: q.answer.trim() } : {}),
                ...(q.type === 'code' ? { template: q.template || '', assertions: q.assertions || [], answer: '' } : {}),
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


    // -------------------------------------------------------------
    // RENDER: Live Monitor Tab
    // -------------------------------------------------------------
    function renderMonitor() {
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

        paneMonitor.querySelector("#refresh-logs-btn").addEventListener("click", () => {
            const refreshedLogs = getProctorLogs();
            paneMonitor.querySelector("#proctor-logs-tbody").innerHTML = renderProctorRows(refreshedLogs);
            showToast("Proctoring log feed refreshed.", "info");
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
