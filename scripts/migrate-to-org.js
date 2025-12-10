/**
 * Migration script to move data from root collections to organization-scoped collections
 * 
 * Usage: node scripts/migrate-to-org.js
 * 
 * This will migrate:
 * - tarefas → organizations/interno-fluxo/tarefas
 * - perfis → organizations/interno-fluxo/perfis
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const ORG_ID = 'interno-fluxo';

async function migrateCollection(fromPath, toPath) {
    console.log(`\n📦 Migrating: ${fromPath} → ${toPath}`);

    const sourceRef = db.collection(fromPath);
    const snapshot = await sourceRef.get();

    if (snapshot.empty) {
        console.log(`⚠️  No documents found in ${fromPath}`);
        return 0;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        const destRef = db.collection(toPath).doc(doc.id);
        batch.set(destRef, doc.data());
        count++;
    });

    await batch.commit();
    console.log(`✅ Migrated ${count} documents`);

    return count;
}

async function main() {
    console.log('🚀 Starting migration to multi-tenant structure...\n');
    console.log(`Target Organization: ${ORG_ID}\n`);

    try {
        // Migrate tarefas
        await migrateCollection('tarefas', `organizations/${ORG_ID}/tarefas`);

        // Migrate perfis
        await migrateCollection('perfis', `organizations/${ORG_ID}/perfis`);

        console.log('\n✨ Migration completed successfully!');
        console.log('\n⚠️  IMPORTANT: The old collections still exist. You can delete them manually after verifying the migration.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
