// JavaScript for managing destinations in admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Đảm bảo chỉ gọi các hàm khi đang ở tab điểm đến
    if (document.getElementById('destinationsSection').classList.contains('active')) {
        initializeDestinationsTab();
    }
    
    // Thêm lắng nghe sự kiện chuyển tab
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (e.currentTarget.id === 'navDestinations') {
                // Nếu đang chuyển đến tab quản lý điểm đến, khởi tạo các thành phần
                setTimeout(initializeDestinationsTab, 100);
            }
        });
    });
});

// Khởi tạo tab điểm đến
function initializeDestinationsTab() {
    loadDestinations();
    loadAvailableTours();
    
    // Event listeners
    const tourSelect = document.getElementById('tourSelect');
    const addTourDestinationBtn = document.getElementById('addTourDestinationBtn');
    const destinationsSection = document.getElementById('destinationsSection');
    
    if (tourSelect) {
        tourSelect.addEventListener('change', handleTourSelectChange);
    }
    
    if (addTourDestinationBtn) {
        addTourDestinationBtn.addEventListener('click', showAddDestinationToTourModal);
    }
    
    if (destinationsSection) {
        destinationsSection.addEventListener('click', handleDestinationActions);
    }
}

// Load all destinations
async function loadDestinations() {
    try {
        const response = await fetch('/api/destinations');
        const data = await response.json();
        
        if (!data.data || !data.data.destinations) {
            console.error('Invalid response format');
            return;
        }
        
        const destinations = data.data.destinations;
        const destinationsList = document.getElementById('destinationsList');
        
        // Kiểm tra xem phần tử destinationsList có tồn tại không
        if (!destinationsList) {
            console.error('Element with ID "destinationsList" not found');
            return;
        }
        
        destinationsList.innerHTML = '';
        
        destinations.forEach(destination => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${destination.Ma_dia_danh}</td>
                <td>${destination.Ten_dia_danh}</td>
                <td>${destination.Mo_ta ? destination.Mo_ta.substring(0, 100) + '...' : 'Không có mô tả'}</td>
                <td>
                    <img src="${destination.Hinh_anh || '/images/placeholder.jpg'}" 
                         alt="${destination.Ten_dia_danh}" 
                         class="img-thumbnail" style="width: 100px; height: 70px; object-fit: cover;"
                         onerror="this.src='/images/placeholder.jpg'">
                </td>
                <td>
                    <button class="btn btn-sm btn-info btn-view-destination" data-id="${destination.Ma_dia_danh}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary btn-edit-destination" data-id="${destination.Ma_dia_danh}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-destination" data-id="${destination.Ma_dia_danh}">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-success btn-manage-tour-destination" data-id="${destination.Ma_dia_danh}" data-name="${destination.Ten_dia_danh}">
                        <i class="fas fa-link"></i> Chọn cho tour
                    </button>
                </td>
            `;
            destinationsList.appendChild(row);
        });
        
        // Show the tour destinations container
        const tourDestinationsContainer = document.getElementById('tourDestinationsContainer');
        if (tourDestinationsContainer) {
            tourDestinationsContainer.style.display = 'block';
        }
        
        // Thêm sự kiện click cho nút thêm điểm đến
        const addDestinationBtn = document.getElementById('addDestinationBtn');
        if (addDestinationBtn) {
            addDestinationBtn.removeEventListener('click', showAddDestinationModal);
            addDestinationBtn.addEventListener('click', showAddDestinationModal);
        }
    } catch (error) {
        console.error('Error loading destinations:', error);
        alert('Lỗi khi tải danh sách điểm đến.');
    }
}

// Load available tours for destination assignment
async function loadAvailableTours() {
    try {
        const response = await fetch('/api/destinations/tours/available', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tours');
        }
        
        const data = await response.json();
        const tours = data.data.tours;
        
        const tourSelect = document.getElementById('tourSelect');
        if (!tourSelect) {
            console.error('Element with ID "tourSelect" not found');
            return;
        }
        
        tourSelect.innerHTML = '<option value="">Chọn Tour</option>';
        
        tours.forEach(tour => {
            const option = document.createElement('option');
            option.value = tour.Ma_tour;
            option.textContent = `${tour.Ma_tour} - ${tour.Ten_tour}`;
            tourSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tours:', error);
    }
}

// Handle tour selection change
async function handleTourSelectChange() {
    const tourId = this.value;
    const addButton = document.getElementById('addTourDestinationBtn');
    
    if (!addButton) {
        console.error('Element with ID "addTourDestinationBtn" not found');
        return;
    }
    
    // Enable/disable the add button based on selection
    addButton.disabled = !tourId;
    
    if (tourId) {
        // Load destinations for the selected tour
        await loadTourDestinations(tourId);
    } else {
        // Clear the destinations list if no tour is selected
        const tourDestinationsList = document.getElementById('tourDestinationsList');
        if (tourDestinationsList) {
            tourDestinationsList.innerHTML = '';
        }
    }
}

// Load destinations for a specific tour
async function loadTourDestinations(tourId) {
    try {
        const response = await fetch(`/api/destinations/tours/${tourId}/destinations`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tour destinations');
        }
        
        const data = await response.json();
        const destinations = data.data.destinations;
        
        const destinationsList = document.getElementById('tourDestinationsList');
        if (!destinationsList) {
            console.error('Element with ID "tourDestinationsList" not found');
            return;
        }
        
        destinationsList.innerHTML = '';
        
        if (destinations.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="text-center">Chưa có điểm đến nào cho tour này</td>';
            destinationsList.appendChild(row);
            return;
        }
        
        destinations.forEach(destination => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${destination.Ma_dia_danh}</td>
                <td>${destination.Ten_dia_danh}</td>
                <td>
                    <input type="number" class="form-control form-control-sm order-input" 
                           value="${destination.Thu_tu}" min="1" 
                           data-tour="${tourId}" 
                           data-destination="${destination.Ma_dia_danh}" 
                           data-current-order="${destination.Thu_tu}">
                </td>
                <td>
                    <button class="btn btn-sm btn-danger btn-remove-tour-destination" 
                            data-tour="${tourId}" 
                            data-destination="${destination.Ma_dia_danh}">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </td>
            `;
            destinationsList.appendChild(row);
        });
        
        // Add event listeners for order inputs
        document.querySelectorAll('.order-input').forEach(input => {
            input.addEventListener('change', handleOrderChange);
        });
    } catch (error) {
        console.error('Error loading tour destinations:', error);
        alert('Lỗi khi tải danh sách điểm đến cho tour.');
    }
}

