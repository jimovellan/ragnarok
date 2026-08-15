import readline from "node:readline";
export const BACK = Symbol("back");
function withRawKeypresses(onKeypress) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on("keypress", onKeypress);
    return () => {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        process.stdin.removeListener("keypress", onKeypress);
    };
}
function handleExit(key, cleanup) {
    if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
    }
}
/** Arrow-key list picker. Enter selects, Esc/Ctrl+C returns BACK / exits. */
export function selectPrompt(message, choices) {
    return new Promise((resolve) => {
        let index = 0;
        const render = () => {
            console.clear();
            console.log(message);
            console.log();
            for (const [i, choice] of choices.entries()) {
                console.log(`${i === index ? ">" : " "} ${choice.label}`);
            }
            console.log();
            console.log("(↑/↓ mover, Enter seleccionar, Esc volver)");
        };
        const onKeypress = (_str, key) => {
            handleExit(key, cleanup);
            if (key.name === "up") {
                index = (index - 1 + choices.length) % choices.length;
                render();
            }
            else if (key.name === "down") {
                index = (index + 1) % choices.length;
                render();
            }
            else if (key.name === "return") {
                const choice = choices[index];
                cleanup();
                resolve(choice ? choice.value : BACK);
            }
            else if (key.name === "escape") {
                cleanup();
                resolve(BACK);
            }
        };
        const cleanup = withRawKeypresses(onKeypress);
        render();
    });
}
/** Single-line text input. Enter submits, Esc/Ctrl+C returns BACK / exits. */
export function textPrompt(message, initialValue = "") {
    return new Promise((resolve) => {
        let value = initialValue;
        const render = () => {
            readline.cursorTo(process.stdout, 0);
            readline.clearLine(process.stdout, 0);
            process.stdout.write(`${message} ${value}`);
        };
        const onKeypress = (str, key) => {
            handleExit(key, cleanup);
            if (key.name === "return") {
                cleanup();
                process.stdout.write("\n");
                resolve(value);
            }
            else if (key.name === "escape") {
                cleanup();
                process.stdout.write("\n");
                resolve(BACK);
            }
            else if (key.name === "backspace") {
                value = value.slice(0, -1);
                render();
            }
            else if (str && !key.ctrl && !key.meta) {
                value += str;
                render();
            }
        };
        const cleanup = withRawKeypresses(onKeypress);
        render();
    });
}
/** Read-only screen. Enter/Esc dismiss it and return control to the caller. */
export function viewScreen(lines) {
    return new Promise((resolve) => {
        console.clear();
        for (const line of lines) {
            console.log(line);
        }
        console.log();
        console.log("(Esc o Enter para volver)");
        const onKeypress = (_str, key) => {
            handleExit(key, cleanup);
            if (key.name === "escape" || key.name === "return") {
                cleanup();
                resolve();
            }
        };
        const cleanup = withRawKeypresses(onKeypress);
    });
}
//# sourceMappingURL=prompt.js.map