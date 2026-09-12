/* Shop / product listing page: filters, sorting, pagination */
let currentPage = 1;

async function loadShop(page = 1) {
  currentPage = page;
  const grid = document.getElementById('productsGrid');
  const params = new URLSearchParams(window.location.search);

  grid.innerHTML = Array(8).fill('<div class="col-6 col-md-4 col-lg-3"><div class="skeleton" style="height:320px"></div></div>').join('');

  const query = new URLSearchParams();
  if (params.get('keyword')) query.set('keyword', params.get('keyword'));
  if (params.get('category')) query.set('category', params.get('category'));

  const sortSelect = document.getElementById('sortSelect');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  const ratingFilter = document.querySelector('input[name="ratingFilter"]:checked');

  if (sortSelect && sortSelect.value) query.set('sort', sortSelect.value);
  if (minPrice && minPrice.value) query.set('minPrice', minPrice.value);
  if (maxPrice && maxPrice.value) query.set('maxPrice', maxPrice.value);
  if (ratingFilter && ratingFilter.value !== '0') query.set('rating', ratingFilter.value);
  query.set('page', page);
  query.set('limit', 12);

  try {
    const data = await apiRequest(`/products?${query.toString()}`, { auth: false });
    document.getElementById('resultsCount').textContent = `${data.total} result${data.total !== 1 ? 's' : ''}`;

    if (params.get('keyword')) {
      document.getElementById('searchContext').textContent = `Showing results for "${params.get('keyword')}"`;
      document.getElementById('searchContext').style.display = 'block';
    }

    grid.innerHTML = data.products.map(productCardHTML).join('') || emptyState('No products match your filters.');
    initLazyImages(grid);
    renderPagination(data.page, data.pages);
  } catch (e) {
    grid.innerHTML = emptyState('Failed to load products.');
  }
}

function renderPagination(page, pages) {
  const el = document.getElementById('pagination');
  if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" onclick="loadShop(${i});return false;">${i}</a></li>`;
  }
  el.innerHTML = html;
}

function applyFilters() {
  loadShop(1);
}

function emptyState(msg) {
  return `<div class="col-12 text-center py-5 text-muted"><i class="bi bi-inbox fs-1 d-block mb-2"></i>${msg}</div>`;
}

document.addEventListener('DOMContentLoaded', () => loadShop(1));
