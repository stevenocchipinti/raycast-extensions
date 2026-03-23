import { closeMainWindow, open } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  await open("/Applications/cmux.app");
  // Give the app a moment to come to foreground before sending the keystroke
  await new Promise((resolve) => setTimeout(resolve, 200));
  execSync(
    `osascript -e 'tell application "cmux" to activate' -e 'tell application "System Events" to keystroke "u" using {shift down, command down}'`,
  );
  await closeMainWindow();
}
