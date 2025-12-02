import type { User, Session, CreateUserInput, UserPublic, UserRole } from '$lib/types/auth';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateId(): string {
	return crypto.randomUUID();
}

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const passwordHash = await hashPassword(password);
	return passwordHash === hash;
}

export async function isAppSetup(db: D1Database): Promise<boolean> {
	const result = await db
		.prepare("SELECT value FROM app_settings WHERE key = 'setup_complete'")
		.first<{ value: string }>();
	return result?.value === 'true';
}

export async function markAppSetup(db: D1Database): Promise<void> {
	await db
		.prepare(
			"INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('setup_complete', 'true', datetime('now'))"
		)
		.run();
}

export async function getUserCount(db: D1Database): Promise<number> {
	const result = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
	return result?.count ?? 0;
}

export async function createUser(db: D1Database, input: CreateUserInput): Promise<UserPublic> {
	const id = generateId();
	const passwordHash = await hashPassword(input.password);
	const now = new Date().toISOString();
	const role = input.role ?? 'viewer';

	await db
		.prepare(
			`INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(id, input.name, input.email, passwordHash, role, now, now)
		.run();

	return {
		id,
		name: input.name,
		email: input.email,
		role,
		created_at: now,
		last_login_at: null
	};
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
	return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getAllUsers(db: D1Database): Promise<UserPublic[]> {
	const result = await db
		.prepare(
			'SELECT id, name, email, role, created_at, last_login_at FROM users ORDER BY created_at'
		)
		.all<UserPublic>();
	return result.results;
}

export async function updateUserRole(
	db: D1Database,
	userId: string,
	role: UserRole
): Promise<boolean> {
	const result = await db
		.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(role, userId)
		.run();
	return result.meta.changes > 0;
}

export async function updateUserName(
	db: D1Database,
	userId: string,
	name: string
): Promise<boolean> {
	const result = await db
		.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(name, userId)
		.run();
	return result.meta.changes > 0;
}

export async function updateUserPassword(
	db: D1Database,
	userId: string,
	newPassword: string
): Promise<boolean> {
	const passwordHash = await hashPassword(newPassword);
	const result = await db
		.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
		.bind(passwordHash, userId)
		.run();
	return result.meta.changes > 0;
}

export async function verifyUserPassword(
	db: D1Database,
	userId: string,
	password: string
): Promise<boolean> {
	const user = await getUserById(db, userId);
	if (!user) return false;
	return verifyPassword(password, user.password_hash);
}

export async function deleteUser(db: D1Database, userId: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
	return result.meta.changes > 0;
}

export async function validateCredentials(
	db: D1Database,
	email: string,
	password: string
): Promise<User | null> {
	const user = await getUserByEmail(db, email);
	if (!user) return null;

	const isValid = await verifyPassword(password, user.password_hash);
	if (!isValid) return null;

	// Update last login
	await db
		.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
		.bind(user.id)
		.run();

	return user;
}

export async function createSession(db: D1Database, userId: string): Promise<Session> {
	const id = generateId();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
	const now = new Date().toISOString();

	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
		.bind(id, userId, expiresAt, now)
		.run();

	return {
		id,
		user_id: userId,
		expires_at: expiresAt,
		created_at: now
	};
}

export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
	const session = await db
		.prepare('SELECT * FROM sessions WHERE id = ?')
		.bind(sessionId)
		.first<Session>();

	if (!session) return null;

	// Check if expired
	if (new Date(session.expires_at) < new Date()) {
		await deleteSession(db, sessionId);
		return null;
	}

	return session;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

export async function deleteUserSessions(db: D1Database, userId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

export async function cleanupExpiredSessions(db: D1Database): Promise<number> {
	const result = await db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
	return result.meta.changes;
}

export function userToPublic(user: User): UserPublic {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		created_at: user.created_at,
		last_login_at: user.last_login_at
	};
}
