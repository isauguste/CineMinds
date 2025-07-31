
// LOGIN FORM HANDLER
document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('username', data.username);
      localStorage.setItem('userId', data.id);
      window.location.href = 'profile.html';
    } else {
      showError('login', data.message || 'Invalid credentials.');
    }
  } catch (err) { 
    console.error('Login Error:',err);
    showError('login', 'Something went wrong. Please try again.');
  }
});

// REGISTER FORM HANDLER
document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();

  if (password !== confirmPassword) {
    showError('register', 'Passwords do not match.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = 'login.html';
    } else {
      showError('register', data.message || 'Registration failed.');
    }
  } catch (err) {
    console.error('Rgister Error:', err);
    showError('register', 'Something went wrong. Please try again.');
  }
});

// ERROR DISPLAY HANDLER
function showError(formType, message) {
  const errorElement = document.getElementById('errorMsg');
  if (errorElement) {
    errorElement.classList.remove('hidden');
    errorElement.textContent = message;
  }
}

