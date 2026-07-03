/* -------------------------------------------------------------
   TestAbhi - Firebase Firestore Database Layer
   (Replaces localStorage — data is now shared across all devices)
------------------------------------------------------------- */

import { db } from './firebase.js';
import {
    collection, doc, getDoc, getDocs, setDoc, addDoc, writeBatch, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// =============================================================
// In-memory cache — populated on initDB(), reads are sync-fast
// =============================================================
const cache = {
    tests: [],
    users: {},
    proctor_logs: []
};

const DEFAULT_TESTS = [
    {
        id: "web-dev-basics",
        title: "JavaScript & DOM Basics",
        description: "Test your understanding of Modern JavaScript ES6+, asynchronous operations, events, and DOM manipulation techniques.",
        duration: 15, // in minutes
        difficulty: "medium",
        questions: [
            {
                id: "q1",
                type: "single",
                text: "Which of the following is correct about the differences between 'var', 'let', and 'const'?",
                options: [
                    "var is block-scoped, let and const are function-scoped.",
                    "let and const are block-scoped, var is function-scoped.",
                    "const variables can be re-assigned at any point.",
                    "All of them are hoisted without temporal dead zone behavior."
                ],
                answer: 1, // index of correct option
                explanation: "let and const are block-scoped. var is function-scoped (or globally scoped if defined outside functions) and is hoisted with undefined initialization."
            },
            {
                id: "q2",
                type: "single",
                text: "What will be the output of: console.log(typeof NaN)?",
                options: [
                    "\"number\"",
                    "\"NaN\"",
                    "\"undefined\"",
                    "\"object\""
                ],
                answer: 0,
                explanation: "Although NaN stands for 'Not-a-Number', its type in JavaScript is actually 'number'."
            },
            {
                id: "q3",
                type: "multi",
                text: "Select all features introduced in ES6 (ECMAScript 2015). (Select all that apply)",
                options: [
                    "Arrow Functions",
                    "Classes",
                    "Promises",
                    "async / await syntax"
                ],
                answers: [0, 1, 2], // indices of correct options (multiple)
                explanation: "Arrow functions, Classes, and Promises were introduced in ES6. The async/await syntax was introduced later in ES8 (ES2017)."
            },
            {
                id: "q4",
                type: "single",
                text: "How do you prevent a form from submitting automatically upon a button click?",
                options: [
                    "event.stopPropagate()",
                    "event.halt()",
                    "event.preventDefault()",
                    "return false inside an event listener alone is always standard"
                ],
                answer: 2,
                explanation: "event.preventDefault() stops the default browser action, which for a submit button is form submission."
            },
            {
                id: "q5",
                type: "text",
                text: "Write the name of the built-in JavaScript method used to convert a JSON string into a JavaScript object.",
                answer: "JSON.parse",
                explanation: "JSON.parse() deserializes a JSON string into a JavaScript object."
            }
        ]
    },
    {
        id: "ui-ux-design",
        title: "Aesthetic UI & UX Principles",
        description: "Evaluate your visual design thinking. Questions explore HSL color theory, visual hierarchy, layout grid alignments, and animation principles.",
        duration: 10,
        difficulty: "easy",
        questions: [
            {
                id: "u1",
                type: "single",
                text: "In HSL color representation, what does the 'L' stand for?",
                options: [
                    "Luminescence",
                    "Lightness",
                    "Linearity",
                    "Luminance"
                ],
                answer: 1,
                explanation: "HSL stands for Hue, Saturation, and Lightness."
            },
            {
                id: "u2",
                type: "single",
                text: "What is the primary benefit of using a glassmorphic background design on high-contrast cards?",
                options: [
                    "It speeds up browser rendering times.",
                    "It improves visual depth and lets background colors bleed through harmoniously.",
                    "It removes the need for typography definitions.",
                    "It makes the page automatically responsive without CSS media queries."
                ],
                answer: 1,
                explanation: "Glassmorphism creates depth using transparency, background blur, and fine borders, creating an elegant layering effect."
            },
            {
                id: "u3",
                type: "single",
                text: "Which font weight corresponds to 'Regular' in standard CSS?",
                options: [
                    "300",
                    "400",
                    "500",
                    "600"
                ],
                answer: 1,
                explanation: "Regular or normal font weight corresponds to a numeric value of 400."
            }
        ]
    },
    {
        id: "js-coding-challenge",
        title: "JavaScript Coding Challenge",
        description: "Write clean, logic-driven JavaScript code to pass active test suites. Practice functional algorithms.",
        duration: 20,
        difficulty: "hard",
        questions: [
            {
                id: "c1",
                type: "code",
                text: "Write a function named 'reverseString(str)' that accepts a string and returns it reversed (e.g., reverseString('hello') should return 'olleh').",
                template: "function reverseString(str) {\n    // Write your code here\n    \n}",
                assertions: [
                    { input: ["'hello'"], expected: "'olleh'" },
                    { input: ["'TestAbhi'"], expected: "'ihbAtseT'" }
                ],
                explanation: "Strings can be split into an array, reversed, and joined back together: str.split('').reverse().join('')"
            },
            {
                id: "c2",
                type: "code",
                text: "Write a function named 'isEven(num)' that returns true if a number is even, and false otherwise.",
                template: "function isEven(num) {\n    // Write your code here\n    \n}",
                assertions: [
                    { input: [4], expected: "true" },
                    { input: [7], expected: "false" }
                ],
                explanation: "Use the modulo operator: return num % 2 === 0;"
            }
        ]
    },
    {
        id: "section-wise-mock",
        title: "Section-Wise Mock Assessment",
        description: "A demonstration of section-locked exam rooms. Consists of an Aptitude section and a Technical Theory section.",
        duration: 5,
        difficulty: "medium",
        sectionWiseTiming: true,
        sections: [
            { name: "Aptitude & Logic", duration: 2 },
            { name: "Technical Theory", duration: 3 }
        ],
        questions: [
            {
                id: "sm-q1",
                type: "multi",
                text: "Which of the following numbers are prime?",
                options: [ "2", "9", "15", "17" ],
                answers: [0, 3],
                sectionName: "Aptitude & Logic",
                sectionDuration: 2,
                explanation: "2 and 17 are prime numbers. 9 and 15 are composite numbers."
            },
            {
                id: "sm-q2",
                type: "single",
                text: "A train traveling at 60 km/h passes a post in 9 seconds. What is the length of the train in meters?",
                options: [ "120", "150", "180", "200" ],
                answer: 1,
                sectionName: "Aptitude & Logic",
                sectionDuration: 2,
                explanation: "Speed = 60 * 5/18 = 50/3 m/s. Length = Speed * Time = (50/3) * 9 = 150 meters."
            },
            {
                id: "sm-q3",
                type: "multi",
                text: "Which of the following shapes are polygons?",
                options: [ "Triangle", "Circle", "Rectangle", "Hexagon" ],
                answers: [0, 2, 3],
                sectionName: "Aptitude & Logic",
                sectionDuration: 2,
                explanation: "A polygon is a closed shape with straight sides. Circles have curved sides, so they are not polygons."
            },
            {
                id: "sm-q4",
                type: "single",
                text: "What is the next number in the sequence: 2, 6, 12, 20, 30, ...?",
                options: [ "36", "40", "42", "48" ],
                answer: 2,
                sectionName: "Aptitude & Logic",
                sectionDuration: 2,
                explanation: "The differences between consecutive terms are 4, 6, 8, 10. The next difference is 12, so 30 + 12 = 42."
            },
            {
                id: "sm-q5",
                type: "multi",
                text: "Select all numbers divisible by both 3 and 4:",
                options: [ "12", "18", "24", "36" ],
                answers: [0, 2, 3],
                sectionName: "Aptitude & Logic",
                sectionDuration: 2,
                explanation: "Numbers divisible by both 3 and 4 must be multiples of 12. 12, 24, and 36 are multiples of 12."
            },
            {
                id: "sm-q6",
                type: "multi",
                text: "Which of the following are relational database management systems (RDBMS)?",
                options: [ "MySQL", "PostgreSQL", "MongoDB", "Oracle" ],
                answers: [0, 1, 3],
                sectionName: "Technical Theory",
                sectionDuration: 3,
                explanation: "MySQL, PostgreSQL, and Oracle are SQL relational databases. MongoDB is a NoSQL document database."
            },
            {
                id: "sm-q7",
                type: "single",
                text: "In CSS, which property is used to change the background color of an element?",
                options: [ "color", "background-color", "bgcolor", "background-image" ],
                answer: 1,
                sectionName: "Technical Theory",
                sectionDuration: 3,
                explanation: "background-color is the standard CSS property to change background color."
            },
            {
                id: "sm-q8",
                type: "multi",
                text: "Which HTML tags are used to construct table rows and cells?",
                options: [ "<tr>", "<td>", "<th>", "<tb>" ],
                answers: [0, 1, 2],
                sectionName: "Technical Theory",
                sectionDuration: 3,
                explanation: "<tr> (row), <td> (cell), and <th> (header cell) are standard. <tb> is not a valid HTML tag."
            },
            {
                id: "sm-q9",
                type: "single",
                text: "Which HTTP status code represents a successful request?",
                options: [ "200", "301", "400", "404" ],
                answer: 0,
                sectionName: "Technical Theory",
                sectionDuration: 3,
                explanation: "200 OK is the standard HTTP status code for successful HTTP requests."
            },
            {
                id: "sm-q10",
                type: "multi",
                text: "Which of the following are server-side programming environments/languages?",
                options: [ "Node.js", "React", "Python", "HTML5" ],
                answers: [0, 2],
                sectionName: "Technical Theory",
                sectionDuration: 3,
                explanation: "Node.js and Python run on the backend. React and HTML5 are frontend client-side technologies."
            }
        ]
    }
];

const DEFAULT_USERS = {
    "student": {
        role: "student",
        password: "student123",
        name: "Abhisar Sharma",
        history: [
            {
                testId: "ui-ux-design",
                testTitle: "Aesthetic UI & UX Principles",
                score: 100,
                totalQuestions: 3,
                correctCount: 3,
                timeSpent: 120, // in seconds
                date: "2026-07-02"
            }
        ]
    },
    "faculty": {
        role: "faculty",
        password: "faculty123",
        name: "Professor Sharma",
        history: []
    },
    "admin": {
        role: "admin",
        password: "admin123",
        name: "System Admin",
        history: []
    }
};

const DEFAULT_PROCTOR_LOGS = [
    {
        id: "log-1",
        timestamp: "2026-07-03T10:14:00Z",
        studentName: "Abhisar Sharma",
        testTitle: "Aesthetic UI & UX Principles",
        event: "Tab Switched / Out of Focus",
        severity: "medium"
    }
];

// Promise timeout wrapper
function withTimeout(promise, ms, errorMessage) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage || "Timeout")), ms))
    ]);
}

