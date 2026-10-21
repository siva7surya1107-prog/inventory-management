const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const API_BASE = 'http://localhost:5000/api';

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
};

const runTests = async () => {
  console.log('--- Starting Phase 7 Dashboard & Analytics Backend Test Suite ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Authenticate as Admin
    console.log('\n[1] Authenticating...');
    const loginRes = await fetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Admin@123'
      })
    });
    assert(loginRes.data?.success && loginRes.data?.data?.token, 'Admin login successful');
    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Test GET /api/dashboard/stats
    console.log('\n[2] Testing GET /api/dashboard/stats...');
    const statsRes = await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders);
    assert(statsRes.status === 200, 'GET /api/dashboard/stats returns HTTP 200');
    assert(statsRes.data?.success === true, 'Stats response has success: true');
    const summary = statsRes.data?.data?.summary;
    const movements = statsRes.data?.data?.movements;
    assert(summary && typeof summary.totalProducts === 'number', 'Summary contains totalProducts (number)');
    assert(typeof summary.totalInventoryQuantity === 'number', 'Summary contains totalInventoryQuantity (number)');
    assert(typeof summary.lowStockItems === 'number', 'Summary contains lowStockItems (number)');
    assert(typeof summary.outOfStockItems === 'number', 'Summary contains outOfStockItems (number)');
    assert(typeof summary.totalLocations === 'number', 'Summary contains totalLocations (number)');
    assert(typeof summary.totalSuppliers === 'number', 'Summary contains totalSuppliers (number)');
    assert(typeof summary.totalCategories === 'number', 'Summary contains totalCategories (number)');
    assert(typeof summary.totalBatches === 'number', 'Summary contains totalBatches (number)');
    assert(movements && typeof movements.stockIn === 'number', 'Movements contains stockIn (number)');
    assert(typeof movements.stockOut === 'number', 'Movements contains stockOut (number)');
    assert(typeof movements.transfer === 'number', 'Movements contains transfer (number)');

    // 3. Test GET /api/dashboard/inventory-by-location
    console.log('\n[3] Testing GET /api/dashboard/inventory-by-location...');
    const locRes = await fetchJson(`${API_BASE}/dashboard/inventory-by-location`, authHeaders);
    assert(locRes.status === 200, 'GET /api/dashboard/inventory-by-location returns HTTP 200');
    assert(Array.isArray(locRes.data?.data), 'Inventory by location returns array');
    if (locRes.data.data.length > 0) {
      const item = locRes.data.data[0];
      assert(typeof item.location === 'string' && typeof item.quantity === 'number', 'Location item has location string and quantity number');
    }

    // 4. Test GET /api/dashboard/stock-movements with periods (7, 30, 90)
    console.log('\n[4] Testing GET /api/dashboard/stock-movements...');
    for (const period of [7, 30, 90]) {
      const movRes = await fetchJson(`${API_BASE}/dashboard/stock-movements?period=${period}`, authHeaders);
      assert(movRes.status === 200, `Stock movements for period=${period} returns HTTP 200`);
      assert(movRes.data?.period === period, `Period matches ${period}`);
      assert(Array.isArray(movRes.data?.data) && movRes.data.data.length === period, `Daily array has exactly ${period} days`);
      const firstDay = movRes.data.data[0];
      assert(firstDay && typeof firstDay.date === 'string' && typeof firstDay.stockIn === 'number', `Daily point has valid date and stockIn`);
    }

    // 5. Test GET /api/dashboard/low-stock
    console.log('\n[5] Testing GET /api/dashboard/low-stock...');
    const lowRes = await fetchJson(`${API_BASE}/dashboard/low-stock`, authHeaders);
    assert(lowRes.status === 200, 'GET /api/dashboard/low-stock returns HTTP 200');
    assert(Array.isArray(lowRes.data?.data), 'Low stock returns array');

    // 6. Test GET /api/dashboard/expiring
    console.log('\n[6] Testing GET /api/dashboard/expiring...');
    const expRes = await fetchJson(`${API_BASE}/dashboard/expiring`, authHeaders);
    assert(expRes.status === 200, 'GET /api/dashboard/expiring returns HTTP 200');
    assert(Array.isArray(expRes.data?.data), 'Expiring returns array');

    // 7. Test GET /api/dashboard/recent-movements
    console.log('\n[7] Testing GET /api/dashboard/recent-movements...');
    const recRes = await fetchJson(`${API_BASE}/dashboard/recent-movements`, authHeaders);
    assert(recRes.status === 200, 'GET /api/dashboard/recent-movements returns HTTP 200');
    assert(Array.isArray(recRes.data?.data), 'Recent movements returns array');
    if (recRes.data.data.length > 0) {
      const m = recRes.data.data[0];
      assert(m.type && typeof m.quantity === 'number' && m.location, 'Recent movement contains type, quantity, and location');
    }

    // 8. Workflow Tests 1-7 from Specification
    console.log('\n[8] Executing Dashboard Workflow Tests...');

    // Fetch prerequisite entities (Category, Supplier, Locations)
    const [catList, supList, locList] = await Promise.all([
      fetchJson(`${API_BASE}/categories`, authHeaders),
      fetchJson(`${API_BASE}/suppliers`, authHeaders),
      fetchJson(`${API_BASE}/locations`, authHeaders)
    ]);

    const categoryId = catList.data.data[0]._id;
    const supplierId = supList.data.data[0]._id;
    let chennaiLoc = locList.data.data.find((l) => l.name.toLowerCase().includes('chennai'));
    let bangaloreLoc = locList.data.data.find((l) => l.name.toLowerCase().includes('bangalore'));

    if (!chennaiLoc) chennaiLoc = locList.data.data[0];
    if (!bangaloreLoc) bangaloreLoc = locList.data.data[1] || locList.data.data[0];

    const initialStats = (await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders)).data.data;
    const initialTotalInventory = initialStats.summary.totalInventoryQuantity;

    // Test 1: Create product & Stock IN 100 units
    const testSku = `DASH-SKU-${Date.now()}`;
    const prodRes = await fetchJson(`${API_BASE}/products`, {
      method: 'POST',
      body: JSON.stringify({
        productName: `Dashboard Analytics Test Product ${Date.now()}`,
        SKU: testSku,
        category: categoryId,
        unitPrice: 150,
        reorderLevel: 10
      }),
      ...authHeaders
    });
    const testProdId = prodRes.data.data._id;
    const batchNum1 = `DASH-BATCH-A-${Date.now()}`;

    await fetchJson(`${API_BASE}/stock/in`, {
      method: 'POST',
      body: JSON.stringify({
        product: testProdId,
        supplier: supplierId,
        location: chennaiLoc._id,
        batchNumber: batchNum1,
        quantity: 100,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-01-01')
      }),
      ...authHeaders
    });

    const statsAfterIn = (await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders)).data.data;
    assert(
      statsAfterIn.summary.totalInventoryQuantity === initialTotalInventory + 100,
      'Test 1: Stock-in adds 100 units -> Total inventory increased by 100',
      `Expected ${initialTotalInventory + 100}, got ${statsAfterIn.summary.totalInventoryQuantity}`
    );

    // Test 2: Stock OUT 20 units
    const batchDocRes = await fetchJson(`${API_BASE}/batches?batchNumber=${batchNum1}`, authHeaders);
    const testBatch1 = batchDocRes.data.data[0];

    await fetchJson(`${API_BASE}/stock/out`, {
      method: 'POST',
      body: JSON.stringify({
        product: testProdId,
        batch: testBatch1._id,
        location: chennaiLoc._id,
        quantity: 20,
        reason: 'Dashboard Test Issue'
      }),
      ...authHeaders
    });

    const statsAfterOut = (await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders)).data.data;
    assert(
      statsAfterOut.summary.totalInventoryQuantity === initialTotalInventory + 80,
      'Test 2: Stock-out removes 20 units -> Total inventory decreased by 20 (now +80)',
      `Expected ${initialTotalInventory + 80}, got ${statsAfterOut.summary.totalInventoryQuantity}`
    );

    // Test 3: Transfer 30 units Chennai -> Bangalore
    const locBeforeTransfer = (await fetchJson(`${API_BASE}/dashboard/inventory-by-location`, authHeaders)).data.data;
    const chennaiQtyBefore = locBeforeTransfer.find((l) => l.locationId === chennaiLoc._id)?.quantity || 0;
    const blrQtyBefore = locBeforeTransfer.find((l) => l.locationId === bangaloreLoc._id)?.quantity || 0;

    await fetchJson(`${API_BASE}/stock/transfer`, {
      method: 'POST',
      body: JSON.stringify({
        product: testProdId,
        batch: testBatch1._id,
        fromLocation: chennaiLoc._id,
        toLocation: bangaloreLoc._id,
        quantity: 30,
        reason: 'Dashboard Test Inter-warehouse Transfer'
      }),
      ...authHeaders
    });

    const statsAfterTransfer = (await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders)).data.data;
    assert(
      statsAfterTransfer.summary.totalInventoryQuantity === initialTotalInventory + 80,
      'Test 3a: Stock transfer maintains identical total inventory across all locations',
      `Expected ${initialTotalInventory + 80}, got ${statsAfterTransfer.summary.totalInventoryQuantity}`
    );

    const locAfterTransfer = (await fetchJson(`${API_BASE}/dashboard/inventory-by-location`, authHeaders)).data.data;
    const chennaiQtyAfter = locAfterTransfer.find((l) => l.locationId === chennaiLoc._id)?.quantity || 0;
    const blrQtyAfter = locAfterTransfer.find((l) => l.locationId === bangaloreLoc._id)?.quantity || 0;

    if (chennaiLoc._id !== bangaloreLoc._id) {
      assert(
        chennaiQtyAfter === chennaiQtyBefore - 30 && blrQtyAfter === blrQtyBefore + 30,
        'Test 3b: Location quantities correctly updated (-30 at source, +30 at destination)'
      );
    }

    // Test 4: Create product with Qty = 5, Reorder Level = 10 -> Low stock detection
    const lowProdRes = await fetchJson(`${API_BASE}/products`, {
      method: 'POST',
      body: JSON.stringify({
        productName: `Low Stock Test Item ${Date.now()}`,
        SKU: `LOW-SKU-${Date.now()}`,
        category: categoryId,
        unitPrice: 50,
        reorderLevel: 10
      }),
      ...authHeaders
    });
    const lowProdId = lowProdRes.data.data._id;
    const lowBatchNum = `LOW-BATCH-${Date.now()}`;

    await fetchJson(`${API_BASE}/stock/in`, {
      method: 'POST',
      body: JSON.stringify({
        product: lowProdId,
        supplier: supplierId,
        location: chennaiLoc._id,
        batchNumber: lowBatchNum,
        quantity: 5,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-01-01')
      }),
      ...authHeaders
    });

    const lowStockList = (await fetchJson(`${API_BASE}/dashboard/low-stock`, authHeaders)).data.data;
    const foundLowItem = lowStockList.find((item) => item.batchNumber === lowBatchNum);
    assert(
      foundLowItem && foundLowItem.status === 'LOW_STOCK' && foundLowItem.currentQuantity === 5,
      'Test 4: Batch with quantity 5 (<= reorder 10) appears in Low Stock section with status LOW_STOCK'
    );

    // Test 5: Deplete remaining 5 units to quantity = 0 -> Out of Stock detection
    const lowBatchDoc = (await fetchJson(`${API_BASE}/batches?batchNumber=${lowBatchNum}`, authHeaders)).data.data[0];
    await fetchJson(`${API_BASE}/stock/out`, {
      method: 'POST',
      body: JSON.stringify({
        product: lowProdId,
        batch: lowBatchDoc._id,
        location: chennaiLoc._id,
        quantity: 5,
        reason: 'Deplete for out of stock test'
      }),
      ...authHeaders
    });

    const outStockStats = (await fetchJson(`${API_BASE}/dashboard/stats`, authHeaders)).data.data;
    assert(outStockStats.summary.outOfStockItems >= 1, 'Test 5: Out of stock count incremented in summary stats');

    // Test 6: Create expired batch
    const expBatchNum = `EXP-BATCH-${Date.now()}`;
    await fetchJson(`${API_BASE}/stock/in`, {
      method: 'POST',
      body: JSON.stringify({
        product: testProdId,
        supplier: supplierId,
        location: chennaiLoc._id,
        batchNumber: expBatchNum,
        quantity: 15,
        manufacturingDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01') // Expired
      }),
      ...authHeaders
    });

    const expiringList = (await fetchJson(`${API_BASE}/dashboard/expiring`, authHeaders)).data.data;
    const foundExpired = expiringList.find((b) => b.batchNumber === expBatchNum);
    assert(
      foundExpired && foundExpired.expiryStatus === 'EXPIRED',
      'Test 6: Batch with past expiry date appears in Expiring section with status EXPIRED'
    );

    // Test 7: Verify Recent Movements
    const recentList = (await fetchJson(`${API_BASE}/dashboard/recent-movements`, authHeaders)).data.data;
    assert(recentList.length > 0, 'Test 7: Recent movements returned');
    assert(
      recentList.some((m) => m.type === 'STOCK_IN') &&
      recentList.some((m) => m.type === 'STOCK_OUT') &&
      recentList.some((m) => m.type === 'TRANSFER'),
      'Recent movements includes STOCK_IN, STOCK_OUT, and TRANSFER records'
    );

    console.log(`\n========================================`);
    console.log(`Phase 7 Backend Tests: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  }
};

runTests();
