/**
 * ==========================================
 * TRACAD ASSIGNMENT COVER STUDIO
 * Direct A4 PDF download + download counter
 * ==========================================
 */

console.log("TRAcad script.js v5 loaded");

/* 1. UTILITIES */
const $ = (id) => document.getElementById(id);

function getValue(id) {
  return $(id) ?$(id).value.trim() : "";
}

function safeText(value, fallback) {
  return value || fallback;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

/* 2. CONFIGURATION & DEFAULTS */
const defaults = {
  documentType: "Assignment",
  institution: "",
  department: "",
  courseName: "",
  courseCode: "",
  title: "",
  studentName: "",
  studentId: "",
  reg: "",
  level: "",
  semester: "",
  group: "",
  session: "",
  teacherName: "",
  teacherDesignation: "",
  teacherDepartment: "",
  teacherUniversity: ""
};
const fields = Object.keys(defaults);

const FORM_KEY = "tracad_cover_form_v2";
const OLD_FORM_KEY = "sau_assignment_cover_data";
try { localStorage.removeItem(OLD_FORM_KEY); } catch (e) {}

/* 3. INSTITUTION BINDING
   Turns hard-coded "Sylhet ..." text inside the cover into a live-bound element
   so it shows ONLY what the user types in the University field. */
function autoBindInstitution() {
  const cover = $("cover");
  if (!cover) return;

  const walker = document.createTreeWalker(cover, NodeFilter.SHOW_TEXT);
  const hits = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (/sylhet/i.test(node.nodeValue) && !node.parentElement.closest("[data-institution], #docFooterBrand")) {
      hits.push(node);
    }
  }
  hits.forEach((node) => {
    const span = document.createElement("span");
    span.setAttribute("data-institution", "");
    span.textContent = node.nodeValue;
    node.parentNode.replaceChild(span, node);
  });
}

/* 4. CORE LOGIC - Update, Load, Save */
function updatePreview() {
  const institution = getValue("institution");
  const department = getValue("department");

  const instText = safeText(institution, "University Name");
  document.querySelectorAll("[data-institution], #previewInstitution").forEach((el) => {
    el.textContent = instText;
  });
  setText("previewDepartment", safeText(department, "Department Name"));

  // Document info
  setText("previewType", getValue("documentType") || "Assignment");
  setText("previewTitle", safeText(getValue("title"), "Assignment Title"));
  setText("previewCourseName", safeText(getValue("courseName"), "Course Name"));
  setText("previewCourseCode", safeText(getValue("courseCode"), "Course Code"));

  // Teacher info
  setText("previewTeacher", safeText(getValue("teacherName"), "Course teacher name"));
  setText("previewDesignation", safeText(getValue("teacherDesignation"), "Designation"));
  setText("previewDepartment2", safeText(getValue("teacherDepartment") || department, "Department Name"));
  setText("previewTeacherUniversity", safeText(getValue("teacherUniversity"), "University Name"));

  // Student info
  setText("previewStudent", safeText(getValue("studentName"), "Student name"));
  setText("previewId", safeText(getValue("studentId"), "1234567"));
  setText("previewReg", safeText(getValue("reg"), "1234"));
  setText("previewLevel", safeText(getValue("level"), "00"));
  setText("previewSemester", safeText(getValue("semester"), "00"));
  setText("previewGroup", safeText(getValue("group"), "A"));
  setText("previewSession", safeText(getValue("session"), "2022-23"));

  // Footer brand
  setText("docFooterBrand", instText.toUpperCase());
}

function loadDefaults() {
  fields.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.value = defaults[id];
    if (el.tagName === "SELECT" && el.selectedIndex === -1) el.selectedIndex = 0;
  });
  updatePreview();
}

function saveLocal() {
  try {
    const data = {};
    fields.forEach((id) => (data[id] = getValue(id)));
    localStorage.setItem(FORM_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage unavailable - ignore */
  }
}

function loadLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(FORM_KEY));
    if (!data) return false;
    fields.forEach((id) => {
      if ($(id) && data[id] !== undefined)$(id).value = data[id];
    });
    return true;
  } catch {
    return false;
  }
}

