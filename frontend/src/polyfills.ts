// src/polyfills.ts
import { Buffer } from "buffer";

// Make Buffer available everywhere (window, globalThis)
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Some libs check `global`
if (typeof window !== "undefined" && !(window as any).global) {
  (window as any).global = window;
}
