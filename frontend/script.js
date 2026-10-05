const API_BASE = "https://mis-invoicing-system-production-c653.up.railway.app/api/v1";

const LOCAL_API_BASE = "http://localhost:8080/api";
const GROUP_API = `${LOCAL_API_BASE}/groups`;
const CHAIN_API = `${LOCAL_API_BASE}/chains`;

let allInvoicesCache = [];
let chainGroupOptions = [];
let chainsCache = [];
let editingChainId = null;
let isSavingChain = false;


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


// Session Strict Guard Function
function enforceSessionGuard() {

    const activeUser = localStorage.getItem('ims_session_user');

    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (activeUser && activeUser.trim() !== "") {

        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');

        document.getElementById('activeUserDisplay').innerText = activeUser;

        loadClients();
        loadInvoices();
        loadPayments();

        switchTab('dashboard');

    } else {

        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
}


// Toggle between Login and Register cards
function toggleAuthMode(mode) {

    if (mode === 'register') {

        document.getElementById('card-login').classList.add('hidden');
        document.getElementById('card-register').classList.remove('hidden');

    } else {

        document.getElementById('card-register').classList.add('hidden');
        document.getElementById('card-login').classList.remove('hidden');
    }
}


// Handle User Registration
function handleRegister(e) {

    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();

    if (user && pass) {

        const usersDB =
            JSON.parse(localStorage.getItem('ims_registered_users') || '{}');

        usersDB[user] = {
            name: name,
            pass: pass
        };

        localStorage.setItem(
            'ims_registered_users',
            JSON.stringify(usersDB)
        );

        // Clear input fields
        document.getElementById('regName').value = '';
        document.getElementById('regUser').value = '';
        document.getElementById('regPass').value = '';

        showToast(
            "Success",
            "Account created successfully! Please sign in."
        );

        toggleAuthMode('login');
    }
}


// Handle User Sign In
function handleLogin(e) {

    e.preventDefault();

    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    const usersDB =
        JSON.parse(localStorage.getItem('ims_registered_users') || '{}');

    if (usersDB[user] && usersDB[user].pass === pass) {

        localStorage.setItem(
            'ims_session_user',
            usersDB[user].name || user
        );

        showToast(
            "Welcome",
            "Signed in successfully!"
        );

        enforceSessionGuard();

    } else if (user === "admin" && pass === "admin") {

        localStorage.setItem(
            'ims_session_user',
            "Admin User"
        );

        showToast(
            "Welcome",
            "Signed in as Admin!"
        );

        enforceSessionGuard();

    } else {

        showToast(
            "Authentication Failed",
            "Invalid credentials. Please try again.",
            "error"
        );
    }
}


// Handle User Logout
function handleLogout() {

    localStorage.removeItem('ims_session_user');

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
                    : tabName.charAt(0).toUpperCase() +
                      tabName.slice(1) +
                      " Management";
        document.getElementById('page-subtitle')
            .innerText = tabName === 'chains'
                ? "Manage company details, GSTN registration, and group assignments."
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

            tbody.innerHTML = '';

            groups.forEach(group => {

                const status =
                    group.isActive
                        ? "Active"
                        : "Inactive";

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                        <td class="py-3.5 px-6 font-bold text-indigo-600">
                            #${group.groupId}
                        </td>

                        <td class="py-3.5 px-6 font-semibold text-slate-800">
                            ${group.groupName}
                        </td>

                        <td class="py-3.5 px-6">
                            <span class="${
                                group.isActive
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-100 text-rose-700 border border-rose-200'
                            } text-xs font-bold px-3 py-1 rounded-full">
                                ${status}
                            </span>
                        </td>

                        <td class="py-3.5 px-6 text-center">

                            <button
                                onclick="editGroup(${group.groupId}, '${group.groupName.replace(/'/g, "\\'")}')"
                                class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg mr-2">
                                Edit
                            </button>

                            ${
                                group.isActive
                                ? `
                                    <button
                                        onclick="deactivateGroup(${group.groupId})"
                                        class="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg">
                                        Deactivate
                                    </button>
                                  `
                                : `
                                    <button
                                        onclick="activateGroup(${group.groupId})"
                                        class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg">
                                        Activate
                                    </button>
                                  `
                            }
                        </td>

                    </tr>
                `;
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


// Multi-item Invoice Row Management
function addItemRow() {

    const container =
        document.getElementById('itemsContainer');

    const div =
        document.createElement('div');

    div.className =
        'item-row grid grid-cols-12 gap-2.5';

    div.innerHTML = `

        <input
            type="text"
            placeholder="Item Description"
            required
            class="col-span-6 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">

        <input
            type="number"
            placeholder="Qty"
            required
            min="1"
            value="1"
            oninput="calculateInvoiceTotal()"
            class="item-qty col-span-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">

        <input
            type="number"
            step="0.01"
            placeholder="Rate (₹)"
            required
            oninput="calculateInvoiceTotal()"
            class="item-rate col-span-3 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">

        <button
            type="button"
            onclick="removeItemRow(this)"
            class="col-span-1 text-slate-400 hover:text-rose-600 flex items-center justify-center transition">

            <i class="fa-solid fa-trash-can"></i>

        </button>
    `;

    container.appendChild(div);
}


function removeItemRow(btn) {

    if (
        document.querySelectorAll('.item-row').length > 1
    ) {

        btn.parentElement.remove();

        calculateInvoiceTotal();
    }
}


function calculateInvoiceTotal() {

    let taxable = 0;

    document.querySelectorAll('.item-row')
        .forEach(row => {

            const qty =
                parseFloat(
                    row.querySelector('.item-qty').value
                ) || 0;

            const rate =
                parseFloat(
                    row.querySelector('.item-rate').value
                ) || 0;

            taxable += (qty * rate);
        });

    const total =
        taxable + (taxable * 0.18);

    document.getElementById('computedTotal').innerText =
        `₹${total.toFixed(2)}`;

    return taxable;
}


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

            const select =
                document.getElementById('invoiceClientId');

            const tbody =
                document.getElementById('clientsTableBody');

            if (select)
                select.innerHTML =
                    '<option value="">-- Select Client --</option>';

            if (tbody)
                tbody.innerHTML = '';

            clients.forEach(c => {

                const cId =
                    c.clientId || c.id;

                if (select)
                    select.innerHTML +=
                        `<option value="${cId}">
                            ${c.clientName}
                            (${c.organizationName || 'N/A'})
                        </option>`;

                if (tbody) {

                    tbody.innerHTML += `

                        <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                            <td class="py-3.5 px-6 font-bold text-indigo-600">
                                #${cId}
                            </td>

                            <td class="py-3.5 px-6 font-semibold text-slate-800">
                                ${c.clientName}
                            </td>

                            <td class="py-3.5 px-6 text-slate-500">
                                ${c.organizationName || '-'}
                            </td>

                            <td class="py-3.5 px-6 text-slate-500 font-mono">
                                ${c.gstNumber || '-'}
                            </td>

                        </tr>
                    `;
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


// Invoice Management Functions
async function createMultiItemInvoice(e) {

    e.preventDefault();

    const taxable =
        calculateInvoiceTotal();

    const selectedClientId =
        document.getElementById('invoiceClientId').value;

    if (!selectedClientId) {

        showToast(
            "Validation Error",
            "Please select a client first!",
            "error"
        );

        return;
    }

    const data = {
        clientId: parseInt(selectedClientId),
        taxableAmount: taxable
    };

    try {

        const res =
            await fetch(
                `${API_BASE}/invoices/generate`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(data)
                }
            );

        if (res.ok) {

            showToast(
                "Invoice Generated",
                "Invoice generated and saved successfully!"
            );

            document.getElementById(
                'invoiceForm'
            ).reset();

            calculateInvoiceTotal();

            loadInvoices();

        } else {

            showToast(
                "Error",
                "Failed to generate invoice.",
                "error"
            );
        }

    } catch (e) {

        console.error(
            "Create Invoice Error:",
            e
        );

        showToast(
            "Error",
            "Network error while generating invoice.",
            "error"
        );
    }
}


async function loadInvoices() {

    try {

        const res =
            await fetch(`${API_BASE}/invoices`);

        if (res.ok) {

            allInvoicesCache =
                await res.json();

            document.getElementById(
                'stat-invoice-count'
            ).innerText =
                allInvoicesCache.length;

            let pendingDues = 0;

            allInvoicesCache.forEach(inv => {

                if (inv.status === 'UNPAID')
                    pendingDues +=
                        (inv.totalAmount || 0);
            });

            document.getElementById(
                'stat-pending'
            ).innerText =
                `₹${pendingDues.toFixed(2)}`;

            renderInvoicesTable(
                allInvoicesCache
            );
        }

    } catch (e) {

        console.error(
            "Invoices Fetch Error:",
            e
        );
    }
}


function renderInvoicesTable(invoices) {

    const tbody =
        document.getElementById(
            'invoiceTableBody'
        );

    tbody.innerHTML = '';

    invoices.forEach(inv => {

        // Support both invoiceId and id from backend
        const invId =
            inv.invoiceId || inv.id;

        const statusBadge =
            inv.status === 'PAID'

                ? `<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">PAID</span>`

                : `<span class="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">UNPAID</span>`;

        const actionBtn =
            inv.status === 'UNPAID'

                ? `<button
                        onclick="openPaymentModal(${invId}, ${inv.totalAmount})"
                        class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition">
                        Pay
                   </button>`

                : '';

        tbody.innerHTML += `

            <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                <td class="py-3.5 px-6 font-bold text-indigo-600">
                    #INV-${invId}
                </td>

                <td class="py-3.5 px-6 text-slate-600">
                    Client #${
                        inv.client
                            ? (
                                inv.client.id ??
                                inv.client.clientId ??
                                inv.client.client_id
                              )
                            : (
                                inv.clientId ??
                                inv.client_id ??
                                'N/A'
                              )
                    }
                </td>

                <td class="py-3.5 px-6 text-slate-600">
                    ₹${(inv.taxableAmount || 0).toFixed(2)}
                </td>

                <td class="py-3.5 px-6 text-slate-500">
                    ₹${(inv.gstAmount || 0).toFixed(2)}
                </td>

                <td class="py-3.5 px-6 font-bold text-slate-900">
                    ₹${(inv.totalAmount || 0).toFixed(2)}
                </td>

                <td class="py-3.5 px-6 text-center">
                    ${statusBadge}
                </td>

                <td class="py-3.5 px-6 text-center">
                    ${actionBtn}
                </td>

            </tr>
        `;
    });
}


