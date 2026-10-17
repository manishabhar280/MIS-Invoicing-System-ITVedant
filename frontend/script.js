const API_BASE = (document.querySelector('meta[name="ims-api-base"]')?.content
    || 'https://mis-invoicing-system-production-c653.up.railway.app/api/v1').trim().replace(/\/+$/, '');

const LOCAL_API_BASE = "http://localhost:8080/api";
const isLocalFrontend = window.location.protocol === 'file:'
    || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const APP_API_BASE = isLocalFrontend ? LOCAL_API_BASE : API_BASE.replace(/\/v1$/, '');
const GROUP_API = `${APP_API_BASE}/groups`;
const CHAIN_API = `${APP_API_BASE}/chains`;
const BRAND_API = `${isLocalFrontend ? LOCAL_API_BASE : API_BASE}/brands`;
const ZONE_API = `${isLocalFrontend ? LOCAL_API_BASE : API_BASE}/zones`;
const ESTIMATE_API = isLocalFrontend
    ? `${LOCAL_API_BASE}/v1/estimates`
    : `${API_BASE}/estimates`;
const INVOICE_API = `${APP_API_BASE}/v1/invoices`;
const PAYMENT_API = `${APP_API_BASE}/v1/payments`;

let allInvoicesCache = [];
let basicAuthHeader = null;
let authenticatedUser = '';
let authenticatedRoles = [];
let invoiceEstimateCache = null;
let isSavingInvoice = false;
let chainGroupOptions = [];
let chainsCache = [];
let allBrandsCache = [];
let allZonesCache = [];
let allEstimatesCache = [];
let estimateMastersLoaded = false;
let estimateMastersLoading = false;
let editingEstimateId = null;
let estimateReadOnly = false;
let isSavingEstimate = false;
let zoneOptionsLoadError = false;
let zoneRecordsLoading = false;
let zoneRecordsRequestId = 0;
let zoneManagementRequestId = 0;
let editingChainId = null;
let isSavingChain = false;
let editingBrandId = null;
let isSavingBrand = false;
let editingZoneId = null;
let isSavingZone = false;


// Helper Function: Show Custom Toast Notification
function showToast(title, message, type = "success") {

    const toast = document.getElementById('toast-notification');
    const toastTitle = document.getElementById('toast-title');
    const toastMsg = document.getElementById('toast-message');

    if (!toast || !toastTitle || !toastMsg) return;

    toastTitle.textContent = title;
    toastMsg.textContent = message;

    // Apply color styling based on notification type
    if (type === "error") {

        toast.className =
            "fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all transform translate-y-0 opacity-100";

    } else {

        toast.className =
            "fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all transform translate-y-0 opacity-100";
    }

    // Automatically hide toast after 3 seconds
    setTimeout(() => {

        toast.classList.add('translate-y-5', 'opacity-0');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);

    }, 3000);
}


function enforceSessionGuard() {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (basicAuthHeader) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        document.getElementById('activeUserDisplay').innerText = authenticatedUser;

        loadClients();
        loadInvoices();
        loadPayments();
        refreshDashboardMetrics();

        switchTab('dashboard');

    } else {
        authenticatedUser = '';
        authenticatedRoles = [];
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
}

function showAccountRequest() {
    document.getElementById('card-login').classList.add('hidden');
    document.getElementById('card-account-request').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('card-account-request').classList.add('hidden');
    document.getElementById('card-login').classList.remove('hidden');
    document.getElementById('loginUser').focus();
}

function createBasicHeader(username, password) {
    const bytes = new TextEncoder().encode(`${username}:${password}`);
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return `Basic ${btoa(binary)}`;
}

async function invoiceFetch(url, options = {}) {
    if (!basicAuthHeader) {
        throw new Error('Sign in again to continue.');
    }
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', basicAuthHeader);
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        basicAuthHeader = null;
        enforceSessionGuard();
        throw new Error('Your session expired. Please sign in again.');
    }
    return response;
}

async function responseError(response, fallback) {
    try {
        const result = await response.json();
        return result.message || fallback;
    } catch {
        return fallback;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const message = document.getElementById('loginMessage');
    const submit = e.currentTarget.querySelector('button[type="submit"]');
    message.classList.add('hidden');
    submit.disabled = true;
    submit.textContent = 'Signing in...';
    const candidate = createBasicHeader(user, pass);

    try {
        const response = await fetch(`${INVOICE_API}/session`, {
            headers: { Authorization: candidate }
        });
        if (!response.ok) {
            message.textContent = response.status === 401 || response.status === 403
                ? 'Sign-in failed. Check your assigned username and password.'
                : await responseError(response, `Sign-in failed (HTTP ${response.status}).`);
            message.classList.remove('hidden');
            return;
        }
        const session = await response.json();
        basicAuthHeader = candidate;
        authenticatedUser = session.username || user;
        authenticatedRoles = Array.isArray(session.roles) ? session.roles : [];
        document.getElementById('loginPass').value = '';
        enforceSessionGuard();
        showToast('Welcome', `Signed in as ${authenticatedUser}.`);
    } catch (error) {
        console.error('Sign-in Error:', error);
        message.textContent = error.message || 'Unable to connect to the invoice service.';
        message.classList.remove('hidden');
    } finally {
        submit.disabled = false;
        submit.textContent = 'Sign In';
    }
}


// Handle User Logout
function handleLogout() {
    basicAuthHeader = null;
    authenticatedUser = '';
    authenticatedRoles = [];
    showToast(
        "Logged Out",
        "You have been logged out."
    );

    enforceSessionGuard();
}


// Tab Switching Logic
function switchTab(tabName) {

    document.querySelectorAll('.tab-content')
        .forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('.nav-btn')
        .forEach(btn => {

            btn.className =
                "nav-btn w-full flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl text-sm font-medium transition";
        });

    if (tabName === 'dashboard') {

        document.getElementById('tab-clients')
            .classList.remove('hidden');

        document.getElementById('tab-invoices')
            .classList.remove('hidden');

        document.getElementById('tab-payments')
            .classList.remove('hidden');

        document.getElementById('page-title')
            .innerText = "Dashboard Overview";
        document.getElementById('page-subtitle')
            .innerText = "Manage clients, invoices, and payment tracking.";

    } else {

        document.getElementById(`tab-${tabName}`)
            .classList.remove('hidden');

        document.getElementById('page-title')
            .innerText =
                tabName === 'chains'
                    ? "Customer / Chain Management"
                    : tabName === 'brands'
                        ? "Brand Management"
                        : tabName === 'zones'
                            ? "Zone Management"
                            : tabName === 'estimates'
                                ? "Estimate Management"
                        : tabName.charAt(0).toUpperCase() +
                          tabName.slice(1) +
                          " Management";
        document.getElementById('page-subtitle')
            .innerText = tabName === 'chains'
                ? "Manage company details, GSTN registration, and group assignments."
                : tabName === 'brands'
                    ? "Manage brands under their associated companies and groups."
                    : tabName === 'zones'
                        ? "Manage zones under their associated brands, companies, and groups."
                    : tabName === 'estimates'
                        ? "Create and track estimates for services and deliveries."
                : "Manage your " + tabName + " records.";
    }

    const activeNav =
        document.getElementById(`nav-${tabName}`);

    if (activeNav) {

        activeNav.className =
            "nav-btn w-full flex items-center px-4 py-3 text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/30 transition";
    }

    // Load groups when Groups tab is opened
    if (tabName === 'groups') {
        loadGroups();
    }

    if (tabName === 'chains') {
        loadChainManagement();
    }

    if (tabName === 'brands') {
        loadBrandManagement();
    }

    if (tabName === 'zones') {
        loadZoneManagement();
    }

    if (tabName === 'estimates') {
        loadEstimateManagement();
    }
}


// ======================================================
// GROUP MANAGEMENT FUNCTIONS
// ======================================================


// Get all groups
async function loadGroups() {

    try {

        const response = await fetch(GROUP_API);

        if (!response.ok) {
            throw new Error("Failed to load groups");
        }

        const groups = await response.json();

        console.log("Groups:", groups);
        chainGroupOptions = groups;
        populateChainGroupSelects(groups);

        // If Group table exists in main dashboard
        const tbody =
            document.getElementById('groupsTableBody');

        if (tbody) {

            tbody.replaceChildren();

            groups.forEach(group => {
                const row = document.createElement('tr');
                row.className = 'border-b border-slate-100 transition hover:bg-slate-50';

                const idCell = document.createElement('td');
                idCell.className = 'px-6 py-3.5 font-bold text-indigo-600';
                idCell.textContent = `#${group.groupId}`;

                const nameCell = document.createElement('td');
                nameCell.className = 'px-6 py-3.5 font-semibold text-slate-800';
                nameCell.textContent = group.groupName || '—';

                const statusCell = document.createElement('td');
                statusCell.className = 'px-6 py-3.5';
                const status = document.createElement('span');
                status.className = group.isActive
                    ? 'rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700'
                    : 'rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700';
                status.textContent = group.isActive ? 'Active' : 'Inactive';
                statusCell.appendChild(status);

                const actionsCell = document.createElement('td');
                actionsCell.className = 'px-6 py-3.5 text-center';
                const editButton = document.createElement('button');
                editButton.className = 'mr-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700';
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => editGroup(group.groupId, group.groupName));
                actionsCell.appendChild(editButton);

                const statusButton = document.createElement('button');
                statusButton.className = group.isActive
                    ? 'rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700'
                    : 'rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700';
                statusButton.textContent = group.isActive ? 'Deactivate' : 'Activate';
                statusButton.addEventListener(
                    'click',
                    () => group.isActive
                        ? deactivateGroup(group.groupId)
                        : activateGroup(group.groupId)
                );
                actionsCell.appendChild(statusButton);

                row.append(idCell, nameCell, statusCell, actionsCell);
                tbody.appendChild(row);
            });
        }

        return groups;

    } catch (error) {

        console.error("Groups Fetch Error:", error);

        showToast(
            "Error",
            "Unable to load groups.",
            "error"
        );

        return [];
    }
}


