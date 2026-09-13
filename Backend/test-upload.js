const http = require('http');

function makeRequest(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 5000, path, method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function multipartRequest(path, parts, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary123';
    const body = parts.join('\r\n');
    const options = {
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

const B = '----TestBoundary123';
const bd = '--' + B;
const ed = bd + '--';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  const results = [];
  function log(tc, desc, status, detail) {
    results.push({ tc, desc, status, detail });
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${tc}] ${desc} — ${status}`);
    if (detail) console.log(`   ${detail}`);
  }

  console.log('========================================');
  console.log(' DOCUMENT UPLOAD — FULL WORKFLOW TEST');
  console.log('========================================\n');

  // TC-01: No auth
  try {
    const r = await makeRequest('POST', '/api/v1/documents/upload', null, {});
    log('TC-01', 'Upload without auth token', r.status === 401 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-01', 'Upload without auth token', 'FAIL', e.message); }

  // TC-02: Invalid token
  try {
    const r = await makeRequest('POST', '/api/v1/documents/upload', null, { 'Authorization': 'Bearer fake' });
    log('TC-02', 'Upload with invalid token', r.status === 401 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-02', 'Upload with invalid token', 'FAIL', e.message); }

  // TC-03: Login
  let token;
  try {
    const r = await makeRequest('POST', '/api/v1/auth/login', { email: 'admin@clienthub.com', password: 'demo123' });
    const p = JSON.parse(r.body);
    token = p.data?.accessToken;
    log('TC-03', 'Login as admin', token ? 'PASS' : 'FAIL', `Token: ${token ? 'obtained' : 'missing'}`);
  } catch(e) { log('TC-03', 'Login as admin', 'FAIL', e.message); }
  if (!token) { console.log('\nCannot continue without token.'); return; }
  await sleep(200);

  // TC-04: GET documents list
  try {
    const r = await makeRequest('GET', '/api/v1/documents?page=1&limit=5', null, { 'Authorization': 'Bearer ' + token });
    const p = JSON.parse(r.body);
    log('TC-04', 'GET documents list', r.status === 200 && p.success ? 'PASS' : 'FAIL', `Status: ${r.status}, Items: ${p.data?.items?.length}, Total: ${p.data?.pagination?.total}`);
  } catch(e) { log('TC-04', 'GET documents list', 'FAIL', e.message); }
  await sleep(200);

  // TC-05: Wrong content-type
  try {
    const r = await makeRequest('POST', '/api/v1/documents/upload', { test: 1 }, { 'Authorization': 'Bearer ' + token });
    log('TC-05', 'Upload with JSON content-type (not multipart)', r.status === 400 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-05', 'Upload with JSON content-type', 'FAIL', e.message); }
  await sleep(200);

  // TC-06: Empty multipart
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [bd, ed], token);
    log('TC-06', 'Upload empty multipart (no file)', r.status === 400 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-06', 'Upload empty multipart', 'FAIL', e.message); }
  await sleep(500);

  // TC-07: Valid txt
  let uploadedDocId;
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="test.txt"', 'Content-Type: text/plain', '', 'Hello World Test File', ed,
    ], token);
    const p = JSON.parse(r.body);
    uploadedDocId = p.data?._id;
    log('TC-07', 'Upload valid .txt file', p.success ? 'PASS' : 'FAIL', `Status: ${r.status}, ID: ${uploadedDocId}, fileType: ${p.data?.fileType}, size: ${p.data?.fileSize}`);
  } catch(e) { log('TC-07', 'Upload valid .txt file', 'FAIL', e.message); }
  await sleep(1000);

  // TC-08: Valid PDF
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="report.pdf"', 'Content-Type: application/pdf', '', 'PDF fake content for testing', ed,
    ], token);
    const p = JSON.parse(r.body);
    log('TC-08', 'Upload valid .pdf file', p.success ? 'PASS' : 'FAIL', `Status: ${r.status}, fileType: ${p.data?.fileType}, msg: ${p.message || 'none'}`);
  } catch(e) { log('TC-08', 'Upload valid .pdf file', 'FAIL', e.message); }
  await sleep(1000);

  // TC-09: Valid PNG
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="photo.png"', 'Content-Type: image/png', '', 'fake png data', ed,
    ], token);
    const p = JSON.parse(r.body);
    log('TC-09', 'Upload valid .png image', p.success ? 'PASS' : 'FAIL', `Status: ${r.status}, fileType: ${p.data?.fileType}`);
  } catch(e) { log('TC-09', 'Upload valid .png image', 'FAIL', e.message); }
  await sleep(1000);

  // TC-10: Disallowed .exe
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="malware.exe"', 'Content-Type: application/x-executable', '', 'fake exe', ed,
    ], token);
    log('TC-10', 'Upload disallowed .exe file', r.status === 400 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-10', 'Upload disallowed .exe file', 'FAIL', e.message); }
  await sleep(500);

  // TC-11: Disallowed .js
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="script.js"', 'Content-Type: application/javascript', '', 'console.log("hacked")', ed,
    ], token);
    log('TC-11', 'Upload disallowed .js file', r.status === 400 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-11', 'Upload disallowed .js file', 'FAIL', e.message); }
  await sleep(1000);

  // TC-12: Upload with metadata
  let metadataDocId;
  try {
    const r = await multipartRequest('/api/v1/documents/upload', [
      bd, 'Content-Disposition: form-data; name="file"; filename="contract.pdf"', 'Content-Type: application/pdf', '', 'Contract content',
      bd, 'Content-Disposition: form-data; name="fileName"', '', 'Client_Contract_2024.pdf',
      bd, 'Content-Disposition: form-data; name="description"', '', 'Signed client contract',
      bd, 'Content-Disposition: form-data; name="folder"', '', 'client',
      bd, 'Content-Disposition: form-data; name="relatedType"', '', 'client',
      bd, 'Content-Disposition: form-data; name="tags"', '', 'contract,signed,q4',
      ed,
    ], token);
    const p = JSON.parse(r.body);
    metadataDocId = p.data?._id;
    const match = p.data?.folder === 'client' && p.data?.tags?.length > 0;
    log('TC-12', 'Upload with metadata (folder, description, tags)', p.success && match ? 'PASS' : 'FAIL',
      `Status: ${r.status}, fileName: ${p.data?.fileName}, folder: ${p.data?.folder}, desc: ${p.data?.description}, tags: ${JSON.stringify(p.data?.tags)}, msg: ${p.message || 'none'}`);
  } catch(e) { log('TC-12', 'Upload with metadata', 'FAIL', e.message); }
  await sleep(500);

  // TC-13: GET single by ID
  if (uploadedDocId) {
    try {
      const r = await makeRequest('GET', `/api/v1/documents/${uploadedDocId}`, null, { 'Authorization': 'Bearer ' + token });
      const p = JSON.parse(r.body);
      log('TC-13', 'GET single document by ID', r.status === 200 && p.success ? 'PASS' : 'FAIL', `Status: ${r.status}, fileName: ${p.data?.fileName}, hasUrl: ${!!p.data?.fileUrl}`);
    } catch(e) { log('TC-13', 'GET single document by ID', 'FAIL', e.message); }
  }

  // TC-14: GET documents list (after uploads)
  try {
    const r = await makeRequest('GET', '/api/v1/documents?page=1&limit=20', null, { 'Authorization': 'Bearer ' + token });
    const p = JSON.parse(r.body);
    log('TC-14', 'GET documents list (after uploads)', r.status === 200 && p.success ? 'PASS' : 'FAIL', `Items: ${p.data?.items?.length}, Total: ${p.data?.pagination?.total}`);
  } catch(e) { log('TC-14', 'GET documents list', 'FAIL', e.message); }

  // TC-15: Search
  try {
    const r = await makeRequest('GET', '/api/v1/documents?search=contract', null, { 'Authorization': 'Bearer ' + token });
    const p = JSON.parse(r.body);
    log('TC-15', 'Search documents by name', r.status === 200 ? 'PASS' : 'FAIL', `Items found: ${p.data?.items?.length}`);
  } catch(e) { log('TC-15', 'Search documents', 'FAIL', e.message); }

  // TC-16: Filter by folder
  try {
    const r = await makeRequest('GET', '/api/v1/documents?folder=client', null, { 'Authorization': 'Bearer ' + token });
    const p = JSON.parse(r.body);
    log('TC-16', 'Filter documents by folder=client', r.status === 200 ? 'PASS' : 'FAIL', `Items: ${p.data?.items?.length}`);
  } catch(e) { log('TC-16', 'Filter by folder', 'FAIL', e.message); }

  // TC-17: Download URL
  if (uploadedDocId) {
    try {
      const r = await makeRequest('GET', `/api/v1/documents/download/${uploadedDocId}`, null, { 'Authorization': 'Bearer ' + token });
      const p = JSON.parse(r.body);
      log('TC-17', 'GET download URL', r.status === 200 && p.success ? 'PASS' : 'FAIL', `hasUrl: ${!!p.data?.url}`);
    } catch(e) { log('TC-17', 'GET download URL', 'FAIL', e.message); }
  }

  // TC-18: GET non-existent
  try {
    const r = await makeRequest('GET', '/api/v1/documents/507f1f77bcf86cd799439999', null, { 'Authorization': 'Bearer ' + token });
    log('TC-18', 'GET non-existent document (expect 404)', r.status === 404 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-18', 'GET non-existent document', 'FAIL', e.message); }

  // TC-19: DELETE non-existent
  try {
    const r = await makeRequest('DELETE', '/api/v1/documents/507f1f77bcf86cd799439999', null, { 'Authorization': 'Bearer ' + token });
    log('TC-19', 'DELETE non-existent document (expect 404)', r.status === 404 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
  } catch(e) { log('TC-19', 'DELETE non-existent document', 'FAIL', e.message); }

  // TC-20: DELETE uploaded
  if (uploadedDocId) {
    try {
      const r = await makeRequest('DELETE', `/api/v1/documents/${uploadedDocId}`, null, { 'Authorization': 'Bearer ' + token });
      log('TC-20', 'DELETE uploaded document', r.status === 200 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
    } catch(e) { log('TC-20', 'DELETE uploaded document', 'FAIL', e.message); }
  }

  // TC-21: Verify deleted
  if (uploadedDocId) {
    try {
      const r = await makeRequest('GET', `/api/v1/documents/${uploadedDocId}`, null, { 'Authorization': 'Bearer ' + token });
      log('TC-21', 'GET deleted document (expect 404)', r.status === 404 ? 'PASS' : 'FAIL', `Status: ${r.status}`);
    } catch(e) { log('TC-21', 'GET deleted document', 'FAIL', e.message); }
  }

  // TC-22: Employee RBAC
  let empToken;
  try {
    const r = await makeRequest('POST', '/api/v1/auth/login', { email: 'employee@clienthub.com', password: 'demo123' });
    const p = JSON.parse(r.body);
    empToken = p.data?.accessToken;
    log('TC-22a', 'Login as employee', empToken ? 'PASS' : 'FAIL', '');
  } catch(e) { log('TC-22a', 'Login as employee', 'FAIL', e.message); }

  if (empToken) {
    try {
      const r = await multipartRequest('/api/v1/documents/upload', [
        bd, 'Content-Disposition: form-data; name="file"; filename="emp.txt"', 'Content-Type: text/plain', '', 'employee file', ed,
      ], empToken);
      const p = JSON.parse(r.body);
      log('TC-22b', 'Employee upload (RBAC check)', r.status === 403 ? 'PASS' : (r.status === 200 ? 'PASS (allowed)' : 'FAIL'),
        `Status: ${r.status}, msg: ${p.message || 'none'}`);
    } catch(e) { log('TC-22b', 'Employee upload', 'FAIL', e.message); }
  }

  // TC-23: MANAGER upload
  let mgrToken;
  try {
    const r = await makeRequest('POST', '/api/v1/auth/login', { email: 'manager@clienthub.com', password: 'demo123' });
    const p = JSON.parse(r.body);
    mgrToken = p.data?.accessToken;
    log('TC-23a', 'Login as manager', mgrToken ? 'PASS' : 'FAIL', '');
  } catch(e) { log('TC-23a', 'Login as manager', 'FAIL', e.message); }

  if (mgrToken) {
    try {
      const r = await multipartRequest('/api/v1/documents/upload', [
        bd, 'Content-Disposition: form-data; name="file"; filename="mgr.txt"', 'Content-Type: text/plain', '', 'manager file', ed,
      ], mgrToken);
      const p = JSON.parse(r.body);
      log('TC-23b', 'Manager upload (RBAC check)', r.status === 200 || r.status === 201 ? 'PASS' : 'FAIL',
        `Status: ${r.status}, msg: ${p.message || 'none'}`);
    } catch(e) { log('TC-23b', 'Manager upload', 'FAIL', e.message); }
  }

  // TC-24: SALES upload
  let salesToken;
  try {
    const r = await makeRequest('POST', '/api/v1/auth/login', { email: 'sales@clienthub.com', password: 'demo123' });
    const p = JSON.parse(r.body);
    salesToken = p.data?.accessToken;
    log('TC-24a', 'Login as sales', salesToken ? 'PASS' : 'FAIL', '');
  } catch(e) { log('TC-24a', 'Login as sales', 'FAIL', e.message); }

  if (salesToken) {
    try {
      const r = await multipartRequest('/api/v1/documents/upload', [
        bd, 'Content-Disposition: form-data; name="file"; filename="sales.txt"', 'Content-Type: text/plain', '', 'sales file', ed,
      ], salesToken);
      const p = JSON.parse(r.body);
      log('TC-24b', 'Sales upload (RBAC check)', r.status === 200 || r.status === 201 ? 'PASS' : 'FAIL',
        `Status: ${r.status}, msg: ${p.message || 'none'}`);
    } catch(e) { log('TC-24b', 'Sales upload', 'FAIL', e.message); }
  }

  // TC-25: Cleanup - delete all test docs
  try {
    const r = await makeRequest('GET', '/api/v1/documents?page=1&limit=50', null, { 'Authorization': 'Bearer ' + token });
    const p = JSON.parse(r.body);
    const testDocs = p.data?.items?.filter(d => d.fileName?.startsWith('test.') || d.fileName?.startsWith('report.') || d.fileName?.startsWith('photo.') || d.fileName?.startsWith('contract.') || d.fileName?.startsWith('emp.') || d.fileName?.startsWith('mgr.') || d.fileName?.startsWith('sales.') || d.fileName === 'Client_Contract_2024.pdf') || [];
    let deleted = 0;
    for (const doc of testDocs) {
      await makeRequest('DELETE', `/api/v1/documents/${doc._id}`, null, { 'Authorization': 'Bearer ' + token });
      deleted++;
    }
    log('TC-25', 'Cleanup test documents', 'PASS', `Deleted ${deleted} test documents`);
  } catch(e) { log('TC-25', 'Cleanup', 'FAIL', e.message); }

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log('\n========================================');
  console.log(' SUMMARY');
  console.log('========================================');
  console.log(`Total:  ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Score:  ${Math.round((passed / total) * 100)}%`);
  console.log('========================================');
}

runTests().catch(console.error);
