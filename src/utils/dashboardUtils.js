import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// SLA rules in minutes
export const SLA_RULES = {
    critical: { response: 10, resolution: 60 },
    high: { response: 60, resolution: 120 },
    medium: { response: 120, resolution: 360 },
    low: { response: 360, resolution: 1440 }
};

// Animated count-up hook
export function useCountUp(target, duration = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const startTime = performance.now();
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }
        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            setCount(Math.round(eased * target));
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(target);
            }
        }
        requestAnimationFrame(animate);
    }, [target, duration]);
    return count;
}

// Helper: Get week of month (1-based, calendar week)
export function getWeekOfMonth(date) {
    const d = new Date(date);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const dayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    // Calculate offset: if first day is not Sunday, week 1 is shorter
    const day = d.getDate();
    if (day <= (7 - dayOfWeek)) return 1;
    return Math.ceil((day - (7 - dayOfWeek)) / 7) + 1;
}

// Helper: Get month label (e.g., 'Jan 2024')
export function getMonthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
}

// Utility to compute KPI metrics from ticket data
export function computeKPIsForTickets(tickets) {
    let totalResponse = 0, totalResolution = 0, count = 0, breachedCount = 0;
    let openCount = 0, closedCount = 0;
    const details = tickets.map(ticket => {
        // Find created time
        const created = ticket.created?.toDate ? ticket.created.toDate() : (ticket.created ? new Date(ticket.created) : null);
        // Defensive assignedTo access
        const assignedTo = ticket.assignedTo;
        let assignedToEmail = undefined;
        if (assignedTo) {
            if (typeof assignedTo.get === 'function') {
                assignedToEmail = assignedTo.get('email');
            } else {
                assignedToEmail = assignedTo.email;
            }
        }

        // Find assignment time (first comment with 'Assigned to' or 'Ticket assigned to' and authorRole 'user' or 'system')
        let assigned = null;
        let resolved = null;
        if (ticket.comments && Array.isArray(ticket.comments)) {
            for (const c of ticket.comments) {
                if (
                    !assigned &&
                    c.message &&
                    (/assigned to/i.test(c.message)) &&
                    c.authorRole && (c.authorRole === 'user' || c.authorRole === 'system')
                ) {
                    assigned = c.timestamp?.toDate ? c.timestamp.toDate() : (c.timestamp ? new Date(c.timestamp) : null);
                }
                if (
                    !resolved &&
                    c.message &&
                    (/resolution updated/i.test(c.message)) &&
                    c.authorRole && c.authorRole === 'resolver'
                ) {
                    resolved = c.timestamp?.toDate ? c.timestamp.toDate() : (c.timestamp ? new Date(c.timestamp) : null);
                }
            }
        }
        // Fallback for assignment: use assignedTo.assignedAt or lastUpdated if not Open
        if (!assigned) {
            if (assignedTo && (assignedTo.assignedAt || (typeof assignedTo.get === 'function' && assignedTo.get('assignedAt')))) {
                const assignedAt = typeof assignedTo.get === 'function' ? assignedTo.get('assignedAt') : assignedTo.assignedAt;
                assigned = assignedAt?.toDate ? assignedAt.toDate() : (assignedAt ? new Date(assignedAt) : null);
            } else if (ticket.lastUpdated && ticket.status !== 'Open') {
                assigned = ticket.lastUpdated.toDate ? ticket.lastUpdated.toDate() : new Date(ticket.lastUpdated);
            }
        }
        // Fallback: if ticket.status is Resolved and lastUpdated exists
        if (!resolved && ticket.status === 'Resolved' && ticket.lastUpdated) {
            resolved = ticket.lastUpdated.toDate ? ticket.lastUpdated.toDate() : new Date(ticket.lastUpdated);
        }
        // Only count if assigned
        if (assignedTo && assignedToEmail) {
            let responseTime = assigned && created ? (assigned - created) : null;
            let resolutionTime = resolved && assigned ? (resolved - assigned) : null;

            count++;
            if (responseTime) totalResponse += responseTime;
            if (resolutionTime) totalResolution += resolutionTime;
            // SLA breach logic
            let breached = false;
            let priority = (ticket.priority || '').toLowerCase();
            let sla = SLA_RULES[priority];
            if (sla) {
                if ((responseTime && responseTime > sla.response * 60 * 1000) ||
                    (resolutionTime && resolutionTime > sla.resolution * 60 * 1000)) {
                    breached = true;
                    breachedCount++;
                }
            }
            if (ticket.status === 'Open') openCount++;
            if (ticket.status === 'Closed') closedCount++;
            return {
                ticketNumber: ticket.ticketNumber,
                subject: ticket.subject,
                assignee: assignedToEmail,
                responseTime,
                resolutionTime,
                status: ticket.status,
                created,
                assigned,
                resolved,
                breached,
                priority: ticket.priority
            };
        }
        return null;
    }).filter(Boolean);
    return {
        count,
        avgResponse: count ? totalResponse / count : 0,
        avgResolution: count ? totalResolution / count : 0,
        breachedCount,
        openCount,
        closedCount,
        details
    };
}

