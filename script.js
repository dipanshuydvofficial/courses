/* script.js
   LearnStack full app with live Google Sheets CSV integration for courses.
*/

/* ======= CONFIG ======= */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOYa1xUpJrVcd2cvyxlvcu4J3vsK3puGn0opnhnTB1qbRL-_ul6wsFJRDtkpkxytPVhgLslDmy8t3w/pub?output=csv&gid=0";

/* ======= FALLBACK DATA ======= */
const FALLBACK_COURSES = [
  {
    id: "c01",
    title: "Foundations of Biology",
    short: "Introductory course covering cell structure, taxonomy, and basics.",
    fulldesc: "Deep dive into the cell, tissues, and plant anatomy with hands-on examples and quizzes.",
    category: "Biology",
    level: "Beginner",
    duration: "4h 20m",
    price: "Free",
    video_url: "",
    resources: "Syllabus (PDF)|#;Images (ZIP)|#"
  },
  {
    id: "c02",
    title: "Frontend Web Development",
    short: "HTML, CSS, JavaScript fundamentals and accessible UI patterns.",
    fulldesc: "Hands-on projects building responsive websites and modern front-ends.",
    category: "Computer Science",
    level: "Intermediate",
    duration: "8h",
    price: "$25",
    video_url: "",
    resources: "Starter kit (ZIP)|#"
  }
];

/* ======= LOCAL STORAGE ======= */
const STORAGE_KEY = "learnstack_completed";
const getCompleted = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveCompleted = arr => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
let completed = new Set(getCompleted());

/* ======= DOM ======= */
const appEl = document.getElementById("app");
const gridEl = document.getElementById("grid");
const searchEl = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");
const progressPill = document.getElementById("progress-pill");
const yearEl = document.getElementById("year");
const pages = { home: document.getElementById("home-page"), course: document.getElementById("course-page"), progress: document.getElementById("progress-page") };
const navLinks = document.querySelectorAll('[data-route]');
const hamburger = document.getElementById("hamburger");
const mainNav = document.getElementById("main-nav");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const completedListEl = document.getElementById("completed-courses");
const backBtn = document.getElementById("back-to-home");
const markBtn = document.getElementById("mark-complete");
const completeBadge = document.getElementById("complete-badge");

const courseTitle = document.getElementById("course-title");
const courseMeta = document.getElementById("course-meta");
const videoWrapper = document.getElementById("video-wrapper");
const courseFullDesc = document.getElementById("course-full-desc");
const resourcesList = document.getElementById("resources-list");

/* ======= DATA ======= */
let COURSES = [];

/* ======= INITIALIZATION ======= */
document.addEventListener("DOMContentLoaded", async () => {
  yearEl.textContent = new Date().getFullYear();

  // Use data-sheet-url attribute if set, else config constant
  const attrUrl = appEl.getAttribute("data-sheet-url");
  const sheetUrl = attrUrl && attrUrl.trim() ? attrUrl.trim() : SHEET_CSV_URL;
  
  if(sheetUrl){
    try {
      COURSES = await fetchCsvCourses(sheetUrl);
      console.info("Loaded courses from Google Sheets CSV:", COURSES.length);
    } catch(e){
      console.warn("Failed to fetch courses, using fallback data.", e);
      COURSES = FALLBACK_COURSES;
    }
  } else {
    COURSES = FALLBACK_COURSES;
  }

  COURSES = COURSES.map(normalizeCourse);
  renderCategories();
  renderGrid(COURSES);
  updateProgressUI();
  attachHandlers();
  routeTo("home");
});

