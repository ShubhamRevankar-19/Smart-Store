/* Profile page: user info, addresses, order history + tracking */
async function loadProfile() {
  if (!requireAuth()) return;
  try {
    const { user } = await apiRequest('/users/profile');
    document.getElementById('profileName').value = user.name;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profileAvatar').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6d28d9&color=fff`;
    document.getElementById('welcomeName').textContent = user.name.split(' ')[0];

    renderAddresses(user.addresses || []);
    loadOrders();
    loadNotifications();
  } catch (e) {
    showToast('Failed to load profile', 'error');
  }
}

async function updateProfileForm(e) {
  e.preventDefault();
  const name = document.getElementById('profileName').value.trim();
  const password = document.getElementById('profilePassword').value;
  try {
    const body = { name };
    if (password) body.password = password;
    const { user } = await apiRequest('/users/profile', { method: 'PUT', body });
    const stored = Store.getUser();
    Store.setUser({ ...stored, name: user.name });
    showToast('Profile updated', 'success');
    document.getElementById('profilePassword').value = '';
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderAddresses(addresses) {
  const wrap = document.getElementById('addressList');
  wrap.innerHTML = addresses.length
    ? addresses.map((a) => `
      <div class="card-surface p-3 mb-2">
        <div class="d-flex justify-content-between">
          <strong>${a.label} ${a.isDefault ? '<span class="badge bg-brand text-white" style="background:var(--brand)">Default</span>' : ''}</strong>
        </div>
        <div class="text-muted small">${a.fullName}, ${a.line1} ${a.line2 || ''}, ${a.city}, ${a.state} ${a.postalCode}, ${a.country}</div>
        <div class="text-muted small">${a.phone}</div>
      </div>`).join('')
    : '<p class="text-muted small">No saved addresses yet.</p>';
}

async function addAddressForm(e) {
  e.preventDefault();
  const form = e.target;
  const body = {
    label: form.label.value || 'Home',
    fullName: form.fullName.value,
    phone: form.phone.value,
    line1: form.line1.value,
    line2: form.line2.value,
    city: form.city.value,
    state: form.state.value,
    postalCode: form.postalCode.value,
    country: form.country.value || 'India',
    isDefault: form.isDefault.checked
  };
  try {
    const { addresses } = await apiRequest('/users/addresses', { method: 'POST', body });
    renderAddresses(addresses);
    showToast('Address added', 'success');
    bootstrap.Modal.getInstance(document.getElementById('addAddressModal')).hide();
    form.reset();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

const STATUS_STEPS = ['Placed', 'Processing', 'Shipped', 'Delivered'];

async function loadOrders() {
  const wrap = document.getElementById('ordersList');
  try {
    const { orders } = await apiRequest('/orders/myorders');
    wrap.innerHTML = orders.length
      ? orders.map(orderCardHTML).join('')
      : `<div class="text-center py-5"><i class="bi bi-box-seam fs-1 text-muted d-block mb-3"></i><p class="text-muted">No orders yet</p><a href="shop.html" class="btn btn-brand">Start Shopping</a></div>`;
  } catch (e) {
    wrap.innerHTML = '<p class="text-muted">Could not load orders.</p>';
  }
}

function orderCardHTML(order) {
  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';

  return `
  <div class="card-surface p-3 mb-3 animate-in">
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
      <div>
        <strong>Order #${order._id.slice(-8).toUpperCase()}</strong>
        <div class="text-muted small">${new Date(order.createdAt).toLocaleDateString()} · ${order.items.length} item(s)</div>
      </div>
      <div class="text-end">
        <div class="fw-bold">${formatPrice(order.totalPrice)}</div>
        <span class="badge ${isCancelled ? 'bg-danger' : 'bg-success'}">${order.status}</span>
      </div>
    </div>

    ${!isCancelled ? `
    <div class="status-track">
      ${STATUS_STEPS.map((s, i) => `
        <div class="status-step ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}">
          <div class="status-dot"><i class="bi ${i <= stepIndex ? 'bi-check-lg' : 'bi-circle'}"></i></div>
          <div class="small text-muted">${s}</div>
        </div>`).join('')}
    </div>` : ''}

    <div class="d-flex gap-2 flex-wrap mb-2">
      ${order.items.slice(0, 4).map((i) => `<img src="${i.image}" style="width:48px;height:48px;object-fit:cover;border-radius:8px" title="${i.name}" />`).join('')}
    </div>
    <button class="btn btn-sm btn-outline-brand" onclick="downloadInvoice('${order._id}')"><i class="bi bi-file-earmark-pdf me-1"></i>Invoice</button>
  </div>`;
}

async function loadNotifications() {
  const wrap = document.getElementById('notificationsList');
  if (!wrap) return;
  try {
    const { notifications } = await apiRequest('/users/notifications');
    wrap.innerHTML = notifications.length
      ? notifications.map((n) => `
        <div class="card-surface p-3 mb-2 ${!n.isRead ? 'border-start border-3' : ''}" style="${!n.isRead ? 'border-color:var(--brand) !important' : ''}">
          <div class="d-flex justify-content-between">
            <strong class="small">${n.title}</strong>
            <span class="text-muted" style="font-size:0.75rem">${timeAgo(n.createdAt)}</span>
          </div>
          <div class="text-muted small">${n.message}</div>
        </div>`).join('')
      : '<p class="text-muted small">No notifications.</p>';
    await apiRequest('/users/notifications/read', { method: 'PUT' });
    updateNotifBadge();
  } catch (e) { /* silent */ }
}

document.addEventListener('DOMContentLoaded', loadProfile);
