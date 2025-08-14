// 简单的v2函数测试
const {
    onRequest
} = require('firebase-functions/v2/https');

exports.simpleTest = onRequest((req, res) => {
    res.json({
        message: 'Hello from Firebase Functions v2!',
        timestamp: new Date().toISOString()
    });
});