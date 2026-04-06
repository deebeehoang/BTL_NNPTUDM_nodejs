const TinNhan = require('../schemas/tinNhan.schema');

class ChatUtil {
  static async getChatUsersList(adminId) {
    return TinNhan.getChatPartners(adminId);
  }

  static async getMessageHistory(userId) {
    if (userId === 'admin01' || userId.toLowerCase().includes('admin')) {
      return TinNhan.getAllMessages();
    }
    return TinNhan.getMessagesByUser(userId);
  }

  static async getConversation(user1, user2) {
    return TinNhan.getConversation(user1, user2);
  }

  static async sendMessage(Nguoi_gui, Nguoi_nhan, Noi_dung) {
    return TinNhan.create(Nguoi_gui, Nguoi_nhan, Noi_dung);
  }

  static async markAsRead(adminId, customerId) {
    return TinNhan.markAsRead(adminId, customerId);
  }

  static async getUnreadCount(userId) {
    return TinNhan.getUnreadCount(userId);
  }

  static async deleteMessage(messageId) {
    return TinNhan.deleteById(messageId);
  }

  static async deleteConversation(user1, user2) {
    return TinNhan.deleteConversation(user1, user2);
  }

  static async getStats() {
    return TinNhan.getStats();
  }

  static async searchMessages(keyword, userId) {
    return TinNhan.search(keyword, userId);
  }
}

module.exports = ChatUtil;