function populateChainGroupSelects(groups) {

    const filter = document.getElementById('chainGroupFilter');
    const formSelect = document.getElementById('chainGroupId');

    if (filter) {
        const selectedGroup = filter.value;
        filter.replaceChildren(new Option('All Groups', ''));

        groups.forEach(group => {
            filter.add(new Option(
                `${group.groupName} (#${group.groupId})`,
                String(group.groupId)
            ));
        });

        if (groups.some(group => String(group.groupId) === selectedGroup)) {
            filter.value = selectedGroup;
        }
    }

    if (formSelect) {
        const selectedGroup = formSelect.value;
        formSelect.replaceChildren(new Option('Select a group', ''));

        groups.forEach(group => {
            formSelect.add(new Option(
                `${group.groupName} (#${group.groupId})`,
                String(group.groupId)
            ));
        });

        if (groups.some(group => String(group.groupId) === selectedGroup)) {
            formSelect.value = selectedGroup;
        }
    }
}


// Add new group
async function addGroup(groupName) {

    if (!groupName || groupName.trim() === "") {

        showToast(
            "Validation Error",
            "Group name is required.",
            "error"
        );

        return;
    }

    try {

        const response = await fetch(
            GROUP_API,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    groupName: groupName.trim()
                })
            }
        );

        const text = await response.text();

        if (response.ok) {

            showToast(
                "Success",
                "Group added successfully!"
            );

            await loadGroups();

        } else {

            showToast(
                "Duplicate / Error",
                text || "Group could not be added.",
                "error"
            );
        }

    } catch (error) {

        console.error("Add Group Error:", error);

        showToast(
            "Error",
            "Network error while adding group.",
            "error"
        );
    }
}


// Update group
async function updateGroup(id, groupName) {

    if (!id) {

        showToast(
            "Error",
            "Group ID is required.",
            "error"
        );

        return;
    }

    if (!groupName || groupName.trim() === "") {

        showToast(
            "Validation Error",
            "Group name is required.",
            "error"
        );

        return;
    }

    try {

        const response = await fetch(
            `${GROUP_API}/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    groupName: groupName.trim()
                })
            }
        );

        const text = await response.text();

        if (response.ok) {

            showToast(
                "Success",
                "Group updated successfully!"
            );

            await loadGroups();

        } else {

            showToast(
                "Error",
                text || "Group update failed.",
                "error"
            );
        }

    } catch (error) {

        console.error("Update Group Error:", error);

        showToast(
            "Error",
            "Network error while updating group.",
            "error"
        );
    }
}


// Edit group
function editGroup(id, currentName) {

    const newName =
        prompt(
            "Enter new group name:",
            currentName
        );

    if (newName === null) {
        return;
    }

    updateGroup(id, newName);
}


// Deactivate group
async function deactivateGroup(id) {

    if (!id) {

        showToast(
            "Error",
            "Group ID is required.",
            "error"
        );

        return;
    }

    try {

        const response = await fetch(
            `${GROUP_API}/${id}`,
            {
                method: "DELETE"
            }
        );

        const text = await response.text();

        if (response.ok) {

            showToast(
                "Success",
                "Group deactivated successfully!"
            );

            await loadGroups();

        } else {

            showToast(
                "Error",
                text || "Unable to deactivate group.",
                "error"
            );
        }

    } catch (error) {

        console.error("Deactivate Group Error:", error);

        showToast(
            "Error",
            "Network error while deactivating group.",
            "error"
        );
    }
}


// Activate group
async function activateGroup(id) {

    if (!id) {

        showToast(
            "Error",
            "Group ID is required.",
            "error"
        );

        return;
    }

    try {

        const response = await fetch(
            `${GROUP_API}/${id}/activate`,
            {
                method: "PUT"
            }
        );

        const text = await response.text();

        if (response.ok) {

            showToast(
                "Success",
                "Group activated successfully!"
            );

            await loadGroups();

        } else {

            showToast(
                "Error",
                text || "Unable to activate group.",
                "error"
            );
        }

    } catch (error) {

        console.error("Activate Group Error:", error);

        showToast(
            "Error",
            "Network error while activating group.",
            "error"
        );
    }
}


// Get active groups
async function loadActiveGroups() {

    try {

        const response =
            await fetch(`${GROUP_API}/active`);

        if (!response.ok) {
            throw new Error("Failed to load active groups");
        }

        return await response.json();

    } catch (error) {

        console.error(
            "Active Groups Fetch Error:",
            error
        );

        return [];
    }
}


// Get inactive groups
async function loadInactiveGroups() {

    try {

        const response =
            await fetch(`${GROUP_API}/inactive`);

        if (!response.ok) {
            throw new Error("Failed to load inactive groups");
        }

        return await response.json();

    } catch (error) {

        console.error(
            "Inactive Groups Fetch Error:",
            error
        );

        return [];
    }
}


// ======================================================
// END GROUP MANAGEMENT
// ======================================================


// ======================================================
// CUSTOMER / CHAIN MANAGEMENT
// ======================================================

async function loadChainManagement() {
    await Promise.all([loadGroups(), loadChains()]);
}


async function loadChains() {
    const tbody = document.getElementById('chainsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="px-5 py-10 text-center text-slate-400">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading companies...
            </td>
        </tr>
    `;

    const selectedGroup = document.getElementById('chainGroupFilter')?.value;
    const url = selectedGroup
        ? `${CHAIN_API}/group/${encodeURIComponent(selectedGroup)}`
        : CHAIN_API;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                showToast("Group Not Found", "The selected group could not be found.", "error");
            } else {
                showToast("Unable to Load Companies", "Please try again in a moment.", "error");
            }
            renderChainEmptyState(tbody, "Companies could not be loaded. Please try again.");
            return;
        }

        chainsCache = await response.json();
        renderChains(tbody, chainsCache);
    } catch (error) {
        console.error("Chains Fetch Error:", error);
        renderChainEmptyState(tbody, "Companies could not be loaded. Please try again.");
        showToast("Connection Error", "Unable to connect to the company service.", "error");
    }
}


function renderChainEmptyState(tbody, message) {
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = "px-5 py-10 text-center text-slate-400";
    cell.textContent = message;
    row.appendChild(cell);
    tbody.appendChild(row);
}


function renderChains(tbody, chains) {
    tbody.replaceChildren();

    if (!chains.length) {
        const groupFilter = document.getElementById('chainGroupFilter')?.value;
        renderChainEmptyState(
            tbody,
            groupFilter
                ? "No companies/chains found for this group."
                : "No companies/chains found."
        );
        return;
    }

    chains.forEach(chain => {
        const row = document.createElement('tr');
        row.className = "transition hover:bg-slate-50";

        const values = [
            { text: `#${chain.chainId}`, className: "px-5 py-4 font-bold text-indigo-600" },
            { text: chain.companyName || "—", className: "px-5 py-4 font-semibold text-slate-800" },
            { text: chain.gstnNo || "—", className: "px-5 py-4 font-mono text-slate-600" },
            {
                text: chain.group
                    ? `${chain.group.groupName || "Group"} (#${chain.group.groupId})`
                    : "—",
                className: "px-5 py-4 text-slate-600"
            },
            { text: "", className: "px-5 py-4" },
            { text: formatChainDate(chain.createdAt), className: "px-5 py-4 whitespace-nowrap text-slate-600" },
            { text: "", className: "px-5 py-4 text-right whitespace-nowrap" }
        ];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.className = value.className;
            if (index !== 4 && index !== 6) {
                cell.textContent = value.text;
            }
            row.appendChild(cell);
        });

        const statusBadge = document.createElement('span');
        statusBadge.className = chain.isActive
            ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
            : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600";
        statusBadge.textContent = chain.isActive ? "Active" : "Inactive";
        row.children[4].appendChild(statusBadge);

        const editButton = document.createElement('button');
        editButton.type = "button";
        editButton.className = "mr-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100";
        editButton.textContent = "Edit";
        editButton.addEventListener('click', () => editChain(chain.chainId));
        row.children[6].appendChild(editButton);

        const statusButton = document.createElement('button');
        statusButton.type = "button";
        statusButton.className = chain.isActive
            ? "rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            : "rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100";
        statusButton.textContent = chain.isActive ? "Deactivate" : "Activate";
        statusButton.addEventListener('click', () => changeChainStatus(chain));
        row.children[6].appendChild(statusButton);

        tbody.appendChild(row);
    });
}


function formatChainDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
}


async function openChainModal(chain = null) {
    if (!chainGroupOptions.length) {
        await loadGroups();
    }

    if (!chainGroupOptions.length) {
        showToast("Groups Unavailable", "Load a group before adding a company.", "error");
        return;
    }

    editingChainId = chain ? chain.chainId : null;
    document.getElementById('chainModalTitle').textContent =
        editingChainId ? "Edit Chain / Company" : "Add Chain / Company";
    document.getElementById('chainCompanyName').value = chain?.companyName || "";
    document.getElementById('chainGstnNo').value = chain?.gstnNo || "";
    document.getElementById('chainGroupId').value = chain?.group?.groupId
        ? String(chain.group.groupId)
        : "";
    document.getElementById('chainSubmitButton').innerHTML = editingChainId
        ? '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Changes'
        : '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Company';
    document.getElementById('chainModal').classList.remove('hidden');
    document.getElementById('chainCompanyName').focus();
}


function closeChainModal() {
    if (isSavingChain) return;

    document.getElementById('chainModal').classList.add('hidden');
    document.getElementById('chainForm').reset();
    editingChainId = null;
}


async function editChain(chainId) {
    let chain = chainsCache.find(item => Number(item.chainId) === Number(chainId));

    if (!chain) {
        try {
            const response = await fetch(`${CHAIN_API}/${encodeURIComponent(chainId)}`);
            if (!response.ok) {
                showChainApiError(response.status, "edit");
                return;
            }
            chain = await response.json();
        } catch (error) {
            console.error("Chain Detail Fetch Error:", error);
            showToast("Connection Error", "Unable to load this company.", "error");
            return;
        }
    }

    await openChainModal(chain);
}