// Test basic Firestore connectivity before full init
async function testFirestoreConnectivity() {
    try {
        const testRef = doc(db, 'app_meta', 'config');
        await withTimeout(getDoc(testRef), 15000, 
            "⏱️ Connection Timeout: Firebase is not responding.\n\n" +
            "STEPS TO FIX:\n" +
            "1. Go to https://console.firebase.google.com\n" +
            "2. Open your project → Build → Firestore Database\n" +
            "3. If database doesn't exist → click 'Create database' → choose 'Start in test mode'\n" +
            "4. If it exists → click 'Rules' tab → set rules to allow all reads/writes:\n" +
            "   rules_version = '2';\n" +
            "   service cloud.firestore {\n" +
            "     match /databases/{database}/documents {\n" +
            "       match /{document=**} { allow read, write: if true; }\n" +
            "     }\n" +
            "   }\n" +
            "5. Click 'Publish' and refresh this page."
        );
        return true;
    } catch (e) {
        throw e;
    }
}

// Initialize Storage
export async function initDB() {
    const timeoutMs = 15000; // 15 seconds — generous for slower connections
    
    // Check if Firestore has been seeded before
    const metaRef = doc(db, 'app_meta', 'config');
    const metaSnap = await withTimeout(
        getDoc(metaRef), 
        timeoutMs, 
        "⏱️ Connection Timeout: Firebase Firestore is not responding.\n\n" +
        "Please follow these steps:\n" +
        "1. Visit https://console.firebase.google.com and open your project.\n" +
        "2. Go to Build → Firestore Database.\n" +
        "3. If no database exists, click 'Create database' and choose 'Start in test mode'.\n" +
        "4. If it already exists, click the 'Rules' tab and update rules to:\n" +
        "   allow read, write: if true;\n" +
        "5. Click 'Publish', then refresh this page."
    );

    if (!metaSnap.exists() || !metaSnap.data().initialized) {
        // Seed default data using batch write
        const batch = writeBatch(db);

        DEFAULT_TESTS.forEach(test => {
            batch.set(doc(db, 'tests', test.id), JSON.parse(JSON.stringify(test)));
        });

        Object.keys(DEFAULT_USERS).forEach(username => {
            batch.set(doc(db, 'users', username), DEFAULT_USERS[username]);
        });

        DEFAULT_PROCTOR_LOGS.forEach(log => {
            batch.set(doc(db, 'proctor_logs', log.id), log);
        });

        batch.set(metaRef, { initialized: true });
        await withTimeout(batch.commit(), timeoutMs, "Failed to write initial data to Firestore. Check your Firestore rules.");
    }

    // Fast Startup: ONLY fetch tests list (which is required by the dashboard shells)
    const testsSnap = await withTimeout(
        getDocs(collection(db, 'tests')), 
        timeoutMs, 
        "Failed to load assessment collections from Firestore."
    );
    cache.tests = testsSnap.docs.map(d => d.data());
    
    // Clear user and logs cache — populated dynamically later
    cache.users = {};
    cache.proctor_logs = [];
}


