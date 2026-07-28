import ru from "./ru";

export function t(path: string): string {
    return path.split(".").reduce((obj: any, key) => obj?.[key], ru) ?? path;
}