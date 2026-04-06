// public/js/chat-client.js

document.addEventListener("DOMContentLoaded", () => {
  // --- Kết nối đến Socket Server ---
  // Kiểm tra xem đã có socket chưa (từ user-block-notification.js)
  let socket = window.userSocket;
  if (!socket) {
    socket = io();
    window.userSocket = socket; // Lưu để dùng chung với user-block-notification.js
  } else {
    console.log('✅ [CHAT] Sử dụng socket connection có sẵn');
  }

  // --- Lấy Id_user thật nếu đã đăng nhập, nếu chưa thì chặn gửi để đảm bảo lưu DB ---
  let userId = null;
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      userId = user && (user.Id_user || user.id_user || user.id || user.username);
    }
  } catch (e) {}

  if (!userId) {
    console.warn('Chưa đăng nhập - cần đăng nhập để chat với admin (lưu DB).');
    // Hiển thị lời nhắc đăng nhập khi mở chat
    const loginNotice = document.createElement('div');
    loginNotice.className = 'message-bubble admin';
    loginNotice.textContent = 'Vui lòng đăng nhập để chat với Admin.';
    const chatBodyInit = document.getElementById("chat-body");
    if (chatBodyInit) chatBodyInit.appendChild(loginNotice);
  }

  // Thông báo cho server biết mình đã online
  // Đợi socket connect trước khi emit
  if (userId) {
    const emitUserOnline = () => {
      if (socket.connected) {
        socket.emit("userOnline", userId);
        console.log(`✅ [CHAT] Đã emit userOnline với userId: ${userId}, socket ID: ${socket.id}`);
      } else {
        console.warn(`⚠️ [CHAT] Socket chưa connected, đợi connect...`);
      }
    };

    // Nếu socket đã connected
    if (socket.connected) {
      emitUserOnline();
    } else {
      // Đợi socket connect
      socket.once('connect', () => {
        emitUserOnline();
      });
    }
  }

  // --- Lấy các phần tử DOM ---
  const chatToggle = document.getElementById("chat-toggle");
  const chatPopup = document.getElementById("chat-popup");
  const closeBtn = document.querySelector(".chat-close-button");
  const chatBody = document.getElementById("chat-body");
  const messageInput = document.getElementById("chat-message");
  const sendBtn = document.getElementById("send-chat");
  const notificationDot = document.getElementById('chat-notification');
  
  // Thêm phần tử hiển thị trạng thái admin
  const adminStatusIndicator = document.createElement('div');
  adminStatusIndicator.id = 'admin-status';
  adminStatusIndicator.className = 'admin-status-indicator';
  adminStatusIndicator.innerHTML = '<span class="status-dot offline"></span> Admin';
  
  // Thêm vào header của chat popup
  const chatHeader = chatPopup.querySelector('.chat-header-section');
  if (chatHeader) {
    chatHeader.appendChild(adminStatusIndicator);
  }
  
  // Typing indicator
  const typingLabel = document.createElement('div');
  typingLabel.className = 'message-bubble admin';
  typingLabel.style.opacity = '0.7';
  typingLabel.textContent = 'Đang soạn...';

  // --- Gán sự kiện ---
  chatToggle.onclick = () => {
    chatPopup.classList.add("active");
    chatToggle.style.display = 'none';
    notificationDot.style.display = 'none';
    messageInput.focus();
    loadChatHistory();
    
    // Đánh dấu tin nhắn đã đọc khi mở chat
    if (userId) {
      socket.emit('messageSeen', { userId: userId });
    }
  };

  closeBtn.onclick = () => {
    chatPopup.classList.remove("active");
    chatToggle.style.display = 'flex';
  };

  const sendMessage = () => {
    const msgContent = messageInput.value.trim();
    if (!msgContent) return;
    if (!userId) {
      alert('Vui lòng đăng nhập để gửi tin nhắn.');
      return;
    }

    const nowIso = new Date().toISOString();
    appendMessage(msgContent, "user", nowIso);

    const data = {
      Nguoi_gui: userId,
      Nguoi_nhan: "Admin",
      Noi_dung: msgContent,
    };

    socket.emit("sendMessage", data);
    // stop typing when sent
    socket.emit('typing', { from: userId, to: 'Admin', isTyping: false });
    messageInput.value = "";
    messageInput.focus();
  };

  sendBtn.onclick = sendMessage;
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
    // emit typing events while user types
    if (userId) {
      socket.emit('typing', { from: userId, to: 'Admin', isTyping: true });
      setTimeout(() => socket.emit('typing', { from: userId, to: 'Admin', isTyping: false }), 800);
    }
  });

  // --- Lắng nghe sự kiện từ Server ---
  socket.on("receiveMessage", (data) => {
    if (data.Nguoi_nhan === userId) {
      appendMessage(data.Noi_dung, "admin", data.Thoi_gian);
      if (!chatPopup.classList.contains('active')) {
        notificationDot.style.display = 'block';
      }
    }
  });
  socket.on('typing', ({ from, to, isTyping }) => {
    if (from && to === userId) {
      if (isTyping) {
        if (!typingLabel.isConnected) chatBody.appendChild(typingLabel);
        chatBody.scrollTop = chatBody.scrollHeight;
      } else if (typingLabel.isConnected) {
        chatBody.removeChild(typingLabel);
      }
    }
  });
  socket.on('messageSeen', ({ by }) => {
    // optional feedback for user when admin saw messages
  });

  // Cập nhật trạng thái admin online/offline
  socket.on("adminOnline", (adminId) => {
    const statusDot = adminStatusIndicator.querySelector('.status-dot');
    if (statusDot) {
      statusDot.className = 'status-dot online';
      adminStatusIndicator.innerHTML = `<span class="status-dot online"></span> Admin (${adminId})`;
    }
  });

  socket.on("adminOffline", () => {
    const statusDot = adminStatusIndicator.querySelector('.status-dot');
    if (statusDot) {
      statusDot.className = 'status-dot offline';
      adminStatusIndicator.innerHTML = '<span class="status-dot offline"></span> Admin';
    }
  });

  // Cập nhật số tin nhắn chưa đọc
  socket.on("unreadCount", (count) => {
    if (count > 0) {
      notificationDot.textContent = count;
      notificationDot.style.display = 'block';
    } else {
      notificationDot.style.display = 'none';
    }
  });

  // --- Các hàm chức năng ---
  function appendMessage(content, type, isoTime) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${type}`;
    const textNode = document.createElement('div');
    textNode.textContent = content;
    bubble.appendChild(textNode);
    if (isoTime) {
      try {
        const t = document.createElement('span');
        t.className = 'message-time';
        t.textContent = new Date(isoTime).toLocaleTimeString();
        bubble.appendChild(t);
      } catch (e) {}
    }
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Lưu tin nhắn vào localStorage
    saveMessageToLocal({
      content: content,
      sender: type,
      timestamp: isoTime || new Date().toISOString()
    });
  }

  // Lưu tin nhắn vào localStorage - chỉ lưu cho user hiện tại
  function saveMessageToLocal(messageData) {
    try {
      // Lưu riêng cho user hiện tại
      const userChatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      userChatHistory.push(messageData);
      if (userChatHistory.length > 200) {
        userChatHistory.splice(0, userChatHistory.length - 200);
      }
      localStorage.setItem('chatHistory', JSON.stringify(userChatHistory));
    } catch (error) {
      console.error('Lỗi khi lưu tin nhắn:', error);
    }
  }

  async function loadChatHistory() {
    chatBody.innerHTML = '';
    
    // Tải từ localStorage trước
    loadFromLocalStorage();
    
    // Sau đó tải từ API để đồng bộ
    try {
      const response = await fetch(`/api/chat/history/${userId}`);
      if (response.ok) {
        const history = await response.json();
        if (history.length > 0) {
          // Merge với localStorage và cập nhật
          mergeWithApiHistory(history);
        }
        // mark seen admin messages for this user when opening
        socket.emit('messageSeen', { viewerId: userId, partnerId: 'Admin' });
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử chat từ API:", err);
    }
    
    // Nếu không có tin nhắn nào, hiển thị lời chào
    if (chatBody.children.length === 0) {
      appendMessage("Chào bạn! D-Travel có thể giúp gì cho bạn?", "admin");
    }
  }

  // Tải tin nhắn từ localStorage - chỉ hiển thị tin nhắn của user hiện tại
  function loadFromLocalStorage() {
    try {
      // Tải lịch sử riêng của user hiện tại
      const userChatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      
      userChatHistory.forEach(message => {
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${message.sender}`;
        const textNode = document.createElement('div');
        textNode.textContent = message.content;
        bubble.appendChild(textNode);
        
        if (message.timestamp) {
          try {
            const t = document.createElement('span');
            t.className = 'message-time';
            t.textContent = new Date(message.timestamp).toLocaleTimeString();
            bubble.appendChild(t);
          } catch (e) {}
        }
        
        chatBody.appendChild(bubble);
      });
      chatBody.scrollTop = chatBody.scrollHeight;
    } catch (error) {
      console.error('Lỗi khi tải từ localStorage:', error);
    }
  }

  // Merge lịch sử từ API với localStorage
  function mergeWithApiHistory(apiHistory) {
    try {
      const userHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      const mergedHistory = [...userHistory];
      
      // Thêm tin nhắn từ API nếu chưa có trong localStorage
      apiHistory.forEach(apiMsg => {
        const exists = userHistory.some(localMsg => 
          localMsg.content === apiMsg.Noi_dung && 
          localMsg.timestamp === apiMsg.Thoi_gian
        );
        
        if (!exists) {
          mergedHistory.push({
            content: apiMsg.Noi_dung,
            sender: apiMsg.Nguoi_gui === userId ? "user" : "admin",
            timestamp: apiMsg.Thoi_gian
          });
        }
      });
      
      // Sắp xếp theo thời gian
      mergedHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Lưu lại vào localStorage riêng của user
      localStorage.setItem('chatHistory', JSON.stringify(mergedHistory));
      
      // Cập nhật giao diện
      chatBody.innerHTML = '';
      loadFromLocalStorage();
    } catch (error) {
      console.error('Lỗi khi merge lịch sử:', error);
    }
  }
});