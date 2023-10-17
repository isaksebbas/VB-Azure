document.getElementById('changePasswordButton').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    document.getElementById('passwordChangeMessage').textContent = 'Passwords do not match';
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://w-o-m-2023.azurewebsites.net/changePassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword, token }) // Include token here
    });

    const result = await response.json();

    console.log("Did we get the password changed?: ", result.msg);

    if (response.ok) {
      document.getElementById('passwordChangeMessage').textContent = result.msg;
    } else {
      document.getElementById('passwordChangeMessage').textContent = result.msg;
    }

  } catch (error) {
    console.error('Error changing password:', error);
  }
});