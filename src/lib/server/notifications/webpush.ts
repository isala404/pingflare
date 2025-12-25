import type { NotificationPayload, PushSubscription, VapidKeys } from '$lib/types/notification';

interface WebPushResult {
	success: boolean;
	error?: string;
	invalidSubscriptions?: string[];
}

export async function sendWebPushNotifications(
	subscriptions: PushSubscription[],
	payload: NotificationPayload,
	vapidKeys: VapidKeys,
	applicationServerUrl: string
): Promise<WebPushResult> {
	if (subscriptions.length === 0) {
		return { success: true };
	}

	const isRecovery =
		payload.previousStatus && payload.previousStatus !== 'up' && payload.status === 'up';
	const title = isRecovery
		? `Recovered: ${payload.monitorName}`
		: `${payload.status.toUpperCase()}: ${payload.monitorName}`;

	let body = `Status: ${payload.status.toUpperCase()}`;
	if (payload.url) {
		body += `\nURL: ${payload.url}`;
	}
	if (payload.errorMessage) {
		body += `\nError: ${payload.errorMessage}`;
	}

	const pushPayload = JSON.stringify({
		title,
		body,
		icon: '/favicon.png',
		badge: '/favicon.png',
		data: {
			monitorId: payload.monitorId,
			status: payload.status,
			url: '/'
		}
	});

	const invalidSubscriptions: string[] = [];
	const errors: string[] = [];
	const results = await Promise.allSettled(
		subscriptions.map(async (sub) => {
			const result = await sendPushToSubscription(
				sub,
				pushPayload,
				vapidKeys,
				applicationServerUrl
			);
			if (!result.success) {
				if (result.invalid) {
					invalidSubscriptions.push(sub.endpoint);
				}
				if (result.error) {
					errors.push(result.error);
				}
			}
			return result;
		})
	);

	const failures = results.filter(
		(r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
	);

	// Include detailed error info
	let errorMsg: string | undefined;
	if (failures.length > 0) {
		errorMsg = `${failures.length} push failed: ${errors.join('; ')}`;
	}

	return {
		success: failures.length === 0,
		error: errorMsg,
		invalidSubscriptions
	};
}

async function sendPushToSubscription(
	subscription: PushSubscription,
	payload: string,
	vapidKeys: VapidKeys,
	applicationServerUrl: string
): Promise<{ success: boolean; invalid?: boolean; error?: string }> {
	try {
		const endpoint = new URL(subscription.endpoint);
		const audience = `${endpoint.protocol}//${endpoint.host}`;

		const vapidHeader = await generateVapidHeader(vapidKeys, audience, applicationServerUrl);

		const encryptedPayload = await encryptPayload(payload, subscription.p256dh, subscription.auth);

		const response = await fetch(subscription.endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Encoding': 'aes128gcm',
				TTL: '86400',
				Authorization: vapidHeader.authorization,
				'Crypto-Key': vapidHeader.cryptoKey
			},
			body: encryptedPayload as unknown as BodyInit
		});

		if (response.status === 410 || response.status === 404) {
			return { success: false, invalid: true, error: 'Subscription expired' };
		}

		if (!response.ok) {
			const text = await response.text();
			return { success: false, error: `Push failed: ${response.status} ${text}` };
		}

		return { success: true };
	} catch (error) {
		return { success: false, error: `Push error: ${(error as Error).message}` };
	}
}

async function generateVapidHeader(
	vapidKeys: VapidKeys,
	audience: string,
	subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
	const now = Math.floor(Date.now() / 1000);
	const expiry = now + 12 * 60 * 60;

	const header = { typ: 'JWT', alg: 'ES256' };
	const claims = {
		aud: audience,
		exp: expiry,
		sub: subject
	};

	const headerB64 = base64UrlEncode(JSON.stringify(header));
	const claimsB64 = base64UrlEncode(JSON.stringify(claims));
	const unsignedToken = `${headerB64}.${claimsB64}`;

	const privateKey = await importPrivateKey(vapidKeys.privateKey, vapidKeys.publicKey);
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		privateKey,
		new TextEncoder().encode(unsignedToken)
	);

	const signatureB64 = base64UrlEncode(new Uint8Array(signature));
	const jwt = `${unsignedToken}.${signatureB64}`;

	return {
		authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
		cryptoKey: `p256ecdsa=${vapidKeys.publicKey}`
	};
}

