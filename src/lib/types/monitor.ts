export type MonitorType = 'http' | 'tcp' | 'dns' | 'push';
export type MonitorStatus = 'up' | 'down' | 'degraded';
export type KeywordType = 'present' | 'absent';
export type IncidentStatus = 'ongoing' | 'resolved';
export type NotificationChannelType = 'webhook' | 'email' | 'slack' | 'discord' | 'telegram';

export interface Monitor {
	id: string;
	name: string;
	type: MonitorType;
	url: string | null;
	hostname: string | null;
	port: number | null;
	method: string;
	expected_status: number;
	keyword: string | null;
	keyword_type: KeywordType | null;
	interval_seconds: number;
	timeout_ms: number;
	retry_count: number;
	active: number;
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

export interface Incident {
	id: number;
	monitor_id: string;
	status: IncidentStatus;
	started_at: string;
	resolved_at: string | null;
	duration_seconds: number | null;
}

export interface NotificationChannel {
	id: string;
	type: NotificationChannelType;
	name: string;
	config: string;
	active: number;
	created_at: string;
}

export interface MonitorNotification {
	monitor_id: string;
	channel_id: string;
	notify_on: string;
}

export interface CreateMonitorInput {
	name: string;
	type: MonitorType;
	url?: string;
	hostname?: string;
	port?: number;
	method?: string;
	expected_status?: number;
	keyword?: string;
	keyword_type?: KeywordType;
	interval_seconds?: number;
	timeout_ms?: number;
	retry_count?: number;
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

export interface StatusCacheEntry {
	monitor_id: string;
	status: MonitorStatus;
	response_time_ms: number | null;
	checked_at: string;
	uptime_24h: number;
}
