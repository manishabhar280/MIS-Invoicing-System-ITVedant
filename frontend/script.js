const API_BASE = "https://mis-invoicing-system-production-c653.up.railway.app/api/v1";
let allInvoicesCache = [];

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
        toast.className = "fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all transform translate-y-0 opacity-100";
    } else {
        toast.className = "fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all transform translate-y-0 opacity-100";
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
        const usersDB = JSON.parse(localStorage.getItem('ims_registered_users') || '{}');
        usersDB[user] = { name: name, pass: pass };
        localStorage.setItem('ims_registered_users', JSON.stringify(usersDB));
        
        // Clear input fields
        document.getElementById('regName').value = '';
        document.getElementById('regUser').value = '';
        document.getElementById('regPass').value = '';
        
        showToast("Success", "Account created successfully! Please sign in.");
        toggleAuthMode('login'); 
    }
}

// Handle User Sign In
function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    
    const usersDB = JSON.parse(localStorage.getItem('ims_registered_users') || '{}');

    if (usersDB[user] && usersDB[user].pass === pass) {
        localStorage.setItem('ims_session_user', usersDB[user].name || user);
        showToast("Welcome", "Signed in successfully!");
        enforceSessionGuard();
    } else if (user === "admin" && pass === "admin") { 
        localStorage.setItem('ims_session_user', "Admin User");
        showToast("Welcome", "Signed in as Admin!");
        enforceSessionGuard();
    } else {
        showToast("Authentication Failed", "Invalid credentials. Please try again.", "error");
    }
}

// Handle User Logout
function handleLogout() {
    localStorage.removeItem('ims_session_user');
    showToast("Logged Out", "You have been logged out.");
    enforceSessionGuard();
}

// Tab Switching Logic
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = "nav-btn w-full flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl text-sm font-medium transition";
    });

    if (tabName === 'dashboard') {
        document.getElementById('tab-clients').classList.remove('hidden');
        document.getElementById('tab-invoices').classList.remove('hidden');
        document.getElementById('tab-payments').classList.remove('hidden');
        document.getElementById('page-title').innerText = "Dashboard Overview";
    } else {
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        document.getElementById('page-title').innerText = tabName.charAt(0).toUpperCase() + tabName.slice(1) + " Management";
    }

    const activeNav = document.getElementById(`nav-${tabName}`);
    if (activeNav) {
        activeNav.className = "nav-btn w-full flex items-center px-4 py-3 text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/30 transition";
    }
}

// Multi-item Invoice Row Management
function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const div = document.createElement('div');
    div.className = 'item-row grid grid-cols-12 gap-2.5';
    div.innerHTML = `
        <input type="text" placeholder="Item Description" required class="col-span-6 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">
        <input type="number" placeholder="Qty" required min="1" value="1" oninput="calculateInvoiceTotal()" class="item-qty col-span-2 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">
        <input type="number" step="0.01" placeholder="Rate (₹)" required oninput="calculateInvoiceTotal()" class="item-rate col-span-3 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900">
        <button type="button" onclick="removeItemRow(this)" class="col-span-1 text-slate-400 hover:text-rose-600 flex items-center justify-center transition"><i class="fa-solid fa-trash-can"></i></button>
    `;
    container.appendChild(div);
}

function removeItemRow(btn) {
    if (document.querySelectorAll('.item-row').length > 1) {
        btn.parentElement.remove();
        calculateInvoiceTotal();
    }
}

function calculateInvoiceTotal() {
    let taxable = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        taxable += (qty * rate);
    });
    const total = taxable + (taxable * 0.18);
    document.getElementById('computedTotal').innerText = `₹${total.toFixed(2)}`;
    return taxable;
}

// Client Management Functions
async function addClient(e) {
    e.preventDefault();
    const clientData = {
        clientName: document.getElementById('clientName').value.trim(),
        organizationName: document.getElementById('orgName').value.trim(),
        gstNumber: document.getElementById('gstNumber').value.trim()
    };

    try {
        const res = await fetch(`${API_BASE}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });

        if (res.ok) {
            document.getElementById('clientForm').reset();
            showToast("Success", "Client saved successfully!");
            await loadClients();
        } else {
            showToast("Error", "Failed to save client. Status: " + res.status, "error");
        }
    } catch (err) {
        console.error("Save Client Error:", err);
        showToast("Error", "Network error while saving client.", "error");
    }
}

async function loadClients() {
    try {
        const res = await fetch(`${API_BASE}/clients`);
        if (res.ok) {
            const clients = await res.json();
            document.getElementById('stat-client-count').innerText = clients.length;

            const select = document.getElementById('invoiceClientId');
            const tbody = document.getElementById('clientsTableBody');
            
            if(select) select.innerHTML = '<option value="">-- Select Client --</option>';
            if(tbody) tbody.innerHTML = '';

            clients.forEach(c => {
                const cId = c.clientId || c.id;
                if(select) select.innerHTML += `<option value="${cId}">${c.clientName} (${c.organizationName || 'N/A'})</option>`;
                if(tbody) {
                    tbody.innerHTML += `
                        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                            <td class="py-3.5 px-6 font-bold text-indigo-600">#${cId}</td>
                            <td class="py-3.5 px-6 font-semibold text-slate-800">${c.clientName}</td>
                            <td class="py-3.5 px-6 text-slate-500">${c.organizationName || '-'}</td>
                            <td class="py-3.5 px-6 text-slate-500 font-mono">${c.gstNumber || '-'}</td>
                        </tr>`;
                }
            });
        }
    } catch (e) { console.error("Clients Fetch Error:", e); }
}

// Invoice Management Functions
async function createMultiItemInvoice(e) {
    e.preventDefault();
    const taxable = calculateInvoiceTotal();
    const selectedClientId = document.getElementById('invoiceClientId').value;

    if (!selectedClientId) {
        showToast("Validation Error", "Please select a client first!", "error");
        return;
    }

    const data = { clientId: parseInt(selectedClientId), taxableAmount: taxable };

    try {
        const res = await fetch(`${API_BASE}/invoices/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showToast("Invoice Generated", "Invoice generated and saved successfully!");
            document.getElementById('invoiceForm').reset();
            calculateInvoiceTotal();
            loadInvoices();
        } else {
            showToast("Error", "Failed to generate invoice.", "error");
        }
    } catch (e) { 
        console.error("Create Invoice Error:", e); 
        showToast("Error", "Network error while generating invoice.", "error");
    }
}

