document.addEventListener("DOMContentLoaded", () => {
  // --- Kết nối đến Socket Server ---
  // Tạo socket và lưu vào window để dùng chung với admin_notifications.js
  const socket = io();
  window.adminSocket = socket; // Lưu để admin_notifications.js có thể dùng chung

  // Thông báo cho server biết mình là Admin cùng với Id_user
  let adminId = null;
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && (user.loai_tai_khoan === 'Admin' || user.role === 'Admin')) {
        adminId = user.Id_user || user.id_user || user.id || user.username;
      }
    }
  } catch (e) {}
  socket.emit("adminOnline", adminId);

  // Biến để lưu trữ userId của khách hàng đang được chọn để chat
  let currentChatUser = null;
  let allUsers = []; // Lưu tất cả users để tìm kiếm

  // --- Lấy các phần tử DOM ---
  const userListElement = document.getElementById("userList");
  const chatWithElement = document.getElementById("chatWith");
  const chatStatusElement = document.getElementById("chatStatus");
  const chatAvatarElement = document.getElementById("chatAvatar");
  const chatMessagesElement = document.getElementById("chatMessages");
  const messageInputElement = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const closeChatBtn = document.getElementById("closeChat");
  const userSearchInput = document.getElementById("userSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const toggleSidebarBtn = document.getElementById("toggleSidebar");
  const chatSidebar = document.querySelector(".chat-sidebar");
  const typingIndicator = document.getElementById("typingIndicator");
  const quickReplies = document.getElementById("quickReplies");
  const attachFileBtn = document.getElementById("attachFileBtn");
  const emojiBtn = document.getElementById("emojiBtn");
  const chatInfoBtn = document.getElementById("chatInfoBtn");

  // Trạng thái người dùng online
  let onlineUserIds = new Set();

  // --- Lắng nghe các sự kiện từ Socket Server ---

  // Cập nhật danh sách người dùng đang online
  socket.on("updateUserList", (users) => {
    // Cập nhật tập online và gắn chấm xanh
    onlineUserIds = new Set(users);
    updateOnlineStatus();
    // Nếu chưa có danh sách, tải từ API
    if (userListElement.children.length === 0 || userListElement.querySelector('.user-list-empty')) {
      renderUserList();
    }
  });

  // Nhận một tin nhắn mới
  socket.on("receiveMessage", (data) => {
    // Chỉ hiển thị tin nhắn nếu nó thuộc về cuộc trò chuyện đang mở
    if (data.Nguoi_gui === currentChatUser) {
      appendMessage({
        Nguoi_gui: data.Nguoi_gui,
        Noi_dung: data.Noi_dung,
        Thoi_gian: data.Thoi_gian
      });
      // Ẩn empty state nếu có
      const emptyState = chatMessagesElement.querySelector('.chat-empty-state');
      if (emptyState) emptyState.remove();
    } else {
      // Cập nhật badge chưa đọc
      bumpUnreadBadge(data.Nguoi_gui);
      // Nếu user chưa có trong danh sách -> tải lại
      if (!userListElement.querySelector(`li[data-user-id='${data.Nguoi_gui}']`)) {
        renderUserList();
      }
    }
  });

  // Nhận typing indicator
  socket.on('typing', ({ from, to, isTyping }) => {
    if (from === currentChatUser) {
      if (isTyping) {
        typingIndicator.style.display = 'flex';
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
      } else {
        typingIndicator.style.display = 'none';
      }
    }
  });

  // Nhận thông báo đã xem
  socket.on('messageSeen', ({ by }) => {
    if (by === currentChatUser) {
      const last = [...chatMessagesElement.querySelectorAll('.msg.admin')].pop();
      if (last) {
        const timeEl = last.querySelector('.msg-time');
        if (timeEl) {
          timeEl.innerHTML += ' <span class="msg-seen">✓ Đã xem</span>';
        }
      }
    }
  });

  // Tìm kiếm người dùng
  userSearchInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterUserList(searchTerm);
    clearSearchBtn.style.display = searchTerm ? 'flex' : 'none';
  });

  clearSearchBtn?.addEventListener('click', () => {
    userSearchInput.value = '';
    filterUserList('');
    clearSearchBtn.style.display = 'none';
  });

  // Toggle sidebar
  const showSidebarBtn = document.getElementById('showSidebarBtn');
  
  toggleSidebarBtn?.addEventListener('click', () => {
    chatSidebar.classList.toggle('collapsed');
    // Hiển thị/ẩn nút show sidebar
    if (showSidebarBtn) {
      showSidebarBtn.style.display = chatSidebar.classList.contains('collapsed') ? 'flex' : 'none';
    }
  });
  
  // Hiển thị lại sidebar khi click nút show
  showSidebarBtn?.addEventListener('click', () => {
    chatSidebar.classList.remove('collapsed');
    showSidebarBtn.style.display = 'none';
  });
  
  // Kiểm tra trạng thái ban đầu
  if (showSidebarBtn && chatSidebar) {
    showSidebarBtn.style.display = chatSidebar.classList.contains('collapsed') ? 'flex' : 'none';
  }

  // Quick replies
  document.querySelectorAll('.quick-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reply = btn.getAttribute('data-reply');
      messageInputElement.value = reply;
      messageInputElement.focus();
      sendMessage();
    });
  });

  // Cập nhật trạng thái online
  function updateOnlineStatus() {
    document.querySelectorAll('#userList li[data-user-id]').forEach(li => {
      const id = li.dataset.userId;
      const dot = li.querySelector('.status-dot');
      if (dot) {
        dot.classList.toggle('online', onlineUserIds.has(id));
      }
    });
    
    // Cập nhật status trong chat header
    if (currentChatUser && chatStatusElement) {
      if (onlineUserIds.has(currentChatUser)) {
        chatStatusElement.textContent = 'Đang hoạt động';
        chatStatusElement.classList.add('online');
      } else {
        chatStatusElement.textContent = 'Không hoạt động';
        chatStatusElement.classList.remove('online');
      }
    }
  }

  // Lọc danh sách user
  function filterUserList(searchTerm) {
    const items = userListElement.querySelectorAll('li:not(.user-list-empty)');
    let hasVisible = false;
    
    items.forEach(li => {
      const name = li.querySelector('.user-name')?.textContent.toLowerCase() || '';
      const email = li.querySelector('.user-email')?.textContent.toLowerCase() || '';
      const matches = !searchTerm || name.includes(searchTerm) || email.includes(searchTerm);
      li.style.display = matches ? 'flex' : 'none';
      if (matches) hasVisible = true;
    });
    
    // Hiển thị empty state nếu không có kết quả
    let emptyState = userListElement.querySelector('.user-list-empty');
    if (!hasVisible && searchTerm) {
      if (!emptyState) {
        emptyState = document.createElement('li');
        emptyState.className = 'user-list-empty';
        emptyState.innerHTML = `
          <i class="fas fa-search"></i>
          <p>Không tìm thấy người dùng nào</p>
        `;
        userListElement.appendChild(emptyState);
      }
      emptyState.style.display = 'block';
    } else if (emptyState) {
      emptyState.style.display = 'none';
    }
  }

  async function renderUserList() {
    try {
      const res = await fetch(`/api/chat/users/list`);
      const users = await res.json();
      allUsers = users;
      userListElement.innerHTML = "";
      
      if (users.length === 0) {
        userListElement.innerHTML = `
          <li class="user-list-empty">
            <i class="fas fa-user-friends"></i>
            <p>Chưa có người dùng nào</p>
          </li>
        `;
        return;
      }
      
      users.forEach(u => {
        const id = u.Id_user;
        const name = u.Ten_khach_hang || u.Email || `User ${id}`;
        const email = u.Email || '';
        const avatar = u.anh_dai_dien || '';
        const initials = name.charAt(0).toUpperCase();
        const isOnline = onlineUserIds.has(id);
        
        const li = document.createElement('li');
        li.dataset.userId = id;
        li.innerHTML = `
          <div class="user-item-avatar">
            ${avatar ? `<img src="${avatar}" alt="${name}">` : `<span>${initials}</span>`}
            <span class="status-dot ${isOnline ? 'online' : ''}" style="position: absolute; bottom: 0; right: 0; border: 2px solid #fff;"></span>
          </div>
          <div class="user-item-info">
            <p class="user-name">${name}</p>
            ${email ? `<p class="user-email">${email}</p>` : ''}
          </div>
          <div class="user-item-meta">
            ${u.last_message_time ? `<span class="user-item-time">${formatTime(u.last_message_time)}</span>` : ''}
            ${u.unread_count > 0 ? `<span class="badge unread" data-badge-for="${id}">${u.unread_count}</span>` : ''}
          </div>
        `;
        
        if (id === currentChatUser) li.classList.add('active');
        li.onclick = () => selectUserToChat(id);
        userListElement.appendChild(li);
      });
    } catch (e) {
      console.error('Không thể tải danh sách chat:', e);
      userListElement.innerHTML = `
        <li class="user-list-empty">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Không thể tải danh sách người dùng</p>
        </li>
      `;
    }
  }

  function formatTime(timeString) {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút trước`;
      if (hours < 24) return `${hours} giờ trước`;
      if (days < 7) return `${days} ngày trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function bumpUnreadBadge(userId) {
    const badge = userListElement.querySelector(`.badge.unread[data-badge-for='${userId}']`);
    if (badge) {
      const val = parseInt(badge.textContent || '0', 10) + 1;
      badge.textContent = String(val);
      badge.style.display = 'inline-block';
    } else {
      // Tạo badge mới nếu chưa có
      const li = userListElement.querySelector(`li[data-user-id='${userId}']`);
      if (li) {
        const meta = li.querySelector('.user-item-meta');
        if (meta) {
          const newBadge = document.createElement('span');
          newBadge.className = 'badge unread';
          newBadge.setAttribute('data-badge-for', userId);
          newBadge.textContent = '1';
          meta.appendChild(newBadge);
        }
      }
    }
  }

  // --- Các hàm chính ---

  // Hàm chọn một người dùng để bắt đầu chat
  async function selectUserToChat(userId) {
    currentChatUser = userId;
    
    // Tìm thông tin user
    const user = allUsers.find(u => u.Id_user === userId);
    const userName = user ? (user.Ten_khach_hang || user.Email || `User ${userId}`) : `User ${userId}`;
    const userEmail = user ? user.Email : '';
    const userAvatar = user ? user.anh_dai_dien : '';
    
    // Cập nhật header
    chatWithElement.textContent = userName;
    if (userEmail) {
      chatStatusElement.textContent = onlineUserIds.has(userId) ? 'Đang hoạt động' : 'Không hoạt động';
      chatStatusElement.classList.toggle('online', onlineUserIds.has(userId));
    } else {
      chatStatusElement.textContent = onlineUserIds.has(userId) ? 'Đang hoạt động' : 'Không hoạt động';
      chatStatusElement.classList.toggle('online', onlineUserIds.has(userId));
    }
    
    // Cập nhật avatar
    if (userAvatar) {
      chatAvatarElement.innerHTML = `<img src="${userAvatar}" alt="${userName}">`;
    } else {
      const initials = userName.charAt(0).toUpperCase();
      chatAvatarElement.innerHTML = `<span>${initials}</span>`;
    }
    
    // Hiển thị các nút
    attachFileBtn.style.display = 'flex';
    emojiBtn.style.display = 'flex';
    chatInfoBtn.style.display = 'flex';
    quickReplies.style.display = 'flex';
    
    messageInputElement.disabled = false;
    sendMessageBtn.disabled = false;

    // Cập nhật trạng thái 'active' trong danh sách
    document.querySelectorAll("#userList li").forEach(li => {
      li.classList.toggle("active", li.dataset.userId === userId);
    });

    // Tải và hiển thị lịch sử chat
    chatMessagesElement.innerHTML = ""; // Xóa tin nhắn cũ
    
    // Tải từ localStorage trước
    loadAdminChatFromLocal(userId);
    
    // Sau đó tải từ API để đồng bộ
    try {
      const response = await fetch(`/api/chat/history/${userId}`);
      const history = await response.json();
      if (history.length > 0) {
        // Merge với localStorage
        mergeAdminChatWithApi(userId, history);
      }
      // Đánh dấu đã đọc cho đoạn chat này
      if (adminId) {
        fetch(`/api/chat/mark-read/${adminId}/${userId}`, { method: 'POST' });
        const badge = userListElement.querySelector(`.badge.unread[data-badge-for='${userId}']`);
        if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
      }
    } catch (error) {
      console.error("Không thể tải lịch sử chat từ API:", error);
    }
  }

  // Hàm gửi tin nhắn đi
  function sendMessage() {
    const msgContent = messageInputElement.value.trim();
    if (!msgContent || !currentChatUser) return;

    const data = {
      Nguoi_gui: adminId || "Admin",
      Nguoi_nhan: currentChatUser,
      Noi_dung: msgContent
    };

    socket.emit("sendMessage", data);
    appendMessage(data); // Hiển thị luôn tin nhắn mình vừa gửi
    messageInputElement.value = "";
    messageInputElement.focus();
    
    // Ẩn quick replies sau khi gửi
    quickReplies.style.display = 'none';
  }

  // Hàm thêm một bong bóng chat vào giao diện
  function appendMessage(messageData) {
    // Xóa empty state nếu có
    const emptyState = chatMessagesElement.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();
    
    const msgDiv = document.createElement("div");
    // Sử dụng class từ file admin.css: 'msg' và 'admin' hoặc 'user'
    const senderClass = (messageData.Nguoi_gui === adminId) ? "admin" : (messageData.Nguoi_gui === "Admin" ? "admin" : "user");
    msgDiv.className = `msg ${senderClass}`;
    
    const time = messageData.Thoi_gian ? new Date(messageData.Thoi_gian).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    
    msgDiv.innerHTML = `
      <div class="msg-content">${escapeHtml(messageData.Noi_dung)}</div>
      <div class="msg-time">${time}</div>
    `;
    
    chatMessagesElement.appendChild(msgDiv);
    chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight; // Tự động cuộn
    
    // Lưu tin nhắn vào localStorage
    saveAdminMessageToLocal({
      content: messageData.Noi_dung,
      sender: senderClass,
      timestamp: messageData.Thoi_gian || new Date().toISOString(),
      userId: currentChatUser
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Lưu tin nhắn admin vào localStorage - chỉ lưu riêng theo user
  function saveAdminMessageToLocal(messageData) {
    try {
      // Lưu riêng theo user
      const adminChatHistory = JSON.parse(localStorage.getItem('adminChatHistory') || '{}');
      const userKey = messageData.userId || 'general';
      
      if (!adminChatHistory[userKey]) {
        adminChatHistory[userKey] = [];
      }
      
      adminChatHistory[userKey].push(messageData);
      
      // Chỉ lưu 200 tin nhắn gần nhất cho mỗi user
      if (adminChatHistory[userKey].length > 200) {
        adminChatHistory[userKey].splice(0, adminChatHistory[userKey].length - 200);
      }
      
      localStorage.setItem('adminChatHistory', JSON.stringify(adminChatHistory));
    } catch (error) {
      console.error('Lỗi khi lưu tin nhắn admin:', error);
    }
  }

  // Tải tin nhắn admin từ localStorage - chỉ hiển thị tin nhắn của user được chọn
  function loadAdminChatFromLocal(userId) {
    try {
      // Tải lịch sử riêng của user được chọn
      const adminChatHistory = JSON.parse(localStorage.getItem('adminChatHistory') || '{}');
      const userMessages = adminChatHistory[userId] || [];
      
      if (userMessages.length === 0) {
        // Hiển thị empty state nếu không có tin nhắn
        if (!chatMessagesElement.querySelector('.chat-empty-state')) {
          chatMessagesElement.innerHTML = `
            <div class="chat-empty-state">
              <i class="fas fa-comment-dots"></i>
              <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
            </div>
          `;
        }
        return;
      }
      
      userMessages.forEach(message => {
        const msgDiv = document.createElement("div");
        msgDiv.className = `msg ${message.sender}`;
        
        const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
        
        msgDiv.innerHTML = `
          <div class="msg-content">${escapeHtml(message.content)}</div>
          <div class="msg-time">${time}</div>
        `;
        
        chatMessagesElement.appendChild(msgDiv);
      });
      
      chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    } catch (error) {
      console.error('Lỗi khi tải từ localStorage:', error);
    }
  }

  // Merge lịch sử admin từ API với localStorage
  function mergeAdminChatWithApi(userId, apiHistory) {
    try {
      const adminChatHistory = JSON.parse(localStorage.getItem('adminChatHistory') || '{}');
      const localMessages = adminChatHistory[userId] || [];
      const mergedMessages = [...localMessages];
      
      // Thêm tin nhắn từ API nếu chưa có trong localStorage
      apiHistory.forEach(apiMsg => {
        const exists = localMessages.some(localMsg => 
          localMsg.content === apiMsg.Noi_dung && 
          localMsg.timestamp === apiMsg.Thoi_gian
        );
        
        if (!exists) {
          const senderClass = (apiMsg.Id_nguoi_gui === adminId) ? "admin" : "user";
          mergedMessages.push({
            content: apiMsg.Noi_dung,
            sender: senderClass,
            timestamp: apiMsg.Thoi_gian,
            userId: userId
          });
        }
      });
      
      // Sắp xếp theo thời gian
      mergedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Lưu lại vào localStorage riêng của user
      adminChatHistory[userId] = mergedMessages;
      localStorage.setItem('adminChatHistory', JSON.stringify(adminChatHistory));
      
      // Cập nhật giao diện
      chatMessagesElement.innerHTML = '';
      loadAdminChatFromLocal(userId);
    } catch (error) {
      console.error('Lỗi khi merge lịch sử admin:', error);
    }
  }

  // --- Gán sự kiện cho các nút trên giao diện admin ---
  sendMessageBtn.onclick = sendMessage;
  
  messageInputElement.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
    clearTimeout(typingTimeout);
    if (currentChatUser) {
      socket.emit('typing', { from: adminId, to: currentChatUser, isTyping: true });
      typingTimeout = setTimeout(() => {
        socket.emit('typing', { from: adminId, to: currentChatUser, isTyping: false });
      }, 800);
    }
  });

  let typingTimeout = null;

  closeChatBtn.onclick = () => {
    currentChatUser = null;
    chatWithElement.textContent = "Chưa chọn người để chat";
    chatStatusElement.textContent = "Chọn một người dùng để bắt đầu";
    chatStatusElement.classList.remove('online');
    chatAvatarElement.innerHTML = '<i class="fas fa-user"></i>';
    chatMessagesElement.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-comment-dots"></i>
        <p>Chọn một người dùng để bắt đầu trò chuyện</p>
      </div>
    `;
    messageInputElement.disabled = true;
    sendMessageBtn.disabled = true;
    attachFileBtn.style.display = 'none';
    emojiBtn.style.display = 'none';
    chatInfoBtn.style.display = 'none';
    quickReplies.style.display = 'none';
    document.querySelectorAll("#userList li").forEach(li => li.classList.remove("active"));
  };
  
  // Khởi tạo
  renderUserList();
});
