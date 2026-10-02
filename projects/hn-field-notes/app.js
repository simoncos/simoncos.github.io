"use strict";
let months = [
    { id: "2026-06", label: "Jun 2026", count: 0, summary: "Current HN WAYWO working set." },
    { id: "2026-05", label: "May 2026", count: 0, summary: "Current HN WAYWO working set." },
    { id: "2026-04", label: "Apr 2026", count: 0, summary: "Current HN WAYWO working set." }
];
let activeSource = "missing";
let activeSourceMeta = null;
let activeGeneratedAt = "";
const SUPPORTED_SCHEMA_VERSION = "0.5.0";
const SUPPORTED_EXTRACTOR_VERSION = "2.2.0";
const READ_ONLY_PUBLIC = typeof document !== "undefined" && document.documentElement?.dataset?.readOnly === "true";
let ideas = [];
let communityByIdea = {};
const STORAGE_KEYS = {
    saved: "hn-field-notes:saved",
    notes: "hn-field-notes:notes",
    preImport: "hn-field-notes:pre-import-backup"
};
const HTML_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
function escapeAttr(value) {
    return escapeHtml(value);
}
function safeClassToken(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "unknown";
}
function safeUrl(value) {
    const raw = String(value ?? "").trim();
    try {
        const url = new URL(raw, window.location.href);
        if (url.protocol === "http:" || url.protocol === "https:")
            return url.href;
    }
    catch {
        // Fall through to inert URL for malformed values.
    }
    return "about:blank";
}
function displayUrl(value) {
    const raw = String(value ?? "").trim().replace(/^https?:\/\//, "");
    return escapeHtml(raw || "Unavailable link");
}
function serializeCsvCell(value) {
    const raw = String(value ?? "");
    const protectedValue = /^[\t\r\n]|^\s*[=+@-]/u.test(raw) ? `'${raw}` : raw;
    return `"${protectedValue.replaceAll('"', '""')}"`;
}
function isUnverifiedProjectName(idea) {
    const name = idea.name.trim();
    const genericLabel = /^(?:github|gitlab|youtube|youtu|website|demo|app|project|repo|repository|i|sp|wg\d+)$/iu.test(name);
    const hashLabel = /^[a-f0-9]{24,64}$/iu.test(name);
    const lowConfidence = Boolean(idea.extractionMeta &&
        (idea.extractionMeta.nameConfidence < 0.7 || idea.extractionMeta.nameMethod === "legacy-label"));
    return hashLabel || genericLabel || (lowConfidence && name.length <= 4);
}
function projectDisplayName(idea) {
    if (isUnverifiedProjectName(idea))
        return `Untitled project · ${idea.author || "unknown author"}`;
    return idea.name.trim();
}
const WORKSPACE_BACKUP_SCHEMA = "hn-field-notes-workspace-3.0.0";
const STABLE_PROJECT_ID = /^hn-comment-[1-9][0-9]*$/u;
const UNSAFE_RECORD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const memoryStorage = new Map();
const memoryStorageOverrides = new Set();
let storageNoticeReady = false;
let storageNoticePending = false;
let storageNoticeShown = false;
let workspaceRecoveryNotice = "";
function reportStorageFailure() {
    if (storageNoticeShown)
        return;
    if (!storageNoticeReady) {
        storageNoticePending = true;
        return;
    }
    storageNoticeShown = true;
    storageNoticePending = false;
    showToast("Browser storage is unavailable. Changes will last for this session only.");
}
function enableStorageNotices() {
    storageNoticeReady = true;
    if (storageNoticePending) {
        reportStorageFailure();
    }
    else if (workspaceRecoveryNotice) {
        showToast(workspaceRecoveryNotice);
    }
}
function safeStorageRead(key) {
    if (READ_ONLY_PUBLIC)
        return null;
    if (memoryStorageOverrides.has(key))
        return memoryStorage.get(key) ?? null;
    try {
        const value = localStorage.getItem(key);
        if (value === null)
            memoryStorage.delete(key);
        else
            memoryStorage.set(key, value);
        return value;
    }
    catch {
        reportStorageFailure();
        return memoryStorage.get(key) ?? null;
    }
}
function safeStorageRemove(key) {
    if (READ_ONLY_PUBLIC)
        return false;
    memoryStorage.delete(key);
    try {
        localStorage.removeItem(key);
        if (localStorage.getItem(key) !== null)
            throw new Error("Storage removal read-back failed");
        memoryStorageOverrides.delete(key);
        return true;
    }
    catch {
        memoryStorageOverrides.add(key);
        reportStorageFailure();
        return false;
    }
}
function safeStorageWrite(key, value) {
    if (READ_ONLY_PUBLIC)
        return false;
    memoryStorage.set(key, value);
    try {
        localStorage.setItem(key, value);
        const persisted = localStorage.getItem(key) === value;
        if (!persisted)
            throw new Error("Storage read-back failed");
        memoryStorageOverrides.delete(key);
        return true;
    }
    catch {
        memoryStorageOverrides.add(key);
        reportStorageFailure();
        return false;
    }
}
function safeParse(key, fallback, validator) {
    try {
        const raw = safeStorageRead(key);
        if (!raw)
            return fallback;
        const parsed = JSON.parse(raw);
        if (!validator(parsed)) {
            safeStorageRemove(key);
            return fallback;
        }
        return parsed;
    }
    catch {
        safeStorageRemove(key);
        return fallback;
    }
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasExactKeys(value, keys) {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function isStableProjectId(value) {
    return typeof value === "string" && STABLE_PROJECT_ID.test(value);
}
function isUniqueProjectIdArray(value) {
    return Array.isArray(value) && value.every(isStableProjectId) && new Set(value).size === value.length;
}
function isNotesRecord(value) {
    return isRecord(value) && Object.entries(value).every(([key, note]) => isStableProjectId(key) && !UNSAFE_RECORD_KEYS.has(key) && typeof note === "string");
}
function loadSaved() {
    return safeParse(STORAGE_KEYS.saved, [], isUniqueProjectIdArray);
}
function loadNotes() {
    return safeParse(STORAGE_KEYS.notes, {}, isNotesRecord);
}
function persistSaved() {
    return safeStorageWrite(STORAGE_KEYS.saved, JSON.stringify(Array.from(state.saved)));
}
function persistNotes() {
    return safeStorageWrite(STORAGE_KEYS.notes, JSON.stringify(state.notesByProjectId));
}
function removeSavedProject(projectId) {
    state.saved.delete(projectId);
}
function getIdeaNote(ideaId) {
    return state.notesByProjectId[ideaId] || "";
}
function ideaNoteStatus(note) {
    if (!note)
        return "Nothing written yet";
    return memoryStorageOverrides.has(STORAGE_KEYS.notes) ? "Session only" : "Saved locally";
}
function persistIdeaNote(ideaId, note) {
    if (READ_ONLY_PUBLIC)
        return false;
    if (note)
        state.notesByProjectId[ideaId] = note;
    else
        delete state.notesByProjectId[ideaId];
    return persistNotes();
}
function buildWorkspaceBackup() {
    return {
        schemaVersion: WORKSPACE_BACKUP_SCHEMA,
        exportedAt: new Date().toISOString(),
        userState: {
            savedProjectIds: Array.from(state.saved),
            notesByProjectId: structuredClone(state.notesByProjectId)
        }
    };
}
function exportWorkspaceState() {
    if (READ_ONLY_PUBLIC)
        return;
    const backup = buildWorkspaceBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2), "\n"], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hn-field-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported saved ideas and notes.");
}
function isWorkspaceBackupV3(value) {
    if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "exportedAt", "userState"]))
        return false;
    if (value.schemaVersion !== WORKSPACE_BACKUP_SCHEMA || typeof value.exportedAt !== "string")
        return false;
    if (Number.isNaN(Date.parse(value.exportedAt)) || new Date(value.exportedAt).toISOString() !== value.exportedAt)
        return false;
    if (!isRecord(value.userState) || !hasExactKeys(value.userState, ["savedProjectIds", "notesByProjectId"]))
        return false;
    return isUniqueProjectIdArray(value.userState.savedProjectIds) && isNotesRecord(value.userState.notesByProjectId);
}
function workspaceStorageValues(backup) {
    return [
        [STORAGE_KEYS.saved, JSON.stringify(backup.userState.savedProjectIds)],
        [STORAGE_KEYS.notes, JSON.stringify(backup.userState.notesByProjectId)]
    ];
}
function restoreWorkspaceBackup(backup) {
    return workspaceStorageValues(backup)
        .map(([key, value]) => safeStorageWrite(key, value))
        .every(Boolean);
}
function restorePendingWorkspaceImport() {
    const raw = safeStorageRead(STORAGE_KEYS.preImport);
    if (!raw)
        return;
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        workspaceRecoveryNotice = "An interrupted import snapshot could not be verified. Local workspace data was left unchanged.";
        return;
    }
    if (!isWorkspaceBackupV3(parsed)) {
        workspaceRecoveryNotice = "An interrupted import snapshot could not be verified. Local workspace data was left unchanged.";
        return;
    }
    const restored = restoreWorkspaceBackup(parsed);
    const journalCleared = restored && safeStorageRemove(STORAGE_KEYS.preImport);
    workspaceRecoveryNotice = journalCleared
        ? "Recovered the workspace saved before an interrupted import."
        : "Could not fully recover an interrupted import. The rollback snapshot was kept for the next load.";
}
restorePendingWorkspaceImport();
async function importWorkspaceState(file) {
    if (READ_ONLY_PUBLIC)
        return;
    try {
        if (file.size > 5_000_000)
            throw new Error("Backup is larger than the 5 MB safety limit.");
        const parsed = JSON.parse(await file.text());
        if (!isWorkspaceBackupV3(parsed)) {
            throw new Error(`Unsupported workspace backup format. Only ${WORKSPACE_BACKUP_SCHEMA} is accepted.`);
        }
        const incomingNotes = parsed.userState.notesByProjectId;
        const noteConflicts = Object.keys(incomingNotes).filter((id) => Boolean(state.notesByProjectId[id]) && Boolean(incomingNotes[id]) && state.notesByProjectId[id] !== incomingNotes[id]);
        if (noteConflicts.length) {
            throw new Error(`Import stopped: ${noteConflicts.length} personal note conflict${noteConflicts.length === 1 ? "" : "s"}. No local data changed.`);
        }
        const rollbackBackup = buildWorkspaceBackup();
        if (!safeStorageWrite(STORAGE_KEYS.preImport, JSON.stringify(rollbackBackup))) {
            throw new Error("Import stopped because a rollback snapshot could not be saved.");
        }
        const nextSaved = new Set([...state.saved, ...parsed.userState.savedProjectIds]);
        const nextNotes = { ...parsed.userState.notesByProjectId, ...state.notesByProjectId };
        const previousSaved = state.saved;
        const previousNotes = state.notesByProjectId;
        state.saved = nextSaved;
        state.notesByProjectId = nextNotes;
        const writesSucceeded = [persistSaved(), persistNotes()].every(Boolean);
        const journalCleared = writesSucceeded && safeStorageRemove(STORAGE_KEYS.preImport);
        if (!writesSucceeded || !journalCleared) {
            state.saved = previousSaved;
            state.notesByProjectId = previousNotes;
            if (restoreWorkspaceBackup(rollbackBackup))
                safeStorageRemove(STORAGE_KEYS.preImport);
            throw new Error("Import failed during storage write; the previous workspace was restored.");
        }
        render();
        const currentIds = new Set(ideas.map((idea) => idea.id));
        const unavailable = Array.from(nextSaved).filter((id) => !currentIds.has(id)).length;
        showToast(`Imported workspace: ${nextSaved.size} saved · ${Object.keys(nextNotes).length} notes${unavailable ? ` · ${unavailable} unavailable preserved` : ""}.`);
    }
    catch (error) {
        showToast(error instanceof Error ? error.message : "Could not import that workspace backup.");
    }
}
const PAYLOAD_FETCH_TIMEOUT_MS = 15_000;
async function loadGeneratedPayload({ timeoutMs = PAYLOAD_FETCH_TIMEOUT_MS } = {}) {
    const archivePath = "data/hn-waywo-archive.json";
    const livePath = "data/hn-waywo-live.json";
    const errors = [];
    const [archiveResult, liveResult] = await Promise.all([
        fetchPayloadFile(archivePath, { timeoutMs }),
        fetchPayloadFile(livePath, { timeoutMs })
    ]);
    if (archiveResult.error)
        errors.push(archiveResult.error);
    if (liveResult.error)
        errors.push(liveResult.error);
    const archive = archiveResult.payload;
    const live = liveResult.payload;
    if (archive || live) {
        try {
            applyLoadedDataset(mergePayloads(archive, live));
            state.dataError = errors.length
                ? `Partial HN payload loaded. ${errors.join(" ")}`
                : "";
            return;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`archive/live merge: ${message}`);
            for (const fallback of [archive, live]) {
                if (!fallback)
                    continue;
                try {
                    applyLoadedDataset(toLoadedUiDataset(fallback));
                    state.dataError = `Degraded HN payload loaded from ${fallback.path}. ${errors.join(" ")}`;
                    return;
                }
                catch (fallbackError) {
                    const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                    errors.push(`${fallback.path} fallback: ${fallbackMessage}`);
                }
            }
        }
    }
    if (errors.length) {
        state.dataError = `HN payload could not be loaded. ${errors.join(" ")}`;
    }
    activeSource = "missing";
    activeSourceMeta = null;
    activeGeneratedAt = "";
    ideas = [];
    communityByIdea = {};
    syncDatasetCounts([]);
}
async function fetchPayloadFile(path, { timeoutMs = PAYLOAD_FETCH_TIMEOUT_MS } = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new RangeError("timeoutMs must be positive");
    }
    const controller = new AbortController();
    let timeoutId = 0;
    const timeout = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => {
            const error = new Error(`request timed out after ${timeoutMs}ms`);
            error.name = "AbortError";
            controller.abort();
            reject(error);
        }, timeoutMs);
    });
    try {
        const response = await Promise.race([
            Promise.resolve().then(() => fetch(path, { cache: "no-store", signal: controller.signal })),
            timeout
        ]);
        if (!response.ok) {
            const statusDetail = [response.status, response.statusText].filter(Boolean).join(" ");
            throw new Error(`HTTP ${statusDetail || "request failed"}`);
        }
        const payload = validateRuntimePayload(await Promise.race([response.json(), timeout]));
        return { payload: { path, payload } };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { error: `${path}: ${message}` };
    }
    finally {
        clearTimeout(timeoutId);
    }
}
function validateRuntimePayload(value) {
    const payload = requireRecordValue(value, "payload");
    assertRuntimePayload(payload.schemaVersion === SUPPORTED_SCHEMA_VERSION, `schemaVersion must be ${SUPPORTED_SCHEMA_VERSION}`);
    requireNonEmptyString(payload.generatedAt, "generatedAt");
    requireNonEmptyString(payload.source, "source");
    const sourceMeta = requireRecordValue(payload.sourceMeta, "sourceMeta");
    const sourceExtraction = requireRecordValue(sourceMeta.extraction, "sourceMeta.extraction");
    assertRuntimePayload(sourceExtraction.extractorVersion === SUPPORTED_EXTRACTOR_VERSION, `sourceMeta.extraction.extractorVersion must be ${SUPPORTED_EXTRACTOR_VERSION}`);
    assertRuntimePayload(sourceExtraction.selectionProvenance === "current-extractor" ||
        sourceExtraction.selectionProvenance === "legacy-selection-migrated", "sourceMeta.extraction.selectionProvenance is unsupported");
    assertRuntimePayload(sourceExtraction.sourceTextScope === "full-comment" || sourceExtraction.sourceTextScope === "preserved-excerpt", "sourceMeta.extraction.sourceTextScope is unsupported");
    assertRuntimePayload(sourceExtraction.metadataProvenance === "native" || sourceExtraction.metadataProvenance === "migrated-v1", "sourceMeta.extraction.metadataProvenance is unsupported");
    const payloadMonths = requireArrayValue(payload.months, "months[]");
    const payloadProjects = requireArrayValue(payload.projects, "projects[]");
    const payloadCommunity = requireRecordValue(payload.communityByIdea, "communityByIdea");
    const monthIds = new Set();
    for (const [index, monthValue] of payloadMonths.entries()) {
        const month = requireRecordValue(monthValue, `months[${index}]`);
        const monthId = requireNonEmptyString(month.id, `months[${index}].id`);
        requireNonEmptyString(month.label, `months[${index}].label`);
        requireNumberValue(month.count, `months[${index}].count`);
        requireNonEmptyString(month.summary, `months[${index}].summary`);
        assertRuntimePayload(!monthIds.has(monthId), `months[${index}].id is duplicated`);
        monthIds.add(monthId);
    }
    const projectCountsByMonth = new Map();
    const projectIds = new Set();
    for (const [index, projectValue] of payloadProjects.entries()) {
        const project = requireRecordValue(projectValue, `projects[${index}]`);
        const projectId = requireNonEmptyString(project.id, `projects[${index}].id`);
        assertRuntimePayload(!projectIds.has(projectId), `projects[${index}].id is duplicated`);
        projectIds.add(projectId);
        requireNumberValue(project.sourceCommentId, `projects[${index}].sourceCommentId`);
        const projectMonth = requireNonEmptyString(project.month, `projects[${index}].month`);
        projectCountsByMonth.set(projectMonth, (projectCountsByMonth.get(projectMonth) || 0) + 1);
        requireNonEmptyString(project.name, `projects[${index}].name`);
        requireNonEmptyString(project.description, `projects[${index}].description`);
        requireNonEmptyString(project.category, `projects[${index}].category`);
        requireArrayValue(project.tags, `projects[${index}].tags`);
        requireNonEmptyString(project.source, `projects[${index}].source`);
        requireNonEmptyString(project.sourceType, `projects[${index}].sourceType`);
        requireNonEmptyString(project.confidence, `projects[${index}].confidence`);
        requireNonEmptyString(project.buildability, `projects[${index}].buildability`);
        requireNumberValue(project.inspiration, `projects[${index}].inspiration`);
        requireBooleanValue(project.ai, `projects[${index}].ai`);
        requireArrayValue(project.lenses, `projects[${index}].lenses`);
        requireNonEmptyString(project.angle, `projects[${index}].angle`);
        requireNonEmptyString(project.ideaAngle, `projects[${index}].ideaAngle`);
        requireNonEmptyString(project.tryNext, `projects[${index}].tryNext`);
        requireNonEmptyString(project.author, `projects[${index}].author`);
        requireNonEmptyString(project.date, `projects[${index}].date`);
        requireNonEmptyString(project.thread, `projects[${index}].thread`);
        requireNonEmptyString(project.url, `projects[${index}].url`);
        requireNonEmptyString(project.original, `projects[${index}].original`);
        requireNonEmptyString(project.evidence, `projects[${index}].evidence`);
        const sourceText = requireNonEmptyString(project.sourceText, `projects[${index}].sourceText`);
        const extractionMeta = requireRecordValue(project.extractionMeta, `projects[${index}].extractionMeta`);
        assertRuntimePayload(extractionMeta.extractorVersion === SUPPORTED_EXTRACTOR_VERSION, `projects[${index}].extractionMeta.extractorVersion must be ${SUPPORTED_EXTRACTOR_VERSION}`);
        const candidateConfidence = requireNumberValue(extractionMeta.candidateConfidence, `projects[${index}].extractionMeta.candidateConfidence`);
        const nameConfidence = requireNumberValue(extractionMeta.nameConfidence, `projects[${index}].extractionMeta.nameConfidence`);
        assertRuntimePayload(candidateConfidence >= 0 && candidateConfidence <= 1, `projects[${index}].extractionMeta.candidateConfidence must be between 0 and 1`);
        assertRuntimePayload(nameConfidence >= 0 && nameConfidence <= 1, `projects[${index}].extractionMeta.nameConfidence must be between 0 and 1`);
        requireNonEmptyString(extractionMeta.nameMethod, `projects[${index}].extractionMeta.nameMethod`);
        requireArrayValue(extractionMeta.reasons, `projects[${index}].extractionMeta.reasons`);
        const evidenceSpans = requireArrayValue(extractionMeta.evidenceSpans, `projects[${index}].extractionMeta.evidenceSpans`);
        assertRuntimePayload(evidenceSpans.length > 0, `projects[${index}].extractionMeta.evidenceSpans must not be empty`);
        for (const [spanIndex, spanValue] of evidenceSpans.entries()) {
            const spanPath = `projects[${index}].extractionMeta.evidenceSpans[${spanIndex}]`;
            const span = requireRecordValue(spanValue, spanPath);
            const start = requireNumberValue(span.start, `${spanPath}.start`);
            const end = requireNumberValue(span.end, `${spanPath}.end`);
            const quote = requireNonEmptyString(span.quote, `${spanPath}.quote`);
            assertRuntimePayload(Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start, `${spanPath} must use a valid integer range`);
            assertRuntimePayload(end <= sourceText.length && sourceText.slice(start, end) === quote, `${spanPath}.quote must match sourceText`);
            assertRuntimePayload(span.sourceCommentId === project.sourceCommentId, `${spanPath}.sourceCommentId must match the project`);
        }
        const review = requireRecordValue(extractionMeta.review, `projects[${index}].extractionMeta.review`);
        requireBooleanValue(review.required, `projects[${index}].extractionMeta.review.required`);
        requireArrayValue(review.reasons, `projects[${index}].extractionMeta.review.reasons`);
        assertRuntimePayload(review.status === "pending", `projects[${index}].extractionMeta.review.status must be pending`);
        requireNonEmptyString(project.why, `projects[${index}].why`);
        requireArrayValue(project.spinOffs, `projects[${index}].spinOffs`);
        requireNonEmptyString(project.prototype, `projects[${index}].prototype`);
        requireArrayValue(project.skills, `projects[${index}].skills`);
        requireArrayValue(project.questions, `projects[${index}].questions`);
        const community = requireRecordValue(payloadCommunity[projectId], `communityByIdea.${projectId}`);
        requireNonEmptyString(community.pulse, `communityByIdea.${projectId}.pulse`);
        const comments = requireArrayValue(community.comments, `communityByIdea.${projectId}.comments`);
        for (const [commentIndex, commentValue] of comments.entries()) {
            const comment = requireRecordValue(commentValue, `communityByIdea.${projectId}.comments[${commentIndex}]`);
            requireNonEmptyString(comment.type, `communityByIdea.${projectId}.comments[${commentIndex}].type`);
            requireNonEmptyString(comment.angle, `communityByIdea.${projectId}.comments[${commentIndex}].angle`);
            requireNonEmptyString(comment.text, `communityByIdea.${projectId}.comments[${commentIndex}].text`);
            const commentPath = `communityByIdea.${projectId}.comments[${commentIndex}]`;
            const commentUrl = requireNonEmptyString(comment.commentUrl, `${commentPath}.commentUrl`);
            const replySource = /^https:\/\/news\.ycombinator\.com\/item\?id=([1-9][0-9]*)#([1-9][0-9]*)$/u.exec(commentUrl);
            assertRuntimePayload((typeof comment.commentId === "number" || typeof comment.commentId === "string") &&
                replySource && replySource[2] === String(comment.commentId), `${commentPath}.commentUrl must identify a valid HN commentId`);
        }
    }
    for (const [projectMonth, expectedCount] of projectCountsByMonth.entries()) {
        assertRuntimePayload(monthIds.has(projectMonth), `months[] is missing ${projectMonth}; expected ${expectedCount} emitted project(s) for that month`);
    }
    return payload;
}
function assertRuntimePayload(condition, message) {
    if (!condition)
        throw new Error(message);
}
function requireRecordValue(value, path) {
    assertRuntimePayload(isRecord(value), `${path} must be an object`);
    return value;
}
function requireArrayValue(value, path) {
    assertRuntimePayload(Array.isArray(value), `${path} must be an array`);
    return value;
}
function requireNonEmptyString(value, path) {
    assertRuntimePayload(typeof value === "string" && value.trim().length > 0, `${path} must be a non-empty string`);
    return value;
}
function requireNumberValue(value, path) {
    assertRuntimePayload(typeof value === "number" && Number.isFinite(value), `${path} must be a finite number`);
    return value;
}
function requireBooleanValue(value, path) {
    assertRuntimePayload(typeof value === "boolean", `${path} must be a boolean`);
    return value;
}
function mergePayloads(archive, live) {
    if (archive && live && archive.payload.source?.startsWith("hn-archive") && live.payload.source?.startsWith("hn-live")) {
        const liveMonths = new Set((live.payload.months || []).map((month) => month.id));
        const archiveMonths = new Map((archive.payload.months || []).map((month) => [month.id, month]));
        const mergedProjects = [
            ...archive.payload.projects.filter((idea) => !liveMonths.has(idea.month)),
            ...live.payload.projects
        ];
        const mergedMonths = [
            ...(archive.payload.months || []).filter((month) => !liveMonths.has(month.id)),
            ...(live.payload.months || []).map((month) => ({ ...archiveMonths.get(month.id), ...month }))
        ];
        const combinedCommunity = {
            ...archive.payload.communityByIdea,
            ...live.payload.communityByIdea
        };
        return {
            path: `${archive.path}+${live.path}`,
            dataset: validateMergedUiDataset({
                kind: "ui-dataset",
                generatedAt: live.payload.generatedAt || archive.payload.generatedAt || "",
                source: `hn-archive+live:${archive.payload.sourceMeta?.from || ""}..${archive.payload.sourceMeta?.to || ""}`,
                sourceMeta: {
                    ...(archive.payload.sourceMeta || {}),
                    live: live.payload.sourceMeta,
                    emittedProjects: mergedProjects.length
                },
                months: mergedMonths,
                projects: mergedProjects,
                communityByIdea: filterCommunityForProjects(mergedProjects, combinedCommunity)
            })
        };
    }
    if (archive)
        return toLoadedUiDataset(archive);
    if (live)
        return toLoadedUiDataset(live);
    throw new Error("No payload available to merge.");
}
function toLoadedUiDataset(loaded) {
    const payload = loaded.payload;
    return {
        path: loaded.path,
        dataset: validateMergedUiDataset({
            kind: "ui-dataset",
            generatedAt: payload.generatedAt || "",
            source: payload.source || loaded.path,
            sourceMeta: payload.sourceMeta,
            months: payload.months || [],
            projects: payload.projects,
            communityByIdea: filterCommunityForProjects(payload.projects, payload.communityByIdea)
        })
    };
}
function filterCommunityForProjects(projectRows, sourceCommunity) {
    return Object.fromEntries(projectRows.map((project) => {
        const community = sourceCommunity[project.id];
        assertRuntimePayload(Boolean(community), `communityByIdea is missing final project id: ${project.id}`);
        return [project.id, community];
    }));
}
function validateMergedUiDataset(dataset) {
    assertRuntimePayload(dataset.kind === "ui-dataset", "merged dataset kind must be ui-dataset");
    const projectIds = new Set();
    for (const project of dataset.projects) {
        assertRuntimePayload(!projectIds.has(project.id), `duplicate merged project id: ${project.id}`);
        projectIds.add(project.id);
    }
    for (const communityId of Object.keys(dataset.communityByIdea)) {
        assertRuntimePayload(projectIds.has(communityId), `orphan communityByIdea key: ${communityId}`);
    }
    for (const projectId of projectIds) {
        assertRuntimePayload(Boolean(dataset.communityByIdea[projectId]), `missing communityByIdea key: ${projectId}`);
    }
    const monthIds = new Set(dataset.months.map((month) => month.id));
    for (const project of dataset.projects) {
        assertRuntimePayload(monthIds.has(project.month), `merged months are missing project month: ${project.month}`);
    }
    return dataset;
}
function applyLoadedDataset(loaded) {
    const dataset = validateMergedUiDataset(loaded.dataset);
    const archivePayload = dataset.source.startsWith("hn-archive");
    const archiveLivePayload = dataset.source.startsWith("hn-archive+live");
    const livePayload = dataset.source.startsWith("hn-live");
    ideas = dataset.projects;
    communityByIdea = dataset.communityByIdea;
    activeSource = dataset.source || loaded.path;
    activeSourceMeta = dataset.sourceMeta || null;
    activeGeneratedAt = dataset.generatedAt || "";
    syncDatasetCounts(dataset.months.length ? dataset.months : months);
    state.month = defaultMonthId();
    const label = archiveLivePayload ? "HN archive + latest live" : archivePayload ? "HN archive" : livePayload ? "HN live" : "JSON";
    state.dataMode = `Loaded ${label} payload: ${ideas.length} extracted candidates`;
}
function syncDatasetCounts(sourceMonths) {
    const counts = countIdeasByMonth(ideas);
    const sourceById = new Map(sourceMonths.map((month) => [month.id, month]));
    const monthIds = new Set([...sourceById.keys(), ...counts.keys()]);
    months = Array.from(monthIds)
        .map((id) => {
        const sourceMonth = sourceById.get(id);
        const count = counts.get(id) || 0;
        return {
            id,
            label: sourceMonth?.label || monthLabelFromId(id),
            count,
            summary: sourceMonth?.summary || `${count} extracted candidate${count === 1 ? "" : "s"} in the current payload.`,
            status: sourceMonth?.status || (count > 0 ? "ready" : "no_candidates"),
            threadUrl: sourceMonth?.threadUrl,
            threadTitle: sourceMonth?.threadTitle,
            error: sourceMonth?.error
        };
    })
        .sort((a, b) => b.id.localeCompare(a.id));
}
function countIdeasByMonth(projectRows) {
    return projectRows.reduce((acc, idea) => {
        acc.set(idea.month, (acc.get(idea.month) || 0) + 1);
        return acc;
    }, new Map());
}
function monthLabelFromId(id) {
    const [year, month] = id.split("-");
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    if (Number.isNaN(date.getTime()))
        return id;
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
function defaultMonthId() {
    return firstMonthWithIdeas() || months[0]?.id || state.month;
}
function firstMonthWithIdeas() {
    return months.find((month) => month.count > 0)?.id || "";
}
function formatDateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const state = {
    view: "scout",
    month: "",
    savedOnly: false,
    cardLimit: 10,
    mobileFiltersOpen: false,
    archiveExpanded: false,
    search: "",
    category: "all",
    ai: "all",
    effort: "all",
    hasRepliesOnly: false,
    sort: "newest",
    trendMetric: "category",
    selectedId: null,
    saved: new Set(loadSaved()),
    notesByProjectId: loadNotes(),
    focusNote: null,
    dataMode: "Loading HN payload",
    dataError: ""
};
function requireElement(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing required element #${id}`);
    return element;
}
const els = {
    tabs: document.querySelectorAll(".tab"),
    monthList: requireElement("monthList"),
    activeMonthLabel: requireElement("activeMonthLabel"),
    monthSummary: requireElement("monthSummary"),
    searchInput: requireElement("searchInput"),
    categorySelect: requireElement("categorySelect"),
    aiSelect: requireElement("aiSelect"),
    effortSelect: requireElement("effortSelect"),
    sortSelect: requireElement("sortSelect"),
    trendMetric: requireElement("trendMetric"),
    clearFilters: requireElement("clearFilters"),
    mobileFilterToggle: requireElement("mobileFilterToggle"),
    scoutToolbar: requireElement("scoutToolbar"),
    activeFilterNote: requireElement("activeFilterNote"),
    ideaRows: requireElement("ideaRows"),
    ideaCards: requireElement("ideaCards"),
    resultCount: requireElement("resultCount"),
    workbenchContent: requireElement("workbenchContent"),
    workbench: document.querySelector(".workbench"),
    workbenchBackdrop: requireElement("workbenchBackdrop"),
    savedButton: requireElement("savedButton"),
    trendSummary: requireElement("trendSummary"),
    trendMatrix: requireElement("trendMatrix"),
    trendCaveat: requireElement("trendCaveat"),
    exportButton: requireElement("exportButton"),
    exportWorkspace: requireElement("exportWorkspace"),
    importWorkspace: requireElement("importWorkspace"),
    workspaceImportInput: requireElement("workspaceImportInput"),
    topbarDataMeta: requireElement("topbarDataMeta"),
    topbarModeLabel: requireElement("topbarModeLabel"),
    topbarSourceLabel: requireElement("topbarSourceLabel"),
    dataStatus: requireElement("dataStatus"),
    toast: requireElement("toast")
};
async function init() {
    enableStorageNotices();
    await loadGeneratedPayload();
    renderMonths();
    populateCategories();
    bindEvents();
    updateMobileFilterDisclosure();
    syncWorkbenchAccessibility();
    switchView(state.view);
    render();
}
function bindEvents() {
    const utilityMenu = document.querySelector(".utility-menu");
    const utilityTrigger = utilityMenu?.querySelector("summary");
    const closeUtility = (restoreFocus) => {
        if (!utilityMenu?.open)
            return;
        utilityMenu.open = false;
        if (restoreFocus)
            utilityTrigger?.focus();
    };
    document.getElementById("closeUtility")?.addEventListener("click", () => closeUtility(true));
    document.addEventListener("click", (event) => {
        if (event.target instanceof Node && !utilityMenu?.contains(event.target))
            closeUtility(false);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && utilityMenu?.open) {
            event.preventDefault();
            closeUtility(true);
        }
    });
    els.tabs.forEach((tab) => {
        tab.addEventListener("click", () => switchView(tab.dataset.view, { reveal: true }));
        tab.addEventListener("keydown", (event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                return;
            event.preventDefault();
            const tabs = Array.from(els.tabs);
            const currentIndex = tabs.indexOf(tab);
            let nextIndex = currentIndex;
            if (event.key === "ArrowLeft")
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            if (event.key === "ArrowRight")
                nextIndex = (currentIndex + 1) % tabs.length;
            if (event.key === "Home")
                nextIndex = 0;
            if (event.key === "End")
                nextIndex = tabs.length - 1;
            tabs[nextIndex].focus();
            switchView(tabs[nextIndex].dataset.view, { reveal: true });
        });
    });
    els.searchInput.addEventListener("input", () => {
        state.search = els.searchInput.value.trim().toLowerCase();
        resetListSelection();
        renderScout();
    });
    els.categorySelect.addEventListener("change", () => {
        state.category = els.categorySelect.value;
        resetListSelection();
        renderScout();
    });
    els.aiSelect.addEventListener("change", () => {
        state.ai = els.aiSelect.value;
        resetListSelection();
        renderScout();
    });
    els.effortSelect.addEventListener("change", () => {
        state.effort = els.effortSelect.value;
        resetListSelection();
        renderScout();
    });
    els.sortSelect.addEventListener("change", () => {
        state.sort = els.sortSelect.value;
        resetListSelection();
        renderScout();
    });
    els.trendMetric.addEventListener("change", () => {
        state.trendMetric = els.trendMetric.value;
        renderTrends();
    });
    els.clearFilters.addEventListener("click", resetFilters);
    els.mobileFilterToggle.addEventListener("click", () => {
        state.mobileFiltersOpen = !state.mobileFiltersOpen;
        updateMobileFilterDisclosure();
    });
    if (!READ_ONLY_PUBLIC)
        els.savedButton.addEventListener("click", () => {
            state.savedOnly = !state.savedOnly;
            state.hasRepliesOnly = false;
            state.focusNote = null;
            resetListSelection();
            switchView("scout", { reveal: true });
            renderScout();
        });
    els.exportButton.addEventListener("click", exportCsv);
    if (!READ_ONLY_PUBLIC)
        els.exportWorkspace.addEventListener("click", exportWorkspaceState);
    if (!READ_ONLY_PUBLIC)
        els.importWorkspace.addEventListener("click", () => els.workspaceImportInput.click());
    if (!READ_ONLY_PUBLIC)
        els.workspaceImportInput.addEventListener("change", async () => {
            const file = els.workspaceImportInput.files?.[0];
            if (!file)
                return;
            await importWorkspaceState(file);
            els.workspaceImportInput.value = "";
        });
    els.workbenchBackdrop.addEventListener("click", closeMobileWorkbench);
    window.addEventListener("resize", syncWorkbenchAccessibility);
    document.addEventListener("keydown", (event) => {
        if (!els.workbench.classList.contains("is-mobile-open"))
            return;
        if (event.key === "Escape") {
            event.preventDefault();
            closeMobileWorkbench();
            return;
        }
        if (event.key === "Tab")
            trapWorkbenchFocus(event);
    });
}
function resetListSelection() {
    state.selectedId = null;
    state.cardLimit = 10;
}
function render() {
    renderScout();
    renderTrends();
}
function scrollToElement(element) {
    if (!element)
        return;
    const topbar = document.querySelector(".topbar");
    const offset = (topbar?.getBoundingClientRect().height || 0) + 12;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
}
function scrollToWorkbench() {
    if (window.matchMedia?.("(max-width: 820px)").matches) {
        els.workbench.classList.add("is-mobile-open");
        document.body.classList.add("workbench-drawer-open");
        els.workbenchBackdrop.hidden = false;
        els.workbench.setAttribute("role", "dialog");
        els.workbench.setAttribute("aria-modal", "true");
        els.workbench.setAttribute("aria-hidden", "false");
        els.workbench.scrollTop = 0;
        window.requestAnimationFrame(() => document.getElementById("closeWorkbench")?.focus());
        return;
    }
    scrollToElement(els.workbench);
    if (window.matchMedia?.("(max-width: 980px)").matches) {
        const heading = els.workbench.querySelector("h2");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus({ preventScroll: true });
    }
}
function closeMobileWorkbench() {
    const wasOpen = els.workbench.classList.contains("is-mobile-open");
    els.workbench.classList.remove("is-mobile-open");
    document.body.classList.remove("workbench-drawer-open");
    els.workbenchBackdrop.hidden = true;
    syncWorkbenchAccessibility();
    if (!wasOpen || !state.selectedId)
        return;
    const trigger = Array.from(document.querySelectorAll("[data-card-open], [data-select-idea]")).find((button) => button.dataset.cardOpen === state.selectedId || button.dataset.selectIdea === state.selectedId);
    trigger?.focus({ preventScroll: true });
    trigger?.scrollIntoView({ block: "center" });
}
function trapWorkbenchFocus(event) {
    const focusable = Array.from(els.workbench.querySelectorAll('button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled]), select:not([disabled]), summary')).filter((element) => element.offsetParent !== null);
    if (!focusable.length)
        return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    }
    else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
