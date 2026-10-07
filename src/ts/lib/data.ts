export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function strings(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string');
}
export function finite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}
