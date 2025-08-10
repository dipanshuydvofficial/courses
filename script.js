document.addEventListener('DOMContentLoaded', () => {
    const coursesGrid = document.getElementById('courses-grid');
    const searchBar = document.getElementById('search-bar');
    const categoryFilter = document.getElementById('category-filter');
    const levelFilter = document.getElementById('level-filter');
    const modal = document.getElementById('course-details-modal');
    const modalBody = document.getElementById('modal-body');
    const closeModal = document.querySelector('.close-button');
    const homeLink = document.getElementById('home-link');
    const allCoursesLink = document.getElementById('all-courses-link');
    const myProgressLink = document.getElementById('my-progress-link');
    const coursesSection = document.getElementById('courses-section');
    const progressSection = document.getElementById('progress-section');
    const progressGrid = document.getElementById('progress-grid');

    let courses = [];
    let completedCourses = JSON.parse(localStorage.getItem('completedCourses')) || [];

    // This function now fetches and parses data from the specified Google Sheet.
    async function fetchCourses() {
        // This URL points to your Google Sheet and uses the gviz API to get data as JSON.
        const googleSheetsUrl = 'https://docs.google.com/spreadsheets/d/1dPa3q0OBdXbO22wqWciCO_PZsffhAP_4bg0xb8GGBWo/gviz/tq?gid=0';

        try {
            const response = await fetch(googleSheetsUrl);
            const text = await response.text();
            
            // The response is JSONP, we need to extract the JSON part from the wrapper.
            const jsonString = text.substring(47, text.length - 2);
            const data = JSON.parse(jsonString);

            // The data is in a 'table' object with 'cols' and 'rows'. We need to format it.
            const headers = data.table.cols.map(col => col.label);
            courses = data.table.rows.map(row => {
                const course = {};
                // The 'c' property of a row is an array of cells.
                row.c.forEach((cell, index) => {
                    const header = headers[index];
                    // The 'v' property of a cell contains its value. It can be null for empty cells.
                    const value = cell ? cell.v : ''; 
                    course[header] = value;
                });
                return course;
            });
            
            populateFilters();
            renderCourses();
        } catch (error) {
            console.error('Error fetching or parsing course data:', error);
            coursesGrid.innerHTML = '<p>Failed to load courses. Please ensure your Google Sheet is publicly accessible ("Anyone with the link can view").</p>';
        }
    }

    function populateFilters() {
        const categories = [...new Set(courses.map(course => course.Category))];
        const levels = [...new Set(courses.map(course => course.Level))];

        categories.forEach(category => {
            if (!category) return; // Skip empty categories
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        levels.forEach(level => {
            if (!level) return; // Skip empty levels
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            levelFilter.appendChild(option);
        });
    }

    function renderCourses() {
        const searchTerm = searchBar.value.toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedLevel = levelFilter.value;

        const filteredCourses = courses.filter(course => {
            const title = course.Title || '';
            const description = course.Description || '';
            const category = course.Category || '';
            const level = course.Level || '';

            const matchesSearch = title.toLowerCase().includes(searchTerm) || description.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
            const matchesLevel = selectedLevel === 'all' || level === selectedLevel;
            return matchesSearch && matchesCategory && matchesLevel;
        });

        coursesGrid.innerHTML = '';
        if (filteredCourses.length === 0) {
            coursesGrid.innerHTML = '<p>No courses match your criteria.</p>';
        }
        
        filteredCourses.forEach(course => {
            const isCompleted = completedCourses.includes(course.CourseID);
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                ${isCompleted ? '<div class="completed-indicator">✔</div>' : ''}
                <div class="course-card-content">
                    <p class="category">${course.Category}</p>
                    <h3>${course.Title}</h3>
                    <p>${(course.Description || '').substring(0, 100)}...</p>
                    <button class="view-course-btn" data-course-id="${course.CourseID}">View Course</button>
                </div>
            `;
            coursesGrid.appendChild(courseCard);
        });
    }

    function displayCourseDetails(courseId) {
        const course = courses.find(c => c.CourseID == courseId);
        if (course) {
            modalBody.innerHTML = `
                <h2>${course.Title}</h2>
                <p><strong>Category:</strong> ${course.Category} | <strong>Level:</strong> ${course.Level} | <strong>Duration:</strong> ${course.Duration}</p>
                <div class="course-details-video">
                    <iframe src="${course.VideoURL.replace("watch?v=", "embed/")}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
                <p>${course.Description}</p>
                <div class="course-details-resources">
                    <a href="${course.Resources}" target="_blank" download>Download Resources</a>
                </div>
                <button id="mark-completed-btn" data-course-id="${course.CourseID}">Mark as Completed</button>
            `;
            modal.style.display = 'block';

            const markCompletedBtn = document.getElementById('mark-completed-btn');
            markCompletedBtn.addEventListener('click', () => markCourseAsCompleted(course.CourseID));
        }
    }

    function markCourseAsCompleted(courseId) {
        if (!completedCourses.includes(courseId)) {
            completedCourses.push(courseId);
            localStorage.setItem('completedCourses', JSON.stringify(completedCourses));
            renderCourses();
            if (progressSection.offsetParent !== null) { // Check if progress section is visible
                renderProgress();
            }
            alert('Course marked as completed!');
            modal.style.display = 'none';
        } else {
            alert('You have already completed this course.');
        }
    }
    
    function renderProgress() {
        progressGrid.innerHTML = '';
        const completed = courses.filter(course => completedCourses.includes(course.CourseID));

        if (completed.length === 0) {
            progressGrid.innerHTML = '<p>You have not completed any courses yet.</p>';
            return;
        }

        completed.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            courseCard.innerHTML = `
                <div class="course-card-content">
                    <p class="category">${course.Category}</p>
                    <h3>${course.Title}</h3>
                    <p>${(course.Description || '').substring(0, 100)}...</p>
                    <button class="view-course-btn" data-course-id="${course.CourseID}">View Course</button>
                </div>
            `;
            progressGrid.appendChild(courseCard);
        });
    }

    function showCoursesSection() {
        coursesSection.classList.remove('hidden');
        progressSection.classList.add('hidden');
    }

    function showProgressSection() {
        coursesSection.classList.add('hidden');
        progressSection.classList.remove('hidden');
        renderProgress();
    }

    searchBar.addEventListener('input', renderCourses);
    categoryFilter.addEventListener('change', renderCourses);
    levelFilter.addEventListener('change', renderCourses);

    coursesGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-course-btn')) {
            const courseId = e.target.getAttribute('data-course-id');
            displayCourseDetails(courseId);
        }
    });
    
    progressGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-course-btn')) {
            showCoursesSection();
            const courseId = e.target.getAttribute('data-course-id');
            displayCourseDetails(courseId);
        }
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        modalBody.innerHTML = ''; // Clear modal content
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
            modalBody.innerHTML = ''; // Clear modal content
        }
    });

    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCoursesSection();
    });

    allCoursesLink.addEventListener('click', (e) => {
        e.preventDefault();
        showCoursesSection();
    });

    myProgressLink.addEventListener('click', (e) => {
        e.preventDefault();
        showProgressSection();
    });

    fetchCourses();
});