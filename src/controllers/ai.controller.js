const { generateResponse } = require('../utils/ai.util');
const Tour = require('../schemas/tour.schema');

/**
 * AI Controller - Xử lý chat với Gemini AI
 */
class AIController {
  /**
   * Chat với AI
   * POST /api/ai/chat
   * Body: { message: string, history?: Array }
   */
  static async chat(req, res) {
    try {
      const { message, history = [] } = req.body;

      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Message không được để trống'
        });
      }

      console.log('🤖 [AI Chat] Nhận message:', message.substring(0, 100));

      // Phân tích intent và lấy dữ liệu tour nếu cần
      let tourData = null;
      const messageLower = message.toLowerCase();

      // Kiểm tra nếu user hỏi về giá cả
      const priceKeywords = ['giá', 'giá cả', 'giá tiền', 'giá rẻ', 'rẻ', 'dưới', 'dưới 1 triệu', 'dưới 1tr', 'dưới 1tr', 'triệu', 'nghìn', 'vnd', 'vnđ'];
      const hasPriceQuery = priceKeywords.some(keyword => messageLower.includes(keyword));
      
      // Trích xuất giá tối đa từ message (nếu có)
      let maxPrice = null;
      if (hasPriceQuery) {
        // Tìm số tiền trong message (ví dụ: "dưới 1 triệu", "dưới 1000000", "dưới 1tr")
        const priceMatch = messageLower.match(/dưới\s*(\d+)\s*(triệu|tr|nghìn|k|000)/i) || 
                           messageLower.match(/dưới\s*(\d+)/i) ||
                           messageLower.match(/(\d+)\s*(triệu|tr)/i);
        
        if (priceMatch) {
          let amount = parseFloat(priceMatch[1]);
          const unit = priceMatch[2]?.toLowerCase();
          
          if (unit === 'triệu' || unit === 'tr') {
            maxPrice = amount * 1000000; // Chuyển triệu thành VNĐ
          } else if (unit === 'nghìn' || unit === 'k') {
            maxPrice = amount * 1000; // Chuyển nghìn thành VNĐ
          } else if (amount < 1000) {
            maxPrice = amount * 1000000; // Nếu số nhỏ hơn 1000, coi như triệu
          } else {
            maxPrice = amount; // Số lớn hơn 1000, coi như VNĐ
          }
          
          console.log('💰 [AI Chat] Phát hiện yêu cầu giá tối đa:', maxPrice, 'VNĐ');
        }
      }

      // Kiểm tra nếu user hỏi về địa điểm hoặc tour
      const destinationKeywords = ['điểm đến', 'địa điểm', 'tour', 'đi', 'thăm', 'khám phá', 'nha trang', 'đà lạt', 'hạ long', 'phú quốc', 'sapa', 'huế', 'hội an', 'gợi ý', 'tìm'];
      const hasDestinationQuery = destinationKeywords.some(keyword => messageLower.includes(keyword));

      // Tìm tour nếu có query về tour/địa điểm hoặc giá cả
      if (hasDestinationQuery || hasPriceQuery) {
        try {
          let matchedTours = [];
          
          if (maxPrice) {
            // Tìm tour theo giá cả
            matchedTours = await Tour.search({ max_price: maxPrice });
            console.log('💰 [AI Chat] Tìm thấy', matchedTours.length, 'tour với giá <=', maxPrice, 'VNĐ');
          } else {
            // Tìm tour theo destination hoặc tất cả tour nếu hỏi chung chung
            const tours = await Tour.getAll();
            
            if (hasDestinationQuery) {
              // Lọc tour phù hợp với message
              matchedTours = tours.filter(tour => {
                const tourName = (tour.Ten_tour || '').toLowerCase();
                const tourDesc = (tour.Mo_ta || '').toLowerCase();
                const destination = (tour.Diem_den || '').toLowerCase();
                
                return messageLower.split(' ').some(word => 
                  tourName.includes(word) || 
                  tourDesc.includes(word) || 
                  destination.includes(word)
                );
              });
            } else {
              // Nếu chỉ hỏi về tour chung chung, lấy tất cả tour
              matchedTours = tours;
            }
          }

          // Lọc tour còn chỗ (Tinh_trang = "Còn chỗ")
          matchedTours = matchedTours.filter(tour => tour.Tinh_trang === 'Còn chỗ');

          if (matchedTours.length > 0) {
            // Sắp xếp theo giá tăng dần nếu có yêu cầu về giá
            if (hasPriceQuery) {
              matchedTours.sort((a, b) => (a.Gia_nguoi_lon || 0) - (b.Gia_nguoi_lon || 0));
            }
            
            tourData = matchedTours.slice(0, 5); // Lấy tối đa 5 tour
            console.log('📦 [AI Chat] Tìm thấy', tourData.length, 'tour phù hợp');
          } else {
            console.log('⚠️ [AI Chat] Không tìm thấy tour phù hợp với yêu cầu');
          }
        } catch (error) {
          console.error('❌ [AI Chat] Lỗi khi lấy tour data:', error);
          // Tiếp tục mà không có tour data
        }
      }

      // Xây dựng prompt với thông tin tour (nếu có)
      let enhancedPrompt = message;
      
      if (tourData && tourData.length > 0) {
        const tourInfo = tourData.map(tour => ({
          id: tour.Ma_tour,
          name: tour.Ten_tour,
          price: tour.Gia_nguoi_lon,
          duration: tour.Thoi_gian,
          destination: tour.Diem_den,
          description: tour.Mo_ta?.substring(0, 200) || ''
        }));

        enhancedPrompt = `${message}\n\nDữ liệu tour có sẵn (sử dụng giá cả và thông tin CHÍNH XÁC từ đây):\n${JSON.stringify(tourInfo, null, 2)}\n\nQUAN TRỌNG:\n1. Khi giới thiệu tour, BẮT BUỘC phải kèm theo Ma_tour trong format: "✈️ [Tên Tour] (Ma_tour: [MÃ_TOUR])"\n2. Sử dụng giá cả CHÍNH XÁC từ dữ liệu tour ở trên (price field)\n3. Nếu không có tour phù hợp với yêu cầu, vẫn giới thiệu tour gần nhất một cách tích cực\n4. Luôn hiển thị giá cả cụ thể: "💰 Giá: [GIÁ] VNĐ/người"\n5. Trả lời ngắn gọn, thân thiện, tích cực`;
      }

      // Gọi Gemini API
      const aiResponse = await generateResponse(enhancedPrompt, history);

      // Log response để debug
      console.log('📝 [AI Chat] AI Response:', aiResponse.substring(0, 200));

      // Trích xuất tour ID từ response (nếu có) - cải thiện regex
      const tourIdMatch = 
        aiResponse.match(/ma[_\s]*tour[:\s]*([A-Z0-9]+)/i) ||  // Ma_tour: XXX
        aiResponse.match(/tour.*?id[:\s]*([A-Z0-9]+)/i) ||      // Tour ID: XXX
        aiResponse.match(/\(ma[_\s]*tour[:\s]*([A-Z0-9]+)\)/i) || // (Ma_tour: XXX)
        aiResponse.match(/mã[_\s]*tour[:\s]*([A-Z0-9]+)/i);     // Mã tour: XXX
      
      const suggestedTourId = tourIdMatch ? tourIdMatch[1] : null;
      
      if (suggestedTourId) {
        console.log('✅ [AI Chat] Tìm thấy Ma_tour trong response:', suggestedTourId);
      } else if (tourData && tourData.length > 0) {
        console.log('⚠️ [AI Chat] Không tìm thấy Ma_tour trong response, dùng tour đầu tiên:', tourData[0].Ma_tour);
      }

      // Nếu có tour data, thêm tour ID vào response
      let responseData = {
        status: 'success',
        message: aiResponse,
        tourId: suggestedTourId || (tourData && tourData.length > 0 ? tourData[0].Ma_tour : null),
        tours: tourData ? tourData.map(t => ({
          id: t.Ma_tour,
          name: t.Ten_tour,
          price: t.Gia_nguoi_lon,
          duration: t.Thoi_gian,
          destination: t.Diem_den
        })) : null
      };

      console.log('✅ [AI Chat] Trả response thành công, tourId:', responseData.tourId);

      res.json(responseData);

    } catch (error) {
      console.error('❌ [AI Chat] Lỗi:', error);
      
      // Xác định mã lỗi HTTP phù hợp
      let statusCode = 500;
      let userMessage = error.message || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.';
      
      // Xử lý các lỗi cụ thể
      if (error.message?.includes('API key') || error.message?.includes('cấu hình')) {
        statusCode = 503; // Service Unavailable
        userMessage = 'Trợ lý ảo tạm thời không khả dụng do cấu hình hệ thống. Vui lòng liên hệ hỗ trợ hoặc thử lại sau.';
      } else if (error.message?.includes('Quota') || error.message?.includes('giới hạn')) {
        statusCode = 429; // Too Many Requests
        userMessage = 'Đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau vài phút.';
      }
      
      res.status(statusCode).json({
        status: 'error',
        message: userMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Health check cho AI service
   * GET /api/ai/health
   */
  static async healthCheck(req, res) {
    try {
      // Test kết nối với Gemini
      const testResponse = await generateResponse('Xin chào', []);
      
      res.json({
        status: 'success',
        message: 'AI service đang hoạt động',
        geminiConnected: true
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'AI service không khả dụng',
        geminiConnected: false,
        error: error.message
      });
    }
  }
}

module.exports = AIController;

