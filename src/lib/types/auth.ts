export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
	id: string;
	name: string;
	email: string;
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
	name: string;
	email: string;
	role: UserRole;
	created_at: string;
	last_login_at: string | null;
}

export interface CreateUserInput {
	name: string;
	email: string;
	password: string;
	role?: UserRole;
}

export interface LoginInput {
	email: string;
	password: string;
}

export interface UpdateProfileInput {
	name: string;
}

export interface ChangePasswordInput {
	currentPassword: string;
	newPassword: string;
}

export interface AuthState {
	isSetup: boolean;
	user: UserPublic | null;
}

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
	admin: ['read', 'write', 'delete', 'manage_users'],
	editor: ['read', 'write', 'delete'],
	viewer: ['read']
};

export type Permission = 'read' | 'write' | 'delete' | 'manage_users';

export function hasPermission(role: UserRole, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role].includes(permission);
}
