// Navbar visibility based on login status
window.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  const userRole = localStorage.getItem('userRole'); 

  const show = (selector) => document.querySelector(selector)?.classList.remove('hidden');
  const hide = (selector) => document.querySelector(selector)?.classList.add('hidden');

  if (username) {
    // User is logged in – show logged-in links
    show('a[href="profile.html"]');
    show('a[href="logout.html"]');
    hide('a[href="login.html"]');
    hide('a[href="register.html"]');
  
    // Role-based visibility
    if (userRole === 'Admin') show('#navAdmin');
    else hide('#navAdmin');

    if (userRole === 'Manager') show('#navManager');
    else hide('#navManager');
   

  } else {
   // Not logged in – show login/register only
    hide('a[href="profile.html"]');
    hide('a[href="logout.html"]');
    show('a[href="login.html"]');
    show('a[href="register.html"]');
    hide('#navAdmin');
    hide('#navManager');
  }
});
