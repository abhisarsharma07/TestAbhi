import { renderAdminDashboard } from './adminDashboard.js';

export function renderFacultyDashboard(user) {
    // Faculty uses the full admin/test-creator dashboard
    // but with a faculty-specific welcome override
    const dashboardNode = renderAdminDashboard(user);

    // Override the welcome banner with faculty-branded copy
    const banner = dashboardNode.querySelector(".welcome-banner h1");
    if (banner) {
        banner.textContent = `Welcome, ${user.name}`;
    }
    const bannerSub = dashboardNode.querySelector(".welcome-banner p");
    if (bannerSub) {
        bannerSub.textContent = "Create, manage, and publish assessments for your students.";
    }

    return dashboardNode;
}
