function showAuthPage() {
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('page-main').classList.remove('active');
}

function showMainPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  document.getElementById('user-email').textContent = user.email || '';
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('page-main').classList.add('active');
  loadMedia();
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCatalog();

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuthPage();
  });

  const token = localStorage.getItem('token');
  if (token) showMainPage();
  else showAuthPage();
});
