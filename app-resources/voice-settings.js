const ROLE_ORDER = ["analyst_1", "analyst_2", "host"];
const ROLE_LABELS = {
  analyst_1: "Analyst 1",
  analyst_2: "Analyst 2",
  host: "Host",
};

const dom = {
  tabs: document.getElementById("voice-role-tabs"),
  activeRole: document.getElementById("voice-settings-active-role"),
  activeVoice: document.getElementById("voice-settings-active-voice"),
  status: document.getElementById("voice-settings-status"),
  version: document.getElementById("voice-settings-version"),
  femaleCount: document.getElementById("voice-count-female"),
  maleCount: document.getElementById("voice-count-male"),
  femaleGroup: document.getElementById("voice-group-female"),
  maleGroup: document.getElementById("voice-group-male"),
};

const state = {
  activeRole: "analyst_1",
  catalog: [],
  grouped: {
    Female: [],
    Male: [],
  },
  assignments: null,
  busyRole: "",
  error: "",
  pollTimer: 0,
};

function roleLabel(role) {
  return ROLE_LABELS[role] || role.replace(/_/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findVoice(voiceName) {
  return state.catalog.find((voice) => voice.voice_name === voiceName) || null;
}

function assignedRolesForVoice(voiceName) {
  const roles = state.assignments?.roles || {};
  return ROLE_ORDER.filter((role) => roles[role] === voiceName);
}

function activeVoiceNameForRole(role) {
  return state.assignments?.roles?.[role] || "";
}

function formatVersionLabel() {
  const version = Number(state.assignments?.version || 0);
  return `Version ${version}`;
}

function currentStatusCopy() {
  if (state.error) {
    return state.error;
  }
  if (state.busyRole) {
    return `Applying ${roleLabel(state.busyRole)} voice to the live overlay`;
  }
  return "Connected to the overlay voice state. Clicking a panel applies immediately.";
}

function renderTabs() {
  if (!dom.tabs) {
    return;
  }
  dom.tabs.innerHTML = ROLE_ORDER.map((role) => {
    const isActive = role === state.activeRole;
    const assignedVoice = findVoice(activeVoiceNameForRole(role));
    return `
      <button
        class="voice-role-tab${isActive ? " is-active" : ""}"
        type="button"
        data-role-tab="${role}"
      >
        <span class="voice-role-tab-title">${escapeHtml(roleLabel(role))}</span>
        <span class="voice-role-tab-subtitle">${escapeHtml(assignedVoice?.display_name || activeVoiceNameForRole(role) || "Unassigned")}</span>
      </button>
    `;
  }).join("");
}

function renderHeader() {
  const selectedVoice = findVoice(activeVoiceNameForRole(state.activeRole));
  if (dom.activeRole) {
    dom.activeRole.textContent = roleLabel(state.activeRole);
  }
  if (dom.activeVoice) {
    dom.activeVoice.textContent = selectedVoice
      ? `${selectedVoice.display_name} • ${selectedVoice.accent_label}`
      : "Choose a local macOS voice";
  }
  if (dom.status) {
    dom.status.textContent = currentStatusCopy();
  }
  if (dom.version) {
    dom.version.textContent = formatVersionLabel();
  }
}

function buildVoiceCardMarkup(voice) {
  const selectedVoice = activeVoiceNameForRole(state.activeRole);
  const isActive = voice.voice_name === selectedVoice;
  const assignedRoles = assignedRolesForVoice(voice.voice_name);
  const roleBadges = assignedRoles
    .map((role) => `<span class="voice-card-badge">${escapeHtml(roleLabel(role))}</span>`)
    .join("");
  return `
    <button
      class="voice-card${isActive ? " is-active" : ""}"
      type="button"
      data-voice-name="${escapeHtml(voice.voice_name)}"
      ${state.busyRole ? "disabled" : ""}
    >
      <div class="voice-card-top">
        <span class="voice-card-name">${escapeHtml(voice.display_name)}</span>
        <span class="voice-card-gender">${escapeHtml(voice.gender)}</span>
      </div>
      <div class="voice-card-meta">${escapeHtml(voice.accent_label)}</div>
      <div class="voice-card-locale">${escapeHtml(voice.voice_name)}</div>
      <div class="voice-card-badges">${roleBadges || '<span class="voice-card-badge is-muted">Available</span>'}</div>
    </button>
  `;
}

function renderVoiceGroups() {
  const femaleVoices = state.grouped.Female || [];
  const maleVoices = state.grouped.Male || [];
  if (dom.femaleCount) {
    dom.femaleCount.textContent = String(femaleVoices.length);
  }
  if (dom.maleCount) {
    dom.maleCount.textContent = String(maleVoices.length);
  }
  if (dom.femaleGroup) {
    dom.femaleGroup.innerHTML = femaleVoices.length
      ? femaleVoices.map(buildVoiceCardMarkup).join("")
      : '<div class="voice-card-empty">No female English human-sounding voices are available.</div>';
  }
  if (dom.maleGroup) {
    dom.maleGroup.innerHTML = maleVoices.length
      ? maleVoices.map(buildVoiceCardMarkup).join("")
      : '<div class="voice-card-empty">No male English human-sounding voices are available.</div>';
  }
}

function render() {
  renderTabs();
  renderHeader();
  renderVoiceGroups();
}

async function loadCatalog() {
  const response = await fetch("/api/voice-catalog", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Voice catalog HTTP ${response.status}`);
  }
  const payload = await response.json();
  state.catalog = payload.voices || [];
  state.grouped = payload.voices_by_gender || { Female: [], Male: [] };
  state.assignments = payload.assignments || state.assignments;
  state.error = "";
  render();
}

async function syncAssignments() {
  const response = await fetch("/api/voice-assignments", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Voice assignments HTTP ${response.status}`);
  }
  const payload = await response.json();
  const previousVersion = Number(state.assignments?.version || 0);
  state.assignments = payload;
  if (Number(payload.version || 0) !== previousVersion) {
    render();
  } else {
    renderHeader();
    renderTabs();
  }
}

async function assignVoice(role, voiceName) {
  if (!role || !voiceName || state.busyRole || activeVoiceNameForRole(role) === voiceName) {
    return;
  }
  state.busyRole = role;
  state.error = "";
  render();
  try {
    const response = await fetch("/api/voice-assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role,
        voice_name: voiceName,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || `Voice assignment HTTP ${response.status}`);
    }
    state.assignments = await response.json();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to update the live voice assignment.";
  } finally {
    state.busyRole = "";
    render();
  }
}

function startPolling() {
  if (state.pollTimer) {
    return;
  }
  state.pollTimer = window.setInterval(() => {
    syncAssignments().catch((error) => {
      state.error = error instanceof Error ? error.message : "Unable to sync live voice assignments.";
      renderHeader();
    });
  }, 2000);
}

dom.tabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-role-tab]");
  if (!button) {
    return;
  }
  state.activeRole = button.getAttribute("data-role-tab") || state.activeRole;
  render();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-voice-name]");
  if (!button) {
    return;
  }
  assignVoice(state.activeRole, button.getAttribute("data-voice-name") || "").catch(() => {});
});

async function init() {
  try {
    await loadCatalog();
    await syncAssignments();
    startPolling();
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Unable to load the voice settings surface.";
    render();
  }
}

init().catch(() => {});
