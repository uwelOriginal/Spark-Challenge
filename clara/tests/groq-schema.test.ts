// Groq strict mode needs closed, fully-required objects and nullable fields as type unions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { strictJsonSchema } from "../src/lib/groq.ts";
import { ChatSchema, DecodeSchema, ThemeSchema } from "../src/lib/schemas.ts";

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) return node.forEach((x) => walk(x, visit));
  if (!node || typeof node !== "object") return;
  visit(node as Record<string, unknown>);
  for (const v of Object.values(node as object)) walk(v, visit);
}

for (const [name, schema] of [["decode", DecodeSchema], ["chat", ChatSchema], ["theme", ThemeSchema]] as const) {
  test(`${name}: every object is closed and requires all its properties`, () => {
    walk(strictJsonSchema(schema), (n) => {
      if (n.type === "object" && n.properties) {
        assert.equal(n.additionalProperties, false);
        assert.deepEqual([...(n.required as string[])].sort(), Object.keys(n.properties as object).sort());
      }
    });
  });

  test(`${name}: no $schema and no anyOf left for nullable fields`, () => {
    const s = strictJsonSchema(schema);
    assert.equal("$schema" in s, false);
    walk(s, (n) => assert.equal("anyOf" in n, false));
  });
}

test("nullable string becomes a type union", () => {
  const s = strictJsonSchema(DecodeSchema) as { properties: Record<string, { type: unknown }> };
  assert.deepEqual(s.properties.course.type, ["string", "null"]);
});

test("nullable enum keeps its values and adds null", () => {
  const s = strictJsonSchema(ChatSchema) as { properties: { settings_change: { properties: Record<string, { type: unknown; enum: unknown[] }> } } };
  const theme = s.properties.settings_change.properties.theme;
  assert.deepEqual(theme.type, ["string", "null"]);
  assert.deepEqual(theme.enum, ["dark", "light", "contrast", null]);
});
