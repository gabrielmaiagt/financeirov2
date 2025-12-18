const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log('🚀 Starting robust migration script (Zero Dependencies)...');

    try {
        const yamlPath = path.join(__dirname, '..', '..', 'apphosting.yaml');
        const content = fs.readFileSync(yamlPath, 'utf8');

        // Regex extract values
        const getVal = (key) => {
            const match = content.match(new RegExp(`variable: ${key}\\s*value: "(.*)"`));
            if (!match) return null;
            let val = match[1];
            // Handle escaped characters if needed, but the key has literal \n
            return val;
        };

        const projectId = getVal('FIREBASE_PROJECT_ID');
        const clientEmail = getVal('FIREBASE_CLIENT_EMAIL');
        let privateKey = getVal('FIREBASE_PRIVATE_KEY');

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Could not find all required variables in apphosting.yaml');
        }

        privateKey = privateKey.replace(/\\n/g, '\n');

        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey
        };

        console.log(`Configured for project: ${serviceAccount.projectId}`);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        const ORG_ID = 'interno-fluxo';

        const collectionsToMigrate = [
            'tarefas', 'perfis', 'vendas', 'scripts', 'reminders', 'recuperacao',
            'frases', 'ofertasEscaladas', 'notificacoes', 'anotacoes', 'logins',
            'insights', 'metas', 'despesas', 'operacoesSocios', 'criativos', 'banco_criativos'
        ];

        for (const collectionName of collectionsToMigrate) {
            console.log(`\n📦 Migrating: ${collectionName} → organizations/${ORG_ID}/${collectionName}`);

            const sourceRef = db.collection(collectionName);
            const snapshot = await sourceRef.get();

            if (snapshot.empty) {
                console.log(`⚠️  No docs found in root ${collectionName}`);
                continue;
            }

            // Use batches of 500 for large collections
            const docs = snapshot.docs;
            for (let i = 0; i < docs.length; i += 500) {
                const batchSize = Math.min(500, docs.length - i);
                const batch = db.batch();

                for (let j = 0; j < batchSize; j++) {
                    const doc = docs[i + j];
                    const destRef = db.collection('organizations').doc(ORG_ID).collection(collectionName).doc(doc.id);
                    batch.set(destRef, doc.data());
                }

                await batch.commit();
                console.log(`✅ Migrated batch ${i / 500 + 1} (${batchSize} docs) for ${collectionName}`);
            }
        }

        console.log('\n✨ Migration finished successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
