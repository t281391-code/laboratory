import fs from "node:fs";
import dotenv from "dotenv";
import { spawn } from "node:child_process";
const config = dotenv.parse(fs.readFileSync(".verification/runtime.env"));
const [script,...args] = process.argv.slice(2);
const child = spawn(process.execPath, [script,...args], { env: { ...process.env, ...config }, stdio: "inherit", windowsHide: true });
child.on("exit", code => { process.exitCode = code ?? 1; });
