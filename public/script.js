
"use strict";

const API = "/api/expenses";
const STORAGE = {
    tasks: "lifeassist_tasks_v2",
    goals: "lifeassist_goals_v2",
    reminders: "lifeassist_reminders_v2",
    documents: "lifeassist_documents_v2"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let expenses = [];
let expenseChart = null;
let toastTimer = null;

function loadLocal(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function saveLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        showToast("Could not save data in this browser.");
        return false;
    }
}

function makeId() {
    return (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function setMessage(message, type = "", selector = "#expense-message") {
    const element = $(selector);
    if (!element) return;
    element.textContent = message;
    element.className = `form-message full-width ${type}`;
}

function setButtonLoading(button, loading, loadingText = "Saving…") {
    if (!button) return;
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = escapeHTML(loadingText);
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
        delete button.dataset.originalText;
    }
}

/* ---------------- Navigation and sidebar ---------------- */

const pageInfo = {
    overview: ["Overview", "A clearer view of your everyday life."],
    expenses: ["Expenses", "Track your spending and review transactions."],
    tasks: ["My Tasks", "Turn your plans into achievable steps."],
    goals: ["Goals & Savings", "Track your progress towards your goals."],
    reminders: ["Reminders", "Keep important dates in sight."],
    documents: ["Documents", "Manage your personal document checklist."],
    tools: ["Everyday Tools", "Useful calculators for daily planning."],
    feedback: ["Feedback", "Share your experience and help us improve LifeAssist."]
};

function showPage(name) {
    if (!pageInfo[name]) name = "overview";

    $$(".page").forEach((page) => page.classList.remove("active"));
    const target = $(`#page-${name}`);
    if (target) target.classList.add("active");

    $$(".nav-item").forEach((button) => {
        const active = button.dataset.page === name;
        button.classList.toggle("active", active);
        if (active) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });

    $("#page-title").textContent = pageInfo[name][0];
    $("#page-subtitle").textContent = pageInfo[name][1];

    document.body.classList.remove("mobile-menu-open");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (name === "overview") {
        renderRecentExpenses();
        renderChart();
    }
}

$$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

$$("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.go));
});

$("#sidebar-toggle").addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
        document.body.classList.toggle("mobile-menu-open");
    } else {
        document.body.classList.toggle("sidebar-collapsed");
    }
});

$("#today-label").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
});

/* ---------------- Expenses: MongoDB API ---------------- */

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    const raw = await response.text();
    let data = null;

    if (raw) {
        try {
            data = JSON.parse(raw);
        } catch {
            data = { message: raw };
        }
    }

    if (!response.ok) {
        throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
    }

    return data;
}

function normalizeExpenses(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.expenses)) return data.expenses;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

function expenseId(expense) {
    return expense?._id || expense?.id || "";
}

function expenseRow(expense) {
    const id = expenseId(expense);
    const date = expense.date || expense.createdAt;

    return `
        <tr>
            <td>${escapeHTML(expense.title)}</td>
            <td><span class="category-tag">${escapeHTML(expense.category)}</span></td>
            <td>${escapeHTML(formatDate(String(date || "").slice(0, 10)))}</td>
            <td class="amount-cell">${escapeHTML(money(expense.amount))}</td>
            <td>
                <button class="secondary-button" type="button"
                    data-edit-expense="${escapeHTML(id)}">Edit</button>
                <button class="delete-button" type="button"
                    data-delete-expense="${escapeHTML(id)}">Delete</button>
            </td>
        </tr>`;
}

function expenseTable(items, emptyMessage = "No expenses added yet.") {
    if (!items.length) {
        return `<div class="empty-state"><span>🧾</span>${escapeHTML(emptyMessage)}<br>Use the Add Expense form to record your first entry.</div>`;
    }

    return `
        <table class="data-table">
            <thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>${items.map(expenseRow).join("")}</tbody>
        </table>`;
}

