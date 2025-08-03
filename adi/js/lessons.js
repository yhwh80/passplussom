// Lessons page JS module
// Interactive calendar, lesson scheduling UI, stubs for data

document.addEventListener('DOMContentLoaded', () => {
  renderCalendar(new Date());
  document.getElementById('add-lesson-btn').addEventListener('click', showLessonForm);
  document.getElementById('cancel-lesson').addEventListener('click', hideLessonForm);
  document.getElementById('add-lesson-form').addEventListener('submit', addLesson);
});

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  const tbody = document.getElementById('calendar-body');
  tbody.innerHTML = '';

  let row = document.createElement('tr');
  let dayCount = 0;

  // start pad
  for (let i = 0; i < startDay; i++) {
    row.appendChild(document.createElement('td'));
    dayCount++;
  }

  // fill days
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('td');
    cell.textContent = d;
    cell.className = 'border p-2 cursor-pointer hover:bg-blue-100';
    // attach stub event
    cell.onclick = () => viewLessonsForDay(year, month, d);
    row.appendChild(cell);
    dayCount++;
    if (dayCount % 7 === 0) {
      tbody.appendChild(row);
      row = document.createElement('tr');
    }
  }
  // fill end pad
  while (row.children.length < 7) {
    row.appendChild(document.createElement('td'));
  }
  tbody.appendChild(row);
}

function showLessonForm() {
  document.getElementById('lesson-form-modal').classList.remove('hidden');
}

function hideLessonForm() {
  document.getElementById('lesson-form-modal').classList.add('hidden');
  document.getElementById('add-lesson-form').reset();
}

function addLesson(e) {
  e.preventDefault();
  // get fields
  const title = document.getElementById('lesson-title').value;
  const date = document.getElementById('lesson-date').value;
  const time = document.getElementById('lesson-time').value;
  const pupil = document.getElementById('lesson-pupil').value;

  // TODO: Save to Supabase or storage, then rerender
  alert(`Lesson scheduled for ${pupil} on ${date} at ${time}` + (title ? `: ${title}` : ''));
  hideLessonForm();
}

function viewLessonsForDay(year, month, day) {
  // TODO: List all lessons for the clicked day
  alert('Show lessons for ' + (month+1) + '/' + day + '/' + year);
}

