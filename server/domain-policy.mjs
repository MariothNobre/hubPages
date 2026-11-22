// Business rule: subdomains of an active, verified domain have no fixed quantity cap.
// New, unrelated domains retain their existing quotas. Each hostname needs its own proof.
export function connectedDomainBases(rows,now=Date.now()){
 return [...new Set(rows.filter(d=>d.verified&&d.enabled&&d.tls&&!d.disconnectedAt&&Date.parse(d.readyUntil)>now).map(d=>d.zone||d.hostname))]
}
export function connectedSubdomain(rows,hostname){return connectedDomainBases(rows).find(base=>hostname.endsWith('.'+base))||null}
