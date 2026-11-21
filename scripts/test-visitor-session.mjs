import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createVisitSession } from '../shared/studio-traffic.mjs'
const settle=()=>new Promise(done=>setImmediate(done)),events=[]
let available=false
const session=createVisitSession(async event=>{events.push(event);return available},randomUUID)
session.open();session.open();await settle()
assert.equal(events[0].viewId,events[1].viewId,'StrictMode replay retains the access ID')
assert.equal(events.every(e=>e.isNewVisit),true)
available=true;session.heartbeat();await settle()
assert.equal(events[2].viewId,events[0].viewId,'failed delivery retries the same access')
session.heartbeat();await settle()
assert.equal(events[3].isNewVisit,false,'background heartbeats do not add accesses')
session.close();session.heartbeat();await settle()
assert.equal(events.length,5);assert.equal(events[4].active,false)
session.open(true);await settle()
assert.notEqual(events[5].viewId,events[0].viewId,'returning from BFCache is another access')
assert.equal(events[5].isNewVisit,true)
assert.deepEqual(events.map(e=>e.sequence),[1,2,3,4,5,6])
const refreshed=[];createVisitSession(async event=>{refreshed.push(event);return true},randomUUID).open();await settle()
assert.notEqual(refreshed[0].viewId,events[5].viewId,'refresh creates a new access')
console.log('PASS: access per document/BFCache, StrictMode retry idempotence, delivery recovery, background heartbeat and ordered close')
