"use strict";

const fileInput = document.getElementById("file-input");
const openButton = document.getElementById("open-button");
const exportButton = document.getElementById("export-png");
const previewPanel = document.getElementById("preview-panel");

openButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (file) await readCTEX(file);
});
for (const eventName of ["dragenter", "dragover"]) previewPanel.addEventListener(eventName, (event) => { event.preventDefault(); previewPanel.classList.add("dragging"); });
for (const eventName of ["dragleave", "drop"]) previewPanel.addEventListener(eventName, (event) => { event.preventDefault(); previewPanel.classList.remove("dragging"); });
previewPanel.addEventListener("drop", async (event) => { const file = event.dataTransfer.files[0]; if (file) await readCTEX(file); });
exportButton.addEventListener("click", exportPNG);
