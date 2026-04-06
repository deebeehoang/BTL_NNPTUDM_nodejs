const ChatUtil = require('../utils/chat.util');

class ChatController {
  static async getUsersList(req, res) {
    try {
      const adminId = req.query.adminId || null;
      const results = await ChatUtil.getChatUsersList(adminId);
      res.json({ message: 'Success', data: results });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getHistory(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: 'Thiếu userId.' });
      }
      const results = await ChatUtil.getMessageHistory(userId);
      res.json({ message: 'Success', data: results });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getConversation(req, res) {
    try {
      const { user1, user2 } = req.params;
      if (!user1 || !user2) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng.' });
      }
      const results = await ChatUtil.getConversation(user1, user2);
      res.json({ message: 'Success', data: results });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { Nguoi_gui, Nguoi_nhan, Noi_dung } = req.body;
      if (!Nguoi_gui || !Nguoi_nhan || !Noi_dung) {
        return res.status(400).json({
          message: 'Thiếu dữ liệu gửi tin nhắn.',
          required: ['Nguoi_gui', 'Nguoi_nhan', 'Noi_dung']
        });
      }
      await ChatUtil.sendMessage(Nguoi_gui, Nguoi_nhan, Noi_dung);
      res.json({ message: 'Tin nhắn đã được gửi' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async markAsRead(req, res) {
    try {
      const { adminId, customerId } = req.params;
      if (!adminId || !customerId) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng.' });
      }
      const result = await ChatUtil.markAsRead(adminId, customerId);
      res.json({ message: 'Đã đánh dấu tin nhắn là đã đọc', data: { updated: result.affectedRows } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getUnreadCount(req, res) {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ message: 'Thiếu userId.' });
      }
      const unreadCount = await ChatUtil.getUnreadCount(userId);
      res.json({ message: 'Success', data: { unread_count: unreadCount } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      if (!messageId) {
        return res.status(400).json({ message: 'Thiếu ID tin nhắn.' });
      }
      const result = await ChatUtil.deleteMessage(messageId);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy tin nhắn.' });
      }
      res.json({ message: 'Đã xóa tin nhắn' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async deleteConversation(req, res) {
    try {
      const { user1, user2 } = req.params;
      if (!user1 || !user2) {
        return res.status(400).json({ message: 'Thiếu thông tin người dùng.' });
      }
      const result = await ChatUtil.deleteConversation(user1, user2);
      res.json({ message: 'Đã xóa cuộc trò chuyện', data: { deleted: result.affectedRows } });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const stats = await ChatUtil.getStats();
      res.json({ message: 'Success', data: stats });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async searchMessages(req, res) {
    try {
      const { keyword, userId } = req.query;
      if (!keyword) {
        return res.status(400).json({ message: 'Thiếu từ khóa tìm kiếm.' });
      }
      const results = await ChatUtil.searchMessages(keyword, userId);
      res.json({ message: 'Success', data: results });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = ChatController;
