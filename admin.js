/* Admin dashboard: analytics, product CRUD, order management, user management */
function showAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((el) => (el.style.display = 'none'));
  document.getElementById(`tab-${tab}`).style.display = 'block';
  document.querySelectorAll('.sidebar-link').forEach((el) => el.classList.remove('active'));
  document.getElementById(`link-${tab}`).classList.add('active');

  if (tab === 'dashboard') loadAnalytics();
  if (tab === 'products') loadAdminProducts();
  if (tab === 'orders') loadAdminOrders();
  if (tab === 'users') loadAdminUsers();
}

/* ---------- Analytics ---------- */
async function loadAnalytics() {
  try {
    const { analytics } = await apiRequest('/admin/analytics');
    document.getElementById('statTotalSales').textContent = formatPrice(analytics.totalSales);
    document.getElementById('statTotalOrders').textContent = analytics.totalOrders;
    document.getElementById('statTotalProducts').textContent = analytics.totalProducts;
    document.getElementById('statTotalUsers').textContent = analytics.totalUsers;

    document.getElementById('topProductsList').innerHTML = analytics.topProducts
      .map((p, i) => `
        <div class="d-flex align-items-center gap-3 mb-3">
          <span class="fw-bold text-muted">#${i + 1}</span>
          <img src="${(p.images && p.images[0]) || 'https://placehold.co/60'}" style="width:44px;height:44px;object-fit:cover;border-radius:8px" />
          <div class="flex-grow-1">
            <div class="fw-semibold small">${p.name}</div>
            <div class="text-muted small">${p.sold} sold · ${starRating(p.rating)}</div>
          </div>
        </div>`).join('') || '<p class="text-muted small">No sales yet.</p>';

    document.getElementById('orderStatusList').innerHTML = analytics.ordersByStatus
      .map((s) => `<div class="d-flex justify-content-between mb-2"><span>${s._id}</span><span class="fw-bold">${s.count}</span></div>`).join('');

    renderSalesChart(analytics.salesByDay);
  } catch (e) {
    showToast('Failed to load analytics', 'error');
  }
}

function renderSalesChart(salesByDay) {
  const canvas = document.getElementById('salesChart');
  if (!canvas || !window.Chart) return;
  const labels = salesByDay.map((d) => d._id);
  const data = salesByDay.map((d) => d.total);

  if (window.__salesChartInstance) window.__salesChartInstance.destroy();
  window.__salesChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sales (₹)',
        data,
        borderColor: '#6d28d9',
        backgroundColor: 'rgba(109,40,217,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

/* ---------- Products ---------- */
async function loadAdminProducts() {
  const tbody = document.getElementById('adminProductsTable');
  try {
    const { products } = await apiRequest('/products?limit=100', { auth: false });
    tbody.innerHTML = products.map((p) => `
      <tr>
        <td><img src="${(p.images && p.images[0]) || 'https://placehold.co/50'}" style="width:44px;height:44px;object-fit:cover;border-radius:8px" /></td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatPrice(p.discountPrice > 0 ? p.discountPrice : p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.sold}</td>
        <td>${starRating(p.rating)}</td>
        <td>
          <button class="btn btn-sm btn-outline-brand me-1" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, "&apos;")})'><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p._id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-muted text-center py-3">Failed to load products</td></tr>`;
  }
}

function openProductModal(product) {
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
  form.dataset.id = product ? product._id : '';

  if (product) {
    form.name.value = product.name;
    form.brand.value = product.brand;
    form.category.value = product.category;
    form.price.value = product.price;
    form.discountPrice.value = product.discountPrice || '';
    form.stock.value = product.stock;
    form.tags.value = (product.tags || []).join(', ');
    form.images.value = (product.images || []).join(', ');
    form.description.value = product.description;
    form.isFeatured.checked = !!product.isFeatured;
  }
  new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function saveProduct(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.dataset.id;

  const body = {
    name: form.name.value.trim(),
    brand: form.brand.value.trim(),
    category: form.category.value.trim(),
    price: Number(form.price.value),
    discountPrice: Number(form.discountPrice.value) || 0,
    stock: Number(form.stock.value),
    tags: form.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
    images: form.images.value.split(',').map((t) => t.trim()).filter(Boolean),
    description: form.description.value.trim(),
    isFeatured: form.isFeatured.checked
  };

  try {
    if (id) {
      await apiRequest(`/products/${id}`, { method: 'PUT', body });
      showToast('Product updated', 'success');
    } else {
      await apiRequest('/products', { method: 'POST', body });
      showToast('Product created', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    loadAdminProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product permanently?')) return;
  try {
    await apiRequest(`/products/${id}`, { method: 'DELETE' });
    showToast('Product deleted', 'success');
    loadAdminProducts();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* ---------- Orders ---------- */
async function loadAdminOrders() {
  const tbody = document.getElementById('adminOrdersTable');
  try {
    const { orders } = await apiRequest('/orders');
    tbody.innerHTML = orders.map((o) => `
      <tr>
        <td>#${o._id.slice(-8).toUpperCase()}</td>
        <td>${o.user ? o.user.name : 'N/A'}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>${formatPrice(o.totalPrice)}</td>
        <td>${o.paymentMethod}</td>
        <td>
          <select class="form-select form-select-sm" style="width:140px" onchange="updateOrderStatus('${o._id}', this.value)">
            ${['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-3">Failed to load orders</td></tr>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await apiRequest(`/orders/${orderId}/status`, { method: 'PUT', body: { status } });
    showToast('Order status updated', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/* ---------- Users ---------- */
async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTable');
  try {
    const { users } = await apiRequest('/admin/users');
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'bg-warning text-dark' : 'bg-secondary'}">${u.role}</span></td>
        <td><span class="badge ${u.isActive ? 'bg-success' : 'bg-danger'}">${u.isActive ? 'Active' : 'Disabled'}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-brand me-1" onclick="toggleUserActive('${u._id}', ${!u.isActive})">
            ${u.isActive ? 'Disable' : 'Enable'}
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u._id}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-3">Failed to load users</td></tr>`;
  }
}

async function toggleUserActive(id, isActive) {
  try {
    await apiRequest(`/admin/users/${id}`, { method: 'PUT', body: { isActive } });
    loadAdminUsers();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deleteUser(id) {
  if (!confirm('Delete this user permanently?')) return;
  try {
    await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    showToast('User deleted', 'success');
    loadAdminUsers();
  } catch (e) { showToast(e.message, 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  showAdminTab('dashboard');
});