async function loadInvoices() {
    try {
        const res = await fetch(`${API_BASE}/invoices`);
        if (res.ok) {
            allInvoicesCache = await res.json();
            document.getElementById('stat-invoice-count').innerText = allInvoicesCache.length;
            
            let pendingDues = 0;
            allInvoicesCache.forEach(inv => {
                if (inv.status === 'UNPAID') pendingDues += (inv.totalAmount || 0);
            });
            document.getElementById('stat-pending').innerText = `₹${pendingDues.toFixed(2)}`;

            renderInvoicesTable(allInvoicesCache);
        }
    } catch (e) { console.error("Invoices Fetch Error:", e); }
}


function renderInvoicesTable(invoices) { 
    const tbody = document.getElementById('invoiceTableBody'); 
    tbody.innerHTML = ''; 

    invoices.forEach(inv => { 

        // Support both invoiceId and id from backend
        const invId = inv.invoiceId || inv.id;

        const statusBadge = inv.status === 'PAID'  
            ? `<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">PAID</span>` 
            : `<span class="bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">UNPAID</span>`; 
         
        const actionBtn = inv.status === 'UNPAID' 
            ? `<button onclick="openPaymentModal(${invId}, ${inv.totalAmount})" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition">Pay</button>` 
            : ''; 
 
        tbody.innerHTML += ` 
            <tr class="hover:bg-slate-50 transition border-b border-slate-100"> 
                <td class="py-3.5 px-6 font-bold text-indigo-600">#INV-${invId}</td> 
                <td class="py-3.5 px-6 text-slate-600">Client #${inv.client ? (inv.client.id ?? inv.client.clientId ?? inv.client.client_id) : (inv.clientId ?? inv.client_id ?? 'N/A')}</td>
                <td class="py-3.5 px-6 text-slate-600">₹${(inv.taxableAmount || 0).toFixed(2)}</td> 
                <td class="py-3.5 px-6 text-slate-500">₹${(inv.gstAmount || 0).toFixed(2)}</td> 
                <td class="py-3.5 px-6 font-bold text-slate-900">₹${(inv.totalAmount || 0).toFixed(2)}</td> 
                <td class="py-3.5 px-6 text-center">${statusBadge}</td> 
                <td class="py-3.5 px-6 text-center">${actionBtn}</td> 
            </tr> 
        `; 
    }); 
}

function filterInvoices() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const statusVal = document.getElementById('statusFilter').value;

    const filtered = allInvoicesCache.filter(inv => {
        const matchesSearch = inv.invoiceId.toString().includes(searchVal);
        const matchesStatus = (statusVal === 'ALL') || (inv.status === statusVal);
        return matchesSearch && matchesStatus;
    });
    renderInvoicesTable(filtered);
}

// Payment Modal and Processing Functions
function openPaymentModal(id, amount) {
    document.getElementById('modalInvoiceId').innerText = `#INV-${id}`;
    document.getElementById('modalInvIdVal').value = id;
    document.getElementById('modalAmount').value = amount;
    document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() { 
    document.getElementById('paymentModal').classList.add('hidden'); 
}

async function submitPayment(e) {
    e.preventDefault();
    const data = {
        invoiceId: parseInt(document.getElementById('modalInvIdVal').value),
        amountPaid: parseFloat(document.getElementById('modalAmount').value),
        paymentMode: document.getElementById('modalMode').value
    };
    try {
        const res = await fetch(`${API_BASE}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closePaymentModal();
            showToast("Payment Recorded", "Payment processed successfully!");
            loadInvoices();
            loadPayments();
        } else {
            showToast("Error", "Failed to process payment.", "error");
        }
    } catch (e) {
        console.error("Payment Submission Error:", e);
        showToast("Error", "Network error while submitting payment.", "error");
    }
}

async function loadPayments() {
    try {
        const res = await fetch(`${API_BASE}/payments`);
        if (res.ok) {
            const payments = await res.json();
            let totalRev = 0;
            const tbody = document.getElementById('paymentsTableBody');
            tbody.innerHTML = '';
            payments.forEach(p => {
                totalRev += p.amountPaid;
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                        <td class="py-3.5 px-6 font-bold text-indigo-600">#PAY-${p.paymentId}</td>
                        <td class="py-3.5 px-6 text-slate-600">#INV-${p.invoice ? p.invoice.invoiceId : p.invoiceId}</td>
                        <td class="py-3.5 px-6 font-bold text-emerald-600">₹${(p.amountPaid||0).toFixed(2)}</td>
                        <td class="py-3.5 px-6"><span class="bg-indigo-50 text-indigo-700 font-semibold text-xs px-2.5 py-1 rounded-md border border-indigo-100">${p.paymentMode}</span></td>
                        <td class="py-3.5 px-6 text-slate-500">${p.paymentDate || 'Today'}</td>
                    </tr>
                `;
            });
            document.getElementById('stat-revenue').innerText = `₹${totalRev.toFixed(2)}`;
        }
    } catch (e) { console.error("Payments Fetch Error:", e); }
}

// Initial session enforcement on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
    enforceSessionGuard();
});