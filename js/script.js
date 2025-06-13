// DOM 元素引用
const elements = {
  countdownEl: document.getElementById("countdown"),
  countdownSubtext: document.getElementById("countdownSubtext"),
  weekendCountdownEl: document.getElementById("weekendCountdown"),
  weekendCountdownSubtext: document.getElementById("weekendCountdownSubtext"),
  statusBadge: document.getElementById("statusBadge"),
  logArea: document.getElementById("log"),
  logStatus: document.getElementById("logStatus"),
  toggleBtn: document.getElementById("toggleBtn"),
  clearLogBtn: document.getElementById("clearLogBtn"),
  themeToggle: document.getElementById("themeToggle"),
  body: document.body,
};

// 状态管理
const state = {
  intervals: {
    log: null,
    countdown: null,
    weekend: null,
  },
  flags: {
    hasLoggedEnd: false,
    lastCheckedDate: new Date().getDate(),
  },
  settings: {
    workStart: "09:00",
    workEnd: "18:00",
  },
};

// 工具函数
const utils = {
  getFormattedTime: () => {
    const now = new Date();
    return (
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")} ` +
      `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
    );
  },

  logMessage: (type, message) => {
    const entry = `[${utils.getFormattedTime()}] ${type.toUpperCase()} >> ${message}\n`;
    elements.logArea.textContent += entry;
    elements.logArea.scrollTop = elements.logArea.scrollHeight;
  },

  checkDateChange: () => {
    const currentDate = new Date().getDate();
    if (currentDate !== state.flags.lastCheckedDate) {
      state.flags.lastCheckedDate = currentDate;
      state.flags.hasLoggedEnd = false;
      utils.logMessage("root", "New day detected, resetting counters");
    }
  },

  getDaysUntilWeekend: () => {
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 5 - dayOfWeek;
  },
};

// 主题功能
const theme = {
  updateIcon: () => {
    const isDark = elements.body.getAttribute("data-color-mode") === "dark";
    elements.themeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i><span>Light Mode</span>'
      : '<i class="fas fa-moon"></i><span>Dark Mode</span>';
  },

  init: () => {
    if (localStorage.getItem("themePreference")) {
      elements.body.setAttribute(
        "data-color-mode",
        localStorage.getItem("themePreference")
      );
    }
    theme.updateIcon();

    elements.themeToggle.addEventListener("click", () => {
      const currentMode = elements.body.getAttribute("data-color-mode");
      const newMode =
        currentMode === "auto"
          ? "dark"
          : currentMode === "dark"
          ? "auto"
          : "dark";

      elements.body.setAttribute("data-color-mode", newMode);
      localStorage.setItem("themePreference", newMode);
      theme.updateIcon();
    });
  },
};

// 设置功能
const settings = {
  init: function () {
    // 从本地存储加载设置
    this.loadSettings();

    // 设置事件监听
    document
      .getElementById("saveSettings")
      .addEventListener("click", () => this.saveSettings());

    document.getElementById("toggleSettings").addEventListener("click", () => {
      document.querySelector(".settings-panel").classList.toggle("expanded");
    });

    // 实时计算工作时间
    document
      .getElementById("startTime")
      .addEventListener("change", () => this.calculateDuration());
    document
      .getElementById("endTime")
      .addEventListener("change", () => this.calculateDuration());

    // 重置按钮
    document.getElementById("resetSettings").addEventListener("click", () => {
      document.getElementById("startTime").value = "09:00";
      document.getElementById("endTime").value = "18:00";
      this.calculateDuration();
      utils.logMessage("SETTINGS", "Reset to default work hours");
    });

    // 初始计算
    this.calculateDuration();
  },

  loadSettings: function () {
    const savedSettings = localStorage.getItem("workdaySettings");
    if (savedSettings) {
      state.settings = JSON.parse(savedSettings);
      document.getElementById("startTime").value = state.settings.workStart;
      document.getElementById("endTime").value = state.settings.workEnd;

      // 更新倒计时显示
      countdown.updateWorkCountdown();
      utils.logMessage("SETTINGS", "Loaded saved work hours settings");
    }
  },

  calculateDuration: function () {
    const start = document.getElementById("startTime").value;
    const end = document.getElementById("endTime").value;

    if (start && end) {
      const startParts = start.split(":");
      const endParts = end.split(":");

      const startDate = new Date(0, 0, 0, startParts[0], startParts[1]);
      const endDate = new Date(0, 0, 0, endParts[0], endParts[1]);

      let diff = endDate - startDate;
      if (diff < 0) diff += 24 * 60 * 60 * 1000; // 处理跨日

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let durationText = "";
      if (hours > 0) durationText += `${hours} Hour`;
      if (minutes > 0) durationText += `${minutes} Min`;

      document.getElementById("workDuration").textContent =
        durationText || "0Min";
    }
  },

  saveSettings: function () {
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;

    // 验证时间
    if (startTime >= endTime) {
      utils.logMessage("ERROR", "End time must be after start time");
      alert("下班时间必须晚于上班时间");
      return;
    }

    state.settings.workStart = startTime;
    state.settings.workEnd = endTime;

    // 保存到本地存储
    localStorage.setItem("workdaySettings", JSON.stringify(state.settings));

    // 更新倒计时
    countdown.updateWorkCountdown();
    utils.logMessage(
      "SETTINGS",
      `Work hours updated: ${startTime} - ${endTime}`
    );

    // 显示保存成功提示
    const saveBtn = document.getElementById("saveSettings");
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-check"></i> Save!';
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
    }, 2000);
  },
};

// 倒计时功能
const countdown = {
  checkWorkTime: () => {
    const now = new Date();
    utils.checkDateChange();

    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // 解析设置的工作时间
    const [startHour, startMinute] = state.settings.workStart
      .split(":")
      .map(Number);
    const [endHour, endMinute] = state.settings.workEnd.split(":").map(Number);

    const workdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHour,
      startMinute,
      0
    );

    const workdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      endHour,
      endMinute,
      0
    );

    return {
      isWeekend,
      isWorking: !isWeekend && now >= workdayStart && now <= workdayEnd,
      workdayStart,
      workdayEnd,
    };
  },

  updateStatusBadge: () => {
    const { isWeekend, isWorking } = countdown.checkWorkTime();

    elements.statusBadge.innerHTML = isWeekend
      ? '<i class="fas fa-umbrella-beach"></i> Weekend'
      : isWorking
      ? '<i class="fas fa-briefcase"></i> Working'
      : '<i class="fas fa-mug-hot"></i> Ended';

    elements.statusBadge.className = isWeekend
      ? "status-badge weekend"
      : isWorking
      ? "status-badge working"
      : "status-badge ended";
  },

  updateWeekendCountdown: () => {
    const daysUntilWeekend = utils.getDaysUntilWeekend();
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    if (isWeekend) {
      elements.weekendCountdownEl.textContent = "0";
      elements.weekendCountdownSubtext.textContent =
        "It's the weekend! Enjoy your time off!";
      return;
    }

    elements.weekendCountdownEl.textContent = daysUntilWeekend;

    if (daysUntilWeekend === 1) {
      elements.weekendCountdownSubtext.textContent =
        "Only 1 day left until weekend!";
    } else if (daysUntilWeekend === 0) {
      elements.weekendCountdownSubtext.textContent = "Weekend starts today!";
    } else {
      elements.weekendCountdownSubtext.textContent = `Days until weekend`;
    }
  },

  updateWorkCountdown: () => {
    const { isWeekend, isWorking, workdayEnd } = countdown.checkWorkTime();
    countdown.updateStatusBadge();

    if (isWeekend) {
      elements.countdownEl.textContent = "00:00:00";
      elements.countdownSubtext.textContent = "Enjoy your weekend!";
      return;
    }

    if (!isWorking) {
      elements.countdownEl.textContent = "00:00:00";
      elements.countdownSubtext.textContent = "Workday has ended";

      if (!state.flags.hasLoggedEnd) {
        utils.logMessage("root", "Workday completed - Time to relax!");
        state.flags.hasLoggedEnd = true;
      }
      return;
    }

    const diffMs = workdayEnd - new Date();
    const hours = Math.floor(diffMs / 3600000)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((diffMs % 3600000) / 60000)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor((diffMs % 60000) / 1000)
      .toString()
      .padStart(2, "0");

    elements.countdownEl.textContent = `${hours}:${minutes}:${seconds}`;
    elements.countdownSubtext.textContent = `Remaining until ${workdayEnd.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}`;
  },
};

// 按钮控制
const controls = {
  updateButtons: () => {
    const { isWorking } = countdown.checkWorkTime();

    elements.toggleBtn.disabled = !isWorking;
    elements.toggleBtn.innerHTML = state.intervals.log
      ? '<i class="fas fa-stop"></i><span>Stop Logging</span>'
      : '<i class="fas fa-play"></i><span>Start Logging</span>';

    elements.clearLogBtn.disabled = !(
      elements.logArea.textContent.trim() && isWorking
    );

    elements.logStatus.innerHTML = state.intervals.log
      ? '<i class="fas fa-play"></i> Active'
      : '<i class="fas fa-pause"></i> Inactive';
    elements.logStatus.className = state.intervals.log
      ? "status-badge working"
      : "status-badge";
  },

  initToggleButton: () => {
    elements.toggleBtn.addEventListener("click", () => {
      if (state.intervals.log) {
        clearInterval(state.intervals.log);
        state.intervals.log = null;
        utils.logMessage("root", "Logging stopped");
      } else {
        elements.logArea.classList.add("visible");
        utils.logMessage("root", "Logging started (5 minute interval)");
        state.intervals.log = setInterval(() => {
          utils.logMessage(
            "ETA for clocking off",
            elements.countdownEl.textContent
          );
        }, 5 * 60 * 1000);
      }
      controls.updateButtons();
    });
  },

  initClearButton: () => {
    elements.clearLogBtn.addEventListener("click", () => {
      // 清空日志
      elements.logArea.textContent = "";
      utils.logMessage(
        "SYSTEM",
        "All logs cleared - Application shutting down..."
      );

      // 创建关闭倒计时通知
      const countdownEl = document.createElement("div");
      countdownEl.className = "countdown-notice";
      countdownEl.innerHTML = `
        <div class="countdown-header">SHUTDOWN INITIATED</div>
        <div class="countdown-timer"></div>
        <div class="countdown-warning">Please save any ongoing work</div>
      `;
      document.body.appendChild(countdownEl);

      // 倒计时逻辑
      let remainingSeconds = 5;
      updateCountdownDisplay();

      const shutdownTimer = setInterval(() => {
        remainingSeconds--;
        updateCountdownDisplay();

        if (remainingSeconds <= 0) {
          clearInterval(shutdownTimer);
          initiateShutdown();
        }
      }, 1000);

      function updateCountdownDisplay() {
        const timerEl = countdownEl.querySelector(".countdown-timer");
        timerEl.textContent = `Closing in ${remainingSeconds} second${
          remainingSeconds !== 1 ? "s" : ""
        }...`;

        if (remainingSeconds <= 3) {
          timerEl.style.color = "#ff6b6b";
          timerEl.style.fontWeight = "bold";
        }
      }

      function initiateShutdown() {
        countdownEl.querySelector(".countdown-timer").textContent =
          "Closing now...";
        setTimeout(() => {
          countdownEl.remove();
          try {
            window.close();
          } catch {
            window.location.href = "about:blank";
          }
        }, 500);
      }
    });
  },
};

// 初始化应用
function initApp() {
  // 初始化主题
  theme.init();

  // 初始化设置
  settings.init();

  // 确保日志区域初始为空
  elements.logArea.textContent = "";

  // 初始化倒计时
  countdown.updateWorkCountdown();
  countdown.updateWeekendCountdown();

  // 设置定时器
  state.intervals.countdown = setInterval(countdown.updateWorkCountdown, 1000);
  state.intervals.weekend = setInterval(
    countdown.updateWeekendCountdown,
    1000 * 60 * 60
  );

  // 初始化按钮控制 - 确保先更新状态再初始化事件
  controls.updateButtons();
  controls.initToggleButton();
  controls.initClearButton();
}

// 启动应用
document.addEventListener("DOMContentLoaded", initApp);
