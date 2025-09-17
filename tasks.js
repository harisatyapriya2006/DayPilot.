/* tasks.js (tasks page logic: daily / weekly / important + streak + delete + reset next day) */

(function(){
  // helpers for dates
  function fmt(d){ return d.toISOString().slice(0,10); }
  function today(){ return fmt(new Date()); }
  function yesterday(){ const d=new Date(); d.setDate(d.getDate()-1); return fmt(d); }

  const curRaw = localStorage.getItem('daypilot_user');
  if (!curRaw) { location.href = 'index.html'; return; }
  const user = JSON.parse(curRaw);
  const keyBase = user.email.replace(/[@.]/g,'_'); // safe storage key base

  // storage keys
  const kDaily = keyBase + '_daily';
  const kWeekly = keyBase + '_weekly';
  const kImportant = keyBase + '_important';
  const kStreak = keyBase + '_streak';
  const kLastDone = keyBase + '_lastDone';
  const kLastLogin = keyBase + '_lastLogin';   // NEW: track last login date

  // load arrays
  let daily = JSON.parse(localStorage.getItem(kDaily) || '[]');
  let weekly = JSON.parse(localStorage.getItem(kWeekly) || '[]');
  let important = JSON.parse(localStorage.getItem(kImportant) || '[]');
  let streak = parseInt(localStorage.getItem(kStreak) || '0');
  let lastDone = localStorage.getItem(kLastDone) || null;
  let lastLogin = localStorage.getItem(kLastLogin) || null;

  // DOM refs
  const elDailyList = document.getElementById('daily-list');
  const elWeeklyList = document.getElementById('weekly-list');
  const elImportantList = document.getElementById('important-list');

  const inDaily = document.getElementById('daily-input');
  const inWeekly = document.getElementById('weekly-input');
  const inImportant = document.getElementById('important-input');

  const btnAddDaily = document.getElementById('add-daily');
  const btnAddWeekly = document.getElementById('add-weekly');
  const btnAddImportant = document.getElementById('add-important');

  const elStreakNum = document.getElementById('streakNum');
  const btnLogout = document.getElementById('btnLogout');

  // persist
  function saveAll(){
    localStorage.setItem(kDaily, JSON.stringify(daily));
    localStorage.setItem(kWeekly, JSON.stringify(weekly));
    localStorage.setItem(kImportant, JSON.stringify(important));
    localStorage.setItem(kStreak, String(streak));
    if (lastDone) localStorage.setItem(kLastDone, lastDone);
    localStorage.setItem(kLastLogin, today()); // always update login date
  }

  // render helpers
  function makeTaskHTML(task, idx, type){
    /* returns an li element */
    const li = document.createElement('li');
    li.className = 'task-item';

    const left = document.createElement('div');
    left.className = 'task-left';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!task.completed;
    cb.dataset.index = idx;
    cb.dataset.type = type;

    const span = document.createElement('span');
    span.className = 'task-name';
    span.contentEditable = true;
    span.dataset.placeholder = 'Type task...';
    span.innerText = task.name;

    left.appendChild(cb);
    left.appendChild(span);

    const del = document.createElement('button');
    del.className = 'del-btn';
    del.innerText = '✖';
    del.dataset.index = idx;
    del.dataset.type = type;

    li.appendChild(left);
    li.appendChild(del);

    return li;
  }

  function render(){
    elDailyList.innerHTML = '';
    elWeeklyList.innerHTML = '';
    elImportantList.innerHTML = '';

    daily.forEach((t,i)=> elDailyList.appendChild(makeTaskHTML(t,i,'daily')));
    weekly.forEach((t,i)=> elWeeklyList.appendChild(makeTaskHTML(t,i,'weekly')));
    important.forEach((t,i)=> elImportantList.appendChild(makeTaskHTML(t,i,'important')));

    elStreakNum.innerText = streak;
  }

  // streak reset logic on load
  function normalizeStreakOnLoad(){
    const td = today();
    const yd = yesterday();
    if (lastDone === td) {
      // all good
    } else if (lastDone === yd) {
      // still valid (no change)
    } else {
      // missed a day (or never)
      streak = 0;
      lastDone = lastDone; // keep lastDone but streak set to 0
      localStorage.setItem(kStreak, String(streak));
    }
  }

  // daily reset logic (NEW)
  function resetDailyTasksIfNewDay(){
    const td = today();
    if (lastLogin !== td) {
      // new day → clear all completed checkboxes
      daily = daily.map(t => ({ name: t.name, completed: false }));
      saveAll();
    }
  }

  // check before adding streak on first completion today
  function handleDailyCompletionFirstTime(){
    const td = today();
    if (lastDone === td) return; // already counted today
    const yd = yesterday();
    if (lastDone === yd) streak = (streak || 0) + 1;
    else streak = 1;
    lastDone = td;
    saveAll();
    elStreakNum.innerText = streak;
  }

  // add event handlers
  btnAddDaily.addEventListener('click', ()=>{
    const v = inDaily.value.trim(); if (!v) return;
    daily.unshift({ name: v, completed: false });
    inDaily.value = '';
    saveAll(); render();
  });
  btnAddWeekly.addEventListener('click', ()=>{
    const v = inWeekly.value.trim(); if (!v) return;
    weekly.unshift({ name: v, completed: false });
    inWeekly.value = '';
    saveAll(); render();
  });
  btnAddImportant.addEventListener('click', ()=>{
    const v = inImportant.value.trim(); if (!v) return;
    important.unshift({ name: v, completed: false });
    inImportant.value = '';
    saveAll(); render();
  });

  // delegated events: checkbox toggle, delete, edit
  document.addEventListener('click', (ev)=>{
    const t = ev.target;
    if (t.classList.contains('del-btn')){
      const idx = Number(t.dataset.index); const type = t.dataset.type;
      if (type === 'daily') daily.splice(idx,1);
      else if (type === 'weekly') weekly.splice(idx,1);
      else if (type === 'important') important.splice(idx,1);
      saveAll(); render();
    }
  });

  document.addEventListener('change', (ev)=>{
    const t = ev.target;
    if (t.tagName === 'INPUT' && t.type === 'checkbox'){
      const idx = Number(t.dataset.index); const type = t.dataset.type;
      if (type === 'daily') {
        daily[idx].completed = t.checked;
        // only update streak when first completion for today occurs
        if (t.checked) handleDailyCompletionFirstTime();
      } else if (type === 'weekly') weekly[idx].completed = t.checked;
      else if (type === 'important') important[idx].completed = t.checked;
      saveAll(); render();
    }
  });

  // save edits
  document.addEventListener('input', (ev)=>{
    const t = ev.target;
    if (t.classList.contains('task-name')){
      const li = t.closest('.task-item');
      const cb = li.querySelector('input[type="checkbox"]');
      const idx = Number(cb.dataset.index); const type = cb.dataset.type;
      const txt = t.innerText.trim();
      if (type === 'daily') { daily[idx].name = txt; localStorage.setItem(kDaily, JSON.stringify(daily)); }
      else if (type === 'weekly') { weekly[idx].name = txt; localStorage.setItem(kWeekly, JSON.stringify(weekly)); }
      else if (type === 'important') { important[idx].name = txt; localStorage.setItem(kImportant, JSON.stringify(important)); }
    }
  });

  btnLogout?.addEventListener('click', ()=>{
    localStorage.removeItem('daypilot_user');
    location.href = 'index.html';
  });

  // init
  normalizeStreakOnLoad();
  resetDailyTasksIfNewDay(); // <-- NEW: clear daily completions each new day
  render();
  saveAll();

})();
