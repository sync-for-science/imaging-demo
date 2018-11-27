const run = async () => {
  const queryParams = (new URL(window.location)).searchParams;
  const state = queryParams.get('state');
  const code = queryParams.get('code');
  const bc = new BroadcastChannel(state);
  bc.postMessage(code);
  bc.close();
}

run()
