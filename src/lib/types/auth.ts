export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
	id: string;
	username: string;
	password_hash: string;
	role: UserRole;
	created_at: string;
	updated_at: string;
	last_login_at: string | null;
}

export interface Session {
	id: string;
	user_id: string;
	expires_at: string;
	created_at: string;
}

export interface UserPublic {
	id: string;
	username: string;
	role: UserRole;
	created_at: string;
	last_login_at: string | null;
}

export interface CreateUserInput {
	username: string;
	password: string;
	role?: UserRole;
}

export interface LoginInput {
	username: string;
	password: string;
}

export interface AuthState {
	isSetup: boolean;
	user: UserPublic | null;
}

export const ROLE_PERMISSIONS = {
	admin: ['read', 'write', 'delete', 'manage_users'],
	editor: ['read', 'write', 'delete'],
	viewer: ['read']
} as const;

export type Permission = 'read' | 'write' | 'delete' | 'manage_users';

export function hasPermission(role: UserRole, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role].includes(permission as never);
}
