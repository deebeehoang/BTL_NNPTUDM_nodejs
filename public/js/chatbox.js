// Chatbox JavaScript - Modern & User-Friendly
class Chatbox {
  constructor() {
    this.isOpen = false;
    this.unreadCount = 0;
    this.socket = null;
    this.userId = null;
    this.userName = null;
    this.messages = [];
    this.isTyping = false;
    
    this.init();
  }

  init() {
    // Get user info from localStorage
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    if (user) {
      this.userId = user.id || user.Ma_khach_hang || user.Id_user;
      this.userName = user.ten_hien_thi || user.username || user.Ten_khach_hang || 'Người dùng';
    }

    this.createChatboxHTML();
    this.attachEventListeners();
    this.loadMessages();
    
    // Initialize Socket.IO connection if available
    if (typeof io !== 'undefined') {
      this.initSocket();
    }
  }

  createChatboxHTML() {
    const chatboxHTML = `
      <!-- Chatbox Button -->
      <button class="chatbox-button" id="chatboxButton" aria-label="Mở chatbox">
        <i class="fas fa-comments"></i>
        <span class="badge" id="chatboxBadge" style="display: none;">0</span>
      </button>

      <!-- Chatbox Container -->
      <div class="chatbox-container" id="chatboxContainer">
        <!-- Header -->
        <div class="chatbox-header">
          <div class="chatbox-header-left">
            <div class="chatbox-avatar">
              <i class="fas fa-headset"></i>
            </div>
            <div class="chatbox-header-info">
              <h4>Hỗ trợ khách hàng</h4>
              <p>
                <span class="chatbox-status"></span>
                Đang trực tuyến
              </p>
            </div>
          </div>
          <button class="chatbox-close" id="chatboxClose" aria-label="Đóng chatbox">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="chatbox-messages" id="chatboxMessages">
          <div class="chatbox-welcome">
            <div class="chatbox-welcome-icon">
              <i class="fas fa-comments"></i>
            </div>
            <h4>Chào mừng bạn đến với D-Travel!</h4>
            <p>Chúng tôi ở đây để hỗ trợ bạn. Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện.</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chatbox-input-area">
          <div class="chatbox-input-wrapper">
            <textarea 
              class="chatbox-input" 
              id="chatboxInput" 
              placeholder="Nhập tin nhắn của bạn..."
              rows="1"
            ></textarea>
          </div>
          <button class="chatbox-send-button" id="chatboxSendButton" aria-label="Gửi tin nhắn">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;

    // Append to body
    document.body.insertAdjacentHTML('beforeend', chatboxHTML);
  }

  attachEventListeners() {
    const button = document.getElementById('chatboxButton');
    const closeBtn = document.getElementById('chatboxClose');
    const sendBtn = document.getElementById('chatboxSendButton');
    const input = document.getElementById('chatboxInput');

    // Toggle chatbox
    button.addEventListener('click', () => this.toggleChatbox());
    closeBtn.addEventListener('click', () => this.closeChatbox());

    // Send message
    sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Send on Enter (Shift+Enter for new line)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Close on outside click (optional)
    document.addEventListener('click', (e) => {
      const container = document.getElementById('chatboxContainer');
      const button = document.getElementById('chatboxButton');
      
      if (this.isOpen && 
          !container.contains(e.target) && 
          !button.contains(e.target)) {
        // Uncomment to close on outside click
        // this.closeChatbox();
      }
    });
  }

  toggleChatbox() {
    if (this.isOpen) {
      this.closeChatbox();
    } else {
      this.openChatbox();
    }
  }

  openChatbox() {
    const container = document.getElementById('chatboxContainer');
    const button = document.getElementById('chatboxButton');
    
    container.classList.add('active');
    button.classList.add('closed');
    this.isOpen = true;
    
    // Hide old chatbox if exists
    const oldChatPopup = document.getElementById('chat-popup');
    const oldChatToggle = document.getElementById('chat-toggle');
    if (oldChatPopup) oldChatPopup.classList.remove('active');
    if (oldChatToggle) oldChatToggle.style.display = 'none';
    
    // Clear unread count
    this.unreadCount = 0;
    this.updateBadge();
    
    // Load messages if not loaded
    if (this.messages.length === 0) {
      this.loadMessages();
    }
    
    // Mark messages as seen
    if (this.userId && this.socket && this.socket.connected) {
      this.socket.emit('messageSeen', { userId: this.userId });
    }
    
    // Scroll to bottom
    this.scrollToBottom();
    
    // Focus input
    setTimeout(() => {
      document.getElementById('chatboxInput').focus();
    }, 300);
  }

  closeChatbox() {
    const container = document.getElementById('chatboxContainer');
    const button = document.getElementById('chatboxButton');
    
    container.classList.remove('active');
    button.classList.remove('closed');
    this.isOpen = false;
  }

  sendMessage() {
    const input = document.getElementById('chatboxInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add message to UI
    this.addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Send to server
    this.sendToServer(message);
    
    // Show typing indicator
    this.showTypingIndicator();
  }

  addMessage(text, sender = 'user', timestamp = null) {
    const messagesContainer = document.getElementById('chatboxMessages');
    
    // Remove welcome message if exists
    const welcome = messagesContainer.querySelector('.chatbox-welcome');
    if (welcome) {
      welcome.remove();
    }

    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'user' 
      ? this.getUserInitial() 
      : '<i class="fas fa-headset"></i>';
    
    const time = timestamp 
      ? this.formatTime(timestamp) 
      : this.formatTime(new Date());
    
    messageDiv.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <div class="message-bubble">${this.escapeHtml(text)}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    // Store message
    const messageData = {
      text,
      sender,
      timestamp: timestamp || new Date().toISOString()
    };
    this.messages.push(messageData);
    
    // Save to localStorage
    this.saveMessageToLocal(messageData);
  }

  saveMessageToLocal(messageData) {
    try {
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      chatHistory.push({
        content: messageData.text,
        sender: messageData.sender,
        timestamp: messageData.timestamp
      });
      
      // Keep only last 200 messages
      if (chatHistory.length > 200) {
        chatHistory.splice(0, chatHistory.length - 200);
      }
      
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chatboxMessages');
    const existing = messagesContainer.querySelector('.typing-indicator');
    
    if (existing) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    
    messagesContainer.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typing = document.querySelector('.typing-indicator');
    if (typing) {
      typing.remove();
    }
  }

  sendToServer(message) {
    if (!this.userId) {
      this.addMessage('Vui lòng đăng nhập để gửi tin nhắn.', 'admin');
      return;
    }

    // If Socket.IO is available, use it
    if (this.socket && this.socket.connected) {
      const data = {
        Nguoi_gui: this.userId,
        Nguoi_nhan: 'Admin',
        Noi_dung: message
      };
      this.socket.emit('sendMessage', data);
      
      // Stop typing indicator
      this.socket.emit('typing', { 
        from: this.userId, 
        to: 'Admin', 
        isTyping: false 
      });
    } else {
      // Fallback: Use fetch API
      this.sendViaAPI(message);
    }
  }

  async sendViaAPI(message) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.API_URL || '/api'}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          message: message,
          userId: this.userId,
          userName: this.userName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Simulate admin response after delay
        setTimeout(() => {
          this.hideTypingIndicator();
          this.addMessage(
            data.response || 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.',
            'admin'
          );
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.hideTypingIndicator();
      this.addMessage(
        'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.',
        'admin'
      );
    }
  }

  initSocket() {
    try {
      // Sử dụng socket có sẵn từ chat-client.js nếu có
      if (window.userSocket) {
        this.socket = window.userSocket;
        console.log('✅ [CHATBOX] Sử dụng socket connection có sẵn');
      } else {
        this.socket = io(window.API_URL?.replace('/api', '') || window.location.origin);
        window.userSocket = this.socket; // Lưu để dùng chung
      }
      
      this.socket.on('connect', () => {
        console.log('✅ [CHATBOX] Connected to server');
        if (this.userId) {
          this.socket.emit('userOnline', this.userId);
          this.socket.emit('join-room', { userId: this.userId });
        }
      });

      // Lắng nghe tin nhắn từ admin
      this.socket.on('receiveMessage', (data) => {
        if (data.Nguoi_nhan === this.userId) {
          this.hideTypingIndicator();
          this.addMessage(data.Noi_dung, 'admin', data.Thoi_gian);
          if (!this.isOpen) {
            this.incrementUnreadCount();
          }
        }
      });

      // Typing indicator
      this.socket.on('typing', ({ from, to, isTyping }) => {
        if (from && to === this.userId) {
          if (isTyping) {
            this.showTypingIndicator();
          } else {
            this.hideTypingIndicator();
          }
        }
      });

      // Admin online/offline status
      this.socket.on('adminOnline', (adminId) => {
        this.updateAdminStatus(true, adminId);
      });

      this.socket.on('adminOffline', () => {
        this.updateAdminStatus(false);
      });

      // Unread count
      this.socket.on('unreadCount', (count) => {
        this.unreadCount = count;
        this.updateBadge();
      });

      this.socket.on('disconnect', () => {
        console.log('⚠️ [CHATBOX] Disconnected from server');
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }

  updateAdminStatus(isOnline, adminId = null) {
    const statusElement = document.querySelector('.chatbox-status');
    const statusText = document.querySelector('.chatbox-header-info p');
    
    if (statusElement) {
      statusElement.style.background = isOnline ? 'var(--chat-success)' : '#ef4444';
    }
    
    if (statusText) {
      statusText.innerHTML = `
        <span class="chatbox-status"></span>
        ${isOnline ? 'Đang trực tuyến' : 'Đang offline'}
        ${adminId ? ` (${adminId})` : ''}
      `;
    }
  }

  loadMessages() {
    if (!this.userId) return;

    // Load from localStorage first
    this.loadFromLocalStorage();

    // Then load from API
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${window.API_URL || '/api'}/chat/history/${this.userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        // Merge with existing messages
        data.forEach(msg => {
          const exists = this.messages.some(m => 
            m.text === msg.Noi_dung && 
            new Date(m.timestamp).getTime() === new Date(msg.Thoi_gian).getTime()
          );
          
          if (!exists) {
            const sender = msg.Nguoi_gui === this.userId ? 'user' : 'admin';
            this.addMessage(msg.Noi_dung, sender, msg.Thoi_gian);
          }
        });
      } else if (this.messages.length === 0) {
        // Show welcome message if no messages
        const welcome = document.querySelector('.chatbox-welcome');
        if (welcome) {
          welcome.style.display = 'block';
        }
      }
      
      // Mark messages as seen
      if (this.socket && this.socket.connected) {
        this.socket.emit('messageSeen', { 
          viewerId: this.userId, 
          partnerId: 'Admin' 
        });
      }
    })
    .catch(error => {
      console.error('Error loading messages:', error);
    });
  }

  loadFromLocalStorage() {
    try {
      const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
      
      chatHistory.forEach(msg => {
        const exists = this.messages.some(m => 
          m.text === msg.content && 
          new Date(m.timestamp).getTime() === new Date(msg.timestamp).getTime()
        );
        
        if (!exists) {
          this.addMessage(msg.content, msg.sender, msg.timestamp);
        }
      });
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatboxMessages');
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  updateBadge() {
    const badge = document.getElementById('chatboxBadge');
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  incrementUnreadCount() {
    if (!this.isOpen) {
      this.unreadCount++;
      this.updateBadge();
    }
  }

  getUserInitial() {
    if (!this.userName) return 'U';
    return this.userName.charAt(0).toUpperCase();
  }

  formatTime(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now - messageDate;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    return messageDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chatbox when DOM is ready
let chatboxInstance = null;

document.addEventListener('DOMContentLoaded', function() {
  // Hide old chatbox elements if they exist
  const oldChatPopup = document.getElementById('chat-popup');
  const oldChatToggle = document.getElementById('chat-toggle');
  
  if (oldChatPopup) {
    oldChatPopup.style.display = 'none';
  }
  if (oldChatToggle) {
    oldChatToggle.style.display = 'none';
  }
  
  // Only initialize new chatbox if it doesn't exist
  if (!document.getElementById('chatboxButton')) {
    chatboxInstance = new Chatbox();
  }
});

// Export for global access
window.Chatbox = Chatbox;
window.chatboxInstance = chatboxInstance;

