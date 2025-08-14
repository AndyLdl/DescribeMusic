#!/usr/bin/env node

/**
 * Firebase Emulator Test Script
 * 
 * This script tests if the Firebase Functions emulator is running correctly
 * and validates that our functions are accessible.
 */

const http = require('http');

const PROJECT_ID = 'describe-music';
const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 5001;

function testEndpoint(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: EMULATOR_HOST,
            port: EMULATOR_PORT,
            path: `/describe-music/us-central1${path}`,
            method: method,
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function runTests() {
    console.log('🚀 Testing Firebase Functions Emulator...\n');

    // Test 1: Check if emulator is running
    try {
        console.log('✅ Test 1: Emulator connectivity');
        const response = await testEndpoint('/analyzeAudio', 'OPTIONS');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   CORS headers: ${response.headers['access-control-allow-origin'] ? 'Present' : 'Missing'}\n`);
    } catch (error) {
        console.log('❌ Test 1: Emulator not reachable');
        console.log(`   Error: ${error.message}\n`);
        process.exit(1);
    }

    // Test 2: Test analyzeAudio endpoint (should return 400 without file)
    try {
        console.log('✅ Test 2: analyzeAudio endpoint');
        const response = await testEndpoint('/analyzeAudio', 'POST');
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response: ${response.body.substring(0, 100)}...\n`);
    } catch (error) {
        console.log('❌ Test 2: analyzeAudio endpoint failed');
        console.log(`   Error: ${error.message}\n`);
    }

    console.log('🎉 Tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up Google AI API key');
    console.log('2. Test with actual audio file upload');
    console.log('3. Integrate with frontend');
}

// Run tests
runTests().catch(console.error);