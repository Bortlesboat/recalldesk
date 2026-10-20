import {cp,mkdir} from "node:fs/promises";
await mkdir("public/demo",{recursive:true});
await cp("demo","public/demo",{recursive:true});
