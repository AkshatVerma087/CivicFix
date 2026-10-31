const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const { performance } = require('perf_hooks');

// Import socket service to ensure we test the actual app logic
const { initSocket } = require('../src/services/socket.service');

async function runSocketBenchmark() {
    console.log('--- STARTING SOCKET.IO BROADCAST LATENCY BENCHMARK ---');

    // 1. Spin up an HTTP server with the app's socket service on port 5055
    const app = express();
    const server = http.createServer(app);
    initSocket(server);

    const TEST_PORT = 5055;
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`Test Socket.IO Server listening on port ${TEST_PORT}`);

    // 2. Connect client
    const clientSocket = ClientIO(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
        reconnection: false,
    });

    await new Promise((resolve, reject) => {
        clientSocket.on('connect', () => {
            console.log(`Socket.IO client connected with id: ${clientSocket.id}`);
            resolve();
        });
        clientSocket.on('connect_error', reject);
    });

    // 3. Run 50 broadcast latency iterations
    const ITERATIONS = 50;
    const latencies = [];

    console.log(`Running ${ITERATIONS} broadcast roundtrips...`);

    for (let i = 1; i <= ITERATIONS; i++) {
        const payload = {
            testId: i,
            issueId: `issue_${i}`,
            newStatus: i % 2 === 0 ? 'inProgress' : 'resolved',
            updatedBy: 'benchmark_runner',
            sentAt: Date.now(),
        };

        const latency = await new Promise((resolve) => {
            const start = performance.now();

            const onUpdated = (data) => {
                if (data && data.testId === i) {
                    const elapsed = performance.now() - start;
                    clientSocket.off('issue:status-updated', onUpdated);
                    resolve(elapsed);
                }
            };

            clientSocket.on('issue:status-updated', onUpdated);
            clientSocket.emit('issue:status-change', payload);
        });

        latencies.push(latency);
        if (i % 10 === 0 || i === 1) {
            console.log(` Iteration ${i}/${ITERATIONS}: latency = ${latency.toFixed(3)} ms`);
        }
        // Small pause between events
        await new Promise((r) => setTimeout(r, 10));
    }

    // 4. Calculate metrics
    latencies.sort((a, b) => a - b);
    const sum = latencies.reduce((acc, v) => acc + v, 0);
    const avg = sum / latencies.length;
    const min = latencies[0];
    const max = latencies[latencies.length - 1];

    // p95
    const p95Index = Math.min(Math.floor(0.95 * latencies.length), latencies.length - 1);
    const p95 = latencies[p95Index];

    // p50
    const p50Index = Math.min(Math.floor(0.50 * latencies.length), latencies.length - 1);
    const p50 = latencies[p50Index];

    console.log('\n--- SOCKET.IO BROADCAST LATENCY RESULTS ---');
    console.log(`Iterations:        ${ITERATIONS}`);
    console.log(`Average Latency:   ${avg.toFixed(3)} ms`);
    console.log(`p50 Latency:       ${p50.toFixed(3)} ms`);
    console.log(`p95 Latency:       ${p95.toFixed(3)} ms`);
    console.log(`Min Latency:       ${min.toFixed(3)} ms`);
    console.log(`Max Latency:       ${max.toFixed(3)} ms`);

    console.log('\nRAW_METRICS_JSON:' + JSON.stringify({
        iterations: ITERATIONS,
        averageLatencyMs: +avg.toFixed(3),
        p50LatencyMs: +p50.toFixed(3),
        p95LatencyMs: +p95.toFixed(3),
        minLatencyMs: +min.toFixed(3),
        maxLatencyMs: +max.toFixed(3),
        sampleLatencies: latencies.slice(0, 5).map(v => +v.toFixed(3)),
    }));

    // Cleanup
    clientSocket.disconnect();
    await new Promise((resolve) => server.close(resolve));
    console.log('Socket.IO benchmark server closed.\n');
}

runSocketBenchmark().catch((err) => {
    console.error('Socket Benchmark Error:', err);
    process.exit(1);
});
