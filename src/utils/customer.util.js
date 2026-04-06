const db = require('./database');

class CustomerUtil {
  static async getCustomerInfo(userId) {
    const [accounts] = await db.query(
      'SELECT Id_user, Email, Loai_tai_khoan, ten_hien_thi, anh_dai_dien FROM Tai_khoan WHERE Id_user = ?',
      [userId]
    );
    if (!accounts || accounts.length === 0) return null;

    const account = accounts[0];
    const [customers] = await db.query('SELECT * FROM Khach_hang WHERE Id_user = ?', [userId]);

    return {
      account: {
        id_user: account.Id_user,
        email: account.Email,
        loai_tai_khoan: account.Loai_tai_khoan,
        ten_hien_thi: account.ten_hien_thi || null,
        anh_dai_dien: account.anh_dai_dien || null
      },
      customer: customers && customers.length > 0 ? customers[0] : null
    };
  }

  static async createOrUpdateCustomer(userId, data) {
    const { ten_khach_hang, ngay_sinh, gioi_tinh, cccd, dia_chi } = data;

    const [existingCustomer] = await db.query(
      'SELECT Ma_khach_hang FROM Khach_hang WHERE Id_user = ?', [userId]
    );

    if (!existingCustomer || existingCustomer.length === 0) {
      const ma_khach_hang = 'KH' + Date.now().toString().slice(-6);
      await db.query(
        `INSERT INTO Khach_hang (Ma_khach_hang, Id_user, Ten_khach_hang, Ngay_sinh, Gioi_tinh, Cccd, Dia_chi) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ma_khach_hang, userId, ten_khach_hang, ngay_sinh, gioi_tinh, cccd, dia_chi]
      );
      return {
        isNew: true,
        customer: { Ma_khach_hang: ma_khach_hang, Id_user: userId, Ten_khach_hang: ten_khach_hang, Ngay_sinh: ngay_sinh, Gioi_tinh: gioi_tinh, Cccd: cccd, Dia_chi: dia_chi }
      };
    }

    const ma_khach_hang = existingCustomer[0].Ma_khach_hang;
    await db.query(
      `UPDATE Khach_hang SET Ten_khach_hang = ?, Ngay_sinh = ?, Gioi_tinh = ?, Cccd = ?, Dia_chi = ? WHERE Id_user = ?`,
      [ten_khach_hang, ngay_sinh, gioi_tinh, cccd, dia_chi, userId]
    );
    return {
      isNew: false,
      customer: { Ma_khach_hang: ma_khach_hang, Id_user: userId, Ten_khach_hang: ten_khach_hang, Ngay_sinh: ngay_sinh, Gioi_tinh: gioi_tinh, Cccd: cccd, Dia_chi: dia_chi }
    };
  }
}

module.exports = CustomerUtil;
