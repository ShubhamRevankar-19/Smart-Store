/* Product detail page */
let currentProduct = null;

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

async function loadProductDetail() {
  const id = getProductIdFromUrl();
  const wrap = document.getElementById('productDetailWrap');
  if (!id) { wrap.innerHTML = '<p class="text-muted">Product not found.</p>'; return; }

  try {
    const { product, similarProducts } = await apiRequest(`/products/${id}`, { auth: Store.isLoggedIn() });
    currentProduct = product;
    renderProductDetail(product);
    renderSimilar(similarProducts);
    loadReviews(product._id);
    document.title = `${product.name} — Smart Store`;
  } catch (e) {
    wrap.innerHTML = `<p class="text-muted">Could not load product: ${e.message}</p>`;
  }
}

function renderProductDetail(p) {
  const price = p.discountPrice > 0 ? p.discountPrice : p.price;
  const hasDiscount = p.discountPrice > 0 && p.discountPrice < p.price;
  const images = p.images && p.images.length ? p.images : ['https://placehold.co/600x600'];
  const inWishlist = (window.__wishlistIds || []).includes(p._id);

  document.getElementById('productDetailWrap').innerHTML = `
    <div class="col-12 col-md-6">
      <div class="card-surface p-3 animate-in">
        <div class="img-wrap rounded-xl overflow-hidden mb-3" style="aspect-ratio:1/1">
          <img id="mainImage" src="${images[0]}" class="w-100 h-100" style="object-fit:cover" alt="${p.name}" />
        </div>
        <div class="d-flex gap-2 flex-wrap">
          ${images.map((img, i) => `<img src="${img}" onclick="document.getElementById('mainImage').src='${img}'" class="rounded-xl" style="width:64px;height:64px;object-fit:cover;cursor:pointer;border:2px solid var(--border)" />`).join('')}
        </div>
      </div>
    </div>
    <div class="col-12 col-md-6">
      <div class="animate-in" style="animation-delay:0.1s">
        <div class="text-muted small mb-1">${p.brand} · <a href="shop.html?category=${encodeURIComponent(p.category)}" class="text-brand">${p.category}</a></div>
        <h2 class="mb-2">${p.name}</h2>
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="rating-stars">${starRating(p.rating)}</span>
          <span class="text-muted small">${p.rating || 0} (${p.numReviews || 0} reviews) · ${p.sold || 0} sold</span>
        </div>
        <div class="d-flex align-items-end gap-3 mb-3">
          <span class="fs-2 fw-bold">${formatPrice(price)}</span>
          ${hasDiscount ? `<span class="price-strike fs-5">${formatPrice(p.price)}</span><span class="badge bg-danger">-${Math.round(100 - (p.discountPrice / p.price) * 100)}%</span>` : ''}
        </div>
        <p class="text-muted">${p.description}</p>
        <div class="mb-3">
          ${p.stock > 0 ? `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i>In Stock (${p.stock} available)</span>` : `<span class="badge bg-danger-subtle text-danger border border-danger-subtle">Out of Stock</span>`}
        </div>
        <div class="d-flex align-items-center gap-3 mb-4">
          <div class="qty-control">
            <button onclick="changeQty(-1)">-</button>
            <input type="number" id="qtyInput" value="1" min="1" max="${p.stock}" />
            <button onclick="changeQty(1)">+</button>
          </div>
          <button class="btn btn-brand flex-grow-1" onclick="addCurrentToCart()" ${p.stock === 0 ? 'disabled' : ''}>
            <i class="bi bi-cart-plus me-2"></i>Add to Cart
          </button>
          <button class="nav-icon-btn ${inWishlist ? 'active text-danger' : ''}" onclick="toggleCurrentWishlist(this)">
            <i class="bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}"></i>
          </button>
        </div>
        <button class="btn btn-accent w-100" onclick="buyNow()" ${p.stock === 0 ? 'disabled' : ''}>
          <i class="bi bi-lightning-charge-fill me-2"></i>Buy Now
        </button>

        ${p.specs && Object.keys(p.specs).length ? `
        <div class="mt-4">
          <h6 class="section-title">Specifications</h6>
          <table class="table table-sm mt-2">
            <tbody>
              ${Object.entries(p.specs).map(([k, v]) => `<tr><td class="text-muted">${k}</td><td>${v}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}
      </div>
    </div>`;
}

function changeQty(delta) {
  const input = document.getElementById('qtyInput');
  let val = parseInt(input.value || '1') + delta;
  val = Math.max(1, Math.min(val, currentProduct.stock));
  input.value = val;
}

async function addCurrentToCart(silent) {
  if (!requireAuth()) return;
  const qty = parseInt(document.getElementById('qtyInput').value || '1');
  try {
    await apiRequest('/users/cart', { method: 'POST', body: { productId: currentProduct._id, quantity: qty } });
    if (!silent) showToast('Added to cart', 'success');
    updateCartBadge();
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

async function buyNow() {
  if (!requireAuth()) return;
  try {
    await addCurrentToCart(true);
    window.location.href = 'checkout.html';
  } catch (e) { /* handled */ }
}

async function toggleCurrentWishlist(btn) {
  if (!requireAuth()) return;
  try {
    const data = await apiRequest('/users/wishlist', { method: 'POST', body: { productId: currentProduct._id } });
    window.__wishlistIds = data.wishlist.map((p) => p._id);
    const active = window.__wishlistIds.includes(currentProduct._id);
    btn.classList.toggle('active', active);
    btn.classList.toggle('text-danger', active);
    btn.querySelector('i').className = active ? 'bi bi-heart-fill' : 'bi bi-heart';
    showToast(active ? 'Added to wishlist' : 'Removed from wishlist', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderSimilar(products) {
  const grid = document.getElementById('similarGrid');
  if (!grid) return;
  if (!products.length) { document.getElementById('similarSection').style.display = 'none'; return; }
  grid.innerHTML = products.map(productCardHTML).join('');
  initLazyImages(grid);
}

/* ---------- Reviews ---------- */
async function loadReviews(productId) {
  const list = document.getElementById('reviewsList');
  try {
    const { reviews } = await apiRequest(`/reviews/${productId}`, { auth: false });
    document.getElementById('reviewCount').textContent = reviews.length;
    list.innerHTML = reviews.length
      ? reviews.map((r) => `
        <div class="card-surface p-3 mb-3 animate-in">
          <div class="d-flex justify-content-between">
            <strong>${r.name}</strong>
            <span class="text-muted small">${timeAgo(r.createdAt)}</span>
          </div>
          <div class="rating-stars small my-1">${starRating(r.rating)}</div>
          <p class="mb-0 text-muted">${r.comment}</p>
        </div>`).join('')
      : '<p class="text-muted">No reviews yet. Be the first to review this product!</p>';
  } catch (e) {
    list.innerHTML = '<p class="text-muted">Could not load reviews.</p>';
  }
}

let selectedRating = 5;
function setReviewRating(n) {
  selectedRating = n;
  document.querySelectorAll('#ratingPicker i').forEach((el, idx) => {
    el.className = idx < n ? 'bi bi-star-fill' : 'bi bi-star';
  });
}

async function submitReview(e) {
  e.preventDefault();
  if (!requireAuth()) return;
  const comment = document.getElementById('reviewComment').value.trim();
  if (!comment) return showToast('Please write a comment', 'error');

  try {
    await apiRequest(`/reviews/${currentProduct._id}`, { method: 'POST', body: { rating: selectedRating, comment } });
    showToast('Review submitted. Thank you!', 'success');
    document.getElementById('reviewComment').value = '';
    loadReviews(currentProduct._id);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (Store.isLoggedIn()) {
    apiRequest('/users/profile').then(({ user }) => {
      window.__wishlistIds = (user.wishlist || []).map((p) => p._id);
      loadProductDetail();
    }).catch(() => loadProductDetail());
  } else {
    loadProductDetail();
  }
});
