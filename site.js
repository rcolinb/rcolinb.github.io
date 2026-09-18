// The publication record and navigation are complete without JavaScript.
// These functions support the optional hidden-prize state and empty-list fallbacks.
(() => {
  if (typeof renderHero === 'function') renderHero();
  if (typeof renderSelected === 'function') renderSelected();
  if (typeof renderFullList === 'function') renderFullList();
})();
