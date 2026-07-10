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

