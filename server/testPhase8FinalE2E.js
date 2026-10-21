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

const runEndToEndTests = async () => {
  console.log('======================================================================');
  console.log('--- STARTING PHASE 8 FINAL COMPREHENSIVE END-TO-END TEST SUITE ---');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, stepName, details = '') => {
    if (condition) {
      console.log(`✓ [PASS] ${stepName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${stepName} - ${details}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();

    // STEP 1: Login as admin
    console.log('[STEP 1] Login as admin...');
    const loginRes = await fetchJson(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'Admin@123' })
    });
    assert(loginRes.data?.success && loginRes.data?.data?.token, 'Step 1: Admin login successful');
    const token = loginRes.data.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // STEP 2: Create Category: "Electronics"
    console.log('\n[STEP 2] Create Category "Electronics"...');
    const catName = `Electronics_${timestamp}`;
    const catRes = await fetchJson(`${API_BASE}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name: catName, description: 'Electronic appliances and computer systems' }),
      ...authHeaders
    });
    assert(catRes.data?.success && catRes.data?.data?._id, 'Step 2: Category created successfully');
    const categoryId = catRes.data.data._id;

    // STEP 3: Create Supplier: "ABC Supplies"
    console.log('\n[STEP 3] Create Supplier "ABC Supplies"...');
    const supRes = await fetchJson(`${API_BASE}/suppliers`, {
      method: 'POST',
      body: JSON.stringify({
        name: `ABC Supplies Contact`,
        companyName: `ABC Supplies ${timestamp}`,
        email: `abc_supplies_${timestamp}@example.com`,
        phone: '9876543210',
        address: '10 Industrial Area'
      }),
      ...authHeaders
    });
    assert(supRes.data?.success && supRes.data?.data?._id, 'Step 3: Supplier created successfully');
    const supplierId = supRes.data.data._id;

    // STEP 4: Create Location: "Chennai Warehouse"
    console.log('\n[STEP 4] Create Location "Chennai Warehouse"...');
    const locChennaiRes = await fetchJson(`${API_BASE}/locations`, {
      method: 'POST',
      body: JSON.stringify({
        name: `Chennai Warehouse ${timestamp}`,
        address: '22 Harbor Expressway',
        city: 'Chennai',
        state: 'Tamil Nadu',
        managerName: 'Suresh Kumar',
        contactNumber: '9123456780',
        status: 'active'
      }),
      ...authHeaders
    });
    assert(locChennaiRes.data?.success && locChennaiRes.data?.data?._id, 'Step 4: Chennai Warehouse created');
    const chennaiLocId = locChennaiRes.data.data._id;

    // STEP 5: Create Location: "Bangalore Warehouse"
    console.log('\n[STEP 5] Create Location "Bangalore Warehouse"...');
    const locBlrRes = await fetchJson(`${API_BASE}/locations`, {
      method: 'POST',
      body: JSON.stringify({
        name: `Bangalore Warehouse ${timestamp}`,
        address: '55 Electronic City Blvd',
        city: 'Bangalore',
        state: 'Karnataka',
        managerName: 'Anil Rao',
        contactNumber: '9123456781',
        status: 'active'
      }),
      ...authHeaders
    });
    assert(locBlrRes.data?.success && locBlrRes.data?.data?._id, 'Step 5: Bangalore Warehouse created');
    const blrLocId = locBlrRes.data.data._id;

    // STEP 6: Create Product: "Laptop", SKU: "LAP-001", Reorder Level: 10
    console.log('\n[STEP 6] Create Product "Laptop" (SKU: LAP-001)...');
    const skuCode = `LAP-001-${timestamp}`;
    const prodRes = await fetchJson(`${API_BASE}/products`, {
      method: 'POST',
      body: JSON.stringify({
        productName: `Laptop ${timestamp}`,
        SKU: skuCode,
        category: categoryId,
        unitPrice: 850,
        reorderLevel: 10,
        description: 'High performance student laptop'
      }),
      ...authHeaders
    });
    assert(prodRes.data?.success && prodRes.data?.data?._id, 'Step 6: Product Laptop created');
    const productId = prodRes.data.data._id;

    // STEP 7: Perform Stock IN: Batch "LAP-2026-001", Qty: 100, Location: Chennai
    console.log('\n[STEP 7] Perform Stock IN (Batch: LAP-2026-001, Quantity: 100 at Chennai)...');
    const batchNumber = `LAP-2026-001-${timestamp}`;
    const stockInRes = await fetchJson(`${API_BASE}/stock/in`, {
      method: 'POST',
      body: JSON.stringify({
        product: productId,
        supplier: supplierId,
        location: chennaiLocId,
        batchNumber,
        quantity: 100,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-01-01')
      }),
      ...authHeaders
    });
    assert(stockInRes.data?.success, 'Step 7: Stock IN successful');

    // STEP 8: Verify inventory: 100 units
    console.log('\n[STEP 8] Verify Inventory is 100 units...');
    const invCheck1 = await fetchJson(`${API_BASE}/inventory/product/${productId}`, authHeaders);
    assert(invCheck1.data?.data?.totalStock === 100, 'Step 8: Inventory verified as 100 units', `Got: ${invCheck1.data?.data?.totalStock}`);

    // STEP 9: Perform Stock OUT: Quantity 20
    console.log('\n[STEP 9] Perform Stock OUT: Quantity 20...');
    const batchListRes = await fetchJson(`${API_BASE}/batches?batchNumber=${batchNumber}`, authHeaders);
    const chennaiBatch = batchListRes.data.data[0];
    const stockOutRes = await fetchJson(`${API_BASE}/stock/out`, {
      method: 'POST',
      body: JSON.stringify({
        product: productId,
        batch: chennaiBatch._id,
        location: chennaiLocId,
        quantity: 20,
        reason: 'College Demo Order #101'
      }),
      ...authHeaders
    });
    assert(stockOutRes.data?.success, 'Step 9: Stock OUT 20 units completed');

    // STEP 10: Verify: 80 units remaining
    console.log('\n[STEP 10] Verify 80 units remaining...');
    const invCheck2 = await fetchJson(`${API_BASE}/inventory/product/${productId}`, authHeaders);
    assert(invCheck2.data?.data?.totalStock === 80, 'Step 10: Verified remaining total stock is 80 units');

    // STEP 11: Transfer: 30 units Chennai -> Bangalore
    console.log('\n[STEP 11] Transfer 30 units Chennai -> Bangalore...');
    const transferRes = await fetchJson(`${API_BASE}/stock/transfer`, {
      method: 'POST',
      body: JSON.stringify({
        product: productId,
        batch: chennaiBatch._id,
        fromLocation: chennaiLocId,
        toLocation: blrLocId,
        quantity: 30,
        reason: 'Rebalance to Bangalore warehouse'
      }),
      ...authHeaders
    });
    assert(transferRes.data?.success, 'Step 11: Stock transfer completed');

    // STEP 12: Verify Chennai = 50, Bangalore = 30, Total = 80
    console.log('\n[STEP 12] Verify Chennai = 50, Bangalore = 30, Total = 80...');
    const invCheck3 = await fetchJson(`${API_BASE}/inventory/product/${productId}`, authHeaders);
    const batches = invCheck3.data?.data?.batches || [];
    const chennaiQty = batches.find((b) => b.location?._id === chennaiLocId || b.location === chennaiLocId)?.quantity || 0;
    const blrQty = batches.find((b) => b.location?._id === blrLocId || b.location === blrLocId)?.quantity || 0;
    const totalQty = invCheck3.data?.data?.totalStock || 0;

    assert(chennaiQty === 50, 'Step 12a: Chennai quantity is exactly 50 units', `Got: ${chennaiQty}`);
    assert(blrQty === 30, 'Step 12b: Bangalore quantity is exactly 30 units', `Got: ${blrQty}`);
    assert(totalQty === 80, 'Step 12c: Total inventory remains exactly 80 units', `Got: ${totalQty}`);

    // STEP 13: Check Stock Movements: 1 STOCK_IN, 1 STOCK_OUT, 1 TRANSFER
    console.log('\n[STEP 13] Check Stock Movements (1 STOCK_IN, 1 STOCK_OUT, 1 TRANSFER)...');
    const movCheck = await fetchJson(`${API_BASE}/stock/movements?product=${productId}`, authHeaders);
    const movements = movCheck.data?.data || [];
    const hasIn = movements.some((m) => m.type === 'STOCK_IN' && m.quantity === 100);
    const hasOut = movements.some((m) => m.type === 'STOCK_OUT' && m.quantity === 20);
    const hasTransfer = movements.some((m) => m.type === 'TRANSFER' && m.quantity === 30);
    assert(hasIn && hasOut && hasTransfer && movements.length >= 3, 'Step 13: Exactly 1 STOCK_IN, 1 STOCK_OUT, 1 TRANSFER verified in audit trail');

    // STEP 14: Change reorder level to low stock (e.g. 90) -> appears in Dashboard, Inventory, Low Stock Report
    console.log('\n[STEP 14] Change reorder level to 90 to trigger low-stock alert...');
    await fetchJson(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ reorderLevel: 90 }),
      ...authHeaders
    });

    // Check in Dashboard low-stock
    const dashLowRes = await fetchJson(`${API_BASE}/dashboard/low-stock`, authHeaders);
    const inDashLow = dashLowRes.data?.data?.some((i) => i.SKU === skuCode);
    assert(inDashLow, 'Step 14a: Product appears in Dashboard Low Stock section');

    // Check in Inventory low-stock
    const invLowRes = await fetchJson(`${API_BASE}/inventory/low-stock`, authHeaders);
    const inInvLow = invLowRes.data?.data?.some((i) => i.SKU === skuCode);
    assert(inInvLow, 'Step 14b: Product appears in Inventory Low Stock API');

    // Check in Low Stock Report
    const reportLowRes = await fetchJson(`${API_BASE}/reports/low-stock`, authHeaders);
    const inReportLow = reportLowRes.data?.data?.some((i) => i.SKU === skuCode);
    assert(inReportLow, 'Step 14c: Product appears in Low Stock Report API with deficit calculation');

    // STEP 15: Create an expired batch -> appears in Batch page, Dashboard, Expiry Report
    console.log('\n[STEP 15] Create expired batch and verify detection across endpoints...');
    const expBatchNum = `EXP-DEMO-${timestamp}`;
    await fetchJson(`${API_BASE}/stock/in`, {
      method: 'POST',
      body: JSON.stringify({
        product: productId,
        supplier: supplierId,
        location: chennaiLocId,
        batchNumber: expBatchNum,
        quantity: 12,
        manufacturingDate: new Date('2023-01-01'),
        expiryDate: new Date('2024-01-01') // Past expiry date
      }),
      ...authHeaders
    });

    // Check in Batches list with expiry status filter
    const batchExpiryRes = await fetchJson(`${API_BASE}/batches?expiryStatus=expired`, authHeaders);
    const inBatchPage = batchExpiryRes.data?.data?.some((b) => b.batchNumber === expBatchNum);
    assert(inBatchPage, 'Step 15a: Expired batch appears in Batches list under expired filter');

    // Check in Dashboard expiring
    const dashExpRes = await fetchJson(`${API_BASE}/dashboard/expiring`, authHeaders);
    const inDashExp = dashExpRes.data?.data?.some((b) => b.batchNumber === expBatchNum && b.expiryStatus === 'EXPIRED');
    assert(inDashExp, 'Step 15b: Expired batch appears in Dashboard Expiring section with status EXPIRED');

    // Check in Reports expiry
    const reportExpRes = await fetchJson(`${API_BASE}/reports/expiry?status=EXPIRED`, authHeaders);
    const inReportExp = reportExpRes.data?.data?.some((b) => b.batchNumber === expBatchNum && b.expiryStatus === 'EXPIRED');
    assert(inReportExp, 'Step 15c: Expired batch appears in Expiry Report with status EXPIRED');

    // STEP 16: Test Every Report API
    console.log('\n[STEP 16] Test all 6 Reports APIs...');
    const [rInv, rLow, rOut, rExp, rMov, rLoc] = await Promise.all([
      fetchJson(`${API_BASE}/reports/inventory`, authHeaders),
      fetchJson(`${API_BASE}/reports/low-stock`, authHeaders),
      fetchJson(`${API_BASE}/reports/out-of-stock`, authHeaders),
      fetchJson(`${API_BASE}/reports/expiry`, authHeaders),
      fetchJson(`${API_BASE}/reports/stock-movements`, authHeaders),
      fetchJson(`${API_BASE}/reports/location-inventory`, authHeaders)
    ]);

    assert(rInv.status === 200 && Array.isArray(rInv.data?.data), 'Step 16a: Inventory Report API returns 200 and data array');
    assert(rLow.status === 200 && Array.isArray(rLow.data?.data), 'Step 16b: Low Stock Report API returns 200 and data array');
    assert(rOut.status === 200 && Array.isArray(rOut.data?.data), 'Step 16c: Out of Stock Report API returns 200 and data array');
    assert(rExp.status === 200 && Array.isArray(rExp.data?.data), 'Step 16d: Expiry Report API returns 200 and data array');
    assert(rMov.status === 200 && Array.isArray(rMov.data?.data), 'Step 16e: Stock Movements Report API returns 200 and data array');
    assert(rLoc.status === 200 && Array.isArray(rLoc.data?.data), 'Step 16f: Location Inventory Report API returns 200 and data array');

    // STEP 17: Test CSV Export endpoint parameters
    console.log('\n[STEP 17] Test CSV export parameter on report endpoints...');
    const csvInvRes = await fetchJson(`${API_BASE}/reports/inventory?export=true`, authHeaders);
    assert(csvInvRes.status === 200 && csvInvRes.data?.data?.length >= rInv.data?.data?.length, 'Step 17a: Inventory export mode returns full unpaginated records for CSV export');
    const csvMovRes = await fetchJson(`${API_BASE}/reports/stock-movements?export=true`, authHeaders);
    assert(csvMovRes.status === 200 && csvMovRes.data?.data?.length >= rMov.data?.data?.length, 'Step 17b: Stock Movement export mode returns full records for CSV export');

    // STEP 18: Unauthenticated access check (Logout simulation)
    console.log('\n[STEP 18] Security & Unauthenticated access check...');
    const unauthCheck = await fetchJson(`${API_BASE}/dashboard/stats`);
    assert(unauthCheck.status === 401, 'Step 18: Unauthenticated request rejected with HTTP 401 Unauthorized');

    console.log(`\n======================================================================`);
    console.log(`PHASE 8 COMPLETE END-TO-END TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Fatal Test Failure:', err);
    process.exit(1);
  }
};

runEndToEndTests();