function renderExpenseViews() {
    const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    $("#expense-total").textContent = money(total);
    $("#expense-count").textContent = String(expenses.length);
    $("#stat-expenses").textContent = money(total);

    $("#expense-list").innerHTML = expenseTable(
        [...expenses].sort((a, b) =>
            new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
        ),
        "No expenses recorded yet."
    );

    renderRecentExpenses();
    renderChart();
}

function renderRecentExpenses() {
    const recent = [...expenses]
        .sort((a, b) =>
            new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)
        )
        .slice(0, 5);

    $("#recent-expenses").innerHTML = expenseTable(
        recent,
        "Your recent expenses will appear here."
    );
}

function renderChart() {
    const canvas = $("#expense-chart");
    if (!canvas || typeof Chart === "undefined") return;

    const totals = {};
    expenses.forEach((expense) => {
        const category = expense.category || "Other";
        totals[category] = (totals[category] || 0) + (Number(expense.amount) || 0);
    });

    const labels = Object.keys(totals);
    const values = labels.map((label) => totals[label]);

    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["No expenses yet"],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: labels.length
                    ? ["#4386f7", "#35bd8a", "#f1c84c", "#ef729b", "#9878ef", "#ff9a70", "#63cbd2", "#94a3b8"]
                    : ["#e4edf8"],
                borderColor: "#ffffff",
                borderWidth: 4,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "66%",
            animation: { duration: 800 },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { usePointStyle: true, pointStyle: "circle", padding: 16, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            if (!labels.length) return "Add an expense to see your spending";
                            return `${context.label}: ${money(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

async function loadExpenses() {
    try {
        const data = await apiRequest(API);
        expenses = normalizeExpenses(data);
        renderExpenseViews();
        updateDashboardStats();
    } catch (error) {
        $("#expense-list").innerHTML = `
            <div class="empty-state"><span>⚠️</span>
            Unable to load expenses from MongoDB.<br>${escapeHTML(error.message)}
            </div>`;
        $("#recent-expenses").innerHTML = `
            <div class="empty-state">Could not load recent expenses. Check the server connection.</div>`;
        showToast("Could not load expenses. Check your server terminal.");
    }
}

$("#expense-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const title = $("#expense-title").value.trim();
    const amount = Number($("#expense-amount").value);
    const category = $("#expense-category").value;
    const date = $("#expense-date").value || localDateString();
    const button = $("#add-expense-button");
if (
    !title ||
    !/\S/.test(title) ||
    title.length > 100 ||
    !category ||
    !Number.isFinite(amount) ||
    amount <= 0
) {
    setMessage(
        "Enter a valid expense name, choose a category, and enter an amount greater than zero.",
        "error"
    );
    return;
}

    setMessage("");
    setButtonLoading(button, true, "Saving expense…");

    try {
        const data = await apiRequest(API, {
            method: "POST",
            body: JSON.stringify({ title, amount, category, date })
        });

        if (data?.expense && expenseId(data.expense)) {
            expenses = [data.expense, ...expenses.filter(
                (item) => expenseId(item) !== expenseId(data.expense)
            )];
            renderExpenseViews();
        } else {
            await loadExpenses();
        }

        form.reset();
        $("#expense-date").value = localDateString();
        setMessage("Expense added successfully!", "success");
        showToast("Expense saved to MongoDB successfully!");
        updateDashboardStats();
    } catch (error) {
        setMessage(`Could not add expense: ${error.message}`, "error");
    } finally {
        setButtonLoading(button, false);
    }
});

async function editExpense(id, button) {
    const expense = expenses.find(
        (item) => expenseId(item) === id
    );

    if (!expense) {
        showToast("Expense not found.");
        return;
    }

    const title = window.prompt("Expense name:", expense.title);
    if (title === null) return;

    const amountText = window.prompt(
        "Amount in rupees:",
        String(expense.amount)
    );
    if (amountText === null) return;

    const category = window.prompt(
        "Category:",
        expense.category
    );
    if (category === null) return;

    const date = window.prompt(
        "Date (YYYY-MM-DD):",
        String(expense.date || expense.createdAt || "").slice(0, 10)
    );
    if (date === null) return;

    const amount = Number(amountText);

    if (
        !title.trim() ||
        !category.trim() ||
        amountText.trim() === "" ||
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        showToast("Please enter valid expense details.");
        return;
    }

    if (button) button.disabled = true;

    try {
        const data = await apiRequest(
            `${API}/${encodeURIComponent(id)}`,
            {
                method: "PUT",
                body: JSON.stringify({
                    title: title.trim(),
                    amount,
                    category: category.trim(),
                    date: date.trim()
                })
            }
        );

        const updated = data?.expense;

        if (!updated) {
            await loadExpenses();
        } else {
            expenses = expenses.map((item) =>
                expenseId(item) === id ? updated : item
            );
            renderExpenseViews();
        }

        updateDashboardStats();
        showToast("Expense updated successfully!");
    } catch (error) {
        showToast(`Could not update expense: ${error.message}`);
    } finally {
        if (button) button.disabled = false;
    }
}


async function deleteExpense(id, button) {
    if (!id) {
        showToast("This expense has no valid database ID.");
        return;
    }
    if (!window.confirm("Are you sure you want to delete this expense?")) return;

    if (button) button.disabled = true;

    try {
        await apiRequest(`${API}/${encodeURIComponent(id)}`, { method: "DELETE" });
        expenses = expenses.filter((item) => expenseId(item) !== id);
        renderExpenseViews();
        updateDashboardStats();
        showToast("Expense deleted.");
    } catch (error) {
        showToast(`Could not delete expense: ${error.message}`);
        if (button) button.disabled = false;
    }
}

document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-expense]");

    if (editButton) {
        editExpense(editButton.dataset.editExpense, editButton);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-expense]");

    if (deleteButton) {
        deleteExpense(deleteButton.dataset.deleteExpense, deleteButton);
    }
});

jQuery("#refresh-expenses").on("click", function () {
    const button = jQuery(this);

    button.prop("disabled", true);
    button.text("Refreshing...");

    jQuery.ajax({
        url: API,
        method: "GET",
        dataType: "json",

        success: function (data) {
            expenses = normalizeExpenses(data);
            renderExpenseViews();
            updateDashboardStats();

            showToast(
                `Refresh successful! ${expenses.length} expense(s) loaded.`
            );
        },

        error: function (xhr) {
            showToast(
                "Could not refresh expenses. Check your server connection."
            );
            console.error("Refresh error:", xhr.status, xhr.responseText);
        },

        complete: function () {
            button.prop("disabled", false);
            button.text("↻ Refresh");
        }
    });
});

/* ---------------- Tasks ---------------- */

let tasks = loadLocal(STORAGE.tasks);

function renderTasks() {
    const list = $("#task-list");
    const completed = tasks.filter((task) => task.completed).length;

    $("#stat-tasks").textContent = `${completed} / ${tasks.length}`;
    $("#task-count-label").textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;

    if (!tasks.length) {
        list.innerHTML = `<div class="panel empty-state"><span>✓</span>No tasks yet. Add a task to start organising your day.</div>`;
        return;
    }

    list.innerHTML = tasks.map((task) => `
        <article class="item-card ${task.completed ? "completed" : ""}">
            <input class="item-check" type="checkbox" data-task-toggle="${escapeHTML(task.id)}"
                ${task.completed ? "checked" : ""} aria-label="Mark ${escapeHTML(task.name)} completed">
            <div class="item-card-main">
                <h3>${escapeHTML(task.name)}</h3>
                <p>${task.due ? `Due: ${escapeHTML(formatDate(task.due))}` : "No due date set"}</p>
                <span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)} priority</span>
            </div>
            <button class="delete-button" type="button" data-task-delete="${escapeHTML(task.id)}">Delete</button>
        </article>
    `).join("");
}

$("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#task-name").value.trim();
    if (!name) return;

    tasks.unshift({
        id: makeId(),
        name,
        due: $("#task-due").value,
        priority: $("#task-priority").value,
        completed: false
    });

    if (saveLocal(STORAGE.tasks, tasks)) {
        event.currentTarget.reset();
        renderTasks();
        updateDashboardStats();
        showToast("Task added.");
    }
});

$("#task-list").addEventListener("change", (event) => {
    const id = event.target.dataset.taskToggle;
    if (!id) return;

    tasks = tasks.map((task) => task.id === id
        ? { ...task, completed: event.target.checked }
        : task
    );
    saveLocal(STORAGE.tasks, tasks);
    renderTasks();
    updateDashboardStats();
});

$("#task-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-task-delete]");
    if (!button) return;

    tasks = tasks.filter((task) => task.id !== button.dataset.taskDelete);
    saveLocal(STORAGE.tasks, tasks);
    renderTasks();
    updateDashboardStats();
    showToast("Task deleted.");
});

/* ---------------- Savings goals ---------------- */

let goals = loadLocal(STORAGE.goals);

function renderGoals() {
    const list = $("#goal-list");
    $("#stat-goals").textContent = String(goals.length);

    if (!goals.length) {
        list.innerHTML = `<div class="panel empty-state"><span>🎯</span>No goals yet. Create your first savings goal.</div>`;
        return;
    }

    list.innerHTML = goals.map((goal) => {
        const target = Number(goal.target) || 0;
        const saved = Number(goal.saved) || 0;
        const percent = target > 0 ? Math.min(100, Math.max(0, saved / target * 100)) : 0;

        return `
            <article class="item-card">
                <div class="item-card-main">
                    <h3>🎯 ${escapeHTML(goal.name)}</h3>
                    <p>${goal.due ? `Target date: ${escapeHTML(formatDate(goal.due))}` : "Keep saving towards your goal."}</p>
                    <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
                    <div class="goal-numbers">
                        <span>${escapeHTML(money(saved))} saved</span>
                        <span>${escapeHTML(money(target))} target</span>
                    </div>
                    <p class="goal-percent">${Math.round(percent)}% complete · ${money(Math.max(0, target - saved))} to go</p>
                </div>
                <div class="item-actions">
                    <button class="secondary-button" type="button" data-goal-add="${escapeHTML(goal.id)}">＋ Save</button>
                    <button class="delete-button" type="button" data-goal-delete="${escapeHTML(goal.id)}">Delete</button>
                </div>
            </article>`;
    }).join("");
}

$("#goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#goal-name").value.trim();
    const target = Number($("#goal-target").value);
    const saved = Number($("#goal-saved").value);

    if (!name || !Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(saved) || saved < 0) {
        showToast("Enter a valid goal and amounts.");
        return;
    }

    goals.unshift({
        id: makeId(),
        name,
        target,
        saved,
        due: $("#goal-date").value
    });

    if (saveLocal(STORAGE.goals, goals)) {
        event.currentTarget.reset();
        $("#goal-saved").value = "0";
        renderGoals();
        updateDashboardStats();
        showToast("Savings goal created.");
    }
});

$("#goal-list").addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-goal-add]");
    const deleteButton = event.target.closest("[data-goal-delete]");

    if (addButton) {
        const goal = goals.find((item) => item.id === addButton.dataset.goalAdd);
        if (!goal) return;

        const input = window.prompt(`How much would you like to add to "${goal.name}"?`);
        if (input === null) return;

        const amount = Number(input);
        if (!Number.isFinite(amount) || amount <= 0) {
            showToast("Enter an amount greater than zero.");
            return;
        }

        goal.saved = (Number(goal.saved) || 0) + amount;
        saveLocal(STORAGE.goals, goals);
        renderGoals();
        showToast("Savings progress updated.");
    }

    if (deleteButton) {
        goals = goals.filter((goal) => goal.id !== deleteButton.dataset.goalDelete);
        saveLocal(STORAGE.goals, goals);
        renderGoals();
        updateDashboardStats();
        showToast("Goal deleted.");
    }
});


/* ---------------- Reminders ---------------- */

let reminders = loadLocal(STORAGE.reminders);
const notifiedReminderIds = new Set();

function formatReminderTime(value) {
    if (!value) return "Time not set";

    const parts = value.split(":");
    if (parts.length !== 2) return value;

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        hours < 0 || hours > 23 ||
        minutes < 0 || minutes > 59
    ) {
        return value;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function renderReminders() {
    const list = $("#reminder-list");
    if (!list) return;

    $("#stat-reminders").textContent = String(reminders.length);

    if (!reminders.length) {
        list.innerHTML = `
            <div class="panel empty-state">
                <span>⏰</span>
                No reminders yet. Add one to keep track of an important date.
            </div>`;
        return;
    }

    const sorted = [...reminders].sort((a, b) =>
        `${a.date || ""} ${a.time || ""}`.localeCompare(
            `${b.date || ""} ${b.time || ""}`
        )
    );

    list.innerHTML = sorted.map((reminder) => `
        <article class="item-card">
            <span class="intro-icon">⏰</span>
            <div class="item-card-main">
                <h3>${escapeHTML(reminder.name)}</h3>
                <p>
                    ${escapeHTML(formatDate(reminder.date))}
                    ${reminder.time
                        ? ` · ${escapeHTML(formatReminderTime(reminder.time))}`
                        : " · Time not set"}
                </p>
            </div>
            <button class="delete-button" type="button"
                data-reminder-delete="${escapeHTML(reminder.id)}">
                Delete
            </button>
        </article>
    `).join("");
}

async function requestReminderNotificationPermission() {
    if (!("Notification" in window)) {
        showToast("This browser does not support notifications.");
        return false;
    }

    if (Notification.permission === "granted") return true;

    if (Notification.permission === "denied") {
        showToast("Notifications are blocked in browser settings.");
        return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        showToast("Browser notifications enabled.");
        return true;
    }

    showToast("Notification permission was not granted.");
    return false;
}

function checkDueReminders() {
    if (!("Notification" in window) ||
        Notification.permission !== "granted") {
        return;
    }

    const now = new Date();

    reminders.forEach((reminder) => {
        if (!reminder.date || !reminder.time) return;
        if (notifiedReminderIds.has(reminder.id)) return;

        const due = new Date(`${reminder.date}T${reminder.time}:00`);

        if (Number.isNaN(due.getTime())) return;

        // Notify when the due time has arrived, including a short
        // catch-up window if the page was briefly inactive.
        const difference = now.getTime() - due.getTime();

        if (difference >= 0 && difference < 60_000) {
            notifiedReminderIds.add(reminder.id);

            const notification = new Notification("LifeAssist Reminder", {
                body: reminder.name,
                tag: `lifeassist-${reminder.id}`
            });

            notification.onclick = () => {
                window.focus();
                showPage("reminders");
                notification.close();
            };
        }
    });
}

$("#reminder-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = $("#reminder-name").value.trim();
    const date = $("#reminder-date").value;
    const time = $("#reminder-time").value;

    if (!name || !date) {
        showToast("Please enter a reminder name and date.");
        return;
    }

    const reminder = {
        id: makeId(),
        name,
        date,
        time,
        notified: false
    };

    reminders.push(reminder);

    if (saveLocal(STORAGE.reminders, reminders)) {
        event.currentTarget.reset();
        $("#reminder-date").value = localDateString();

        renderReminders();
        updateDashboardStats();

        await requestReminderNotificationPermission();

        showToast("Reminder saved in this browser.");
        checkDueReminders();
    } else {
        reminders = reminders.filter((item) => item.id !== reminder.id);
    }
});

$("#reminder-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reminder-delete]");
    if (!button) return;

    reminders = reminders.filter(
        (item) => item.id !== button.dataset.reminderDelete
    );

    notifiedReminderIds.delete(button.dataset.reminderDelete);

    saveLocal(STORAGE.reminders, reminders);
    renderReminders();
    updateDashboardStats();

    showToast("Reminder deleted.");
});

// Check periodically while the LifeAssist page is open.
checkDueReminders();
setInterval(checkDueReminders, 10_000);

// Check again when the user returns to the page.
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDueReminders();
});


/* ---------------- Document checklist ---------------- */

let documents = loadLocal(STORAGE.documents);

function renderDocuments() {
    const list = $("#document-list");

    if (!documents.length) {
        list.innerHTML = `<div class="panel empty-state"><span>📄</span>Your document checklist is empty. Add a document name above.</div>`;
        return;
    }

    list.innerHTML = documents.map((document) => `
        <article class="item-card ${document.done ? "completed" : ""}">
            <input class="item-check" type="checkbox" data-document-toggle="${escapeHTML(document.id)}"
                ${document.done ? "checked" : ""} aria-label="Mark ${escapeHTML(document.name)} complete">
            <div class="item-card-main">
                <h3>📄 ${escapeHTML(document.name)}</h3>
                <p>${document.done ? "Completed" : "Not completed yet"}</p>
            </div>
            <button class="delete-button" type="button" data-document-delete="${escapeHTML(document.id)}">Delete</button>
        </article>
    `).join("");
}

$("#document-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#document-name").value.trim();
    if (!name) return;

    documents.unshift({ id: makeId(), name, done: false });

    if (saveLocal(STORAGE.documents, documents)) {
        event.currentTarget.reset();
        renderDocuments();
        showToast("Document added to your checklist.");
    }
});

$("#document-list").addEventListener("change", (event) => {
    const id = event.target.dataset.documentToggle;
    if (!id) return;

    documents = documents.map((document) => document.id === id
        ? { ...document, done: event.target.checked }
        : document
    );

    saveLocal(STORAGE.documents, documents);
    renderDocuments();
});

$("#document-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-document-delete]");
    if (!button) return;

    documents = documents.filter((document) => document.id !== button.dataset.documentDelete);
    saveLocal(STORAGE.documents, documents);
    renderDocuments();
    showToast("Document removed.");
});

/* ---------------- Everyday calculators ---------------- */

$("#split-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const total = Number($("#bill-total").value);
    const people = Number($("#bill-people").value);

    if (!Number.isFinite(total) || total < 0 ||
        !Number.isInteger(people) || people < 1) {
        $("#split-result").textContent = "Enter a valid bill and number of people.";
        return;
    }

    $("#split-result").textContent = `Each person pays ${money(total / people)}.`;
});

$("#savings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const target = Number($("#saving-target").value);
    const current = Number($("#saving-current").value);
    const monthly = Number($("#saving-monthly").value);

    if (!Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(current) || current < 0 ||
        !Number.isFinite(monthly) || monthly <= 0) {
        $("#savings-result").textContent = "Enter valid amounts. Monthly savings must be greater than zero.";
        return;
    }

    const remaining = Math.max(0, target - current);
    const months = Math.ceil(remaining / monthly);

    $("#savings-result").textContent = remaining === 0
        ? "Congratulations! You have already reached your savings target."
        : `You need ${money(remaining)} more. At ${money(monthly)} per month, it will take about ${months} month${months === 1 ? "" : "s"}.`;
});

$("#date-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const start = $("#date-start").value;
    const end = $("#date-end").value;

    if (!start || !end) {
        $("#date-result").textContent = "Please select both dates.";
        return;
    }

    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(`${end}T00:00:00Z`);
    const days = Math.round((endDate - startDate) / 86400000);

    $("#date-result").textContent = days < 0
        ? `The end date is ${Math.abs(days)} day(s) before the start date.`
        : `${days} day(s) between the dates.`;
});

/* ---------------- Dashboard counts and startup ---------------- */

function updateDashboardStats() {
    const completed = tasks.filter((task) => task.completed).length;
    $("#stat-tasks").textContent = `${completed} / ${tasks.length}`;
    $("#stat-goals").textContent = String(goals.length);
    $("#stat-reminders").textContent = String(reminders.length);
}

function initialiseDefaults() {
    $("#expense-date").value = localDateString();
    $("#reminder-date").value = localDateString();
    $("#date-start").value = localDateString();
    $("#date-end").value = localDateString();
}

initialiseDefaults();
renderTasks();
renderGoals();
renderReminders();
renderDocuments();
updateDashboardStats();
renderChart();
loadExpenses();
// Export expenses as a JSON file
const exportJsonButton = document.querySelector("#export-json");

if (exportJsonButton) {
    exportJsonButton.addEventListener("click", () => {
        const jsonData = JSON.stringify(expenses, null, 2);

        const blob = new Blob([jsonData], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "lifeassist-expenses.json";
        link.click();

        URL.revokeObjectURL(url);

        showToast("Expenses exported as JSON!");
    });
}
// Import expenses from a JSON file
const importButton = document.querySelector("#import-json");
const importFileInput = document.querySelector("#import-json-file");

if (importButton && importFileInput) {
    importButton.addEventListener("click", () => {
        importFileInput.click();
    });

    importFileInput.addEventListener("change", async () => {
        const file = importFileInput.files[0];
        if (!file) return;

        try {
            const importedData = JSON.parse(await file.text());

            if (!Array.isArray(importedData)) {
                throw new Error("The JSON file must contain an array of expenses.");
            }

            for (const item of importedData) {
                if (
                    !item ||
                    typeof item.title !== "string" ||
                    !item.title.trim() ||
                    !Number.isFinite(Number(item.amount)) ||
                    Number(item.amount) <= 0 ||
                    typeof item.category !== "string" ||
                    !item.category.trim()
                ) {
                    throw new Error("The file contains an invalid expense.");
                }
            }

            for (const item of importedData) {
                await apiRequest(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: item.title.trim(),
                        amount: Number(item.amount),
                        category: item.category.trim(),
                        ...(item.date ? { date: item.date } : {})
                    })
                });
            }

            await loadExpenses();
            showToast(`${importedData.length} expense(s) imported successfully!`);
        } catch (error) {
            showToast(`Import failed: ${error.message}`);
            console.error("JSON import error:", error);
        } finally {
            importFileInput.value = "";
        }
    });
}

const exportXmlButton = document.querySelector("#export-xml");

if (exportXmlButton) {
    exportXmlButton.addEventListener("click", () => {
        const xmlDocument = document.implementation.createDocument(
            "",
            "expenses",
            null
        );

        expenses.forEach((expense) => {
            const expenseElement = xmlDocument.createElement("expense");

            ["title", "amount", "category", "date"].forEach((field) => {
                const element = xmlDocument.createElement(field);
                element.textContent = expense[field] ?? "";
                expenseElement.appendChild(element);
            });

            xmlDocument.documentElement.appendChild(expenseElement);
        });

        const serializer = new XMLSerializer();
        const xmlText = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE expenses SYSTEM "expenses.dtd">
${serializer.serializeToString(xmlDocument)}`;

        const blob = new Blob([xmlText], {
            type: "application/xml;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "lifeassist-expenses.xml";
        link.click();

        URL.revokeObjectURL(url);
        showToast("Expenses exported as XML!");
    });
}

