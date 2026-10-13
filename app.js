
"use strict";

const ADMIN_EMAIL = "antonymbali96@gmail.com";
const $ = (selector) => document.querySelector(selector);
const content = $("#content");
const toastBox = $("#toast");

let currentUser = null;
let currentTool = "2D Box";
let annotations = [];
let undoStack = [];
let frames = 1;
let currentFrame = 1;
let drawing = null;
let materialFiles = [];
let courses = [
  { name: "2D Annotation Fundamentals", category: "2D", progress: 0 },
  { name: "3D & 4D Annotation", category: "3D / 4D", progress: 0 },
  { name: "Polylane Annotation", category: "Roads", progress: 0 },
  { name: "Segmentation", category: "Computer Vision", progress: 0 },
  { name: "Calibration & Time Synchronization", category: "Sensors", progress: 0 }
];

let tasks = [];
let certificates = [];
let settings = {
  theme: "dark",
  notifications: true,
  autosave: true
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function toast(message) {
  toastBox.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastBox.textContent = "", 3200);
}

function saveLocal(key, value) {
  try { localStorage.setItem("ramso:" + key, JSON.stringify(value)); }
  catch (error) { toast("Storage limit reached. Export your work before continuing."); }
}

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem("ramso:" + key);
    return value === null ? fallback : JSON.parse(value);
  } catch { return fallback; }
}

function navigate(page) {
  $("#pageTitle").textContent = page;
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  $("#sidebar").classList.remove("open");
  $("#profileMenu").hidden = true;

  const pages = {
    "Dashboard": dashboardPage,
    "Work Hub": workPage,
    "Annotation Studio": annotationPage,
    "Missions": missionsPage,
    "Learning": learningPage,
    "Materials": materialsPage,
    "Certificates": certificatesPage,
    "Performance": performancePage,
    "Notifications": notificationsPage,
    "Settings": settingsPage,
    "Administration": adminPage
  };
  (pages[page] || dashboardPage)();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

$("#year").textContent = new Date().getFullYear();
$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#profileBtn").addEventListener("click", () => {
  $("#profileMenu").hidden = !$("#profileMenu").hidden;
});
document.addEventListener("click", event => {
  if (!event.target.closest(".top-actions")) $("#profileMenu").hidden = true;
});

function signIn() {
  const name = prompt("Enter your display name for this local preview:");
  if (!name || !name.trim()) return;
  const email = prompt("Enter your email address:");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast("Enter a valid email address.");
    return;
  }

  currentUser = { name: name.trim(), email: email.trim().toLowerCase() };
  updateProfile();
  toast("Local preview profile created. This is not secure authentication.");
  navigate("Dashboard");
}

function signOut() {
  currentUser = null;
  updateProfile();
  toast("Signed out of the local preview.");
  navigate("Dashboard");
}

function updateProfile() {
  const name = currentUser?.name || "Guest User";
  $("#profileName").textContent = name;
  $("#avatar").textContent = name[0].toUpperCase();
  $("#profileRole").textContent =
    currentUser?.email === ADMIN_EMAIL ? "Admin preview" : "Preview account";
  $("#adminNav").hidden = currentUser?.email !== ADMIN_EMAIL;
}

function stat(label, value, icon, note) {
  return `<article class="card">
    <div class="stat-icon">${icon}</div>
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="muted small">${note}</div>
  </article>`;
}

function section(title, action = "") {
  return `<div class="section-head"><h2>${title}</h2>${action}</div>`;
}

function dashboardPage() {
  const name = currentUser?.name?.split(" ")[0] || "there";
  content.innerHTML = `
    <div class="hero">
      <div>
        <div class="eyebrow">YOUR ANNOTATION WORKSPACE</div>
        <h1>Welcome to RAMSO HUB, ${escapeHTML(name)}</h1>
        <p>Learn new skills, practice annotation, complete missions and track your progress in one workspace.</p>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="navigate('Learning')">Explore training →</button>
          <button class="btn" onclick="navigate('Annotation Studio')">Open annotation studio</button>
        </div>
      </div>
      <div class="tool-icon" style="width:80px;height:80px;font-size:38px">✦</div>
    </div>
    <div class="grid stats">
      ${stat("Available courses", courses.length, "▤", "Training paths")}
      ${stat("Assigned tasks", tasks.length, "▣", "Local preview tasks")}
      ${stat("Certificates", certificates.length, "♜", "Recorded in this browser")}
      ${stat("Materials", materialFiles.length, "▧", "Local preview uploads")}
    </div>
    ${section("Annotation tools", '<button class="btn" onclick="navigate(\\'Annotation Studio\\')">View all →</button>')}
    <div class="grid three-col">${toolCards()}</div>
    ${section("Continue learning")}
    <div class="grid two-col">${courseCards()}</div>`;
}

