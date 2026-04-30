export function Header() {
  return `
    <header class="header">
      <div class="logo">
        <h1>TraductorWebGPU <span class="version">Dashboard V1</span></h1>
      </div>
      <div class="header-controls">
        <div class="lang-display">
          <span class="lang-text active" id="lang-en">[EN]</span>
          <span class="lang-text" id="lang-es">[ES]</span>
        </div>
        <div class="status-badge ready" id="webgpu-status">
          <span class="status-dot"></span>
          <span class="status-text" data-i18n="verifying_webgpu">WebGPU Active</span>
        </div>
      </div>
    </header>
  `;
}
