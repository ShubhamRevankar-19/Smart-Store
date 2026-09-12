/* Signup / Login page logic */
async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

  try {
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirmPassword.value;

    if (password !== confirm) throw new Error('Passwords do not match');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    const data = await apiRequest('/auth/signup', { method: 'POST', auth: false, body: { name, email, password } });
    Store.setToken(data.token);
    Store.setUser(data.user);
    showToast('Account created! Welcome aboard 🎉', 'success');
    setTimeout(() => (window.location.href = 'index.html'), 700);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';

  try {
    const email = form.email.value.trim();
    const password = form.password.value;
    const data = await apiRequest('/auth/login', { method: 'POST', auth: false, body: { email, password } });
    Store.setToken(data.token);
    Store.setUser(data.user);
    showToast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success');
    setTimeout(() => (window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html'), 700);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function redirectIfLoggedIn() {
  if (Store.isLoggedIn()) window.location.href = 'index.html';
}

function requireAuth() {
  if (!Store.isLoggedIn()) {
    showToast('Please login to continue', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 600);
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!Store.isLoggedIn() || !Store.isAdmin()) {
    showToast('Admin access required', 'error');
    setTimeout(() => (window.location.href = 'index.html'), 600);
    return false;
  }
  return true;
}
