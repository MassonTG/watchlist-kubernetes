function initAuth() {
  const tabs = document.querySelectorAll('.auth-tab');
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit');
  const errorEl = document.getElementById('auth-error');
  let mode = 'login';

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.tab;
      submitBtn.textContent = mode === 'login' ? 'Увійти' : 'Зареєструватись';
      errorEl.classList.add('hidden');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    try {
      const res = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password);

      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      showMainPage();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Увійти' : 'Зареєструватись';
    }
  });
}