async function submitChainForm(event) {
    event.preventDefault();
    if (isSavingChain) return;

    const companyName = document.getElementById('chainCompanyName').value.trim();
    const gstnNo = document.getElementById('chainGstnNo').value.toUpperCase();
    const groupId = document.getElementById('chainGroupId').value;

    if (!companyName) {
        showToast("Validation Error", "Company name is required.", "error");
        return;
    }
    if (!gstnNo) {
        showToast("Validation Error", "GSTN is required.", "error");
        return;
    }
    if (gstnNo.length !== 15
            || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9]Z[A-Z0-9]$/.test(gstnNo)) {
        showToast("Validation Error", "Enter a valid 15-character GSTN.", "error");
        return;
    }
    if (!groupId) {
        showToast("Validation Error", "Select a group.", "error");
        return;
    }

    const payload = { companyName, gstnNo, groupId: Number(groupId) };
    const isEdit = editingChainId !== null;
    const submitButton = document.getElementById('chainSubmitButton');
    isSavingChain = true;
    submitButton.disabled = true;
    submitButton.classList.add('cursor-not-allowed', 'opacity-60');
    submitButton.textContent = isEdit ? "Saving changes..." : "Saving company...";

    try {
        const response = await fetch(
            isEdit ? `${CHAIN_API}/${encodeURIComponent(editingChainId)}` : CHAIN_API,
            {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            showChainApiError(response.status, isEdit ? "update" : "create");
            return;
        }

        showToast(
            "Success",
            isEdit ? "Company updated successfully." : "Company added successfully."
        );
        document.getElementById('chainModal').classList.add('hidden');
        document.getElementById('chainForm').reset();
        editingChainId = null;
        await loadChains();
    } catch (error) {
        console.error("Save Chain Error:", error);
        showToast("Connection Error", "Unable to save the company. Please try again.", "error");
    } finally {
        isSavingChain = false;
        submitButton.disabled = false;
        submitButton.classList.remove('cursor-not-allowed', 'opacity-60');
        submitButton.innerHTML = editingChainId
            ? '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Changes'
            : '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Company';
    }
}


function showChainApiError(status, operation) {
    if (status === 400) {
        showToast("Check Details", "Please check the company name, GSTN and group selection.", "error");
    } else if (status === 409) {
        showToast("GSTN Already Exists", "A company with this GSTN is already registered.", "error");
    } else if (status === 404) {
        showToast(
            "Not Found",
            operation === "edit"
                ? "This company could not be found. Refresh the list and try again."
                : "The selected group or company could not be found.",
            "error"
        );
    } else {
        showToast("Unable to Save Company", "A server error occurred. Please try again later.", "error");
    }
}


async function changeChainStatus(chain) {
    const nextActive = !chain.isActive;
    const action = nextActive ? "activate" : "deactivate";

    if (!confirm(`Are you sure you want to ${action} ${chain.companyName}?`)) {
        return;
    }

    try {
        const response = await fetch(
            `${CHAIN_API}/${encodeURIComponent(chain.chainId)}/${action}`,
            { method: "PATCH" }
        );

        if (!response.ok) {
            showChainApiError(response.status, "status");
            return;
        }

        showToast("Success", `Company ${nextActive ? "activated" : "deactivated"} successfully.`);
        await loadChains();
    } catch (error) {
        console.error("Change Chain Status Error:", error);
        showToast("Connection Error", "Unable to update company status.", "error");
    }
}

// ======================================================
// END CUSTOMER / CHAIN MANAGEMENT
// ======================================================


// ======================================================
// BRAND MANAGEMENT
// ======================================================

async function fetchCollection(url, label) {
    const response = await fetch(url);
    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `${label} request failed (${response.status}).`);
    }

    const records = await response.json();
    if (!Array.isArray(records)) {
        throw new Error(`${label} response was not a list.`);
    }
    return records;
}


async function refreshDashboardMetrics() {
    const metrics = [
        ['stat-group-count', GROUP_API, 'groups'],
        ['stat-chain-count', CHAIN_API, 'companies'],
        ['stat-brand-count', BRAND_API, 'brands'],
        ['stat-zone-count', ZONE_API, 'zones']
    ];

    await Promise.all(metrics.map(async ([elementId, url, label]) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        try {
            const records = url === ZONE_API
                ? await fetchZoneCollection(url, label)
                : await fetchCollection(url, label);
            element.textContent = String(records.length);
        } catch (error) {
            console.error(`Dashboard ${label} Count Error:`, error);
            element.textContent = '—';
        }
    }));
}


async function loadBrandManagement() {
    const tbody = document.getElementById('brandsTableBody');
    if (!tbody) return;

    renderBrandMessage(tbody, 'Loading brands...', 'loading');
    const results = await Promise.allSettled([
        fetchCollection(BRAND_API, 'Brands'),
        fetchCollection(GROUP_API, 'Groups'),
        fetchCollection(CHAIN_API, 'Companies')
    ]);

    if (results[0].status === 'rejected') {
        console.error('Brands Fetch Error:', results[0].reason);
        renderBrandMessage(tbody, 'Brands could not be loaded. Check the API connection and try again.', 'error');
        showToast('Unable to Load Brands', results[0].reason.message, 'error');
        allBrandsCache = [];
        return;
    }

    allBrandsCache = results[0].value;
    if (results[1].status === 'fulfilled') {
        chainGroupOptions = results[1].value;
        populateChainGroupSelects(chainGroupOptions);
        populateBrandGroupFilter(chainGroupOptions);
    } else {
        console.error('Brand Groups Fetch Error:', results[1].reason);
        showToast('Groups Unavailable', 'Brand group filtering could not be loaded.', 'error');
    }

    if (results[2].status === 'fulfilled') {
        chainsCache = results[2].value;
        populateBrandChainSelect(chainsCache);
        populateBrandCompanyFilter(chainsCache);
    } else {
        console.error('Brand Companies Fetch Error:', results[2].reason);
        populateBrandChainSelect([]);
        populateBrandCompanyFilter([]);
        showToast('Companies Unavailable', 'Brand company choices and filtering could not be loaded.', 'error');
    }

    filterBrands();
}


function populateBrandGroupFilter(groups) {
    const filter = document.getElementById('brandGroupFilter');
    if (!filter) return;

    const selectedGroup = filter.value;
    filter.replaceChildren(new Option('All Groups', ''));
    groups.forEach(group => {
        filter.add(new Option(group.groupName || `Group #${group.groupId}`, String(group.groupId)));
    });
    if (groups.some(group => String(group.groupId) === selectedGroup)) {
        filter.value = selectedGroup;
    }
}


function populateBrandChainSelect(chains) {
    const select = document.getElementById('brandChainId');
    if (!select) return;

    const selectedChain = select.value;
    select.replaceChildren(new Option(
        chains.length ? 'Select a company / chain' : 'No companies available',
        ''
    ));
    chains.forEach(chain => {
        const label = chain.companyName || `Company #${chain.chainId}`;
        select.add(new Option(`${label} (#${chain.chainId})`, String(chain.chainId)));
    });
    select.disabled = chains.length === 0 || isSavingBrand;
    if (chains.some(chain => String(chain.chainId) === selectedChain)) {
        select.value = selectedChain;
    }
}


function populateBrandCompanyFilter(chains) {
    const filter = document.getElementById('brandCompanyFilter');
    if (!filter) return;

    const selectedChain = filter.value;
    filter.replaceChildren(new Option('All Companies', ''));
    chains.forEach(chain => {
        const label = chain.companyName || `Company #${chain.chainId}`;
        filter.add(new Option(label, String(chain.chainId)));
    });
    if (chains.some(chain => String(chain.chainId) === selectedChain)) {
        filter.value = selectedChain;
    }
}


function filterBrands() {
    const tbody = document.getElementById('brandsTableBody');
    if (!tbody) return;

    const groupId = document.getElementById('brandGroupFilter')?.value || '';
    const chainId = document.getElementById('brandCompanyFilter')?.value || '';
    const filtered = allBrandsCache.filter(brand => {
        const brandChainId = brand.chain?.chainId;
        const brandGroupId = brand.chain?.group?.groupId;
        return (!chainId || String(brandChainId) === chainId)
            && (!groupId || String(brandGroupId) === groupId);
    });

    renderBrands(tbody, filtered);
}


