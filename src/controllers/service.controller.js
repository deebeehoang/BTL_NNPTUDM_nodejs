const Service = require('../schemas/service.schema');

/**
 * Service Controller
 */
class ServiceController {
  /**
   * Get all services
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllServices(req, res) {
    try {
      const services = await Service.getAll();
      
      res.status(200).json({
        status: 'success',
        results: services.length,
        data: { services }
      });
    } catch (error) {
      console.error('Get all services error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting services',
        error: error.message
      });
    }
  }
  
  /**
   * Get a service by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getServiceById(req, res) {
    try {
      const service = await Service.getById(req.params.id);
      
      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { service }
      });
    } catch (error) {
      console.error('Get service error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting service',
        error: error.message
      });
    }
  }
  
  /**
   * Create a new service (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createService(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }

      const { ma_dich_vu, ten_dich_vu, mo_ta, gia } = req.body;
      
      if (!ma_dich_vu || !ten_dich_vu || !gia) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      const service = await Service.create({
        ma_dich_vu,
        ten_dich_vu,
        mo_ta,
        gia
      });

      res.status(201).json({
        status: 'success',
        data: { service }
      });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating service',
        error: error.message
      });
    }
  }
  
  /**
   * Update a service (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateService(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }

      const { ten_dich_vu, mo_ta, gia } = req.body;
      
      if (!ten_dich_vu || !gia) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }

      const service = await Service.update(req.params.id, {
        ten_dich_vu,
        mo_ta,
        gia
      });

      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: { service }
      });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating service',
        error: error.message
      });
    }
  }
  
  /**
   * Delete a service (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteService(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }

      const success = await Service.delete(req.params.id);
      
      if (!success) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Service deleted successfully'
      });
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error deleting service',
        error: error.message
      });
    }
  }
  
  /**
   * Get services for a specific booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getServicesForBooking(req, res) {
    try {
      const bookingId = req.params.bookingId;
      
      const services = await Service.getServicesForBooking(bookingId);
      
      res.status(200).json({
        status: 'success',
        results: services.length,
        data: { services }
      });
    } catch (error) {
      console.error(`Get services for booking ${req.params.bookingId} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting services for booking',
        error: error.message
      });
    }
  }
  
  /**
   * Add service to booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async addServiceToBooking(req, res) {
    try {
      const { bookingId, serviceId } = req.params;
      const { so_luong } = req.body;
      
      if (!so_luong || so_luong <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid quantity is required'
        });
      }
      
      // Get service to calculate price
      const service = await Service.getById(serviceId);
      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }
      
      const thanh_tien = service.Gia * so_luong;
      
      // Add service to booking
      await Service.addServiceToBooking({
        ma_booking: bookingId,
        ma_dich_vu: serviceId,
        so_luong,
        thanh_tien
      });
      
      // Get updated services for this booking
      const services = await Service.getServicesForBooking(bookingId);
      
      res.status(200).json({
        status: 'success',
        data: { services }
      });
    } catch (error) {
      console.error('Add service to booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error adding service to booking',
        error: error.message
      });
    }
  }
  
  /**
   * Remove service from booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async removeServiceFromBooking(req, res) {
    try {
      const { bookingId, serviceId } = req.params;
      
      // Remove service from booking
      await Service.removeServiceFromBooking(bookingId, serviceId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Remove service from booking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error removing service from booking',
        error: error.message
      });
    }
  }
  
  /**
   * Search services by name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchServices(req, res) {
    try {
      const { keyword } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          status: 'error',
          message: 'Search keyword is required'
        });
      }
      
      const services = await Service.searchByName(keyword);
      
      res.status(200).json({
        status: 'success',
        results: services.length,
        data: { services }
      });
    } catch (error) {
      console.error('Search services error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error searching services',
        error: error.message
      });
    }
  }
}

module.exports = ServiceController;