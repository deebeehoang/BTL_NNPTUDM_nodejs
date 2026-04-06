# 🚀 BACKEND STRUCTURE + CLEAN CODE RULES

## 🎯 MỤC TIÊU
Refactor backend Express về đúng kiến trúc + clean code:

routes → controllers → utils → schemas → resources → client

---

# 📁 VAI TRÒ TỪNG FOLDER

## routes/
- Chỉ định nghĩa API
- Không có logic
- Không gọi database
- Chỉ gọi controller
- Có thể gắn middleware

## controllers/
- Nhận request (req)
- Gọi utils xử lý
- Trả response (res)
- Không viết logic phức tạp
- Không query database

---

# ⚙️ CLEAN CODE RULES (BẮT BUỘC)

## 1. TÁCH NHIỆM RÕ RÀNG
- Mỗi file chỉ làm 1 nhiệm vụ
- routes ≠ logic
- controllers ≠ xử lý business
- utils = xử lý logic

---

## 2. ĐẶT TÊN RÕ RÀNG
- Tên function phải có nghĩa

❌ Sai:
getData, handleStuff, process

✅ Đúng:
getAllGuides, deleteGuideById, searchGuides

---

## 3. HÀM NGẮN, DỄ HIỂU
- Mỗi function chỉ làm 1 việc
- Không viết function dài > 30-40 dòng

---

## 4. KHÔNG LẶP CODE (DRY)
- Logic giống nhau → tách ra utils

---

## 5. KHÔNG CALLBACK LỒNG NHAU
- Dùng async/await
- Không viết nested callback

---

## 6. XỬ LÝ LỖI RÕ RÀNG

✅ Bắt buộc dùng try/catch:
try {
   const data = await service.getAll();
   res.json(resource.collection(data));
} catch (error) {
   res.status(500).json({ message: error.message });
}

---

## 7. RESPONSE CHUẨN

❌ Sai:
res.json(data);

✅ Đúng:
res.json({
   message: "Success",
   data: resource.collection(data)
});

---

## 8. KHÔNG HARD CODE
- Không viết string/giá trị cố định lung tung
- Dùng biến hoặc config

---

## 9. IMPORT GỌN GÀNG

❌ Sai:
const a = require("a"); const b = require("b");

✅ Đúng:
const a = require("a");
const b = require("b");

---

## 10. FORMAT CODE
- Indent 2 hoặc 4 space thống nhất
- Không dư khoảng trắng
- Xuống dòng hợp lý

---

# 🔄 FLOW CHUẨN

routes → controllers → utils → schemas → resources → client

---

# 🧠 YÊU CẦU REFACTOR

Khi xử lý code:

1. Nếu là routes:
   - Chỉ giữ API
   - Gọi controller

2. Nếu là controller:
   - Tách logic sang utils
   - Gọi resource khi trả dữ liệu

3. Đảm bảo clean code:
   - Hàm ngắn
   - Tên rõ nghĩa
   - Có try/catch

4. Không thay đổi logic hệ thống

---

# ❌ CÁC LỖI BỊ TRỪ ĐIỂM

- Logic trong routes
- Controller xử lý quá nhiều
- Không dùng utils
- Trả raw data
- Code khó đọc, không clean

---

# 🎯 MỤC TIÊU CUỐI

- Code chạy đúng
- Kiến trúc chuẩn
- Clean code
- Dễ đọc, dễ maintain
- Không bị trừ điểm