function renderBrands(tbody, brands) {
    tbody.replaceChildren();
    if (!brands.length) {
        const groupSelected = document.getElementById('brandGroupFilter')?.value;
        const companySelected = document.getElementById('brandCompanyFilter')?.value;
        renderBrandMessage(
            tbody,
            allBrandsCache.length
                ? 'No brands match the selected filters.'
                : 'No brands have been added yet.',
            groupSelected || companySelected ? 'filtered-empty' : 'empty'
        );
        return;
    }

    brands.forEach((brand, index) => {
        const row = document.createElement('tr');
        row.className = 'transition hover:bg-slate-50';
        const group = brand.chain?.group;
        const companyName = brand.chain?.companyName || '—';
        const values = [
            String(index + 1),
            group?.groupName || '—',
            companyName,
            brand.brandName || '—'
        ];

        values.forEach((value, cellIndex) => {
            const cell = document.createElement('td');
            cell.className = cellIndex === 0
                ? 'px-5 py-4 font-semibold text-slate-500'
                : 'px-5 py-4 text-slate-700';
            cell.textContent = value;
            row.appendChild(cell);
        });

        const editCell = document.createElement('td');
        editCell.className = 'px-5 py-4 text-center';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => editBrand(brand));
        editCell.appendChild(editButton);
        row.appendChild(editCell);

        const actionCell = document.createElement('td');
        actionCell.className = 'px-5 py-4 text-right';
        if (brand.isActive === false) {
            const inactiveLabel = document.createElement('span');
            inactiveLabel.className = 'text-xs font-semibold text-slate-400';
            inactiveLabel.textContent = 'Inactive';
            actionCell.appendChild(inactiveLabel);
        } else {
            const deactivateButton = document.createElement('button');
            deactivateButton.type = 'button';
            deactivateButton.className = 'rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100';
            deactivateButton.textContent = 'Deactivate';
            deactivateButton.addEventListener('click', () => deactivateBrand(brand));
            actionCell.appendChild(deactivateButton);
        }
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}


function renderBrandMessage(tbody, message, state) {
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = state === 'error'
        ? 'px-5 py-10 text-center text-rose-600'
        : 'px-5 py-10 text-center text-slate-400';
    if (state === 'loading') {
        const spinner = document.createElement('i');
        spinner.className = 'fa-solid fa-spinner fa-spin mr-2';
        cell.appendChild(spinner);
    }
    cell.appendChild(document.createTextNode(message));
    row.appendChild(cell);
    tbody.appendChild(row);
}


function showBrandFormError(message) {
    const element = document.getElementById('brandFormMessage');
    element.textContent = message;
    element.classList.remove('hidden');
}


function clearBrandFormError() {
    const element = document.getElementById('brandFormMessage');
    element.textContent = '';
    element.classList.add('hidden');
}


function editBrand(brand) {
    editingBrandId = brand.brandId;
    document.getElementById('brandFormTitle').lastChild.textContent = ' Edit Brand';
    document.getElementById('brandName').value = brand.brandName || '';
    document.getElementById('brandChainId').value = brand.chain?.chainId
        ? String(brand.chain.chainId)
        : '';
    document.getElementById('brandSubmitButton').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Changes';
    clearBrandFormError();
    document.getElementById('brandName').focus();
}


function cancelBrandEdit() {
    if (isSavingBrand) return;

    editingBrandId = null;
    document.getElementById('brandForm').reset();
    document.getElementById('brandFormTitle').lastChild.textContent = ' Add Brand';
    document.getElementById('brandSubmitButton').innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Brand';
    clearBrandFormError();
}


async function submitBrandForm(event) {
    event.preventDefault();
    if (isSavingBrand) return;
    clearBrandFormError();

    const brandName = document.getElementById('brandName').value.trim();
    const chainId = document.getElementById('brandChainId').value;
    if (!brandName) {
        showBrandFormError('Brand name is required.');
        return;
    }
    if (brandName.length > 50) {
        showBrandFormError('Brand name must be 50 characters or fewer.');
        return;
    }
    if (!chainId) {
        showBrandFormError('Select a company / chain.');
        return;
    }

    const isEdit = editingBrandId !== null;
    const submitButton = document.getElementById('brandSubmitButton');
    isSavingBrand = true;
    submitButton.disabled = true;
    submitButton.classList.add('cursor-not-allowed', 'opacity-60');
    document.getElementById('brandChainId').disabled = true;
    submitButton.textContent = isEdit ? 'Saving changes...' : 'Saving brand...';

    try {
        const response = await fetch(
            isEdit ? `${BRAND_API}/${encodeURIComponent(editingBrandId)}` : BRAND_API,
            {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName, chainId: Number(chainId) })
            }
        );

        if (!response.ok) {
            const message = await response.text();
            showBrandFormError(message || `Unable to ${isEdit ? 'update' : 'save'} the brand (HTTP ${response.status}).`);
            return;
        }

        showToast('Success', isEdit ? 'Brand updated successfully.' : 'Brand added successfully.');
        editingBrandId = null;
        document.getElementById('brandForm').reset();
        document.getElementById('brandFormTitle').lastChild.textContent = ' Add Brand';
        clearBrandFormError();
        await Promise.all([loadBrandManagement(), refreshDashboardMetrics()]);
    } catch (error) {
        console.error('Save Brand Error:', error);
        showBrandFormError('Unable to connect to the Brand service. Check the API connection and try again.');
    } finally {
        isSavingBrand = false;
        submitButton.disabled = false;
        submitButton.classList.remove('cursor-not-allowed', 'opacity-60');
        document.getElementById('brandChainId').disabled = false;
        submitButton.innerHTML = editingBrandId !== null
            ? '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Changes'
            : '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Brand';
    }
}


async function deactivateBrand(brand) {
    if (!confirm(`Deactivate brand "${brand.brandName}"?`)) return;

    try {
        const response = await fetch(
            `${BRAND_API}/${encodeURIComponent(brand.brandId)}`,
            { method: 'DELETE' }
        );
        if (!response.ok) {
            const message = await response.text();
            showToast('Unable to Deactivate Brand', message || `The request failed (HTTP ${response.status}).`, 'error');
            return;
        }

        showToast('Success', 'Brand deactivated successfully.');
        await Promise.all([loadBrandManagement(), refreshDashboardMetrics()]);
    } catch (error) {
        console.error('Deactivate Brand Error:', error);
        showToast('Connection Error', 'Unable to connect to the Brand service.', 'error');
    }
}

// ======================================================
// END BRAND MANAGEMENT
// ======================================================

// ======================================================
// ZONE MANAGEMENT
// ======================================================

async function handleZoneUnauthorized() {
    basicAuthHeader = null;
    enforceSessionGuard();
    showToast('Session Expired', 'Please sign in again to continue.', 'error');
}


async function fetchZoneCollection(url, label) {
    const response = await fetch(url);
    if (response.status === 401) {
        await handleZoneUnauthorized();
        throw new Error('Your session has expired. Please sign in again.');
    }
    if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `${label} request failed (HTTP ${response.status}).`);
    }

    const records = await response.json();
    if (!Array.isArray(records)) {
        throw new Error(`${label} response was not a list.`);
    }
    return records;
}


async function fetchZoneApi(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        await handleZoneUnauthorized();
    }
    return response;
}


async function loadZoneManagement() {
    const tbody = document.getElementById('zonesTableBody');
    if (!tbody) return;

    const requestId = ++zoneManagementRequestId;
    ++zoneRecordsRequestId;
    zoneRecordsLoading = true;
    renderZoneMessage(tbody, 'Loading zones...', 'loading');
    setZonePageMessage('', 'info');

    const optionResults = await Promise.allSettled([
        fetchZoneCollection(BRAND_API, 'Brands'),
        fetchZoneCollection(CHAIN_API, 'Companies'),
        fetchZoneCollection(GROUP_API, 'Groups'),
        fetchZoneCollection(ZONE_API, 'Zones')
    ]);

    if (requestId !== zoneManagementRequestId) return;

    if (optionResults[0].status === 'fulfilled') {
        allBrandsCache = optionResults[0].value;
        populateZoneBrandSelects(allBrandsCache);
    } else {
        console.error('Zone Brand Options Error:', optionResults[0].reason);
        populateZoneBrandSelects([]);
    }

    if (optionResults[1].status === 'fulfilled') {
        chainsCache = optionResults[1].value;
        populateZoneSelect(
            document.getElementById('zoneCompanyFilter'),
            chainsCache,
            'All Companies',
            chain => chain.companyName || `Company #${chain.chainId}`,
            chain => chain.chainId
        );
    } else {
        console.error('Zone Company Options Error:', optionResults[1].reason);
        populateZoneSelect(document.getElementById('zoneCompanyFilter'), [], 'All Companies');
    }

    if (optionResults[2].status === 'fulfilled') {
        chainGroupOptions = optionResults[2].value;
        populateZoneSelect(
            document.getElementById('zoneGroupFilter'),
            chainGroupOptions,
            'All Groups',
            group => group.groupName || `Group #${group.groupId}`,
            group => group.groupId
        );
    } else {
        console.error('Zone Group Options Error:', optionResults[2].reason);
        populateZoneSelect(document.getElementById('zoneGroupFilter'), [], 'All Groups');
    }

    const optionErrors = optionResults.slice(0, 3).filter(result => result.status === 'rejected');
    zoneOptionsLoadError = optionErrors.length > 0;
    if (optionErrors.length) {
        setZonePageMessage(
            'Some Brand, Company or Group options could not be loaded. Check the API connection and retry.',
            'error'
        );
    }

    if (optionResults[3].status === 'fulfilled') {
        allZonesCache = optionResults[3].value;
        zoneRecordsLoading = false;
        renderFilteredZones();
        if (!zoneOptionsLoadError) setZonePageMessage('', 'info');
    } else {
        const error = optionResults[3].reason;
        zoneRecordsLoading = false;
        if (error.message.includes('session has expired')) return;
        console.error('Zones Fetch Error:', error);
        allZonesCache = [];
        renderZoneMessage(tbody, 'Zones could not be loaded. Check the API connection and try again.', 'error');
        setZonePageMessage('Zones could not be loaded. Please check the API connection and retry.', 'error');
        showToast('Unable to Load Zones', error.message, 'error');
    }
}


function populateZoneBrandSelects(brands) {
    const filter = document.getElementById('zoneBrandFilter');
    const formSelect = document.getElementById('zoneBrandId');
    const labelForBrand = brand => {
        const company = brand.chain?.companyName;
        return `${brand.brandName || `Brand #${brand.brandId}`}${company ? ` — ${company}` : ''}`;
    };

    populateZoneSelect(filter, brands, 'All Brands', labelForBrand, brand => brand.brandId);
    populateZoneSelect(
        formSelect,
        brands,
        brands.length ? 'Select a brand' : 'No brands available',
        labelForBrand,
        brand => brand.brandId
    );

    const addButton = document.querySelector('#tab-zones > div:first-child button');
    if (addButton) {
        addButton.disabled = brands.length === 0 || isSavingZone;
        addButton.classList.toggle('opacity-60', addButton.disabled);
        addButton.classList.toggle('cursor-not-allowed', addButton.disabled);
    }
}


function populateZoneSelect(select, records, placeholder, labelForRecord, idForRecord) {
    if (!select) return;

    const selectedValue = select.value;
    select.replaceChildren(new Option(placeholder, ''));
    records.forEach(record => {
        const id = idForRecord(record);
        select.add(new Option(labelForRecord(record), String(id)));
    });
    select.disabled = records.length === 0;
    if (records.some(record => String(idForRecord(record)) === selectedValue)) {
        select.value = selectedValue;
    }
}


async function loadZoneRecords() {
    const tbody = document.getElementById('zonesTableBody');
    if (!tbody) return;

    const requestId = ++zoneRecordsRequestId;
    zoneRecordsLoading = true;
    renderZoneMessage(tbody, 'Loading zones...', 'loading');
    try {
        const zones = await fetchZoneCollection(ZONE_API, 'Zones');
        if (requestId !== zoneRecordsRequestId) return;

        allZonesCache = zones;
        zoneRecordsLoading = false;
        renderFilteredZones();
        if (zoneOptionsLoadError) {
            setZonePageMessage(
                'Some Brand, Company or Group options could not be loaded. Check the API connection and retry.',
                'error'
            );
        } else {
            setZonePageMessage('', 'info');
        }
    } catch (error) {
        if (requestId !== zoneRecordsRequestId) return;
        zoneRecordsLoading = false;
        if (error.message.includes('session has expired')) return;
        console.error('Zones Fetch Error:', error);
        allZonesCache = [];
        renderZoneMessage(tbody, 'Zones could not be loaded. Check the API connection and try again.', 'error');
        setZonePageMessage('Zones could not be loaded. Please check the API connection and retry.', 'error');
        showToast('Unable to Load Zones', error.message, 'error');
    }
}


