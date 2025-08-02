// Navbar visibility based on login status
window.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');

  if (username) {
    // User is logged in – show logged-in links
    document.querySelector('a[href="profile.html"]')?.classList.remove('hidden');
    document.querySelector('a[href="logout.html"]')?.classList.remove('hidden');
    document.querySelector('a[href="login.html"]')?.classList.add('hidden');
    document.querySelector('a[href="register.html"]')?.classList.add('hidden');
  } else {
    // User not logged in – show login/register only
    document.querySelector('a[href="profile.html"]')?.classList.add('hidden');
    document.querySelector('a[href="logout.html"]')?.classList.add('hidden');
    document.querySelector('a[href="login.html"]')?.classList.remove('hidden');
    document.querySelector('a[href="register.html"]')?.classList.remove('hidden');
  }
});
