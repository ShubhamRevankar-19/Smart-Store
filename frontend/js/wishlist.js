/* Wishlist page */
async function loadWishlist() {
  if (!requireAuth()) return;
  const grid = document.getElementById('wishlistGrid');
  try {
    const { user } = await apiRequest('/users/profile');
    window.__wishlistIds = user.wishlist.map((p) => p._id);
    grid.innerHTML = user.wishlist.length
      ? user.wishlist.map(productCardHTML).join('')
      : `<div class="col-12 text-center py-5"><i class="bi bi-heart fs-1 text-muted d-block mb-3"></i><p class="text-muted">Your wishlist is empty</p><a href="shop.html" class="btn btn-brand">Browse Products</a></div>`;
    initLazyImages(grid);
  } catch (e) {
    grid.innerHTML = '<p class="text-muted">Could not load wishlist.</p>';
  }
}
document.addEventListener('DOMContentLoaded', loadWishlist);
