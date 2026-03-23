import { closeMainWindow, open } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  await open("/Applications/cmux.app");
  const output = execSync("cmux new-workspace", { encoding: "utf8" }).trim();
  // Output is like "OK workspace:N" — extract the ref and select it
  const match = output.match(/(workspace:\d+)/);
  if (match) {
    execSync(`cmux select-workspace --workspace ${match[1]}`);
  }
  await closeMainWindow();
}
