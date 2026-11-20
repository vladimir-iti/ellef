/* Стрелка «вниз» на обложке: плавная прокрутка к концу обложки (как в Тильде). */
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.cover__arrow');
  if (!btn) return;
  var cover = btn.closest('.cover');
  var top = cover.getBoundingClientRect().bottom + window.pageYOffset;
  window.scrollTo({ top: top, behavior: 'smooth' });
});