const tools = [
  ["4D Annotation", "Track objects over time in supported 3D datasets.", "◈"],
  ["Calibration", "Work with sensor calibration parameters.", "⊙"],
  ["Time Synchronization", "Inspect timestamps and sensor alignment.", "◷"],
  ["Polylane", "Create and edit lane geometry.", "⌁"],
  ["2D Box", "Draw and manage object bounding boxes.", "□"],
  ["Segmentation", "Prepare masks and labeled regions.", "▧"],
  ["Polygon", "Create precise polygon annotations.", "⬡"],
  ["Video Segmentation", "Navigate video frames and segment objects.", "▷"]
];

function toolCards() {
  return tools.map(([name, description, icon]) => `
    <article class="card tool-card">
      <div class="tool-icon">${icon}</div>
      <h3>${name}</h3>
      <p>${description}</p>
      <button class="btn btn-primary" onclick="openTool('${name}')">Open workspace →</button>
    </article>`).join("");
}

function courseCards() {
  return courses.map((course, index) => `
    <article class="card">
      <span class="badge">${escapeHTML(course.category)}</span>
      <h3 style="margin-top:13px">${escapeHTML(course.name)}</h3>
      <div class="progress"><span style="width:${course.progress}%"></span></div>
      <div class="muted small">${course.progress}% completed</div>
      <div class="btn-row">
        <button class="btn" onclick="startCourse(${index})">Open course</button>
      </div>
    </article>`).join("");
}

function annotationPage() {
  content.innerHTML = `
    <h1>Annotation Studio</h1>
    <p>Choose a workspace to begin. Each workspace opens in a full-screen canvas.</p>
    <div class="grid three-col" style="margin-top:22px">${toolCards()}</div>
    <div class="card" style="margin-top:20px">
      <h3>Workspace guidance</h3>
      <p>Load supported image files in the 2D tools. Advanced 3D, 4D, calibration and sensor synchronization require their corresponding data engines and dataset formats.</p>
    </div>`;
}

function openTool(name) {
  currentTool = name;
  annotations = [];
  undoStack = [];
  frames = 1;
  currentFrame = 1;

  const existing = $("#workspace");
  if (existing) existing.remove();

  document.body.insertAdjacentHTML("beforeend", `
    <section class="workspace" id="workspace">
      <div class="workspace-bar">
        <strong>RAMSO / ${escapeHTML(name)}</strong>
        <button class="btn" onclick="loadImage()">Load image</button>
        <button class="btn" onclick="undo()">↶ Undo</button>
        <button class="btn" onclick="redo()">↷ Redo</button>
        <button class="btn" onclick="addFrame()">＋ Frame</button>
        <button class="btn btn-primary" onclick="saveAnnotations()">Save JSON</button>
        <button class="btn" onclick="closeTool()">✕ Exit</button>
      </div>
      <div class="workspace-body">
        <div class="canvas-area">
          <canvas id="annotationCanvas" width="1100" height="650"></canvas>
        </div>
        <aside class="tool-panel">
          <h3>Annotation controls</h3>
          <label>Annotation mode</label>
          <select id="drawMode">
            <option value="box">Bounding box</option>
            <option value="polygon">Polygon</option>
            <option value="polyline">Polyline</option>
          </select>
          <label>Object label</label>
          <input id="objectLabel" value="Object" maxlength="100">
          <label>Stroke colour</label>
          <input id="drawColor" type="color" value="#a78bfa">
          <button class="btn" style="width:100%" onclick="deleteSelected()">Delete last object</button>
          <button class="btn" style="width:100%" onclick="clearAnnotations()">Clear all annotations</button>
          <hr style="border-color:var(--border)">
          <h3>Objects</h3>
          <div id="objectList" class="muted small">No annotations yet.</div>
          <hr style="border-color:var(--border)">
          <h3>Frame details</h3>
          <div id="frameInfo" class="muted small">Frame 1</div>
          <p class="small">This preview provides basic 2D drawing. It does not yet implement a production 3D/4D engine or sensor calibration solver.</p>
        </aside>
      </div>
      <div class="frame-strip" id="frameStrip"></div>
    </section>`);

  const canvas = $("#annotationCanvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#131824";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#9aa6bf";
  ctx.font = "22px sans-serif";
  ctx.fillText("Load an image to begin annotating", 35, 55);

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  renderFrames();
}

function closeTool() {
  $("#workspace")?.remove();
  navigate("Annotation Studio");
}

function loadImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = $("#annotationCanvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.dataset.imageLoaded = "true";
      canvas._background = img;
      redraw();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast("Unable to load this image.");
    img.src = url;
  };
  input.click();
}

