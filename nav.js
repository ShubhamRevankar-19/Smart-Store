/* Shared navbar behavior: injects auth-aware links, search suggestions, cart/notif badges */
async function initNavbar() {
  const authArea = document.getElementById('authArea');
  const user = Store.getUser();

  if (authArea) {
    if (user) {
      authArea.innerHTML = `
        <div class="dropdown">
          <button class="nav-icon-btn dropdown-toggle" style="border-radius:20px;width:auto;padding:0 12px" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle me-1"></i> ${user.name.split(' ')[0]}
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3 mt-2">
            <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person me-2"></i>My Profile</a></li>
            <li><a class="dropdown-item" href="profile.html#orders"><i class="bi bi-box-seam me-2"></i>My Orders</a></li>
            <li><a class="dropdown-item" href="wishlist.html"><i class="bi bi-heart me-2"></i>Wishlist</a></li>
            ${user.role === 'admin' ? '<li><a class="dropdown-item" href="admin.html"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</a></li>' : ''}
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="logout(event)"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
          </ul>
        </div>`;
    } else {
      authArea.innerHTML = `
        <a href="login.html" class="btn btn-outline-brand btn-sm me-2">Login</a>
        <a href="signup.html" class="btn btn-brand btn-sm">Sign Up</a>`;
    }
  }

  updateCartBadge();
  updateNotifBadge();
  initSearchBox();
  await loadCategoryPills();
}

function logout(e) {
  if (e) e.preventDefault();
  Store.clearToken();
  Store.clearUser();
  showToast('Logged out successfully', 'success');
  setTimeout(() => (window.location.href = 'index.html'), 500);
}

function initSearchBox() {
  const input = document.getElementById('searchInput');
  const box = document.getElementById('searchSuggestions');
  if (!input || !box) return;

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { box.classList.remove('show'); return; }
    debounce = setTimeout(async () => {
      try {
        const { suggestions } = await apiRequest(`/products/suggestions?q=${encodeURIComponent(q)}`, { auth: false });
        renderSuggestions(suggestions, box);
      } catch (e) { /* silent */ }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      window.location.href = `shop.html?keyword=${encodeURIComponent(input.value.trim())}`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== input) box.classList.remove('show');
  });
}

function renderSuggestions(suggestions, box) {
  if (!suggestions.length) { box.classList.remove('show'); return; }
  box.innerHTML = suggestions
    .map(
      (p) => `
      <a href="product.html?id=${p.slug || p._id}" class="suggestion-item text-decoration-none text-reset">
        <img src="${(p.images && p.images[0]) || 'https://placehold.co/80'}" alt="${p.name}" />
        <div>
          <div class="fw-semibold small">${p.name}</div>
          <div class="text-muted" style="font-size:0.78rem">${p.category} · ${formatPrice(p.discountPrice > 0 ? p.discountPrice : p.price)}</div>
        </div>
      </a>`
    )
    .join('');
  box.classList.add('show');
}

async function loadCategoryPills() {
  const wrap = document.getElementById('categoryPills');
  if (!wrap) return;
  try {
    const { categories } = await apiRequest('/products/meta/categories', { auth: false });
    const params = new URLSearchParams(window.location.search);
    const active = params.get('category');
    wrap.innerHTML =
      `<a href="shop.html" class="category-pill ${!active ? 'active' : ''}">All</a>` +
      categories
        .map((c) => `<a href="shop.html?category=${encodeURIComponent(c)}" class="category-pill ${active === c ? 'active' : ''}">${c}</a>`)
        .join('');
  } catch (e) { /* silent */ }
}

document.addEventListener('DOMContentLoaded', initNavbar);