/* Web Technology: jQuery AJAX test */

jQuery(function () {
    jQuery("#refresh-expenses").on("click.jqAjaxDemo", function () {
        jQuery.ajax({
            url: "/api/expenses",
            method: "GET",
            dataType: "json",

            success: function (data) {
                console.log(
                    "jQuery AJAX successful:",
                    data.length,
                    "expenses retrieved."
                );
            },

            error: function (xhr) {
                console.error(
                    "jQuery AJAX failed:",
                    xhr.status,
                    xhr.statusText
                );
            }
        });
    });
});

const mobileMenuButton = document.getElementById("mobile-menu-button");

if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
        const isOpen = document.body.classList.toggle("mobile-menu-open");
        mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    });

    document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
            document.body.classList.remove("mobile-menu-open");
            mobileMenuButton.setAttribute("aria-expanded", "false");
        });
    });
}
/* ---------------- LifeAssist Smart Pop-up Alerts ---------------- */

function showSmartAlerts() {
    const today = localDateString();

    const dueTasks = tasks.filter(task =>
        !task.completed && task.due && task.due <= today
    );

    const upcomingReminders = reminders.filter(reminder =>
        reminder.date === today
    );

    const messages = [];

    if (dueTasks.length > 0) {
        messages.push(
            `⚠️ You have ${dueTasks.length} incomplete task(s) due today or overdue.`
        );
    }

    if (upcomingReminders.length > 0) {
        messages.push(
            `⏰ You have ${upcomingReminders.length} reminder(s) scheduled for today.`
        );
    }

    if (messages.length === 0) return;

    const alertBox = document.createElement("div");

    alertBox.id = "lifeassist-smart-alert";
    alertBox.setAttribute("role", "status");

    alertBox.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        max-width: 340px;
        padding: 20px;
        background: white;
        color: #26334a;
        border: 1px solid #dce5f5;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(30, 50, 90, 0.18);
        z-index: 9999;
        line-height: 1.7;
        font-size: 14px;
    `;

    alertBox.innerHTML = `
        <strong style="font-size:17px;">🔔 LifeAssist Alerts</strong>
        <div style="margin-top:10px;">
            ${messages.map(message =>
                `<p>${escapeHTML(message)}</p>`
            ).join("")}
        </div>
        <button id="smart-alert-close" type="button"
            style="padding:9px 16px;border:0;border-radius:8px;
            background:#4386f7;color:white;cursor:pointer;">
            Got it
        </button>
    `;

    document.body.appendChild(alertBox);

    $("#smart-alert-close").addEventListener("click", () => {
        alertBox.remove();
    });
}

if (sessionStorage.getItem("lifeassist_alerts_shown") !== "yes") {
    sessionStorage.setItem("lifeassist_alerts_shown", "yes");

    // Show alerts after the dashboard has loaded.
    setTimeout(showSmartAlerts, 1000);
}

/* ---------------- Feedback: MongoDB API ---------------- */

const feedbackForm = document.querySelector("#feedback-form");

if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const status = document.querySelector("#feedback-status");
        const button = feedbackForm.querySelector('button[type="submit"]');

        const formData = {
            name: document.querySelector("#feedback-name").value.trim(),
            email: document.querySelector("#feedback-email").value.trim(),
            rating: Number(document.querySelector("#feedback-rating").value),
            feedback: document.querySelector("#feedback-message").value.trim()
        };

        if (
            !formData.name ||
            !formData.email ||
            !formData.feedback ||
            !Number.isInteger(formData.rating) ||
            formData.rating < 1 ||
            formData.rating > 5
        ) {
            status.textContent = "Please complete all fields correctly.";
            status.className = "form-message full-width error";
            return;
        }

        setButtonLoading(button, true, "Submitting feedback...");

        try {
            const result = await apiRequest("/api/feedback", {
                method: "POST",
                body: JSON.stringify(formData)
            });

            status.textContent = result.message || "Feedback saved successfully!";
            status.className = "form-message full-width success";

            feedbackForm.reset();
            showToast("Your feedback was saved to MongoDB!");
        } catch (error) {
            status.textContent = `Could not save feedback: ${error.message}`;
            status.className = "form-message full-width error";
        } finally {
            setButtonLoading(button, false);
        }
    });
}
