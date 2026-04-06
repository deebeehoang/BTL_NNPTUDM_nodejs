const CustomerUtil = require('../utils/customer.util');

class CustomerController {
  static async getMe(req, res) {
    try {
      const userId = req.user.id || req.user.Id_user || req.user.userId;
      if (!userId) {
        return res.status(400).json({ status: 'error', message: 'Không tìm thấy thông tin người dùng trong token' });
      }

      const result = await CustomerUtil.getCustomerInfo(userId);
      if (!result) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy tài khoản' });
      }

      if (!result.customer) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy thông tin khách hàng. Vui lòng cập nhật thông tin cá nhân.',
          data: { account: result.account }
        });
      }

      res.status(200).json({
        status: 'success',
        data: { customer: result.customer, account: result.account }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Lỗi khi lấy thông tin khách hàng', error: error.message });
    }
  }

  static async updateMe(req, res) {
    try {
      const userId = req.user.id || req.user.Id_user || req.user.userId;
      if (!userId) {
        return res.status(400).json({ status: 'error', message: 'Không tìm thấy thông tin người dùng trong token' });
      }

      const { ten_khach_hang, ngay_sinh, gioi_tinh, cccd, dia_chi } = req.body;
      const missingFields = [];
      if (!ten_khach_hang) missingFields.push('ten_khach_hang');
      if (!ngay_sinh) missingFields.push('ngay_sinh');
      if (!gioi_tinh) missingFields.push('gioi_tinh');
      if (!dia_chi) missingFields.push('dia_chi');
      if (!cccd) missingFields.push('cccd');

      if (missingFields.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Thiếu thông tin bắt buộc: ${missingFields.join(', ')}`,
          missingFields
        });
      }

      const result = await CustomerUtil.createOrUpdateCustomer(userId, req.body);
      const statusCode = result.isNew ? 201 : 200;
      const message = result.isNew ? 'Đã tạo thông tin khách hàng mới' : 'Cập nhật thông tin thành công';

      res.status(statusCode).json({
        status: 'success',
        message,
        data: { customer: result.customer }
      });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Lỗi khi cập nhật thông tin khách hàng', error: error.message });
    }
  }
}

module.exports = CustomerController;