function restoreLogo() {
  try {
    const logo = localStorage.getItem("sau_custom_logo");
    if (logo) {
      $("previewLogo").src = logo;
      $("watermarkLogo").src = logo;
      $("logoLabel").textContent = "Custom Logo Loaded";
    }
  } catch (e) {
    /* ignore */
  }
}

/* 5. DOWNLOAD COUNTER (Python backend on PythonAnywhere) */
/* 5. DOWNLOAD COUNTER (Python backend on PythonAnywhere) */
const COUNTER_API = "https://tahrim.pythonanywhere.com";
const COUNT_CACHE_KEY = "tracad_last_count";

function counterEnabled() {
  return !COUNTER_API.includes("YOUR-BACKEND-URL");
}

function readTotal(data) {
  const n = Number(data && (data.total ?? data.count ?? data.downloads));
  return Number.isFinite(n) ? n : NaN;
}

function paintCount(total) {
  const text = Number(total).toLocaleString();
  document.querySelectorAll(".js-download-count, #downloadCount").forEach((el) => {
    el.textContent = text;
  });
}

function showCount(total) {
  if (!Number.isFinite(total)) return;
  paintCount(total);
  try { localStorage.setItem(COUNT_CACHE_KEY, String(total)); } catch (e) {}
}

function showCachedCount() {
  try {
    const raw = localStorage.getItem(COUNT_CACHE_KEY);
    if (raw !== null && Number.isFinite(Number(raw))) paintCount(Number(raw));
  } catch (e) {}
}

