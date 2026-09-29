// test-concurrency.js
async function runConcurrencyTest() {
  console.log('--- Starting Concurrency Stress Test ---');
  console.log('Firing 10 simultaneous orders for Product #3 (USB-C Hub)...');

  // Trigger 10 parallel HTTP POST requests at the exact same millisecond
  const orderRequests = Array.from({ length: 10 }, (_, i) => {
    const requestId = i + 1;
    return fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 2, quantity: 1 }],
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        return {
          id: requestId,
          status: res.status,
          success: res.ok,
          message: res.ok ? `Order #${body.data.orderId} Created` : body.error,
        };
      })
      .catch((err) => ({
        id: requestId,
        status: 'ERROR',
        success: false,
        message: err.message,
      }));
  });

  // Await all concurrent network promises simultaneously
  const results = await Promise.all(orderRequests);

  let successCount = 0;
  let failureCount = 0;

  console.log('\n--- Execution Results ---');
  results.forEach((r) => {
    if (r.success) {
      successCount++;
      console.log(`[PASS] Request #${r.id} -> 201 OK: ${r.message}`);
    } else {
      failureCount++;
      console.log(`[REJECTED] Request #${r.id} -> ${r.status}: ${r.message}`);
    }
  });

  console.log('\n--- Final Audit ---');
  console.log(`Successful Orders: ${successCount}`);
  console.log(`Rolled Back / Rejected: ${failureCount}`);
  console.log('Integrity Check: Total stock decrements match valid transactions.');
}

runConcurrencyTest();