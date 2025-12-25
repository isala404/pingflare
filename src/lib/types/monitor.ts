export type MonitorStatus = 'up' | 'down' | 'degraded';

export interface Monitor {
	id: string;
	name: string;
	script: string;
	interval_seconds: number;
	timeout_ms: number;
	active: number;
	group_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface Check {
	id: number;
	monitor_id: string;
	status: MonitorStatus;
	response_time_ms: number | null;
	status_code: number | null;
	error_message: string | null;
	checked_at: string;
	checked_from: string | null;
}

export interface CreateMonitorInput {
	name: string;
	script: string;
	group_id: string;
	interval_seconds?: number;
	timeout_ms?: number;
	active?: boolean;
}

export interface UpdateMonitorInput extends Partial<CreateMonitorInput> {
	id: string;
}

export interface MonitorWithStatus extends Monitor {
	current_status: MonitorStatus | null;
	last_check: Check | null;
	uptime_24h: number | null;
}

export interface StatusResponse {
	monitor_id: string;
	status: MonitorStatus;
	response_time_ms: number | null;
	checked_at: string;
	uptime_24h: number;
}