function syncWorkbenchAccessibility() {
    const isMobile = window.matchMedia?.("(max-width: 820px)").matches;
    if (!isMobile && els.workbench.classList.contains("is-mobile-open")) {
        els.workbench.classList.remove("is-mobile-open");
        document.body.classList.remove("workbench-drawer-open");
        els.workbenchBackdrop.hidden = true;
    }
    if (els.workbench.classList.contains("is-mobile-open"))
        return;
    els.workbench.setAttribute("role", "complementary");
    els.workbench.removeAttribute("aria-modal");
    els.workbench.setAttribute("aria-hidden", String(Boolean(isMobile)));
    if (!isMobile)
        els.workbenchBackdrop.hidden = true;
}
function switchView(view, options = {}) {
    state.view = view;
    document.querySelector(".workspace")?.classList.toggle("is-context-view", view === "trends");
    if (view === "trends")
        closeMobileWorkbench();
    let activePanel = null;
    document.querySelectorAll(".view").forEach((panel) => {
        const isActive = panel.id === `view-${view}`;
        panel.classList.toggle("is-active", isActive);
        if (isActive)
            activePanel = panel;
    });
    els.tabs.forEach((tab) => {
        const isActive = tab.dataset.view === view;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
    });
    if (options.reveal && activePanel)
        revealPanel(activePanel);
}
function revealPanel(panel) {
    const scrollContainer = panel.closest(".main-panel");
    if (scrollContainer)
        scrollContainer.scrollTop = 0;
    const topbar = document.querySelector(".topbar");
    const offset = (topbar?.getBoundingClientRect().height || 0) + 12;
    const rect = panel.getBoundingClientRect();
    if (rect.top >= offset && rect.top < window.innerHeight)
        return;
    window.scrollTo({ top: rect.top + window.scrollY - offset, behavior: "auto" });
}
let retryingPayload = false;
async function retryPayload() {
    if (retryingPayload)
        return;
    retryingPayload = true;
    document.querySelectorAll("[data-clear-empty]").forEach((button) => {
        button.disabled = true;
        button.textContent = "Loading…";
    });
    try {
        await loadGeneratedPayload();
        renderMonths();
        populateCategories();
        resetFilters();
        renderTrends();
        const target = ideas.length ? els.activeMonthLabel : Array.from(document.querySelectorAll("[data-clear-empty]")).find((button) => button.offsetParent !== null);
        if (ideas.length)
            target?.setAttribute("tabindex", "-1");
        target?.focus({ preventScroll: true });
    }
    finally {
        retryingPayload = false;
    }
}
function resetFilters() {
    state.savedOnly = false;
    state.search = "";
    state.category = "all";
    state.ai = "all";
    state.effort = "all";
    state.hasRepliesOnly = false;
    state.sort = "newest";
    state.cardLimit = 10;
    state.focusNote = null;
    els.searchInput.value = "";
    els.categorySelect.value = "all";
    els.aiSelect.value = "all";
    els.effortSelect.value = "all";
    els.sortSelect.value = "newest";
    renderScout();
}
function updateMobileFilterDisclosure() {
    els.scoutToolbar.classList.toggle("is-mobile-open", state.mobileFiltersOpen);
    els.mobileFilterToggle.setAttribute("aria-expanded", String(state.mobileFiltersOpen));
}
function renderMonths() {
    const recentMonths = months.slice(0, 12);
    const selectedMonth = months.find((month) => month.id === state.month);
    const visibleMonths = state.archiveExpanded
        ? months
        : selectedMonth && !recentMonths.some((month) => month.id === selectedMonth.id)
            ? [...recentMonths, selectedMonth]
            : recentMonths;
    els.monthList.innerHTML = visibleMonths
        .map((month) => {
        const status = monthStatusLabel(month);
        return `
        <button class="month-row ${state.month === month.id ? "is-active" : ""} ${month.status === "missing_thread" ? "is-muted" : ""}" data-month="${escapeAttr(month.id)}" aria-pressed="${state.month === month.id}">
          <span>${escapeHtml(month.label)}</span>
          <span>${escapeHtml(status)}</span>
        </button>
      `;
    })
        .join("") +
        (months.length > 12
            ? `<button class="archive-toggle" type="button" data-archive-toggle>${state.archiveExpanded ? "Show recent months" : `Show all months (${months.length})`}</button>`
            : "");
    els.monthList.querySelectorAll("[data-month]").forEach((button) => {
        button.addEventListener("click", () => {
            state.month = button.dataset.month ?? state.month;
            state.selectedId = null;
            state.cardLimit = 10;
            state.hasRepliesOnly = false;
            state.focusNote = null;
            renderMonths();
            renderScout();
            els.monthList.querySelector(`[data-month="${state.month}"]`)?.focus({ preventScroll: true });
        });
    });
    els.monthList.querySelector("[data-archive-toggle]")?.addEventListener("click", () => {
        state.archiveExpanded = !state.archiveExpanded;
        renderMonths();
        els.monthList.querySelector("[data-archive-toggle]")?.focus({ preventScroll: true });
    });
}
function monthStatusLabel(month) {
    if (month.status === "missing_thread")
        return "Missing";
    if (month.status === "partial")
        return `${month.count} · Partial`;
    if (month.count === 0)
        return "0 extracted";
    return String(month.count);
}
function populateCategories() {
    const categories = Array.from(new Set(ideas.map((idea) => idea.category))).sort((a, b) => a.localeCompare(b));
    els.categorySelect.innerHTML = `<option value="all">All categories</option>${categories
        .map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`)
        .join("")}`;
    const preferredEffortOrder = ["Weekend", "Small Team"];
    const efforts = Array.from(new Set(ideas.map((idea) => idea.buildability))).sort((first, second) => {
        const firstIndex = preferredEffortOrder.indexOf(first);
        const secondIndex = preferredEffortOrder.indexOf(second);
        if (firstIndex >= 0 || secondIndex >= 0)
            return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
        return first.localeCompare(second);
    });
    els.effortSelect.innerHTML = `<option value="all">All effort levels</option>${efforts
        .map((effort) => `<option value="${escapeAttr(effort)}">${escapeHtml(effort)}</option>`)
        .join("")}`;
}
function getVisibleIdeas() {
    const terms = state.search.split(/\s+/).filter(Boolean);
    return getIdeasForMonth(state.month)
        .filter((idea) => !state.savedOnly || state.saved.has(idea.id))
        .filter((idea) => state.category === "all" || idea.category === state.category)
        .filter((idea) => state.ai === "all" || (state.ai === "ai" ? idea.ai : !idea.ai))
        .filter((idea) => state.effort === "all" || idea.buildability === state.effort)
        .filter((idea) => !state.hasRepliesOnly || getReplyCount(idea) > 0)
        .filter((idea) => {
        if (!terms.length)
            return true;
        const text = [
            projectDisplayName(idea),
            idea.description,
            idea.tags.join(" ")
        ]
            .join(" ")
            .toLowerCase();
        return terms.every((term) => text.includes(term));
    })
        .sort(compareIdeasBySelectedField);
}
function compareIdeasBySelectedField(first, second) {
    const newestTieBreak = () => new Date(second.date).getTime() - new Date(first.date).getTime() || first.id.localeCompare(second.id);
    if (state.sort === "heat") {
        return getReplyCount(second) - getReplyCount(first) || getLinkedSourceCount(second) - getLinkedSourceCount(first) || newestTieBreak();
    }
    if (state.sort === "weekend") {
        return buildabilityScore(second) - buildabilityScore(first) || getReplyCount(second) - getReplyCount(first) || newestTieBreak();
    }
    if (state.sort === "evidence") {
        return getLinkedSourceCount(second) - getLinkedSourceCount(first) || getReplyCount(second) - getReplyCount(first) || newestTieBreak();
    }
    return newestTieBreak();
}
function getIdeasForMonth(monthId) {
    return ideas.filter((idea) => idea.month === monthId);
}
function buildabilityScore(idea) {
    if (idea.buildability === "Weekend")
        return 3;
    if (idea.buildability === "Small Team")
        return 2;
    return 1;
}
function currentSavedIdeas() {
    return getIdeasForMonth(state.month).filter((idea) => state.saved.has(idea.id));
}
function renderScout() {
    const month = months.find((item) => item.id === state.month) || months[0] || {
        id: state.month,
        label: monthLabelFromId(state.month),
        count: 0,
        summary: state.dataError || "No HN payload loaded."
    };
    const visible = getVisibleIdeas();
    const selected = visible.find((idea) => idea.id === state.selectedId) || visible[0] || null;
    state.selectedId = selected?.id || null;
    els.activeMonthLabel.textContent = month.label;
    els.monthSummary.textContent = scoutSourceSummary(month);
    updateMobileFilterDisclosure();
    renderActiveFilterNote();
    const emptyState = getEmptyState();
    els.ideaRows.innerHTML = visible.length
        ? visible.map(renderIdeaRow).join("")
        : `<tr><td colspan="${READ_ONLY_PUBLIC ? 5 : 6}" class="empty-row">${renderEmptyState(emptyState)}</td></tr>`;
    const visibleCards = visible.slice(0, state.cardLimit);
    els.ideaCards.innerHTML = visible.length
        ? `${visibleCards.map(renderIdeaCard).join("")}${visibleCards.length < visible.length
            ? `<button class="load-more-button" type="button" data-load-more>Load ${Math.min(10, visible.length - visibleCards.length)} more · ${visible.length - visibleCards.length} remaining</button>`
            : ""}`
        : renderEmptyState(emptyState);
    els.ideaRows.querySelectorAll("[data-idea]").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target instanceof Element && event.target.closest("button, input, a, label"))
                return;
            state.selectedId = row.dataset.idea ?? null;
            renderScout();
            if (window.matchMedia?.("(max-width: 980px)").matches)
                scrollToWorkbench();
        });
    });
    document.querySelectorAll("[data-select-idea]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            state.selectedId = button.dataset.selectIdea ?? null;
            renderScout();
            if (window.matchMedia?.("(max-width: 980px)").matches)
                scrollToWorkbench();
        });
    });
    document.querySelectorAll("[data-card-open]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            state.selectedId = button.dataset.cardOpen ?? null;
            renderScout();
            scrollToWorkbench();
        });
    });
    els.ideaCards.querySelector("[data-load-more]")?.addEventListener("click", () => {
        state.cardLimit += 10;
        renderScout();
    });
    document.querySelectorAll("[data-save-inline]").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
            event.stopPropagation();
            const ideaId = checkbox.dataset.saveInline;
            if (ideaId)
                toggleSaved(ideaId);
        });
    });
    document.querySelectorAll("[data-clear-empty]").forEach((button) => {
        button.addEventListener("click", () => {
            if (!ideas.length && state.dataError) {
                void retryPayload();
                return;
            }
            if (button.dataset.resetMonth) {
                state.month = button.dataset.resetMonth;
                renderMonths();
            }
            resetFilters();
        });
    });
    els.resultCount.textContent = resultCountText(visible.length, month);
    renderWorkbench(selected);
    updateSavedButton();
    updateDataStatus();
}
function resultCountText(visibleCount, month) {
    const filters = [];
    if (state.savedOnly)
        filters.push("saved only");
    if (state.category !== "all")
        filters.push(state.category);
    if (state.ai !== "all")
        filters.push(state.ai === "ai" ? "AI-adjacent" : "non-AI");
    if (state.effort !== "all")
        filters.push(state.effort);
    if (state.hasRepliesOnly)
        filters.push("has HN replies");
    if (state.search)
        filters.push(`search: ${state.search}`);
    const context = filters.length ? ` · ${filters.join(" · ")}` : "";
    return `${visibleCount} of ${month.count} extracted candidates${context}`;
}
function renderActiveFilterNote() {
    if (!state.focusNote) {
        els.activeFilterNote.hidden = true;
        els.activeFilterNote.innerHTML = "";
        return;
    }
    els.activeFilterNote.hidden = false;
    els.activeFilterNote.innerHTML = `
    <div class="focus-copy">
      <span class="focus-kicker">From Trends</span>
      <strong>${escapeHtml(state.focusNote.label)}</strong>
      <p>${escapeHtml(state.focusNote.detail)}</p>
    </div>
    <button class="ghost-button" type="button" data-clear-focus>Clear</button>
  `;
    els.activeFilterNote.querySelector("[data-clear-focus]")?.addEventListener("click", resetFilters);
}
function updateDataStatus() {
    const message = state.dataError || state.dataMode;
    els.dataStatus.innerHTML = `<span class="status-dot"></span>Data: ${escapeHtml(message)}`;
    els.dataStatus.classList.toggle("has-warning", Boolean(state.dataError));
    els.topbarDataMeta.textContent = activeGeneratedAt ? formatDateLabel(activeGeneratedAt) : "Unavailable";
    const availableMonths = months.filter((month) => month.count > 0).length;
    els.topbarModeLabel.textContent = `${availableMonths} retained month${availableMonths === 1 ? "" : "s"}`;
    els.topbarSourceLabel.textContent = isHnSource() ? "HN WAYWO" : sourceModeLabel();
}
function getCommunity(idea) {
    return (communityByIdea[idea.id] || {
        pulse: "No source-linked replies yet",
        comments: []
    });
}
function getReplyCount(idea) {
    if (typeof idea.replyCount === "number" && Number.isFinite(idea.replyCount))
        return idea.replyCount;
    const match = getCommunity(idea).pulse.match(/\b(\d+)\b/);
    if (match)
        return Number(match[1]);
    return Math.max(0, getCommunity(idea).comments.filter((comment) => comment.type.toLowerCase() !== "project").length);
}
function getLinkedSourceCount(idea) {
    return getCommunity(idea).comments.filter((comment) => Boolean(comment.commentUrl)).length;
}
function replyLabel(idea) {
    const replies = getReplyCount(idea);
    return `${replies} HN ${replies === 1 ? "reply" : "replies"}`;
}
function linkedSourceLabel(idea) {
    const links = getLinkedSourceCount(idea);
    return `${links} linked HN ${links === 1 ? "comment" : "comments"}`;
}
function getEmptyState() {
    const selectedMonth = months.find((month) => month.id === state.month);
    if (!ideas.length && state.dataError) {
        return { title: "No HN data loaded", detail: "The published payload could not be loaded. Check your connection and try again.", action: "Retry loading" };
    }
    if (state.savedOnly) {
        return {
            title: "No saved ideas in this view",
            detail: "Save an idea from the list, or reset to see the full monthly set.",
            action: "Show all ideas"
        };
    }
    if (state.search) {
        return {
            title: `No matches for "${state.search}"`,
            detail: "Search requires every word to appear in the project name, description, or tags.",
            action: "Reset search and filters"
        };
    }
    if (state.category !== "all" || state.ai !== "all" || state.effort !== "all" || state.hasRepliesOnly) {
        return { title: "No ideas match these filters", detail: "Try another category or type.", action: "Reset filters" };
    }
    if (selectedMonth?.status === "missing_thread") {
        return {
            title: "No retained WAYWO thread for this month",
            detail: selectedMonth.summary || "The archive records this month as a gap rather than zero activity.",
            action: `Open ${months.find((month) => month.count > 0)?.label || "latest available month"}`,
            resetMonth: true
        };
    }
    if (selectedMonth?.status === "no_candidates" || selectedMonth?.count === 0) {
        return {
            title: "No extracted candidates for this month",
            detail: selectedMonth.summary || "A thread was retained, but this extractor emitted no candidate projects.",
            action: `Open ${months.find((month) => month.count > 0)?.label || "latest available month"}`,
            resetMonth: true
        };
    }
    return { title: "No ideas for this month", detail: "The current payload has no projects here.", action: "Open latest month", resetMonth: true };
}
function renderEmptyState(emptyState) {
    return `
    <div class="empty-state">
      <strong>${escapeHtml(emptyState.title)}</strong>
      <span>${escapeHtml(emptyState.detail)}</span>
      <button class="ghost-button" data-clear-empty ${emptyState.resetMonth ? `data-reset-month="${escapeAttr(defaultMonthId())}"` : ""} type="button">${escapeHtml(emptyState.action)}</button>
    </div>
  `;
}
function renderEvidenceStrip(idea) {
    return `
    <div class="evidence-strip">
      <div>
        <strong>Source</strong>
        <span>${escapeHtml(idea.thread)} · by ${escapeHtml(idea.author)}</span>
      </div>
      <a class="external" href="${escapeAttr(safeUrl(idea.original))}" target="_blank" rel="noreferrer">Original HN comment ↗</a>
    </div>
  `;
}
function renderCommunitySection(idea) {
    const replies = getCommunity(idea).comments.filter((comment) => comment.type.toLowerCase() !== "project");
    if (!replies.length) {
        return `<section class="work-section"><h3>Linked HN replies</h3><p class="empty-copy">No linked reply snippets are retained for this candidate.</p></section>`;
    }
    const replyCount = getReplyCount(idea);
    const linkedCount = replies.filter((comment) => comment.commentUrl).length;
    return `
    <section class="work-section">
      <h3>Linked HN replies</h3>
      <p class="section-note">${escapeHtml(replyCount)} direct ${replyCount === 1 ? "reply" : "replies"} reported · ${escapeHtml(linkedCount)} linked ${linkedCount === 1 ? "excerpt" : "excerpts"} below</p>
      <div class="comment-stack">
        ${replies
        .map((comment) => `
              <article class="hot-comment">
                <div class="comment-meta">
                  ${renderSourceState(comment)}
                </div>
                <p>${escapeHtml(comment.text)}</p>
              </article>
            `)
        .join("")}
      </div>
    </section>
  `;
}
function renderSourceState(comment) {
    return `<a class="source-state verified" href="${escapeAttr(safeUrl(comment.commentUrl))}" target="_blank" rel="noreferrer">HN #${escapeHtml(comment.commentId)}</a>`;
}
function isLiveSource() {
    return activeSource.startsWith("hn-live");
}
function isArchiveLiveSource() {
    return activeSource.startsWith("hn-archive+live");
}
function isArchiveSource() {
    return activeSource.startsWith("hn-archive");
}
function isHnSource() {
    return isLiveSource() || isArchiveSource();
}
function sourceModeLabel() {
    if (isArchiveLiveSource())
        return "HN archive + live";
    if (isArchiveSource())
        return "HN archive";
    return isLiveSource() ? "Live HN" : "No HN payload";
}
function sourceThreadForMonth(monthId) {
    return activeSourceMeta?.threads?.find((thread) => thread.month === monthId) || null;
}
function scoutSourceSummary(month) {
    if (!isHnSource())
        return month.summary;
    const thread = sourceThreadForMonth(month.id);
    const comments = thread?.comments || activeSourceMeta?.threadComments || activeSourceMeta?.live?.threadComments;
    const source = thread?.title || activeSourceMeta?.title || activeSourceMeta?.live?.title || "HN WAYWO";
    const partial = month.status === "partial"
        ? ` Partial snapshot through ${formatDateLabel(activeGeneratedAt)}; this month is still in progress and the set may change.`
        : "";
    return `${source}${comments ? ` · ${comments.toLocaleString()} thread comments` : ""}. ${month.count} candidates retained; replies are discussion, not demand.${partial}`;
}
function renderIdeaRow(idea) {
    const isSelected = idea.id === state.selectedId;
    const displayName = projectDisplayName(idea);
    const buildClass = idea.buildability === "Weekend" ? "high" : "team";
    const linkedComments = getLinkedSourceCount(idea);
    const replies = getReplyCount(idea);
    return `
    <tr class="${isSelected ? "is-selected" : ""}" data-idea="${escapeAttr(idea.id)}" aria-selected="${isSelected}">
      <td>
        <div class="idea-cell">
          <div class="project-mark">${escapeHtml(idea.mark)}</div>
          <div>
            <button class="project-name project-select" data-select-idea="${escapeAttr(idea.id)}" type="button">${escapeHtml(displayName)}</button>
            <span class="project-desc">${escapeHtml(idea.description)}</span>
            <div class="tag-list">${idea.tags.slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
        </div>
      </td>
      <td><span class="category-label">${escapeHtml(idea.category)}</span>${idea.ai ? '<span class="type-note">AI-adjacent</span>' : '<span class="type-note">Non-AI</span>'}</td>
      <td><div class="evidence-count"><strong>${escapeHtml(linkedComments)}</strong><span>linked HN ${linkedComments === 1 ? "comment" : "comments"}</span></div></td>
      <td><div class="reply-count"><strong>${escapeHtml(replies)}</strong><span>direct ${replies === 1 ? "reply" : "replies"}</span></div></td>
      <td><span class="pill ${buildClass}">${escapeHtml(idea.buildability)}</span></td>
      ${READ_ONLY_PUBLIC ? "" : `<td>
        <label class="try-next">
          <input type="checkbox" ${state.saved.has(idea.id) ? "checked" : ""} data-save-inline="${escapeAttr(idea.id)}" aria-label="${escapeAttr(state.saved.has(idea.id) ? `Remove ${displayName} from saved ideas` : `Save ${displayName}`)}" />
          <span>${state.saved.has(idea.id) ? "Saved" : "Save"}</span>
        </label>
      </td>`}
    </tr>
  `;
}
function renderIdeaCard(idea) {
    const displayName = projectDisplayName(idea);
    return `
    <article class="idea-card ${idea.id === state.selectedId ? "is-selected" : ""}" data-idea="${escapeAttr(idea.id)}">
      <div class="card-head">
        <div class="project-mark">${escapeHtml(idea.mark)}</div>
        <div>
          <h3>${escapeHtml(displayName)}</h3>
          <p>${escapeHtml(idea.description)}</p>
        </div>
        ${READ_ONLY_PUBLIC ? "" : `<label class="try-next card-save-inline">
          <input type="checkbox" ${state.saved.has(idea.id) ? "checked" : ""} data-save-inline="${escapeAttr(idea.id)}" aria-label="${escapeAttr(state.saved.has(idea.id) ? `Remove ${displayName} from saved ideas` : `Save ${displayName}`)}" />
          <span>${state.saved.has(idea.id) ? "Saved" : "Save"}</span>
        </label>`}
      </div>
      <div class="card-signals">
        <span>${escapeHtml(idea.category)}</span>
        <span>${escapeHtml(idea.buildability)}</span>
        <span>${escapeHtml(replyLabel(idea))}</span>
        <span>${escapeHtml(linkedSourceLabel(idea))}</span>
      </div>
      <div class="card-actions">
        <button class="secondary-button" type="button" data-card-open="${escapeAttr(idea.id)}">Open details</button>
        <a class="text-link" href="${escapeAttr(safeUrl(idea.original))}" target="_blank" rel="noreferrer">Original HN comment ↗</a>
      </div>
    </article>
  `;
}
function renderWorkbench(idea) {
    if (!idea) {
        els.workbenchContent.innerHTML = `
      <div class="workbench-empty">
        <h2>No idea selected</h2>
        <p>Reset the list or choose a month with extracted candidates.</p>
      </div>
    `;
        return;
    }
    const saved = state.saved.has(idea.id);
    const displayName = projectDisplayName(idea);
    const note = getIdeaNote(idea.id);
    els.workbenchContent.innerHTML = `
    <div class="workbench-mobile-head">
      <button id="closeWorkbench" class="ghost-button" type="button">Back to results</button>
      <span>Idea details</span>
    </div>

    <div class="workbench-top">
      <div class="project-mark">${escapeHtml(idea.mark)}</div>
      <div>
        <h2>${escapeHtml(displayName)}</h2>
        <p>${escapeHtml(idea.description)}</p>
        <a class="external" href="${escapeAttr(safeUrl(idea.url))}" target="_blank" rel="noreferrer">${displayUrl(idea.url)}</a>
      </div>
    </div>

    <section class="idea-facts" aria-label="Idea facts">
      <span><strong>${escapeHtml(idea.category)}</strong>Category</span>
      <span><strong>${escapeHtml(getReplyCount(idea))}</strong>HN replies</span>
      <span><strong>${escapeHtml(getLinkedSourceCount(idea))}</strong>Linked HN comments</span>
      <span><strong>${escapeHtml(idea.buildability)}</strong>Effort</span>
    </section>

    <div class="workbench-actions is-sticky">
      ${READ_ONLY_PUBLIC ? "" : `<button class="primary-button" id="saveCurrent" type="button">${saved ? "Remove from saved" : "Save idea"}</button>`}
      <a class="secondary-button" href="${escapeAttr(safeUrl(idea.original))}" target="_blank" rel="noreferrer">Open HN source ↗</a>
    </div>

    ${READ_ONLY_PUBLIC ? "" : saved
        ? `<section class="personal-note">
          <label for="personalNote"><strong>Personal note</strong><span>Optional and stored in this browser.</span></label>
          <textarea id="personalNote" rows="4" placeholder="Why is this worth returning to?">${escapeHtml(note)}</textarea>
          <small id="noteStatus" aria-live="polite">${ideaNoteStatus(note)}</small>
        </section>`
        : `<section class="personal-note is-locked"><strong>Personal note</strong><p>Save this idea to add a lightweight note.</p></section>`}

    <details class="workbench-disclosure" open>
      <summary>Source evidence</summary>
      <div class="disclosure-body">
        ${renderEvidenceStrip(idea)}
        <section class="work-section evidence-section">
          <h3>Project comment excerpt</h3>
          <blockquote class="evidence">${escapeHtml(idea.evidence)}</blockquote>
        </section>
        ${renderCommunitySection(idea)}
      </div>
    </details>

    <details class="workbench-disclosure">
      <summary>Source details</summary>
      <div class="disclosure-body">
        <dl class="meta-list">
          <div><dt>HN author</dt><dd>${escapeHtml(idea.author)}</dd></div>
          <div><dt>Month</dt><dd>${escapeHtml(monthLabelFromId(idea.month))}</dd></div>
          <div><dt>Classification</dt><dd>${idea.ai ? "AI-adjacent" : "Non-AI"}</dd></div>
        </dl>
        <p class="source-boundary">The name, category, and summaries are heuristic extraction fields. Verify them against the linked HN comment.</p>
      </div>
    </details>
  `;
    document.getElementById("closeWorkbench")?.addEventListener("click", closeMobileWorkbench);
    document.getElementById("saveCurrent")?.addEventListener("click", () => {
        const restoreDialogFocus = els.workbench.classList.contains("is-mobile-open");
        toggleSaved(idea.id);
        if (restoreDialogFocus && els.workbench.classList.contains("is-mobile-open")) {
            window.requestAnimationFrame(() => document.getElementById("saveCurrent")?.focus());
        }
    });
    const noteField = document.getElementById("personalNote");
    noteField?.addEventListener("input", () => {
        const persisted = persistIdeaNote(idea.id, noteField.value);
        const status = document.getElementById("noteStatus");
        if (status)
            status.textContent = persisted ? "Saved locally" : "Session only";
    });
}
function toggleSaved(id) {
    if (READ_ONLY_PUBLIC)
        return;
    const removing = state.saved.has(id);
    if (removing) {
        removeSavedProject(id);
    }
    else {
        state.saved.add(id);
        state.selectedId = id;
    }
    const persisted = persistSaved();
    if (!persisted) {
        showToast(removing ? "Removed for this session only. Its existing note was kept." : "Saved for this session only. Browser storage is unavailable.");
    }
    else {
        showToast(removing ? "Removed from saved ideas. Its existing note was kept." : "Saved in this browser.");
    }
    if (removing && state.savedOnly && els.workbench.classList.contains("is-mobile-open"))
        closeMobileWorkbench();
    renderScout();
}
function updateSavedButton() {
    const count = els.savedButton.querySelector("strong");
    if (count)
        count.textContent = String(currentSavedIdeas().length);
    els.savedButton.classList.toggle("is-active", state.savedOnly);
    els.savedButton.setAttribute("aria-pressed", String(state.savedOnly));
}
function isComparableTrendMonth(month) {
    return month.status !== "missing_thread" && month.status !== "partial" && month.count > 0;
}
function unavailableTrendMonthDetail(month) {
    if (month.status === "missing_thread")
        return "Missing thread";
    if (month.status === "partial")
        return "Partial month excluded";
    return month.count > 0 ? null : "No candidates";
}
function renderTrends() {
    const trendMonths = months.slice(0, 12).reverse();
    const usableMonths = trendMonths.filter(isComparableTrendMonth);
    const missingMonths = trendMonths.filter((month) => month.status === "missing_thread");
    const totalCandidates = usableMonths.reduce((sum, month) => sum + getIdeasForMonth(month.id).length, 0);
    els.trendSummary.innerHTML = `
    <div><strong>${escapeHtml(trendMonths.length)}</strong><span>calendar months shown</span></div>
    <div><strong>${escapeHtml(usableMonths.length)}</strong><span>comparable candidate sets</span></div>
    <div><strong>${escapeHtml(totalCandidates)}</strong><span>extracted candidates in range</span></div>
    <div><strong>${escapeHtml(missingMonths.length)}</strong><span>missing-thread gaps</span></div>
  `;
    if (!trendMonths.length || !usableMonths.length) {
        els.trendMatrix.innerHTML = `<div class="empty-state"><strong>No comparable monthly candidate sets</strong><span>The published archive has no usable months in this range.</span></div>`;
        els.trendCaveat.textContent = "Missing months are never treated as zero, and partial current-month snapshots are excluded from comparisons.";
        return;
    }
    const rows = [buildSampleTrendRow(trendMonths), ...buildMetricTrendRows(trendMonths, state.trendMetric)];
    els.trendMatrix.innerHTML = `
    <div class="trend-table-wrap">
      <table class="trend-table">
        <thead>
          <tr>
            <th scope="col">${escapeHtml(trendMetricTitle(state.trendMetric))}</th>
            ${trendMonths.map((month) => `<th scope="col"><span>${escapeHtml(shortMonth(month.id))}</span><small>${escapeHtml(month.id.slice(0, 4))}</small></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => renderTrendRow(row, trendMonths)).join("")}
        </tbody>
      </table>
    </div>
  `;
    const limit = activeSourceMeta?.limit || activeSourceMeta?.live?.limit;
    els.trendCaveat.textContent = `Percentages describe extracted candidates in each retained monthly thread—not HN-wide activity, product demand, or project success.${limit ? ` This release caps each monthly set at ${limit} candidates.` : ""} Missing threads are shown as gaps, not zero; partial current-month snapshots are excluded from cross-month comparisons.`;
    els.trendMatrix.querySelectorAll("[data-trend-month]").forEach((button) => {
        button.addEventListener("click", () => applyTrendCell(button));
    });
}
function buildSampleTrendRow(trendMonths) {
    const limit = activeSourceMeta?.limit || activeSourceMeta?.live?.limit;
    return {
        id: "sample",
        label: "Published sample",
        description: "Retained candidates; capped sets are labelled.",
        kind: "sample",
        cells: trendMonths.map((month) => {
            const count = getIdeasForMonth(month.id).length;
            const unavailableDetail = unavailableTrendMonthDetail(month);
            if (unavailableDetail) {
                return {
                    display: month.status === "partial" ? `${count}*` : "—",
                    detail: unavailableDetail,
                    visualPercent: null,
                    enabled: false,
                };
            }
            return {
                display: String(count),
                detail: count === 0 ? "No candidates" : limit && count >= limit ? `Capped at ${limit}` : `${count} retained`,
                visualPercent: limit ? Math.min(100, (count / limit) * 100) : count ? 100 : 0,
                enabled: count > 0
            };
        })
    };
}
function buildMetricTrendRows(trendMonths, metric) {
    if (metric === "ai") {
        return [
            buildShareTrendRow(trendMonths, "ai", "AI-adjacent", "Projects classified with the payload’s AI flag.", "ai", (idea) => idea.ai),
            buildShareTrendRow(trendMonths, "non-ai", "Non-AI", "Projects without the payload’s AI flag.", "ai", (idea) => !idea.ai)
        ];
    }
    if (metric === "effort") {
        const preferredOrder = ["Weekend", "Small Team"];
        const values = Array.from(new Set(trendMonths.filter(isComparableTrendMonth).flatMap((month) => getIdeasForMonth(month.id).map((idea) => idea.buildability)))).sort((first, second) => {
            const firstIndex = preferredOrder.indexOf(first);
            const secondIndex = preferredOrder.indexOf(second);
            if (firstIndex >= 0 || secondIndex >= 0)
                return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
            return first.localeCompare(second);
        });
        return values.map((effort) => buildShareTrendRow(trendMonths, `effort-${safeClassToken(effort)}`, effort, "Share of the retained monthly set.", "effort", (idea) => idea.buildability === effort, effort));
    }
    if (metric === "discussion")
        return buildDiscussionTrendRows(trendMonths);
    const pooledIdeas = trendMonths.filter(isComparableTrendMonth).flatMap((month) => getIdeasForMonth(month.id));
    const categories = Array.from(new Set(pooledIdeas.map((idea) => idea.category))).sort((first, second) => {
        const firstCount = pooledIdeas.filter((idea) => idea.category === first).length;
        const secondCount = pooledIdeas.filter((idea) => idea.category === second).length;
        return secondCount - firstCount || first.localeCompare(second);
    });
    return categories.map((category) => buildShareTrendRow(trendMonths, `category-${safeClassToken(category)}`, category, "Share of the retained monthly set.", "category", (idea) => idea.category === category, category));
}
function buildShareTrendRow(trendMonths, id, label, description, kind, predicate, filterValue = id) {
    return {
        id,
        label,
        description,
        kind,
        filterValue,
        cells: trendMonths.map((month) => {
            const unavailableDetail = unavailableTrendMonthDetail(month);
            if (unavailableDetail)
                return { display: "—", detail: unavailableDetail, visualPercent: null, enabled: false };
            const monthlyIdeas = getIdeasForMonth(month.id);
            if (!monthlyIdeas.length)
                return { display: "—", detail: "No candidates", visualPercent: null, enabled: false };
            const count = monthlyIdeas.filter(predicate).length;
            const share = (count / monthlyIdeas.length) * 100;
            return {
                display: `${Math.round(share)}%`,
                detail: `${count} of ${monthlyIdeas.length} extracted candidates`,
                visualPercent: share,
                enabled: count > 0
            };
        })
    };
}
function buildDiscussionTrendRows(trendMonths) {
    const medians = trendMonths.map((month) => {
        if (!isComparableTrendMonth(month))
            return null;
        const values = getIdeasForMonth(month.id).map(getReplyCount);
        return values.length ? median(values) : null;
    });
    const maxMedian = Math.max(1, ...medians.filter((value) => value !== null));
    return [
        {
            id: "median-replies",
            label: "Median direct HN replies",
            description: "Middle reply count per extracted candidate; not demand.",
            kind: "discussion",
            filterValue: "heat",
            cells: trendMonths.map((month, index) => {
                const value = medians[index];
                if (value === null)
                    return { display: "—", detail: unavailableTrendMonthDetail(month) || "No candidates", visualPercent: null, enabled: false };
                return { display: Number.isInteger(value) ? String(value) : value.toFixed(1), detail: "Median direct replies", visualPercent: (value / maxMedian) * 100, enabled: false };
            })
        },
        buildShareTrendRow(trendMonths, "with-replies", "Candidates with ≥1 reply", "Share of extracted candidates with at least one direct HN reply.", "discussion", (idea) => getReplyCount(idea) > 0, "has-replies")
    ];
}
function renderTrendRow(row, trendMonths) {
    return `
    <tr class="trend-row ${row.kind === "sample" ? "is-sample" : ""}">
      <th scope="row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.description)}</span></th>
      ${row.cells
        .map((cell, index) => {
        const month = trendMonths[index];
        const attributes = [
            `data-trend-month="${escapeAttr(month.id)}"`,
            `data-trend-kind="${escapeAttr(row.kind)}"`,
            row.filterValue ? `data-trend-value="${escapeAttr(row.filterValue)}"` : "",
            `data-trend-label="${escapeAttr(row.label)}"`,
            `data-trend-detail="${escapeAttr(cell.detail)}"`
        ]
            .filter(Boolean)
            .join(" ");
        const content = `<span class="trend-value">${escapeHtml(cell.display)}</span><span class="trend-cell-bar" style="--trend-value:${escapeAttr(cell.visualPercent ?? 0)}%"></span><small>${escapeHtml(cell.detail)}</small>`;
        return `<td>${cell.enabled ? `<button type="button" class="trend-cell" ${attributes}>${content}</button>` : `<span class="trend-cell is-disabled">${content}</span>`}</td>`;
    })
        .join("")}
    </tr>
  `;
}
function applyTrendCell(button) {
    const month = button.dataset.trendMonth;
    const kind = button.dataset.trendKind;
    const value = button.dataset.trendValue || "";
    if (!month || !kind)
        return;
    state.month = month;
    state.search = "";
    state.category = "all";
    state.ai = "all";
    state.effort = "all";
    state.hasRepliesOnly = false;
    state.sort = kind === "discussion" ? "heat" : "newest";
    state.savedOnly = false;
    if (kind === "category")
        state.category = value;
    if (kind === "ai")
        state.ai = value === "ai" ? "ai" : "non-ai";
    if (kind === "effort")
        state.effort = value;
    if (kind === "discussion" && value === "has-replies")
        state.hasRepliesOnly = true;
    state.selectedId = null;
    state.cardLimit = 10;
    state.focusNote = {
        label: `${button.dataset.trendLabel || "Published sample"} · ${monthLabelFromId(month)}`,
        detail: button.dataset.trendDetail || "Opened from the cross-month candidate table."
    };
    els.searchInput.value = "";
    els.categorySelect.value = state.category;
    els.aiSelect.value = state.ai;
    els.effortSelect.value = state.effort;
    els.sortSelect.value = state.sort;
    renderMonths();
    switchView("scout", { reveal: true });
    renderScout();
}
function trendMetricTitle(metric) {
    if (metric === "ai")
        return "AI classification share";
    if (metric === "effort")
        return "Effort share";
    if (metric === "discussion")
        return "HN discussion";
    return "Category share";
}
function shortMonth(monthId) {
    const date = new Date(`${monthId}-01T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? monthId : date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}
function median(values) {
    const ordered = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
function exportCsv() {
    const rows = getVisibleIdeas();
    const header = ["display_name", "category", "ai_classification", "effort", "direct_hn_replies", "linked_hn_comments", "description", "original_hn_comment"];
    const csv = [
        header.join(","),
        ...rows.map((idea) => [
            projectDisplayName(idea),
            idea.category,
            idea.ai ? "AI-adjacent" : "Non-AI",
            idea.buildability,
            getReplyCount(idea),
            getLinkedSourceCount(idea),
            idea.description,
            idea.original
        ]
            .map(serializeCsvCell)
            .join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hn-field-notes-${state.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported the current Ideas list.");
}
let toastTimer;
function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1700);
}
init();
