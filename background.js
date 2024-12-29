chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "closeTab") {
    chrome.tabs.remove(sender.tab.id); // Close the current tab
  }
});
