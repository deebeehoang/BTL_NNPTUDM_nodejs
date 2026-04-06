const Destination = require('../schemas/destination.schema');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Destination Controller
 */
class DestinationController {
  /**
   * Get all destinations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllDestinations(req, res) {
    try {
      const destinations = await Destination.getAll();
      
      res.status(200).json({
        status: 'success',
        results: destinations.length,
        data: { destinations }
      });
    } catch (error) {
      console.error('Get all destinations error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting destinations',
        error: error.message
      });
    }
  }
  
  /**
   * Get a specific destination by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getDestinationById(req, res) {
    try {
      const destinationId = req.params.id;
      const destination = await Destination.getById(destinationId);
      
      if (!destination) {
        return res.status(404).json({
          status: 'error',
          message: 'Destination not found'
        });
      }
      
      // Get tours that include this destination
      const tours = await Destination.getToursWithDestination(destinationId);
      
      res.status(200).json({
        status: 'success',
        data: {
          destination,
          tours
        }
      });
    } catch (error) {
      console.error(`Get destination ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting destination',
        error: error.message
      });
    }
  }
  
  /**
   * Create a new destination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createDestination(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }
      
      const destinationData = req.body;
      
      // Validate required fields
      if (!destinationData.ma_dia_danh || !destinationData.ten_dia_danh || !destinationData.mo_ta) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }
      
      // Check if destination already exists
      const existingDestination = await Destination.getById(destinationData.ma_dia_danh);
      if (existingDestination) {
        return res.status(400).json({
          status: 'error',
          message: 'Destination with this ID already exists'
        });
      }
      
      // If there's an image file, process it
      if (req.file) {
        // Gán đường dẫn tương đối cho ảnh (không xoá file)
        destinationData.hinh_anh = `/images/uploads/destination/${req.file.filename}`;
      }
      
      // Create the destination
      const newDestination = await Destination.create(destinationData);
      
      res.status(201).json({
        status: 'success',
        data: { destination: newDestination }
      });
    } catch (error) {
      console.error('Create destination error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating destination',
        error: error.message
      });
    }
  }
  
  /**
   * Update a destination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateDestination(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }
      
      const destinationId = req.params.id;
      const destinationData = req.body;
      
      // Check if destination exists
      const existingDestination = await Destination.getById(destinationId);
      if (!existingDestination) {
        return res.status(404).json({
          status: 'error',
          message: 'Destination not found'
        });
      }
      
      // If there's an image file, process it
      if (req.file) {
        // Gán đường dẫn tương đối cho ảnh (không xoá file)
        destinationData.hinh_anh = `/images/uploads/destination/${req.file.filename}`;
      }
      
      // Update the destination
      const updatedDestination = await Destination.update(destinationId, destinationData);
      
      res.status(200).json({
        status: 'success',
        data: { destination: updatedDestination }
      });
    } catch (error) {
      console.error(`Update destination ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating destination',
        error: error.message
      });
    }
  }
  
  /**
   * Delete a destination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteDestination(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }
      
      const destinationId = req.params.id;
      
      // Check if destination exists
      const existingDestination = await Destination.getById(destinationId);
      if (!existingDestination) {
        return res.status(404).json({
          status: 'error',
          message: 'Destination not found'
        });
      }
      
      // Delete the destination
      await Destination.delete(destinationId);
      
      res.status(204).send();
    } catch (error) {
      console.error(`Delete destination ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error deleting destination',
        error: error.message
      });
    }
  }
  
  /**
   * Search destinations by name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchDestinations(req, res) {
    try {
      const { keyword } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          status: 'error',
          message: 'Search keyword is required'
        });
      }
      
      const destinations = await Destination.searchByName(keyword);
      
      res.status(200).json({
        status: 'success',
        results: destinations.length,
        data: { destinations }
      });
    } catch (error) {
      console.error('Search destinations error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error searching destinations',
        error: error.message
      });
    }
  }

  /**
   * Get available tours for adding destinations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAvailableTours(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện thao tác này'
        });
      }
      
      const tours = await Destination.getAvailableTours();
      
      res.status(200).json({
        status: 'success',
        results: tours.length,
        data: { tours }
      });
    } catch (error) {
      console.error('Get available tours error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách tour',
        error: error.message
      });
    }
  }

  /**
   * Get destinations for a specific tour
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getTourDestinations(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện thao tác này'
        });
      }
      
      const { tourId } = req.params;
      
      const destinations = await Destination.getTourDestinationsWithOrder(tourId);
      
      res.status(200).json({
        status: 'success',
        results: destinations.length,
        data: { destinations }
      });
    } catch (error) {
      console.error('Get tour destinations error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách điểm đến của tour',
        error: error.message
      });
    }
  }

  /**
   * Add a destination to a tour
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async addDestinationToTour(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện thao tác này'
        });
      }
      
      const { tourId, destinationId } = req.params;
      const { order } = req.body;
      
      if (!order) {
        return res.status(400).json({
          status: 'error',
          message: 'Thứ tự điểm đến là bắt buộc'
        });
      }
      
      await Destination.addDestinationToTour(tourId, destinationId, order);
      
      // Get updated destinations
      const destinations = await Destination.getTourDestinationsWithOrder(tourId);
      
      res.status(200).json({
        status: 'success',
        data: { destinations }
      });
    } catch (error) {
      console.error('Add destination to tour error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi thêm điểm đến vào tour',
        error: error.message
      });
    }
  }

  /**
   * Update destination order in a tour
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateDestinationOrder(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện thao tác này'
        });
      }
      
      const { tourId, destinationId } = req.params;
      const { newOrder } = req.body;
      
      if (!newOrder) {
        return res.status(400).json({
          status: 'error',
          message: 'Thứ tự mới là bắt buộc'
        });
      }
      
      await Destination.updateDestinationOrder(tourId, destinationId, newOrder);
      
      // Get updated destinations
      const destinations = await Destination.getTourDestinationsWithOrder(tourId);
      
      res.status(200).json({
        status: 'success',
        data: { destinations }
      });
    } catch (error) {
      console.error('Update destination order error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi cập nhật thứ tự điểm đến',
        error: error.message
      });
    }
  }

  /**
   * Remove a destination from a tour
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async removeDestinationFromTour(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện thao tác này'
        });
      }
      
      const { tourId, destinationId } = req.params;
      
      await Destination.removeDestinationFromTour(tourId, destinationId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Remove destination from tour error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi xóa điểm đến khỏi tour',
        error: error.message
      });
    }
  }
}

module.exports = DestinationController;