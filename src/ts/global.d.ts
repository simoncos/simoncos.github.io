type SiteLanguage = "en" | "zh";

interface SiteLabel {
    en: string;
    zh: string;
}

interface SiteRoute {
    section: string;
    label: SiteLabel;
}

interface SiteShell {
    route: (pathname: string) => SiteRoute | null;
    here: SiteRoute | null;
    lang: SiteLanguage;
    labels: Record<string, SiteLabel>;
    reduced: boolean;
    navKey: string;
    lastKey: string;
    setLang?: (lang: SiteLanguage) => void;
    onLang?: (listener: (lang: SiteLanguage) => void) => void;
    fade?: (swap: () => void) => void;
}

interface Window {
    SITE_SHELL?: SiteShell;
}
