/* Home page: hero, featured products, recommendations */
async function loadHome() {
  if (Store.isLoggedIn()) {
    try {
      const { user } = await apiRequest('/users/profile');
      window.__wishlistIds = (user.wishlist || []).map((p) => p._id);
    } catch (e) { /* silent */ }
  }

  await Promise.all([loadFeatured(), loadRecommendations(), loadNewArrivals()]);
  initLazyImages();
}

async function loadFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  try {
    const { products } = await apiRequest('/products?sort=popular&limit=8', { auth: false });
    grid.innerHTML = products.map(productCardHTML).join('') || emptyState('No featured products yet.');
    initLazyImages(grid);
  } catch (e) {
    grid.innerHTML = emptyState('Could not load products. Is the backend running?');
  }
}

async function loadNewArrivals() {
  const grid = document.getElementById('newArrivalsGrid');
  if (!grid) return;
  try {
    const { products } = await apiRequest('/products?sort=newest&limit=8', { auth: false });
    grid.innerHTML = products.map(productCardHTML).join('') || emptyState('No products yet.');
    initLazyImages(grid);
  } catch (e) {
    grid.innerHTML = '';
  }
}

async function loadRecommendations() {
  const section = document.getElementById('recommendedSection');
  const grid = document.getElementById('recommendedGrid');
  if (!grid || !section) return;

  if (!Store.isLoggedIn()) { section.style.display = 'none'; return; }

  try {
    const { recommendations } = await apiRequest('/users/recommendations');
    if (!recommendations.length) { section.style.display = 'none'; return; }
    grid.innerHTML = recommendations.map(productCardHTML).join('');
    initLazyImages(grid);
  } catch (e) {
    section.style.display = 'none';
  }
}

function emptyState(msg) {
  return `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-inbox fs-1 d-block mb-2"></i>${msg}</div>`;
}

document.addEventListener('DOMContentLoaded', loadHome);