// Helper to convert SVG chart to PNG data URL
export async function getChartPngDataUrl(chartId) {
    const chartElem = document.getElementById(chartId);
    if (!chartElem) return null;
    const svg = chartElem.querySelector('svg');
    if (!svg) return null;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgData)));
    await new Promise(res => { img.onload = res; });
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
}

export async function exportKpiExcelWithCharts(kpiData, chartIds, projectName = '') {
    if (!kpiData || !kpiData.details) return;

    // 1. Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('KPI Report');

    // 2. Add table data FIRST
    worksheet.addRow(['Ticket #', 'Subject', 'Assignee', 'Response Time (min)', 'Resolution Time (min)', 'Status']);
    kpiData.details.forEach(row => {
        worksheet.addRow([
            row.ticketNumber,
            row.subject,
            row.assignee,
            row.responseTime ? (row.responseTime / 1000 / 60).toFixed(2) : '',
            row.resolutionTime ? (row.resolutionTime / 1000 / 60).toFixed(2) : '',
            row.status
        ]);
    });

    // 3. Add chart images BELOW the table
    let currentRow = worksheet.lastRow.number + 2; // Leave a blank row after table
    if (chartIds) {
        const ids = Array.isArray(chartIds) ? chartIds : [chartIds];
        for (const chartId of ids) {
            const imgDataUrl = await getChartPngDataUrl(chartId);
            if (imgDataUrl) {
                const imageId = workbook.addImage({
                    base64: imgDataUrl,
                    extension: 'png',
                });
                worksheet.addImage(imageId, {
                    tl: { col: 0, row: currentRow },
                    ext: { width: 500, height: 300 }
                });
                currentRow += 20; // Space between images (approximate)
            }
        }
    }

    // 4. Download the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `KPI_Report_${projectName || 'Project'}.xlsx`);
}

function getField(ticket, ...keys) {
    for (const key of keys) {
        if (ticket[key]) return ticket[key];
    }
    return '';
}

export function downloadTicketsAsExcel(tickets) {
    if (!tickets || tickets.length === 0) return;
    // Define the desired columns and their mapping
    const columns = [
        { header: 'Ticket ID', keys: ['ticketNumber', 'id'] },
        { header: 'Subject', keys: ['subject'] },
        { header: 'Module', keys: ['module', 'Module'] },
        { header: 'Type of Issue', keys: ['typeOfIssue', 'type_of_issue', 'type', 'Type of Issue'] },
        { header: 'Category', keys: ['category', 'Category'] },
        { header: 'Sub-Category', keys: ['subCategory', 'sub_category', 'sub-category', 'Sub-Category'] },
        { header: 'Status', keys: ['status', 'Status'] },
        { header: 'Priority', keys: ['priority', 'Priority'] },
        { header: 'Assigned To', keys: ['assignedTo', 'assigned_to', 'Assigned To'] },
        { header: 'Created By', keys: ['customer', 'createdBy', 'Created By', 'email'] },
        { header: 'Reported By', keys: ['reportedBy', 'Reported By'] },
    ];
    // Build rows
    const rows = tickets.map(ticket =>
        columns.map(col => {
            if (col.header === 'Assigned To') {
                const at = ticket.assignedTo;
                if (typeof at === 'object' && at) return at.name || at.email || '';
                return at || '';
            }
            if (col.header === 'Created By') {
                return getField(ticket, ...col.keys);
            }
            return getField(ticket, ...col.keys);
        })
    );
    // Add header
    rows.unshift(columns.map(col => col.header));
    // Create worksheet and workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, 'tickets_export.xlsx');
}
