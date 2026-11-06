import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteFound } from "../src/lib/verify.ts";

const src = "Entrega: sube tu archivo a Canvas a más tardar el viernes 13 de noviembre a las 23:59 h.\nEl ensayo debe tener una presentación profesional.";

test("exact quote is found", () => assert.equal(quoteFound(src, "a más tardar el viernes 13 de noviembre"), true));
test("whitespace, case and line breaks are tolerated", () => assert.equal(quoteFound(src, "23:59 h.  el ENSAYO debe"), true));
test("curly quotes and trailing punctuation are tolerated", () => assert.equal(quoteFound(src, "“presentación profesional.”"), true));
test("elided quote with ... in order is found", () => assert.equal(quoteFound(src, "sube tu archivo ... 13 de noviembre"), true));
test("paraphrase is NOT found", () => assert.equal(quoteFound(src, "entregar antes del viernes 13"), false));
test("invented requirement is NOT found", () => assert.equal(quoteFound(src, "mínimo 1500 palabras"), false));
test("out-of-order elision is NOT found", () => assert.equal(quoteFound(src, "13 de noviembre ... sube tu archivo"), false));
test("null or tiny quote is not verified", () => { assert.equal(quoteFound(src, null), false); assert.equal(quoteFound(src, "a"), false); });