/* ======= CSV fetch & parse ======= */
async function fetchCsvCourses(csvUrl){
  const res = await fetch(csvUrl, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
  const text = await res.text();
  return parseCsv(text);
}

// Simple CSV parser, handles commas and quotes (basic)
function parseCsv(text){
  const lines = text.trim().split('\n');
  const headers = lines.shift().split(',').map(h => h.trim().toLowerCase());
  const data = [];
  lines.forEach(line => {
    // Basic CSV split, won't handle commas inside quotes but should be OK if your CSV is clean
    const values = line.split(',');
    const obj = {};
    headers.forEach((h,i) => obj[h] = values[i] ? values[i].trim() : "");
    data.push(obj);
  });
  return data;
}

/* ======= Normalize course object ======= */
function normalizeCourse(raw){
  const course = {
    id: raw.id || Math.random().toString(36).slice(2,9),
    title: raw.title || "Untitled",
    short: raw.short || raw.summary || "",
    fulldesc: raw.fulldesc || raw.full_desc || raw.description || raw.short || "",
    category: raw.category || "General",
    level: raw.level || "Beginner",
    duration: raw.duration || "",
    price: raw.price || "Free",
    video_url: raw.video_url || "",
    resources: []
  };
  // Parse resources string
  if(raw.resources){
    raw.resources.split(";").forEach(r => {
      const [label, url] = r.split("|").map(x => x.trim());
      if(url) course.resources.push({name: label || url, href: url});
    });
  }
  // Convert Drive links to embed URL
  course.embed_url = driveToPreview(course.video_url);
  return course;
}

/* ======= Drive video embed converter ======= */
function driveToPreview(url){
  if(!url) return "";
  try {
    if(url.includes("/preview")) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if(match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
    const idParam = (new URL(url)).searchParams.get("id");
    if(idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
    return url;
  } catch {
    return url;
  }
}

/* ======= Render categories dropdown ======= */
function renderCategories(){
  const cats = Array.from(new Set(COURSES.map(c => c.category))).sort();
  categoryFilter.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "All categories";
  categoryFilter.appendChild(allOpt);
  cats.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });
}

/* ======= Create course card ======= */
function createCard(course){
  const el = document.createElement("article");
  el.className = "card";
  el.setAttribute("role","listitem");
  el.innerHTML = `
    <div class="card-top">
      <div>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.short)}</p>
        <div class="meta">
          <span class="kv">${escapeHtml(course.category)}</span>
          <span class="kv">${escapeHtml(course.level)}</span>
          <span class="kv">${escapeHtml(course.duration)}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div class="meta" style="justify-content:flex-end">
          <span class="kv">${escapeHtml(course.price)}</span>
        </div>
        <div style="margin-top:.6rem">
          <button class="btn view-btn" data-id="${course.id}">View Course</button>
        </div>
      </div>
    </div>
    <div class="card-footer">
      <div>
        <small style="color:var(--muted)">${escapeHtml(course.level)} • ${escapeHtml(course.duration)}</small>
      </div>
      <div>
        <span class="badge ${completed.has(course.id) ? '' : 'hidden'}" data-completed="${course.id}">Completed ✓</span>
      </div>
    </div>
  `;
  return el;
}

/* ======= Render course grid ======= */
function renderGrid(list){
  gridEl.innerHTML = "";
  if(!list.length){
    gridEl.innerHTML = `<p style="padding:1rem;color:var(--muted)">No courses match your search or filter.</p>`;
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(c => frag.appendChild(createCard(c)));
  gridEl.appendChild(frag);
}

/* ======= Search & filter ======= */
function filterCourses(){
  const q = searchEl.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const filtered = COURSES.filter(c => {
    const haystack = [c.title, c.short, c.category, c.fulldesc].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!cat || c.category === cat);
  });
  renderGrid(filtered);
}

/* ======= Routing and detail ======= */
let currentCourse = null;
function routeTo(page, courseId){
  Object.values(pages).forEach(p => p.hidden = true);
  if(page === "home") pages.home.hidden = false;
  else if(page === "course" && courseId) {
    pages.course.hidden = false;
    showCourseDetail(courseId);
  }
  else if(page === "progress"){
    pages.progress.hidden = false;
    renderCompletedList();
  } else {
    pages.home.hidden = false;
  }
  navLinks.forEach(a => a.classList.toggle("active", a.dataset.route === page));
}

function showCourseDetail(id){
  currentCourse = COURSES.find(c => c.id === id);
  if(!currentCourse) return;
  courseTitle.textContent = currentCourse.title;
  courseMeta.innerHTML = `
    <span class="kv">${escapeHtml(currentCourse.category)}</span>
    <span class="kv">${escapeHtml(currentCourse.level)}</span>
    <span class="kv">${escapeHtml(currentCourse.duration)}</span>
  `;
  videoWrapper.innerHTML = "";
  if(currentCourse.embed_url){
    const iframe = document.createElement("iframe");
    iframe.src = currentCourse.embed_url;
    iframe.width = "100%";
    iframe.height = "480";
    iframe.setAttribute("allow","autoplay; encrypted-media");
    iframe.setAttribute("title", `${currentCourse.title} video`);
    iframe.style.border = "0";
    videoWrapper.appendChild(iframe);
  } else {
    const placeholder = document.createElement("div");
    placeholder.style.padding = "2rem";
    placeholder.style.background = "#fff";
    placeholder.style.borderRadius = "8px";
    placeholder.style.boxShadow = "var(--small-shadow)";
    placeholder.textContent = "No video available for this course.";
    videoWrapper.appendChild(placeholder);
  }
  courseFullDesc.textContent = currentCourse.fulldesc || currentCourse.short || "";
  resourcesList.innerHTML = "";
  currentCourse.resources.forEach(r => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(r.name)}</span><a href="${r.href}" target="_blank" rel="noopener noreferrer">Download</a>`;
    resourcesList.appendChild(li);
  });
  const done = completed.has(currentCourse.id);
  markBtn.textContent = done ? "Completed" : "Mark as Completed";
  markBtn.disabled = done;
  markBtn.setAttribute("aria-pressed", done ? "true" : "false");
  completeBadge.classList.toggle("hidden", !done);
}

/* ======= Progress UI ======= */
function updateProgressUI(){
  const total = COURSES.length;
  const done = completed.size;
  const percent = total ? Math.round((done/total)*100) : 0;
  progressFill.style.width = `${percent}%`;
  progressFill.setAttribute("aria-valuenow", percent);