// =======================
// Async demand fetchers (Populates cache dynamically on-demand)
// =======================
export async function fetchCurrentUser(username) {
    const cleanUsername = username.toLowerCase().trim();
    const userRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        cache.users[cleanUsername] = userData;
        return { username: cleanUsername, ...userData };
    }
    return null;
}

export async function fetchAllUsers() {
    const usersSnap = await getDocs(collection(db, 'users'));
    cache.users = {};
    usersSnap.docs.forEach(d => {
        cache.users[d.id] = d.data();
    });
    return cache.users;
}

export async function fetchAllProctorLogs() {
    const logsSnap = await getDocs(collection(db, 'proctor_logs'));
    cache.proctor_logs = logsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return cache.proctor_logs;
}

// =======================
// Sync reads (from cache)
// =======================
export function getTests() { return cache.tests; }
export function getUsers() { return cache.users; }
export function getProctorLogs() { return cache.proctor_logs; }

// =======================
// Async writes (Firestore + update cache)
// =======================
export async function saveTests(tests) {
    cache.tests = tests;

    // Get existing test IDs in Firestore
    const existingSnap = await getDocs(collection(db, 'tests'));
    const existingIds = existingSnap.docs.map(d => d.id);
    const newIds = tests.map(t => t.id);
    const toDelete = existingIds.filter(id => !newIds.includes(id));

    const batch = writeBatch(db);
    tests.forEach(test => batch.set(doc(db, 'tests', test.id), JSON.parse(JSON.stringify(test))));
    toDelete.forEach(id => batch.delete(doc(db, 'tests', id)));
    await batch.commit();
}

