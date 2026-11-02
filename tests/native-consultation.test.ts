import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inputSchema, emailSuggestion } from "../lib/native-consultation/schema";
import { createSubmissionHandler, SubmissionError } from "../lib/native-consultation/handler";
import { newDraft, readDraft, writeDraft, revise, DRAFT_TTL } from "../lib/native-consultation/draft";
import { PRIVACY_VERSION, isSubmissionId } from "@solortide/consultation-core";
import { previewToken, tokenHash } from "@solortide/consultation-core/tokens";
const input = { schemaVersion:1,country:"AG",name:"Test Customer",email:"native-test+solar@example.com",phone:"+8613812345678",phoneCountry:"CN",address:"100 Test Street, St Johns",monthlyKwh:600,profile:"daytime",answers:{motivations:["bills"],otherMotivation:"",airConditioning:"",wifi:"",otherAppliances:""},privacyAccepted:true,privacyVersion:PRIVACY_VERSION };
const request=(body:unknown,origin="https://example.com")=>new Request("https://example.com/api/consultations",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});

test("international phone validation is independent of installation country and rejects implausible numbers",()=>{
  assert.equal(inputSchema.parse(input).phone,"+8613812345678");
  assert.equal(inputSchema.safeParse({...input,phone:"+86123"}).success,false);
  const incomplete=inputSchema.safeParse({...input,phone:"+12685550123",phoneCountry:"AG",monthlyKwh:0,profile:""});
  assert.ok(!incomplete.success && incomplete.error.issues.some(issue=>issue.path[0]==="phone"));
  assert.equal(inputSchema.safeParse({...input,phoneCountry:"US"}).success,false);
  for(const [phoneCountry,phone] of [["US","+12025550123"],["GB","+442079460018"],["AG","+12684641234"],["DM","+17676151234"]]) assert.equal(inputSchema.safeParse({...input,phoneCountry,phone}).success,true,phone);
});
test("email aliases survive; suggestions never silently rewrite the address",()=>{
  assert.equal(inputSchema.parse({...input,email:"  User+solar@example.com  "}).email,"User+solar@example.com");
  assert.equal(emailSuggestion("user@gamil.com"),"user@gmail.com");
  assert.equal(inputSchema.parse({...input,email:"user@gamil.com"}).email,"user@gamil.com");
  assert.equal(inputSchema.safeParse({...input,email:"bad@"}).success,false);
});
test("unfinished cached steps and frozen requests survive refresh; regions, versions, corruption and expiry do not",()=>{
  let data=""; const storage={getItem:()=>data,setItem:(_k:string,v:string)=>{data=v;}};
  let draft=newDraft("AG"); draft=revise(draft,{step:1,values:{...draft.values,name:"Saved"}});
  assert.equal(writeDraft(storage,draft),true);assert.equal(readDraft(storage,"AG")?.step,1);assert.equal(readDraft(storage,"AG")?.values.name,"Saved");
  assert.equal(readDraft(storage,"DM"),null);assert.equal(readDraft(storage,"AG",draft.updatedAt+DRAFT_TTL+1),null);
  draft=revise(draft,{phase:"pending",frozen:inputSchema.parse(input)});writeDraft(storage,draft);
  assert.equal(readDraft(storage,"AG")?.requestId,draft.requestId);assert.deepEqual(readDraft(storage,"AG")?.frozen,draft.frozen);
  data='{bad';assert.equal(readDraft(storage,"AG"),null);
  data=JSON.stringify({...draft,version:2});assert.equal(readDraft(storage,"AG"),null);
  assert.equal(writeDraft({setItem:()=>{throw Error("quota");}},draft),false);
});
test("retry after a lost response reuses its digest; changed content with the same key conflicts",async()=>{
  const rows=new Map<string,{digest:string;receipt:{id:string;reference:string;submittedAt:string;previewPath:string}}>();
  const handle=createSubmissionHandler({enabled:()=>true,origin:r=>r.headers.get("origin")==="https://example.com",limit:async()=>{},save:async(id,_value,digest)=>{
    const old=rows.get(id);if(old){if(old.digest!==digest)throw new SubmissionError(409,"conflict");return old.receipt;}
    const receipt={id:randomUUID(),reference:"ST-TEST",submittedAt:new Date().toISOString(),previewPath:"/antigua/submission/"+"a".repeat(43)};rows.set(id,{digest,receipt});return receipt;
  }});
  const body={requestId:randomUUID(),input,website:""};
  const first=await(await handle(request(body))).json();
  assert.deepEqual(Object.keys(first.receipt).sort(),["id","reference","submittedAt"]);
  assert.equal(first.receipt.previewPath,undefined);
  const retry=await(await handle(request(body))).json();assert.deepEqual(first,retry);assert.equal(rows.size,1);
  assert.equal((await handle(request({...body,input:{...input,monthlyKwh:800}}))).status,409);
  assert.equal((await handle(request(body,"https://attacker.example"))).status,403);
  assert.equal((await handle(request({...body,input:{...input,privacyAccepted:false}}))).status,422);
  assert.equal((await handle(request({...body,input:{...input,address:"x".repeat(25000)}}))).status,413);
});
test("HTTP LAN drafts keep the same request across edits and reload without randomUUID",()=>{
  const original = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  try {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    const draft = newDraft("AG"), another = newDraft("AG");
    assert.match(draft.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(draft.requestId, another.requestId);
    const changed = revise(draft, { step: 1, values: { ...draft.values, name: "LAN draft" } });
    assert.equal(changed.requestId, draft.requestId);
    assert.notEqual(changed.revision, draft.revision);
    let data = "";
    const storage = { getItem: () => data, setItem: (_key: string, value: string) => { data = value; } };
    assert.equal(writeDraft(storage, changed), true);
    const restored = readDraft(storage, "AG");
    assert.equal(restored?.requestId, draft.requestId);
    assert.equal(restored?.values.name, "LAN draft");
    assert.equal(restored?.step, 1);
  } finally {
    if (original) Object.defineProperty(crypto, "randomUUID", original);
    else Reflect.deleteProperty(crypto, "randomUUID");
  }
});
test("record IDs are bounded; public preview tokens use a separate secret",()=>{
  assert.equal(isSubmissionId(randomUUID()),true);assert.equal(isSubmissionId("9223372036854775808"),false);
  const token=previewToken("record-a","a".repeat(40));assert.equal(token.length,43);assert.notEqual(token,previewToken("record-b","a".repeat(40)));
  assert.equal(tokenHash(token).length,64);assert.throws(()=>previewToken("record-a","short"));
});
