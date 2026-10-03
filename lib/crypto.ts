import crypto from "crypto";
function key(){const h=process.env.TOKEN_ENCRYPTION_KEY||"";if(!/^[0-9a-fA-F]{64}$/.test(h)) throw new Error("TOKEN_ENCRYPTION_KEY must be 64 hex chars");return Buffer.from(h,"hex")}
export function enc(v:string){const iv=crypto.randomBytes(12), c=crypto.createCipheriv("aes-256-gcm",key(),iv);const b=Buffer.concat([c.update(v,"utf8"),c.final()]);return [iv.toString("hex"),c.getAuthTag().toString("hex"),b.toString("hex")].join(":")}
export function dec(v:string){const [i,t,d]=v.split(":");const c=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(i,"hex"));c.setAuthTag(Buffer.from(t,"hex"));return Buffer.concat([c.update(Buffer.from(d,"hex")),c.final()]).toString("utf8")}
