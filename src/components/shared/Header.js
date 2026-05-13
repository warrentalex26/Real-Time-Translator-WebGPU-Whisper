export function Header() {
  // Detect current page to highlight active nav link
  const path = window.location.pathname;
  const isHome = path === "/" || path.endsWith("index.html");
  const isSearch = path.includes("search");

  return `
    <header class="header">
      <nav class="header-nav">
        <a href="/" class="nav-link ${isHome ? "active" : ""}" data-i18n="nav_home">Home</a>
        <a href="/pages/search.html" class="nav-link ${isSearch ? "active" : ""}" data-i18n="nav_search">Search Recordings</a>
      </nav>
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
