// Primijeni spremljenu temu prije iscrtavanja (izbjegava treptanje).
try { var t = localStorage.getItem('vk-theme'); if (t === '"light"' || t === '"dark"') document.documentElement.dataset.theme = JSON.parse(t); } catch (e) { /* bez spremanja */ }