function filterZones() {
    if (zoneRecordsLoading) return;
    renderFilteredZones();
}


function resetZoneFilters() {
    document.getElementById('zoneBrandFilter').value = '';
    document.getElementById('zoneCompanyFilter').value = '';
    document.getElementById('zoneGroupFilter').value = '';
    filterZones();
}


function renderFilteredZones() {
    const tbody = document.getElementById('zonesTableBody');
    if (!tbody || zoneRecordsLoading) return;

    const brandId = document.getElementById('zoneBrandFilter')?.value || '';
    const chainId = document.getElementById('zoneCompanyFilter')?.value || '';
    const groupId = document.getElementById('zoneGroupFilter')?.value || '';
    const filteredZones = allZonesCache.filter(zone => {
        const zoneBrandId = zone.brandId ?? zone.brand?.brandId;
        const zoneChainId = zone.chainId ?? zone.brand?.chain?.chainId;
        const zoneGroupId = zone.groupId ?? zone.brand?.chain?.group?.groupId;
        return (!brandId || String(zoneBrandId) === brandId)
            && (!chainId || String(zoneChainId) === chainId)
            && (!groupId || String(zoneGroupId) === groupId);
    });

    renderZones(tbody, filteredZones);
}


function renderZones(tbody, zones) {
    tbody.replaceChildren();
    if (!zones.length) {
        const hasFilters = Boolean(
            document.getElementById('zoneBrandFilter')?.value
            || document.getElementById('zoneCompanyFilter')?.value
            || document.getElementById('zoneGroupFilter')?.value
        );
        renderZoneMessage(
            tbody,
            hasFilters ? 'No zones match the selected filters.' : 'No zones have been added yet.',
            'empty'
        );
        return;
    }

    zones.forEach((zone, index) => {
        const row = document.createElement('tr');
        row.className = 'transition hover:bg-slate-50';
        const values = [
            String(index + 1),
            zone.zoneName || '—',
            zone.brandName || zone.brand?.brandName || '—',
            zone.companyName || zone.brand?.chain?.companyName || '—',
            zone.groupName || zone.brand?.chain?.group?.groupName || '—'
        ];

        values.forEach((value, cellIndex) => {
            const cell = document.createElement('td');
            cell.className = cellIndex === 0
                ? 'px-5 py-4 font-semibold text-slate-500'
                : 'px-5 py-4 text-slate-700';
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement('td');
        actions.className = 'px-5 py-4 text-right whitespace-nowrap';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'mr-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => openZoneModal(zone));
        actions.appendChild(editButton);

        if (zone.isActive !== false) {
            const deactivateButton = document.createElement('button');
            deactivateButton.type = 'button';
            deactivateButton.className = 'rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100';
            deactivateButton.textContent = 'Deactivate';
            deactivateButton.addEventListener('click', () => deactivateZone(zone));
            actions.appendChild(deactivateButton);
        } else {
            const inactiveStatus = document.createElement('span');
            inactiveStatus.className = 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600';
            inactiveStatus.textContent = 'Inactive';
            actions.appendChild(inactiveStatus);
        }

        row.appendChild(actions);
        tbody.appendChild(row);
    });
}


function renderZoneMessage(tbody, message, state) {
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'px-5 py-10 text-center text-slate-400';

    if (state === 'loading') {
        const spinner = document.createElement('i');
        spinner.className = 'fa-solid fa-spinner fa-spin mr-2';
        cell.appendChild(spinner);
    }

    cell.appendChild(document.createTextNode(message));
    row.appendChild(cell);
    tbody.appendChild(row);
}


function setZonePageMessage(message, state) {
    const element = document.getElementById('zonePageMessage');
    if (!element) return;

    element.textContent = message;
    element.className = message
        ? state === 'error'
            ? 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
            : 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
        : 'hidden';
}


async function openZoneModal(zone = null) {
    if (!allBrandsCache.length && !zone) {
        try {
            allBrandsCache = await fetchZoneCollection(BRAND_API, 'Brands');
            populateZoneBrandSelects(allBrandsCache);
        } catch (error) {
            console.error('Zone Brand Options Error:', error);
            showToast('Brands Unavailable', 'Load a brand before adding a zone.', 'error');
            return;
        }
    }

    if (!allBrandsCache.length && !zone) {
        showToast('Brands Unavailable', 'Load a brand before adding a zone.', 'error');
        return;
    }

    if (zone && !allBrandsCache.length) {
        const brandId = zone.brandId ?? zone.brand?.brandId;
        const brandName = zone.brandName ?? zone.brand?.brandName ?? `Brand #${brandId}`;
        const brandSelect = document.getElementById('zoneBrandId');
        brandSelect.replaceChildren(new Option(brandName, String(brandId || '')));
    }

    editingZoneId = zone ? zone.zoneId : null;
    document.getElementById('zoneModalTitle').textContent = editingZoneId ? 'Edit Zone' : 'Add Zone';
    document.getElementById('zoneName').value = zone?.zoneName || '';
    document.getElementById('zoneBrandId').value = zone?.brandId
        ? String(zone.brandId)
        : zone?.brand?.brandId
            ? String(zone.brand.brandId)
            : '';
    document.getElementById('zoneBrandId').disabled = Boolean(editingZoneId);
    document.getElementById('zoneStatusField').classList.toggle('hidden', !editingZoneId);
    document.getElementById('zoneIsActive').value = zone?.isActive === false ? 'false' : 'true';
    document.getElementById('zoneSubmitButton').innerHTML = editingZoneId
        ? '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Changes'
        : '<i class="fa-solid fa-floppy-disk mr-2"></i>Save Zone';
    document.getElementById('zoneFormMessage').classList.add('hidden');
    document.getElementById('zoneModal').classList.remove('hidden');
    document.getElementById('zoneName').focus();
}


function closeZoneModal() {
    if (isSavingZone) return;
    document.getElementById('zoneModal').classList.add('hidden');
    document.getElementById('zoneForm').reset();
    document.getElementById('zoneBrandId').disabled = false;
    document.getElementById('zoneStatusField').classList.add('hidden');
    editingZoneId = null;
}


async function submitZoneForm(event) {
    event.preventDefault();
    if (isSavingZone) return;

    const nameInput = document.getElementById('zoneName');
    const brandSelect = document.getElementById('zoneBrandId');
    const message = document.getElementById('zoneFormMessage');
    const submitButton = document.getElementById('zoneSubmitButton');
    const zoneName = nameInput.value.trim();
    const brandId = Number(brandSelect.value);
    const isEdit = editingZoneId !== null;
    const zoneIsActive = document.getElementById('zoneIsActive').value;

    if (!zoneName || zoneName.length > 50
        || (!isEdit && (!Number.isInteger(brandId) || brandId <= 0))
        || (isEdit && !['true', 'false'].includes(zoneIsActive))) {
        message.textContent = !zoneName
            ? 'Zone name is required.'
            : zoneName.length > 50
                ? 'Zone name must not exceed 50 characters.'
                : isEdit
                    ? 'Select a valid Zone status.'
                    : 'Select a valid brand.';
        message.classList.remove('hidden');
        return;
    }

    if (isEdit && (!Number.isSafeInteger(Number(editingZoneId)) || Number(editingZoneId) <= 0)) {
        message.textContent = 'The selected Zone has an invalid ID. Close this form and reload the list.';
        message.classList.remove('hidden');
        return;
    }

    isSavingZone = true;
    submitButton.disabled = true;
    submitButton.classList.add('cursor-not-allowed', 'opacity-60');
    try {
        const response = await fetchZoneApi(
            isEdit ? `${ZONE_API}/${encodeURIComponent(editingZoneId)}` : ZONE_API,
            {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEdit
                    ? { zoneName, isActive: zoneIsActive === 'true' }
                    : { zoneName, brandId })
            }
        );

        if (!response.ok) {
            const details = await response.text();
            message.textContent = response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : response.status === 404
                    ? details || 'The selected Zone was not found.'
                    : details || `Unable to save the Zone (HTTP ${response.status}).`;
            message.classList.remove('hidden');
            return;
        }

        showToast('Success', isEdit ? 'Zone updated successfully.' : 'Zone added successfully.');
        isSavingZone = false;
        closeZoneModal();
        setZonePageMessage('', 'info');
        await Promise.all([loadZoneRecords(), refreshDashboardMetrics()]);
    } catch (error) {
        console.error('Save Zone Error:', error);
        message.textContent = 'Unable to connect to the Zone service. Check the API connection and try again.';
        message.classList.remove('hidden');
    } finally {
        isSavingZone = false;
        submitButton.disabled = false;
        submitButton.classList.remove('cursor-not-allowed', 'opacity-60');
    }
}


async function deactivateZone(zone) {
    const zoneId = Number(zone?.zoneId);
    if (!Number.isSafeInteger(zoneId) || zoneId <= 0) {
        showToast('Invalid Zone', 'The selected Zone has an invalid ID. Reload the list and try again.', 'error');
        return;
    }
    if (!confirm(`Deactivate Zone #${zoneId} "${zone.zoneName}"? This keeps the record but marks it inactive.`)) return;

    try {
        const response = await fetchZoneApi(
            `${ZONE_API}/${encodeURIComponent(zoneId)}`,
            { method: 'DELETE' }
        );
        if (!response.ok) {
            const details = await response.text();
            const message = response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : response.status === 404
                    ? details || `Zone #${zoneId} was not found.`
                    : details || `The request failed (HTTP ${response.status}).`;
            showToast('Unable to Deactivate Zone', message, 'error');
            return;
        }

        showToast('Success', 'Zone deactivated successfully.');
        setZonePageMessage('', 'info');
        await Promise.all([loadZoneRecords(), refreshDashboardMetrics()]);
    } catch (error) {
        console.error('Deactivate Zone Error:', error);
        showToast('Connection Error', 'Unable to connect to the Zone service.', 'error');
    }
}

// ======================================================
// END ZONE MANAGEMENT
// ======================================================


// ======================================================
// ESTIMATE MANAGEMENT
// ======================================================

async function loadEstimateManagement() {
    const tbody = document.getElementById('estimateTableBody');
    if (!tbody) return;

    renderEstimateMessage('Loading estimates...', 'loading');
    setEstimatePageMessage('', 'info');
    try {
        const estimates = await fetchZoneCollection(ESTIMATE_API, 'Estimates');
        allEstimatesCache = estimates;
        document.getElementById('estimateCount').textContent = String(estimates.length);
        filterEstimates();
    } catch (error) {
        console.error('Estimates Fetch Error:', error);
        allEstimatesCache = [];
        document.getElementById('estimateCount').textContent = '—';
        renderEstimateMessage('Estimates could not be loaded. Check the API and database migration, then retry.', 'error');
        setEstimatePageMessage('Unable to load estimates. Please check the API connection and database schema.', 'error');
    }
}


async function loadEstimateMasters() {
    if (estimateMastersLoading) {
        while (estimateMastersLoading) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (estimateMastersLoaded) return;
    }

    estimateMastersLoading = true;
    try {
        const [chainsResponse, brandsResponse, zonesResponse] = await Promise.all([
            fetchZoneCollection(`${CHAIN_API}/active`, 'Active companies'),
            fetchZoneCollection(BRAND_API, 'Brands'),
            fetchZoneCollection(ZONE_API, 'Zones')
        ]);
        chainsCache = chainsResponse
            .filter(chain => chain.isActive !== false)
            .map(chain => ({
                ...chain,
                chainId: estimateIdString(chain.chainId, 'Chain ID')
            }));
        allBrandsCache = brandsResponse
            .filter(brand => brand.isActive !== false)
            .map(brand => {
                const chainId = brand.chainId ?? brand.chain?.chainId;
                return {
                    ...brand,
                    brandId: estimateIdString(brand.brandId, 'Brand ID'),
                    chainId: chainId == null ? null : estimateIdString(chainId, 'Brand Chain ID')
                };
            });
        allZonesCache = zonesResponse
            .filter(zone => zone.isActive !== false)
            .map(zone => {
                const brandId = zone.brandId ?? zone.brand?.brandId;
                return {
                    ...zone,
                    zoneId: estimateIdString(zone.zoneId, 'Zone ID'),
                    brandId: brandId == null ? null : estimateIdString(brandId, 'Zone Brand ID')
                };
            });
        populateEstimateOptions();
        estimateMastersLoaded = true;
    } finally {
        estimateMastersLoading = false;
    }
}

function estimateIdString(value, label = 'ID') {
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        const integer = BigInt(value);
        if (integer > 0n && integer <= 9223372036854775807n) {
            return integer.toString();
        }
    } else if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
        return String(value);
    }
    throw new Error(`${label} must be supplied as an exact positive integer`);
}


