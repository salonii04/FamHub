import { Pool, types } from 'pg';
import { loadEnv } from './config/loadEnv';


loadEnv();

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Date objects.
types.setTypeParser(1082, (val: string) => val);
types.setTypeParser(1700, (value) => parseFloat(value));

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
        `CREATE TABLE IF NOT EXISTS family_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'Other',
            birth_date DATE,
            color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
            allergies TEXT,
            medications TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            notes TEXT,
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id)',
        `CREATE TABLE IF NOT EXISTS shopping_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
            unit TEXT,
            price NUMERIC(10, 2) CHECK (price IS NULL OR price >= 0),
            category TEXT NOT NULL DEFAULT 'Other',
            notes TEXT,
            checked BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        'CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON shopping_items(user_id);',
        `CREATE TABLE IF NOT EXISTS appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            description TEXT,
            location TEXT,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            color TEXT NOT NULL DEFAULT '#3b82f6',
            reminder_minutes INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CHECK (end_time > start_time)
        );`,
        `CREATE TABLE IF NOT EXISTS meal_plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            meal_type VARCHAR(50) NOT NULL,
            custom_meal TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date, meal_type)
        )`,
        'CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date)',

        `CREATE TABLE IF NOT EXISTS budget_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
            amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
            category TEXT NOT NULL DEFAULT 'Other',
            description TEXT,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        'CREATE INDEX IF NOT EXISTS idx_budget_transactions_user_date ON budget_transactions(user_id, date)',
        `CREATE TABLE IF NOT EXISTS budget_limits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            monthly_limit NUMERIC(12, 2) NOT NULL CHECK (monthly_limit > 0),
            UNIQUE (user_id, category)
        )`,
        
        `CREATE TABLE IF NOT EXISTS notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            is_private BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        'CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)',
    ];

    for (const statement of migrations) {
        await query(statement);
    }
};