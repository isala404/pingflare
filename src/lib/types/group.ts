import type { StatusMonitor, OverallStatus } from './status';

export interface MonitorGroup {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	is_public: number;
	display_order: number;
	created_at: string;
}

export interface GroupWithMonitors extends MonitorGroup {
	monitors: StatusMonitor[];
}

export interface GroupWithStatus extends MonitorGroup {
	monitors: StatusMonitor[];
	overall_status: OverallStatus;
	uptime_90d: number;
}

export interface CreateGroupInput {
	name: string;
	slug?: string;
	description?: string;
	is_public?: boolean;
}

export interface UpdateGroupInput {
	name?: string;
	slug?: string;
	description?: string;
	is_public?: boolean;
	display_order?: number;
}
