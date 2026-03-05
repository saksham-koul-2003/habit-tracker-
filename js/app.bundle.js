// ------------------------------------------------------------
// LocalStorage Wrapper (Data Layer)
// ------------------------------------------------------------
const HABIT_KEY = 'zen_habit_data';
const RECORDS_KEY = 'zen_habit_records';

const Storage = {
    getHabit: () => {
        const data = localStorage.getItem(HABIT_KEY);
        return data ? JSON.parse(data) : null;
    },
    saveHabit: (habit) => {
        if (!habit.createdAt) {
            habit.createdAt = new Date().toISOString();
        }
        localStorage.setItem(HABIT_KEY, JSON.stringify(habit));
    },
    hasHabit: () => {
        return !!localStorage.getItem(HABIT_KEY);
    },
    clearHabit: () => {
        localStorage.removeItem(HABIT_KEY);
        localStorage.removeItem(RECORDS_KEY);
    },
    getRecords: () => {
        const data = localStorage.getItem(RECORDS_KEY);
        return data ? JSON.parse(data) : [];
    },
    toggleRecord: (dateStr) => {
        const records = Storage.getRecords();
        const index = records.indexOf(dateStr);
        let added = false;

        if (index > -1) {
            records.splice(index, 1);
        } else {
            records.push(dateStr);
            added = true;
        }

        localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
        return added;
    },
    hasRecord: (dateStr) => {
        return Storage.getRecords().includes(dateStr);
    },
    getCurrentStreak: () => {
        const records = new Set(Storage.getRecords());
        if (records.size === 0) return 0;

        let streak = 0;
        let d = new Date();

        let dateStr = Storage.formatDate(d);
        if (!records.has(dateStr)) {
            d.setDate(d.getDate() - 1);
            dateStr = Storage.formatDate(d);
            if (!records.has(dateStr)) {
                return 0;
            }
        }

        while (records.has(dateStr)) {
            streak++;
            d.setDate(d.getDate() - 1);
            dateStr = Storage.formatDate(d);
        }

        return streak;
    },
    formatDate: (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
};

// ------------------------------------------------------------
// UI Utilities
// ------------------------------------------------------------
const UI = {
    showToast: (message) => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    },
    switchView: (hideId, showId) => {
        const hideEl = document.getElementById(hideId);
        const showEl = document.getElementById(showId);

        if (hideEl) hideEl.classList.add('hidden');
        if (showEl) {
            showEl.classList.remove('hidden');
            showEl.style.animation = 'none';
            showEl.offsetHeight;
            showEl.style.animation = null;
        }
    }
};

// ------------------------------------------------------------
// Heatmap Module
// ------------------------------------------------------------
const Heatmap = {
    render: () => {
        const container = document.getElementById('heatmap-container');
        if (!container) return;

        const DAYS = 35;
        const records = new Set(Storage.getRecords());
        const dates = [];
        let d = new Date();

        for (let i = 0; i < DAYS; i++) {
            dates.unshift(new Date(d));
            d.setDate(d.getDate() - 1);
        }

        let html = `<div class="day-labels">`;
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        days.forEach(day => {
            html += `<div class="day-label">${day}</div>`;
        });
        html += `</div><div class="heatmap-grid">`;

        const firstDayOfWeek = dates[0].getDay();
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += `<div class="heatmap-cell" style="opacity: 0;"></div>`;
        }

        dates.forEach(date => {
            const dateStr = Storage.formatDate(date);
            const isDone = records.has(dateStr);
            const levelClass = isDone ? 'style="background: var(--level-3)"' : 'style="background: var(--level-0)"';
            const title = `${dateStr}: ${isDone ? 'Completed' : 'Missed'}`;
            html += `<div class="heatmap-cell" ${levelClass} title="${title}"></div>`;
        });

        html += `</div>`;
        container.innerHTML = html;
    }
};

// ------------------------------------------------------------
// Notifications Module
// ------------------------------------------------------------
const Notifications = {
    scheduleReminders: async () => {
        if (!('Notification' in window)) {
            console.log("This browser does not support local notifications.");
            return;
        }

        if (Notification.permission !== "granted") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;
        }

        setTimeout(() => {
            const habit = Storage.getHabit();
            const dateStr = Storage.formatDate(new Date());

            if (habit && !Storage.hasRecord(dateStr)) {
                Notifications.showLocalNotification(habit);
            }
        }, 15000);
    },
    showLocalNotification: (habit) => {
        const messages = [
            `Time for ${habit.name}! Just ${habit.goalValue} ${habit.goalUnit} changes everything.`,
            `Don't break the chain! Complete your ${habit.name} for today. 🌱`,
            `Your future self will thank you for doing ${habit.name} today.`,
            `A small step: ${habit.goalValue} ${habit.goalUnit} of ${habit.name}. Let's do it!`
        ];

        const copy = messages[Math.floor(Math.random() * messages.length)];

        if (Notification.permission === "granted") {
            new Notification("Zen Habits", {
                body: copy,
                icon: "icons/icon-192x192.png",
                badge: "icons/icon-192x192.png",
            });
        } else {
            UI.showToast(copy);
        }
    }
};

