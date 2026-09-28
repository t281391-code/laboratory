import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
import { db } from "../src/server/db";
import { formDefinitions } from "../src/features/forms/config";
import { TODAY } from "../src/lib/utils";
import type { FormKind } from "../src/lib/types";

const base = process.env.TEST_URL || "http://127.0.0.1:3101";
const unique = randomBytes(6).toString("hex");
class Client {
  cookie = "";
  async request(path: string, method = "GET", data?: unknown, origin = base) {
    const response = await fetch(`${base}${path}`, { method, redirect: "manual", headers: { "Content-Type": "application/json", Origin: origin, ...(this.cookie ? { Cookie: this.cookie } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
    const cookie = response.headers.get("set-cookie"); if (cookie) this.cookie = cookie.split(";")[0];
    const result = response.headers.get("content-type")?.includes("json") ? await response.json() : null;
    return { status: response.status, result, headers: response.headers };
  }
  async login(username: string, password: string) { return this.request("/api/auth/login/", "POST", { username, password }); }
  async create(module: string, data: object) {
    const r = await this.request(`/api/${module}/`, "POST", { data });
    assert.equal(r.status, 201, `Create ${module}: ${JSON.stringify(r.result)}`); return r.result.data;
  }
}
const admin = new Client(), user = new Client(), guest = new Client();
const password = randomBytes(16).toString("hex");
const userName = `user_${unique}`;
let userId = "";
after(async () => { await db.$disconnect(); });

test("authentication, normalized CRUD, atomic audit/events, ownership and recovery", async t => {
  await t.test("server protects pages and APIs; seed is idempotent", async () => {
    assert.equal((await guest.request("/api/samples/")).status, 401);
    for (const path of ["/", "/sleepers/", "/secret/", "/small/", "/forms/", "/admin/users/"]) {
      const r = await guest.request(path); assert.equal(r.status, 307); assert.match(r.headers.get("location")!, /login/);
    }
    assert.equal(await db.user.count({ where: { username: process.env.ADMIN_USERNAME } }), 1);
    const login = await admin.login(process.env.ADMIN_USERNAME!, process.env.ADMIN_PASSWORD!);
    assert.equal(login.status, 200); assert.match(login.headers.get("set-cookie")!, /HttpOnly/i); assert.match(login.headers.get("set-cookie")!, /SameSite=lax/i);
    assert.ok(!JSON.stringify(login.result).includes("passwordHash"));
    const token = admin.cookie.split("=")[1];
    assert.ok(await db.session.findUnique({ where: { tokenHash: createHmac("sha256", process.env.SESSION_SECRET!).update(token).digest("hex") } }));
  });
  await t.test("admin creates users; unique names, roles, origins and passwords validated", async () => {
    const r = await admin.request("/api/admin/users/", "POST", { username: userName, fullName: "Verification User", password, role: "USER" });
    assert.equal(r.status, 201); userId = r.result.data.id;
    assert.equal((await admin.request("/api/admin/users/", "POST", { username: userName, fullName: "Duplicate User", password, role: "USER" })).status, 409);
    assert.equal((await admin.request("/api/admin/users/", "POST", { username: `weak_${unique}`, fullName: "Weak User", password: "short", role: "USER" })).status, 422);
    assert.equal((await admin.request("/api/admin/users/", "POST", { username: userName, fullName: "X", password, role: "USER" }, "https://foreign.invalid")).status, 403);
    assert.equal((await user.login(userName, password)).status, 200);
    for (const [path,method,data] of [
      ["/api/admin/users/","GET",undefined], ["/api/admin/users/","POST",{ username: `forbidden_${unique}`, fullName: "Forbidden", password, role: "ADMIN" }],
      [`/api/admin/users/${userId}/`,"PATCH",{ isActive: false }], [`/api/admin/users/${userId}/reset-password/`,"POST",{ password }],
    ] as const) assert.equal((await user.request(path,method,data)).status, 403);
    const me = await admin.request("/api/auth/me/");
    assert.equal((await admin.request(`/api/admin/users/${me.result.data.id}/`,"PATCH",{ isActive:false })).status,409);
  });
  let sample: { id: string; code: string; version: number };
  await t.test("samples persist and reject invalid/foreign edits", async () => {
    sample = await admin.create("samples", { code: `S-${unique}`, material: "Бетон", grade: "M400", project: "Verification project", element: "Verification element", castingDate: "2026-01-01", registeredDate: TODAY, age: 28, count: 6, status: "Бүртгэсэн", technician: "Verification Administrator", photos: [] });
    assert.equal((await admin.request(`/api/samples/${sample.id}/`)).result.data.code, sample.code);
    assert.equal((await user.request(`/api/samples/${sample.id}/`,"PATCH",{ version:sample.version, data:{ count:7 } })).status,403);
    assert.equal((await admin.request(`/api/samples/${sample.id}/`,"PATCH",{ version:sample.version, data:{ count:-1 } })).status,422);
    assert.equal((await admin.request(`/api/samples/${sample.id}/`,"PATCH",{ version:sample.version, data:{ createdById:userId } })).status,422);
    assert.equal((await admin.request(`/api/samples/${sample.id}/`,"PATCH",{ version:999, data:{ count:7 } })).status,409);
  });
  await t.test("all six editable form types save exact fields; server calculates results", async () => {
    for (const kind of Object.keys(formDefinitions) as FormKind[]) {
      const values = Object.fromEntries(formDefinitions[kind].sections.flatMap(s => s.fields).map(f => [f.name, f.name === "sampleCode" ? sample.code : f.name === "technician" ? "Verification Administrator" : f.type === "date" ? f.name === "castingDate" ? "2026-01-01" : TODAY : f.default ?? ""]));
      const record = await admin.create("tests", { kind, date:TODAY, sampleCode: kind === "environment" ? "Лабораторийн орчин" : sample.code, values, photos: [], approved:false });
      assert.equal(Object.keys(record.values).length, Object.keys(values).length);
      assert.equal(await db.testValue.count({where:{testId:record.id}}), Object.keys(values).length);
      assert.ok(Number.isFinite(record.result));
      assert.equal((await admin.request(`/api/tests/${record.id}/`,"PATCH",{version:record.version,data:{approved:true}})).status,200);
      assert.equal((await admin.request(`/api/tests/${record.id}/`,"PATCH",{version:record.version+1,data:{result:999}})).status,422);
    }
  });
  let sleeper: { id: string; version: number; rows: {id:string;values:Record<string,string>}[] };
  await t.test("normalized temperatures, trials, compositions and batches", async () => {
    const date = "2091-01-01";
    const previous = await db.sleeperTrack.findUnique({where:{date_track:{date:new Date(date),track:1}}});
    if (previous) { await db.erpRecord.delete({where:{id:previous.id}}); }
    sleeper = await admin.create("sleepers", {date,track:1,temperature:"45.125",notes:"Verification",rows:Array.from({length:8},(_,i)=>({id:`hour-${i}`,values:{time:`${String(i+8).padStart(2,"0")}:00`,value:String(20+i/10),note:"Measured"}}))});
    assert.equal(await db.temperatureEntry.count({where:{sleeperId:sleeper.id}}),8);
    assert.equal((await db.sleeperTrack.findUniqueOrThrow({where:{id:sleeper.id}})).temperature?.toString(),"45.125");
    const trial = await admin.create("trials",{date,number:"1",spread:"520.25",concreteTemperature:"22.125",airTemperature:"18.5",airContent:"3.125",time:"10:15"});
    assert.equal((await admin.request(`/api/trials/${trial.id}/`)).result.data.spread,"520.25");
    const composition = await admin.create("compositions",{date,time:"10:15",rows:[{id:crypto.randomUUID(),values:{fine:"0.1",medium:"2",coarse:"3"}},{id:crypto.randomUUID(),values:{fine:"0.2",medium:"3",coarse:"4"}}]});
    assert.equal(composition.totals.fine,"0.3"); assert.equal(await db.compositionEntry.count({where:{compositionId:composition.id}}),2);
    for(const product of ["pipe","ring"]) {
      const batch = await admin.create("batches",{date,product,rows:[{id:crypto.randomUUID(),values:{date,time:"10:15",count:"6",code:`P-${unique}`,size:"200",curing:"Уурын нөхцөл",note:"Verification"}}]});
      assert.equal((await admin.request(`/api/batches/${batch.id}/`)).result.data.rows[0].values.count,"6");
    }
    const recordCount = await db.erpRecord.count(), eventCount = await db.realtimeEvent.count(), auditCount = await db.auditLog.count();
    assert.equal((await admin.request("/api/sleepers/","POST",{data:{date,track:2,temperature:"23",notes:"",rows:[{id:"bad",values:{time:"25:99",value:"oops",note:""}}]}})).status,422);
    assert.equal(await db.erpRecord.count(),recordCount); assert.equal(await db.realtimeEvent.count(),eventCount); assert.equal(await db.auditLog.count(),auditCount);
  });
  await t.test("equipment readings, maintenance, checklists and standards are durable", async () => {
    const e = await admin.create("equipment",{date:TODAY,name:"Verification Meter",model:"M-1",serial:`EQ-${unique}`,kind:"meter",status:"Бэлэн",healthStatus:"Inspected",technician:"Verification Administrator",form:"environment",steps:[{title:"Inspect",description:"Check equipment"}]});
    assert.equal((await user.request(`/api/equipment/${e.id}/readings/`,"POST",{value:"21.125",unit:"°C",measuredAt:new Date().toISOString()})).status,201);
    assert.equal((await user.request(`/api/equipment/${e.id}/maintenance/`,"POST",{description:"Inspection completed",performedAt:new Date().toISOString()})).status,201);
    const current = (await admin.request(`/api/equipment/${e.id}/`)).result.data;
    assert.equal(current.readings[0].value,"21.125"); assert.equal(current.maintenance.length,1);
    await user.create("checklists",{date:TODAY,key:e.id,checks:[true,false,true,false]});
    assert.equal((await user.request("/api/checklists/")).result.data.some((c:{key:string})=>c.key===e.id),true);
    const standard = await admin.create("standards",{date:TODAY,number:`STD-${unique}`,title:"Verification method",material:"Бетон",equipment:e.name,equipmentId:e.id,form:"environment",size:"",condition:"",formula:"",steps:["Inspect"]});
    assert.equal((await admin.request(`/api/standards/${standard.id}/`)).status,200);
    assert.equal((await admin.request(`/api/equipment/${e.id}/`,"DELETE",{version:current.version})).status,200);
    assert.equal((await admin.request(`/api/equipment/${e.id}/`)).status,404);
    assert.equal((await db.erpRecord.findUniqueOrThrow({where:{id:e.id}})).isActive,false);
  });
  await t.test("SSE recovers a committed mutation with Last-Event-ID and contains no secrets", async () => {
    const cursor = (await db.realtimeEvent.findFirstOrThrow({orderBy:{id:"desc"}})).id;
    assert.equal((await admin.request(`/api/sleepers/${sleeper.id}/`,"PATCH",{version:sleeper.version,data:{temperature:"49.125"}})).status,200);
    const abort = new AbortController(); const timeout = setTimeout(()=>abort.abort(),20000);
    try {
      const response = await fetch(`${base}/api/events/`,{headers:{Cookie:admin.cookie,"Last-Event-ID":String(cursor)},signal:abort.signal});
      assert.equal(response.status,200); const reader=response.body!.getReader(); const decoder=new TextDecoder(); let text="";
      while(!text.includes(`"entityId":"${sleeper.id}"`)){const part=await reader.read(); if(part.done)break; text+=decoder.decode(part.value);}
      assert.match(text,/event: change/); assert.ok(text.includes(sleeper.id)); assert.ok(!/password|tokenHash|session|secret/i.test(text)); await reader.cancel();
    } finally { clearTimeout(timeout); abort.abort(); }
    assert.ok(await db.auditLog.findFirst({where:{entityId:sleeper.id,action:"UPDATE"}}));
    assert.equal((await admin.request("/api/sleepers/?from=2091-01-01&to=2091-01-01&pageSize=1")).result.data.length,1);
  });
  await t.test("deactivation and password resets revoke sessions; expired sessions disappear", async () => {
    assert.equal((await admin.request(`/api/admin/users/${userId}/`,"PATCH",{isActive:false})).status,200);
    assert.equal((await user.request("/api/auth/me/")).status,401); assert.equal((await user.login(userName,password)).status,401);
    await admin.request(`/api/admin/users/${userId}/`,"PATCH",{isActive:true}); assert.equal((await user.login(userName,password)).status,200);
    const nextPassword=randomBytes(16).toString("hex");
    assert.equal((await admin.request(`/api/admin/users/${userId}/reset-password/`,"POST",{password:nextPassword})).status,200);
    assert.equal((await user.request("/api/auth/me/")).status,401); assert.equal((await user.login(userName,password)).status,401); assert.equal((await user.login(userName,nextPassword)).status,200);
    await db.session.updateMany({where:{userId},data:{expiresAt:new Date(Date.now()-1000)}});
    assert.equal((await user.request("/api/auth/me/")).status,401); assert.equal(await db.session.count({where:{userId}}),0);
    const audits = await db.auditLog.findMany({where:{entityType:{in:["users","auth"]}}});
    assert.ok(!JSON.stringify(audits,(_,v)=>typeof v==="bigint"?String(v):v).includes("passwordHash"));
  });
  await t.test("login throttling and logout", async () => {
    const unknown=`unknown_${unique}`;
    for(let i=0;i<10;i++)assert.equal((await guest.login(unknown,password)).status,401);
    assert.equal((await guest.login(unknown,password)).status,429);
    assert.equal((await admin.request("/api/auth/logout/","POST")).status,200);
    assert.equal((await admin.request("/api/auth/me/")).status,401);
  });
});