// Handle order change for tour destinations
async function handleOrderChange(e) {
    const input = e.target;
    const tourId = input.dataset.tour;
    const destinationId = input.dataset.destination;
    const newOrder = parseInt(input.value);
    const currentOrder = parseInt(input.dataset.currentOrder);
    
    // Only update if the order has changed
    if (newOrder !== currentOrder) {
        try {
            const response = await fetch(`/api/destinations/tours/${tourId}/destinations/${destinationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ newOrder })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update order');
            }
            
            // Reload tour destinations to reflect changes
            await loadTourDestinations(tourId);
            
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Lỗi khi cập nhật thứ tự điểm đến.');
            // Reset to previous value
            input.value = currentOrder;
        }
    }
}

// Show modal to add a destination to a tour
function showAddDestinationToTourModal() {
    const tourId = document.getElementById('tourSelect').value;
    
    if (!tourId) {
        alert('Vui lòng chọn một tour trước');
        return;
    }
    
    // Xóa modal cũ nếu tồn tại
    const existingModal = document.getElementById('addTourDestinationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="addTourDestinationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Thêm điểm đến cho tour</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addTourDestinationForm">
                            <div class="mb-3">
                                <label for="destinationSelect" class="form-label">Chọn điểm đến</label>
                                <select id="destinationSelect" class="form-select" required>
                                    <option value="">Chọn điểm đến</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="destinationOrder" class="form-label">Thứ tự điểm đến</label>
                                <input type="number" class="form-control" id="destinationOrder" min="1" value="1" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-primary" id="confirmAddTourDestination">Thêm</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('addTourDestinationModal'));
    
    // Load destinations for selection
    loadDestinationsForSelect();
    
    // Add event listener for form submission
    document.getElementById('confirmAddTourDestination').addEventListener('click', async () => {
        const destinationId = document.getElementById('destinationSelect').value;
        const order = document.getElementById('destinationOrder').value;
        
        if (!destinationId) {
            alert('Vui lòng chọn một điểm đến');
            return;
        }
        
        try {
            const response = await fetch(`/api/destinations/tours/${tourId}/destinations/${destinationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ order })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add destination to tour');
            }
            
            // Close modal
            modal.hide();
            
            // Xóa modal khỏi DOM sau khi ẩn
            setTimeout(() => {
                const modalElement = document.getElementById('addTourDestinationModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 300);
            
            // Reload tour destinations
            await loadTourDestinations(tourId);
            
        } catch (error) {
            console.error('Error adding destination to tour:', error);
            alert('Lỗi khi thêm điểm đến vào tour.');
        }
    });
    
    // Show modal
    modal.show();
    
    // Clean up on hidden
    document.getElementById('addTourDestinationModal').addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
            const modalElement = document.getElementById('addTourDestinationModal');
            if (modalElement) {
                modalElement.remove();
            }
        }, 300);
    });
}