function populateEstimateOptions() {
    populateZoneSelect(
        document.getElementById('estimateChainId'),
        chainsCache,
        chainsCache.length ? 'Select a company' : 'No active companies',
        chain => chain.companyName || `Company #${chain.chainId}`,
        chain => chain.chainId
    );
    populateEstimateBrands();
}


function populateEstimateBrands(selectedBrandId = '') {
    const chainId = document.getElementById('estimateChainId').value;
    const brands = allBrandsCache.filter(brand =>
        String(brand.chainId ?? brand.chain?.chainId) === chainId);
    populateZoneSelect(
        document.getElementById('estimateBrandId'),
        brands,
        chainId ? (brands.length ? 'Select a brand' : 'No active brands for this company') : 'Select a company first',
        brand => brand.brandName || `Brand #${brand.brandId}`,
        brand => brand.brandId
    );
    if (selectedBrandId && brands.some(brand => String(brand.brandId) === String(selectedBrandId))) {
        document.getElementById('estimateBrandId').value = String(selectedBrandId);
    }
    populateEstimateZones();
}


function populateEstimateZones(selectedZoneId = '') {
    const brandId = document.getElementById('estimateBrandId').value;
    const zones = allZonesCache.filter(zone =>
        String(zone.brandId ?? zone.brand?.brandId) === brandId);
    populateZoneSelect(
        document.getElementById('estimateZoneId'),
        zones,
        brandId ? (zones.length ? 'Select a zone' : 'No active zones for this brand') : 'Select a brand first',
        zone => zone.zoneName || `Zone #${zone.zoneId}`,
        zone => zone.zoneId
    );
    if (selectedZoneId && zones.some(zone => String(zone.zoneId) === String(selectedZoneId))) {
        document.getElementById('estimateZoneId').value = String(selectedZoneId);
    }
}


function handleEstimateChainChange() {
    const selectedChain = chainsCache.find(chain =>
        String(chain.chainId) === document.getElementById('estimateChainId').value);
    document.getElementById('estimateGroupName').value =
        selectedChain?.group?.groupName || '';
    populateEstimateBrands();
}


function handleEstimateBrandChange() {
    populateEstimateZones();
}


function filterEstimates() {
    const search = document.getElementById('estimateSearch')?.value.trim().toLowerCase() || '';
    const deliveryDate = document.getElementById('estimateDeliveryFilter')?.value || '';
    const filtered = allEstimatesCache.filter(estimate => {
        const searchable = [
            estimate.estimatedId,
            estimate.companyName,
            estimate.groupName,
            estimate.brandName,
            estimate.zoneName,
            estimate.service
        ].join(' ').toLowerCase();
        return (!search || searchable.includes(search))
            && (!deliveryDate || estimate.deliveryDate === deliveryDate);
    });
    renderEstimates(filtered);
}


