/**
 * MoMo Payment Configuration
 */

const MOMO_CONFIG = {
    PARTNER_CODE: process.env.MOMO_PARTNER_CODE || "MOMO",
    ACCESS_KEY: process.env.MOMO_ACCESS_KEY || "",
    SECRET_KEY: process.env.MOMO_SECRET_KEY || "",
    
    // API endpoints
    CREATE_PAYMENT_URL: `${process.env.MOMO_API_URL || "https://test-payment.momo.vn/v2/gateway/api"}/create`,
    QUERY_PAYMENT_URL: `${process.env.MOMO_API_URL || "https://test-payment.momo.vn/v2/gateway/api"}/query`,
    REFUND_PAYMENT_URL: `${process.env.MOMO_API_URL || "https://test-payment.momo.vn/v2/gateway/api"}/refund`,
    
    // Callback URLs
    REDIRECT_URL: process.env.MOMO_REDIRECT_URL || "",
    IPN_URL: process.env.MOMO_IPN_URL || "",
    
    // Request type
    REQUEST_TYPE: "captureWallet",
    
    // Language
    LANG: "vi"
};

module.exports = MOMO_CONFIG;
