#!/usr/bin/env node

/**
 * Server Entry Point - Khởi động server và Socket.io
 */

const http = require('http');
const { Server } = require('socket.io');
const { app, db } = require('../app');

// Tạo HTTP Server
const server = http.createServer(app);

// Khởi tạo Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ===================================================================
//  SOCKET.IO LOGIC
// ===================================================================

let adminSockets = {};
let onlineUsers = {};
let guideSockets = {};

// Expose io và socket maps cho app
app.set('io', io);
app.set('onlineUsers', onlineUsers);
app.set('adminSockets', adminSockets);
app.set('guideSockets', guideSockets);

// Tạo getter function để luôn lấy adminSockets mới nhất
Object.defineProperty(app.locals, 'adminSockets', {
  get: function() {
    return adminSockets;
  },
  enumerable: true,
  configurable: true
});

io.on("connection", (socket) => {
  console.log("🔌 Một người dùng đã kết nối:", socket.id);

  // Lắng nghe sự kiện khi Admin online với adminId
  socket.on("adminOnline", (adminId) => {
    if (!adminId) {
      console.log('⚠️ Admin online event không có adminId');
      return;
    }
    console.log(`👑 Admin '${adminId}' đã online:`, socket.id);
    adminSockets[adminId] = socket;
    socket.adminId = adminId;
    socket.emit("updateUserList", Object.keys(onlineUsers));
    
    console.log(`📊 Tổng số admin đang online: ${Object.keys(adminSockets).length}`);
    console.log(`📊 Danh sách admin IDs: ${Object.keys(adminSockets).join(', ')}`);
    
    Object.values(onlineUsers).forEach(userSocket => {
      userSocket.emit("adminOnline", adminId);
    });
  });

  // Lắng nghe sự kiện khi Khách hàng online
  socket.on("userOnline", (userId) => {
    console.log(`👤 Khách hàng '${userId}' đã online:`, socket.id);
    onlineUsers[userId] = socket;
    socket.userId = userId;

    Object.values(adminSockets).forEach((adminSock) => {
      adminSock.emit("updateUserList", Object.keys(onlineUsers));
    });
    
    if (Object.keys(adminSockets).length > 0) {
      const firstAdminId = Object.keys(adminSockets)[0];
      socket.emit("adminOnline", firstAdminId);
    }
  });

  // Lắng nghe sự kiện khi Hướng dẫn viên online
  socket.on("guideOnline", async (data) => {
    const { userId, guideId } = data;
    if (!userId || !guideId) {
      console.log('⚠️ Guide online event thiếu userId hoặc guideId');
      return;
    }
    console.log(`🎯 Hướng dẫn viên '${guideId}' (${userId}) đã online:`, socket.id);
    guideSockets[guideId] = socket;
    socket.guideId = guideId;
    socket.userId = userId;
    
    console.log(`📊 Tổng số hướng dẫn viên đang online: ${Object.keys(guideSockets).length}`);
  });

  // Lắng nghe sự kiện gửi tin nhắn
  socket.on("sendMessage", (data) => {
    const { Nguoi_gui, Nguoi_nhan, Noi_dung } = data;
    console.log(`📩 Tin nhắn từ '${Nguoi_gui}' đến '${Nguoi_nhan}': ${Noi_dung}`);

    const nowIso = new Date().toISOString();
    const dataWithTime = { ...data, Thoi_gian: nowIso };
    if (Nguoi_nhan === "Admin") {
      Object.values(adminSockets).forEach((adminSock) => {
        adminSock.emit("receiveMessage", dataWithTime);
      });
    }
    else if (onlineUsers[Nguoi_nhan]) {
      const recipientSocket = onlineUsers[Nguoi_nhan];
      recipientSocket.emit("receiveMessage", dataWithTime);
      recipientSocket.emit("unreadCount", 1);
    }
    else if (adminSockets[Nguoi_nhan]) {
      adminSockets[Nguoi_nhan].emit("receiveMessage", dataWithTime);
    }
    else {
      console.log(`⚠️ Người dùng '${Nguoi_nhan}' không online, tin nhắn chưa được gửi.`);
    }
    
    // Lưu tin nhắn vào Database
    let dbReceiverId = Nguoi_nhan;
    if (Nguoi_nhan === 'Admin') {
      const onlineAdminIds = Object.keys(adminSockets);
      dbReceiverId = onlineAdminIds[0] || 'admin01';
    }
    const sql = `INSERT INTO Tin_nhan (Id_nguoi_gui, Id_nguoi_nhan, Noi_dung, Thoi_gian, Da_doc) VALUES (?, ?, ?, NOW(), 0)`;
    db.query(sql, [Nguoi_gui, dbReceiverId, Noi_dung], (err, result) => {
        if (err) {
            console.error('❌ Lỗi khi lưu tin nhắn vào DB:', err);
            socket.emit('messageError', { message: 'Không thể lưu tin nhắn vào cơ sở dữ liệu.' });
        } else {
            console.log('✅ Tin nhắn đã được lưu vào DB');
            socket.emit('messageSent', { success: true });
        }
    });
  });

  // Gõ phím (typing indicator)
  socket.on("typing", ({ from, to, isTyping }) => {
    if (!from || !to) return;
    if (to === 'Admin') {
      Object.values(adminSockets).forEach((adminSock) => {
        adminSock.emit('typing', { from, to: 'Admin', isTyping });
      });
      return;
    }
    if (adminSockets[to]) {
      adminSockets[to].emit('typing', { from, to, isTyping });
      return;
    }
    if (onlineUsers[to]) {
      onlineUsers[to].emit('typing', { from, to, isTyping });
    }
  });

  // Đánh dấu đã xem (seen)
  socket.on("messageSeen", async ({ viewerId, partnerId }) => {
    if (!viewerId || !partnerId) return;
    try {
      if (adminSockets[viewerId]) {
        await db.query(
          "UPDATE Tin_nhan SET Da_doc = 1 WHERE Id_nguoi_gui = ? AND Id_nguoi_nhan = ? AND Da_doc = 0",
          [partnerId, viewerId]
        );
        if (onlineUsers[partnerId]) {
          onlineUsers[partnerId].emit('messageSeen', { by: viewerId });
        }
      } else {
        await db.query(
          "UPDATE Tin_nhan SET Da_doc = 1 WHERE Id_nguoi_nhan = ? AND Id_nguoi_gui IN (SELECT Id_user FROM Tai_khoan WHERE Loai_tai_khoan='Admin') AND Da_doc = 0",
          [viewerId]
        );
        Object.values(adminSockets).forEach((adminSock) => {
          adminSock.emit('messageSeen', { by: viewerId });
        });
      }
    } catch (e) {
      console.error('Lỗi cập nhật đã xem:', e.message);
    }
  });

  // Xử lý khi người dùng ngắt kết nối
  socket.on("disconnect", () => {
    if (socket.adminId && adminSockets[socket.adminId]) {
      console.log(`👑 Admin '${socket.adminId}' đã offline.`);
      delete adminSockets[socket.adminId];
      console.log(`📊 Còn lại ${Object.keys(adminSockets).length} admin online`);
      
      Object.values(onlineUsers).forEach(userSocket => {
        userSocket.emit("adminOffline");
      });
    }
    else if (socket.guideId && guideSockets[socket.guideId]) {
      console.log(`🎯 Hướng dẫn viên '${socket.guideId}' đã offline.`);
      delete guideSockets[socket.guideId];
      console.log(`📊 Còn lại ${Object.keys(guideSockets).length} hướng dẫn viên online`);
    }
    else if (socket.userId && onlineUsers[socket.userId]) {
      console.log(`👤 Khách hàng '${socket.userId}' đã offline.`);
      delete onlineUsers[socket.userId];

      Object.values(adminSockets).forEach((adminSock) => {
        adminSock.emit("updateUserList", Object.keys(onlineUsers));
      });
    } else {
      console.log("🔌 Một kết nối vô danh đã ngắt.", socket.id);
    }
  });
});

// ===================================================================
// CRON JOBS
// ===================================================================
const CronService = require('../utils/cron.util');
CronService.start();

// ===================================================================
// START SERVER
// ===================================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Socket.io is ready for connections`);
});

module.exports = { app, server, io };