function renderEstimates(estimates) {
    const tbody = document.getElementById('estimateTableBody');
    if (!tbody) return;
    tbody.replaceChildren();
    if (!estimates.length) {
        renderEstimateMessage(
            allEstimatesCache.length ? 'No estimates match the current search or filter.' : 'No estimates have been added yet.',
            'empty'
        );
        return;
    }

    estimates.forEach(estimate => {
        const row = document.createElement('tr');
        row.className = 'transition hover:bg-slate-50';
        [
            `EST-${estimate.estimatedId}`,
            `${estimate.companyName || '—'} / ${estimate.groupName || '—'}`,
            `${estimate.brandName || '—'} / ${estimate.zoneName || '—'}`,
            estimate.service || '—',
            estimate.qty ?? '—',
            estimate.totalCost == null ? '—' : `₹${estimate.totalCost}`,
            estimate.deliveryDate || '—'
        ].forEach(value => {
            const cell = document.createElement('td');
            cell.className = 'px-5 py-4 text-slate-700';
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        const actions = document.createElement('td');
        actions.className = 'px-5 py-4 text-right whitespace-nowrap';
        actions.appendChild(createEstimateAction('View', 'border-slate-200 text-slate-700 hover:bg-slate-100', () => openEstimateModal(estimate, true)));
        actions.appendChild(createEstimateAction('Edit', 'border-indigo-200 text-indigo-700 hover:bg-indigo-50', () => openEstimateModal(estimate, false)));
        const linkedInvoice = allInvoicesCache.find(invoice =>
            String(invoice.estimateId || '') === String(estimate.estimatedId || '')
        );
        const generate = createEstimateAction(
            linkedInvoice ? 'Invoiced' : 'Generate Invoice',
            linkedInvoice
                ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
            () => openInvoiceFromEstimate(estimate.estimatedId)
        );
        generate.disabled = Boolean(linkedInvoice);
        generate.title = linkedInvoice ? 'An invoice already exists for this estimate.' : 'Create an invoice from server-loaded estimate details.';
        actions.appendChild(generate);
        row.appendChild(actions);
        tbody.appendChild(row);
    });
}


function createEstimateAction(label, classNames, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `mr-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${classNames}`;
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
}


function renderEstimateMessage(message, state) {
    const tbody = document.getElementById('estimateTableBody');
    if (!tbody) return;
    tbody.replaceChildren();
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'px-5 py-10 text-center text-slate-400';
    if (state === 'loading') {
        const spinner = document.createElement('i');
        spinner.className = 'fa-solid fa-spinner fa-spin mr-2';
        cell.appendChild(spinner);
    }
    cell.appendChild(document.createTextNode(message));
    row.appendChild(cell);
    tbody.appendChild(row);
}


function setEstimatePageMessage(message, state) {
    const element = document.getElementById('estimatePageMessage');
    if (!element) return;
    element.textContent = message;
    element.className = message
        ? state === 'error'
            ? 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
            : 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
        : 'hidden';
}


async function openEstimateModal(estimate = null, readOnly = false) {
    try {
        await loadEstimateMasters();
    } catch (error) {
        console.error('Estimate Options Error:', error);
        setEstimatePageMessage('Unable to load active Chains, Brands, and Zones. Check the API and retry.', 'error');
        showToast('Estimate Options Unavailable', 'Active company, brand, and zone options could not be loaded.', 'error');
        return;
    }

    const form = document.getElementById('estimateForm');
    const details = document.getElementById('estimateViewDetails');
    const modal = document.getElementById('estimateModal');
    estimateReadOnly = Boolean(estimate && readOnly);
    editingEstimateId = estimate && !readOnly ? estimate.estimatedId : null;
    document.getElementById('estimateModalTitle').textContent = estimateReadOnly
        ? `Estimate EST-${estimate.estimatedId}`
        : editingEstimateId ? `Edit Estimate EST-${estimate.estimatedId}` : 'Add Estimate';
    document.getElementById('estimateSubmitButton').textContent = editingEstimateId ? 'Save Changes' : 'Save Estimate';
    document.getElementById('estimateFormMessage').classList.add('hidden');
    details.replaceChildren();

    if (estimateReadOnly) {
        form.classList.add('hidden');
        details.classList.remove('hidden');
        const entries = [
            ['Company', estimate.companyName],
            ['Group', estimate.groupName],
            ['Brand', estimate.brandName],
            ['Zone', estimate.zoneName],
            ['Service', estimate.service],
            ['Quantity', estimate.qty],
            ['Cost per unit', estimate.costPerUnit == null ? '—' : `₹${estimate.costPerUnit}`],
            ['Total cost', estimate.totalCost == null ? '—' : `₹${estimate.totalCost}`],
            ['Delivery date', estimate.deliveryDate],
            ['Delivery details', estimate.deliveryDetails],
            ['Created', estimate.createdAt || '—'],
            ['Updated', estimate.updatedAt || '—']
        ];
        entries.forEach(([label, value]) => {
            const item = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = `${label}: `;
            item.append(strong, document.createTextNode(value == null ? '—' : String(value)));
            details.appendChild(item);
        });
    } else {
        form.classList.remove('hidden');
        details.classList.add('hidden');
        form.reset();
        document.getElementById('estimateChainId').value = '';
        document.getElementById('estimateGroupName').value = '';
        populateEstimateBrands();
        if (estimate) {
            document.getElementById('estimateChainId').value = String(estimate.chainId);
            handleEstimateChainChange();
            populateEstimateBrands(estimate.brandId);
            populateEstimateZones(estimate.zoneId);
            document.getElementById('estimateService').value = estimate.service || '';
            document.getElementById('estimateQty').value = estimate.qty ?? '';
            document.getElementById('estimateCostPerUnit').value = estimate.costPerUnit ?? '';
            document.getElementById('estimateDeliveryDate').value = estimate.deliveryDate || '';
            document.getElementById('estimateDeliveryDetails').value = estimate.deliveryDetails || '';
            calculateEstimateTotal();
        } else {
            document.getElementById('estimateCalculatedTotal').textContent = '₹0.00';
        }
        form.querySelectorAll('input, select, textarea, button[type="submit"]')
            .forEach(element => { element.disabled = isSavingEstimate; });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}


function closeEstimateModal() {
    if (isSavingEstimate) return;
    const modal = document.getElementById('estimateModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingEstimateId = null;
    estimateReadOnly = false;
}


function calculateEstimateTotal() {
    const qtyValue = document.getElementById('estimateQty').value;
    const costValue = document.getElementById('estimateCostPerUnit').value;
    const output = document.getElementById('estimateCalculatedTotal');
    if (!/^[1-9]\d*$/.test(qtyValue) || !/^\d+(\.\d{1,2})?$/.test(costValue)) {
        output.textContent = '₹0.00';
        return;
    }
    const qty = BigInt(qtyValue);
    if (qty > 2147483647n) {
        output.textContent = '₹0.00';
        return;
    }
    const [whole, fraction = ''] = costValue.split('.');
    const unitCostCents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    const totalCents = qty * unitCostCents;
    output.textContent = `₹${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
}


async function submitEstimateForm(event) {
    event.preventDefault();
    if (isSavingEstimate || estimateReadOnly) return;

    const form = document.getElementById('estimateForm');
    const message = document.getElementById('estimateFormMessage');
    const chainId = document.getElementById('estimateChainId').value;
    const brandId = document.getElementById('estimateBrandId').value;
    const zoneId = document.getElementById('estimateZoneId').value;
    const qty = Number(document.getElementById('estimateQty').value);
    const costPerUnit = document.getElementById('estimateCostPerUnit').value;
    const deliveryDate = document.getElementById('estimateDeliveryDate').value;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    if (![chainId, brandId, zoneId].every(id => {
        try {
            return estimateIdString(id) === id;
        } catch {
            return false;
        }
    })
        || !Number.isSafeInteger(qty) || qty <= 0 || qty > 2147483647
        || !/^\d+(\.\d{1,2})?$/.test(costPerUnit)
        || !deliveryDate
        || deliveryDate < today.toISOString().slice(0, 10)) {
        message.textContent = 'Select valid active company, brand, and zone values; use a positive quantity, non-negative cost, and a delivery date that is today or later.';
        message.classList.remove('hidden');
        return;
    }

    const request = {
        chainId,
        brandId,
        zoneId,
        service: document.getElementById('estimateService').value.trim(),
        qty,
        costPerUnit,
        deliveryDate,
        deliveryDetails: document.getElementById('estimateDeliveryDetails').value.trim()
    };
    isSavingEstimate = true;
    form.querySelectorAll('input, select, textarea, button[type="submit"]')
        .forEach(element => { element.disabled = true; });

    try {
        const response = await fetch(
            editingEstimateId
                ? `${ESTIMATE_API}/${encodeURIComponent(editingEstimateId)}`
                : ESTIMATE_API,
            {
                method: editingEstimateId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            }
        );
        if (!response.ok) {
            const details = await response.text();
            message.textContent = details || `Unable to save estimate (HTTP ${response.status}).`;
            message.classList.remove('hidden');
            return;
        }
        showToast('Success', editingEstimateId ? 'Estimate updated successfully.' : 'Estimate created successfully.');
        isSavingEstimate = false;
        closeEstimateModal();
        setEstimatePageMessage('', 'info');
        await loadEstimateManagement();
    } catch (error) {
        console.error('Save Estimate Error:', error);
        message.textContent = 'Unable to connect to the Estimate service. Check the API and try again.';
        message.classList.remove('hidden');
    } finally {
        isSavingEstimate = false;
        form.querySelectorAll('input, select, textarea, button[type="submit"]')
            .forEach(element => { element.disabled = false; });
    }
}

// ======================================================
// END ESTIMATE MANAGEMENT
// ======================================================


// Client Management Functions
async function addClient(e) {

    e.preventDefault();

    const clientData = {

        clientName:
            document.getElementById('clientName')
                .value.trim(),

        organizationName:
            document.getElementById('orgName')
                .value.trim(),

        gstNumber:
            document.getElementById('gstNumber')
                .value.trim()
    };

    try {

        const res =
            await fetch(
                `${API_BASE}/clients`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(clientData)
                }
            );

        if (res.ok) {

            document.getElementById('clientForm').reset();

            showToast(
                "Success",
                "Client saved successfully!"
            );

            await loadClients();

        } else {

            showToast(
                "Error",
                "Failed to save client. Status: " + res.status,
                "error"
            );
        }

    } catch (err) {

        console.error(
            "Save Client Error:",
            err
        );

        showToast(
            "Error",
            "Network error while saving client.",
            "error"
        );
    }
}


async function loadClients() {

    try {

        const res =
            await fetch(`${API_BASE}/clients`);

        if (res.ok) {

            const clients =
                await res.json();

            document.getElementById(
                'stat-client-count'
            ).innerText = clients.length;

            const tbody =
                document.getElementById('clientsTableBody');

            const select = document.getElementById('invoiceClientId');
            if (select) {
                select.replaceChildren(new Option('-- Select Client --', ''));
            }

            if (tbody)
                tbody.replaceChildren();

            clients.forEach(c => {

                const cId =
                    c.clientId || c.id;

                if (select)
                    select.add(new Option(
                        `${c.clientName} (${c.organizationName || 'N/A'})`,
                        cId
                    ));

                if (tbody) {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-slate-100 transition hover:bg-slate-50';
                    [`#${cId}`, c.clientName || '—', c.organizationName || '—', c.gstNumber || '—']
                        .forEach((value, index) => {
                            const cell = document.createElement('td');
                            cell.className = index === 0
                                ? 'px-6 py-3.5 font-bold text-indigo-600'
                                : 'px-6 py-3.5 text-slate-600';
                            cell.textContent = String(value);
                            row.appendChild(cell);
                        });
                    tbody.appendChild(row);
                }
            });
        }

    } catch (e) {

        console.error(
            "Clients Fetch Error:",
            e
        );
    }
}


async function loadInvoices() {
    try {
        const response = await invoiceFetch(INVOICE_API);
        if (!response.ok) {
            throw new Error(await responseError(response, `Invoice list failed (HTTP ${response.status}).`));
        }
        allInvoicesCache = await response.json();
        document.getElementById('stat-invoice-count').innerText = allInvoicesCache.length;
        const pendingDues = allInvoicesCache.reduce(
            (total, invoice) => total + Number(invoice.balanceDue || 0),
            0
        );
        document.getElementById('stat-pending').innerText = `₹${pendingDues.toFixed(2)}`;
        renderInvoicesTable(allInvoicesCache);
        if (document.getElementById('estimateTableBody') && allEstimatesCache.length) {
            filterEstimates();
        }
    } catch (e) {
        console.error('Invoices Fetch Error:', e);
        if (basicAuthHeader) showToast('Invoice Error', e.message || 'Unable to load invoices.', 'error');
    }
}


function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoiceTableBody');
    tbody.replaceChildren();
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-100 transition hover:bg-slate-50';
        const values = [
            invoice.invoiceNumber || `#${invoice.id}`,
            invoice.customerName || invoice.companyName || '—',
            `₹${Number(invoice.taxableAmount || 0).toFixed(2)}`,
            `₹${Number(invoice.gstAmount || 0).toFixed(2)}`,
            `₹${Number(invoice.totalAmount || 0).toFixed(2)} / ₹${Number(invoice.balanceDue || 0).toFixed(2)}`
        ];
        values.forEach((value, index) => {
            const cell = document.createElement('td');
            cell.className = `px-6 py-3.5 text-slate-700 ${index === 4 ? 'font-bold' : ''}`;
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        statusCell.className = 'px-6 py-3.5 text-center';
        const badge = document.createElement('span');
        badge.className = invoice.status === 'PAID'
            ? 'rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700'
            : invoice.status === 'PARTIALLY_PAID'
                ? 'rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700'
                : 'rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700';
        badge.textContent = (invoice.status || 'UNPAID').replace('_', ' ');
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actions = document.createElement('td');
        actions.className = 'whitespace-nowrap px-6 py-3.5 text-center';
        actions.appendChild(createInvoiceAction('View', () => viewInvoice(invoice.id)));
        actions.appendChild(createInvoiceAction('PDF', () => downloadInvoicePdf(invoice.id)));
        if (authenticatedRoles.includes('ADMIN')) {
            actions.appendChild(createInvoiceAction('Email', () => openInvoiceEmail(invoice)));
        }
        if (Number(invoice.balanceDue || 0) > 0) {
            actions.appendChild(createInvoiceAction('Pay', () => openPaymentModal(invoice.id, invoice.balanceDue)));
        }
        row.appendChild(actions);
        tbody.appendChild(row);
    });
}

function createInvoiceAction(label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mr-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
}

function filterInvoices() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const filtered = allInvoicesCache.filter(invoice =>
        (!search || `${invoice.invoiceNumber || ''} ${invoice.id || ''} ${invoice.customerName || ''}`.toLowerCase().includes(search))
        && (status === 'ALL' || invoice.status === status)
    );
    renderInvoicesTable(filtered);
}

