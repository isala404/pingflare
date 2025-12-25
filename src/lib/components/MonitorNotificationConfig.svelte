<script lang="ts">
	import type { NotificationChannel, MonitorNotificationInput } from '$lib/types/notification';

	interface Props {
		channels: NotificationChannel[];
		value: MonitorNotificationInput[];
		onchange: (notifications: MonitorNotificationInput[]) => void;
	}

	let { channels, value, onchange }: Props = $props();

	const THRESHOLD_OPTIONS = [
		{ label: 'Immediately', value: 0 },
		{ label: '30 seconds', value: 30 },
		{ label: '1 minute', value: 60 },
		{ label: '2 minutes', value: 120 },
		{ label: '5 minutes', value: 300 },
		{ label: '10 minutes', value: 600 },
		{ label: '15 minutes', value: 900 },
		{ label: '30 minutes', value: 1800 }
	];

	function getSubscription(channelId: string): MonitorNotificationInput | undefined {
		return value.find((n) => n.channelId === channelId);
	}

	function isSubscribed(channelId: string): boolean {
		return value.some((n) => n.channelId === channelId);
	}

	function isNotifyOn(channelId: string, status: 'up' | 'down' | 'degraded'): boolean {
		const sub = getSubscription(channelId);
		return sub?.notifyOn.includes(status) ?? false;
	}

	function getThreshold(channelId: string): number {
		return getSubscription(channelId)?.downtimeThresholdSeconds ?? 0;
	}

	function toggleChannel(channelId: string) {
		if (isSubscribed(channelId)) {
			onchange(value.filter((n) => n.channelId !== channelId));
		} else {
			onchange([
				...value,
				{
					channelId,
					notifyOn: ['down', 'up'],
					downtimeThresholdSeconds: 0
				}
			]);
		}
	}

	function toggleNotifyOn(channelId: string, status: 'up' | 'down' | 'degraded') {
		const sub = getSubscription(channelId);
		if (!sub) return;

		const newNotifyOn = isNotifyOn(channelId, status)
			? sub.notifyOn.filter((s) => s !== status)
			: [...sub.notifyOn, status];

		onchange(value.map((n) => (n.channelId === channelId ? { ...n, notifyOn: newNotifyOn } : n)));
	}

	function setThreshold(channelId: string, threshold: number) {
		onchange(
			value.map((n) =>
				n.channelId === channelId ? { ...n, downtimeThresholdSeconds: threshold } : n
			)
		);
	}

	const typeLabels: Record<string, string> = {
		slack: 'Slack',
		discord: 'Discord',
		webhook: 'Webhook',
		webpush: 'Push'
	};

	const typeColors: Record<string, string> = {
		slack: 'bg-purple-100 text-purple-700',
		discord: 'bg-indigo-100 text-indigo-700',
		webhook: 'bg-gray-100 text-gray-700',
		webpush: 'bg-blue-100 text-blue-700'
	};
</script>

<div class="space-y-3">
	<h3 class="text-sm font-medium text-gray-700">Notifications</h3>
	{#if channels.length === 0}
		<p class="text-sm text-gray-500">No notification channels configured yet.</p>
	{:else}
		<div class="space-y-2">
			{#each channels as channel (channel.id)}
				<div class="rounded-lg border border-gray-200 bg-white p-3">
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="channel-{channel.id}"
							checked={isSubscribed(channel.id)}
							onchange={() => toggleChannel(channel.id)}
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label for="channel-{channel.id}" class="flex items-center gap-2">
							<span
								class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {typeColors[
									channel.type
								]}"
							>
								{typeLabels[channel.type]}
							</span>
							<span class="text-sm font-medium text-gray-900">{channel.name}</span>
						</label>
					</div>

					{#if isSubscribed(channel.id)}
						<div class="mt-3 ml-7 space-y-2">
							<div class="flex items-center gap-4">
								<span class="text-xs text-gray-500">Notify on:</span>
								<label class="flex items-center gap-1.5">
									<input
										type="checkbox"
										checked={isNotifyOn(channel.id, 'down')}
										onchange={() => toggleNotifyOn(channel.id, 'down')}
										class="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
									/>
									<span class="text-xs text-gray-700">Down</span>
								</label>
								<label class="flex items-center gap-1.5">
									<input
										type="checkbox"
										checked={isNotifyOn(channel.id, 'up')}
										onchange={() => toggleNotifyOn(channel.id, 'up')}
										class="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
									/>
									<span class="text-xs text-gray-700">Up</span>
								</label>
								<label class="flex items-center gap-1.5">
									<input
										type="checkbox"
										checked={isNotifyOn(channel.id, 'degraded')}
										onchange={() => toggleNotifyOn(channel.id, 'degraded')}
										class="h-3.5 w-3.5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
									/>
									<span class="text-xs text-gray-700">Degraded</span>
								</label>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-xs text-gray-500">Alert after down for:</span>
								<select
									value={getThreshold(channel.id)}
									onchange={(e) => setThreshold(channel.id, parseInt(e.currentTarget.value, 10))}
									class="rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
								>
									{#each THRESHOLD_OPTIONS as opt (opt.value)}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
