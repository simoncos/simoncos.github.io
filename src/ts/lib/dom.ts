/** Required controls are checked once during initialization; optional features use nullable queries. */
export function required<T>(value: T | null | undefined, name: string): T {
    if (value == null) throw new Error(`Missing required element or value: ${name}`);
    return value;
}

export function element(id: string): HTMLElement {
    return required(document.getElementById(id), id);
}