function pointerPosition(event) {
  const rect = event.target.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * event.target.width / rect.width,
    y: (event.clientY - rect.top) * event.target.height / rect.height
  };
}

function pointerDown(event) {
  const canvas = event.currentTarget;
  if (event.button !== 0) return;
  const p = pointerPosition(event);
  const mode = $("#drawMode").value;

  if (mode === "polygon" || mode === "polyline") {
    if (!drawing || drawing.type !== mode) {
      drawing = {
        type: mode,
        points: [p],
        label: $("#objectLabel").value.trim() || "Object",
        color: $("#drawColor").value
      };
    } else {
      drawing.points.push(p);
    }
    redraw();
    toast("Point added. Double-click to finish the shape.");
    return;
  }

  drawing = {
    type: "box",
    x: p.x, y: p.y, w: 0, h: 0,
    label: $("#objectLabel").value.trim() || "Object",
    color: $("#drawColor").value,
    frame: currentFrame
  };
  canvas.setPointerCapture(event.pointerId);
}

function pointerMove(event) {
  if (!drawing || drawing.type !== "box") return;
  const p = pointerPosition(event);
  drawing.w = p.x - drawing.x;
  drawing.h = p.y - drawing.y;
  redraw();
}

function pointerUp() {
  if (!drawing || drawing.type !== "box") return;
  if (Math.abs(drawing.w) > 3 && Math.abs(drawing.h) > 3) {
    pushUndo();
    annotations.push({ ...drawing, frame: currentFrame });
  }
  drawing = null;
  redraw();
}

$("#content").addEventListener("dblclick", event => {
  if (!event.target.closest("#annotationCanvas") || !drawing) return;
  if (drawing.type === "polygon" || drawing.type === "polyline") {
    if (drawing.points.length >= 2) {
      pushUndo();
      annotations.push({ ...drawing, frame: currentFrame });
    }
    drawing = null;
    redraw();
  }
});

function pushUndo() {
  undoStack.push(JSON.stringify(annotations));
  if (undoStack.length > 100) undoStack.shift();
}

let redoStack = [];

function undo() {
  if (!annotations.length) return toast("Nothing to undo.");
  redoStack.push(JSON.stringify(annotations));
  annotations.pop();
  redraw();
}

function redo() {
  if (!redoStack.length) return toast("Nothing to redo.");
  annotations = JSON.parse(redoStack.pop());
  redraw();
}

function deleteSelected() {
  if (!annotations.length) return toast("There are no annotations to delete.");
  pushUndo();
  annotations.pop();
  redraw();
}

function clearAnnotations() {
  if (!annotations.length) return;
  if (!confirm("Delete all annotations in this workspace?")) return;
  pushUndo();
  annotations = [];
  drawing = null;
  redraw();
}