export async function saveUsers(users) {
    cache.users = users;
    const batch = writeBatch(db);
    Object.keys(users).forEach(username => {
        batch.set(doc(db, 'users', username), users[username]);
    });
    await batch.commit();
}

export async function addProctorLog(log) {
    log.id = 'log-' + Date.now();
    log.timestamp = new Date().toISOString();
    cache.proctor_logs.unshift(log);
    await addDoc(collection(db, 'proctor_logs'), log);
}

// ==================
// Auth helpers
// ==================
export async function authenticateUser(username, password) {
    const cleanUsername = username.toLowerCase().trim();
    const userRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const user = userSnap.data();
        if (user.password === password) {
            cache.users[cleanUsername] = user;
            return { username: cleanUsername, ...user };
        }
    }
    return null;
}

export async function registerUser(username, password, name, role) {
    const cleanUsername = username.toLowerCase().trim();

    if (cleanUsername === 'admin' || role === 'admin') {
        return { success: false, message: "Cannot register a new Administrator account." };
    }

    const userRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { success: false, message: "Username already exists. Please choose another." };
    }

    const newUser = { role, password, name: name.trim(), history: [] };
    cache.users[cleanUsername] = newUser;
    await setDoc(userRef, newUser);
    return { success: true, message: "Registration successful! You can now sign in." };
}

export async function updateUserProfile(username, newName, newPassword) {
    const cleanUsername = username.toLowerCase().trim();
    const userRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (newName) userData.name = newName.trim();
        if (newPassword) userData.password = newPassword;
        cache.users[cleanUsername] = userData;
        await setDoc(userRef, userData);
        return { success: true, message: "Profile updated successfully!" };
    }
    return { success: false, message: "User not found." };
}

export async function saveTestAttempt(username, attempt) {
    const cleanUsername = username.toLowerCase().trim();
    const userRef = doc(db, 'users', cleanUsername);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        if (!userData.history) userData.history = [];
        userData.history.unshift(attempt);
        cache.users[cleanUsername] = userData;
        await setDoc(userRef, userData);
        return true;
    }
    return false;
}

