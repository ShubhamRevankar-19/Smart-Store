async function loadOrderSuccess() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  try {
    const { order } = await apiRequest(`/orders/${id}`);
    document.getElementById('orderIdDisplay').textContent = `#${order._id.slice(-8).toUpperCase()}`;
    document.getElementById('orderTotalDisplay').textContent = formatPrice(order.totalPrice);
    document.getElementById('invoiceBtn').href = `#`;
    document.getElementById('invoiceBtn').onclick = (e) => { e.preventDefault(); downloadInvoice(order._id); };
    document.getElementById('viewOrderBtn').href = `profile.html?order=${order._id}#orders`;
  } catch (e) {
    showToast('Could not load order', 'error');
  }
}

async function downloadInvoice(orderId) {
  try {
    const blob = await apiRequest(`/orders/${orderId}/invoice`, { isBlob: true });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${orderId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    showToast('Could not download invoice', 'error');
  }
}
document.addEventListener('DOMContentLoaded', loadOrderSuccess);
