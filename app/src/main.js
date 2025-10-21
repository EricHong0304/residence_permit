const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

document.getElementById('base').textContent = API

async function check() {
  try {
    const res = await fetch(`${API}/api/health`)
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      document.getElementById('health').innerHTML = `<span class="ok">OK</span> ${JSON.stringify(data)}`
    } else {
      document.getElementById('health').innerHTML = `<span class="fail">Failed</span> ${res.status}`
    }
  } catch (e) {
    document.getElementById('health').innerHTML = `<span class="fail">Error</span> ${e}`
  }
}

check()
