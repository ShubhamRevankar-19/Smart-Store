/* Cart page: list, save-for-later, quantity updates, totals */
async function loadCart() {
  if (!requireAuth()) return;
  const container = document.getElementById('cartItems');
  const savedContainer = document.getElementById('savedItems');

  try {
    const { cart } = await apiRequest('/users/cart');
    const activeItems = cart.filter((c) => !c.savedForLater && c.product);
    const savedItems = cart.filter((c) => c.savedForLater && c.product);

    if (!activeItems.length) {
      container.innerHTML = `<div class="text-center py-5"><i class="bi bi-cart-x fs-1 text-muted d-block mb-3"></i><p class="text-muted">Your cart is empty</p><a href="shop.html" class="btn btn-brand">Start Shopping</a></div>`;
    } else {
      container.innerHTML = activeItems.map(cartItemHTML).join('');
    }

    document.getElementById('savedSection').style.display = savedItems.length ? 'block' : 'none';
    savedContainer.innerHTML = savedItems.map(cartItemHTML).join('');

    renderSummary(activeItems);
  } catch (e) {
    container.innerHTML = '<p class="text-muted">Could not load cart.</p>';
  }
}

function cartItemHTML(item) {
  const p = item.product;
  const price = p.discountPrice > 0 ? p.discountPrice : p.price;
  const img = (p.images && p.images[0]) || 'https://placehold.co/120';
  return `
  <div class="cart-item d-flex gap-3 align-items-center animate-in">
    <img src="${img}" style="width:88px;height:88px;object-fit:cover;border-radius:12px" alt="${p.name}" />
    <div class="flex-grow-1">
      <a href="product.html?id=${p.slug || p._id}" class="text-reset text-decoration-none fw-semibold">${p.name}</a>
      <div class="text-muted small">${p.brand}</div>
      <div class="fw-bold mt-1">${formatPrice(price)}</div>
    </div>
    ${!item.savedForLater ? `
    <div class="qty-control">
      <button onclick="updateQty('${p._id}', ${item.quantity - 1})">-</button>
      <input type="number" value="${item.quantity}" min="1" onchange="updateQty('${p._id}', this.value)" />
      <button onclick="updateQty('${p._id}', ${item.quantity + 1})">+</button>
    </div>` : ''}
    <div class="d-flex flex-column gap-2 align-items-end">
      <button class="btn btn-sm btn-outline-brand" onclick="toggleSaveForLater('${p._id}', ${!item.savedForLater})">
        ${item.savedForLater ? 'Move to cart' : 'Save for later'}
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="removeItem('${p._id}')"><i class="bi bi-trash"></i></button>
    </div>
  </div>`;
}

async function updateQty(productId, quantity) {
  quantity = Math.max(1, parseInt(quantity));
  try {
    await apiRequest(`/users/cart/${productId}`, { method: 'PUT', body: { quantity } });
    loadCart();
    updateCartBadge();
  } catch (e) { showToast(e.message, 'error'); }
}

async function toggleSaveForLater(productId, savedForLater) {
  try {
    await apiRequest(`/users/cart/${productId}`, { method: 'PUT', body: { savedForLater } });
    loadCart();
    updateCartBadge();
  } catch (e) { showToast(e.message, 'error'); }
}

async function removeItem(productId) {
  try {
    await apiRequest(`/users/cart/${productId}`, { method: 'DELETE' });
    showToast('Item removed', 'success');
    loadCart();
    updateCartBadge();
  } catch (e) { showToast(e.message, 'error'); }
}

function renderSummary(activeItems) {
  const summary = document.getElementById('cartSummary');
  const itemsPrice = activeItems.reduce((sum, i) => sum + (i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price) * i.quantity, 0);
  const shipping = itemsPrice > 999 || itemsPrice === 0 ? 0 : 49;
  const tax = Math.round(itemsPrice * 0.05);
  const total = itemsPrice + shipping + tax;

  summary.innerHTML = `
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Subtotal (${activeItems.length} items)</span><span>${formatPrice(itemsPrice)}</span></div>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Shipping</span><span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
    <div class="d-flex justify-content-between mb-3"><span class="text-muted">Tax (5%)</span><span>${formatPrice(tax)}</span></div>
    <hr/>
    <div class="d-flex justify-content-between mb-3 fs-5 fw-bold"><span>Total</span><span>${formatPrice(total)}</span></div>
    <button class="btn btn-brand w-100" ${activeItems.length === 0 ? 'disabled' : ''} onclick="window.location.href='checkout.html'">
      Proceed to Checkout <i class="bi bi-arrow-right ms-1"></i>
    </button>`;
}

document.addEventListener('DOMContentLoaded', loadCart);
