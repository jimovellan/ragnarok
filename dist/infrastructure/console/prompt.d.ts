export interface SelectChoice<T> {
    label: string;
    value: T;
}
export declare const BACK: unique symbol;
export type PromptResult<T> = T | typeof BACK;
/** Arrow-key list picker. Enter selects, Esc/Ctrl+C returns BACK / exits. */
export declare function selectPrompt<T>(message: string, choices: SelectChoice<T>[]): Promise<PromptResult<T>>;
/** Single-line text input. Enter submits, Esc/Ctrl+C returns BACK / exits. */
export declare function textPrompt(message: string, initialValue?: string): Promise<PromptResult<string>>;
/** Read-only screen. Enter/Esc dismiss it and return control to the caller. */
export declare function viewScreen(lines: string[]): Promise<void>;
//# sourceMappingURL=prompt.d.ts.map