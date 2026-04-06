/**
 * AI Chatbox - Trợ lý du lịch ảo
 * Sử dụng Gemini API qua backend
 */
class AIChatbox {
  constructor() {
    this.isOpen = false;
    this.chatHistory = [];
    this.apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
      ? CONFIG.API_BASE_URL 
      : '/api';
    
    this.init();
  }

  init() {
    this.createHTML();
    this.attachEvents();
    this.loadChatHistory();
  }

  createHTML() {
    // Tạo container nếu chưa có
    let container = document.getElementById('ai-chatbox-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ai-chatbox-container';
      container.className = 'ai-chatbox-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <!-- Floating Button -->
      <button class="ai-chatbox-button" id="aiChatboxButton" title="Trợ lý du lịch ảo">
        <i class="fas fa-robot"></i>
      </button>

      <!-- Chat Window -->
      <div class="ai-chatbox-window" id="aiChatboxWindow">
        <!-- Header -->
        <div class="ai-chatbox-header">
          <h3>
            <i class="fas fa-robot"></i>
            <span>Trợ lý du lịch ảo 🤖✈️</span>
          </h3>
          <button class="close-btn" id="aiChatboxClose">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Messages Area -->
        <div class="ai-chatbox-messages" id="aiChatboxMessages">
          <div class="ai-welcome-message">
            <i class="fas fa-plane-departure"></i>
            <h4>Xin chào! 👋</h4>
            <p>Tôi là trợ lý du lịch ảo của D-Travel. Tôi có thể giúp bạn tìm tour phù hợp, gợi ý điểm đến và trả lời các câu hỏi về du lịch!</p>
          </div>
        </div>

        <!-- Input Area -->
        <div class="ai-chatbox-input-area">
          <textarea 
            class="ai-chatbox-input" 
            id="aiChatboxInput" 
            placeholder="Nhập câu hỏi của bạn..."
            rows="1"
          ></textarea>
          <button class="ai-chatbox-send-btn" id="aiChatboxSend">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const button = document.getElementById('aiChatboxButton');
    const window = document.getElementById('aiChatboxWindow');
    const closeBtn = document.getElementById('aiChatboxClose');
    const sendBtn = document.getElementById('aiChatboxSend');
    const input = document.getElementById('aiChatboxInput');

    // Toggle chat window
    button.addEventListener('click', () => {
      this.toggle();
    });

    closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Send message
    sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // Enter to send (Shift+Enter for new line)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !window.contains(e.target) && 
          !button.contains(e.target)) {
        // Không đóng khi click bên ngoài (giữ mở để user dễ sử dụng)
      }
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('aiChatboxWindow');
    
    if (this.isOpen) {
      window.classList.add('active');
      document.getElementById('aiChatboxInput').focus();
    } else {
      window.classList.remove('active');
    }
  }

  close() {
    this.isOpen = false;
    document.getElementById('aiChatboxWindow').classList.remove('active');
  }

  async sendMessage() {
    const input = document.getElementById('aiChatboxInput');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    this.addMessage('user', message);

    // Show typing indicator
    this.showTyping();

    try {
      // Call API
      const response = await fetch(`${this.apiUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          history: this.chatHistory
        })
      });

      // Hide typing indicator
      this.hideTyping();

      // Kiểm tra response status
      if (!response.ok) {
        // Nếu response không thành công, thử parse error message
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Không thể kết nối với server' };
        }
        
        const errorMessage = errorData.message || `Lỗi ${response.status}: Không thể xử lý yêu cầu`;
        this.addMessage('ai', errorMessage);
        return;
      }

      const data = await response.json();

      if (data.status === 'success') {
        // Add AI response
        this.addMessage('ai', data.message, data.tourId, data.tours);
        
        // Update chat history
        this.chatHistory.push(
          { role: 'user', content: message },
          { role: 'assistant', content: data.message }
        );
        
        // Save to localStorage
        this.saveChatHistory();
      } else {
        // Lấy thông báo lỗi từ response nếu có
        const errorMessage = data.message || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau. 😔';
        this.addMessage('ai', errorMessage);
      }
    } catch (error) {
      console.error('AI Chatbox Error:', error);
      this.hideTyping();
      
      // Xử lý các loại lỗi khác nhau
      let errorMessage = 'Không thể kết nối với trợ lý ảo. Vui lòng kiểm tra kết nối mạng. 🌐';
      
      if (error.message) {
        if (error.message.includes('API key') || error.message.includes('cấu hình')) {
          errorMessage = 'Trợ lý ảo tạm thời không khả dụng do cấu hình hệ thống. Vui lòng liên hệ hỗ trợ hoặc sử dụng tính năng chat với nhân viên tư vấn. 💬';
        } else if (error.message.includes('Quota') || error.message.includes('giới hạn')) {
          errorMessage = 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút. ⏰';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.addMessage('ai', errorMessage);
    }
  }

  addMessage(role, content, tourId = null, tours = null) {
    const messagesArea = document.getElementById('aiChatboxMessages');
    
    // Remove welcome message if exists
    const welcomeMsg = messagesArea.querySelector('.ai-welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;

    const time = new Date().toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    messageDiv.innerHTML = `
      <div class="ai-message-bubble">${this.formatMessage(content)}</div>
      <div class="ai-message-time">${time}</div>
    `;

    // Add tour suggestion button if tour ID exists
    if (tourId || (tours && tours.length > 0)) {
      const tourIdToUse = tourId || (tours && tours[0]?.id);
      const tourLink = `/detailtour.html?id=${tourIdToUse}`;
      
      const suggestionBtn = document.createElement('a');
      suggestionBtn.href = tourLink;
      suggestionBtn.className = 'ai-tour-suggestion';
      suggestionBtn.innerHTML = `
        <i class="fas fa-eye"></i>
        <span>Xem tour chi tiết</span>
      `;
      messageDiv.appendChild(suggestionBtn);
    }

    messagesArea.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Convert markdown-like formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  showTyping() {
    const messagesArea = document.getElementById('aiChatboxMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message ai';
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.innerHTML = `
      <div class="ai-typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesArea.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTyping() {
    const typingIndicator = document.getElementById('aiTypingIndicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  scrollToBottom() {
    const messagesArea = document.getElementById('aiChatboxMessages');
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  loadChatHistory() {
    try {
      const saved = localStorage.getItem('aiChatboxHistory');
      if (saved) {
        this.chatHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  saveChatHistory() {
    try {
      // Chỉ lưu 10 tin nhắn gần nhất
      const recentHistory = this.chatHistory.slice(-10);
      localStorage.setItem('aiChatboxHistory', JSON.stringify(recentHistory));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.aiChatbox = new AIChatbox();
  });
} else {
  window.aiChatbox = new AIChatbox();
}

