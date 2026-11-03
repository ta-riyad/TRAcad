import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ===== 1. FIREBASE CONFIGURATION ===== */
const firebaseConfig = {
  apiKey: "AIzaSyAmfJ53FL0Pam3r2Rt-7s_QaxvPi5G-_BY",
  authDomain: "tracad-studio.firebaseapp.com",
  projectId: "tracad-studio",
  storageBucket: "tracad-studio.firebasestorage.app",
  messagingSenderId: "720193500182",
  appId: "1:720193500182:web:ef939d75af42847f38b137",
  measurementId: "G-LR0Q2PF7KD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== 2. UTILITIES ===== */
const $ = (id) => document.getElementById(id);

function getValue(id) {
  return $(id) ? $(id).value.trim() : "";
}

function safeText(value, fallback) {
  return value || fallback;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

/* ===== 3. CONFIGURATION & DEFAULTS ===== */
const defaults = {
  documentType: "Assignment",
  institution: "",
  department: "",
  courseSelect: "",
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
  teacherSelect: "",
  teacherName: "",
  teacherDesignation: "",
  teacherDepartment: "",
  teacherUniversity: ""
};
const fields = Object.keys(defaults);

const FORM_KEY = "tracad_cover_form_v2";
const THEME_KEY = "tracad_theme_preference";

/* ===== 4. THEME TOGGLE LOGIC ===== */
function initTheme() {
  const toggleBtn = $("themeToggleBtn");
  const themeIcon = $("themeIcon");
  const themeLabel = $("themeLabel");

  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  if (savedTheme === "dark") {
    document.body.classList.remove("light-theme");
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeLabel) themeLabel.textContent = "Light";
  } else {
    document.body.classList.add("light-theme");
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeLabel) themeLabel.textContent = "Dark";
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
      if (themeIcon) themeIcon.textContent = isLight ? "🌙" : "☀️";
      if (themeLabel) themeLabel.textContent = isLight ? "Dark" : "Light";
    });
  }
}

/* ===== 5. CORE LOGIC - Update & Local Storage ===== */
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

function saveLocal() {
  try {
    const data = {};
    fields.forEach((id) => (data[id] = getValue(id)));
    localStorage.setItem(FORM_KEY, JSON.stringify(data));
  } catch (e) {}
}

function loadLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(FORM_KEY));
    if (!data) return false;
    fields.forEach((id) => {
      if ($(id) && data[id] !== undefined) $(id).value = data[id];
    });
    return true;
  } catch {
    return false;
  }
}

/* ===== 6. FIREBASE AUTH & AUTO-FILL SYSTEM ===== */
function autoFillStudentData(userData) {
  if (!userData) return;
  if ($("studentName")) $("studentName").value = userData.studentName || "";
  if ($("studentId")) $("studentId").value = userData.studentId || "";
  if ($("reg")) $("reg").value = userData.reg || "";
  if ($("level")) $("level").value = userData.level || "";
  if ($("semester")) $("semester").value = userData.semester || "";
  if ($("group")) $("group").value = userData.group || "";
  if ($("session")) $("session").value = userData.session || "";

  updatePreview();
  saveLocal();
}

async function fetchStudentProfile(user) {
  try {
    const docRef = doc(db, "students", user.email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      autoFillStudentData(docSnap.data());
    } else {
      console.warn("No student profile record found in database for email:", user.email);
    }
  } catch (err) {
    console.error("Error fetching student profile:", err);
  }
}

function initAuth() {
  const modal = $("loginModal");
  const authBtn = $("authBtn");
  const closeModalBtn = $("closeModalBtn");
  const loginForm = $("loginForm");
  const googleBtn = $("googleAuthBtn");

  if (authBtn) {
    authBtn.addEventListener("click", () => {
      if (auth.currentUser) {
        if (confirm("Do you want to log out?")) signOut(auth);
      } else {
        if (modal) modal.classList.remove("hidden");
      }
    });
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  // Email & Password Auth
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        if (modal) modal.classList.add("hidden");
      } catch (err) {
        alert("Login failed: " + err.message);
      }
    });
  }

  // Google Provider Auth
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        if (modal) modal.classList.add("hidden");
      } catch (err) {
        alert("Google Sign-In failed: " + err.message);
      }
    });
  }

  // Auth State Listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setText("authLabel", user.displayName || user.email.split("@")[0]);
      setText("authIcon", "👤");
      fetchStudentProfile(user);
    } else {
      setText("authLabel", "Student Login");
      setText("authIcon", "🔑");
    }
  });
}

/* ===== 7. INITIALIZATION ===== */
function init() {
  initTheme();
  initAuth();
  if (!loadLocal()) {
    updatePreview();
  } else {
    updatePreview();
  }
  console.log("✓ TRAcad Studio with Firebase Auth initialized");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
