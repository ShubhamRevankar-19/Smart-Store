/* Simple rule-based AI shopping assistant chatbot widget (client-side, no external API needed) */
function initChatbot() {
  const fab = document.createElement('button');
  fab.className = 'chatbot-fab';
  fab.innerHTML = '<i class="bi bi-robot"></i>';
  fab.onclick = toggleChatbot;

  const panel = document.createElement('div');
  panel.className = 'chatbot-panel';
  panel.id = 'chatbotPanel';
  panel.innerHTML = `
    <div class="chatbot-header">
      <div><i class="bi bi-robot me-2"></i><strong>Smart Assistant</strong></div>
      <button class="btn-close btn-close-white" onclick="toggleChatbot()"></button>
    </div>
    <div class="chatbot-body" id="chatbotBody">
      <div class="chat-bubble bot">Hi! 👋 I'm your shopping assistant. Ask me about products, orders, shipping, or returns.</div>
    </div>
    <div class="chatbot-input">
      <input type="text" id="chatbotInput" placeholder="Type a message..." onkeydown="if(event.key==='Enter') sendChatMessage()" />
      <button onclick="sendChatMessage()"><i class="bi bi-send-fill"></i></button>
    </div>`;

  document.body.appendChild(fab);
  document.body.appendChild(panel);
}

function toggleChatbot() {
  document.getElementById('chatbotPanel').classList.toggle('show');
}

function addChatBubble(text, from) {
  const body = document.getElementById('chatbotBody');
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${from}`;
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatbotInput');
  const msg = input.value.trim();
  if (!msg) return;
  addChatBubble(msg, 'user');
  input.value = '';

  const reply = await generateBotReply(msg);
  setTimeout(() => addChatBubble(reply, 'bot'), 400);
}

async function generateBotReply(msg) {
  const lower = msg.toLowerCase();

  if (/order status|track|shipped|delivered/.test(lower)) {
    return 'You can track all your orders on your Profile page under "My Orders" — each order shows a live status timeline (Placed → Processing → Shipped → Delivered).';
  }
  if (/return|refund|cancel/.test(lower)) {
    return 'Our return policy allows returns within 7 days of delivery. Please reach out from your Order History page to initiate a return.';
  }
  if (/shipping|delivery time|deliver/.test(lower)) {
    return 'Standard delivery takes 3-5 business days. Orders above ₹999 get FREE shipping!';
  }
  if (/payment|cod|cash on delivery|card/.test(lower)) {
    return 'We support Cash on Delivery (COD) and dummy card payments for demo purposes at checkout.';
  }
  if (/discount|offer|coupon|sale/.test(lower)) {
    return 'Check out our Shop page — many items currently have active discounts shown with a red badge on the product card!';
  }

  // Product search intent — try a live lookup so the bot can recommend real items
  const keywords = lower.replace(/[^a-z0-9\s]/g, '').split(' ').filter((w) => w.length > 3);
  if (keywords.length) {
    try {
      const { suggestions } = await apiRequest(`/products/suggestions?q=${encodeURIComponent(keywords[0])}`, { auth: false });
      if (suggestions.length) {
        return `I found some products that might interest you: ${suggestions.slice(0, 3).map((p) => p.name).join(', ')}. Search "${keywords[0]}" in the search bar to see them all!`;
      }
    } catch (e) { /* ignore */ }
  }

  return "I'm here to help with product recommendations, order tracking, shipping, and returns. Could you tell me a bit more about what you're looking for?";
}

document.addEventListener('DOMContentLoaded', initChatbot);
