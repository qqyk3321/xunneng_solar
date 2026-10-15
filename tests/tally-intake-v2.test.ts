import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  FIELD_NAMES,
  parseConfig,
  receiveSubmission,
  type SubmissionRow,
} from "../supabase/functions/tally-webhook/intake";
import {
  buildTallyIntakeUrl,
  isTallySubmissionMessage,
} from "../lib/tally-intake";

const config = {
  formId: "V2TEST",
  fields: Object.fromEntries(
    FIELD_NAMES.map((name) => [name, `question_${name}`]),
  ),
};
const secret = "unit-test-only-not-a-deployed-secret";
const env = (key: string) =>
  ({
    TALLY_SIGNING_SECRET: secret,
    TALLY_INTAKE_ENABLED: "true",
    TALLY_INTAKE_CONFIG: JSON.stringify(config),
  })[key];
const values = {
  installation_country: "DM",
  name: " Example Customer ",
  email: "customer@example.com",
  phone: "+1 767 000 0000",
  parish: "Saint George",
  town: "Roseau",
  street: "Example Area",
  building: "",
  directions: "Near road\nBlue entrance",
};
function payload() {
  return {
    eventId: "example-event",
    eventType: "FORM_RESPONSE",
    data: {
      formId: config.formId,
      submissionId: "sample001",
      createdAt: "2026-09-14T12:00:00.000Z",
      fields: FIELD_NAMES.map((name) => ({
        key: config.fields[name],
        label: "Renamed field",
        value: values[name],
      })),
    },
  };
}
function request(value: unknown, signature?: string) {
  const body = JSON.stringify(value);
  return new Request("https://example.com/tally-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "tally-signature":
        signature ?? createHmac("sha256", secret).update(body).digest("base64"),
    },
    body,
  });
}
test("strict field mapping, phone and address JSON, full original payload", async () => {
  for (const country of ["AG", "DM"]) {
    const input = payload();
    input.data.fields[0].value = country;
    let saved: SubmissionRow | undefined;
    const response = await receiveSubmission(
      request(input),
      env,
      async (row) => {
        saved = row;
        return { duplicate: false };
      },
    );
    assert.equal(response.status, 200);
    assert.equal(saved?.country_code, country);
    assert.equal(saved?.name, "Example Customer");
    assert.equal(saved?.phone, "+1 767 000 0000");
    assert.deepEqual(saved?.address, {
      parish: "Saint George",
      town: "Roseau",
      street: "Example Area",
      building: null,
      directions: "Near road\nBlue entrance",
    });
    assert.deepEqual(saved?.payload, input);
  }
});
test("missing, null or blank country defaults to Antigua; explicit regions remain unchanged", async () => {
  for (const value of [undefined, null, "", "  ", "AG", "DM"]) {
    const input = payload();
    input.data.fields = input.data.fields.filter(field => field.key !== config.fields.installation_country);
    if (value !== undefined) input.data.fields.push({ key: config.fields.installation_country, label: "Country", value });
    let saved: SubmissionRow | undefined;
    const response = await receiveSubmission(request(input), env, async row => {
      saved = row;
      return { duplicate: false };
    });
    assert.equal(response.status, 200);
    assert.equal(saved?.country_code, value === "DM" ? "DM" : "AG");
    assert.deepEqual(saved?.payload, input, "retain the original country input in the source payload");
  }
});
test("config missing/disabled rejects before writes; duplicate map keys rejected", async () => {
  const noWrite = async () => {
    assert.fail("must not save");
  };
  assert.equal(
    (await receiveSubmission(request(payload()), () => undefined, noWrite))
      .status,
    503,
  );
  assert.equal(
    (
      await receiveSubmission(
        request(payload()),
        (key) => (key === "TALLY_INTAKE_ENABLED" ? "false" : env(key)),
        noWrite,
      )
    ).status,
    503,
  );
  assert.equal(
    parseConfig(
      JSON.stringify({
        ...config,
        fields: { ...config.fields, phone: config.fields.email },
      }),
    ),
    null,
  );
});
test("reject invalid signatures and tampered signed payloads", async () => {
  assert.equal(
    (
      await receiveSubmission(
        request(payload(), "a".repeat(44)),
        env,
        async () => assert.fail("write"),
      )
    ).status,
    401,
  );
  const input = payload();
  const oldSignature = createHmac("sha256", secret)
    .update(JSON.stringify(input))
    .digest("base64");
  input.data.fields[0].value = "AG";
  assert.equal(
    (
      await receiveSubmission(request(input, oldSignature), env, async () =>
        assert.fail("write"),
      )
    ).status,
    401,
  );
});
test("required fields, country, metadata, email and international phone validated", async () => {
  const badValues = {
    installation_country: ["FR", "dm"],
    name: [""],
    email: ["not-email"],
    phone: ["7670000000", "+1"],
    parish: [""],
    town: [""],
    street: [""],
  };
  for (const [name, invalid] of Object.entries(badValues))
    for (const value of invalid) {
      const input = payload();
      input.data.fields.find((f) => f.key === config.fields[name])!.value =
        value;
      assert.equal(
        (
          await receiveSubmission(request(input), env, async () =>
            assert.fail("write"),
          )
        ).status,
        400,
        name,
      );
    }
  const input = payload();
  input.data.formId = "WRONG";
  assert.equal(
    (
      await receiveSubmission(request(input), env, async () =>
        assert.fail("write"),
      )
    ).status,
    400,
  );
  input.data.formId = config.formId;
  input.data.createdAt = "nonsense";
  assert.equal(
    (
      await receiveSubmission(request(input), env, async () =>
        assert.fail("write"),
      )
    ).status,
    400,
  );
});
test("no fallback to labels, no duplicate keys; optional omitted fields are null", async () => {
  const input = payload();
  input.data.fields.find(field => field.key === config.fields.name)!.key = "wrong";
  input.data.fields.find(field => field.key === "wrong")!.label = "name";
  assert.equal(
    (
      await receiveSubmission(request(input), env, async () =>
        assert.fail("write"),
      )
    ).status,
    400,
  );
  const repeated = payload();
  repeated.data.fields.push(repeated.data.fields[0]);
  assert.equal(
    (
      await receiveSubmission(request(repeated), env, async () =>
        assert.fail("write"),
      )
    ).status,
    400,
  );
  const optional = payload();
  optional.data.fields = optional.data.fields.filter(
    (f) =>
      f.key !== config.fields.building && f.key !== config.fields.directions,
  );
  assert.equal(
    (
      await receiveSubmission(request(optional), env, async (row) => {
        assert.equal(row.address.directions, null);
        return { duplicate: false };
      })
    ).status,
    200,
  );
});
test("duplicates acknowledged, storage failures retryable without leaking diagnostics", async () => {
  assert.deepEqual(
    await (
      await receiveSubmission(request(payload()), env, async () => ({
        duplicate: true,
      }))
    ).json(),
    { ok: true, duplicate: true },
  );
  const result = await receiveSubmission(request(payload()), env, async () => {
    throw new Error("SECRET");
  });
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /SECRET/);
});
test("method and request size limits", async () => {
  assert.equal(
    (
      await receiveSubmission(
        new Request("https://example.com"),
        env,
        async () => assert.fail("write"),
      )
    ).status,
    405,
  );
  assert.equal(
    (
      await receiveSubmission(
        request({ value: "a".repeat(1024 * 1024) }),
        env,
        async () => assert.fail("write"),
      )
    ).status,
    413,
  );
});
test("Tally URL only carries country, completion events require exact trusted origin and form", () => {
  const url = new URL(buildTallyIntakeUrl("Example", "AG"));
  assert.equal(url.searchParams.get("installation_country"), "AG");
  assert.equal(url.searchParams.has("location_json"), false);
  const event = JSON.stringify({
    event: "Tally.FormSubmitted",
    payload: { formId: "Example" },
  });
  assert.equal(
    isTallySubmissionMessage("https://tally.so", event, "Example"),
    true,
  );
  for (const origin of [
    "https://evil.example",
    "https://tally.so.evil.example",
  ])
    assert.equal(isTallySubmissionMessage(origin, event, "Example"), false);
  assert.equal(
    isTallySubmissionMessage(
      "https://tally.so",
      "Tally.FormSubmitted broken",
      "Example",
    ),
    false,
  );
  assert.equal(
    isTallySubmissionMessage("https://tally.so", event, "Other"),
    false,
  );
});
