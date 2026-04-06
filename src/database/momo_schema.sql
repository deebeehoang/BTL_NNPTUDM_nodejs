-- Add MoMo payment columns to Booking table
ALTER TABLE Booking 
ADD COLUMN IF NOT EXISTS MoMo_request_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS MoMo_order_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS MoMo_trans_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS MoMo_amount DECIMAL(18,2) NULL;

-- Add index for MoMo fields for better performance
CREATE INDEX IF NOT EXISTS idx_booking_momo_request_id ON Booking(MoMo_request_id);
CREATE INDEX IF NOT EXISTS idx_booking_momo_order_id ON Booking(MoMo_order_id);
CREATE INDEX IF NOT EXISTS idx_booking_momo_trans_id ON Booking(MoMo_trans_id);
