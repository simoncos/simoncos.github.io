interface Window {
    __lowPowerMode?: boolean;
    __setLowPowerMode?: (on: boolean, opts?: { persist?: boolean }) => void;
    __playSlide?: (index: number) => void;
    __currentSlideIndex?: number;
    __pipeAdvance?: () => boolean;
}

interface Navigator {
    userAgentData?: {
        platform?: string;
    };
}

interface Element {
    style: CSSStyleDeclaration;
    dataset: DOMStringMap;
}

interface Event {
    detail?: {
        on?: boolean;
        [key: string]: unknown;
    };
}

interface HTMLCanvasElement {
    __dpr?: number;
    __w?: number;
    __h?: number;
    __ctx?: CanvasRenderingContext2D | null;
}

declare module "https://cdn.jsdelivr.net/npm/motion@11.11.17/+esm" {
    export const animate: any;
}