// Load destinations for select dropdown
async function loadDestinationsForSelect() {
    try {
        const response = await fetch('/api/destinations');
        const data = await response.json();
        
        if (!data.data || !data.data.destinations) {
            console.error('Invalid response format');
            return;
        }
        
        const destinations = data.data.destinations;
        const select = document.getElementById('destinationSelect');
        
        destinations.forEach(destination => {
            const option = document.createElement('option');
            option.value = destination.Ma_dia_danh;
            option.textContent = `${destination.Ma_dia_danh} - ${destination.Ten_dia_danh}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading destinations for select:', error);
    }
}

// Handle destination actions (view, edit, delete, manage)
function handleDestinationActions(e) {
    // Xử lý nút sửa điểm đến
    if (e.target.closest('.btn-edit-destination')) {
        const btn = e.target.closest('.btn-edit-destination');
        const destinationId = btn.dataset.id;
        editDestination(destinationId);
    }
    
    // Xử lý nút xóa điểm đến
    if (e.target.closest('.btn-delete-destination')) {
        const btn = e.target.closest('.btn-delete-destination');
        const destinationId = btn.dataset.id;
        
        if (confirm('Bạn có chắc chắn muốn xóa điểm đến này không?')) {
            deleteDestination(destinationId);
        }
    }
    
    // Xử lý nút xem chi tiết điểm đến
    if (e.target.closest('.btn-view-destination')) {
        const btn = e.target.closest('.btn-view-destination');
        const destinationId = btn.dataset.id;
        viewDestination(destinationId);
    }
    
    // Handle "Chọn cho tour" button click
    if (e.target.closest('.btn-manage-tour-destination')) {
        const btn = e.target.closest('.btn-manage-tour-destination');
        const destinationId = btn.dataset.id;
        const destinationName = btn.dataset.name;
        
        // Focus on the tour destinations section
        document.getElementById('tourDestinationsContainer').scrollIntoView({ behavior: 'smooth' });
        
        // If a tour is already selected, show confirmation to add this destination
        const tourSelect = document.getElementById('tourSelect');
        const selectedTourId = tourSelect.value;
        
        if (selectedTourId) {
            const selectedTourName = tourSelect.options[tourSelect.selectedIndex].text;
            
            if (confirm(`Bạn muốn thêm điểm đến "${destinationName}" vào tour "${selectedTourName}"?`)) {
                // Show modal with pre-selected destination
                showAddDestinationModalForSpecificDestination(selectedTourId, destinationId);
            }
        } else {
            // Alert user to select a tour first
            alert('Vui lòng chọn một tour trước để thêm điểm đến này.');
            document.getElementById('tourSelect').focus();
        }
    }
    
    // Handle remove destination from tour
    if (e.target.closest('.btn-remove-tour-destination')) {
        const btn = e.target.closest('.btn-remove-tour-destination');
        const tourId = btn.dataset.tour;
        const destinationId = btn.dataset.destination;
        
        if (confirm('Bạn có chắc chắn muốn xóa điểm đến này khỏi tour?')) {
            removeDestinationFromTour(tourId, destinationId);
        }
    }
}

// Show add destination modal for a specific destination
function showAddDestinationModalForSpecificDestination(tourId, destinationId) {
    // Xóa modal cũ nếu tồn tại
    const existingModal = document.getElementById('addSpecificDestinationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML similar to showAddDestinationToTourModal but with pre-selected destination
    const modalHtml = `
        <div class="modal fade" id="addSpecificDestinationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Thêm điểm đến cho tour</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addSpecificDestinationForm">
                            <div class="mb-3">
                                <label for="destinationOrder" class="form-label">Thứ tự điểm đến</label>
                                <input type="number" class="form-control" id="specificDestinationOrder" min="1" value="1" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-primary" id="confirmAddSpecificDestination">Thêm</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('addSpecificDestinationModal'));
    
    // Add event listener for form submission
    document.getElementById('confirmAddSpecificDestination').addEventListener('click', async () => {
        const order = document.getElementById('specificDestinationOrder').value;
        
        try {
            const response = await fetch(`/api/destinations/tours/${tourId}/destinations/${destinationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ order })
            });
            
            if (!response.ok) {
                throw new Error('Failed to add destination to tour');
            }
            
            // Close modal
            modal.hide();
            
            // Xóa modal khỏi DOM sau khi ẩn
            setTimeout(() => {
                const modalElement = document.getElementById('addSpecificDestinationModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 300);
            
            // Reload tour destinations
            await loadTourDestinations(tourId);
            
        } catch (error) {
            console.error('Error adding destination to tour:', error);
            alert('Lỗi khi thêm điểm đến vào tour.');
        }
    });
    
    // Show modal
    modal.show();
    
    // Clean up on hidden
    document.getElementById('addSpecificDestinationModal').addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
            const modalElement = document.getElementById('addSpecificDestinationModal');
            if (modalElement) {
                modalElement.remove();
            }
        }, 300);
    });
}

// Remove destination from tour
async function removeDestinationFromTour(tourId, destinationId) {
    try {
        const response = await fetch(`/api/destinations/tours/${tourId}/destinations/${destinationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to remove destination from tour');
        }
        
        // Reload tour destinations
        await loadTourDestinations(tourId);
        
    } catch (error) {
        console.error('Error removing destination from tour:', error);
        alert('Lỗi khi xóa điểm đến khỏi tour.');
    }
}

// Hàm xóa điểm đến
async function deleteDestination(destinationId) {
    try {
        // Trước khi xóa, kiểm tra xem điểm đến này có đang được sử dụng trong tour nào không
        const checkResponse = await fetch(`/api/destinations/${destinationId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!checkResponse.ok) {
            throw new Error('Failed to check destination');
        }
        
        const checkData = await checkResponse.json();
        
        // Nếu điểm đến đang được sử dụng trong tour
        if (checkData.data.tours && checkData.data.tours.length > 0) {
            // Hiển thị danh sách tour đang sử dụng điểm đến
            let tourList = checkData.data.tours.map(tour => `- ${tour.Ten_tour} (${tour.Ma_tour})`).join('\n');
            alert(`Không thể xóa điểm đến này vì nó đang được sử dụng trong các tour sau:\n${tourList}\n\nVui lòng xóa điểm đến này khỏi các tour trước khi xóa.`);
            return;
        }
        
        // Nếu điểm đến không được sử dụng trong tour nào, tiến hành xóa
        const response = await fetch(`/api/destinations/${destinationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete destination');
        }
        
        // Tải lại danh sách điểm đến
        await loadDestinations();
        
        alert('Xóa điểm đến thành công!');
    } catch (error) {
        console.error('Error deleting destination:', error);
        alert('Lỗi khi xóa điểm đến: ' + error.message);
    }
}

// Hàm sửa điểm đến
async function editDestination(destinationId) {
    try {
        // Lấy thông tin điểm đến từ API
        const response = await fetch(`/api/destinations/${destinationId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load destination details');
        }
        
        const data = await response.json();
        const destination = data.data.destination;
        
        // Tạo modal chỉnh sửa
        const modalHtml = `
            <div class="modal fade" id="editDestinationModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chỉnh sửa điểm đến</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editDestinationForm">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label for="editDestinationId" class="form-label">Mã điểm đến</label>
                                        <input type="text" class="form-control" id="editDestinationId" value="${destination.Ma_dia_danh}" readonly>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label for="editDestinationName" class="form-label">Tên điểm đến</label>
                                        <input type="text" class="form-control" id="editDestinationName" value="${destination.Ten_dia_danh || ''}" required>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="editDestinationDescription" class="form-label">Mô tả</label>
                                    <textarea class="form-control" id="editDestinationDescription" rows="4">${destination.Mo_ta || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="editDestinationImage" class="form-label">Hình ảnh</label>
                                    <input type="file" class="form-control" id="editDestinationImage">
                                    ${destination.Hinh_anh ? `
                                    <div class="mt-2">
                                        <img src="${destination.Hinh_anh}" class="img-thumbnail" style="max-height: 150px">
                                    </div>` : ''}
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                            <button type="button" class="btn btn-primary" id="saveEditDestination">Lưu</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Xóa modal cũ nếu tồn tại
        const existingModal = document.getElementById('editDestinationModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Thêm modal vào DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('editDestinationModal'));
        modal.show();
        
        // Xử lý sự kiện lưu
        document.getElementById('saveEditDestination').addEventListener('click', async () => {
            try {
                const formData = new FormData();
                formData.append('ten_dia_danh', document.getElementById('editDestinationName').value);
                formData.append('mo_ta', document.getElementById('editDestinationDescription').value);
                
                const imageFile = document.getElementById('editDestinationImage').files[0];
                if (imageFile) {
                    formData.append('hinh_anh', imageFile);
                }
                
                const updateResponse = await fetch(`/api/destinations/${destinationId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.message || 'Failed to update destination');
                }
                
                // Ẩn modal
                modal.hide();
                
                // Xóa modal khỏi DOM sau khi ẩn
                setTimeout(() => {
                    const modalElement = document.getElementById('editDestinationModal');
                    if (modalElement) {
                        modalElement.remove();
                    }
                }, 300);
                
                // Tải lại danh sách điểm đến
                await loadDestinations();
                
                alert('Cập nhật điểm đến thành công!');
            } catch (error) {
                console.error('Error updating destination:', error);
                alert('Lỗi khi cập nhật điểm đến: ' + error.message);
            }
        });
        
        // Clean up on hidden
        document.getElementById('editDestinationModal').addEventListener('hidden.bs.modal', () => {
            setTimeout(() => {
                const modalElement = document.getElementById('editDestinationModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 300);
        });
        
    } catch (error) {
        console.error('Error loading destination details:', error);
        alert('Lỗi khi tải thông tin điểm đến: ' + error.message);
    }
}

// Hàm xem chi tiết điểm đến
async function viewDestination(destinationId) {
    try {
        // Lấy thông tin điểm đến từ API
        const response = await fetch(`/api/destinations/${destinationId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load destination details');
        }
        
        const data = await response.json();
        const destination = data.data.destination;
        
        // Tạo modal xem chi tiết
        const modalHtml = `
            <div class="modal fade" id="viewDestinationModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết điểm đến</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Mã điểm đến:</strong> ${destination.Ma_dia_danh}</p>
                                    <p><strong>Tên điểm đến:</strong> ${destination.Ten_dia_danh || 'Chưa có'}</p>
                                    <div class="mb-3">
                                        <strong>Mô tả:</strong>
                                        <p>${destination.Mo_ta || 'Chưa có mô tả'}</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    ${destination.Hinh_anh ? 
                                        `<img src="${destination.Hinh_anh}" class="img-fluid rounded" alt="${destination.Ten_dia_danh}">` : 
                                        '<p class="text-muted">Không có hình ảnh</p>'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Xóa modal cũ nếu tồn tại
        const existingModal = document.getElementById('viewDestinationModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Thêm modal vào DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('viewDestinationModal'));
        modal.show();
        
        // Clean up on hidden
        document.getElementById('viewDestinationModal').addEventListener('hidden.bs.modal', () => {
            setTimeout(() => {
                const modalElement = document.getElementById('viewDestinationModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 300);
        });
    } catch (error) {
        console.error('Error loading destination details:', error);
        alert('Lỗi khi tải thông tin điểm đến.');
    }
}

// Hiển thị modal thêm điểm đến mới
function showAddDestinationModal() {
    // Xóa modal cũ nếu tồn tại
    const existingModal = document.getElementById('addDestinationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Tạo modal thêm mới
    const modalHtml = `
        <div class="modal fade" id="addDestinationModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Thêm điểm đến mới</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addDestinationForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="addDestinationId" class="form-label">Mã điểm đến</label>
                                    <input type="text" class="form-control" id="addDestinationId" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="addDestinationName" class="form-label">Tên điểm đến</label>
                                    <input type="text" class="form-control" id="addDestinationName" required>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="addDestinationDescription" class="form-label">Mô tả</label>
                                <textarea class="form-control" id="addDestinationDescription" rows="4"></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="addDestinationImage" class="form-label">Hình ảnh</label>
                                <input type="file" class="form-control" id="addDestinationImage">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-primary" id="saveAddDestination">Lưu</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Thêm modal vào DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('addDestinationModal'));
    modal.show();
    
    // Xử lý sự kiện lưu
    document.getElementById('saveAddDestination').addEventListener('click', async () => {
        try {
            const maDD = document.getElementById('addDestinationId').value;
            const tenDD = document.getElementById('addDestinationName').value;
            const moTa = document.getElementById('addDestinationDescription').value;
            const hinhAnh = document.getElementById('addDestinationImage').files[0];
            
            if (!maDD || !tenDD) {
                alert('Vui lòng nhập đầy đủ mã và tên điểm đến');
                return;
            }
            
            const formData = new FormData();
            formData.append('ma_dia_danh', maDD);
            formData.append('ten_dia_danh', tenDD);
            formData.append('mo_ta', moTa);
            
            if (hinhAnh) {
                formData.append('hinh_anh', hinhAnh);
            }
            
            const response = await fetch('/api/destinations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create destination');
            }
            
            // Ẩn modal
            modal.hide();
            
            // Xóa modal khỏi DOM sau khi ẩn
            setTimeout(() => {
                const modalElement = document.getElementById('addDestinationModal');
                if (modalElement) {
                    modalElement.remove();
                }
            }, 300);
            
            // Tải lại danh sách điểm đến
            await loadDestinations();
            
            alert('Thêm điểm đến mới thành công!');
        } catch (error) {
            console.error('Error creating destination:', error);
            alert('Lỗi khi thêm điểm đến mới: ' + error.message);
        }
    });
    
    // Clean up on hidden
    document.getElementById('addDestinationModal').addEventListener('hidden.bs.modal', () => {
        setTimeout(() => {
            const modalElement = document.getElementById('addDestinationModal');
            if (modalElement) {
                modalElement.remove();
            }
        }, 300);
    });
}
