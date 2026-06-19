// App entrypoint. Kept at src/main.js for index.html compatibility.
import { bootApp } from "./app/boot/app-boot.js";

bootApp().catch(error=>{
  console.error("App boot failed", error);
});
