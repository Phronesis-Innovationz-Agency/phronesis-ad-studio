// Free/paid tier limits and Stripe subscription state. Everything here is
// in-memory (a Map) - fine for a single-process MVP, but it resets on every
// restart and won't scale past one server instance. Replace with a real
// database before this handles paying customers at any volume.
export const FREE_TIER_MONTHLY_LIMIT = 3;

type Tier = 'free' | 'pro';
type SubscriptionStatus = 'active' | 'canceled';

type Subscriber = {
	stripeCustomerId: string;
	status: SubscriptionStatus;
};

// email -> subscription record, kept up to date by Stripe webhooks.
const subscribersByEmail = new Map<string, Subscriber>();
// stripeCustomerId -> email, so a subscription.updated/deleted webhook
// (which only carries the customer id, not the email) can find the record.
const emailByCustomerId = new Map<string, string>();
// session cookie -> email, once that browser has checked out or restored
// access. This is what makes a specific visitor "pro".
const emailBySession = new Map<string, string>();

type UsageRecord = {
	monthKey: string;
	count: number;
};

const usageBySession = new Map<string, UsageRecord>();

const currentMonthKey = () => new Date().toISOString().slice(0, 7); // "2026-09"

const getUsageRecord = (sessionId: string): UsageRecord => {
	const existing = usageBySession.get(sessionId);
	const monthKey = currentMonthKey();

	if (existing && existing.monthKey === monthKey) {
		return existing;
	}

	const fresh: UsageRecord = {monthKey, count: 0};
	usageBySession.set(sessionId, fresh);
	return fresh;
};

const resolveTier = (sessionId: string): Tier => {
	const email = emailBySession.get(sessionId);
	if (!email) {
		return 'free';
	}
	return subscribersByEmail.get(email)?.status === 'active' ? 'pro' : 'free';
};

export type UsageSummary = {
	tier: Tier;
	used: number;
	limit: number | null;
	remaining: number | null;
};

export const getUsage = (sessionId: string): UsageSummary => {
	const tier = resolveTier(sessionId);
	const record = getUsageRecord(sessionId);

	if (tier === 'pro') {
		return {tier: 'pro', used: record.count, limit: null, remaining: null};
	}

	return {
		tier: 'free',
		used: record.count,
		limit: FREE_TIER_MONTHLY_LIMIT,
		remaining: Math.max(0, FREE_TIER_MONTHLY_LIMIT - record.count),
	};
};

export const canGenerate = (sessionId: string): boolean => {
	if (resolveTier(sessionId) === 'pro') {
		return true;
	}
	return getUsageRecord(sessionId).count < FREE_TIER_MONTHLY_LIMIT;
};

export const recordRender = (sessionId: string): void => {
	getUsageRecord(sessionId).count += 1;
};

export const shouldWatermark = (sessionId: string): boolean => resolveTier(sessionId) === 'free';

// --- Stripe webhook hooks ---

export const linkSessionToEmail = (sessionId: string, email: string): void => {
	emailBySession.set(sessionId, email.toLowerCase());
};

export const setSubscriptionStatus = (
	email: string,
	stripeCustomerId: string,
	status: SubscriptionStatus,
): void => {
	const normalizedEmail = email.toLowerCase();
	subscribersByEmail.set(normalizedEmail, {stripeCustomerId, status});
	emailByCustomerId.set(stripeCustomerId, normalizedEmail);
};

export const setSubscriptionStatusByCustomerId = (
	stripeCustomerId: string,
	status: SubscriptionStatus,
): void => {
	const email = emailByCustomerId.get(stripeCustomerId);
	if (!email) {
		return; // Webhook for a customer we've never linked to a session - nothing to update.
	}
	subscribersByEmail.set(email, {stripeCustomerId, status});
};

// Unauthenticated "restore access": looks up an active subscription by
// email alone, no password or verification. Acceptable for an MVP with no
// login system, but be aware anyone who knows/guesses a paying customer's
// email can claim their Pro status this way. Replace with verified login
// (magic link, password, etc.) before this handles real paying customers.
export const restoreAccessByEmail = (sessionId: string, email: string): boolean => {
	const normalizedEmail = email.toLowerCase();
	const subscriber = subscribersByEmail.get(normalizedEmail);
	if (subscriber?.status !== 'active') {
		return false;
	}
	emailBySession.set(sessionId, normalizedEmail);
	return true;
};
