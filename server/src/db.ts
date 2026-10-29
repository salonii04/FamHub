import { Pool, types } from 'pg';
import { loadEnv } from './config/loadEnv';

loadEnv();

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
types.setTypeParser(1082, (val: string) => val);

if (!process.env.POSTGRES_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
        console.error('POSTGRES_PASSWORD is not set. Refusing to start in production with the default password.');
        process.exit(1);
    }
    console.warn('POSTGRES_PASSWORD is not set — falling back to default (development only).');
}

const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'famhub',
    user: process.env.POSTGRES_USER || 'famhub',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
    try {
        return await pool.query(text, params);
    } catch (error) {
        console.error('DB query error:', error);
        throw error;
    }
};

export const runMigrations = async () => {
    const migrations = [
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
        // Base users table
        `CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        // Migration 002: family account sharing — needed because register/login
        // below compute an ownerId and read family_owner_id.
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS family_owner_id UUID REFERENCES users(id) ON DELETE SET NULL',
        `CREATE TABLE IF NOT EXISTS family_invites (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(64) UNIQUE NOT NULL,
            invitee_email TEXT,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS idx_family_invites_token ON family_invites(token)',
        'CREATE INDEX IF NOT EXISTS idx_family_invites_owner ON family_invites(owner_id)',
        "ALTER TABLE family_invites ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'parent'",
        // Migration 003: parent / child role.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'parent'",
        // Migration 004: configurable currency.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR'",
        // Migration 006: profile photo as a data URL.
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT',
        // Migration 009: per-user interface language.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'en'",
        // From the regional-preferences migration.
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS week_start_day SMALLINT CHECK (week_start_day BETWEEN 1 AND 7)',
        // Migration: family-wide optional-module toggles.
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_modules TEXT NOT NULL DEFAULT '[]'",
        // Migration 019: password reset by email link.
        `CREATE TABLE IF NOT EXISTS password_resets (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR(64) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now()
        )`,
        'CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)',
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash)',
        `CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            is_completed BOOLEAN DEFAULT FALSE,
            due_date TIMESTAMP,
            frequency VARCHAR(50),
            priority VARCHAR(50),
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)',
    ];

    for (const statement of migrations) {
        await query(statement);
    }
};