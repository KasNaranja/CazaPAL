const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cazapal", {
  getConfig: () => ipcRenderer.invoke("cazapal:get-config"),
  saveConfig: (payload) => ipcRenderer.invoke("cazapal:save-config", payload),
});
