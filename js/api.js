/* =========================================================
   Smart Store — API helper + shared utilities
========================================================= */
const API_BASE = '/api';

const Store = {
  getToken: () => localStorage.getItem('ss_token'),
  setToken: (t) => localStorage.setItem('ss_token', t),
  clearToken: () => localStorage.removeItem('ss_token'),
  getUser: () => JSON.parse(localStorage.getItem('ss_user') || 'null'),
  setUser: (u) => localStorage.setItem('ss_user', JSON.stringify(u)),
  clearUser: () => localStorage.removeItem('ss_user'),
  isLoggedIn: () => !!localStorage.getItem('ss_token'),
  isAdmin: () => {
    const u = Store.getUser();
    return u && u.role === 'admin';
  }
};

async function apiRequest(path, { method = 'GET', body, auth = true, isBlob = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Store.getToken()) headers.Authorization = `Bearer ${Store.getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (isBlob) {
    if (!res.ok) throw new Error('Failed to download file');
    return res.blob();
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    if (res.status === 401) {
      // token expired/invalid — silent logout on protected calls
      if (auth) { Store.clearToken(); Store.clearUser(); }
    }
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

/* ---------- Toast notifications ---------- */
function showToast(message, type = 'info') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  const icon = type === 'success' ? 'bi-check-circle-fill text-success' : type === 'error' ? 'bi-x-circle-fill text-danger' : 'bi-info-circle-fill text-brand';
  el.innerHTML = `<i class="bi ${icon} me-2"></i>${message}`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeSlideDown 0.3s ease reverse';
    setTimeout(() => el.remove(), 280);
  }, 3000);
}

/* ---------- Formatting ---------- */
function formatPrice(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function starRating(rating = 0) {
  const full = Math.round(rating);
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi ${i <= full ? 'bi-star-fill' : 'bi-star'}"></i>`;
  }
  return html;
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, secs] of units) {
    const val = Math.floor(diff / secs);
    if (val >= 1) return `${val} ${name}${val > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/* ---------- Lazy loading images ---------- */
function initLazyImages(root = document) {
  const imgs = root.querySelectorAll('img.lazy-img[data-src]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.onload = () => img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  imgs.forEach((img) => observer.observe(img));
}

/* ---------- Product card renderer (shared across pages) ---------- */
function productCardHTML(p) {
  const price = p.discountPrice > 0 ? p.discountPrice : p.price;
  const hasDiscount = p.discountPrice > 0 && p.discountPrice < p.price;
  const discountPct = hasDiscount ? Math.round(100 - (p.discountPrice / p.price) * 100) : 0;
  const wishlist = Store.getUser() && (window.__wishlistIds || []).includes(p._id);
  const img = (p.images && p.images[0]) || 'https://placehold.co/600x600?text=Product';

  return `
  <div class="col-6 col-md-4 col-lg-3">
    <div class="product-card animate-in">
      <a href="product.html?id=${p.slug || p._id}" class="text-decoration-none">
        <div class="img-wrap">
          <img class="lazy-img" data-src="${img}" alt="${p.name}" loading="lazy" />
          ${hasDiscount ? `<span class="discount-badge">-${discountPct}%</span>` : ''}
        </div>
      </a>
      <button class="wishlist-btn ${wishlist ? 'active' : ''}" onclick="handleWishlistClick(event, '${p._id}')" title="Add to wishlist">
        <i class="bi ${wishlist ? 'bi-heart-fill' : 'bi-heart'}"></i>
      </button>
      <div class="p-3 d-flex flex-column flex-grow-1">
        <div class="text-muted small mb-1 text-truncate">${p.brand || ''}</div>
        <a href="product.html?id=${p.slug || p._id}" class="text-decoration-none text-reset">
          <h6 class="mb-1 text-truncate" style="color:var(--text)">${p.name}</h6>
        </a>
        <div class="rating-stars small mb-2">${starRating(p.rating)} <span class="text-muted">(${p.numReviews || 0})</span></div>
        <div class="mt-auto d-flex align-items-center justify-content-between">
          <div>
            <span class="price-tag">${formatPrice(price)}</span>
            ${hasDiscount ? `<div class="price-strike">${formatPrice(p.price)}</div>` : ''}
          </div>
          <button class="btn btn-brand btn-sm rounded-circle" style="width:38px;height:38px;padding:0" onclick="handleQuickAddToCart(event, '${p._id}')" title="Add to cart">
            <i class="bi bi-cart-plus"></i>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

async function handleQuickAddToCart(e, productId) {
  e.preventDefault();
  e.stopPropagation();
  if (!Store.isLoggedIn()) {
    showToast('Please login to add items to cart', 'error');
    window.location.href = 'login.html';
    return;
  }
  try {
    await apiRequest('/users/cart', { method: 'POST', body: { productId, quantity: 1 } });
    showToast('Added to cart', 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleWishlistClick(e, productId) {
  e.preventDefault();
  e.stopPropagation();
  if (!Store.isLoggedIn()) {
    showToast('Please login to use wishlist', 'error');
    window.location.href = 'login.html';
    return;
  }
  try {
    const data = await apiRequest('/users/wishlist', { method: 'POST', body: { productId } });
    window.__wishlistIds = data.wishlist.map((p) => p._id);
    e.currentTarget.classList.toggle('active');
    const icon = e.currentTarget.querySelector('i');
    icon.className = e.currentTarget.classList.contains('active') ? 'bi bi-heart-fill' : 'bi bi-heart';
    showToast(e.currentTarget.classList.contains('active') ? 'Added to wishlist' : 'Removed from wishlist', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (!Store.isLoggedIn()) { badge.style.display = 'none'; return; }
  try {
    const { cart } = await apiRequest('/users/cart');
    const count = cart.filter((c) => !c.savedForLater).reduce((a, c) => a + c.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  } catch (e) { /* silent */ }
}

async function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (!Store.isLoggedIn()) { badge.style.display = 'none'; return; }
  try {
    const { notifications } = await apiRequest('/users/notifications');
    const unread = notifications.filter((n) => !n.isRead).length;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  } catch (e) { /* silent */ }
}
