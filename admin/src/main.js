const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const form = document.getElementById('loginForm')
const result = document.getElementById('result')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const username = document.getElementById('u').value
  const password = document.getElementById('p').value
  result.textContent = '登录中...'
  try {
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      result.innerHTML = `<span class="ok">登录成功</span> token=${data.token}`
    } else {
      result.innerHTML = `<span class="fail">登录失败</span> ${data.error || res.status}`
    }
  } catch (e) {
    result.innerHTML = `<span class="fail">请求异常</span> ${e}`
  }
})
