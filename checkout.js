/* Checkout page */
let checkoutItems = [];

async function loadCheckout() {
  if (!requireAuth()) return;
  try {
    const { cart } = await apiRequest('/users/cart');
    checkoutItems = cart.filter((c) => !c.savedForLater && c.product);

    if (!checkoutItems.length) {
      document.getElementById('checkoutContent').innerHTML = `<div class="text-center py-5"><p class="text-muted">Your cart is empty.</p><a href="shop.html" class="btn btn-brand">Shop Now</a></div>`;
      return;
    }

    renderOrderSummary();

    const { user } = await apiRequest('/users/profile');
    if (user.addresses && user.addresses.length) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      Object.entries({
        fullName: def.fullName || user.name,
        phone: def.phone,
        line1: def.line1,
        line2: def.line2,
        city: def.city,
        state: def.state,
        postalCode: def.postalCode,
        country: def.country
      }).forEach(([key, val]) => {
        const el = document.querySelector(`[name=${key}]`);
        if (el && val) el.value = val;
      });
    } else {
      document.querySelector('[name=fullName]').value = user.name;
    }
  } catch (e) {
    showToast('Failed to load checkout', 'error');
  }
}

function renderOrderSummary() {
  const itemsPrice = checkoutItems.reduce((sum, i) => sum + (i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price) * i.quantity, 0);
  const shipping = itemsPrice > 999 ? 0 : 49;
  const tax = Math.round(itemsPrice * 0.05);
  const total = itemsPrice + shipping + tax;

  document.getElementById('orderSummary').innerHTML = `
    ${checkoutItems.map((i) => `
      <div class="d-flex justify-content-between small mb-2">
        <span class="text-muted">${i.product.name} x${i.quantity}</span>
        <span>${formatPrice((i.product.discountPrice > 0 ? i.product.discountPrice : i.product.price) * i.quantity)}</span>
      </div>`).join('')}
    <hr/>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Subtotal</span><span>${formatPrice(itemsPrice)}</span></div>
    <div class="d-flex justify-content-between mb-2"><span class="text-muted">Shipping</span><span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
    <div class="d-flex justify-content-between mb-3"><span class="text-muted">Tax</span><span>${formatPrice(tax)}</span></div>
    <hr/>
    <div class="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span>${formatPrice(total)}</span></div>`;
}

async function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type=submit]');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Placing order...';

  const shippingAddress = {
    fullName: form.fullName.value,
    phone: form.phone.value,
    line1: form.line1.value,
    line2: form.line2.value,
    city: form.city.value,
    state: form.state.value,
    postalCode: form.postalCode.value,
    country: form.country.value
  };
  const paymentMethod = form.paymentMethod.value;

  try {
    const items = checkoutItems.map((i) => ({ product: i.product._id, quantity: i.quantity }));
    const { order } = await apiRequest('/orders', { method: 'POST', body: { items, shippingAddress, paymentMethod } });
    showToast('Order placed successfully! 🎉', 'success');
    updateCartBadge();
    setTimeout(() => (window.location.href = `order-success.html?id=${order._id}`), 700);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

document.addEventListener('DOMContentLoaded', loadCheckout);