// ------------------------------------------------------------
// Dashboard Module
// ------------------------------------------------------------
const Dashboard = {
    render: () => {
        const DOM = {
            date: document.getElementById('current-date'),
            list: document.getElementById('habits-list')
        };
        const habit = Storage.getHabit();
        if (!habit) return;

        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        DOM.date.textContent = new Date().toLocaleDateString('en-US', options);

        const streak = Storage.getCurrentStreak();
        const dateStr = Storage.formatDate(new Date());
        const isDoneToday = Storage.hasRecord(dateStr);

        DOM.list.innerHTML = `
            <div class="glass-card habit-card" id="main-habit-card">
                <div class="habit-info">
                    <h3 class="habit-name">${habit.name}</h3>
                    <div class="habit-goal">
                        <span class="material-symbols-rounded" style="font-size: 16px;">flag</span>
                        ${habit.goalValue} ${habit.goalUnit} / day
                    </div>
                    <div class="habit-streak mt-1" style="color: var(--sage-dark)">
                        <span class="material-symbols-rounded" style="font-size: 16px;">local_fire_department</span>
                        ${streak} day streak
                    </div>
                </div>
                
                <button class="progress-ring-btn ${isDoneToday ? 'completed' : ''}" id="checkin-btn" aria-label="Check In" title="Tap to complete">
                    ${isDoneToday
                ? '<span class="material-symbols-rounded">check</span>'
                : '<span class="material-symbols-rounded" style="color: var(--slate)">more_horiz</span>'
            }
                    <svg class="progress-ring-svg" style="pointer-events: none;">
                        <circle class="progress-ring-circle-bg" cx="29" cy="29" r="26"></circle>
                        <circle class="progress-ring-circle" cx="29" cy="29" r="26" 
                            style="stroke-dasharray: 164; stroke-dashoffset: ${isDoneToday ? '0' : '164'}"></circle>
                    </svg>
                </button>
            </div>
        `;

        const btn = document.getElementById('checkin-btn');
        btn.addEventListener('click', () => {
            const added = Storage.toggleRecord(dateStr);
            Dashboard.animateRing(btn, added);

            if (added && typeof confetti === 'function') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#84a59d', '#738290', '#4a5568']
                });
            }

            setTimeout(() => {
                Dashboard.render();
                Heatmap.render();
            }, 500);
        });

        Heatmap.render();
    },

    animateRing: (btnEl, isComplete) => {
        const circle = btnEl.querySelector('.progress-ring-circle');
        if (isComplete) {
            circle.style.strokeDashoffset = '0';
        } else {
            circle.style.strokeDashoffset = '164';
        }
    }
};

// ------------------------------------------------------------
// Main Application Init & Onboarding Logic
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Check if habit is already set up
    if (Storage.hasHabit()) {
        UI.switchView('onboarding-view', 'dashboard-view');
        Dashboard.render();
    } else {
        UI.switchView('dashboard-view', 'onboarding-view');
    }

    // Onboarding Handlers
    let currentStep = 1;
    const btnNext1 = document.getElementById('next-step-1');
    const btnNext2 = document.getElementById('next-step-2');
    const btnPrev2 = document.getElementById('prev-step-2');
    const btnPrev3 = document.getElementById('prev-step-3');
    const btnFinish = document.getElementById('finish-onboarding');

    // Settings elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const resetHabitBtn = document.getElementById('reset-habit-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    if (resetHabitBtn) {
        resetHabitBtn.addEventListener('click', () => {
            if (confirm("Are you sure? This will delete all your progress.")) {
                Storage.clearHabit();
                window.location.reload(); // Reload to reset the state cleanly directly to onboarding
            }
        });
    }

    const habitNameInput = document.getElementById('habit-name-input');
    const habitGoalValue = document.getElementById('habit-goal-value');
    const habitGoalUnit = document.getElementById('habit-goal-unit');
    const habitTimeInput = document.getElementById('habit-time-input');

    function showStep(step) {
        document.querySelectorAll('.onboarding-step').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.dot').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === step);
        });

        const stepEl = document.getElementById(`step-${step}`);
        if (stepEl) {
            stepEl.classList.remove('hidden');
            stepEl.style.animation = 'none';
            stepEl.offsetHeight;
            stepEl.style.animation = null;
            currentStep = step;
        }
    }

    if (btnNext1) {
        btnNext1.addEventListener('click', () => {
            if (!habitNameInput.value.trim()) {
                habitNameInput.focus();
                return;
            }
            showStep(2);
        });
    }

    if (btnNext2) {
        btnNext2.addEventListener('click', () => {
            if (!habitGoalValue.value || habitGoalValue.value <= 0) {
                habitGoalValue.focus();
                return;
            }
            showStep(3);
        });
    }

    if (btnPrev2) btnPrev2.addEventListener('click', () => showStep(1));
    if (btnPrev3) btnPrev3.addEventListener('click', () => showStep(2));

    if (btnFinish) {
        btnFinish.addEventListener('click', () => {
            if (!habitTimeInput.value) return;

            const habit = {
                name: habitNameInput.value.trim(),
                goalValue: parseFloat(habitGoalValue.value),
                goalUnit: habitGoalUnit.value,
                time: habitTimeInput.value
            };

            Storage.saveHabit(habit);
            window.dispatchEvent(new Event('habitCreated'));
        });
    }
});

window.addEventListener('habitCreated', () => {
    UI.switchView('onboarding-view', 'dashboard-view');
    Dashboard.render();
    Notifications.scheduleReminders();
    UI.showToast("Your journey begins today! 🌱");
});