function redraw() {
  const canvas = $("#annotationCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#131824";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (canvas._background) {
    ctx.drawImage(canvas._background, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#9aa6bf";
    ctx.font = "18px sans-serif";
    ctx.fillText("Load an image to begin annotating", 25, 35);
  }

  [...annotations.filter(a => a.frame === currentFrame), drawing]
    .filter(Boolean)
    .forEach(a => {
      ctx.strokeStyle = a.color || "#a78bfa";
      ctx.fillStyle = a.color || "#a78bfa";
      ctx.lineWidth = 3;
      if (a.type === "box") {
        ctx.strokeRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = "#101421";
        ctx.fillRect(a.x, a.y - 25, Math.max(75, ctx.measureText(a.label).width + 12), 23);
        ctx.fillStyle = a.color;
        ctx.font = "14px sans-serif";
        ctx.fillText(a.label, a.x + 5, a.y - 8);
      } else if (a.points?.length) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        a.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        if (a.type === "polygon" && a.points.length >= 3) ctx.closePath();
        ctx.stroke();
      }
    });

  const list = $("#objectList");
  if (list) {
    const items = annotations.map((a, i) =>
      `<div class="list-row"><span>${i + 1}. ${escapeHTML(a.label)}</span><button class="btn" onclick="removeAnnotation(${i})">Delete</button></div>`
    ).join("");
    list.innerHTML = items || "No annotations yet.";
  }
  const info = $("#frameInfo");
  if (info) info.textContent = `Frame ${currentFrame} of ${frames}`;
  renderFrames();
}

function removeAnnotation(index) {
  pushUndo();
  annotations.splice(index, 1);
  redraw();
}

function addFrame() {
  if (frames >= 10000) return toast("Frame limit reached.");
  frames++;
  currentFrame = frames;
  drawing = null;
  redraw();
}

function renderFrames() {
  const strip = $("#frameStrip");
  if (!strip) return;
  strip.innerHTML = `<button class="btn" onclick="previousFrame()">←</button>` +
    Array.from({ length: frames }, (_, i) =>
      `<button class="frame ${currentFrame === i + 1 ? "active" : ""}" onclick="goFrame(${i + 1})">Frame ${i + 1}</button>`
    ).join("") +
    `<button class="btn" onclick="nextFrame()">→</button>`;
}

function goFrame(n) {
  currentFrame = n;
  drawing = null;
  redraw();
}
function previousFrame() { goFrame(Math.max(1, currentFrame - 1)); }
function nextFrame() { goFrame(Math.min(frames, currentFrame + 1)); }

function saveAnnotations() {
  const payload = {
    tool: currentTool,
    frameCount: frames,
    annotations,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ramso-annotations.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("Annotation JSON exported to your device.");
}

function workPage() {
  content.innerHTML = `<h1>Work Hub</h1>
    <p>Manage assigned annotation work and project instructions.</p>
    <div class="card">
      <h2>Assigned tasks</h2>
      <p>Task assignments will appear here after the Cloudflare backend is connected.</p>
      <div class="btn-row"><button class="btn btn-primary" onclick="navigate('Annotation Studio')">Open annotation studio</button></div>
    </div>`;
}

function learningPage() {
  content.innerHTML = `<h1>Learning & Training</h1>
    <p>Complete the learning paths to prepare for practical work.</p>
    <div class="grid two-col" style="margin-top:22px">${courseCards()}</div>`;
}

function startCourse(index) {
  const course = courses[index];
  const action = confirm(`Open ${course.name}? Mark the course complete only after you have actually completed its requirements.`);
  if (!action) return;
  toast("Course opened in preview. Complete lessons and assessments before certification.");
}

function missionsPage() {
  content.innerHTML = `<h1>Missions</h1>
    <p>Training milestones and quality challenges.</p>
    <div class="grid two-col">
      <article class="card"><h3>Learning mission</h3><p>Complete a training path and its assessment.</p><span class="badge">Learning</span></article>
      <article class="card"><h3>Annotation mission</h3><p>Complete a project assigned by an authorized administrator.</p><span class="badge">Work</span></article>
      <article class="card"><h3>Quality mission</h3><p>Review feedback and correct identified annotation errors.</p><span class="badge">Quality</span></article>
      <article class="card"><h3>Progression mission</h3><p>Meet the configured requirements for advanced training.</p><span class="badge">Progression</span></article>
    </div>`;
}

function materialsPage() {
  content.innerHTML = `<h1>Learning Materials</h1>
    <p>Upload and preview files locally. Shared publication requires the secure backend.</p>
    <div class="card">
      <h2>Material library</h2>
      <button class="btn btn-primary" onclick="$('#materialInput').click()">＋ Select files</button>
      <div id="materialList" style="margin-top:15px"></div>
    </div>`;
  renderMaterials();
}

$("#materialInput").addEventListener("change", event => {
  const files = Array.from(event.target.files || []);
  files.forEach(file => materialFiles.push({
    name: file.name,
    size: file.size,
    type: file.type,
    file
  }));
  renderMaterials();
  toast(`${files.length} file(s) selected in this browser.`);
  event.target.value = "";
});

function renderMaterials() {
  const list = $("#materialList");
  if (!list) return;
  list.innerHTML = materialFiles.map((m, i) =>
    `<div class="list-row"><div><b>${escapeHTML(m.name)}</b><div class="muted small">${Math.ceil(m.size / 1024)} KB</div></div>
    <div class="btn-row"><button class="btn" onclick="previewMaterial(${i})">Preview</button><button class="btn btn-danger" onclick="removeMaterial(${i})">Remove</button></div></div>`
  ).join("") || `<p>No materials selected yet.</p>`;
}

function previewMaterial(index) {
  const item = materialFiles[index];
  if (!item?.file) return toast("File is not available in this browser session.");
  const url = URL.createObjectURL(item.file);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function removeMaterial(index) {
  materialFiles.splice(index, 1);
  renderMaterials();
}

function certificatesPage() {
  content.innerHTML = `<h1>Certificates</h1>
    <p>Certificates must be issued after verified completion of course requirements.</p>
    <div class="card"><h2>Your certificates</h2><p>No verified certificates available in the preview.</p></div>`;
}

function performancePage() {
  content.innerHTML = `<h1>Performance</h1>
    <p>Your training and work statistics will be calculated from verified records.</p>
    <div class="grid stats">
      ${stat("Completed tasks", "—", "▣", "Backend required")}
      ${stat("Quality score", "—", "◎", "Backend required")}
      ${stat("Review history", "—", "✓", "Backend required")}
      ${stat("Training progress", "—", "↗", "Backend required")}
    </div>`;
}

function notificationsPage() {
  content.innerHTML = `<h1>Notifications</h1>
    <div class="card"><p>No new notifications in the preview. Assignment and review alerts require the backend.</p></div>`;
}

function settingsPage() {
  content.innerHTML = `<h1>Settings</h1>
    <div class="grid two-col">
      <div class="card">
        <h2>Profile</h2>
        <label>Display name</label>
        <input id="settingName" value="${escapeHTML(currentUser?.name || "")}">
        <label>Email</label>
        <input value="${escapeHTML(currentUser?.email || "")}" disabled>
        <button class="btn btn-primary" onclick="saveProfile()">Save local profile</button>
      </div>
      <div class="card">
        <h2>Preferences</h2>
        <label>Appearance</label>
        <select id="themeSetting">
          <option value="dark">Dark</option>
          <option value="light">Light (future enhancement)</option>
        </select>
        <label><input type="checkbox" id="notificationsSetting" ${settings.notifications ? "checked" : ""} style="width:auto"> Notifications enabled</label>
        <label><input type="checkbox" id="autosaveSetting" ${settings.autosave ? "checked" : ""} style="width:auto"> Autosave preference</label>
        <button class="btn btn-primary" onclick="saveSettings()">Save preferences</button>
      </div>
    </div>`;
  $("#themeSetting").value = settings.theme;
}

function saveProfile() {
  if (!currentUser) return toast("Sign in to set a local preview profile.");
  const name = $("#settingName").value.trim();
  if (!name) return toast("Enter a display name.");
  currentUser.name = name;
  updateProfile();
  toast("Local profile updated.");
}

function saveSettings() {
  settings = {
    theme: $("#themeSetting").value,
    notifications: $("#notificationsSetting").checked,
    autosave: $("#autosaveSetting").checked
  };
  saveLocal("settings", settings);
  toast("Preferences saved in this browser.");
}

function adminPage() {
  if (currentUser?.email !== ADMIN_EMAIL) {
    content.innerHTML = `<h1>Access restricted</h1><div class="card"><p>Only the authorized administrator can use this section. Real access control must be enforced by the backend.</p></div>`;
    return;
  }
  content.innerHTML = `<h1>Administration</h1>
    <p>Administrative interface preview. The current identity is not verified by a server.</p>
    <div class="grid stats">
      ${stat("Registered users", "—", "♙", "Connect D1 database")}
      ${stat("Active tasks", tasks.length, "▣", "Local preview only")}
      ${stat("Learning materials", materialFiles.length, "▤", "Local browser only")}
      ${stat("Pending reviews", "—", "✓", "Connect review workflow")}
    </div>
    <div class="grid two-col">
      <div class="card"><h2>User management</h2><p>Server-backed user lists, roles and account status will appear here.</p></div>
      <div class="card"><h2>Course management</h2><p>Manage lessons, prerequisites, assessments and certificate requirements.</p><button class="btn" onclick="navigate('Learning')">View courses</button></div>
      <div class="card"><h2>Project management</h2><p>Upload datasets, create projects and assign work to authorized users.</p></div>
      <div class="card"><h2>Quality assurance</h2><p>Review submissions, return corrections and record verified results.</p></div>
    </div>`;
}

updateProfile();
settings = readLocal("settings", settings);
navigate("Dashboard");
