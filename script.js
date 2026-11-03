import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

/* ===== 2. UTILITIES & DEFAULTS ===== */
const $ = (id) => document.getElementById(id);
function getValue(id) { return $(id) ? $(id).value.trim() : ""; }
function safeText(value, fallback) { return value || fallback; }
function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

const defaults = {
  documentType: "Assignment", institution: "", department: "", courseSelect: "",
  courseName: "", courseCode: "", title: "", studentName: "", studentId: "",
  reg: "", level: "", semester: "", group: "", session: "", teacherSelect: "",
  teacherName: "", teacherDesignation: "", teacherDepartment: "", teacherUniversity: ""
};
const fields = Object.keys(defaults);
const FORM_KEY = "tracad_cover_form_v2";
const THEME_KEY = "tracad_theme_preference";

/* ===== 3. THEME TOGGLE ===== */
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

/* ===== 4. CORE CANVAS UPDATE ===== */
function updatePreview() {
  const institution = getValue("institution");
  const department = getValue("department");
  const instText = safeText(institution, "University Name");

  document.querySelectorAll("[data-institution], #previewInstitution").forEach((el) => {
    el.textContent = instText;
  });
  setText("previewDepartment", safeText(department, "Department Name"));

  setText("previewType", getValue("documentType") || "Assignment");
  setText("previewTitle", safeText(getValue("title"), "Assignment Title"));
  setText("previewCourseName", safeText(getValue("courseName"), "Course Name"));
  setText("previewCourseCode", safeText(getValue("courseCode"), "Course Code"));

  setText("previewTeacher", safeText(getValue("teacherName"), "Course teacher name"));
  setText("previewDesignation", safeText(getValue("teacherDesignation"), "Designation"));
  setText("previewDepartment2", safeText(getValue("teacherDepartment") || department, "Department Name"));
  setText("previewTeacherUniversity", safeText(getValue("teacherUniversity"), "University Name"));

  setText("previewStudent", safeText(getValue("studentName"), "Student name"));
  setText("previewId", safeText(getValue("studentId"), "1234567"));
  setText("previewReg", safeText(getValue("reg"), "1234"));
  setText("previewLevel", safeText(getValue("level"), "00"));
  setText("previewSemester", safeText(getValue("semester"), "00"));
  setText("previewGroup", safeText(getValue("group"), "A"));
  setText("previewSession", safeText(getValue("session"), "2022-23"));

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

/* ===== 5. AUTOMATIC FORM FILL SYSTEM ===== */
function autoFillStudentData(profile) {
  if (!profile) return;
  if ($("studentName")) $("studentName").value = profile.studentName || "";
  if ($("studentId")) $("studentId").value = profile.studentId || "";
  if ($("reg")) $("reg").value = profile.reg || "";
  if ($("level")) $("level").value = profile.level || "";
  if ($("semester")) $("semester").value = profile.semester || "";
  if ($("group")) $("group").value = profile.group || "";
  if ($("session")) $("session").value = profile.session || "";

  updatePreview();
  saveLocal();
}

/* ===== 6. AUTHENTICATION & PROFILE SYSTEM ===== */
let currentStudentProfile = null;

function showView(viewId) {
  $("signupView").classList.add("hidden");
  $("loginView").classList.add("hidden");
  $("profileView").classList.add("hidden");
  $(viewId).classList.remove("hidden");
  $("authModal").classList.remove("hidden");
}

function closeModal() {
  $("authModal").classList.add("hidden");
}

async function fetchAndApplyProfile(user) {
  try {
    const docRef = doc(db, "students", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      currentStudentProfile = docSnap.data();
      autoFillStudentData(currentStudentProfile);

      // Populate profile view inputs for editing
      if ($("profileName")) $("profileName").value = currentStudentProfile.studentName || "";
      if ($("profileStudentId")) $("profileStudentId").value = currentStudentProfile.studentId || "";
      if ($("profileReg")) $("profileReg").value = currentStudentProfile.reg || "";
      if ($("profileLevel")) $("profileLevel").value = currentStudentProfile.level || "";
      if ($("profileSemester")) $("profileSemester").value = currentStudentProfile.semester || "";
      if ($("profileGroup")) $("profileGroup").value = currentStudentProfile.group || "";
      if ($("profileSession")) $("profileSession").value = currentStudentProfile.session || "";
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
}

function initAuthSystem() {
  // Navigation Event Listeners
  $("openLoginBtn").addEventListener("click", () => showView("loginView"));
  $("openSignupBtn").addEventListener("click", () => showView("signupView"));
  $("openProfileBtn").addEventListener("click", () => showView("profileView"));
  $("switchToLogin").addEventListener("click", (e) => { e.preventDefault(); showView("loginView"); });
  $("switchToSignup").addEventListener("click", (e) => { e.preventDefault(); showView("signupView"); });
  $("closeModalBtn").addEventListener("click", closeModal);

  // Logout
  $("logoutBtn").addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      signOut(auth);
    }
  });

  // SIGN UP FORM SUBMIT
  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;

    const profileData = {
      studentName: $("signupName").value.trim(),
      studentId: $("signupStudentId").value.trim(),
      reg: $("signupReg").value.trim(),
      level: $("signupLevel").value.trim(),
      semester: $("signupSemester").value.trim(),
      group: $("signupGroup").value.trim(),
      session: $("signupSession").value.trim(),
      email: email
    };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save profile to Firestore under user.uid
      await setDoc(doc(db, "students", user.uid), profileData);
      
      closeModal();
      alert("Account created and profile saved successfully!");
    } catch (err) {
      alert("Registration failed: " + err.message);
    }
  });

  // LOGIN FORM SUBMIT
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeModal();
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  });

  // UPDATE PROFILE FORM SUBMIT
  $("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const updatedData = {
      studentName: $("profileName").value.trim(),
      studentId: $("profileStudentId").value.trim(),
      reg: $("profileReg").value.trim(),
      level: $("profileLevel").value.trim(),
      semester: $("profileSemester").value.trim(),
      group: $("profileGroup").value.trim(),
      session: $("profileSession").value.trim(),
      email: auth.currentUser.email
    };

    try {
      await setDoc(doc(db, "students", auth.currentUser.uid), updatedData, { merge: true });
      autoFillStudentData(updatedData);
      closeModal();
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  });

  // AUTH STATE LISTENER
  onAuthStateChanged(auth, (user) => {
    if (user) {
      $("loggedOutNav").classList.add("hidden");
      $("loggedInNav").classList.remove("hidden");
      fetchAndApplyProfile(user);
    } else {
      $("loggedInNav").classList.add("hidden");
      $("loggedOutNav").classList.remove("hidden");
    }
  });
}

