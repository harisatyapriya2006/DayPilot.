/* script.js (login page logic + Google callback) */

/* Helper: decode JWT id token payload (safe decode) */
function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (!parts[1]) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b64).split('').map(c=>{
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/* Called by Google Identity after sign-in */
function handleCredentialResponse(response) {
  const payload = decodeJwtPayload(response.credential);
  if (!payload) {
    alert('Google sign-in failed (no payload).');
    return;
  }
  const user = {
    email: payload.email || ('user_' + Math.random().toString(36).slice(2,8)),
    name: payload.name || (payload.email ? payload.email.split('@')[0] : 'GoogleUser'),
    method: 'google'
  };
  localStorage.setItem('daypilot_user', JSON.stringify(user));
  // redirect
  window.location.href = 'tasks.html';
}

/* Render Google button if gsi loaded */
window.addEventListener('load', () => {
  // If client id not set, the button will not render correctly — that's okay until you paste your ID.
  try {
    google.accounts.id.renderButton(
      document.getElementById('g_button'),
      { theme: 'outline', size: 'large' }
    );
  } catch(e) { /* ignore if not loaded */ }

  // If already logged in, redirect to tasks
  const cur = localStorage.getItem('daypilot_user');
  if (cur && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
    window.location.href = 'tasks.html';
  }
});

/* Simple email/password login - demo only */
document.addEventListener('DOMContentLoaded', () => {
  const btnLogin = document.getElementById('btnLogin');
  btnLogin?.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const pw = document.getElementById('password').value.trim();
    if (!email || !pw) { alert('Enter email and password'); return; }
    const user = { email, name: email.split('@')[0], method: 'local' };
    localStorage.setItem('daypilot_user', JSON.stringify(user));
    window.location.href = 'tasks.html';
  });
});
