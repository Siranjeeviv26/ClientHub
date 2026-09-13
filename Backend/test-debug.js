const http = require('http');

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

async function debug() {
  // Login
  const lr = await makeRequest('POST', '/api/v1/auth/login', { email: 'admin@clienthub.com', password: 'demo123' });
  const lp = JSON.parse(lr.body);
  const token = lp.data?.accessToken;
  if (!token) { console.log('No token'); return; }

  const B = '----TestBoundary123';
  const bd = '--' + B;
  const ed = bd + '--';

  // Debug TC-08: PDF
  console.log('=== TC-08 Debug: PDF upload ===');
  const r8 = await multipartRequest('/api/v1/documents/upload', [
    bd,
    'Content-Disposition: form-data; name="file"; filename="report.pdf"',
    'Content-Type: application/pdf',
    '',
    'PDF content test',
    ed,
  ], token);
  console.log('Status:', r8.status);
  console.log('Full response:', r8.body);

  // Debug TC-12: Metadata
  console.log('\n=== TC-12 Debug: Metadata upload ===');
  const r12 = await multipartRequest('/api/v1/documents/upload', [
    bd,
    'Content-Disposition: form-data; name="file"; filename="contract.pdf"',
    'Content-Type: application/pdf',
    '',
    'PDF content test',
    bd,
    'Content-Disposition: form-data; name="fileName"',
    '',
    'Custom_Name.pdf',
    bd,
    'Content-Disposition: form-data; name="description"',
    '',
    'Test description',
    bd,
    'Content-Disposition: form-data; name="folder"',
    '',
    'client',
    bd,
    'Content-Disposition: form-data; name="tags"',
    '',
    'test,contract',
    ed,
  ], token);
  console.log('Status:', r12.status);
  console.log('Full response:', r12.body);

  // Debug: show the raw body being sent for TC-08
  console.log('\n=== Raw multipart body for TC-08 ===');
  const body8 = [
    bd,
    'Content-Disposition: form-data; name="file"; filename="report.pdf"',
    'Content-Type: application/pdf',
    '',
    'PDF content test',
    ed,
  ].join('\r\n');
  console.log(JSON.stringify(body8));
  console.log('Byte length:', Buffer.byteLength(body8));
}

debug().catch(console.error);
