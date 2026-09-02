const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// Add the global function before the chat submit handler
content = content.replace('form.addEventListener(\'submit\'', `window.retryChat = function(btn) {
      document.getElementById('chat-input').value = btn.dataset.text;
      document.getElementById('chat-form').dispatchEvent(new Event('submit', { cancelable: true }));
    };
    
    form.addEventListener('submit'`);

// Replace the buggy innerHTML
content = content.replace(
  /bMsg\.innerHTML = "Can't reach the sky right now[^]*?Retry<\/a>";/,
  `bMsg.innerHTML = "Can't reach the sky right now. <a href='#' onclick='window.retryChat(this); return false;'>Retry</a>";
        bMsg.querySelector('a').dataset.text = text;`
);

fs.writeFileSync('public/index.html', content);
