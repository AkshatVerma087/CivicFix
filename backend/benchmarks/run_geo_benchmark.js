const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runGeoBenchmark() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 20000,
        });
        console.log('MongoDB Connected.');

        const db = mongoose.connection.db;

        // Check citizen to attach to issues
        const citizen = await db.collection('citizens').findOne({});
        const citizenId = citizen ? citizen._id : new mongoose.Types.ObjectId();

        // 1. Check issues collection count
        const issuesCol = db.collection('issues');
        const count = await issuesCol.countDocuments();
        console.log(`Current 'issues' collection count: ${count}`);

        // If < 1000, seed up to 1200 sample issues
        if (count < 1000) {
            console.log('Seeding 1200 sample issues with GeoJSON coordinates around [77.2, 28.6]...');
            const docs = [];
            const centerLng = 77.2090;
            const centerLat = 28.6139;

            for (let i = 1; i <= 1200; i++) {
                // Generate random points within ~15 km radius
                // 1 deg lat ~ 111km, 0.01 deg ~ 1.11km
                const latOffset = (Math.random() - 0.5) * 0.20; // +/- 0.1 deg (~11 km)
                const lngOffset = (Math.random() - 0.5) * 0.20;

                const lat = +(centerLat + latOffset).toFixed(6);
                const lng = +(centerLng + lngOffset).toFixed(6);

                docs.push({
                    title: `Pothole & Civic Issue #${i}`,
                    description: `Automated test civic issue for geolocation benchmark at offset (${latOffset.toFixed(4)}, ${lngOffset.toFixed(4)})`,
                    category: ['road', 'garbage', 'street_light', 'water_leakage', 'drainage'][i % 5],
                    status: ['new', 'inProgress', 'resolved'][i % 3],
                    severity: ['low', 'medium', 'high'][i % 3],
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
                        latitude: lat,
                        longitude: lng,
                    },
                    citizen: citizenId,
                    upvotes: Math.floor(Math.random() * 20),
                    priorityScore: Math.floor(Math.random() * 100),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            await issuesCol.insertMany(docs);
            console.log(`Successfully seeded ${docs.length} issues into 'issues' collection.`);
        }

        // Also check 2dsphere index
        const indexes = await issuesCol.indexes();
        console.log('Existing indexes on issues:', indexes.map(idx => `${idx.name}: ${JSON.stringify(idx.key)}`));

        const has2dsphere = indexes.some(idx => idx.key && idx.key.location === '2dsphere');
        if (!has2dsphere) {
            console.log('Creating 2dsphere index on location field...');
            await issuesCol.createIndex({ location: '2dsphere' }, { name: 'location_2dsphere' });
            console.log('2dsphere index created successfully.');
        } else {
            console.log('2dsphere index already exists on location field.');
        }

        // Also do the same for 'posts' collection so the app backend benefits
        const postsCol = db.collection('posts');
        const postsCount = await postsCol.countDocuments();
        if (postsCount < 1000) {
            console.log(`Copying seeded issues to 'posts' collection (current posts: ${postsCount})...`);
            const sampleIssues = await issuesCol.find({}).limit(1200).toArray();
            const postsToInsert = sampleIssues.map(doc => {
                const copy = { ...doc };
                delete copy._id;
                return copy;
            });
            await postsCol.insertMany(postsToInsert);
            console.log(`Inserted ${postsToInsert.length} documents into 'posts' collection.`);
        }
        const postIndexes = await postsCol.indexes();
        if (!postIndexes.some(idx => idx.key && idx.key.location === '2dsphere')) {
            await postsCol.createIndex({ location: '2dsphere' }, { name: 'location_2dsphere' });
            console.log('Created 2dsphere index on posts collection.');
        }

        // 2. Run the exact query with .explain("executionStats")
        console.log('\n--- EXECUTING EXPLAIN QUERY ON db.issues ---');
        console.log('Query: db.issues.find({ location: { $near: { $geometry: { type: "Point", coordinates: [77.2, 28.6] }, $maxDistance: 5000 }}}).explain("executionStats")');

        const explainResult = await issuesCol.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [77.2, 28.6],
                    },
                    $maxDistance: 5000,
                },
            },
        }).explain('executionStats');

        console.log('\n--- EXPLAIN RESULT SUMMARY ---');
        const stats = explainResult.executionStats;
        console.log('executionSuccess:', stats.executionSuccess);
        console.log('executionTimeMillis:', stats.executionTimeMillis, 'ms');
        console.log('totalDocsExamined:', stats.totalDocsExamined);
        console.log('nReturned:', stats.nReturned);
        console.log('totalKeysExamined:', stats.totalKeysExamined);

        function findStages(stage, list = []) {
            if (!stage) return list;
            list.push(stage.stage);
            if (stage.inputStage) findStages(stage.inputStage, list);
            if (stage.inputStages) stage.inputStages.forEach(s => findStages(s, list));
            return list;
        }

        const stages = findStages(stats.executionStages);
        console.log('Stages traversed:', stages.join(' -> '));

        const indexTypeUsed = stages.includes('IXSCAN') || stages.includes('GEO_NEAR_2DSPHERE') ? 'IXSCAN (GEO_NEAR_2DSPHERE)' : 'COLLSCAN';
        console.log('Index Type Used:', indexTypeUsed);

        console.log('\nRAW_METRICS_JSON:' + JSON.stringify({
            executionTimeMillis: stats.executionTimeMillis,
            totalDocsExamined: stats.totalDocsExamined,
            nReturned: stats.nReturned,
            totalKeysExamined: stats.totalKeysExamined,
            indexTypeUsed: indexTypeUsed,
            stages: stages,
            totalCollectionCount: await issuesCol.countDocuments(),
        }));

        await mongoose.disconnect();
        console.log('\nBenchmark 2 Completed.');
    } catch (err) {
        console.error('Benchmark 2 Error:', err);
        process.exit(1);
    }
}

runGeoBenchmark();