async function encryptPayload(
	payload: string,
	p256dhKey: string,
	authSecret: string
): Promise<Uint8Array> {
	const userPublicKey = base64UrlDecode(p256dhKey);
	const userAuth = base64UrlDecode(authSecret);

	const localKeyPair = await crypto.subtle.generateKey(
		{ name: 'ECDH', namedCurve: 'P-256' },
		true,
		['deriveBits']
	);

	const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
	const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

	const userPublicKeyObj = await crypto.subtle.importKey(
		'raw',
		userPublicKey.buffer as ArrayBuffer,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[]
	);

	const sharedSecret = await crypto.subtle.deriveBits(
		{ name: 'ECDH', public: userPublicKeyObj },
		localKeyPair.privateKey,
		256
	);

	const salt = crypto.getRandomValues(new Uint8Array(16));

	const ikm = await hkdf(
		new Uint8Array(sharedSecret),
		userAuth,
		concat(utf8Encode('WebPush: info\0'), userPublicKey, localPublicKeyBytes),
		32
	);

	const prk = await hkdf(ikm, salt, utf8Encode('Content-Encoding: aes128gcm\0'), 16);
	const nonce = await hkdf(ikm, salt, utf8Encode('Content-Encoding: nonce\0'), 12);

	const key = await crypto.subtle.importKey(
		'raw',
		prk.buffer as ArrayBuffer,
		{ name: 'AES-GCM' },
		false,
		['encrypt']
	);

	const paddedPayload = concat(new TextEncoder().encode(payload), new Uint8Array([2]));

	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
		key,
		paddedPayload.buffer as ArrayBuffer
	);

	const recordSize = new Uint8Array(4);
	new DataView(recordSize.buffer).setUint32(0, 4096, false);

	return concat(
		salt,
		recordSize,
		new Uint8Array([65]),
		localPublicKeyBytes,
		new Uint8Array(encrypted)
	);
}

async function importPrivateKey(privateKeyD: string, publicKeyRaw: string): Promise<CryptoKey> {
	// Decode the raw public key to extract x and y coordinates
	const publicKeyBytes = base64UrlDecode(publicKeyRaw);

	// Raw public key is 65 bytes: 0x04 (uncompressed) + 32 bytes x + 32 bytes y
	const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
	const y = base64UrlEncode(publicKeyBytes.slice(33, 65));

	const jwk: JsonWebKey = {
		kty: 'EC',
		crv: 'P-256',
		x,
		y,
		d: privateKeyD,
		ext: true
	};

	return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
		'sign'
	]);
}

async function hkdf(
	ikm: Uint8Array,
	salt: Uint8Array,
	info: Uint8Array,
	length: number
): Promise<Uint8Array> {
	const saltBuffer = (salt.length > 0 ? salt : new Uint8Array(32)).buffer as ArrayBuffer;
	const saltKey = await crypto.subtle.importKey(
		'raw',
		saltBuffer,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm.buffer as ArrayBuffer));

	const prkKey = await crypto.subtle.importKey(
		'raw',
		prk.buffer as ArrayBuffer,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	const infoWithCounter = concat(info, new Uint8Array([1]));
	const output = new Uint8Array(
		await crypto.subtle.sign('HMAC', prkKey, infoWithCounter.buffer as ArrayBuffer)
	);
	return output.slice(0, length);
}

function base64UrlEncode(data: string | Uint8Array): string {
	const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	const binary = String.fromCharCode(...bytes);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
	const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
	const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}

function utf8Encode(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

export async function generateVapidKeys(): Promise<VapidKeys> {
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign'
	]);

	const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
	const publicKey = base64UrlEncode(new Uint8Array(publicKeyRaw));

	const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
	const privateKey = privateKeyJwk.d!;

	return { publicKey, privateKey };
}
