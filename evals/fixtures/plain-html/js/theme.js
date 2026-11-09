// theme toggle. key is 'ml-theme'
(function(){
  var t = localStorage.getItem('ml-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
  window.toggleTheme = function(){
    var d = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ml-theme', d ? 'dark' : 'light');
  };
})();