/* ===== 7. EVENT LISTENERS ===== */
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

  // Auto-fill Course Selection
  const courseSelect = $("courseSelect");
  if (courseSelect) {
    courseSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      if (val === "manual") {
        if ($("courseName")) $("courseName").value = "";
        if ($("courseCode")) $("courseCode").value = "";
      } else {
        const [name, code] = val.split("|");
        if ($("courseName")) $("courseName").value = name || "";
        if ($("courseCode")) $("courseCode").value = code || "";
      }
      updatePreview(); saveLocal();
    });
  }

  // Auto-fill Teacher Selection
  const teacherSelect = $("teacherSelect");
  if (teacherSelect) {
    teacherSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) return;
      if (val === "manual") {
        $("teacherName").value = ""; $("teacherDesignation").value = "";
        $("department").value = ""; $("teacherUniversity").value = ""; $("institution").value = "";
      } else {
        const [name, designation, dept] = val.split("|");
        if ($("teacherName")) $("teacherName").value = name || "";
        if ($("department")) $("department").value = dept || "";
        const sauName = "Sylhet Agricultural University, Sylhet";
        if ($("teacherUniversity")) $("teacherUniversity").value = sauName;
        if ($("institution")) $("institution").value = sauName;

        const desgSelect = $("teacherDesignation");
        if (desgSelect) {
          let matched = false;
          for (let opt of desgSelect.options) {
            if (opt.text.toLowerCase() === designation.toLowerCase()) {
              desgSelect.value = opt.text; matched = true; break;
            }
          }
          if (!matched) desgSelect.value = designation;
        }
      }
      updatePreview(); saveLocal();
    });
  }

  // Reset
  if ($("resetBtn")) {
    $("resetBtn").addEventListener("click", () => {
      if (!confirm("Reset all fields to default values?")) return;
      try { localStorage.removeItem(FORM_KEY); } catch (e) {}
      fields.forEach((id) => { if ($(id)) $(id).value = defaults[id]; });
      updatePreview();
    });
  }
}

/* ===== 8. INITIALIZATION ===== */
function init() {
  initTheme();
  bindEvents();
  initAuthSystem();
  if (!loadLocal()) {
    updatePreview();
  } else {
    updatePreview();
  }
  console.log("✓ TRAcad Studio Profile System Initialized");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
