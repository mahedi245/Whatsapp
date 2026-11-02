const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const postgresSchemaPath = path.join(__dirname, '../prisma/schema.postgres.prisma');

if (isPostgres) {
  console.log('⚡ Detected PostgreSQL connection string. Activating PostgreSQL schema...');
  if (fs.existsSync(postgresSchemaPath)) {
    fs.copyFileSync(postgresSchemaPath, schemaPath);
  }
} else {
  console.log('⚡ Using SQLite database schema...');
  let content = fs.readFileSync(schemaPath, 'utf8');
  if (content.includes('provider = "postgresql"')) {
    content = content.replace('provider = "postgresql"', 'provider = "sqlite"');
    content = content.replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url = "file:./dev.db"');
    fs.writeFileSync(schemaPath, content);
  }
}

// Generate Prisma Client
console.log('⚡ Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (genErr) {
  console.warn('Prisma generate warning:', genErr.message);
}

// Push DB schema if feasible (safe try-catch so build never aborts)
try {
  console.log('⚡ Synchronizing database tables...');
  execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
} catch (err) {
  console.warn('⚠️ db push note (skipped if remote DB not directly accessible during build):', err.message);
}
