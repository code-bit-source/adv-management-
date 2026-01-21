/**
 * Comprehensive API Endpoint Tester
 * Tests all endpoints with proper setup and teardown
 */

import axios from 'axios';
import bcrypt from 'bcryptjs';

const BASE_URL = 'http://localhost:5000/api';

let passedTests = 0;
let failedTests = 0;
let authToken = null;
let testUserId = null;
let testCaseId = null;
let testNoteId = null;

const http = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Don't throw on any status code
});

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.success !== false) {
      console.log(`✅ ${name}`);
      passedTests++;
      return result;
    } else {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${result.message}`);
      failedTests++;
      return result;
    }
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
    return null;
  }
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   API ENDPOINT TESTS                 ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Auth Tests
  console.log('[TEST GROUP] Authentication\n');

  let signupEmail = `testuser${Date.now()}@test.com`;
  let signupResult = null;

  await test('POST /auth/signup', async () => {
    const response = await http.post('/auth/signup', {
      name: 'Test User',
      email: signupEmail,
      password: 'Test123!',
      role: 'admin'  // Admin can create cases and tasks without connections
    });
    signupResult = response.data;
    return response.data;
  });

  await test('POST /auth/login', async () => {
    const response = await http.post('/auth/login', {
      email: signupEmail,
      password: 'Test123!'
    });
    if (response.data.token) {
      authToken = response.data.token;
      http.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    }
    if (response.data.user && response.data.user.id) {
      testUserId = response.data.user.id;
    }
    return response.data;
  });

  if (!authToken) {
    console.log('\n⚠️  Could not obtain auth token. Skipping protected endpoints.\n');
    printSummary();
    return;
  }

  // Case Tests
  console.log('\n[TEST GROUP] Cases\n');

  // Create a client and advocate for the case
  let clientId = null;
  let advocateId = null;
  
  const clientSignup = await http.post('/auth/signup', {
    name: 'Test Client',
    email: `client${Date.now()}@test.com`,
    password: 'Test123!',
    role: 'client'
  });
  
  if (clientSignup.data && clientSignup.data.user && clientSignup.data.user.id) {
    clientId = clientSignup.data.user.id;
  }

  const advocateSignup = await http.post('/auth/signup', {
    name: 'Test Advocate',
    email: `advocate${Date.now()}@test.com`,
    password: 'Test123!',
    role: 'advocate'
  });
  
  if (advocateSignup.data && advocateSignup.data.user && advocateSignup.data.user.id) {
    advocateId = advocateSignup.data.user.id;
  }

  await test('POST /cases (Create case)', async () => {
    // Admin can create cases with any client and advocate
    const response = await http.post('/cases', {
      title: 'Test Case',
      description: 'Test case description',
      category: 'civil',
      status: 'active',
      clientId: clientId,
      advocateId: advocateId,
      createdBy: testUserId
    });
    if (response.data && response.data.case && response.data.case._id) {
      testCaseId = response.data.case._id;
    } else if (response.data && response.data._id) {
      testCaseId = response.data._id;
    }
    return response.data;
  });

  if (testCaseId) {
    await test(`GET /cases/${testCaseId}`, async () => {
      const response = await http.get(`/cases/${testCaseId}`);
      return response.data;
    });

    await test(`PUT /cases/${testCaseId}`, async () => {
      const response = await http.put(`/cases/${testCaseId}`, {
        status: 'pending'
      });
      return response.data;
    });
  }

  await test('GET /cases (List cases)', async () => {
    const response = await http.get('/cases');
    return response.data;
  });

  // Note Tests
  console.log('\n[TEST GROUP] Notes\n');

  await test('POST /notes (Create note)', async () => {
    const response = await http.post('/notes', {
      title: 'Test Note',
      content: 'Test note content',
      category: 'personal',
      priority: 'medium'
    });
    if (response.data && response.data.note && response.data.note._id) {
      testNoteId = response.data.note._id;
    } else if (response.data && response.data._id) {
      testNoteId = response.data._id;
    }
    return response.data;
  });

  await test('GET /notes (List notes)', async () => {
    const response = await http.get('/notes');
    return response.data;
  });

  if (testNoteId) {
    await test(`GET /notes/${testNoteId}`, async () => {
      const response = await http.get(`/notes/${testNoteId}`);
      return response.data;
    });

    await test(`PUT /notes/${testNoteId}`, async () => {
      const response = await http.put(`/notes/${testNoteId}`, {
        title: 'Updated Note Title'
      });
      return response.data;
    });
  }

  // Task Tests
  console.log('\n[TEST GROUP] Tasks\n');

  let testTaskId = null;

  // Create a paralegal for task assignment
  let paralegalId = null;
  console.log('Creating test paralegal...');
  
  const paralegalSignup = await http.post('/auth/signup', {
    name: 'Test Paralegal',
    email: `paralegal${Date.now()}@test.com`,
    password: 'Test123!',
    role: 'paralegal'
  });
  
  if (paralegalSignup.data && paralegalSignup.data.user && paralegalSignup.data.user.id) {
    paralegalId = paralegalSignup.data.user.id;
    console.log(`Paralegal created with ID: ${paralegalId}`);
  } else {
    console.log('Failed to create paralegal');
  }

  await test('POST /tasks (Create task)', async () => {
    if (!testCaseId || !paralegalId) {
      throw new Error('Case or paralegal not created');
    }
    const response = await http.post('/tasks', {
      title: 'Test Task',
      description: 'Test task description',
      caseId: testCaseId,
      assignedTo: paralegalId,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'high'
    });
    if (response.data && response.data.task && response.data.task._id) {
      testTaskId = response.data.task._id;
    } else if (response.data && response.data._id) {
      testTaskId = response.data._id;
    }
    return response.data;
  });

  await test('GET /tasks (List tasks)', async () => {
    const response = await http.get('/tasks');
    return response.data;
  });

  if (testTaskId) {
    await test(`GET /tasks/${testTaskId}`, async () => {
      const response = await http.get(`/tasks/${testTaskId}`);
      return response.data;
    });

    await test(`PUT /tasks/${testTaskId}`, async () => {
      const response = await http.put(`/tasks/${testTaskId}`, {
        status: 'in_progress'
      });
      return response.data;
    });

    await test(`DELETE /tasks/${testTaskId}`, async () => {
      const response = await http.delete(`/tasks/${testTaskId}`);
      return response.data;
    });
  }

  // Notification Tests
  console.log('\n[TEST GROUP] Notifications\n');

  await test('GET /notifications (List notifications)', async () => {
    const response = await http.get('/notifications');
    return response.data;
  });

  await test('GET /notifications/unread-count', async () => {
    const response = await http.get('/notifications/unread-count');
    return response.data;
  });

  // Reminder Tests
  console.log('\n[TEST GROUP] Reminders\n');

  let testReminderId = null;

  await test('POST /reminders (Create reminder)', async () => {
    const response = await http.post('/reminders', {
      title: 'Test Reminder',
      message: 'Test reminder message',
      type: 'custom_reminder',
      reminderDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      recipients: [testUserId],
      priority: 'high'
    });
    if (response.data && response.data.reminder && response.data.reminder._id) {
      testReminderId = response.data.reminder._id;
    } else if (response.data && response.data._id) {
      testReminderId = response.data._id;
    }
    return response.data;
  });

  await test('GET /reminders (List reminders)', async () => {
    const response = await http.get('/reminders');
    return response.data;
  });

  await test('GET /reminders/upcoming', async () => {
    const response = await http.get('/reminders/upcoming');
    return response.data;
  });

  if (testReminderId) {
    await test(`GET /reminders/${testReminderId}`, async () => {
      const response = await http.get(`/reminders/${testReminderId}`);
      return response.data;
    });

    await test(`DELETE /reminders/${testReminderId}`, async () => {
      const response = await http.delete(`/reminders/${testReminderId}`);
      return response.data;
    });
  }

  // Message Tests
  console.log('\n[TEST GROUP] Messages\n');

  await test('GET /messages (List messages)', async () => {
    const response = await http.get('/messages');
    return response.data;
  });

  // Activity Tests
  console.log('\n[TEST GROUP] Activities\n');

  await test('GET /activities/recent (Get recent activities)', async () => {
    const response = await http.get('/activities/recent');
    return response.data;
  });

  // Connection Tests
  console.log('\n[TEST GROUP] Connections\n');

  await test('GET /connections (List connections)', async () => {
    const response = await http.get('/connections');
    return response.data;
  });

  // Document Tests
  console.log('\n[TEST GROUP] Documents\n');

  await test('GET /documents (List documents)', async () => {
    const response = await http.get('/documents');
    return response.data;
  });

  // Cleanup
  console.log('\n[TEST GROUP] Cleanup\n');

  if (testNoteId) {
    await test(`DELETE /notes/${testNoteId}`, async () => {
      const response = await http.delete(`/notes/${testNoteId}`);
      return response.data;
    });
  }

  if (testCaseId) {
    await test(`DELETE /cases/${testCaseId}`, async () => {
      const response = await http.delete(`/cases/${testCaseId}`);
      return response.data;
    });
  }

  printSummary();
}

function printSummary() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                       ║');
  console.log('╚══════════════════════════════════════╝\n');
  const total = passedTests + failedTests;
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / total) * 100).toFixed(2)}%\n`);
  
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
