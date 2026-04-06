const Ticket = require('../schemas/ticket.schema');

class TicketController {
  // Get all tickets (admin only)
  static async getAllTickets(req, res) {
    try {
      const tickets = await Ticket.getAll();
      res.status(200).json({
        status: 'success',
        results: tickets.length,
        data: { tickets }
      });
    } catch (error) {
      console.error('Get all tickets error:', error);
      res.status(500).json({ status: 'error', message: 'Error getting tickets', error: error.message });
    }
  }

  // Get a specific ticket by ID
  static async getTicketById(req, res) {
    try {
      const ticket = await Ticket.getById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ status: 'error', message: 'Ticket not found' });
      }
      res.status(200).json({ status: 'success', data: { ticket } });
    } catch (error) {
      console.error(`Get ticket ${req.params.id} error:`, error);
      res.status(500).json({ status: 'error', message: 'Error getting ticket', error: error.message });
    }
  }

  // Delete a ticket by ID
  static async deleteTicket(req, res) {
    try {
      const success = await Ticket.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ status: 'error', message: 'Ticket not found or could not be deleted' });
      }
      res.status(204).send();
    } catch (error) {
      console.error(`Delete ticket ${req.params.id} error:`, error);
      res.status(500).json({ status: 'error', message: 'Error deleting ticket', error: error.message });
    }
  }
  
  // Update a ticket's price and/or status
  static async updateTicket(req, res) {
    try {
      const { gia_ve, trang_thai_ve } = req.body;
      
      // Validate status if it's being updated
      if (trang_thai_ve && !['Chua_su_dung', 'Da_su_dung', 'Da_huy'].includes(trang_thai_ve)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket status. Must be one of: Chua_su_dung, Da_su_dung, Da_huy'
        });
      }
      
      // Validate price if it's being updated
      if (gia_ve !== undefined && (isNaN(gia_ve) || gia_ve < 0)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket price. Must be a non-negative number.'
        });
      }
      
      const updatedTicket = await Ticket.update(req.params.id, { gia_ve, trang_thai_ve });
      if (!updatedTicket) {
        return res.status(404).json({ status: 'error', message: 'Ticket not found' });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Ticket updated successfully',
        data: { ticket: updatedTicket }
      });
    } catch (error) {
      console.error(`Update ticket ${req.params.id} error:`, error);
      res.status(500).json({ status: 'error', message: 'Error updating ticket', error: error.message });
    }
  }
  
  // Update a ticket's status only
  static async updateTicketStatus(req, res) {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          status: 'error',
          message: 'Ticket status is required'
        });
      }
      
      if (!['Chua_su_dung', 'Da_su_dung', 'Da_huy'].includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket status. Must be one of: Chua_su_dung, Da_su_dung, Da_huy'
        });
      }
      
      const updatedTicket = await Ticket.updateStatus(req.params.id, status);
      if (!updatedTicket) {
        return res.status(404).json({ status: 'error', message: 'Ticket not found' });
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Ticket status updated successfully',
        data: { ticket: updatedTicket }
      });
    } catch (error) {
      console.error(`Update ticket status ${req.params.id} error:`, error);
      res.status(500).json({ status: 'error', message: 'Error updating ticket status', error: error.message });
    }
  }

  /**
   * Tự động cập nhật trạng thái vé đã hết hạn (Admin only)
   * POST /api/tickets/auto-update-expired
   */
  static async autoUpdateExpiredTickets(req, res) {
    try {
      const result = await Ticket.autoUpdateExpiredTickets();
      
      res.status(200).json({
        status: 'success',
        message: `Đã tự động cập nhật ${result.updated} vé từ "Chưa sử dụng" thành "Đã sử dụng"`,
        data: {
          updated: result.updated,
          tickets: result.tickets
        }
      });
    } catch (error) {
      console.error('Auto update expired tickets error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi tự động cập nhật trạng thái vé',
        error: error.message
      });
    }
  }
}

module.exports = TicketController;