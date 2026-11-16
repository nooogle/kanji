// Import this first in a test file: the app's modules read localStorage and location when they load,
// and Node has neither, so this gives them an in-memory stand-in.
const mem={};
globalThis.localStorage={getItem:k=>(k in mem?mem[k]:null),setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
globalThis.location={pathname:'/'};
