/* -------------------------------------------------------------
   TestAbhi - Utility Functions & Toast System
------------------------------------------------------------- */

/**
 * Display a premium floating notification toast on the bottom right.
 * @param {string} message - Notification text
 * @param {'success' | 'error' | 'warning' | 'info'} type - Toast theme
 * @param {number} duration - Display duration in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Choose icon depending on type
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    else if (type === 'error') iconClass = 'fa-times-circle';
    else if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

/**
 * Convert seconds into MM:SS format.
 * @param {number} totalSeconds 
 * @returns {string} Formatted string
 */
export function formatTime(totalSeconds) {
    if (totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Simple HTML Escaper to prevent raw content issues.
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * Format ISO datetime string to user-friendly local date.
 */
export function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format question text to render code snippets beautifully inside pre/code blocks.
 * Escapes HTML characters (e.g. angle brackets) first to prevent browser rendering issues.
 */
export function formatQuestionText(text) {
    if (!text) return "";
    
    // Check if the text contains code wrapped in triple-backticks
    const codeBlockRegex = /```(?:[a-zA-Z0-9+#-]+)?\n([\s\S]*?)\n```/g;
    if (codeBlockRegex.test(text)) {
        return text.replace(codeBlockRegex, (match, code) => {
            return `<pre class="embedded-code-block"><code>${escapeHtml(code)}</code></pre>`;
        }).replace(/\n/g, "<br>");
    }

    // Heuristically detect formatting blocks of code if no backticks are present
    const lines = text.split("\n");
    let insideCode = false;
    let htmlOut = "";
    let codeBlock = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isCodeLine = /^\s*(#include|int\s+main|char\s+|float\s+|double\s+|using\s+namespace|printf|scanf|cout|cin|std::|public\s+class|public\s+static\s+void|system\.out|import\s+|def\s+|elif\s+|print\(|class\s+[A-Za-z0-9_]+\s*[:{]|\{|\}|\/\/|#|<html>|<head>|<body>|div\s*\{|p\s*\{|\.[\w-]+\s*\{|#[\w-]+\s*\{|const\s+\w+\s*=|let\s+\w+\s*=)/.test(line) 
            || (insideCode && line.trim() !== "" && !/^[A-D]\)/.test(line.trim()));

        if (isCodeLine) {
            if (!insideCode) {
                insideCode = true;
            }
            codeBlock.push(line);
        } else {
            if (insideCode) {
                htmlOut += `<pre class="embedded-code-block"><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`;
                codeBlock = [];
                insideCode = false;
            }
            htmlOut += escapeHtml(line) + "<br>";
        }
    }
    if (insideCode && codeBlock.length > 0) {
        htmlOut += `<pre class="embedded-code-block"><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`;
    }
    return htmlOut;
}

/**
 * Validate and normalize a raw question object from JSON import.
 * @param {Object} item - Raw question object
 * @param {number} idx - Index in list (0-based) for error messages
 * @returns {Object} Normalized question object
 * @throws {Error} Detailed error message if validation fails
 */
export function validateAndNormalizeQuestion(item, idx = 0) {
    if (!item || typeof item !== 'object') {
        throw new Error(`Question #${idx + 1}: Invalid format (must be a JSON object).`);
    }

    if (!item.text || !String(item.text).trim()) {
        throw new Error(`Question #${idx + 1}: Missing required field 'text'.`);
    }

    if (!item.type) {
        throw new Error(`Question #${idx + 1}: Missing required field 'type'.`);
    }

    const validTypes = ['single', 'multi', 'text', 'code'];
    const type = String(item.type).toLowerCase().trim();
    if (!validTypes.includes(type)) {
        throw new Error(`Question #${idx + 1}: Invalid type "${item.type}". Allowed types: ${validTypes.join(', ')}.`);
    }

    const normalized = {
        text: String(item.text).trim(),
        type: type,
        explanation: item.explanation ? String(item.explanation).trim() : '',
        sectionName: item.sectionName ? String(item.sectionName).trim() : 'General',
        sectionDuration: item.sectionDuration ? Math.max(1, parseInt(item.sectionDuration, 10) || 5) : 5
    };

    if (item.id) {
        normalized.id = String(item.id).trim();
    }

    // Single choice question
    if (type === 'single') {
        if (!Array.isArray(item.options) || item.options.length < 2) {
            throw new Error(`Question #${idx + 1} (single-choice): Must have an 'options' array with at least 2 choices.`);
        }
        normalized.options = item.options.map(o => String(o).trim());

        const rawAns = item.answer !== undefined ? item.answer : (Array.isArray(item.answers) ? item.answers[0] : 0);
        let ansIdx = parseAnswerIndex(rawAns, normalized.options);

        if (ansIdx === -1) {
            throw new Error(`Question #${idx + 1} (single-choice): Invalid answer "${rawAns}". Could not match with provided options.`);
        }
        normalized.answer = ansIdx;

    // Multiple choice question
    } else if (type === 'multi') {
        if (!Array.isArray(item.options) || item.options.length < 2) {
            throw new Error(`Question #${idx + 1} (multi-choice): Must have an 'options' array with at least 2 choices.`);
        }
        normalized.options = item.options.map(o => String(o).trim());

        const rawAnswers = Array.isArray(item.answers) ? item.answers : (item.answer !== undefined ? [item.answer] : []);
        if (rawAnswers.length === 0) {
            throw new Error(`Question #${idx + 1} (multi-choice): Must specify an 'answers' array.`);
        }

        normalized.answers = rawAnswers.map((rawAns, aIdx) => {
            const ansIdx = parseAnswerIndex(rawAns, normalized.options);
            if (ansIdx === -1) {
                throw new Error(`Question #${idx + 1} (multi-choice): Invalid answer #${aIdx + 1} "${rawAns}". Could not match with options.`);
            }
            return ansIdx;
        });

    // Short text question
    } else if (type === 'text') {
        if (item.answer === undefined || item.answer === null || String(item.answer).trim() === '') {
            throw new Error(`Question #${idx + 1} (short-text): Must specify an 'answer' string.`);
        }
        normalized.answer = String(item.answer).trim();

    // Code question
    } else if (type === 'code') {
        normalized.language = item.language ? String(item.language).trim() : 'JavaScript';
        normalized.template = item.template ? String(item.template) : '';

        if (Array.isArray(item.options) && item.options.length >= 2) {
            normalized.options = item.options.map(o => String(o).trim());
            const rawAns = item.answer !== undefined ? item.answer : 0;
            const ansIdx = parseAnswerIndex(rawAns, normalized.options);
            if (ansIdx === -1) {
                throw new Error(`Question #${idx + 1} (code choice): Invalid answer "${rawAns}". Could not match with options.`);
            }
            normalized.answer = ansIdx;
        } else if (item.answer !== undefined && item.answer !== null) {
            normalized.answer = String(item.answer).trim();
        }

        if (Array.isArray(item.assertions)) {
            normalized.assertions = item.assertions.map(ast => ({
                input: Array.isArray(ast.input) ? ast.input.map(String) : [String(ast.input || '')],
                expected: String(ast.expected || '')
            }));
        }
    }

    return normalized;
}

/**
 * Helper to match an answer specification (number index, letter like 'A'/'B', or option text) to option array index.
 */
function parseAnswerIndex(rawAns, options) {
    if (rawAns === undefined || rawAns === null) return -1;

    // 1. Direct numeric check
    const parsedNum = parseInt(rawAns, 10);
    if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < options.length) {
        return parsedNum;
    }

    const cleanAns = String(rawAns).trim();

    // 2. Letter match: A, B, C, D...
    const letterMatch = cleanAns.toUpperCase().match(/^([A-Z])$|^ANSWER:\s*\(([A-Z])\)$|^\(([A-Z])\)$/i);
    if (letterMatch) {
        const letter = (letterMatch[1] || letterMatch[2] || letterMatch[3]).toUpperCase();
        const computedIdx = letter.charCodeAt(0) - 65;
        if (computedIdx >= 0 && computedIdx < options.length) {
            return computedIdx;
        }
    }

    // 3. Exact match in options (case insensitive)
    const exactMatch = options.findIndex(opt => opt.trim().toLowerCase() === cleanAns.toLowerCase());
    if (exactMatch !== -1) return exactMatch;

    // 4. Substring match
    const subMatch = options.findIndex(opt => opt.trim().toLowerCase().includes(cleanAns.toLowerCase()) || cleanAns.toLowerCase().includes(opt.trim().toLowerCase()));
    if (subMatch !== -1) return subMatch;

    return -1;
}