async function openInvoiceFromEstimate(estimateId) {
    const message = document.getElementById('invoiceFormMessage');
    message.classList.add('hidden');
    document.getElementById('invoiceSubmitButton').disabled = true;
    document.getElementById('invoiceModalTitle').textContent = 'Loading estimate...';
    const modal = document.getElementById('invoiceModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    try {
        const response = await invoiceFetch(`${INVOICE_API}/estimates/${encodeURIComponent(estimateId)}`);
        if (!response.ok) {
            throw new Error(await responseError(response, `Estimate lookup failed (HTTP ${response.status}).`));
        }
        const estimate = await response.json();
        if (estimate.alreadyInvoiced) {
            throw new Error('This estimate already has an invoice.');
        }
        invoiceEstimateCache = estimate;
        document.getElementById('invoiceModalTitle').textContent = `Create invoice from EST-${estimate.estimateId}`;
        document.getElementById('invoiceEstimateId').value = estimate.estimateId;
        document.getElementById('invoiceQuantity').value = estimate.quantity ?? '';
        document.getElementById('invoiceUnitPrice').value = estimate.unitPrice ?? '';
        document.getElementById('invoiceClientEmail').value = '';
        document.getElementById('invoiceServiceDate').value = localDateString(new Date());
        document.getElementById('invoiceDeliveryDetails').value = estimate.deliveryDetails || '';
        document.getElementById('invoicePaymentInstructions').value = '';
        const summary = document.getElementById('invoiceEstimateSummary');
        summary.replaceChildren();
        [
            ['Estimate', `EST-${estimate.estimateId}`],
            ['Company', estimate.companyName],
            ['Company GSTIN', estimate.companyGstnNo || 'Not provided'],
            ['Customer', estimate.customerName],
            ['Organization', estimate.customerOrganization],
            ['Service', estimate.serviceDescription],
            ['Estimate total', estimate.estimatedTotal == null ? '—' : `₹${estimate.estimatedTotal}`]
        ].forEach(([label, value]) => {
            const item = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = `${label}: `;
            item.append(strong, document.createTextNode(value == null ? '—' : String(value)));
            summary.appendChild(item);
        });
        document.getElementById('invoiceSubmitButton').disabled = false;
    } catch (error) {
        console.error('Estimate Invoice Lookup Error:', error);
        message.textContent = error.message || 'Unable to load estimate details.';
        message.className = 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700';
        message.classList.remove('hidden');
        document.getElementById('invoiceModalTitle').textContent = 'Create Invoice';
        document.getElementById('invoiceSubmitButton').disabled = true;
    }
}

function localDateString(date) {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 10);
}

function closeInvoiceModal() {
    if (isSavingInvoice) return;
    const modal = document.getElementById('invoiceModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    invoiceEstimateCache = null;
}

async function submitInvoice(event) {
    event.preventDefault();
    if (isSavingInvoice || !invoiceEstimateCache) return;
    const message = document.getElementById('invoiceFormMessage');
    const request = {
        estimateId: invoiceEstimateCache.estimateId,
        clientEmail: document.getElementById('invoiceClientEmail').value.trim() || null,
        serviceDate: document.getElementById('invoiceServiceDate').value || null,
        deliveryDetails: document.getElementById('invoiceDeliveryDetails').value.trim() || null,
        paymentInstructions: document.getElementById('invoicePaymentInstructions').value.trim() || null
    };
    isSavingInvoice = true;
    document.getElementById('invoiceSubmitButton').disabled = true;
    message.textContent = 'Creating invoice...';
    message.className = 'rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700';
    message.classList.remove('hidden');
    try {
        const response = await invoiceFetch(INVOICE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            throw new Error(await responseError(response, `Invoice creation failed (HTTP ${response.status}).`));
        }
        const invoice = await response.json();
        closeInvoiceModal();
        showToast('Invoice created', `${invoice.invoiceNumber} was created successfully.`);
        await Promise.all([loadInvoices(), loadPayments()]);
    } catch (error) {
        console.error('Create Invoice Error:', error);
        message.textContent = error.message || 'Unable to create invoice.';
        message.className = 'rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700';
        message.classList.remove('hidden');
    } finally {
        isSavingInvoice = false;
        document.getElementById('invoiceSubmitButton').disabled = false;
    }
}

async function viewInvoice(id) {
    try {
        const response = await invoiceFetch(`${INVOICE_API}/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(await responseError(response, `Invoice lookup failed (HTTP ${response.status}).`));
        const invoice = await response.json();
        const body = document.getElementById('invoiceDetailsBody');
        body.replaceChildren();
        const fields = [
            ['Invoice', invoice.invoiceNumber || `#${invoice.id}`],
            ['Estimate', invoice.estimateId ? `EST-${invoice.estimateId}` : 'Legacy invoice'],
            ['Company', invoice.companyName],
            ['GSTIN', invoice.companyGstnNo],
            ['Customer', invoice.customerName],
            ['Organization', invoice.customerOrganization],
            ['Email', invoice.clientEmail],
            ['Service', invoice.serviceDescription],
            ['Quantity / rate', `${invoice.quantity ?? '—'} / ₹${invoice.unitPrice ?? '—'}`],
            ['Total / paid / balance', `₹${invoice.totalAmount} / ₹${invoice.amountPaid} / ₹${invoice.balanceDue}`],
            ['Status', invoice.status],
            ['Invoice / service date', `${invoice.invoiceDate || '—'} / ${invoice.serviceDate || '—'}`],
            ['Delivery', invoice.deliveryDetails],
            ['Payment details', invoice.paymentInstructions]
        ];
        fields.forEach(([label, value]) => {
            const line = document.createElement('p');
            const title = document.createElement('strong');
            title.textContent = `${label}: `;
            line.append(title, document.createTextNode(value == null || value === '' ? '—' : String(value)));
            body.appendChild(line);
        });
        document.getElementById('invoiceDetailsTitle').textContent = invoice.invoiceNumber || `Invoice #${invoice.id}`;
        const modal = document.getElementById('invoiceDetailsModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } catch (error) {
        showToast('Invoice Error', error.message || 'Unable to load invoice details.', 'error');
    }
}

function closeInvoiceDetails() {
    const modal = document.getElementById('invoiceDetailsModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function downloadInvoicePdf(id) {
    try {
        const response = await invoiceFetch(`${INVOICE_API}/${encodeURIComponent(id)}/pdf`);
        if (!response.ok) throw new Error(await responseError(response, `PDF download failed (HTTP ${response.status}).`));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showToast('PDF Error', error.message || 'Unable to download invoice PDF.', 'error');
    }
}

function openInvoiceEmail(invoice) {
    document.getElementById('emailInvoiceId').value = invoice.id;
    document.getElementById('invoiceRecipientEmail').value = invoice.clientEmail || '';
    document.getElementById('invoiceEmailMessage').classList.add('hidden');
    const modal = document.getElementById('invoiceEmailModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeInvoiceEmail() {
    const modal = document.getElementById('invoiceEmailModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function sendInvoiceEmail(event) {
    event.preventDefault();
    const id = document.getElementById('emailInvoiceId').value;
    const message = document.getElementById('invoiceEmailMessage');
    const button = document.getElementById('invoiceEmailSubmit');
    button.disabled = true;
    message.classList.add('hidden');
    try {
        const response = await invoiceFetch(`${INVOICE_API}/${encodeURIComponent(id)}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientEmail: document.getElementById('invoiceRecipientEmail').value.trim() })
        });
        if (!response.ok) throw new Error(await responseError(response, `Email failed (HTTP ${response.status}).`));
        closeInvoiceEmail();
        showToast('Email sent', 'The invoice email was accepted by the configured SMTP server.');
    } catch (error) {
        message.textContent = error.message || 'Invoice email could not be sent.';
        message.classList.remove('hidden');
    } finally {
        button.disabled = false;
    }
}

// Payment Modal and Processing Functions
let activePaymentIdempotencyKey = null;

function openPaymentModal(id, amount) {
    document.getElementById('modalInvoiceId').innerText = `#${id}`;
    document.getElementById('modalInvIdVal').value = id;
    document.getElementById('modalAmount').value = Number(amount).toFixed(2);
    document.getElementById('modalAmount').max = Number(amount).toFixed(2);
    document.getElementById('paymentModal').classList.remove('hidden');
    activePaymentIdempotencyKey = createIdempotencyKey();
}


function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
    activePaymentIdempotencyKey = null;
}

function createIdempotencyKey() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

async function submitPayment(e) {
    e.preventDefault();
    const data = {
        invoiceId: document.getElementById('modalInvIdVal').value,
        amount: document.getElementById('modalAmount').value,
        paymentMode: document.getElementById('modalMode').value,
        idempotencyKey: activePaymentIdempotencyKey,
        paymentDate: localDateString(new Date())
    };
    const button = e.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
        const response = await invoiceFetch(PAYMENT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(await responseError(response, `Payment failed (HTTP ${response.status}).`));
        }
        closePaymentModal();
        showToast('Payment recorded', 'Payment processed successfully.');
        await Promise.all([loadInvoices(), loadPayments()]);
    } catch (error) {
        console.error('Payment Submission Error:', error);
        showToast('Payment Error', error.message || 'Unable to record payment.', 'error');
    } finally {
        button.disabled = false;
    }
}


async function loadPayments() {
    try {
        const response = await invoiceFetch(PAYMENT_API);
        if (!response.ok) {
            throw new Error(await responseError(response, `Payment history failed (HTTP ${response.status}).`));
        }
        const payments = await response.json();
        const tbody = document.getElementById('paymentsTableBody');
        tbody.replaceChildren();
        let totalRevenue = 0;
        payments.forEach(payment => {
            totalRevenue += Number(payment.amount || 0);
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-100 transition hover:bg-slate-50';
            [
                `#PAY-${payment.id}`,
                `#${payment.invoiceId}`,
                `₹${Number(payment.amount || 0).toFixed(2)}`,
                payment.paymentMode,
                payment.paymentDate || '—'
            ].forEach(value => {
                const cell = document.createElement('td');
                cell.className = 'px-6 py-3.5 text-slate-600';
                cell.textContent = String(value ?? '—');
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });
        document.getElementById('stat-revenue').innerText = `₹${totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('Payments Fetch Error:', error);
    }
}


// Initial session enforcement on DOMContentLoaded
document.addEventListener(
    "DOMContentLoaded",
    function () {
        localStorage.removeItem('ims_session_user');
        localStorage.removeItem('ims_registered_users');
        enforceSessionGuard();

    }
);
