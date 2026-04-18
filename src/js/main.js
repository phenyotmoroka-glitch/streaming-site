
  const profileIcon = document.getElementById('profileIcon');
  profileIcon.addEventListener('click', e => {
    e.stopPropagation();
    profileIcon.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    profileIcon.classList.remove('open');
  });


  const browseItem = document.getElementById('browseItem');
browseItem.addEventListener('click', e => {
  e.stopPropagation();
  browseItem.classList.toggle('open');
});
document.addEventListener('click', () => {
  browseItem.classList.remove('open');
});