function filterInvoices() {

    const searchVal =
        document.getElementById(
            'searchInput'
        ).value.toLowerCase();

    const statusVal =
        document.getElementById(
            'statusFilter'
        ).value;

    const filtered =
        allInvoicesCache.filter(inv => {

            const matchesSearch =
                inv.invoiceId
                    .toString()
                    .includes(searchVal);

            const matchesStatus =
                (statusVal === 'ALL') ||
                (inv.status === statusVal);

            return matchesSearch &&
                   matchesStatus;
        });

    renderInvoicesTable(filtered);
}


// Payment Modal and Processing Functions
function openPaymentModal(id, amount) {

    document.getElementById(
        'modalInvoiceId'
    ).innerText =
        `#INV-${id}`;

    document.getElementById(
        'modalInvIdVal'
    ).value = id;

    document.getElementById(
        'modalAmount'
    ).value = amount;

    document.getElementById(
        'paymentModal'
    ).classList.remove('hidden');
}


function closePaymentModal() {

    document.getElementById(
        'paymentModal'
    ).classList.add('hidden');
}


async function submitPayment(e) {

    e.preventDefault();

    const data = {

        invoiceId:
            parseInt(
                document.getElementById(
                    'modalInvIdVal'
                ).value
            ),

        amountPaid:
            parseFloat(
                document.getElementById(
                    'modalAmount'
                ).value
            ),

        paymentMode:
            document.getElementById(
                'modalMode'
            ).value
    };

    try {

        const res =
            await fetch(
                `${API_BASE}/payments`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify(data)
                }
            );

        if (res.ok) {

            closePaymentModal();

            showToast(
                "Payment Recorded",
                "Payment processed successfully!"
            );

            loadInvoices();
            loadPayments();

        } else {

            showToast(
                "Error",
                "Failed to process payment.",
                "error"
            );
        }

    } catch (e) {

        console.error(
            "Payment Submission Error:",
            e
        );

        showToast(
            "Error",
            "Network error while submitting payment.",
            "error"
        );
    }
}


