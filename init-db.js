const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Generating Prisma Client...');
  execSync('npx prisma@5.22.0 generate', { stdio: 'inherit' });
  
  console.log('Pushing database schema...');
  execSync('npx prisma@5.22.0 db push --accept-data-loss', { stdio: 'inherit' });
} catch (error) {
  console.error('Database push failed. Attempting recovery by resetting the database...');
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const journalPath = path.join(process.cwd(), 'prisma', 'dev.db-journal');
  
  try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
  } catch (e) {
    console.error('Could not delete database files:', e);
  }
  
  try {
    console.log('Retrying database schema push...');
    execSync('npx prisma@5.22.0 db push --accept-data-loss', { stdio: 'inherit' });
    console.log('Database recovery successful.');
  } catch (retryError) {
    console.error('Failed to recover database:', retryError.message);
    process.exit(1);
  }
}