async function loadDownloadCount() {
  if (!counterEnabled()) return;
  showCachedCount();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Must match @app.route("/api/downloads") exactly without a trailing slash
      const res = await fetch(`${COUNTER_API}/api/downloads`, { 
        cache: "no-store" 
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const total = readTotal(await res.json());
      if (!Number.isFinite(total)) throw new Error("Response has no total/count field");
      showCount(total);
      return;
    } catch (e) {
      console.warn("Counter load failed (check backend + CORS):", e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

async function recordDownload() {
  if (!counterEnabled()) return;
  try {
    // Must match @app.route("/api/downloads") exactly without a trailing slash
    const res = await fetch(`${COUNTER_API}/api/downloads`, { 
      method: "POST" 
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    showCount(readTotal(await res.json()));
  } catch (e) {
    console.warn("Counter update failed (check backend + CORS):", e);
  }
}




/* 6. PDF PIPELINE */
const originalTitle = document.title;
let isExporting = false;

const A4_W_PX = 794;   // 210mm @ 96dpi
const A4_H_PX = 1123;  // 297mm @ 96dpi

/* Scales the on-screen cover to fit its box (desktop right column / mobile full width).
   Only affects the preview - the PDF is rendered from an unscaled clone. */
function fitPreview() {
  const stage = $("previewStage");
  if (!stage) return;
  const cs = getComputedStyle(stage);
  const avail = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (avail <= 0) return;
  const scale = Math.max(0.2, Math.min(1, avail / A4_W_PX));
  stage.style.setProperty("--fit", scale.toFixed(3));
}

/* File name: "<course code> Assign by TRAcad.pdf"  e.g. "AGRHA 201(T) Assign by TRAcad.pdf" */
/* File name: "<course code> Assign C By TRAcad.pdf" */
function buildPdfName() {
  const code = getValue("courseCode");
  const name = `${code ? code + " " : ""}Assign C By TRAcad`;
  return name.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
}

function waitForAssets(root) {
  const tasks = [];
  if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);
  root.querySelectorAll("img").forEach((img) => {
    if (!img.complete) {
      tasks.push(
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
      );
    }
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  return Promise.race([Promise.all(tasks), timeout]);
}

function makeExportClone() {
  const stage = document.createElement("div");
  stage.style.cssText =
    `position:absolute;left:-10000px;top:0;width:${A4_W_PX}px;height:${A4_H_PX}px;` +
    `overflow:hidden;background:#fff;pointer-events:none;`;

  const clone = $("cover").cloneNode(true);
  clone.removeAttribute("id");
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.style.cssText = `width:${A4_W_PX}px;height:${A4_H_PX}px;margin:0;transform:none;`;

  stage.appendChild(clone);
  document.body.appendChild(stage);
  return { stage, clone };
}

async function downloadPdf() {
  if (isExporting) return;
  isExporting = true;

  const btn = $("downloadBtn");
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = "Generating PDF…";

  let stage = null;
  try {
    if (!window.html2canvas || !window.jspdf) {
      throw new Error("PDF libraries not loaded");
    }

    updatePreview();
    const made = makeExportClone();
    stage = made.stage;
    await waitForAssets(stage);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;

    const canvas = await window.html2canvas(made.clone, {
      scale: isMobile ? 3 : 4,
      width: A4_W_PX,
      height: A4_H_PX,
      windowWidth: A4_W_PX,
      windowHeight: A4_H_PX,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");

    const pdfName = buildPdfName();
    pdf.setProperties({ title: pdfName });
    const blobUrl = URL.createObjectURL(pdf.output("blob"));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = pdfName + ".pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

    recordDownload();
  } catch (error) {
    console.error("PDF download error:", error);
    alert("Direct download failed. Opening print dialog instead - choose 'Save as PDF' and paper size A4.");
    window.print();
  } finally {
    if (stage) stage.remove();
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    isExporting = false;
  }
}

async function printCover() {
  updatePreview();
  await waitForAssets(document);
  document.title = buildPdfName();
  window.print();
  document.title = originalTitle;
}

/* 7. EVENT LISTENERS */
function bindEvents() {
  const onFieldEvent = (e) => {
    const t = e.target;
    if (t && t.id && fields.includes(t.id)) {
      updatePreview();
      saveLocal();
    }
  };
  document.addEventListener("input", onFieldEvent);
  document.addEventListener("change", onFieldEvent);

  // Logo upload
  if ($("logoInput")) {
    $("logoInput").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file || !file.type.startsWith("image/")) {
        alert("Please upload a valid image file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        $("previewLogo").src = e.target.result;
        $("watermarkLogo").src = e.target.result;
        $("logoLabel").textContent = file.name;
        try {
          localStorage.setItem("sau_custom_logo", e.target.result);
        } catch (err) {
          /* too large to persist - still works this session */
        }
        updatePreview();
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset
  if ($("resetBtn")) {
    $("resetBtn").addEventListener("click", () => {
      if (!confirm("Reset all fields to default values?")) return;
      try {
        localStorage.removeItem(FORM_KEY);
        localStorage.removeItem("sau_custom_logo");
      } catch (e) {}

      if ($("logoInput")) $("logoInput").value = "";
      $("previewLogo").src = "favicon1.png";
      $("watermarkLogo").src = "favicon1.png";
      $("logoLabel").textContent = "Upload High-Res Logo";
      loadDefaults();
    });
  }

  if ($("downloadBtn")) $("downloadBtn").addEventListener("click", downloadPdf);
  if ($("printBtn")) $("printBtn").addEventListener("click", printCover);

  window.addEventListener("afterprint", () => {
    document.title = originalTitle;
  });

  // Keep the live preview fitted to its column
  window.addEventListener("resize", fitPreview);
  if ("ResizeObserver" in window && $("previewStage")) {
    new ResizeObserver(fitPreview).observe($("previewStage"));
  }
}

/* 8. INITIALIZATION */
function init() {
  autoBindInstitution();
  bindEvents();
  if (!loadLocal()) {
    loadDefaults();
  } else {
    updatePreview();
  }
  restoreLogo();
  fitPreview();
  loadDownloadCount();
  console.log("✓ TRAcad Assignment Cover Studio initialized");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