async function loadPayments() {

    try {

        const res =
            await fetch(`${API_BASE}/payments`);

        if (res.ok) {

            const payments =
                await res.json();

            let totalRev = 0;

            const tbody =
                document.getElementById(
                    'paymentsTableBody'
                );

            tbody.innerHTML = '';

            payments.forEach(p => {

                totalRev += p.amountPaid;

                tbody.innerHTML += `

                    <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                        <td class="py-3.5 px-6 font-bold text-indigo-600">
                            #PAY-${p.id}
                        </td>

                        <td class="py-3.5 px-6 text-slate-600">
                            #INV-${
                                p.invoice
                                    ? p.invoice.id
                                    : p.invoiceId
                            }
                        </td>

                        <td class="py-3.5 px-6 font-bold text-emerald-600">
                            ₹${(p.amountPaid || 0).toFixed(2)}
                        </td>

                        <td class="py-3.5 px-6">

                            <span class="bg-indigo-50 text-indigo-700 font-semibold text-xs px-2.5 py-1 rounded-md border border-indigo-100">

                                ${p.paymentMode}

                            </span>

                        </td>

                        <td class="py-3.5 px-6 text-slate-500">
                            ${p.paymentDate || 'Today'}
                        </td>

                    </tr>
                `;
            });

            document.getElementById(
                'stat-revenue'
            ).innerText =
                `₹${totalRev.toFixed(2)}`;
        }

    } catch (e) {

        console.error(
            "Payments Fetch Error:",
            e
        );
    }
}


// Initial session enforcement on DOMContentLoaded
document.addEventListener(
    "DOMContentLoaded",
    function () {

        enforceSessionGuard();

    }
);
