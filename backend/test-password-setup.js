/**
 * Test Script for Password Setup Feature
 * 
 * This script tests the new password setup functionality for Google users
 * Run this after starting your server to verify everything works correctly
 */

const BASE_URL = 'http://localhost:5000/api/auth';

// Test data
const testUser = {
  email: 'test.google.user@example.com',
  name: 'Test Google User',
  role: 'client'
};

const testPassword = {
  password: 'TestPassword123',
  confirmPassword: 'TestPassword123'
};

const weakPassword = {
  password: 'weak',
  confirmPassword: 'weak'
};

const mismatchPassword = {
  password: 'TestPassword123',
  confirmPassword: 'DifferentPassword123'
};

// Helper function to make requests
async function makeRequest(endpoint, method, body, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error('Request failed:', error);
    return { status: 500, data: { error: error.message } };
  }
}

// Test functions
async function testSetPasswordWithoutToken() {
  console.log('\n🧪 Test 1: Set password without authentication token');
  console.log('Expected: 401 Unauthorized');
  
  const result = await makeRequest('/set-password', 'POST', testPassword);
  
  if (result.status === 401) {
    console.log('✅ PASSED: Correctly rejected unauthenticated request');
  } else {
    console.log('❌ FAILED: Should have returned 401');
  }
  console.log('Response:', result.data);
}

async function testWeakPassword(token) {
  console.log('\n🧪 Test 2: Set weak password');
  console.log('Expected: 400 Bad Request - Password validation error');
  
  const result = await makeRequest('/set-password', 'POST', weakPassword, token);
  
  if (result.status === 400 && result.data.message.includes('6 characters')) {
    console.log('✅ PASSED: Correctly rejected weak password');
  } else {
    console.log('❌ FAILED: Should have rejected weak password');
  }
  console.log('Response:', result.data);
}

async function testPasswordMismatch(token) {
  console.log('\n🧪 Test 3: Set password with mismatch');
  console.log('Expected: 400 Bad Request - Passwords do not match');
  
  const result = await makeRequest('/set-password', 'POST', mismatchPassword, token);
  
  if (result.status === 400 && result.data.message.includes('do not match')) {
    console.log('✅ PASSED: Correctly detected password mismatch');
  } else {
    console.log('❌ FAILED: Should have detected password mismatch');
  }
  console.log('Response:', result.data);
}

async function testSetPasswordSuccess(token) {
  console.log('\n🧪 Test 4: Set password successfully');
  console.log('Expected: 200 OK - Password set successfully');
  
  const result = await makeRequest('/set-password', 'POST', testPassword, token);
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED: Password set successfully');
  } else {
    console.log('❌ FAILED: Should have set password successfully');
  }
  console.log('Response:', result.data);
  return result.data.success;
}

async function testSetPasswordAgain(token) {
  console.log('\n🧪 Test 5: Try to set password again');
  console.log('Expected: 400 Bad Request - Password already set');
  
  const result = await makeRequest('/set-password', 'POST', testPassword, token);
  
  if (result.status === 400 && result.data.message.includes('already set')) {
    console.log('✅ PASSED: Correctly prevented duplicate password setup');
  } else {
    console.log('❌ FAILED: Should have prevented duplicate password setup');
  }
  console.log('Response:', result.data);
}

async function testLoginWithPassword() {
  console.log('\n🧪 Test 6: Login with newly set password');
  console.log('Expected: 200 OK - Login successful');
  
  const result = await makeRequest('/login', 'POST', {
    email: testUser.email,
    password: testPassword.password
  });
  
  if (result.status === 200 && result.data.success) {
    console.log('✅ PASSED: Successfully logged in with password');
  } else {
    console.log('❌ FAILED: Should have logged in successfully');
  }
  console.log('Response:', result.data);
}

async function testLoginWithoutPassword() {
  console.log('\n🧪 Test 7: Google user tries to login without setting password');
  console.log('Expected: 403 Forbidden - Requires password setup');
  
  // This test requires a fresh Google user without password
  console.log('⚠️  SKIPPED: Requires manual Google signup without password');
  console.log('   To test manually:');
  console.log('   1. Sign up a new user with Google');
  console.log('   2. Try to login with email/password immediately');
  console.log('   3. Should get error with requiresPasswordSetup: true');
}

// Main test runner
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 Password Setup Feature - Test Suite');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n⚠️  IMPORTANT: This test suite requires:');
  console.log('   1. Server running on http://localhost:5000');
  console.log('   2. A Google-authenticated user token');
  console.log('   3. MongoDB connection active');
  console.log('\n📝 Manual Setup Required:');
  console.log('   1. Sign up a test user with Google');
  console.log('   2. Copy the JWT token from the response');
  console.log('   3. Replace TOKEN_HERE in this file with your token');
  console.log('   4. Run: node test-password-setup.js');
  console.log('═══════════════════════════════════════════════════════\n');

  // Replace this with actual token from Google signup
  const GOOGLE_USER_TOKEN = 'TOKEN_HERE';

  if (GOOGLE_USER_TOKEN === 'TOKEN_HERE') {
    console.log('❌ ERROR: Please set a valid Google user token first!');
    console.log('\nSteps to get token:');
    console.log('1. Use Postman or curl to sign up with Google:');
    console.log('   POST http://localhost:5000/api/auth/google/signup');
    console.log('   Body: { "credential": "google_id_token", "role": "client" }');
    console.log('2. Copy the "token" from the response');
    console.log('3. Replace TOKEN_HERE in this file with that token');
    console.log('4. Run this script again\n');
    return;
  }

  try {
    // Run all tests
    await testSetPasswordWithoutToken();
    await testWeakPassword(GOOGLE_USER_TOKEN);
    await testPasswordMismatch(GOOGLE_USER_TOKEN);
    const passwordSet = await testSetPasswordSuccess(GOOGLE_USER_TOKEN);
    
    if (passwordSet) {
      await testSetPasswordAgain(GOOGLE_USER_TOKEN);
      await testLoginWithPassword();
    }
    
    await testLoginWithoutPassword();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Test Suite Completed!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
