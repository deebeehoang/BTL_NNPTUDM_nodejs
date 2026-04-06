require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Kiểm tra API key
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ CẢNH BÁO: GEMINI_API_KEY không được thiết lập trong .env!');
}

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Lấy model Gemini - thử các model khả dụng
 * @param {string} preferredModel - Model ưu tiên (optional)
 * @returns {GenerativeModel} Gemini model instance
 */
function getGeminiModel(preferredModel = null) {
  try {
    // Danh sách các model để thử theo thứ tự ưu tiên
    const modelsToTry = preferredModel 
      ? [preferredModel, 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
      : [
          'gemini-1.5-pro',      // Model mới nhất, ổn định
          'gemini-1.5-flash',    // Model nhanh
          'gemini-pro',          // Model cũ nhưng ổn định
          'models/gemini-1.5-pro', // Format đầy đủ
          'models/gemini-pro'    // Format đầy đủ
        ];
    
    // Thử model đầu tiên
    const firstModel = modelsToTry[0];
    console.log(`🔍 Đang thử model: ${firstModel}`);
    return genAI.getGenerativeModel({ model: firstModel });
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo Gemini model:', error);
    throw error;
  }
}

/**
 * Gọi Gemini API để generate response
 * @param {string} prompt - Prompt để gửi đến Gemini
 * @param {Array} history - Lịch sử chat (optional)
 * @returns {Promise<string>} Response từ Gemini
 */
async function generateResponse(prompt, history = []) {
  // Danh sách các model để thử (theo thứ tự ưu tiên)
  // Chỉ giữ lại các model ổn định, loại bỏ experimental và preview versions
  const modelsToTry = [
    'models/gemini-2.5-flash',      // Model mới nhất, nhanh và ổn định (ưu tiên cao nhất)
    'models/gemini-2.5-pro',         // Model mới nhất, mạnh mẽ hơn
    'models/gemini-2.0-flash',       // Stable 2.0 version
    'models/gemini-flash-latest',     // Latest flash version (fallback)
    'models/gemini-pro-latest'        // Latest pro version (fallback)
  ];
  
  let lastError = null;
  
  // Thử từng model cho đến khi thành công
  for (const modelName of modelsToTry) {
    try {
      // Kiểm tra API key trước khi gọi
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
        console.error('❌ GEMINI_API_KEY không được thiết lập!');
        throw new Error('API key chưa được cấu hình. Vui lòng liên hệ quản trị viên để thiết lập API key.');
      }

      console.log(`🔄 Đang thử model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
    
    // System instruction - Đơn giản hóa và làm rõ ràng hơn
    const systemInstruction = `BẠN LÀ TRỢ LÝ DU LỊCH ẢO CỦA D-TRAVEL

QUAN TRỌNG - ĐỌC KỸ CÁC QUY TẮC SAU:

1. VAI TRÒ: Tư vấn tour du lịch chuyên nghiệp, thân thiện. Giao tiếp tiếng Việt tự nhiên, dùng emoji vừa phải (✈️ 🌍 🏖️ ⭐ 💰).

2. KHI KHÁCH HỎI VỀ TOUR/ĐỊA ĐIỂM:
   - BẮT BUỘC phải kèm Ma_tour trong câu trả lời
   - Format: "✈️ [Tên Tour] (Ma_tour: [MÃ])"
   - Luôn hiển thị giá cả: "💰 Giá: [GIÁ] VNĐ/người"
   - Gợi ý 2-3 tour phù hợp nhất (nếu có nhiều tour)
   - Trả lời ngắn gọn 3-5 dòng, tích cực và thân thiện

3. KHÔNG TRẢ LỜI về: khiếu nại, thanh toán, hoàn tiền, sửa tài khoản, hủy booking
   → Trả lời: "Vui lòng chuyển sang Tư vấn viên trực tuyến để được hỗ trợ chi tiết ạ! 😊"

4. KHI KHÔNG TÌM THẤY TOUR PHÙ HỢP: 
   - Vẫn giới thiệu tour gần nhất một cách tích cực
   - Giải thích tại sao tour đó vẫn đáng xem
   - Gợi ý điều chỉnh ngân sách hoặc tìm tour khác
   - Luôn kết thúc bằng câu hỏi mở

5. LUÔN kết thúc bằng câu hỏi mở để tiếp tục hội thoại

BẮT ĐẦU TRẢ LỜI NGAY BÂY GIỜ:`;

    // Xây dựng conversation history
    const chatHistory = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Start chat KHÔNG dùng systemInstruction (vì model không hỗ trợ)
    // Thay vào đó, sẽ thêm system instruction vào prompt
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Thêm system instruction vào prompt - luôn thêm để đảm bảo AI nhớ vai trò
    // Format rõ ràng để AI hiểu đây là instructions quan trọng
    let finalPrompt;
    if (!history || history.length === 0) {
      // Lần đầu chat: thêm system instruction đầy đủ
      finalPrompt = `${systemInstruction}\n\n---\n\nKHÁCH HÀNG HỎI: ${prompt}\n\nHãy trả lời theo đúng quy tắc trên:`;
    } else {
      // Có history: thêm nhắc nhở ngắn gọn nhưng vẫn nhấn mạnh Ma_tour
      finalPrompt = `[NHẮC NHỞ: Bạn là trợ lý du lịch. LUÔN kèm Ma_tour khi giới thiệu tour. KHÔNG trả lời về thanh toán/booking.]\n\n---\n\nKHÁCH HÀNG HỎI: ${prompt}\n\nTrả lời:`;
    }
    
      const result = await chat.sendMessage(finalPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ Thành công với model: ${modelName}`);
      return text;
      
    } catch (error) {
      const errorStatus = error.status;
      const errorMessage = error.message || '';
      
      console.warn(`⚠️ Model ${modelName} không khả dụng:`, errorStatus || errorMessage.substring(0, 100));
      lastError = error;
      
      // Nếu lỗi 404 (model không tồn tại), 503 (model quá tải), hoặc 429 (quota exceeded), thử model tiếp theo
      // Lỗi 429 có thể chỉ xảy ra với một model cụ thể (free tier limit), model khác có thể vẫn hoạt động
      if (errorStatus === 404 || errorStatus === 503 || errorStatus === 429 ||
          errorMessage.includes('404') || errorMessage.includes('503') || errorMessage.includes('429') ||
          errorMessage.includes('Not Found') || errorMessage.includes('overloaded') ||
          errorMessage.includes('Service Unavailable') || errorMessage.includes('quota') ||
          errorMessage.includes('Quota') || errorMessage.includes('Too Many Requests')) {
        // Tiếp tục thử model tiếp theo
        continue;
      }
      
      // Nếu là lỗi xác thực (403, 401), throw ngay vì không thể retry với model khác
      if (errorStatus === 403 || errorStatus === 401) {
        throw error;
      }
      
      // Nếu không phải lỗi có thể retry, throw ngay
      if (errorStatus && errorStatus >= 400 && errorStatus < 500 && 
          errorStatus !== 404 && errorStatus !== 503 && errorStatus !== 429) {
        throw error;
      }
      
      // Các lỗi khác (network, timeout, etc.) cũng thử model tiếp theo
      continue;
    }
  }
  
  // Nếu đã thử hết tất cả model mà vẫn lỗi
  if (lastError) {
    console.error('❌ Tất cả model đều không khả dụng. Lỗi cuối cùng:', lastError.status || lastError.message?.substring(0, 100));
    
    // Xử lý các lỗi phổ biến
    if (lastError.status === 403 || lastError.message?.includes('403') || lastError.message?.includes('Forbidden')) {
      if (lastError.message?.includes('API Key') || lastError.message?.includes('unregistered callers') || lastError.message?.includes('established identity')) {
        throw new Error('API key không hợp lệ hoặc chưa được thiết lập. Vui lòng kiểm tra cấu hình GEMINI_API_KEY trong file .env');
      }
      throw new Error('Không có quyền truy cập API. Vui lòng kiểm tra cấu hình API key.');
    }
    
    if (lastError.status === 404 || lastError.message?.includes('404') || lastError.message?.includes('Not Found')) {
      if (lastError.message?.includes('model') || lastError.message?.includes('not found')) {
        throw new Error('Không tìm thấy model AI khả dụng. Vui lòng kiểm tra API key hoặc liên hệ hỗ trợ để được cấu hình đúng model.');
      }
      throw new Error('Tài nguyên không tìm thấy. Vui lòng thử lại sau.');
    }
    
    if (lastError.status === 400 || lastError.message?.includes('400') || lastError.message?.includes('Bad Request')) {
      throw new Error('Yêu cầu không hợp lệ. Vui lòng thử lại.');
    }
    
    if (lastError.status === 503 || lastError.message?.includes('503') || 
        lastError.message?.includes('overloaded') || lastError.message?.includes('Service Unavailable')) {
      throw new Error('Tất cả các model AI đang quá tải. Vui lòng thử lại sau vài phút.');
    }
    
    if (lastError.status === 429 || lastError.message?.includes('429') || 
        lastError.message?.includes('quota') || lastError.message?.includes('Quota') ||
        lastError.message?.includes('Too Many Requests')) {
      // Kiểm tra xem có thông tin retry delay không
      let retryMessage = 'Đã vượt quá giới hạn sử dụng API. Vui lòng thử lại sau.';
      if (lastError.errorDetails) {
        const retryInfo = lastError.errorDetails.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
        if (retryInfo && retryInfo.retryDelay) {
          const delaySeconds = parseInt(retryInfo.retryDelay) || 0;
          if (delaySeconds > 0) {
            retryMessage = `Đã vượt quá giới hạn sử dụng API. Vui lòng thử lại sau ${Math.ceil(delaySeconds)} giây.`;
          }
        }
      }
      throw new Error(retryMessage);
    }
    
    if (lastError.message?.includes('API key') || lastError.message?.includes('401')) {
      throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại cấu hình.');
    }
    
    throw new Error('Không thể kết nối với AI. Vui lòng kiểm tra API key và thử lại sau.');
  }
  
  throw new Error('Không tìm thấy model khả dụng');
}

module.exports = {
  getGeminiModel,
  generateResponse
};

